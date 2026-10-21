---
name: move-dont-redesign
description: Extract or relocate existing code while preserving behaviour. Use for a scoped reuse/refactor request; separate redesigns and new capabilities from the move.
---

# Move, do not redesign

Read the full source and its consumers. Extract only an existing seam; do not invent an abstraction for speculative callers.

- Preserve logic, rendering, defaults and public behaviour. Change imports, names and necessary parameters only.
- Aim for roughly 97% unchanged relocated code. This is a review heuristic, not a numerical gate; explain material deviations rather than gaming line counts.
- Classify changed lines as moves, renames, mechanical wiring or behaviour changes. Separate requested functional changes into their own commit or PR when practical.
- Do not bundle cleanup, new validation, performance work or a visual redesign into a relocation. Track them separately unless explicitly requested together.
- Verify old callers still behave correctly. Run focused checks and tests for the seam; do not add tests that merely assert file locations or implementation spelling.
- Do not author code comments; explain non-obvious decisions in the PR or AGENTS.md. Preserve existing provenance.

Follow [bau-workflow](../bau-workflow/SKILL.md) for concise commits and PRs. Explicit user instructions take precedence over this default scope discipline.
