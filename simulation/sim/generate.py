"""Agent 4: generate workflow scenarios with answer keys."""

from concurrent.futures import ThreadPoolExecutor, as_completed

from .config import CATEGORIES, DIFFICULTIES, MODEL_GENERATOR, SCENARIOS_FILE
from .llm import ask
from .prompts import GENERATOR_SYSTEM, generator_prompt
from .schemas import Scenario
from .store import append_jsonl, read_jsonl


def generate(n: int, workers: int) -> None:
    existing = read_jsonl(SCENARIOS_FILE)
    start = len(existing)
    if start >= n:
        print(f"Already have {start} scenarios in {SCENARIOS_FILE.name}.")
        return

    # Round-robin over categories and difficulties so the dataset stays balanced.
    plan = []
    for i in range(start, n):
        category = CATEGORIES[i % len(CATEGORIES)]
        difficulty = DIFFICULTIES[(i // len(CATEGORIES)) % len(DIFFICULTIES)]
        plan.append((i, category, difficulty))

    titles: dict[str, list[str]] = {}
    for s in existing:
        titles.setdefault(s["category"], []).append(s["title"])

    # Scenarios in the same category are generated one after another so the
    # generator can see earlier titles and avoid duplicates.
    by_category: dict[str, list] = {}
    for item in plan:
        by_category.setdefault(item[1], []).append(item)

    def run_category(items):
        for i, category, difficulty in items:
            scenario, usage = ask(
                MODEL_GENERATOR,
                GENERATOR_SYSTEM,
                generator_prompt(category, difficulty, titles.get(category, [])),
                Scenario,
            )
            titles.setdefault(category, []).append(scenario.title)
            record = {
                "id": f"S{i + 1:03d}",
                "category": category,
                "difficulty": difficulty,
                **scenario.model_dump(),
                "usage": usage,
            }
            append_jsonl(SCENARIOS_FILE, record)
            print(f"  {record['id']} [{category} / {difficulty}] {scenario.title}")

    print(f"Generating {len(plan)} scenarios with {MODEL_GENERATOR}...")
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [pool.submit(run_category, items) for items in by_category.values()]
        for f in as_completed(futures):
            f.result()
    print(f"Done. {len(read_jsonl(SCENARIOS_FILE))} scenarios in {SCENARIOS_FILE}")
