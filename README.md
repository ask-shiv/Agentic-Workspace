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

1. Create/select a conversation and upload a text-based PDF from `sample-docs/`.
2. Enter an objective, such as “Review the tenant break clause and notice conditions”, then select **Review document**. A review may take up to 100 seconds and makes billed model calls.
3. Inspect each finding's quotation and PDF page. **Source checked** confirms a text match, not a legal conclusion. Unverified quotations are explicitly labelled.
4. Switch to **Build report**. Choose a destination section and add findings, or drag them into the section. Edit the text directly; evidence remains attached for re-checking.
5. Select **Propose a draft** on a section with evidence. Review the proposal and accept or reject it. Existing text is not replaced until acceptance.
6. **Save workspace**, then **Export Markdown**. Return to the same conversation after reload to retrieve the saved work. Stale saves from another tab are rejected.

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

Saved workspaces have bookmarkable URLs under `/workspaces/:id`. Review/report/chat intent and source citations can be linked directly. These are local bookmarks and do not grant access; organisation sharing is not implemented. Services bind to 127.0.0.1.

Open the avatar in the top right for local display settings: text size, contrast, reduced motion, reading view and optional shortcuts. Names and preferences stay in this browser. Speechify is not connected; selectable report/source text is provided for assistive reading workflows.

Run `cd frontend && npm test` for typed navigation, report and accessibility regression tests. Automated semantic checks exclude contrast in jsdom; see DECISIONS.md for audit limits and jurisdictional sources. CI runs these checks on PRs and main. The checked-in `.agents/skills/` and AGENTS.md document the portable working conventions.
