# Decisions

Document chat leaves lawyers to turn answers into usable work. I chose an intent-led workspace: state an objective, investigate a lease, inspect the evidence, and assemble an editable report. A PydanticAI review agent searches and reads document pages; the lawyer selects findings, writes their advice, and accepts or rejects proposed section drafts. The working slice is one text-based PDF, two intents (assess risk and build report), persistent report sections, and Markdown export.

I prioritised this over voice, broad integrations, and passive observation because it completes a concrete workflow beyond summarisation. Trust comes from showing exact passages and physical PDF pages, distinguishing source checks from interpretation, exposing missing facts, and keeping amendments under user control. The report remains editable and saves explicitly with revision checks. Review and drafting use separate configurations in the same co-agent experience; this is not an independent multi-agent verification system. Quotation matching establishes provenance, not legal accuracy or completeness.

With more time, the report would become an organisation-restricted living document with comments and attributable history. A brand kit could produce client-ready PDFs, and authorised Slack/Teams actions could distribute links. Explicitly saved preferences could inform future drafts; one client's decisions must not silently become another client's defaults. These are planned extensions, not implemented capabilities. Visual refinement follows the functional pass; a larger feature catalogue would weaken the initial demonstration.

## Built and verified

- Request cancellation/stale-response guards; visible conversation/upload errors; failed AI streams are not saved as answers.
- Review tools, a 100-second timeout, ten-model-request and 90,000-token limits, and a 600,000-character document cap. Keyword retrieval is deliberately simple.
- Up to eight structured findings; source quotation checks normalise whitespace and compare against the stated page. Unmatched evidence remains visibly unverified. The user can mark findings reviewed; this records their action, not certification.
- Intent and objective, finding cards, source inspection/navigation, add/drag into three editable sections, proposed drafts, and explicit acceptance.
- Postgres-backed report state with optimistic revision checks. A revision number prevents stale overwrites; it is not version history. Starting a new review preserves report text but clears old evidence attachments after confirmation.
- Server-generated Markdown attachment containing saved text, source quotations, review status, objective, revision and export date. Unsaved work must be saved first.
- Five focused Python tests, frontend lint/TypeScript production build, live persistence/conflict checks, and live review/drafting through the browser. The reusable smoke script checks a running stack without making model calls.
- Adversarial review identified a proposal/save race and an oversized-section edge case; both were corrected before merge.

## Limits and follow-ups — would complete with more time

- [Organisation collaboration and history](https://github.com/ask-shiv/Agentic-Workspace/issues/6): no authentication, tenancy, shared editing or organisation links yet. The inherited API exposes all conversations to whoever can reach it. Local demo only.
- [Brand kit, PDF and Slack/Teams](https://github.com/ask-shiv/Agentic-Workspace/issues/7): no branded exports or external posting implemented.
- [Preferences and contextual suggestions](https://github.com/ask-shiv/Agentic-Workspace/issues/8): no background observation, behavioural analytics or automatic learning. The objective and report are saved; onboarding dismissal is local to the browser.
- [Hardening](https://github.com/ask-shiv/Agentic-Workspace/issues/9): dependency locking, Docker build exclusions, upload streaming/filename handling, file retention, OCR, broader retrieval and context budgets, rate limits, production CORS/ports and deployment configuration remain follow-ups. Original document chat still sends the whole document/history and has heuristic citation counts; the new review uses checked evidence instead.
- The model can omit provisions, infer incorrect implications or draft unsupported wording. Prompt-injection resistance is instruction-based, not a security guarantee. No representative legal evaluation set or lawyer validation has been completed. Re-check amended report claims against their attachments.
- A fresh setup exposed Anthropic SDK 2 compatibility trouble; `anthropic<2` restored live calls. Python type-checking in this container was blocked by its missing `libatomic.so.1`; runtime tests and Python lint passed. The frontend build retains its inherited bundle-size warning.
- A rich text editor, section reordering, per-block evidence anchors and finer amendment diffs would improve the builder. This slice uses plain text sections and section-level evidence links.

## Submission still required

Part 1 technical-achievement Markdown and the 2–3 minute Loom are still to be supplied by the candidate. No placeholders are presented as completed submissions.

## Shared working conventions

The supplied personal skills are now portable project assets under `.agents/skills/`, referenced by `AGENTS.md`. Employer names, hard-coded teams, internal projects and mandatory paid-tool assumptions were removed. Scope discipline, concise PRs, evidence-based iteration and meaningful regression checks remain. Project copies are reviewable alongside code; global installation is a personal convenience. Each implementation pass records regression boundaries in `AGENTS.md` and product rationale here.
