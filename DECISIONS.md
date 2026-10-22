# Decisions

Document chat leaves lawyers to turn answers into usable work. I chose an intent-led workspace: state an objective, investigate a lease, inspect the evidence, and assemble an editable report. A PydanticAI review agent searches and reads document pages; the lawyer selects findings, writes their advice, and accepts or rejects proposed section drafts. The working slice is one text-based PDF, two intents (assess risk and build report), persistent report sections, and Markdown export.

I prioritised this over voice, broad integrations, and passive observation because it completes a concrete workflow beyond summarisation. Trust comes from showing exact passages and physical PDF pages, distinguishing source checks from interpretation, exposing missing facts, and keeping amendments under user control. The report remains editable and saves explicitly with revision checks. Review and drafting use separate configurations in the same co-agent experience; this is not an independent multi-agent verification system. Quotation matching establishes provenance, not legal accuracy or completeness.

With more time, the report would become an organisation-restricted living document with comments and attributable history. A brand kit could produce client-ready PDFs, and authorised Slack/Teams actions could distribute links. Explicitly saved preferences could inform future drafts; one client's decisions must not silently become another client's defaults. These are planned extensions, not implemented capabilities. Visual refinement follows the functional pass; a larger feature catalogue would weaken the initial demonstration.

## Built and verified

- Request cancellation/stale-response guards; visible conversation/upload errors; failed AI streams are not saved as answers.
- Review tools, a 100-second timeout, ten-model-request and 90,000-token limits, and a 600,000-character document cap. Keyword retrieval is deliberately simple.
- Up to eight structured findings; source quotation checks normalise whitespace and compare against the stated page. Unmatched evidence remains visibly unverified. The user can mark findings reviewed; this records their action, not certification.
- Intent and objective, finding cards, source inspection/navigation, add/drag into three editable sections, proposed drafts, and explicit acceptance.
- Postgres-backed report state with optimistic revision checks. Immutable saved snapshots support preview and restore as a new revision, alongside stale-write protection. Starting a new review preserves report text but clears old evidence attachments after confirmation.
- Server-generated Markdown attachment containing saved text, source quotations, review status, objective, revision and export date. Unsaved work must be saved first.
- Eleven focused Python tests, fifteen typed frontend tests including semantic accessibility checks, frontend lint/TypeScript production build, live persistence/conflict checks, and live review/drafting through the browser. The reusable smoke script checks a running stack without making model calls.
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

## Routing and source inspection pass

The workspace now has addressable routes (`/workspaces/:id`, `/settings`) and query state for review/report/chat views, source pages and citation locators. Reloading a workspace retrieves its persisted upload and report; Back/Forward works without treating the URL as an authorisation token. Citation locators derive from page/quotation identity rather than array order, so a new review cannot silently retarget a bookmark to a different finding by index. They contain no quotation text. If the finding no longer exists, its original page remains addressable but no matching highlight is claimed.

