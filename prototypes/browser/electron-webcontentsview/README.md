# Prototype: Electron `WebContentsView` browser pane (attempt #1 — strongest option)

Proves the architecture where a **real Chromium surface** (`WebContentsView`) is mounted
inside a Code-OSS-style workbench window, positioned over a DOM-reserved browser-pane
region, with per-workspace session isolation and full agent control over CDP.

## What it demonstrates (see `out/manifest.json` + screenshots after a run)

| # | Claim | How it's proven |
|---|---|---|
| 1 | Real Chromium rendering, not an iframe | `WebContentsView` runs a **separate renderer process** (PIDs logged); renders `https://example.com` |
| 2 | Coexists with editor/terminal panes | workbench.html draws editor + terminal; composited X-screen capture shows all three surfaces together |
| 3 | Session isolation per workspace | two partitions (`persist:ws-acme`, `persist:ws-beta`); cookie set in A is invisible in B (CDP `document.cookie` + `session.cookies` cross-check) |
| 4 | Agent-controllable | CDP via `webContents.debugger`: `Page.navigate`, `Runtime.evaluate`, `Input.dispatchMouseEvent` (a real click lands on `#cta`), `Page.captureScreenshot` |
| 5 | Security gate | `will-navigate` allowlist blocks `example.org` attempt; `setWindowOpenHandler` denies popups; permission requests denied by default |
| 6 | Overlay sync with workbench layout | renderer reports pane rect over IPC; "toggle layout" moves the native view live (before/after composites) |

## How to run

```bash
cd prototypes/browser/electron-webcontentsview
npm install            # installs electron (binary download ~120 MB)
./run.sh               # starts a private Xvfb on :95, runs the demo, cleans up
```

Artifacts land in `./out/`: `demo-console.log`, `manifest.json`, `01…07*.png`.

## Security posture of the demo

- Browser pane `webPreferences`: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- Per-workspace `session.fromPartition('persist:<workspace>')` → isolated cookie jar, storage, cache.
- Navigation allowlist + default-deny permission handler + popups denied.
- `--no-sandbox` is passed **for this sandbox container only** (no SUID `chrome-sandbox`
  helper, restricted user namespaces). A real product build keeps the Chromium OS sandbox
  enabled; the renderer-sandbox flags above are unaffected by that switch.

## What it does NOT prove

- Packaging inside actual Code OSS (this is a standalone analog: the workbench shell is a
  local HTML page standing in for `src/vs/workbench`; the integration path is analyzed in
  `docs/BROWSER-ARCHITECTURE.md`).
- Z-order/DIME edge cases (dragging other views over the pane, overlapping native menus).
- Perf: screencast streaming latency, GPU path (GPU is disabled in this container).
