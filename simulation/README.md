# FlowAlgo Agent-Based Evaluation

A simulation study testing whether FlowAlgo diagrams help students understand workflows.

- **H₀:** FlowAlgo does not improve workflow comprehension.
- **H₁:** FlowAlgo improves workflow comprehension, confidence, and decision-identification accuracy.

## Design

```
Scenario Generator (Agent 4) ──► workflow text + hidden answer key
                                       │
                 ┌─────────────────────┴─────────────────────┐
                 ▼                                           ▼
        Control: text only                   FlowAlgo: text + diagram from the
                                             real app (localhost:3000/api/generate)
                 │                                           │
     Marcus and Tiana each answer               Marcus and Tiana each answer
                 └─────────────────────┬─────────────────────┘
                                       ▼
                   Professor Judge (Agent 3), blind to condition
                                       ▼
                         Paired statistics + charts
```

**Within-subjects (crossed) design.** Both personas answer every scenario in *both* conditions. The original plan gave FlowAlgo only to Tiana, who is also the stronger documentation student, so any difference would have mixed up persona and condition. Here every comparison is paired on the same scenario and the same persona, and FlowAlgo is the only thing that changes.

**Blind grading.** The judge sees the workflow text, the answer key, and the student answer. It never sees the persona, the condition, or the diagram. Students are told not to mention their sources.

| Role | Model (default) | Override with |
|---|---|---|
| Scenario generator | `claude-opus-5-5` | `SIM_MODEL_GENERATOR` |
| Students (Marcus, Tiana) | `claude-haiku-5-5` | `SIM_MODEL_STUDENT` |
| Professor judge | `claude-opus-5-5` | `SIM_MODEL_JUDGE` |
| FlowAlgo | whatever the app uses (`claude-sonnet-5-5`) | `ANTHROPIC_MODEL` in `../.env.local` |

## Metrics

| Metric | How it's computed |
|---|---|
| Stage accuracy (0-100) | Answer-key stages the student identified ÷ total stages |
| Decision detection (%) | Answer-key decisions identified ÷ total decisions (e.g. 1 of 2 = 50%) |
| Process understanding (0-100) | Judge rubric: sequence (40) + decision logic (30) + edge cases (30) |
| Trace-question accuracy (%) | Two "What happens if…" questions per scenario, graded right/wrong |
| Confidence (1-10) | Student self-report |
| Hallucinations (count) | Statements that contradict the workflow or add something it doesn't contain |

Trace-question accuracy is an extra, objective check added to the original plan.

Statistics: paired t-test per metric with Holm correction across the six metrics, a Wilcoxon signed-rank test as a robustness check, a 95% CI on the mean difference, and Cohen's dz.

## Running it

From `flowalgo-mvp/simulation/`, with FlowAlgo running (`npm run dev` in `flowalgo-mvp/`):

```powershell
.venv\Scripts\python -m sim generate --n 50   # scenarios -> data/scenarios.jsonl
.venv\Scripts\python -m sim run               # trials    -> data/results.jsonl
.venv\Scripts\python -m sim analyze           # results/summary.md, charts, CSVs
```

Every step resumes where it left off. If a run is interrupted, or some trials fail, run the same command again. Use `run --limit 5` for a small pilot.

**Cost:** about $0.14 per scenario with the defaults, so about $7 for 50 scenarios and about $14 for 100. `analyze` reports the actual amount spent.

## Pilot history

- `data/pilot-v1/`: Opus 5.5 students scored about 100 in both conditions (a ceiling effect). FlowAlgo's diagram also **invented a branch** ("override denied → notify student") that wasn't in the notes, and both students repeated it. The fix was to tell FlowAlgo's prompt (`src/app/api/generate/route.ts`) to draw only outcomes the notes describe and to label missing ones "Not specified in notes". Students were switched to Haiku 5.5.
- `data/pilot-v2/`: confirmed the fix. The diagram now shows `No → "Not specified in notes"`, and no answers mention their sources.

The pilot is worth reporting in the paper: the evaluation caught a real hallucination problem in the product.

## Limitations (state these in the paper)

1. **These are simulated students, not people.** Results show how LLM agents playing personas respond, not how JCSU students would. Real student testing remains future work.
2. **The students read the diagram as Mermaid text, not as a picture.** Real users see a rendered chart, so this measures structure more than visual design.
3. **The same model family plays every role.** Claude writes the scenarios, draws the diagrams, plays the students, and grades them, which may share biases. A human-graded sample (for example, 20 trials scored by you or a professor) would help validate the judge.
4. **The FlowAlgo condition gets more information.** A diagram restates the text in structured form. A stronger design would add a third condition, such as a plain bulleted outline, to separate the value of *visualizing* from the value of *restructuring*.
5. **Easy scenarios may still hit the ceiling.** Look at the by-difficulty chart. The effect, if there is one, should show up mostly on medium and hard scenarios.

Report whatever numbers `analyze` produces, including null or negative results. Don't use the example table from the original plan: those numbers were illustrative, not measured.
