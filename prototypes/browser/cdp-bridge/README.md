# Prototype: separate real Chromium + raw CDP bridge (attempt #2)

Zero-dependency proof (Node ≥ 22, no npm install) of the **external browser**
architecture: the workbench drives a real Chromium over raw CDP and paints
frames into a pane (`pane-mock.html`). This is the mechanism behind the
in-tree Playwright backend (`src/vs/platform/browserView/node/playwrightService.ts`
in the Flauz mirror at `9bf9ae764da`) — evidenced here with zero deps.

## What it demonstrates (see `out/manifest.json`)

| # | Claim | How it's proven |
|---|---|---|
| P1 | Full agent control of a real browser | raw CDP over WebSocket: `Page.navigate`, `Runtime.evaluate` (reads DOM geometry), `Input.dispatchMouseEvent` (a real click lands on `#cta`), `Page.captureScreenshot` |
| P2 | Session isolation per workspace | (a) separate `--user-data-dir` per workspace = separate OS processes, jars never touch; (b) **ephemeral in-process contexts** via `Target.createBrowserContext` — cookie set in the main context is invisible in the ephemeral one (the per-agent ephemeral session model) |
| P3 | Frame streaming into any pane | `Page.startScreencast` frames captured to `frames/` and replayed by `pane-mock.html` in a workbench-like layout |
| P4 | Real-web rendering | screenshots + titles of `example.com` and `news.ycombinator.com` |

## How to run

```bash
cd prototypes/browser/cdp-bridge
node cdp-demo.mjs          # finds chromium (ms-playwright cache or CDP_CHROME=…)
# then open pane-mock.html in any browser to see frames replayed in a pane layout
```

Chromium flags used: `--headless=new --remote-debugging-port=9777/9778
--user-data-dir=/tmp/flauz-cdp-ws-{acme,beta} --no-sandbox` (`--no-sandbox` is a
container artifact; production uses the OS sandbox).

## What it does NOT prove

- Input forwarding latency / DX of driving a remote pane (real product would keep
  the WebContentsView path for interactive use; this path is for headless,
  cloud/E2B, and parallel agent sessions).
- That screencast replay is pixel-live — the mock replays captured artifacts by
  design (sandbox discipline: no long-running servers).

## Files
- `cdp-demo.mjs` — the zero-dep CDP driver (launch, control, isolate, stream, capture)
- `test-page.html` — animated click target (screencast frames visibly differ)
- `pane-mock.html` — pane-like layout that replays captured frames
- `out/` — run artifacts (manifest, screenshots); `frames/` — screencast frames
