# Wave 1 Prototype Results — Worker B (browser integration + agent/workbench UX)

Every attempt executed in this lane, including partial failures and environment aborts.
Evidence paths are relative to the repo root. Sandbox: 2 cores / 4 GB RAM / Debian 13,
Xvfb available, ms-playwright chromium 1200/1243 present, Electron 44.4.5 installed
(npm cache warm).

## Results table

| # | Attempt | Status | Result & evidence | Uncertainty killed | Uncertainty left |
|---|---|---|---|---|---|
| B1 | **Electron `WebContentsView` browser pane** (`prototypes/browser/electron-webcontentsview/`, run under private Xvfb) | **RAN — PASS** (3 runs; final clean run RC=0, 25.6s) | `evidence/b-browser-ux/electron/` — manifest.json, demo-console.log, 6 screenshots (2 VLM-verified composites). Real Chromium pane as separate OS process; per-workspace session partitions isolate cookies (CDP + session-API cross-check); CDP navigate/evaluate/click-lands/screenshot; overlay follows workbench layout (before/after composites) | Whether WebContentsView satisfies ALL charter requirements at mechanism level — it does (rendering, isolation, agent control, coexistence, security gates) | Packaging inside real Code OSS (analog only — but the tree already ships the real stack, see B4); z-order/aux-window edge cases; GPU path (disabled here) |
| B1a | Electron run #2 — second `webContents.debugger` attach pre-load | **RAN — HUNG (documented)** | Earlier log in git history of `main.js`; finding preserved as comments + §6 of BROWSER-ARCHITECTURE.md | Debugger-attach ordering matters: attach post-load or use `executeJavaScript` | Root cause inside Electron (not chased further — workaround is clean) |
| B1b | `capturePage()` on overlaid WebContentsView | **RAN — FAILED (documented)** | `Current display surface not available for capture` (log); workaround: CDP screenshot / `desktopCapturer` | Screenshot path fragility on native views; in-tree `browserView.ts` bounds comment rhymes | — |
| B1c | Security gate probe (CDP navigate to non-allowlisted host) | **RAN — finding** | `will-navigate` never fires for CDP navs; `webRequest` cancels content (`ERR_BLOCKED_BY_CLIENT`) but URL commits — log lines in demo-console.log | The exact layering needed for an agent-safe browser pane (driver-side allowlist + webRequest + will-navigate) | Whether in-tree `IAgentNetworkFilterService` implements the driver-side gate fully — Wave 2 hardening review |
| B2 | **Separate real Chromium + raw CDP bridge** (`prototypes/browser/cdp-bridge/`, zero npm deps, Node 24 WebSocket) | **RAN — PASS** (12.6s) | `evidence/b-browser-ux/cdp/` — manifest.json + 4 screenshots + 10 screencast frames (replayed by `pane-mock.html`). Agent control via raw CDP; isolation BOTH ways: ephemeral `Target.createBrowserContext` AND separate per-workspace profiles; real-web rendering (example.com + news.ycombinator.com) | External-browser architecture is viable with zero deps; ephemeral per-agent contexts work as advertised | Interactive latency of screencast panes; fleet governance; cloud/E2B backends |
| B3 | **Webview/iframe as browser surface** (`prototypes/browser/webview-limits/` — negative-result probe suite by design) | **RAN — DISQUALIFIED (expected)** | `evidence/b-browser-ux/webview/` — webview-probes.json + screenshot (VLM-verified) + capture-probes.mjs. SOP blocks agent read/click/type on cross-origin content; sandbox-without-same-origin = no session at all; framing refused live by github.com + news.ycombinator.com; blocked frames still fire `load` (undetectable) | "Is a webview good enough?" — NO, with live evidence; grounds Option C rejection in BROWSER-ARCHITECTURE.md | — |
| B4 | **Tree exploration for citations** (read-only, not a prototype) | **RAN — discovery** | Citation index in worklog + BROWSER-ARCHITECTURE.md §2: the mirror at `9bf9ae764da` already ships the WebContentsView browser stack (`src/vs/platform/browserView/`, `src/vs/workbench/contrib/browserView/` incl. agent tools), Playwright backend, Agent Host providers (local/devcontainer/ssh/wsl/tunnel/cloud), chat sessions, model picker | "Does Flauz need to design browser integration at all?" — NO: adopt/extend in-tree; Flauz delta = policy + hardening + UX | Depth of in-tree security posture; sessions/browserView integration completeness |
| B5 | **Agent/workbench surface UX mock** (`prototypes/browser/../agent-surface/`, static HTML/CSS/JS) | **BUILT — verified in browser** (see below) | Co-equal surface grid, env re-scoping, approval gates, model pickers, evidence provenance, palette, first-run states, Code OSS mapping overlay w/ verified paths | Layout/IA uncertainty: co-equality reads at 1440px; sidebar-vs-grid split works; env re-scope gesture is legible | Visual design, a11y depth, real data, mobile/multi-monitor |
| — | Environment aborts | (process notes) | Two background downloads were killed by the sandbox process reaper mid-flight (git clone, electron postinstall) — recovered via foreground/`setsid`-in-call patterns; electron binary resumed with `curl -C -`. Recorded so Wave 2 workers avoid the trap | n/a | n/a |
| — | Push to remote | **BLOCKED (per TL: expected)** | PAT redaction is permanent; delivery via file staging later; all work committed locally on `wave1/b-browser-ux` | n/a | n/a |

## Verification chain (what a reviewer should click, in order)

0. Sandbox preview `/` route — three tabs: Agent Surface mock (switch env, approve the
   gate, ⌘K palette, mapping overlay), Browser Pane frames, Webview probes (live).
   Interaction log + screenshots: `evidence/b-browser-ux/agent-surface-verification/`.
1. `prototypes/agent-surface/index.html` (or the sandbox preview `/` route) — toggle env,
   approve the gate, open the palette (⌘K), switch presets, turn on the Code OSS mapping.
2. `evidence/b-browser-ux/electron/demo-console.log` — read the isolation + security lines,
   then open `04-composited-workbench-browserpane.png` and `07-composited-after-layout-toggle.png`.
3. `evidence/b-browser-ux/cdp/manifest.json` — `summary` block, then `pane-mock.html` for frames.
4. `evidence/b-browser-ux/webview/webview-probes.json` — P3 block (the SecurityErrors), then
   the screenshot to see refused frames live.
5. `docs/BROWSER-ARCHITECTURE.md` §2 for the in-tree discovery with paths.

## Reproduction

```bash
# proto #1 (~2 min; needs npm install electron once)
cd prototypes/browser/electron-webcontentsview && npm install && ./run.sh
# proto #2 (~15 s; zero deps)
cd prototypes/browser/cdp-bridge && node cdp-demo.mjs && open pane-mock.html
# proto #3 (~20 s; zero deps)
cd ../.. && node evidence/b-browser-ux/webview/capture-probes.mjs
```