The source panel keeps the original PDF unchanged, highlights an exact rendered-text match where available, and offers selectable extracted page text. This helps verification and assistive reading without a mandatory third-party integration. Extraction and PDF text-layer differences can prevent highlighting; the reference passage remains inspectable. Secure collaborative links and protected organisation storage still require authentication, authorisation and retention controls (issues #6 and #18). Previous uploads persist locally today; routing does not make them secure.

App.tsx now composes providers and routes. The shell owns global navigation; a keyed workspace session owns request lifetimes and unsaved guards; the report builder owns report edits. The sidebar uses real links with sibling deletion controls rather than nested/hover-only buttons. Frontend tests exercise navigation and report behaviour; source-page endpoint tests exercise extraction and failure cases. Frontend Docker installs use npm ci and exclude host node_modules so adding the router cannot overwrite container dependencies with host binaries.

## Accessibility, personalisation and design pass

Accessibility is part of trust and professional usefulness, especially for a potential US rollout. The engineering target is [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/), a shared technical baseline rather than separate UK and US modes. UK service providers have reasonable-adjustment duties under the Equality Act 2010 (and Northern Ireland's DDA 1995); public-sector accessibility regulations have a distinct scope and WCAG 2.2 AA guidance. [UK government guidance](https://www.gov.uk/guidance/accessibility-requirements-for-public-sector-websites-and-apps). In the US, ADA Title III guidance for businesses differs from the Title II web rule for state/local government, which specifies WCAG 2.1 AA; federal procurement may introduce Section 508 requirements. Applicability depends on customers and deployment, not just the user's country. [DOJ business guidance](https://www.ada.gov/resources/web-guidance/), [Title II rule](https://www.ada.gov/resources/2024-03-08-web-rule/), [Section 508](https://www.access-board.gov/ict/). No legal compliance or full WCAG conformance is claimed by this demo.

The implemented foundation includes native labelled controls, a skip link, route-heading focus, visible focus, modal focus management, keyboard alternatives to dragging, source-text reading, and a local avatar/settings page. Small/Medium/Large scale the rem-based interface; higher contrast, system-aware reduced motion and a selectable reading view are user-controlled rather than a single disability-labelled mode. Additional keyboard shortcuts are opt-in: Alt+Shift+1/2 switches intent outside inputs, while Ctrl/Command+S saves. Browser zoom and assistive tools remain available. The report takes precedence in narrow panes, with evidence alongside it where space permits. These design choices reduce navigation and transcription effort while retaining evidence and the lawyer's control.

Speechify is an integration idea, not a connected service. Selectable HTML and extracted source pages are the first interoperability layer. A future speech integration needs user research, explicit permission, confidentiality/data-processing review and compatibility testing. Other candidates are per-section read-aloud controls, voice dictation into the objective, and configurable shortcuts. These are not implemented. The UK/US rollout and assistive-technology audit remains open in [issue #18](https://github.com/ask-shiv/Agentic-Workspace/issues/18), including VoiceOver/NVDA, zoom/reflow, contrast, legal applicability and organisation isolation.

The original Docker port mappings exposed the unauthenticated app beyond localhost. They now bind only to 127.0.0.1, including Postgres. CORS also allows only the two local frontend origins, limiting cross-origin browser access. These defaults reduce accidental exposure but do not authenticate local users or protect a future hosted deployment. Organisation sharing remains blocked on genuine backend permissions, not UI links.

Regression coverage now includes navigation/history, unsaved changes, citation identity and safe highlighting, editable report persistence, preference restoration, reading-mode preservation, shortcut conflicts and axe semantic checks. Axe in jsdom omits colour contrast and canvas-based label-content measurement and does not establish screen-reader usability. Large-text reflow and citation highlighting were checked in the live browser; a wider independent audit remains required. GitHub Actions runs type/lint/build/component tests and focused Python tests with a dummy API credential, without billed model calls. Each pass records its invariants in AGENTS.md.

The sidebar identifies uploaded files even before the lawyer asks a chat question; document-based work should not depend on chat title generation to become findable. Existing meaningful conversation titles remain visible.


## Recoverable reports and quiet momentum

Revision numbers now open a keyboard-accessible history dialog with read-only previews and explicit restore. Restore copies an older workspace into a new revision; it does not erase later work. The save and snapshot commit atomically, and a concurrent edit yields a conflict rather than being silently replaced. Restored quotations are checked again against the source. The migration captures the previously retained current state; older revisions that were never stored cannot be recovered. Snapshot capture times are labelled accordingly. Author attribution, revision diffs, retention policy and organisation permissions remain follow-ups in issue #6; this is not a regulated audit trail.

“Download report” replaces “Export Markdown”; its information tooltip explains the .md text format, saved-revision boundary and source references. PDF/Word exports are still future work. The report stays full-width until there is enough room for two readable panes; narrower workspaces scroll as one surface instead of pinning a tall control area. Findings have Previous/Next controls and always-available Alt+Up/Down navigation that moves focus, stops at the ends and ignores editors, modal dialogs and busy operations. Extra view/save shortcuts remain user-controlled.

The quiet “Your momentum” strip displays real counts of reviewed findings and started report sections, with optional, actionable ideas behind an expandable control. It does not interrupt or observe activity outside the workspace. Weekly hours saved would need a stated baseline and a trustworthy measurement method; claiming an arbitrary number would undermine the trust this product needs. A future opt-in measure could compare user-reported task duration against an agreed baseline, show its assumptions, and distinguish estimates from measured savings. Avoid rewarding speed over evidence checking or inventing peer adoption/social proof. This pass has 15 frontend tests and 11 Python tests, including Postgres restore/conflict checks, with migration execution in CI.

Fresh-database CI exposed an inherited mismatch: Alembic read a Docker-only URL while the app read DATABASE_URL. Migrations now share the application setting, so CI and deployments cannot silently target different databases.

## Explicit objective submission

The objective now has an adjacent Review document / Update review submit action, including Enter submission. Editing states the intended goal; submitting runs the agent. The action is disabled when the trimmed objective matches the last successful review, during loading or a request, or when too short. Report edits do not enable it. A failed request remains retryable, and replacement of existing findings still requires confirmation. This avoids accidental repeat calls while making the objective-to-review transition clear.

## Agent evaluation rather than another feature

A small opt-in [source-based evaluation](docs/evaluations/README.md) exercised six review runs on synthetic documents plus one draft, followed by one targeted review/draft recheck. It tested known lease facts, absent arrears records, a false premise, non-lease input, document instructions and repeated output. The adversarial trace confirms the injected text reached the model through a tool. Model-free CI also checks malformed structured output and the evaluator's failure cases.

This exposed real weaknesses despite matching quotations: inconsistent condition coverage, invented notice-service dates, unsupported rent-timing assumptions, and overbroad interpretations. Prompt changes reduced some risks in the targeted recheck; the preserved outputs still show incorrect clause labels in its draft. We therefore do not claim legal accuracy, comprehensive review, reliable consistency or full prompt-injection resistance. The result is deliberately mixed and reviewable. Lawyer-curated acceptance cases and claim/condition-level attribution are the next investment, ahead of more product features.

The remaining source-attribution and coverage work is prioritised in [issue #28](https://github.com/ask-shiv/Agentic-Workspace/issues/28).

## Focused design feedback

The objective submit stays the primary action; save, download and bookmark controls now sit in a quieter secondary area. “Copy workspace address” explicitly identifies a local bookmark, not an invitation: the report and upload persist in the local backend, while profile preferences are browser-local. Empty report sections explain how to start with evidence or write directly, and that proposing a draft requires linked evidence. The green settings outline is an actual focus indicator and is preserved, along with the existing Small/Medium/Large preferences and usable target sizes.

The trust boundary is explicit: saving revalidates attached quotation/page matches. It does not check whether edited report prose is semantically supported by that evidence. Claim-level validation remains follow-up #28; genuine organisation collaboration remains #6. The Loom should demonstrate review → evidence selection → human editing → saved draft, then describe collaboration as the next step rather than demoing a bookmark as shared editing.
