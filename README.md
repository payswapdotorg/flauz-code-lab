# flauz-code-lab

Evidence & prototype lab for [Flauz](https://github.com/payswapdotorg/Flauz) —
**Code OSS + agent/workspace/orchestration capabilities + a real browser + multi-model / multi-agent / multi-environment support.**

This repo is intentionally **not** a product implementation. It holds:

- `prototypes/` — small, low-install prototypes that kill architectural uncertainty
- `evidence/` — captured logs, screenshots, probe outputs backing every claim
- `docs/` — architecture decisions grounded in the vscode tree (`file:...` citations)

## Wave 1

| Branch | Lane |
|---|---|
| `wave1/b-browser-ux` | Browser integration + unified agent/workbench surface UX (Worker B) |

## Ground rules

1. Every architectural claim cites either a path in the Flauz (vscode) tree or an evidence file in this repo.
2. Prototypes must run with zero or minimal installs; long installs are aborted and documented as evidence.
3. Nothing here modifies the Flauz mirror; it is read-only reference.
