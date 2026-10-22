# Orbital — Product Engineering Take-Home

Welcome! This is a take-home assessment for a Product Engineering role at Orbital.

You've been given a working baseline application: a document Q&A tool for commercial real estate lawyers. Users upload legal documents (leases, title reports, environmental assessments) and ask questions about them. The AI assistant answers questions grounded in the document content.

The app works, but it has limitations. Your job is to extend it.

---

## Setup

### Prerequisites
- Docker and Docker Compose
- just (command runner) — install via `brew install just` or `cargo install just`

That's it. Everything else runs inside containers.

### Getting Started

1. Clone this repository

2. Run the setup command:
```
just setup
```
   This copies `.env.example` to `.env` and builds the Docker images.

3. Add your Anthropic API key to `.env`:
```
ANTHROPIC_API_KEY=your_key_here
```
   We've provided an API key in the task email. You can also use your own.

4. Start everything:
```
just dev
```
   This starts PostgreSQL, the FastAPI backend (port 8000), and the React frontend (port 5173).
   Database migrations run automatically when the backend starts — no separate step needed.

5. Open http://localhost:5173 in your browser.

Your local `backend/src/` and `frontend/src/` directories are mounted into the containers —
edit files normally on your machine and changes hot-reload automatically.

### Sample Documents

We've included sample legal documents in `sample-docs/` for testing.

### Project Structure

- `frontend/` — React frontend (Vite + Tailwind + shadcn/Radix UI)
- `backend/` — FastAPI backend (Python 3.12 + SQLAlchemy + PydanticAI)
- `alembic/` — Database migrations
- `sample-docs/` — Sample PDF documents for testing

### Useful Commands

- `just dev` — Start full stack (Postgres + backend + frontend)
- `just stop` — Stop all services
- `just reset` — Stop everything and clear database
- `just check` — Run all linters and type checks
- `just fmt` — Format all code
- `just db-init` — Run database migrations
- `just db-shell` — Open a psql shell
- `just shell-backend` — Shell into backend container
- `just logs-backend` — Tail backend logs

## Agentic workspace

See [DECISIONS.md](DECISIONS.md) for rationale, trust boundaries and clearly marked follow-ups.

