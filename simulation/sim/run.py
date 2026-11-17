"""Run the experiment: FlowAlgo diagrams, student answers, and blind grading."""

import random
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

from .config import (
    CONDITIONS,
    FLOWALGO_FILE,
    FLOWALGO_URL,
    MODEL_JUDGE,
    MODEL_STUDENT,
    RESULTS_FILE,
    SCENARIOS_FILE,
)
from .llm import ask
from .prompts import JUDGE_SYSTEM, PERSONAS, judge_prompt, persona_system, student_prompt
from .schemas import Grade, StudentAnswer
from .store import append_jsonl, read_jsonl


def get_flowalgo_diagrams(scenarios: list[dict], workers: int) -> dict[str, str]:
    """Send each scenario's workflow text through the real FlowAlgo app (cached)."""
    cache = {r["scenario_id"]: r["mermaid"] for r in read_jsonl(FLOWALGO_FILE)}
    todo = [s for s in scenarios if s["id"] not in cache]
    if not todo:
        return cache

    try:
        requests.get(FLOWALGO_URL.rsplit("/api/", 1)[0], timeout=10)
    except requests.ConnectionError:
        raise SystemExit(f"FlowAlgo is not reachable at {FLOWALGO_URL}. Start it with `npm run dev`.")

    def fetch(s):
        r = requests.post(FLOWALGO_URL, json={"notes": s["workflow_text"]}, timeout=600)
        data = r.json()
        if not r.ok:
            raise RuntimeError(f"FlowAlgo failed on {s['id']}: {data.get('error')}")
        append_jsonl(FLOWALGO_FILE, {"scenario_id": s["id"], **data})
        print(f"  FlowAlgo diagram for {s['id']}")
        return s["id"], data["mermaid"]

    print(f"Generating {len(todo)} diagrams through FlowAlgo ({FLOWALGO_URL})...")
    with ThreadPoolExecutor(max_workers=workers) as pool:
        for f in as_completed([pool.submit(fetch, s) for s in todo]):
            sid, mermaid = f.result()
            cache[sid] = mermaid
    return cache


def score(scenario: dict, grade: Grade) -> dict:
    n_stages = max(len(scenario["stages"]), 1)
    n_decisions = max(len(scenario["decisions"]), 1)
    n_traces = max(len(scenario["trace_questions"]), 1)
    clamp = lambda v, hi: max(0, min(v, hi))
    return {
        "accuracy": 100 * clamp(grade.stages_correct, n_stages) / n_stages,
        "decision_detection": 100 * clamp(grade.decisions_matched, n_decisions) / n_decisions,
        "understanding": clamp(grade.sequence_score, 40)
        + clamp(grade.decision_logic_score, 30)
        + clamp(grade.edge_case_score, 30),
        "trace_accuracy": 100 * sum(grade.trace_correct[:n_traces]) / n_traces,
        "hallucinations": len(grade.hallucinations),
    }


def run_trial(scenario: dict, persona: str, condition: str, mermaid: str | None) -> dict:
    traces = [t["question"] for t in scenario["trace_questions"]]
    answer, student_usage = ask(
        MODEL_STUDENT,
        persona_system(persona),
        student_prompt(scenario["workflow_text"], traces, mermaid if condition == "flowalgo" else None),
        StudentAnswer,
    )
    # The judge never sees the persona, the condition, or the diagram.
    grade, judge_usage = ask(
        MODEL_JUDGE,
        JUDGE_SYSTEM,
        judge_prompt(scenario, answer.model_dump()),
        Grade,
        effort="high",
    )
    metrics = score(scenario, grade)
    metrics["confidence"] = max(1, min(answer.confidence, 10))
    return {
        "scenario_id": scenario["id"],
        "category": scenario["category"],
        "difficulty": scenario["difficulty"],
        "persona": persona,
        "condition": condition,
        **metrics,
        "answer": answer.model_dump(),
        "grade": grade.model_dump(),
        "usage": [student_usage, judge_usage],
    }


def run(limit: int | None, workers: int, seed: int) -> None:
    scenarios = read_jsonl(SCENARIOS_FILE)
    if not scenarios:
        raise SystemExit("No scenarios yet. Run `python -m sim generate` first.")
    if limit:
        scenarios = scenarios[:limit]

    diagrams = get_flowalgo_diagrams(scenarios, workers)

    done = {(r["scenario_id"], r["persona"], r["condition"]) for r in read_jsonl(RESULTS_FILE)}
    trials = [
        (s, p, c)
        for s in scenarios
        for p in PERSONAS
        for c in CONDITIONS
        if (s["id"], p, c) not in done
    ]
    random.Random(seed).shuffle(trials)  # avoid ordering effects
    print(f"Running {len(trials)} trials ({len(done)} already done) with students={MODEL_STUDENT}, judge={MODEL_JUDGE}...")

    failures = 0
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(run_trial, s, p, c, diagrams.get(s["id"])): (s["id"], p, c) for s, p, c in trials}
        for i, f in enumerate(as_completed(futures), 1):
            key = futures[f]
            try:
                record = f.result()
            except Exception as e:  # keep going; failed trials are retried on the next run
                failures += 1
                print(f"  [{i}/{len(trials)}] FAILED {key}: {e}")
                continue
            append_jsonl(RESULTS_FILE, record)
            print(
                f"  [{i}/{len(trials)}] {key[0]} {key[1]:<6} {key[2]:<8} "
                f"acc={record['accuracy']:.0f} dec={record['decision_detection']:.0f} "
                f"und={record['understanding']} hal={record['hallucinations']} conf={record['confidence']}"
            )
    print(f"Done. {failures} failed (rerun to retry them). Results in {RESULTS_FILE}")
