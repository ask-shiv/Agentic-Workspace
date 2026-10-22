import argparse
import asyncio
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

from agent_eval import extract

from takehome.services.brief import MatterBrief, propose_brief
from takehome.services.review import review_document


async def evaluate(lease: Path, output: Path, reuse_plans: Path | None = None) -> int:
    content = lease.read_bytes()
    pages = extract(content)
    text = "\n\n".join(f"--- Page {page} ---\n{value}" for page, value in pages.items())
    objective = "I am advising a tenant considering this lease. I need to understand the commercial risks before negotiations and prepare a concise client update."
    retained = {}
    if reuse_plans:
        previous = json.loads(reuse_plans.read_text())
        if (
            previous["fixture_sha256"] != hashlib.sha256(content).hexdigest()
            or previous["objective"] != objective
        ):
            raise ValueError("Retained plans must use the same synthetic source and objective.")
        retained = {case["workflow"]: case["brief"] for case in previous["cases"]}
    result = {
        "timestamp_utc": datetime.now(UTC).isoformat(),
        "model": "claude-haiku-4-5-20251001",
        "fixture_sha256": hashlib.sha256(content).hexdigest(),
        "objective": objective,
        "current_source_sha256": {
            name: hashlib.sha256(Path(function.__code__.co_filename).read_bytes()).hexdigest()
            for name, function in {"planning": propose_brief, "review": review_document}.items()
        },
        "scope": "Same synthetic document and objective, two explicit working presets. Proposed briefs are engineering inputs, not lawyer-approved plans. No legal accuracy or consistency benchmark is claimed; quotes retain their actual verification status. Draft/chat context has model-free coverage.",
        "cases": [],
    }
    for workflow in ["risk", "report"]:
        case = {"workflow": workflow, "planning_reused": bool(retained)}
        try:
            brief = (
                MatterBrief.model_validate(retained[workflow])
                if retained
                else await propose_brief(objective, text, workflow)
            )
            case["brief"] = brief.model_dump()
            print(f"{workflow}: planned {brief.deliverable}", flush=True)
            review = await review_document(text, objective, brief)
            case["review"] = review.model_dump()
            case["source_checked_count"] = sum(
                f.evidence_status == "source_checked" for f in review.findings
            )
            print(
                f"{workflow}: {len(review.findings)} findings, {case['source_checked_count']} exact source matches",
                flush=True,
            )
        except Exception as exc:
            case["error"] = type(exc).__name__
            if type(exc).__name__ == "UsageLimitExceeded":
                case["error_detail"] = str(exc)
            print(f"{workflow}: {type(exc).__name__}", flush=True)
        result["cases"].append(case)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(result, indent=2) + "\n")
    return int(any("error" in case for case in result["cases"]))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Opt-in billed comparison: two planning and two review runs on a synthetic lease."
    )
    parser.add_argument("--lease", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--reuse-plans", type=Path)
    parser.add_argument("--live", action="store_true")
    args = parser.parse_args()
    if not args.live:
        parser.error("Pass --live to enable model calls.")
    raise SystemExit(asyncio.run(evaluate(args.lease, args.output, args.reuse_plans)))
