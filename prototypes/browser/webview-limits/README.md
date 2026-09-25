# Prototype: webview/iframe browser-limits probe suite (attempt #3 — the negative result, by design)

Answers the charter question **"is a webview/iframe good enough for Flauz's browser
surface?"** with live evidence instead of assertion. Conclusion: **no** — but webviews
remain fine for doc/preview content.

Open `index.html` in any browser (or run the headless capture below). It runs four probes:

| Probe | Question | What the evidence shows |
|---|---|---|
| P1 | Can a webview frame real sites? | `en.wikipedia.org`, `github.com` (and many others) refuse framing via X-Frame-Options/CSP — and a blocked iframe still fires `load`, so the embedder can't even reliably DETECT refusal |
| P2 | Is there a per-workspace browser session? | No middle ground: same-origin iframe → cookie jar SHARED with the surface; `sandbox` without `allow-same-origin` → opaque origin, no cookies/storage at all (an inert document, not a session) |
| P3 | Can an agent control cross-origin content? | The killer: `contentDocument` / `location.href` / element access all throw `SecurityError` — no read, no click, no type, no faithful screenshot. `postMessage` works only if the target cooperates |
| P4 | Capability inventory | Requirement-by-requirement table vs WebContentsView/CDP (references proto #1/#2 evidence) |

## How to run

```bash
# interactive
open prototypes/browser/webview-limits/index.html   # any modern browser

# headless evidence capture (uses the same chromium as cdp-bridge):
node ../../evidence/b-browser-ux/webview/capture-probes.mjs   # (see evidence folder)
```

## Grounding in the tree (commit 9bf9ae764da)

- Code OSS webviews ARE iframes: `src/vs/workbench/contrib/webview/browser/webviewElement.ts`
  (`document.createElement('iframe')`; sandbox attrs `allow-scripts allow-same-origin
  allow-forms allow-pointer-lock allow-downloads`).
- The built-in Simple Browser extension is a webview panel wrapping a sandboxed iframe:
  `extensions/simple-browser/src/simpleBrowserView.ts` (`<iframe sandbox="allow-scripts
  allow-forms allow-same-origin allow-downloads">`), src set from
  `extensions/simple-browser/preview-src/index.ts` — it inherits every limit probed here.

## What this prototype does NOT prove

- Nothing about webview *content security* (that's upstream's concern and works as designed);
  this probes the webview as a BROWSER SURFACE (rendering fidelity, agent control, session
  isolation) — the requirements from the Flauz charter.
