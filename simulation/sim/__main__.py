"""
FlowAlgo agent-based evaluation.

    python -m sim generate --n 50    # Agent 4 writes scenarios + answer keys
    python -m sim run                # FlowAlgo diagrams, students answer, professor grades
    python -m sim analyze            # paired stats, charts, results/summary.md
"""

import argparse

from .analyze import analyze
from .generate import generate
from .run import run

parser = argparse.ArgumentParser(prog="python -m sim")
sub = parser.add_subparsers(dest="command", required=True)

g = sub.add_parser("generate", help="Generate workflow scenarios")
g.add_argument("--n", type=int, default=50, help="Total scenarios to have (resumes if some exist)")
g.add_argument("--workers", type=int, default=4)

r = sub.add_parser("run", help="Run student and judge agents")
r.add_argument("--limit", type=int, help="Only use the first N scenarios (for a pilot)")
r.add_argument("--workers", type=int, default=4)
r.add_argument("--seed", type=int, default=7)

sub.add_parser("analyze", help="Compute statistics and charts")

args = parser.parse_args()
if args.command == "generate":
    generate(args.n, args.workers)
elif args.command == "run":
    run(args.limit, args.workers, args.seed)
else:
    analyze()
