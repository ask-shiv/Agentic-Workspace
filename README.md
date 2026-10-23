# Agentic Workspace — Orbital take-home

An intent-led workspace for commercial property lawyers: agree the work, investigate a document, inspect cited evidence and turn selected findings into an editable client briefing. The lawyer owns the judgment and the final wording; the agent proposes evidence and drafts.

Start with [the three-paragraph rationale](DECISIONS.md), [the completed engineering rehearsal](docs/REHEARSAL.md), then [the walkthrough script](docs/LOOM_SCRIPT.md). This is an independently created repository, not a GitHub fork.

**Submission status:** the working prototype and evaluation notes are included. Part 1 should be uploaded separately as a PDF through the assignment form. The recorded 2–3-minute Loom link is still required; it is not represented as complete.

## Try the core journey

1. Start on Home, keep **Build report** selected and choose **Add document**. Use `sample-docs/commercial-lease-100-bishopsgate.pdf` for a synthetic demonstration.
2. Enter: “I advise the tenant considering a 2029 exit. Prepare a short client briefing on break conditions, costs and unanswered questions. Do not assume compliance or calculate notice-service deadlines.” An objective is optional; blank entry proposes a brief for confirmation.
3. Plan the work, check the proposed brief and choose **Agree brief and investigate**.
4. Open a finding's citation and compare its exact passage with the original PDF. Add useful findings to the report.
5. Open **Write report**, apply the agreed outline if prompted, write your advice or request a proposed draft, and review it before accepting.
6. Use **Workspace tools** to save and download the saved report. Reload the workspace to check persistence; history can preview and restore saved revisions.

**Scope:** one text-based PDF per workspace; local, unauthenticated persistence; Markdown downloads. No organisation sharing, multi-document analysis, OCR or PDF/Word export. Source checks verify quoted text, not legal correctness. Generated drafts require review, particularly dates, negative assertions and conditions. See [evaluation limits](docs/evaluations/reliability.md) and DECISIONS.md.

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
   Supply an Anthropic API key locally. Never commit it or display it in the walkthrough.

4. Start everything:
```
just dev
```
   This starts PostgreSQL, the FastAPI backend (port 8000), and the React frontend (port 5173).
   Database migrations run automatically when the backend starts — no separate step needed.

5. Open http://localhost:5173 in your browser.

Your local `backend/src/` and `frontend/src/` directories are mounted into the containers —
edit files normally on your machine and changes hot-reload automatically.

### Setup without just

Docker Compose is sufficient if you do not have the optional `just` command runner:

```sh
cp -n .env.example .env
# Edit .env and set ANTHROPIC_API_KEY locally.
docker compose up --build
```

Keep the stack bound to localhost. `docker compose down` stops it; do not use `down -v` unless you intend to delete saved workspaces. The standard tests use no model calls; live evaluation scripts require explicit opt-in and incur API usage.

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

Follow the core journey at the top of this README. Planning, investigation and drafting make billed model calls; review has a 100-second deadline.

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

Loom walkthrough: awaiting the candidate’s recording link. Part 1: the candidate’s two-page achievement PDF is supplied separately through the submission form. The [recording script](docs/LOOM_SCRIPT.md) is preparation material, not a recorded video.

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

The supplied Orbital product walkthrough informed the charcoal shell, supplied logo, restrained blue actions and persistent sidebar. Home offers two workflow presets plus document chat, with an optional objective. Evidence, report, follow-up questions, revision history, saving and downloading live in the sidebar; navigating between those views preserves the agreed task and human edits.

The presets change planning and the task context sent to investigation, drafting and follow-up questions. Assess risk prioritises exposure, conditions and negotiation decisions; Build report emphasises an audience-specific deliverable with an editable opening and next steps. An explicit requested format takes precedence over preset defaults. Changing workflows requires a newly agreed investigation. See the [reliability fix and repeated source checks](docs/evaluations/reliability.md) for the resolved quotation/timeout failures and remaining claim-level work in #28.


Investigations now select exact source-passage IDs rather than composing quotations. Compound findings retain separate supporting citations in the reader, saved revisions and downloads. Oversized sources are explicitly labelled partial reviews. Repeated synthetic risk/report checks completed in about 23 seconds; these are engineering checks, not legal assurance. A labelled “Reliability check — synthetic lease” workspace is available locally for inspection.


Home/New workspace starts clean with **What are you trying to achieve?**. Choose a working preset and objective, or add a document first. A saved local profile name supplies the personal welcome. The removed time-pressure option is documented as future “Brief me” work in DECISIONS.md. Saved workspace links resume the existing matter.
