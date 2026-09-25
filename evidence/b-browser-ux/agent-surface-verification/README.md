# Agent-surface mock — browser verification evidence

The UX mock (`prototypes/agent-surface/`) was verified live in the sandbox preview
(`/` route serving the mock in an iframe) using the agent-browser CLI on 2026-09-25.
Interactions exercised end-to-end:

| Interaction | Result |
|---|---|
| Environment switch (Container → E2B) | ✓ terminal tab `bash — e2b`, browser session chip `session:e2b-9f2/ephemeral`, agent context line "environment changed → terminal + browser re-attached to e2b", status bar `env: e2b · sandbox-9f2` |
| Human approval gate (Approve) | ✓ task #138 flipped `blocked · needs approval` → `running · unblocked` |
| Command palette (⌘K / button) | ✓ opens, filters, executes commands (verified: `Flauz: Switch Environment…` closes palette + opens env menu) |
| "Map to Code OSS" overlay | ✓ amber badges citing verified tree paths (VLM-confirmed: `remoteIndicator.ts`, `browser/parts/editor/`) |
| Host tab switching (Agent Surface / Browser Pane / Webview Limits) | ✓ all three prototypes served from `/flauz/…` |

One bug found & fixed during verification: palette rows were missing `data-action="cmd"`
so mouse clicks didn't execute (keyboard Enter did) — fixed in `app.js` (renderPal).

Screenshots: `flauz-final-agent-surface.png` (default Agent-Led preset),
`flauz-e2b-switch.png` (after E2B switch), `flauz-mapping-on.png` (Code OSS mapping
overlay), `flauz-pane-mock.png` (CDP pane-mock tab). Page console: no errors; `bun run lint`: clean.

## Re-verification 2026-09-25 (post-interruption session)

The previous worker session was interrupted mid-report; the full golden path was re-run
via agent-browser against the live `/` preview before final delivery:

| Interaction | Result |
|---|---|
| Env menu → E2B | ✓ env chip `E2B▾`, terminal tab `bash — e2b`, status bar `env: e2b · sandbox-9f2`, agent context line present |
| Approval gate (#138 → Approve) | ✓ task row `running · unblocked`, status bar `2 agents · no approvals pending` |
| Palette (⌘K button → filter "switch env" → execute) | ✓ palette closes (search box inside hidden ancestor), env menu opens (`key=env`) |
| Map to Code OSS toggle | ✓ `body.map-on`, 8 `[data-map]` targets, `::after` renders mapping text citing `remoteIndicator.ts` |
| Host tabs (Agent Surface / Browser Pane / Webview Limits) | ✓ all three load; webview tab shows 7 probe iframes + verdict box; console clean (only React DevTools info + HMR) |

Note: switching host tabs re-mounts the iframe and resets mock state to defaults
(expected for a static demo — no state persistence by design).
Screenshot: `flauz-reverify-20260925.png`.
