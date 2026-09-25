# EV-11 — Negative results & precision notes (failed searches as evidence)

Every "API does not expose X" claim from the matrix, with the search that backs it.

## N-1. No marketplace in OSS product.json

`rg -c "extensionsGallery" product.json` → 0 matches (exit 1). Gallery/registry is a build-time decision.

## N-2. No browser API in stable `vscode.d.ts`

`rg "createBrowser|BrowserSession|BrowserControl|browserView" src/vscode-dts/vscode.d.ts` → no matches.
The browser surface exists only as proposed `vscode.proposed.browser.d.ts` (EV-04 §2) + core contrib.

## N-3. No pull-request extension in tree

`extensions/` enumeration (EV-00 §5) contains no PR extension. GitHub PRs need the external
`GitHub.vscode-pull-request-github` (or REST + auth session).

## N-4. `remoteCodingAgents` extension API is an empty placeholder

`vscode.proposed.remoteCodingAgents.d.ts:6–8`: "// empty placeholder for coding agent contribution point
from core" — the extension surface for remote coding agents is not yet shaped; registration today is
core-side (`IRemoteCodingAgentsService`, EV-02 §9).

## N-5. No stable agent-to-agent chat messaging API

`chat` stable namespace contains only `createChatParticipant` (20124). No `sendMessage`/peer-channel API
for participants. Closest primitives: proposed `dataChannels`/`ipc` (extension↔extension), AHP
spawned-chats/subagent signals (AHP agents only), MCP gateway for external agents.

## N-6. No built-in semantic memory store

No `memory`, `embedding-store`, or equivalent service in `src/vs/workbench/contrib/` or
`src/vs/platform/` listings (EV-00 §1–§3). Building blocks exist (embeddings proposed API, prompt files,
workspace storage) — assembly is Flauz work.

## N-7. No per-request latency metric in model metadata

`languageModelPricing.d.ts` (read in full) covers costs/categories only; no latency field. Latency must
be measured around `sendRequest` (extension-side) or surfaced by the provider.

## N-8. No live agent migration between environments

resolvers.d.ts (read §1, EV-07) resolves authorities at window/workspace open; no mid-flight
environment hand-off protocol for a *running* agent session. Continuity = persisted sessions +
checkpoints + edit sessions, re-opened on the target environment.

## N-9. CDP browser is Electron-only in tree

browserView contrib lives in `electron-browser/` (EV-04 §1); web builds get `simple-browser` (webview
iframe, no CDP). Agent-driven browsing on web/serverless requires an external browser (e.g., Playwright
MCP server) — integration exists via MCP (EV-03 §3) but not as an in-box web capability.

## N-10. Automation authoring API absent

AHP automation *protocol commands* exist (EV-09 §3) but there is no stable/proposed d.ts for
authoring/managing automations from extensions (searched `src/vscode-dts/` listing; only
`remoteCodingAgents` placeholder is adjacent).

## N-11. Chat session export command absent

No `export` command for chat sessions found in contrib enumerations; serialization shape exists via
`ChatSession` (chatSessionsProvider 435) for extension-side export.

## N-12. `vscode.d.ts` relocation

`src/vs/vscode.d.ts` does not exist at HEAD (IO error on read); the API surface is at
`src/vscode-dts/vscode.d.ts` — any doc/tooling assuming the old path is stale.
