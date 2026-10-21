---
name: demo-not-doc
description: Build a focused, demoable product experiment in a branch. Use when the user requests a working prototype or experimental feature rather than another proposal.
---

# Build the demo

Choose the smallest end-to-end outcome that tests the product idea. Use the existing libraries and conventions before adding infrastructure.

- Start with a short acceptance statement, exclusions and a time budget. Use a focused branch and link an issue when the workflow calls for it.
- Use the project's existing feature flag or another proportionate rollback boundary when needed. Do not introduce a paid flag service solely to satisfy this skill. Describe activation and rollback honestly.
- Build real code paths. Clearly label previews and deferred integrations; never simulate successful AI, sharing, security or persistence.
- Keep the implementation simple. Separate independent bets rather than building a general framework.
- Add provenance to exported artefacts. Add useful instrumentation only within the authorised data/privacy scope and existing stack; do not introduce external analytics by default.
- Run an adversarial review before pushing substantial changes. When delegation is available and authorised, ask an independent reviewer to find concrete correctness, overengineering and regression risks. Record deferred findings in issues or project documentation.
- Verify the running journey and focused checks. Capture what was actually tested and what remains uncertain.
- Document what works, how to try it and what is deliberately missing. The demo should answer a concrete product question.

Use [bau-workflow](../bau-workflow/SKILL.md) for concise commit/PR conventions. Do not message colleagues, enable services, publish or merge unless the user has authorised those actions. Finish the working slice before asking about optional expansions.
