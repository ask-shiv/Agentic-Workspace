---
name: bau-workflow
description: Implement focused maintenance changes with minimal diffs and concise commits and PRs. Use for UI fixes and ordinary tickets, not exploratory prototypes or broad refactors.
---

# Focused maintenance

Read the issue, relevant files and repository AGENTS.md before editing. Use the supplied design or requirements as the source of truth; label assumptions.

- Separate requested changes from unrelated improvements. Implement only the requested scope.
- A visual request does not authorise unrelated changes to state, handlers, timing or data flow. Existing explicit user authorisation covers requested behaviour; do not ask again for it.
- Keep explanations in the PR. Do not add code comments unless explicitly requested; preserve existing provenance comments.
- Audit the diff for requested, mechanical and unrelated changes. Revert unrelated changes or record a follow-up.
- Verify visual changes in the running app. Run the repository's relevant formatter, lint, type checks and focused regression tests. Do not blindly copy commands from another project.
- For API work, trace the request from UI to storage and explain guarantees or gaps concisely when useful. Teaching is optional, not an approval gate.

## Commits and PRs

Use short lowercase human titles with feat:, fix:, chore: or docs:. PR bodies have three or four short lowercase lines: what changed, why, and what was or was not verified. No headings, tables or bullets. Link the issue. Keep the description current.

Suggest file:line reviewer comments only for non-obvious trade-offs; do not post them unless asked. Create, push, merge and message only within the user's authorised scope. Never enable auto-merge or change someone else's branch without authorisation.
