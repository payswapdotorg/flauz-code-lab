# Flauz Browser Architecture — real browser integration on a Code OSS base

**Scope:** Wave 1 / Worker B. Evidence-first: every claim cites either the Flauz mirror
tree (commit `9bf9ae764da`, verified pristine by TL 2026-09-24) or an evidence file in
`evidence/b-browser-ux/`. UNCERTAIN items are marked explicitly.

## 0. TL;DR

The strongest real-browser integration for a Code-OSS-based Flauz is **the WebContentsView
stack that is already in the tree** (`src/vs/platform/browserView/` + `src/vs/workbench/contrib/browserView/`),
with the **external-Chromium/CDP (Playwright) backend that is also already in-tree**
(`src/vs/platform/browserView/node/playwrightService.ts`) for cloud/E2B/parallel-agent sessions.
Flauz's browser work is therefore **product policy + hardening + UX, not core architecture**.
A webview/iframe surface is *disqualified as the browser pane* by live probes (agent cannot
read/click/type cross-origin content; no per-workspace session middle-ground; major sites
refuse framing).

My standalone prototypes validate the two viable mechanisms independently of the tree
(prototypes are not builds of the tree — sandbox discipline forbids that — they are
mechanism analogs):

| Mechanism | Prototype | Result |
|---|---|---|
| Electron `WebContentsView` pane in a workbench window | `prototypes/browser/electron-webcontentsview/` | **PASS** — `evidence/b-browser-ux/electron/manifest.json` |
| Separate real Chromium + raw CDP bridge (+ screencast frames into a pane) | `prototypes/browser/cdp-bridge/` | **PASS** — `evidence/b-browser-ux/cdp/manifest.json` |
| Webview/iframe as browser surface | `prototypes/browser/webview-limits/` | **DISQUALIFIED** (by design) — `evidence/b-browser-ux/webview/webview-probes.json` |

## 1. Requirements (charter)

1. Real Chromium-class rendering (not an iframe shim)
2. Session isolation per workspace / per agent
3. Agent-controllable: navigate, click, read DOM, screenshot
4. Coexists with editor / terminal panes in one workbench
5. Sane security story

## 2. What the tree already carries (the decisive finding)

The mirror at `9bf9ae764da` — beyond the "chat agents, sessions, Agent Host, tabbed model
picker" infra the TL flagged — **already ships a complete integrated-browser stack**:

- **Main-process WebContentsView engine**: `src/vs/platform/browserView/electron-main/browserView.ts`
  (L158: `this._view = new WebContentsView({...})`, with `session: this.session.electronSession` —
  per-session partitions are first-class), plus `browserViewMainService.ts`, group management
  (`browserViewGroup.ts`, `browserViewGroupMainService.ts`), inspector/debugger surfaces
  (`browserViewInspector.ts`, `browserViewDebugger.ts`, `browserViewCDPTarget.ts`,
  `browserViewEmulator.ts`), and session services (`browserSession.ts`, `browserSessionHistory.ts`,
  `browserSessionPermissions.ts`, `browserSessionTrust.ts`, `browserSessionRemote.ts`).
