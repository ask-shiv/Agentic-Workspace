# Quotation and timeout fix — 22 October 2026

Issue #47 concerned reconstructed quotations and open-ended retrieval exhausting the investigation budget. The replacement is a bounded agent workflow: application code selects exact overlapping page excerpts, the model selects their IDs and writes interpretations, and code resolves those IDs to the saved source text. The model cannot supply quotation text, page numbers or source-check status. Unknown IDs withhold the entire finding and add a visible gap. Up to four separate excerpts can support one finding; each retains its own source link rather than being joined into a fabricated quotation.

The original 100-second deadline is unchanged. Analysis permits two model requests (initial response plus at most one validation repair), 30,000 total tokens and 4,500 output tokens per response. The previous loop allowed ten requests and 90,000 total tokens. The evidence pack is limited to 36,000 source characters / 40 excerpts; larger sources are ranked using the objective and agreed priorities and always produce a code-generated partial-review warning. This retrieval strategy is deliberately simple, not an exhaustive large-document review.

## Retained results

| Final live run | Time | Responses | Findings | Attached quotations |
| --- | --- | --- | --- | --- |
| [Risk 1](2026-10-22-reliability-pair-1.json) | 23.60s | 1 | 6 | 15/15 exact matches |
| [Report 1](2026-10-22-reliability-pair-1.json) | 23.18s | 1 | 6 | 12/12 exact matches |
| [Risk 2](2026-10-22-reliability-pair-2.json) | 23.39s | 1 | 6 | 15/15 exact matches |
| [Report 2](2026-10-22-reliability-pair-2.json) | 23.09s | 1 | 6 | 12/12 exact matches |

All four investigations used the same synthetic PDF and retained broad-objective briefs as the failed comparison. Planning was reused intentionally to isolate the investigation change. Both repeats have the same leading risk topics; this is a small repeated check, not a statistical consistency benchmark. All 54 attached quotations matched their stated pages when checked against PDF extraction. That result primarily tests correct source-ID resolution and preservation: quotes now come from code, so it is not a score for the model's ability to quote accurately or interpret law.

The [six-case adversarial run](2026-10-22-reliability-adversarial.json) passes its existing heuristics for two repeated break-right reviews, missing arrears facts, a false termination premise, a non-lease document and injected document instructions. Calls took 2.43–17.88s and used one response each. The injection check confirms the hostile marker reached the model's evidence-pack prompt; the old tool-return exposure check no longer describes this architecture. Drafting was deliberately excluded (`--skip-draft`); this pass makes no new claim about generated report prose or follow-up chat reliability.

A [real HTTP check](2026-10-22-reliability-http.json) uploaded the synthetic lease, investigated in 23.45s, independently verified all 15 attached passages in six findings, saved and reloaded every reference, exported supporting evidence and compared the served PDF bytes with the uploaded original. Browser verification followed the second break-clause citation to its own exact-source overlay and upload fingerprint. The labelled local workspace is retained for inspection; existing user workspaces were not overwritten.

## Failures and limits

The [overly tight candidate contract failed](2026-10-22-reliability-length-failures.json): character limits of 100/600/300 prompted validation errors on broad objectives. The final contract retains the original public text limits, asks for short sentences and allows one bounded repair; quotations retain their original 1,500-character limit and exact-match rule. An intermediate single-reference candidate achieved exact text matches but manual inspection found compound findings referring to neighbouring excerpts; this motivated the multiple-reference contract. Neither failed candidate is presented as the final result. The earlier [timeout/quotation failures](workflows.md) remain intact.

These checks do not establish legal correctness, complete material-risk coverage or resistance to arbitrary injection. Manual inspection still found overbroad absence/uncertainty statements and potential reliance on definitions outside an attached passage. A correct source quote can accompany an unsupported claim. Claim-level attribution, cautious legal reasoning and lawyer-reviewed acceptance criteria remain issue #28. Large-document relevance is regression-tested mechanically, not live-benchmarked on a real deal corpus. Provider outages and invalid responses still fail safely and can require retry. No legal deadline or compliance guarantee is claimed.

Run the paired workflow evaluator as described in [workflows.md], or `uv run python backend/tests/agent_eval.py --live --skip-draft --lease sample-docs/commercial-lease-100-bishopsgate.pdf --output /tmp/reliability-adversarial.json`. Live calls are opt-in and billed; normal CI is model-free. Source hashes in the records identify the tested implementation.
