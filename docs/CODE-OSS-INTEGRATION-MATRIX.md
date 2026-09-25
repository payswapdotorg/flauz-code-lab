# Flauz Wave 1 — Worker C: Code OSS Capability Truth-Table & Six-Session Simulation

- **Reference tree**: `payswapdotorg/Flauz` @ `9bf9ae764da438b1234a8243dc9e47173ef58ee7` (mirror of `microsoft/vscode` main, 2026-09-24). Verified: `git rev-parse HEAD` matches TL pin.
- **Method**: static audit of the tree (never built — sandbox discipline). Every non-trivial classification cites `evidence/c-capability-matrix/EV-*.md`, which quote `file:line` from the tree. Negative claims cite failed searches (EV-11).
- **Author**: Worker C. **Branch**: `wave1/c-capability-matrix`. Companion doc: `docs/DECISION-LOG-INPUTS.md`.
- **Headline**: the tree at this SHA is **agent-era Code OSS** — it carries an Agent Host Platform (subagents, steering, changesets, automations, cloud sandboxes, Claude/Codex providers), an integrated CDP browser with a 14-tool agent suite, MCP as a core subsystem, edit-tracked changesets with checkpoints, and agents/prompts as workspace files. Most "Flauz capabilities" are **extension/build-config work on top of stock Code OSS**, not forks.

---

## 0. How to read the classification

| Bucket | Meaning |
|---|---|
| **AVAILABLE** | Works in stock Code OSS at HEAD. `⚠` = present in core but gated on product wiring (e.g. a default chat agent, an entitlement) or platform (Electron vs web). |
| **INTEGRABLE** | A normal extension suffices, via public extension API. `(S)` = stable API. `(P)` = proposed API — **enabled for trusted built-ins at distribution level (product config / CLI), not a fork** (EV-10 §3); cost = tracking upstream churn. |
| **PROTOTYPABLE** | Needs workbench-level work (new contrib / built-in extension / service), but no deep `src/vs` surgery. Where it would live is cited. |
| **REQUIRES CORE FORK** | Changes inside `src/vs` core. Kept deliberately small (§3). |
| **BLOCKED** | No viable path; blocker named. |

Meta-fact used throughout: **product.json is a build input, not code** — branding, gallery, default agent, telemetry endpoints are configured, not forked (EV-10 §1–2).

---

## 1. Capability matrix

### E — Editor & IDE baseline (the "never regress" floor)

| ID | Capability | Class | Evidence | Gap / Flauz work |
|---|---|---|---|---|
| C-01 | Editor core: monaco, multi-cursor, find/replace, folding, minimap, sticky scroll, diff/merge/multi-diff editors | AVAILABLE | EV-00 §1 (contrib: `folding`, `mergeEditor`, `multiDiffEditor`, `codeEditor`); `src/vs/editor/` | none — inherit |
| C-02 | Language features: LSP, completions, semantic tokens, call/type hierarchy, code actions, inline chat/completions | AVAILABLE | EV-00 §1 (`callHierarchy`, `typeHierarchy`, `codeActions`, `inlineChat`, `inlineCompletions`, `languageStatus`); 60+ language extensions in-tree | language pack distribution via chosen gallery (D-1) |
| C-03 | Notebooks & REPL | AVAILABLE | EV-05 §6 (contrib `notebook`, `interactive`, `replNotebook`; stable `notebooks` namespace 16355) | none |
| C-04 | Search, quick access, AI search | AVAILABLE | EV-00 §1 (`search` incl. `browser/AISearch/` models; `quickaccess`) | none |
| C-05 | Accessibility (screen readers, signals, a11y help across surfaces) | AVAILABLE | EV-10 §4 (`accessibility`, `accessibilitySignals`, per-feature `*AccessibilityHelp.ts`) | none — regression test in CI |
| C-06 | i18n / localization | AVAILABLE | EV-10 §5 (stable `l10n` 18197; contrib `localization`; language packs as extensions) | ship packs from chosen gallery |

### T — Terminal, tasks, debug

