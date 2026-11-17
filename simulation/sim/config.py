"""Experiment settings. Override any model with an environment variable."""

import os
from pathlib import Path

SIM_DIR = Path(__file__).resolve().parents[1]
APP_DIR = SIM_DIR.parent
DATA_DIR = SIM_DIR / "data"
RESULTS_DIR = SIM_DIR / "results"

SCENARIOS_FILE = DATA_DIR / "scenarios.jsonl"
FLOWALGO_FILE = DATA_DIR / "flowalgo.jsonl"
RESULTS_FILE = DATA_DIR / "results.jsonl"

# Each agent role can use a different model.
MODEL_GENERATOR = os.getenv("SIM_MODEL_GENERATOR", "claude-opus-5-5")
# Students use a smaller model so control scores aren't stuck at the ceiling.
MODEL_STUDENT = os.getenv("SIM_MODEL_STUDENT", "claude-haiku-5-5")
MODEL_JUDGE = os.getenv("SIM_MODEL_JUDGE", "claude-opus-5-5")

# The real FlowAlgo app must be running (npm run dev) for the experimental condition.
FLOWALGO_URL = os.getenv("FLOWALGO_URL", "http://localhost:3000/api/generate")

CATEGORIES = [
    "University Processes",
    "IT Help Desk",
    "Banking",
    "Healthcare",
    "HR",
    "Supply Chain",
    "Internships",
    "Cybersecurity",
]
DIFFICULTIES = ["easy", "medium", "hard"]
CONDITIONS = ["control", "flowalgo"]

# USD per million tokens (input, output), used only for the cost report.
PRICES = {
    "claude-opus-5-5": (4.00, 20.00),
    "claude-sonnet-5-5": (2.00, 10.00),
    "claude-haiku-5-5": (0.10, 0.50),
}
