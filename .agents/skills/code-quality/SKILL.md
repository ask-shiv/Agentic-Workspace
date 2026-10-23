---
name: code-quality
description: Review and improve repository readability and maintainability through focused, behaviour-preserving cleanup. Use for quality passes and extractions, not product redesign.
---

# Focused code quality

Read AGENTS.md, the affected source and its consumers. Inspect the working diff and preserve existing user edits. Propose the scope and approximate diff before broad reorganisations; do not migrate the whole repository for a small extraction.

## Repository conventions

- Aim for authored source files around 300 lines or fewer. Treat this as a review threshold, not a reason to fragment cohesive code. Record existing oversized files as debt when outside scope.
- Extract components along existing responsibilities. Keep state with its owner; avoid replacing a large component with an equally large hook or adding speculative abstractions.
- For new page/route folders, prefer PageName.tsx with explicit public exports through index.tsx. Do not rename unrelated existing routes just to adopt the convention.
- Place utilities in utils/ at the narrowest useful owner: shared utilities near the relevant route root, tightly coupled utilities beside their component/page. Export through that utils/index.ts using explicit named exports. Avoid circular barrel imports and unrelated catch-all helpers.
- Put utility behaviour tests in utils/__test__/. Ensure the test runner and TypeScript configuration discover them before introducing this layout. Production functions stay outside test folders.
- Keep moves separate from intentional wording, visual or behavioural changes in the diff explanation. Preserve existing code comments; do not add explanatory comments when clear naming or the PR can explain the choice.

## Regression harness

- Follow AGENTS.md verification commands. Run frontend lint/type checks, relevant existing tests and the production build for frontend extractions. Exercise affected browser interactions for visual changes.
- Preserve workflow defaults, explicit brief agreement, stale-request cancellation, source identity and immutable PDF bytes, human acceptance of drafts, save/conflict/history behaviour and keyboard access.
- Add tests for meaningful behaviour or an exposed failure, not component filenames, folder locations or moved implementation details. Source quotation matching does not establish legal correctness.
- Respect reduced motion and high contrast when restoring decorative effects. Do not remove intentional product details merely because they are decorative.
- Summarise moved code, intentional changes, checks and remaining debt. Record durable regression boundaries in AGENTS.md and product/scope tradeoffs in DECISIONS.md. The skill does not authorise publishing, merging or external actions beyond the user's request.
