"""Paired statistics, charts, and a Markdown summary of the experiment."""

import warnings

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy import stats

from .config import PRICES, RESULTS_DIR, RESULTS_FILE, SCENARIOS_FILE
from .store import read_jsonl

# Wilcoxon warns when every paired difference is zero; the table already shows n/a.
warnings.filterwarnings("ignore", category=RuntimeWarning, module="scipy")

# (column, label, higher_is_better)
METRICS = [
    ("accuracy", "Stage accuracy (0-100)", True),
    ("decision_detection", "Decision detection (%)", True),
    ("understanding", "Process understanding (0-100)", True),
    ("trace_accuracy", "Trace-question accuracy (%)", True),
    ("confidence", "Self-reported confidence (1-10)", True),
    ("hallucinations", "Hallucinations (count)", False),
]

NAVY, GOLD = "#1d4f9e", "#f5b800"


def holm(pvalues: list[float]) -> list[float]:
    """Holm-Bonferroni adjustment across the metrics tested."""
    order = np.argsort(pvalues)
    m = len(pvalues)
    adjusted = [0.0] * m
    running = 0.0
    for rank, idx in enumerate(order):
        running = max(running, min(1.0, (m - rank) * pvalues[idx]))
        adjusted[idx] = running
    return adjusted


def paired_table(df: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for col, label, _ in METRICS:
        wide = df.pivot_table(index=["scenario_id", "persona"], columns="condition", values=col).dropna()
        c, f = wide["control"].to_numpy(), wide["flowalgo"].to_numpy()
        d = f - c
        n = len(d)
        sd = d.std(ddof=1) if n > 1 else float("nan")
        se = sd / np.sqrt(n) if n > 1 else float("nan")
        half = stats.t.ppf(0.975, n - 1) * se if n > 1 else float("nan")
        p_t = stats.ttest_rel(f, c).pvalue if n > 1 and sd > 0 else float("nan")
        try:
            p_w = stats.wilcoxon(f, c).pvalue
        except ValueError:  # all differences are zero, or too few pairs
            p_w = float("nan")
        rows.append({
            "metric": label,
            "n_pairs": n,
            "control": c.mean(),
            "flowalgo": f.mean(),
            "diff": d.mean(),
            "ci_low": d.mean() - half,
            "ci_high": d.mean() + half,
            "cohens_dz": d.mean() / sd if sd and sd > 0 else float("nan"),
            "p_ttest": p_t,
            "p_wilcoxon": p_w,
        })
    table = pd.DataFrame(rows)
    valid = table["p_ttest"].notna()
    table["p_holm"] = float("nan")
    if valid.any():
        table.loc[valid, "p_holm"] = holm(table.loc[valid, "p_ttest"].tolist())
    return table


def fmt_p(p: float) -> str:
    if pd.isna(p):
        return "n/a"
    return "<0.001" if p < 0.001 else f"{p:.3f}"


def markdown_table(t: pd.DataFrame) -> str:
    lines = [
        "| Metric | Control | FlowAlgo | Difference [95% CI] | Effect size (dz) | p (Holm) |",
        "|---|---:|---:|---|---:|---:|",
    ]
    for _, r in t.iterrows():
        lines.append(
            f"| {r.metric} | {r.control:.1f} | {r.flowalgo:.1f} | "
            f"{r['diff']:+.1f} [{r.ci_low:+.1f}, {r.ci_high:+.1f}] | {r.cohens_dz:.2f} | {fmt_p(r.p_holm)} |"
        )
    return "\n".join(lines)


def chart_means(df: pd.DataFrame, path) -> None:
    fig, axes = plt.subplots(2, 3, figsize=(13, 7.5))
    for ax, (col, label, _) in zip(axes.flat, METRICS):
        means = df.groupby("condition")[col].agg(["mean", "sem"]).reindex(["control", "flowalgo"])
        ax.bar(["Control", "FlowAlgo"], means["mean"], yerr=1.96 * means["sem"], capsize=6,
               color=["#9aa5b8", NAVY], edgecolor="none")
        ax.set_title(label, fontsize=11)
        ax.spines[["top", "right"]].set_visible(False)
        for x, v in enumerate(means["mean"]):
            ax.text(x, v, f"{v:.2f}" if v < 1 else f"{v:.1f}", ha="center", va="bottom", fontsize=10, fontweight="bold")
    fig.suptitle("Control vs FlowAlgo (means, 95% CI)", fontsize=14, fontweight="bold")
    fig.tight_layout()
    fig.savefig(path, dpi=200)
    plt.close(fig)


def chart_by_group(df: pd.DataFrame, group: str, path) -> None:
    cols = ["accuracy", "decision_detection", "understanding"]
    wide = df.pivot_table(index=[group, "scenario_id", "persona"], columns="condition", values=cols).dropna()
    diffs = pd.DataFrame({c: wide[(c, "flowalgo")] - wide[(c, "control")] for c in cols}).groupby(level=0).mean()
    ax = diffs.plot.barh(figsize=(10, 0.6 * len(diffs) + 2), color=[NAVY, GOLD, "#6b7a99"], width=0.8)
    ax.axvline(0, color="black", linewidth=0.8)
    ax.set_xlabel("Mean improvement with FlowAlgo (points)")
    ax.set_ylabel("")
    ax.set_title(f"FlowAlgo effect by {group}", fontweight="bold")
    ax.legend(["Stage accuracy", "Decision detection", "Understanding"], loc="lower right")
    ax.spines[["top", "right"]].set_visible(False)
    plt.tight_layout()
    plt.savefig(path, dpi=200)
    plt.close()


def cost(records: list[dict]) -> tuple[float, int, int]:
    total, tin, tout = 0.0, 0, 0
    for r in records:
        usages = r["usage"] if isinstance(r["usage"], list) else [r["usage"]]
        for u in usages:
            pin, pout = next((v for k, v in PRICES.items() if u["model"].startswith(k)), (0, 0))
            tin += u["input_tokens"]
            tout += u["output_tokens"]
            total += u["input_tokens"] / 1e6 * pin + u["output_tokens"] / 1e6 * pout
    return total, tin, tout


def analyze() -> None:
    records = read_jsonl(RESULTS_FILE)
    if not records:
        raise SystemExit("No results yet. Run `python -m sim run` first.")
    RESULTS_DIR.mkdir(exist_ok=True)

    df = pd.DataFrame([{k: v for k, v in r.items() if k not in ("answer", "grade", "usage")} for r in records])
    df.to_csv(RESULTS_DIR / "trials.csv", index=False)

    overall = paired_table(df)
    overall.to_csv(RESULTS_DIR / "paired_stats.csv", index=False)
    per_persona = {p: paired_table(df[df.persona == p]) for p in sorted(df.persona.unique())}

    chart_means(df, RESULTS_DIR / "metrics.png")
    chart_by_group(df, "category", RESULTS_DIR / "by_category.png")
    chart_by_group(df, "difficulty", RESULTS_DIR / "by_difficulty.png")

    n_scen = df.scenario_id.nunique()
    spent, tin, tout = cost(records + read_jsonl(SCENARIOS_FILE))
    md = [
        "# FlowAlgo Agent-Based Pilot Evaluation",
        "",
        f"{n_scen} scenarios x {df.persona.nunique()} personas x 2 conditions = {len(df)} graded trials "
        f"({int(overall.n_pairs.iloc[0])} paired comparisons).",
        "",
        "Each simulated student answered every scenario twice: once with the workflow text only (control), "
        "and once with the workflow text plus the FlowAlgo diagram. Differences are FlowAlgo minus control, "
        "paired by scenario and persona. p-values are paired t-tests with Holm correction across the six metrics.",
        "",
        "## Overall",
        "",
        markdown_table(overall),
        "",
    ]
    for p, t in per_persona.items():
        md += [f"## Persona: {p}", "", markdown_table(t), ""]
    md += [
        "## Charts",
        "",
        "![Metrics](metrics.png)",
        "",
        "![By category](by_category.png)",
        "",
        "![By difficulty](by_difficulty.png)",
        "",
        f"API cost: ${spent:.2f} ({tin:,} input / {tout:,} output tokens).",
    ]
    (RESULTS_DIR / "summary.md").write_text("\n".join(md), encoding="utf-8")

    print(markdown_table(overall))
    print(f"\nWrote {RESULTS_DIR / 'summary.md'} and charts. API cost so far: ${spent:.2f}")