| ID | Capability | Class | Evidence | Gap / Flauz work |
|---|---|---|---|---|
| C-07 | Interactive terminal (profiles, splits, persistent processes, remote ptys) | AVAILABLE | EV-05 §1 | none |
| C-08 | Agent-driven terminal: exec + streamed output + exit code | INTEGRABLE (S) | EV-05 §2 — `shellIntegration.executeCommand` (7885/7941), `TerminalShellExecution` stream (7947+), start/end events (11205/11212) | thin tool wrapper; shell-integration requirement (bash/zsh/fish/pwsh scripts shipped) |
| C-09 | Raw terminal stream, dimensions, completion, quick-fixes for agents | INTEGRABLE (P) | EV-05 §2 — proposed `terminalDataWriteEvent`, `terminalDimensions`, `terminalExecuteCommandEvent`, `terminalQuickFixProvider`, `terminalCompletionProvider` | enable proposed set for Flauz built-ins; track churn |
| C-10 | Tasks (run/build/test), human + agent | AVAILABLE | EV-05 §4 — stable `executeTask` (9382), `fetchTasks` (9369) | expose Flauz workflows as task providers |
| C-11 | Debugging, interactive, multi-language | AVAILABLE | EV-05 §5 — contrib `debug/`; `ms-vscode.js-debug` 1.140.0 pinned in product.json (58–71) | none |
| C-12 | Agent-driven debugging: launch, breakpoints, event observation, stack inspection | INTEGRABLE (S) | EV-05 §5 — `startDebugging` (17395), `addBreakpoints` (17409), `onDidReceiveDebugSessionCustomEvent` (17323), `registerDebugAdapterTrackerFactory` (17382), `activeStackItem` (17341) | deep variable/evaluate introspection = custom DAP tracker or adapter (normal extension work) |
| C-13 | Testing (Test Explorer, coverage) | AVAILABLE | EV-00 §1 (`testing`); stable `tests` namespace (18276) | none |

### S — SCM & GitHub