- **Workbench surface**: `src/vs/workbench/contrib/browserView/` — `browserEditor.ts`
  (browser as an EDITOR surface), `common/browserEditorInput.ts`, the renderer feature
  `electron-browser/features/webContentsViewRendererFeature.ts` ("Default browser renderer:
  drives a Chromium WebContentsView"), `electron-browser/overlayManager.ts` (overlay/z-order
  management — the exact mechanism my prototype #1 validated), `widgets/browserUrlBarWidget.ts`
  (omnibox as a workbench widget), and even an onboarding surface (`browser/browserWelcome.ts`).
- **Agent tools**: `src/vs/workbench/contrib/browserView/electron-browser/tools/` —
  `navigateBrowserTool.ts` (`id: 'navigate_page'`), `clickBrowserTool.ts`, `typeBrowserTool.ts`,
  `screenshotBrowserTool.ts`, `readBrowserTool.ts`, `runPlaywrightCodeTool.ts`, `openBrowserTool.ts`.
- **External-browser backend**: `src/vs/platform/browserView/node/playwrightService.ts`,
  `playwrightChannel.ts`, `playwrightTab.ts` (my prototype #2 is the zero-dep mechanism analog).
- **Sessions/Agents-Window integration**: `src/vs/sessions/contrib/browserView/browser/sessionBrowserView.ts`.
- **IPC**: `src/vs/platform/browserView/common/browserView.ts` (L476:
  `export const ipcBrowserViewChannelName = 'browserView';`), registered in
  `src/vs/code/electron-main/app.ts` (service registration ~L1234, channels ~L1405–1412).
- **Electron pin**: `.npmrc` `target="43.7.3"` (not package.json) — modern enough for
  `WebContentsView`; the deprecated `BrowserView` class is unused (grep-verified).

**Implication:** Flauz must NOT design a parallel browser architecture (work-order ground
rule: check what exists first). Every browser-pane capability the charter requires has an
in-tree home. Flauz's delta is: product defaulting, workspace↔session policy, security
hardening (§5), and UX (see `UX-ARCHITECTURE.md`).

## 3. Ranked options

### Option A — in-tree WebContentsView pane (RECOMMENDED for desktop; validated by prototype #1)

| Dimension | Assessment |
|---|---|
| Rendering fidelity | Real Chromium compositor, separate renderer process (proto #1 log: pane pid 4999 vs workbench pid 4982). Full-fidelity sites incl. XFO/CSP-protected ones (no framing involved). |
| Process/session isolation | Separate renderer per view; `session.fromPartition('persist:<workspace>')` → isolated cookie jars, proven live (proto #1: `ws-acme jar=["flauz_ws=acme"]` vs `ws-beta jar=[]`, cross-checked via Electron session API). In-tree: `browserSession.ts` family. |
| Agent control path | `webContents.debugger` (in-process CDP): `Page.navigate`, `Runtime.evaluate` (reads DOM geometry), `Input.dispatchMouseEvent` (real click landed), `Page.captureScreenshot` — all evidenced in proto #1 log. In-tree equivalents: the `tools/` above + `browserViewDebugger.ts`/`browserViewCDPTarget.ts`. |
| Coexistence with editor/terminal | The view is positioned over a DOM-reserved region; proto #1 proved IPC-driven overlay sync (layout toggle moved the pane; composites `04`/`07` VLM-verified). In-tree: `overlayManager.ts` + `webContentsViewRendererFeature.ts`. |
| Security boundary | Layered (see §5). Renderer sandbox flags on the pane; in-tree `browserSessionPermissions.ts`, `browserSessionTrust.ts`, `IAgentNetworkFilterService` (`src/vs/platform/networkFilter/common/networkFilterService.ts`, used by the browser tools). |
| Upstream compatibility | **Zero fork.** It is in-tree today; Flauz consumes/extends it. Product packaging: desktop build only (web builds fall back to Option B). |
| Cost / risks | Overlay z-order edge cases (native views float over DOM — in-tree overlay manager exists; needs QA), per-OS focus quirks; UNCERTAIN: multi-window/aux-window story (aux windows exist at `src/vs/platform/auxiliaryWindow/electron-main/` — interaction untested). |

### Option B — external Chromium + CDP bridge (RECOMMENDED for web-build parity, cloud/E2B, parallel agent fleets; validated by prototype #2)

| Dimension | Assessment |
|---|---|
| Rendering fidelity | Real Chromium end-to-end (proto #2: example.com + news.ycombinator.com, real titles + screenshots). |
| Isolation | Strongest: per-workspace `--user-data-dir` processes (jars never touch) AND per-agent ephemeral contexts (`Target.createBrowserContext` → cookie invisible; proto #2 manifest: `ephemeralContext.isolated=true`, `crossProcess.isolated=true`). |
| Agent control | Full CDP incl. screencast frame streaming (`Page.startScreencast` — 10 frames captured, replayed by `prototypes/browser/cdp-bridge/pane-mock.html`). |
| Coexistence | The pane is any webview view / custom editor painting frames (works on web builds too). Latency/input-forwarding is the tradeoff (UNCERTAIN: measured latency not captured in this wave). |
| Security | Agent traffic controllable via CDP `Fetch`/`Network` interception at the browser process; per-context network policies map to in-tree `IAgentNetworkFilterService`. |
| Upstream compatibility | In-tree already (`playwrightService.ts` + `navigateBrowserTool` routes through `IPlaywrightService`). Zero fork. Adds an OS process per browser (or fleet) — packaging: ship/download a chromium runtime (E2B/cloud backends for remote). |

### Option C — webview/iframe surface (REJECTED as THE browser pane; retained for previews)

Proto #3 live evidence (`evidence/b-browser-ux/webview/webview-probes.json`):
- **Agent control: impossible for cross-origin content.** `contentDocument` → null;
  `contentWindow.location.href` → `SecurityError`; click/type → `CANNOT: no DOM`.
- **No session middle-ground:** same-origin iframe shares the cookie jar with the whole
  surface; `sandbox` without `allow-same-origin` → opaque origin, `SecurityError` on
  cookie access — an inert document, not a browser session.
- **Framing refusals are common and undetectable:** blocked iframes still fire `load`
  (error page); in the capture, github.com and news.ycombinator.com refused; per-site
  XFO/CSP varies. There is no omnibox/history/downloads/DevTools, and no faithful content
  screenshot.
- In-tree reality check: Code OSS webviews ARE iframes —
  `src/vs/workbench/contrib/webview/browser/webviewElement.ts` (iframe creation + sandbox
  attrs `allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-downloads`)
  with resource-origin rewriting via `src/vs/workbench/contrib/webview/browser/pre/service-worker.js`;
  the built-in Simple Browser is a webview panel wrapping a sandboxed iframe
  (`extensions/simple-browser/src/simpleBrowserView.ts` L169). These are fine for
  extension content and localhost previews — not for Flauz's browser surface.

### Option D — upstream built-ins only (Simple Browser + ports/tunnels)

`extensions/simple-browser/` (iframe limits above) + endpoint forwarding
(`src/vs/workbench/services/tunnel/`, Ports view `src/vs/workbench/contrib/remote/browser/tunnelView.ts`).
Good conveniences on top of A/B for localhost dev-server previews; not a browser surface.

### Option E — Electron `BrowserView` (legacy)

Deprecated upstream in favor of `WebContentsView`; unused in the tree (grep-verified).
Not considered.

## 4. Recommendation

**Adopt the in-tree dual-track**: WebContentsView pane (Option A) as the interactive
desktop surface, Playwright/CDP backend (Option B) for headless, cloud/E2B, and parallel
per-agent sessions. Flauz work items, in order:

1. **Security hardening review** of the in-tree stack against proto #1's findings (§5) —
   especially that CDP-initiated navigations bypass `will-navigate`.
2. **Workspace↔session policy**: partition naming (`persist:<workspace>` durable,
   non-persist per-agent ephemeral) surfaced in UI (see UX doc's browser session chip).
3. **UX surface**: browser as a co-equal tile/editor with session scope visibility
   (see `UX-ARCHITECTURE.md`), reusing `browserEditorInput.ts` + `browserUrlBarWidget.ts`.
4. **Web-build parity**: pane-mock screencast path (proto #2) for vscode.dev-class builds.
5. UNCERTAIN items for Wave 2: aux-window interaction, screencast latency budget,
   fleet resource governance (N browsers per workspace), cloud-sandbox browser backend
   (does `cloudSandboxAgentHost*` include a browser? — see open questions).

## 5. Security architecture (evidence-based layering)

Proto #1 produced three sharp findings (full log: `evidence/b-browser-ux/electron/demo-console.log`):

1. **`will-navigate` does NOT fire for CDP-initiated navigations** (`Page.navigate`).
   A pane policy built only on `will-navigate` does not gate the agent path.
2. **`session.webRequest.onBeforeRequest` cancels the network request for CDP-initiated
   navigations** (observed `webRequest BLOCKED … ERR_BLOCKED_BY_CLIENT`) — the airtight
   content gate — **but the URL still commits** (pane URL showed the blocked origin, on an
   error page). Therefore:
3. **Layered gates are required**: (a) driver-side navigate allowlist (the agent's
   `navigate` tool checks policy before issuing CDP), (b) `webRequest` for content/exfil,
   (c) `will-navigate` for user-initiated navs, (d) default-deny permission handler +
   `setWindowOpenHandler` deny (both demonstrated), (e) renderer sandbox flags on the pane
   (`contextIsolation`, `nodeIntegration:false`, `sandbox:true` — used throughout proto #1).

In-tree counterparts to verify in Wave 2 hardening: `browserSessionPermissions.ts`,
`browserSessionTrust.ts`, `IAgentNetworkFilterService` (already imported by
`navigateBrowserTool.ts` — the driver-side gate), plus per-partition isolation
(`browserSession.ts`).

## 6. Prototype mechanics worth keeping (engineer-to-engineer)

- Attaching a second `webContents.debugger` before the view's first load **hung**
  (`Page.enable` never resolved); attaching post-load worked. Post-mortem: attach after
  `did-finish-load`, or drive the second pane via `executeJavaScript` (proto #1 final form).
- `WebContentsView.capturePage()` can fail with `Current display surface not available for
  capture` even when the view is on top; CDP `Page.captureScreenshot` or `desktopCapturer`
  (screen-level) are the robust paths. The in-tree `browserView.ts` comment about bounds
  needing to be on-screen ("otherwise some OSes may not actually start rendering") rhymes
  with this.
- Composite evidence: `desktopCapturer.getSources({types:['screen']})` under Xvfb captures
  the full composited window (workbench DOM + native view) — VLM-verified screenshots
  `04`/`07`.
