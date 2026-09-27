# Flauz Code Lab — Autonomous Agent Rules

This repository is the research, evidence, prototype, and handoff control plane for the Code OSS-based Flauz direction.

Before implementation or research, read in this order:

1. `docs/AUTONOMOUS-EXECUTION.md`
2. `docs/CURRENT-STATE.md`
3. `docs/TECH-LEAD-HANDOFF.md`
4. `ROADMAP.md`
5. the specific work-order or decision record for the active task

## Repository roles

- `payswapdotorg/flauz-code-lab` = research/prototype/evidence/handoff repo.
- `payswapdotorg/Flauz` = Code OSS fork and product implementation line.
- The active Flauz product line currently lives on `payswapdotorg/Flauz:flauz/main`, not the fork's default upstream `main`.
- Do not create a second Code OSS copy in this repository.

## Autonomous operation

No chat history is required to continue the roadmap.

A worker/lead must derive its next action from the repository state and the referenced product branch, not from prior conversation.

## Safety

- Do not claim a product capability exists merely because a prototype or document describes it.
- Label every result as prototype, verified, integrated, or blocked.
- Never commit secrets, credentials, tokens, private connection material, or browser session state.
- Do not rewrite or erase evidence from previous waves.
- Keep experiments reproducible and bounded.
