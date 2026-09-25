```markdown
# Upstream Strategy (Wave 1 / Worker A)

Goal: **FORK-CRITICAL surface → zero** at Wave 1 and kept near-zero forever; every divergence
either (a) leaves `src/vs/**` untouched, or (b) is ledgered with a demotion alternative.

## Classification of planned surfaces

| Surface | Class | Home / mechanism |
|---|---|---|
| Branding, names, IDs, update/gallery endpoints | UPSTREAM-DIVERGENT | product.json **only**, via a separate `product.flauz.json` applied at build time (no conflict with upstream's `product.json`) |
| Built-in Flauz extensions (Agent Bridge, defaults, providers, browser) | UPSTREAM-FRIENDLY | `extensions/flauz-*` — additive dirs; upstream rarely touches unrelated built-ins |
| Flauz workbench contrib (UI plumbing that must live in-tree) | UPSTREAM-FRIENDLY | `src/vs/workbench/contrib/flauz/` — new additive dir; rebase-clean |
| Proposed-API usage | UPSTREAM-FRIENDLY | gated per-extension via product.json `extensionEnabledApiProposals`; pin API versions |
| Default layout/UX preferences | UPSTREAM-SAFE | `contributes.configurationDefaults` in built-in ext — **not** core patches |
| Environment providers (SSH/containers/E2B/cloud) | UPSTREAM-SAFE | `vscode.proposed.resolvers` (`registerRemoteAuthorityResolver`) + tunnels CLI — extension-level |
| Browser v1/v2 | UPSTREAM-SAFE | `extensions/simple-browser` precedent; CDP browser lives in Flauz service |
| Collaboration service | UPSTREAM-FRIENDLY | Flauz service + extension; **fork-critical only if** Monaco core hooks required → demoted (design against ext-host shared models; Live Share precedent) |
| CLI additions | UPSTREAM-FRIENDLY | separate `flauz` binary/service; avoid editing `cli/src/` (upstream churn) — external process wrapping `code tunnel` |
| Update channel / packaging / CI branding | UPSTREAM-DIVERGENT | `build/flauz/` patches + own CI; never edit `build/lib/**` in place |
| Custom product-level telemetry | UPSTREAM-SAFE | `TelemetryLogger` extension API — no core changes |

## FORK-CRITICAL ledger (exhaustive, target: empty)

**Current entries: none.** Rule: any diff to `src/vs/**` outside
`src/vs/workbench/contrib/flauz/**` and *additive* `src/vscode-dts/vscode.proposed.flauz.*.d.ts`
requires TL sign-off + a row here. Hard-preference-off limits: `src/vs/code/electron-main/**`,
`src/vs/base/**` (upstream churn hot zones).

| Candidate | Why tempting | Demotion (alternative) |
|---|---|---|
| Default layout = agent-first (chat left, editor right) | product identity | `configurationDefaults` + default profile; native `workbench.*` settings |
| Top-level real browser surface | "real browser" pillar | v1 webview (simple-browser precedent); v2 CDP in service + webview/custom-editor |
| Daemon autostart from electron-main | agents before UI | spawn from Agent Bridge at `onStartupFinished`; OS autostart lives outside repo |
| In-editor multi-user co-editing hooks | collaboration | ext-host text-model sync via service; re-evaluate only with user evidence |
| Model picker / chat UI tweaks | UX polish | build ON native participants so native UI serves Flauz agents |

## Sync mechanics

- Remotes: `upstream` = microsoft/vscode, `origin` = payswapdotorg/Flauz. While divergence
  is **zero** (today), set up now: `upstream/main` tracked; `main` stays a pristine mirror
  (never commit to it directly); all Flauz commits on `flauz/main` integration branch.
- **Cadence**: weekly rebase of `flauz/main` onto `upstream/main` (rebase-based, not
  merge-based — keeps Flauz commits reviewable and conflicts local); monthly tag snapshots.
- **Conflict strategy by area**: product.json → never conflicts (separate file);
  `extensions/flauz-*`, `contrib/flauz/` → none; any ledgered core patch → owner assigned,
  must carry an upstream-issue link or demotion plan within 2 syncs.
- **CI per sync**: hygiene + eslint + unit (light subset) — **no full build in sandboxes**;
  full build only in CI runners. Note: `npm install` + gulp in this repo is forbidden for
  workers (work-order §2).
- **Packaging**: `product.json` `builtInExtensions` mechanism lets builds pull external
  built-ins — use it for anything we don't want as in-tree dirs.
- **Gallery**: Code-OSS `product.json` ships **no** `extensionsGallery` (OSS builds show no
  marketplace; VSCodium patches Open VSX). Flauz: own `extensionsGallery` entry in
  `product.flauz.json` — config-only divergence. [VERIFY key name on the mirror.]
```


```
