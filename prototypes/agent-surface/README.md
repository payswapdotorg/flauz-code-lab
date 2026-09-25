# Flauz Workbench — agent-surface UX/IA prototype

A **static, self-contained UX/IA prototype** of the Flauz Workbench: a unified work
environment where Editor, Terminal, Agent conversation, Browser, Workspace/Context,
Tasks, Environments, Resources, and Evidence are **first-class, co-equal surfaces** —
explicitly *not* "VS Code + a giant sidebar".

Fake data only. No backend, no build step, no framework, no network.

## Run

- Open `index.html` directly (works via `file://` in any modern browser), or
- Open the sandbox preview for this folder — same thing, no server needed.

## What it PROVES

1. **Co-equal surface grid IA** — the center is a grid of four work tiles with identical
   chrome (same header height, border, radius, ⋮ menu). The **preset switcher**
   (`Solo Code` / `Agent-Led` / `Browser Test` / `Review`) visibly re-proportions the
   grid; tiles can also be swapped ("Move to editor area") and maximized from the ⋮ menu.
   Surfaces are user-reposable, not a fixed hierarchy.
2. **No-giant-sidebar principle** — the sidebar only hosts lists/navigation
   (Tasks, Workspace·Context, Resources, Evidence, Agents). All *work* happens in tiles.
   The VS Code-inherited rail items (Explorer, Search, Source Control, Run) stay and
   toast "Baseline Code OSS surface — never regressed" — a statement, not a gap.
3. **Environment re-scoping model** — the env selector (Local / Container / Remote /
   Cloud VM / E2B) re-scopes **three surfaces at once**: terminal prompts + tab labels,
   browser session partitions (with a re-scoping spinner), and sidebar Resources state
   chips — plus the agent-tile `context:` badge, a system line in each thread, the
   agent-cursor tooltip, and a toast.
4. **Approval gates** — the agent thread contains a human approval gate
   (`git push origin staging`). Approve → tool row appears (running → ok) and VERIFY
   assertions flip to ✓ on a timeout. Request changes → inline feedback → user message
   in thread + agent reply. Add constraint → toast + constraint chip on the gate.
5. **Evidence provenance** — every artifact row carries provenance
   (`browser.screenshot · Agent A · 14:31`) and opens a preview popover (fake CSS
   "screenshots", mono log/diff). Evidence chips also live inline in tool-call rows and
   on the editor diff hunk.
6. **Code OSS hosting map** — the "Map to Code OSS" toggle pins semi-transparent amber
   badges with exact source paths onto every region (see table below) and dims
   non-annotated chrome.

## What it does NOT prove

- Real data flows (everything is canned fake data about task #142 "Login hardening")
- Performance, real agent execution, real CDP/browser rendering
  (the browser tile is a hand-built mock page; real rendering lives in `prototypes/browser/`)
- Accessibility beyond basics (focus-visible outlines, aria-labels, `role=dialog`,
  reduced-motion respected — but not audited)
- Multi-window / persistence / auth

## Surface → Code OSS container map

| Flauz surface | Code OSS hosting |
|---|---|
| Editor tile | `editorPart` grid · editor group — `src/vs/workbench/browser/parts/editor/` |
| Terminal tile | panel part OR editor-area terminal (terminal editors) — `src/vs/workbench/contrib/terminal/` |
| Agent tile | view container (auxiliary bar) or editor input — `src/vs/workbench/browser/parts/auxiliarybar/` + `contrib/chat/` |
| Browser tile | custom editor input + native WebContentsView overlay (product layer) — `src/vs/workbench/contrib/webview/` + `src/vs/code/electron-main/` |
| Sidebar | view container in primary side bar — `src/vs/workbench/browser/parts/activitybar/` |
| Env selector | status bar item + quick pick (pattern: remote indicator) — `src/vs/workbench/contrib/remote/` |
| Command palette | quick input — `src/vs/workbench/contrib/quickinput/` |
| Status bar | `statusbar` part — `src/vs/workbench/browser/parts/statusbar/` |

(The same texts are pinned live on the regions by the "Map to Code OSS" toggle.)

## Try the key demo paths

- **Env switch**: top-right chip → *Remote* — watch terminal prompt, browser session
  chip, agent `context:` badge, Resources chips, and status bar all re-scope.
- **Approval gate**: click task `#138` (or status bar `1 approval needed`) → *Approve* —
  watch the push tool row appear and VERIFY assertions flip green.
- **Presets**: switch `Browser Test` — the browser tile spans both rows.
- **Palette**: `⌘K` / `Ctrl+K` — fuzzy filter, ↑↓ + ⏎.
- **First run**: top-bar *First run* — designed empty states everywhere, welcome card,
  *Back to demo state* restores.
