---
name: bug-to-pr
description: Investigate a reported bug, make a focused fix and prepare a reviewed pull request. Use when asked to fix a bug and open a PR; issue tracker and merge actions require task authorisation.
---

# Bug to pull request

Use the conventions in [bau-workflow](../bau-workflow/SKILL.md).

1. Inspect the current checkout and remote base without losing local work. Reproduce the symptom and identify the root cause before selecting a fix.
2. Use the requested issue tracker and repository. If authorised, create or update a succinct issue: problem, cause, acceptance and exclusions. Do not assume a team, assignee or external service.
3. Work on a focused branch. Use a worktree when isolation is needed; do not switch away from user work or reset it.
4. Make the smallest fix. Functional changes explicitly requested by the user are authorised; ask only if the needed behaviour is materially outside that scope.
5. Add a meaningful regression test when warranted. Prove it fails without the fix where practical. State when the environment cannot exercise the failure.
6. Size review to risk: inspect causes and neighbouring consumers for small display fixes; use independent review for shared logic or data/access changes when delegation is available and authorised. Resolve real findings and record deferred ones.
7. Run relevant checks, audit the diff and open a short issue-linked PR if requested. Do not claim checks you could not run. Merge only when authorised and required checks pass.

Report the issue/PR links, cause, verification and any remaining limitation briefly. Remove only task-owned temporary worktrees once their work is safely preserved.
