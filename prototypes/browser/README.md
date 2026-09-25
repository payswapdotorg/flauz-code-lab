# Browser integration prototypes — overview (Wave 1 / Worker B)

Three prototypes, ranked by strength, each answering the charter question *"what is the
strongest REAL browser integration a Code-OSS-based product can ship?"*

| # | Prototype | Verdict | One-line proof |
|---|---|---|---|
| 1 | [`electron-webcontentsview/`](./electron-webcontentsview/) | **PASS — recommended primary** | Real Chromium pane (separate process, per-workspace session partitions, CDP agent control, allowlist gates, overlay sync) composited inside a workbench window — `evidence/b-browser-ux/electron/` |
| 2 | [`cdp-bridge/`](./cdp-bridge/) | **PASS — recommended secondary** | Separate real Chromium driven over raw CDP with zero deps; ephemeral per-agent contexts + per-workspace profiles; screencast frames painted into a pane mock — `evidence/b-browser-ux/cdp/` |
| 3 | [`webview-limits/`](./webview-limits/) | **DISQUALIFIED as browser surface** (live evidence) | Same-Origin Policy blocks agent read/click/type on cross-origin content; no per-workspace session middle ground; major sites refuse framing undetectably — `evidence/b-browser-ux/webview/` |

**Decisive context:** the Flauz mirror tree (`9bf9ae764da`) *already ships* the
productized version of prototypes 1 and 2 — see `docs/BROWSER-ARCHITECTURE.md` §2
(`src/vs/platform/browserView/`, `src/vs/workbench/contrib/browserView/`, and the agent
browser tools). These prototypes independently validate the mechanisms and add hardening
findings (CDP bypasses `will-navigate`; `webRequest` cancels content but URL still commits).

Run order for a reviewer: 3 (negative result, 20s) → 2 (15s) → 1 (2 min).
