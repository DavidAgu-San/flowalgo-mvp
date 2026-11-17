"""Structured output shapes for each agent."""

from pydantic import BaseModel


class Decision(BaseModel):
    question: str
    branches: list[str]


class TraceQuestion(BaseModel):
    question: str
    answer: str


class Scenario(BaseModel):
    """Agent 4 output: a workflow problem plus its hidden answer key."""

    title: str
    workflow_text: str
    stages: list[str]
    decisions: list[Decision]
    edge_cases: list[str]
    trace_questions: list[TraceQuestion]


class StudentAnswer(BaseModel):
    """Agents 1 and 2 output."""

    stages: list[str]
    decision_points: list[Decision]
    explanation: str
    trace_answers: list[str]
    confidence: int


class Grade(BaseModel):
    """Agent 3 output."""

    stages_correct: int
    decisions_matched: int
    sequence_score: int
    decision_logic_score: int
    edge_case_score: int
    trace_correct: list[bool]
    hallucinations: list[str]
    rationale: str