I referenced [Orbital’s product demo](https://www.youtube.com/watch?v=iYuZb8JAEIs) while developing this take-home to understand the product beyond the starter app. Seeing document review, reporting and source navigation in context helped me focus this take-home on connecting those capabilities around the lawyer’s intent: an agreed objective that carries through investigation, evidence selection and an editable report.

1. Create/select a conversation and upload a text-based PDF from `sample-docs/`.
2. Enter an objective, such as “Review the tenant break clause and notice conditions”, then select **Review document**. A review may take up to 100 seconds and makes billed model calls.
3. Inspect each finding's quotation and PDF page. **Source checked** confirms a text match, not a legal conclusion. Unverified quotations are explicitly labelled.
4. Switch to **Build report**. Choose a destination section and add findings, or drag them into the section. Edit the text directly; evidence remains attached for re-checking.
5. Select **Propose a draft** on a section with evidence. Review the proposal and accept or reject it. Existing text is not replaced until acceptance.
6. **Save workspace**, then **Download report**. Return to the same conversation after reload to retrieve the saved work. Stale saves from another tab are rejected.

Conversations and the source PDF can be toggled for narrow screens. Document chat remains available. No background observation or collaborative sharing is implemented. Keep this unauthenticated demo local.

### Focused verification

Development containers mount the test directories. After starting the stack, run `just test`, or:

```sh
docker compose exec -T backend uv run pytest backend/tests/test_message_failure.py backend/tests/test_review.py backend/tests/test_workspace.py -q
cd frontend
npm ci
npm run check
npm run build
```

From the repository root, with the app running, verify persistence and stale-save rejection without model charges:

```sh
python3 scripts/smoke_workspace.py
```

The smoke script creates and removes its own test conversation. API credentials belong only in ignored `.env`; never commit them.

### Submission status

Loom walkthrough: not yet recorded. Part 1 technical-achievement Markdown: not yet added.

### Navigation and reading preferences

Saved workspaces have bookmarkable URLs under `/workspaces/:id`. Review/report/chat views and source citations can be linked directly. These are local bookmarks and do not grant access; organisation sharing is not implemented. Services bind to 127.0.0.1.

Open the avatar in the top right for local display settings: text size, contrast, reduced motion, reading view and optional shortcuts. Names and preferences stay in this browser. Speechify is not connected; selectable report/source text is provided for assistive reading workflows.

Run `cd frontend && npm test` for typed navigation, report and accessibility regression tests. Automated semantic checks exclude contrast in jsdom; see DECISIONS.md for audit limits and jurisdictional sources. CI runs these checks on PRs and main. The checked-in `.agents/skills/` and AGENTS.md document the portable working conventions.

Report history is available from the revision button. Previewing is read-only; restoring requires confirmation and creates a new revision. History begins at the state retained when the feature was enabled. Alt+Up/Down moves focus through findings outside editors and dialogs, even with optional shortcuts disabled. “Download report” exports the last saved report as a .md text file. The momentum strip shows current-workspace activity; it does not claim measured time savings.

### Agent validation

The [source-based evaluation report](docs/evaluations/README.md) preserves synthetic baseline failures and a targeted recheck. Run the opt-in live evaluator only with a local key; it incurs model usage. Normal CI runs model-free regression tests. Matching quotes and page numbers do not validate every claim or clause label; remaining failures are explicit in the report.


### Try the intent-led journey

Start on Home, choose Assess risk or Build report, and enter a concrete objective such as “Help my tenant exit in 2029; prepare a client update”, Continue to add a text-based PDF as context, then choose **Plan my work**. Correct the proposed represented party, outcome, priorities and outline before **Agree brief and investigate**. Apply the outline explicitly, add findings to sections, request a draft and accept only the text you want. Save to retain the brief, evidence and report together. The same agreed brief accompanies subsequent document-chat questions.

The purpose locks once work starts. **Change purpose** warns and pauses evidence selection, drafting, contextual chat and download until reinvestigation; a changed brief also needs its outline applied. Existing text remains available and populated outlines are saved as revisions before replacement. Planning is fallible: the paired evaluation demonstrates different tenant/landlord workflows but retains quotation and unsupported-claim failures. Read the [actual evaluation results](docs/evaluations/README.md) before treating any generated output as reliable legal analysis.


### Original source integrity

Highlights are a separate visual overlay; the agent and report editor do not rewrite the original PDF. New uploads have an upload-time SHA-256 fingerprint, checked before the same verified byte snapshot is served. A changed file is rejected. Older uploads are explicitly labelled as lacking an upload-time fingerprint; re-upload the trusted original to enable that verification. An exact highlight locates text, not legal correctness. Unmatched quotations remain inspectable with a warning and no invented highlight.


### Intent-first workspace

The supplied Orbital product walkthrough informed the charcoal shell, supplied logo, restrained blue actions and persistent sidebar. Home centres the two workflow presets and a concrete objective. Evidence, report, follow-up questions, revision history, saving and downloading live in the sidebar; navigating between those views preserves the agreed task and human edits.

The presets change planning and the task context sent to investigation, drafting and follow-up questions. Assess risk prioritises exposure, conditions and negotiation decisions; Build report emphasises an audience-specific deliverable with an editable opening and next steps. An explicit requested format takes precedence over preset defaults. Changing workflows requires a newly agreed investigation. See the [reliability fix and repeated source checks](docs/evaluations/reliability.md) for the resolved quotation/timeout failures and remaining claim-level work in #28.


Investigations now select exact source-passage IDs rather than composing quotations. Compound findings retain separate supporting citations in the reader, saved revisions and downloads. Oversized sources are explicitly labelled partial reviews. Repeated synthetic risk/report checks completed in about 23 seconds; these are engineering checks, not legal assurance. A labelled “Reliability check — synthetic lease” workspace is available locally for inspection.