| ID | Capability | Class | Evidence | Gap / Flauz work |
|---|---|---|---|---|
| C-14 | Git: status/diff/stage/commit/branch/merge (interactive) | AVAILABLE | EV-06 §2 — `extensions/git`, `git-base`, SCM view | none |
| C-15 | Agent-driven git (commit/branch/fetch/push programmatically) | INTEGRABLE (S) | EV-06 §2 — exported git API: `Repository.commit()` (api1.ts:321), `fetch()` (293) | tool wrapper; secret-safe auth (C-16) |
| C-16 | GitHub / GHE / Microsoft auth | AVAILABLE | EV-06 §3 — `github-authentication`, `microsoft-authentication`; stable `authentication` (18096) | none |
| C-17 | PR creation & review in-IDE | INTEGRABLE | EV-06 §4 — no PR ext in tree (EV-11 N-3); external `GitHub.vscode-pull-request-github` or REST+auth | bundle/curate PR extension; gallery decision (D-1) |
| C-18 | Resource/artifact tracking in SCM (evidence objects, timestamps, open-command) | INTEGRABLE (P) | EV-06 §5 — `scmArtifactProvider.d.ts` (issue #253665): groups+artifacts with `timestamp`/`command` | Flauz artifact provider extension |

### M — Models, agents, orchestration

| ID | Capability | Class | Evidence | Gap / Flauz work |
|---|---|---|---|---|
| C-19 | Multi-model selection per task/agent (Codex, Claude, Qwen, Muse, Copilot, local) | INTEGRABLE (S) | EV-01 §1 — `lm.selectChatModels` (20770), `LanguageModelChat.sendRequest` (20302), `registerLanguageModelChatProvider` (20851) | Flauz vendor pack (Ollama/Qwen/Muse/Claude/Codex via providers + AHP providers EV-02 §1) |
| C-20 | Model picker + model management UI | AVAILABLE ⚠ | EV-01 §3–4 — `widget/input/modelPicker/` stack; `chatManagement/`; `aiCustomization/` management editor | ⚠ gated on a default chat agent (`product.json:90–157` → Copilot); Flauz re-points `defaultChatAgent` (build input) |
| C-21 | Cost / quota / metering awareness | INTEGRABLE (P) | EV-01 §5 — `languageModelPricing.d.ts` (input/output/cache costs, priceCategory, model category; shown in picker), `extHostChatQuota.ts`, `meteredConnection` + `envIsConnectionMetered` | per-request latency absent (EV-11 N-7) → measure extension-side; cross-agent budget accounting = Flauz layer |
| C-22 | Custom chat participants (Flauz agents in stock chat) | INTEGRABLE (S) | EV-01 §2 — `chat.createChatParticipant` (20124); response parts incl. anchors (20107/20031) | none beyond building them |
| C-23 | Parallel agents with separate contexts | AVAILABLE ⚠ | EV-02 §6 — agent sessions viewer/model; multiple chat sessions (editor tabs); AHP `IAgentSpawnChatEvent`/chats (EV-02 §2) | ⚠ needs agent provider wiring; Flauz orchestration extension can spawn/fan-out |
| C-24 | Subagents + mid-run steering + tool-confirmation signals | AVAILABLE ⚠ | EV-02 §2 — `IAgentSubagentStarted/Resumed/CompletedSignal`, `IAgentSteeringConsumedSignal`, `IAgentToolPendingConfirmationSignal`; providers Claude+Codex (EV-02 §1) | ⚠ entitlement/auth for built-in providers; Flauz agents register as AHP-style providers or participants |
| C-25 | Human approval gates mid-execution | AVAILABLE ⚠ | EV-03 §4–5 — `LanguageModelToolsConfirmationService` (`ToolConfirmKind.LmServicePerTool`, scope session/profile/workspace, lines 113–119), `chatToolRiskAssessmentService.ts`, `agentSessionApprovalModel.ts`, `ChatSessionStatus.NeedsInput` (10–30), MCP elicitation (EV-03 §6) | ⚠ core gates light up with the default-agent path; custom gate flows = participant/tool logic (extension) |
| C-26 | Agent-to-agent messaging / collaboration | PROTOTYPABLE | EV-11 N-5 (no stable API). Primitives: proposed `dataChannels`/`ipc` (EV-10 §6), AHP spawned-chats + subagent signals (AHP agents), MCP gateway for external loops (EV-03 §3) | lives in: Flauz orchestrator extension (today) or new built-in under `extensions/flauz-orchestrator` |
| C-27 | Workspace-scoped memory / context | PROTOTYPABLE | EV-08 §5 — embeddings API (P), `contextContrib`, `#file` attachments, prompt files; **no memory store in core** (EV-11 N-6) | lives in: `extensions/flauz-memory` (embeddings + workspace storage + `.flauz/` artifacts) |

### B — Browser

| ID | Capability | Class | Evidence | Gap / Flauz work |
|---|---|---|---|---|
| C-28 | REAL browser in IDE + agent control (navigate/click/type/hover/drag/screenshot/dialogs/Playwright code) | AVAILABLE ⚠ (desktop) | EV-04 §1 — contrib `browserView` (Electron `WebContentsView`, CDP service, 17 features incl. chat+remote, **14 agent tools** incl. `screenshotBrowserTool`, `runPlaywrightCodeTool`) | ⚠ desktop-only (EV-11 N-9); lights up for the default agent path; extension-driven control via proposed `browser.d.ts` (`openBrowserTab`+`startCDPSession`, EV-04 §2). Web builds: BLOCKED in-box → MCP browser server (D-5) |
| C-29 | Evidence capture into workspace (screenshots, artifacts, citations) | INTEGRABLE (S) | EV-04 §4 — screenshots as tool results; `workspace.fs` (13810); `ChatResponseAnchorPart` (20031); AHP debug-log artifact streaming (EV-02 §4); `imageCarousel` contrib | Flauz evidence provider (+ C-18 artifact surface) |

### R — Environments

| ID | Capability | Class | Evidence | Gap / Flauz work |
|---|---|---|---|---|
| C-30 | Remote environments via authority resolvers (SSH & custom) | INTEGRABLE (P) | EV-07 §1 — `resolvers.d.ts`: `registerRemoteAuthorityResolver` (456), `ManagedResolvedAuthority` (46–51), **nested `a@b` chained authorities** (17–26); reference impl `vscode-test-resolver` (§2) | MS Remote-SSH is closed + VS Code-licensed → open resolver (OSS precedent) or own; licensing (D-1/D-6) |
| C-31 | Tunnels & web remote (serve a workspace over tunnel) | AVAILABLE | EV-07 §3 — Rust CLI `tunnels/`, `remoteTunnel` contrib, `remote/web`; `code-tunnel-oss` naming (product.json:16) | Flauz tunnel product naming (build input) |
| C-32 | Dev containers | INTEGRABLE | EV-07 §4 — `IDevContainerAgentHostMainService` in platform (agentService.ts:21); spec + CLI are OSS (external); OSS-build UX = extension + CLI | bundle devcontainer CLI + open extension; MS Dev Containers ext licensing as C-30 |
| C-33 | Cloud sandbox environments (E2B-class), agent-provisioned | PROTOTYPABLE | EV-07 §5 — core `cloudSandbox*` services (EV-02 §5) exist but Microsoft/entitlement-bound; AHP `RemoteProxy` runs agents server-side (agentService.ts:66–71) | lives in: new contrib `src/vs/workbench/contrib/flauz-sandbox/` or built-in extension implementing a resolver + AHP provider against E2B/own infra |
| C-34 | Seamless mid-session env switch (terminal/browser/agent follow) | PROTOTYPABLE | EV-07 §6 — per-env execution is native (remote ptys, DAP, AHP RemoteProxy); **live hand-off of a running session is not built-in** (EV-11 N-8) | continuity = persisted sessions + `editSessions` + checkpoints re-opened on target env; orchestrator choreographs |

### P — Persistence, context, workflow reuse

| ID | Capability | Class | Evidence | Gap / Flauz work |
|---|---|---|---|---|
| C-35 | Chat/agent session persistence across restarts | AVAILABLE | EV-08 §2 — contrib `chatSessions/`, `chatEditingSessionStorage.ts` | none |
| C-36 | Third-party agent session history in chat (e.g. CLI agents) | INTEGRABLE (P) | EV-08 §3 — `chatSessionsProvider.d.ts`: item provider (45/57/65), content provider (599/556), options incl. model metadata (699+); `remoteCodingAgentsService` (EV-02 §9) | Flauz connector extensions per agent |
| C-37 | Extension state, secrets, storage scopes | AVAILABLE | EV-08 §1 — `workspaceState` (8437), `globalState` (8443), `secrets` (8464), `storageUri` (8506) | none |
| C-38 | Agent changesets: edit tracking, checkpoints, review UX | AVAILABLE | EV-02 §8 — `chatEditing*` (per-file entries, checkpoint timeline, storage, overlays); `editTelemetry/agentHostEditMarkerService`; multi-diff review (EV-06 §6) | none — inherit & don't regress |
| C-39 | Reusable agents/prompts as files (`.agent.md`, `.prompt.md`, `.instructions.md`, `SKILL.md`) | AVAILABLE ⚠ (P) | EV-09 §1 — `chatPromptFiles.d.ts` (sources local/user/extension/plugin/builtin; tool restrictions; sessionTypes); `extensions/prompt-basics` grammar | ⚠ proposed API; Flauz curated library + governance |
| C-40 | Save a run as a reusable workflow (triggers, re-runs) | PROTOTYPABLE | EV-09 §3 — AHP protocol `RunAutomationParams`/`ListAutomationTriggerDefinitions`/`FetchAutomationRuns` (agentService.ts:25); **no authoring API/UI** (EV-11 N-10) | lives in: Flauz workflow extension + (optionally) built-in UI on `aiCustomization` patterns |
| C-41 | Prompt authoring / review UX | AVAILABLE | EV-09 §2 — `promptSyntax`, `promptTimeline`, `planReviewFeedback` contribs | none |

### X — Ecosystem, distribution, product

| ID | Capability | Class | Evidence | Gap / Flauz work |
|---|---|---|---|---|
| C-42 | Extension ecosystem compatibility | AVAILABLE ⚠ | EV-10 §1 — extension host + contribution points unchanged; **no `extensionsGallery` in OSS product.json** (EV-11 N-1) | ⚠ gallery choice is a product decision: Open VSX vs own registry (D-1); MS marketplace license risk |
| C-43 | Proposed-API enablement for Flauz built-ins (browser, resolvers, MCP gateway, chat sessions, pricing) | AVAILABLE (distribution switch) | EV-10 §3 — ~190 proposed d.ts files; per-extension enablement via product config/CLI | policy: which proposed APIs, review cadence, upstream tracking (D-3) |
| C-44 | Product identity / branding / protocols | AVAILABLE (build input) | EV-10 §2 — product.json name/ids/protocol fields; no `src/vs` edit | none (build pipeline work) |
| C-45 | In-tree Copilot extension as reference/fork base for default agent | AVAILABLE ⚠ | EV-10 §1 — `extensions/copilot/` full source, MIT; entitlement coupling (`copilot_internal` URLs, `GITHUB_COPILOT_PROTECTED_RESOURCE`, EV-02 §1) | ⚠ legal/entitlement review required (D-2) |

**Counts**: AVAILABLE 27 (4 with ⚠ gating) · INTEGRABLE 13 (9 stable, 4 proposed-dependent) · PROTOTYPABLE 5 · REQUIRES CORE FORK 3 · BLOCKED 2 — **50 rows**.

---

## 2. BLOCKED rows (named blockers, with the viable alternative)

| ID | Blocked capability | Blocker | Alternative path |
|---|---|---|---|
| B-01 | Shipping with Microsoft's extension marketplace + MS-published remote/Copilot binaries on a non-VS-Code product | License/terms: marketplace + `ms-vscode-remote.*` + Copilot entitlements are restricted to VS Code builds (evidenced by entitlement wiring: product.json:90–157 `copilot_internal` URLs; `protectedResourcesRequireGitHubCopilotSignIn`, EV-02 §1) | Open VSX / own registry; open-source resolver extensions (C-30/C-32); own default agent (D-1/D-2) |
| B-02 | In-workbench CDP browser on **web/serverless** builds | browserView is `electron-browser/` only (EV-11 N-9); no CDP in web sandbox | Playwright/Chrome-MCP server via core MCP support (EV-03 §3) driving an external or cloud browser; simple-browser for display-only |

---

## 3. REQUIRES CORE FORK rows (deliberately small; conditional)

These are the **only** capabilities found where `src/vs` changes may be unavoidable. None are needed for
Wave-1 scope; each is triggered only by a product decision.

| ID | Trigger | Exact core areas | Why it can't be done extension-side | Avoidance |
|---|---|---|---|---|
| F-01 | Flauz needs to **restructure the built-in Chat/Agent-Session interaction model** beyond participant/tool theming (e.g. replace the chat widget flow, custom approval dialogs UX, agent-session viewer redesign) | `src/vs/workbench/contrib/chat/browser/widget/**` (chat widget, input, model picker), `chat/browser/agentSessions/*Viewer*.ts`, `chat/browser/media/*` | The widget/viewer are workbench-contributed UI, not extension-contributable surfaces; extensions can add views/webviews but not re-skin the stock chat flow | Ship Flauz agent UX as its own view/webview surface alongside; fork only if "must replace stock chat" is decided |
| F-02 | Flauz wants proposed capabilities as **stable, Flauz-guaranteed API** (e.g. promote `browser.d.ts`, `terminalDataWriteEvent`, `chatSessionsProvider` to stable, or change their contracts) | `src/vscode-dts/vscode.d.ts` + matching `src/vs/workbench/api/common/extHost*.ts` (e.g. `extHostBrowsers.ts`, `extHostTerminalService.ts`, `extHostChatSessions.ts`) + `extensions/tsconfig` / dts rollup tooling | API promotion/contract change is definitionally core (d.ts + extHost impl) | Keep proposed + enabled-for-built-ins (C-43); fork only when a Flauz-stable API surface must be published to third parties |
| F-03 | Flauz needs **Agent Host Protocol-level changes** (new AHP channels, session-state schema changes, extra built-in providers beyond config) | `src/vs/platform/agentHost/**` (agentService.ts, state/protocol/**), `src/vs/workbench/contrib/chat/browser/remoteAgentHost/**` | AHP is an in-process/platform protocol; providers are pluggable but channels/schema are not | Register Flauz agents as providers (config/extension); protocol changes only if orchestration semantics must diverge |

Everything else in the matrix — including browser control, MCP, multi-model, resolvers, sandboxes,
automations, memory — is reachable via extensions, built-in extensions, contribs, or product.json.

---

## 4. Six-session simulation (static, evidence-traced)

Method note: runtime build was out of sandbox scope; each step below is traced to tree evidence, and the
"breaks" are traced to negative results (EV-11). Sessions simulate **stock Code OSS at HEAD** with two
scenarios noted: (a) with Microsoft's Copilot bits present (VS Code-product-like), (b) Flauz-on-OSS
build (no MS entitlements).

### Session 1 — Plain coding session (the quality bar)

1. `code /repo` → folder opens; explorer, editor, outline, breadcrumbs (C-01).
2. Edit TypeScript: completions, hovers, refactorings from in-tree `typescript-language-features` (C-02).
3. `tasks.json` npm task → run in terminal; problems panel; `F5` debug with pinned js-debug (C-10, C-11).
4. Set breakpoints, inspect variables, watch (C-11/C-12 surfaces exist for humans here).
5. Stage/commit in SCM view; diff/merge editor on conflict (C-14).
6. Search across repo incl. AI search surfaces (C-04).

- **Works today**: everything above, out of the box.
- **Flauz-on-OSS delta**: language extensions arrive via chosen gallery (B-01/D-1); identity via product.json (C-44).
- **Weakest link**: marketplace/extension distribution licensing — the only thing standing between an OSS build and parity.
- **Proves**: the "IDE is not the product but must not regress" floor is fully inherited; Flauz spends zero effort here except distribution config.

### Session 2 — Agent-driven implementation with human gates

1. User opens chat, picks agent + model in the model picker (C-20 ⚠).
2. Agent plans; plan review feedback surface exists (`planReviewFeedback`, C-41).
3. Agent edits files → chat-editing changeset: per-file entries, **checkpoint timeline**, multi-diff review editor (C-38).
4. Agent runs tests via terminal tool: `shellIntegration.executeCommand` + streamed output (C-08); task tool alternative (C-10).
5. Tool calls hit confirmation gates: `ToolConfirmKind` scoped session/profile/workspace; risk assessment service (C-25).
6. User steers mid-run: AHP `IAgentSteeringConsumedSignal` (C-24 ⚠); user reviews diff, restores a checkpoint (C-38).
7. Session persists; `ChatSessionStatus.NeedsInput` re-opens pending approvals (C-35, EV-03 §5).

- **Works today**: all core mechanics (chat editing, confirmation, checkpoints, terminal tools) — in the **default-agent path** (Copilot-entitled, VS Code product).
- **Flauz-on-OSS delta**: ship a default chat agent (fork in-tree `extensions/copilot` as reference, or own participant on stable `lm` API — D-2); custom gate semantics = participant logic.
- **Weakest link**: default-agent entitlement wiring (product.json `defaultChatAgent` → `copilot_internal` URLs).
- **Proves**: approval gates, changesets, steering, checkpoints are **core concepts**, not Flauz fork material; the agent loop itself is provider-pluggable (Claude/Codex providers in AHP).

### Session 3 — Multi-model / multi-agent

1. Model picker lists models from multiple vendors (C-20); per-session choice; pricing/category display (P) (C-21).
2. Local Ollama model appears via a vendor extension calling `registerLanguageModelChatProvider` (C-19, stable).
3. Per-subtask models: Flauz participant calls `lm.selectChatModels({vendor/family})` + `sendRequest` with tools (C-19, stable).
4. Parallel agents: multiple chat sessions in tabs, separate contexts (C-23); AHP subagents spawned/resumed/completed signals for hierarchical agents (C-24).
5. External CLI agents (Codex/Claude CLIs) register via `remoteCodingAgentsService` and their MCP tools flow through the editor gateway `lm.startMcpGateway()` (EV-03 §3).
6. Cost awareness: pricing metadata in picker (P), quota states for default agent; metered-connection awareness (C-21).

- **Works today**: multi-session + multi-vendor registration + picker; subagents in the AHP path.
- **Flauz-on-OSS delta**: vendor pack (providers + auth via `secrets`), cross-agent budget/latency ledger (no built-in — EV-11 N-7).
- **Weakest link**: fragmented cost/latency telemetry (proposed pricing API; no latency field; no cross-session accounting).
- **Proves**: the core is model-agnostic by design (`lm` is a stable, vendor-neutral API); "multi-model" is a Flauz extension pack, not a fork.

### Session 4 — Browser-assisted agent

1. Agent needs to verify the web app: `navigateBrowserTool`, `clickBrowserTool`, `typeBrowserTool`, `screenshotBrowserTool`, `runPlaywrightCodeTool` — all in-tree (C-28).
2. A REAL browser page renders in an editor tab (`browserView` Electron surface, 17 features incl. devtools/find/zoom/remote) — user watches live.
3. Screenshots return as tool results; agent writes artifacts to the workspace via `workspace.fs`; chat cites files with anchor parts (C-29).
4. Extension-driven variant: `window.openBrowserTab(url)` + `BrowserTab.startCDPSession()` → raw CDP both ways (P) (EV-04 §2).
5. Evidence lands in SCM artifact groups (P) with timestamps + open-commands (C-18).

- **Works today**: the whole tool suite, in the default-agent path, desktop.
- **Flauz-on-OSS delta**: enable proposed `browser.d.ts` for the Flauz agent extension (C-43); web builds route to an MCP browser server (B-02 alternative).
- **Weakest link**: desktop-only in-box browser; proposed-API dependence for extension control.
- **Proves**: "agent + real browser in the IDE" is **already a core subsystem** — Flauz's job is access policy and evidence plumbing, not building a browser.

### Session 5 — Environment switching mid-session

1. Start local; agent + terminal local (C-07/C-08).
2. Reopen workspace in dev container (resolver authority; `devContainerAgentHost` platform service for agent-host-in-container, C-32).
3. Switch to remote SSH via an open resolver extension (`registerRemoteAuthorityResolver`, `ManagedResolvedAuthority`; nested `container@ssh` chaining, C-30).
4. Terminal follows (remote pty/`remoteTerminalBackend`); debugger follows (DAP over remote); **agent host follows** (`AgentHostIpcChannels.RemoteProxy`; test-resolver bridges AHP with `VSCODE_AGENT_HOST_BRIDGE_CONNECTION_TOKEN`, EV-07 §2/§4).
5. Cloud sandbox: core `cloudSandbox*` session list/credentials (C-33, MS-bound) or Flauz sandbox contrib on E2B/own infra (D-6).
6. Continuity: chat sessions + edit sessions + checkpoints persist; `editSessions` contrib syncs state across machines (C-34/C-35).

- **Works today**: per-environment execution (terminal/debug/agent-on-remote) and persisted-session continuity; chained authorities.
- **Flauz-on-OSS delta**: open resolver extensions (licensing! B-01/D-1), sandbox provider contrib (C-33), "resume everywhere" choreography.
- **Weakest link**: **live hand-off of a running agent mid-flight is not a built-in flow** (EV-11 N-8) — continuity is re-open-based; and MS remote extensions are license-blocked on OSS builds (B-01).
- **Proves**: environments are a first-class axis (authority + AHP channels); Flauz's "environment switch" is resolver + orchestration work on a native mechanism.

### Session 6 — Full Flauz orchestration, verified & saved

1. User invokes a saved workflow: a `.agent.md` + `.prompt.md` bundle with tool restrictions and session types (C-39), plus `tasks.json` steps (C-10).
2. Orchestrator fans out subagents (AHP subagent signals, C-24) — e.g. implementer (Claude provider), reviewer (Qwen via `lm`), each with own model (C-19).
3. One subagent provisions a cloud sandbox (Flauz sandbox contrib, C-33) and works there; AHP RemoteProxy keeps it attached (C-34).
4. Browser subagent verifies the result with screenshots (C-28/C-29); debug subagent attaches breakpoints (C-12).
5. Evidence bundle: screenshots + logs + anchors in SCM artifact groups (C-18/C-29); AHP debug-log artifact streaming precedent (EV-02 §4).
6. Human gates fire at configured points (C-25); user steers (C-24).
7. **Save as reusable workflow**: prompts/agents as files (C-39) + AHP automation trigger definitions (`ListAutomationTriggerDefinitions`/`RunAutomationParams`, EV-09 §3) → next run is one command.

- **Works today**: every primitive exists (files-as-agents, subagents, automations protocol, browser, gates, artifacts) — but the **authoring + choreography surface does not** (EV-11 N-10; no automation d.ts/UI).
- **Flauz-on-OSS delta**: the orchestration product layer — workflow extension, automation authoring UI, evidence provider, sandbox contrib. All extension/contrib-level (no F-rows triggered).
- **Weakest link**: automation authoring API absence + agent-to-agent messaging (EV-11 N-5/N-10).
- **Proves**: Flauz's actual build is the **orchestration layer on top of an agent-native base** — the base already speaks agents, tools, environments, and workflows at protocol level.

---

## 5. What the matrix says about architecture (for the TL)

1. **The base is far more agent-native than "VS Code + extension" folklore suggests.** AHP (subagents/steering/changesets/automations/cloud sandboxes), MCP, CDP browser, chat-editing checkpoints — all in-tree. The correct mental model: *Code OSS ships an agent platform chassis; Flauz builds the orchestration body on it.*
2. **The fork surface can stay near-zero.** Only F-01..F-03 exist, all conditional on product decisions (replace stock chat UX / publish Flauz-stable APIs / mutate AHP). Wave 1 should treat them as avoidable.
3. **The real Wave-1 risks are licensing & wiring, not code**: marketplace/gallery (B-01), default-agent entitlement (C-20/C-45), MS remote extensions (C-30/B-01). These are decisions, mostly D-1/D-2/D-6.
4. **Proposed-API posture is a first-class architectural choice** (C-43/D-3): it converts many would-be forks into config, at the price of upstream churn tracking.
5. **Do not regress** C-01..C-16 — the plain-coding floor (Session 1) must stay one-config-away from parity.

## 6. Uncertainty register (precise questions, not vibes)

| # | Uncertainty | Precise question | How to close |
|---|---|---|---|
| U-1 | C-20/C-23/C-24/C-28 gating depth | Which of the ⚠ surfaces light up with a **non-Copilot default agent** (own participant) vs. require the in-tree copilot extension fork? | Build a minimal default-agent participant against `lm` + tools; smoke-test picker/subagents/browser tools (post-Wave-1 spike) |
| U-2 | AHP provider extensibility | Can Flauz register an AHP agent provider **without core changes** (as extension/config), given `remoteCodingAgents` d.ts is an empty placeholder (EV-11 N-4)? | Trace provider registration path in `platform/agentHost/common/agent.ts` (unread in this pass) |
| U-3 | Automation protocol fidelity | Do AHP automation channels support Flauz's workflow semantics (params, retries, evidence outputs), or only Copilot's? | Read `state/protocol/channels-automation/commands.ts` in full |
| U-4 | Resolver licensing nuance | Are open-remote-ssh-style extensions distributable via Open VSX for a Flauz product without violating the resolver API's expectations? | Legal review + VSCodium precedent scan |
| U-5 | Browser on web via MCP | Quality of Playwright-MCP-driven browser for web builds (latency, screenshots, auth) — acceptable as the web story? | Prototype against core MCP support |

Evidence coverage: 12 evidence files (EV-00..EV-11), ~90 distinct file:line citations, 12 negative results. See `evidence/c-capability-matrix/INDEX.md`.
