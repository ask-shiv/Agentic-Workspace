# Workflow comparison — 22 October 2026

This opt-in experiment used the same synthetic 100 Bishopsgate lease and tenant commercial-risk/client-update objective for both presets. It checks whether task context and outline change; it does not establish legal accuracy or repeatability. No real client documents were used.

| Run | Risk | Report |
| --- | --- | --- |
| [Baseline](2026-10-22-workflow-baseline.json) | Usage limit | Usage limit |
| [Concise-output recheck](2026-10-22-workflow-recheck.json) | Usage limit | Usage limit |
| [Targeted report trace](2026-10-22-workflow-report-trace.json) | Not rerun | Completed: 5/6 exact quotations |
| [Code-bounded retrieval](2026-10-22-workflow-bounded.json) | Completed: 1/6 exact quotations | Timeout |

The baseline differentiated planning context and deliverables. Report planning now proposes an opening position and next-steps bookends around document-specific topics. The final implementation respects an explicitly requested deliverable rather than overriding it with the preset; the retained paired plans predate that adjustment. A separate real browser planning call preserved the tenant role, report preset and requested client update with the proposed bookends. It was not followed by another browser investigation.

The diagnostic trace exposed excess page reads and an oversized next-step field requiring output repair. Concise-output guidance helped one targeted run complete, but this was not a paired passing evaluation. Tools now enforce two searches and four distinct page reads, with budget messages asking the agent to report unreviewed topics as limitations. Existing outer request/token/time limits remain unchanged. The last run reused earlier plans (recorded in the JSON), then ran both investigations against the bounded tools. The resulting low quote-match rate and timeout remain failures. Issues #47 and #28 track investigation reliability and claim-level attribution. Failed and unmatched quotations stay unverified in the UI.

Reproduce with a local billed key using `uv run python backend/tests/workflow_eval.py --live --lease sample-docs/commercial-lease-100-bishopsgate.pdf --output /tmp/workflow-evaluation.json`. Optional `--reuse-plans <previous-output.json>` checks fixture/goal identity and records reuse; it avoids planning calls but does not reuse investigation results. Source-code hashes identify the tested planning/review implementation. CI runs model-free contract, state and regression tests, not these billed calls. No claim is made that the preset reliably changes every finding, or that exact matches validate an interpretation.
