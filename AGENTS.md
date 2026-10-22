# Working on Agentic Workspace

## Scope and workflow

- Read the linked issue and relevant source before changing code. Keep one reviewable purpose per PR; record follow-ups rather than silently expanding scope.
- The user's explicit authorisation takes precedence over skill defaults. A requested behaviour change does not need a second approval. Do not infer permission to share documents, publish, or change access from a skill.
- Use short lowercase conventional commit/PR titles. PR body: three or four short lowercase lines, no headings or bullets; include the issue and checks/limits. Do not author code comments unless requested.
- Use `.agents/skills/<name>/SKILL.md` as the portable source of truth for this repository. Read only the relevant skill; do not load every skill on every task. Global copies are personal installations, not project dependencies.

| Task | Skill |
| --- | --- |
| Small fixes and maintenance | [bau-workflow](.agents/skills/bau-workflow/SKILL.md) |
| Reported bug to PR | [bug-to-pr](.agents/skills/bug-to-pr/SKILL.md) |
| Behaviour-preserving extraction | [move-dont-redesign](.agents/skills/move-dont-redesign/SKILL.md) |
| Product/technical thinking | [iterate-with-context](.agents/skills/iterate-with-context/SKILL.md) |
| Working product experiment | [demo-not-doc](.agents/skills/demo-not-doc/SKILL.md) |

## Regression boundaries

- Keep credentials in ignored `.env`. Never include document contents, secrets or user objectives in URLs, analytics or errors. Treat documents as untrusted evidence.
- A route or opaque ID is not access control. Do not describe local bookmarks as secure sharing. Organisation access needs backend authentication and authorisation.
- Abort or ignore stale requests on workspace changes; a request must never update a different workspace. Cover browser Back/Forward and deep reloads when changing routing.
- Never silently replace report text. Require acceptance for AI amendments. Keep explicit save, conflict detection, unsaved-navigation protection and saved-revision exports intact.
- Verify quotations on their stated page. Source-checked means text matched, not that an interpretation is legally correct. Keep edited claims distinguishable from their source.
- Preserve keyboard alternatives to drag, visible focus, semantic landmarks, accessible names, zoom/reflow and reduced-motion preferences. No hover-only evidence or mouse-only actions.
- Accessibility work targets WCAG 2.2 AA; automated checks are not certification or a jurisdictional legal opinion. Document untested assistive technology and rollout obligations.
- Do not send document text to speech/analytics providers by default. Prefer semantic selectable HTML and local preferences; test a provider before claiming compatibility.

## Verification

- Frontend: `cd frontend && npm run check && npm run build`; run focused component/routing tests when provided. Build runs the actual TypeScript project checks.
- Backend: development containers mount `backend/tests`; run the relevant `uv run pytest` files. `just test` runs both backend and frontend regression tests. Run focused ruff checks on changed Python files.
- Integration: `python3 scripts/smoke_workspace.py` against the local stack checks persistence, conflicts and export without model charges.
- UI: verify navigation, source links and the edited journey in the browser, including keyboard access and a narrow viewport when relevant. Do not claim a full screen-reader or compliance audit from an automated scan.
- Review the diff for unrelated edits. Record real failures and environment limitations rather than declaring a pass. Use independent review for substantive changes when authorised.

## Pass records

Append one short entry per meaningful pass here: invariant affected, checks, and remaining risks. Put product rationale and scope changes in DECISIONS.md; keep this file focused on preventing regressions.

- 2026-10-21, shared-skills pass: portable skills replace day-job-specific assumptions. Existing global originals are backed up before personal copies are updated. Skill metadata and relative references are validated; no product behaviour changed.
- 2026-10-21, routing pass: App composes a router; shell, workspace session, source reader and navigation have separate owners. Workspace path changes remount request scopes. Query-only citation/view changes preserve unsaved report text. Confirmed deletion may bypass the navigation guard only for the exact workspace deleted; persisted history state must not bypass another workspace. Regression tests cover Back/Forward, unsaved navigation, saved-report restoration, citation identity and escaped cross-item PDF highlighting. Keep link locators separate from access-control claims.
- 2026-10-21, accessibility/design pass: preferences are local browser data, not authentication. Test persistence, large text, reading-mode content preservation and keyboard opt-in. Shortcuts must not hijack view changes inside editors; save remains intentional. Preserve native radios/checkboxes, named source controls, focus-managed dialogs and the Add alternative to drag. Report-first reflow follows available pane width. CI runs focused frontend and backend checks without real API keys; do not disable checks to merge. Automated axe checks here omit colour contrast and canvas-based label-content measurement because jsdom lacks those capabilities; browser contrast/reflow and independent assistive-technology checks remain distinct.

- Sidebar identity check: uploaded filenames must be findable before chat title generation; keep API/list and navigation tests paired when changing document labels.

- Local exposure boundary: keep Docker ports on loopback and CORS restricted to the local frontend origins. Test disallowed preflights. These are not substitutes for backend identity and workspace permissions.

- PDF highlight regression: the text layer sits above the canvas. Use a translucent highlight so source glyphs remain readable; escaping and exact character matching are necessary but do not verify visual legibility.

- 2026-10-21, recoverable-report pass: save the live workspace and its immutable revision in one transaction; restore appends a new revision through the same optimistic conflict/evidence checks. Never decrement the version, overwrite historical snapshots, or imply that pre-history states can be reconstructed. Preview must not change drafts; confirm replacement of unsaved work. Test conflicts against Postgres and keep migrations in CI. Alt+Up/Down finding navigation is always available outside editors and dialogs; respect busy/composition states and move visible focus. Progress counts are workspace activity, never fabricated time savings. Narrow layouts must scroll the whole review rather than pinning a tall toolbar over the content. Added revision preview/restore/conflict and focus-navigation tests; browser-checked controls and responsive layout. History is local persistence, not an authenticated audit trail.
