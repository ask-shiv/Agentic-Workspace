from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

from agent_eval import extract
from pydantic_ai.usage import UsageLimits

from takehome.config import settings
from takehome.services.brief import propose_brief
from takehome.services.review import check_evidence, review_document
from takehome.web.routers.workspace import DraftRequest, draft_agent


async def evaluate(lease: Path, output: Path) -> int:
    if not settings.anthropic_api_key:
        raise RuntimeError("A local key is required.")
    content = lease.read_bytes()
    pages = extract(content)
    text = "\n\n".join(f"--- Page {page} ---\n{value}" for page, value in pages.items())
    report = {
        "timestamp_utc": datetime.now(UTC).isoformat(),
        "model": "claude-haiku-4-5-20251001",
        "fixture_sha256": hashlib.sha256(content).hexdigest(),
        "scope": "Two different briefs against the same synthetic lease. Planning proposals are used as agreed inputs for this engineering evaluation; no lawyer/user approval is implied. Chat continuity has model-free tests. Mechanical checks do not establish legal accuracy.",
        "cases": [],
    }
    for role, objective in [
        (
            "tenant",
            "Help my tenant understand whether exiting in 2029 is feasible. Prepare a short client update covering break conditions, costs, missing facts and next enquiries; do not confirm compliance.",
        ),
        (
            "landlord",
            "Represent the landlord preparing lease negotiations. Protect rental income and control assignment/subletting. Prepare a negotiation brief prioritising commercial positions and information needed, not a tenant exit report.",
        ),
    ]:
        case = {"role": role, "objective": objective}
        try:
            brief = await propose_brief(objective, text)
            case["brief"] = brief.model_dump()
            print(f"{role}: proposed {brief.deliverable}", flush=True)
            review = await review_document(text, objective, brief)
            case["review"] = review.model_dump()
            request = DraftRequest(
                title=brief.sections[0].title,
                purpose=brief.sections[0].purpose,
                objective=objective,
                instruction="Write this first section for the agreed deliverable. Use only the linked evidence, retain PDF page references and distinguish unknowns. Do not add unsupported clause labels or dates.",
                current_text="",
                findings=review.findings[:3],
                brief=brief,
                review_brief=brief,
                report_brief=brief,
            )
            draft = await asyncio.wait_for(
                draft_agent.run(
                    request.model_dump_json(exclude={"review_brief", "report_brief"}),
                    usage_limits=UsageLimits(request_limit=3, total_tokens_limit=20000),
                ),
                timeout=60,
            )
            case["draft"] = draft.output.content
            leading = " ".join(f.title + " " + f.relevance for f in review.findings[:3]).lower()
            case["checks"] = {
                "represented_party": brief.client_role == role,
                "deliverable": brief.deliverable
                == ("client_update" if role == "tenant" else "negotiation_brief"),
                "grounded_findings": bool(review.findings)
                and all(
                    check_evidence(f, pages).evidence_status == "source_checked"
                    for f in review.findings
                ),
                "leading_findings_match_goal": any(
                    word in leading
                    for word in (
                        ["break", "exit", "notice"]
                        if role == "tenant"
                        else ["rent", "assignment", "sublet", "alienation"]
                    )
                ),
            }
            print(
                f"{role}: {sum(case['checks'].values())}/{len(case['checks'])} mechanical checks",
                flush=True,
            )
        except Exception as exc:
            case["error"] = type(exc).__name__
            print(f"{role}: {type(exc).__name__} (not a pass)", flush=True)
        finally:
            report["cases"].append(case)
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(json.dumps(report, indent=2) + "\n")
    cases = report["cases"]
    if all("brief" in case for case in cases):
        report["comparison"] = {
            "distinct_outlines": [item["title"].lower() for item in cases[0]["brief"]["sections"]]
            != [item["title"].lower() for item in cases[1]["brief"]["sections"]],
            "distinct_priorities": cases[0]["brief"]["priorities"]
            != cases[1]["brief"]["priorities"],
        }
    output.write_text(json.dumps(report, indent=2) + "\n")
    return int(
        any(
            case.get("error") or not case.get("checks") or not all(case["checks"].values())
            for case in cases
        )
        or not all(report.get("comparison", {}).values())
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Opt-in paired intent evaluation. Up to two planning, two review and two drafting runs incur model charges; uses synthetic fixtures only."
    )
    parser.add_argument("--lease", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--live", action="store_true")
    args = parser.parse_args()
    if not args.live:
        parser.error("Pass --live to enable billable model runs.")
    raise SystemExit(asyncio.run(evaluate(args.lease, args.output)))
