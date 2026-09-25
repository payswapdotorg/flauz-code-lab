# Flauz Performance Plan

**Wave 2 / Worker E.** Scope: performance budgets and measurement strategy for Flauz on the Code OSS base, covering startup, extension activation, memory, parallelism, latency, measurement, and risks.

**Reference tree**: `payswapdotorg/Flauz` @ `9bf9ae764da438b1234a8243dc9e47173ef58ee7` (pristine mirror of microsoft/vscode main, TL-verified). All architectural claims cite `path:line` in that tree; verbatim excerpts live in `../evidence/e-perf-migration/` (files 01–12). Lab observations from Wave-1 Worker B cite `evidence/b-browser-ux/` on branch `wave1/b-browser-ux`.

**Floor case (binding)**: 2 cores / 4 GB RAM / ~8 GB disk — the worker sandboxes themselves prove the constraint (this wave's own sandbox: 2 cores, 4.1 GB, confirmed in worklog). Every default-config budget below must hold **on the floor case**; richer hardware raises concurrency caps, not correctness.

**Method**: budgets are *targets to be enforced in CI* (see MIGRATION-PLAN §5), derived from (a) in-tree mechanisms that already bound cost, (b) measured lab evidence where it exists, and (c) reasoned process/IPC accounting. Where a number is an estimate pending CI measurement, it is marked **[E]**.

---

## 1. Startup

### 1.1 The baseline we must not regress

Stock startup path (evidence 01):

| Milestone | Mark | Emitted at |
|---|---|---|
| Main bootstrap start | `code/didStartMain` | `src/main.ts:23` |
| Main bundle loaded | `code/willLoadMainBundle` (with `performance.timeOrigin`) → `didLoadMainBundle` | `src/main.ts:25-31` |
| App ready | `code/mainAppReady` | `src/main.ts:218` |
| First window opening | `code/willOpenFirstWindow` → `didOpenFirstWindow` | `src/vs/code/electron-main/app.ts:792-794` |
| Renderer start | `code/didStartRenderer` | `src/vs/code/electron-browser/workbench/workbench.ts:13` |
| Splash shown (pre-bundle) | `code/will|didShowPartsSplash` | `workbench.ts:29-31` |
| Workbench bundle import | `code/will|didLoadWorkbenchMain` | `workbench.ts:744,750` |
| Workbench done | `code/didStartWorkbench` (+ `performance.measure('perf: workbench create & restore', ...)`) | `src/vs/workbench/browser/workbench.ts:420-422` |

Lifecycle phases (evidence 01): `Starting(1) → Ready(2) → Restored(3) → Eventually(4)` (`src/vs/workbench/services/lifecycle/common/lifecycle.ts:188-217`). `Restored` is set after `Promise.race([whenRestored, timeout(2000)])` — editor restore never blocks longer than 2s (`workbench.ts:410-414`); `Eventually` lands ≥2.5s later, idle-gated (`workbench.ts:434-438`). Phase transitions emit `code/LifecyclePhase/<name>` marks (`src/vs/workbench/services/lifecycle/common/lifecycleService.ts:92-125`). Contributions instantiate per phase with idle chunking (`src/vs/workbench/common/contributions.ts:301-345`).

**Stock startup already includes**: the Agent Host utility process, **prewarmed at `WorkbenchPhase.BlockRestore`** (`src/vs/workbench/services/agentHost/electron-browser/agentHostService.ts:63-65,118`), the shared process, pty host, watcher process, and one local extension host (evidence 06). This is Flauz's true baseline — not "bare Code OSS".

### 1.2 Where Flauz additions may land

Rules (each backed by an in-tree mechanism):

1. **Nothing before `Restored`.** Flauz renderer-side contributions register at `AfterRestored` or `Eventually` (contribution phases are exactly this knob — `contributions.ts:31-62`).
2. **Agent Bridge built-in activates ONLY on `onStartupFinished`** — never `*`. `onStartupFinished` fires after all eager activation, hard-capped at 10s (`src/vs/workbench/api/common/extHostExtensionService.ts:671-687`), and a throttled deferred variant already exists in-tree (`extensions.experimental.deferredStartupFinishedActivation`, 50ms/chunk — `extHostExtensionService.ts:624-645`) as a zero-fork lever if activation storms appear (evidence 02).
3. **Flauz Core service handshake is deferred + async**: process spawn may overlap startup (mirroring the AHP prewarmer pattern), but no renderer work blocks on it; the bridge marks handshake completion, not start.
4. **Flauz emits `code/flauz/*` marks only** — the timer service aggregates exclusively `code/`-prefixed marks (`src/vs/workbench/services/timer/browser/timerService.ts:617-623`); anything else is invisible to the in-tree pipeline (evidence 03).
5. **AHP prewarm decision is a measured call, not a default**: providers are setting-gated (`chat.agentHost.claudeAgent.enabled` / `chat.agentHost.codexAgent.enabled`, `src/vs/platform/agentHost/common/agentService.ts:186,196`); Flauz's default profile should disable built-in Claude/Codex providers (DL-3 decoupling) which also removes their prewarm cost, deferring agent-host bring-up to first chat interaction **[decision point → measure in Wave 3 CI]**.

### 1.3 Startup budgets

| Budget | Target | Enforcement |
|---|---|---|
| First-paint delta (Flauz vs upstream baseline, same runner) | ≤ **+75 ms p50 / +150 ms p95** | `--prof-append-timers` TSV diff (evidence 03) |
| `code/didStartWorkbench` delta | ≤ +100 ms p95 | same |
| Flauz service handshake complete | ≤ **500 ms** after `LifecyclePhase.Eventually` | `--prof-duration-markers` on `code/flauz/willConnectCore`→`code/flauz/didConnectCore` |
| Flauz work before `Restored` | **0** (by rule 1) | code review + contribution-phase assertion |
| Agent Bridge activation (`extensionActivationTimes`) | ≤ 300 ms activate-resolved, ≤ 50 ms code-loading | `extensionActivationTimes` telemetry (evidence 02) |
| LM vendor resolution warm-up (first `selectChatModels` after handshake) | ≤ 2 s, off the interactive path | vendor pre-warm at handshake (see §5.1) |

**[E]** All absolute ms targets are provisional until the first CI baseline pair (upstream vs flauz/main) exists; the *deltas* are the contract.

---

## 2. Extension activation discipline

### 2.1 Rules for `extensions/flauz-*` built-ins

1. **Activation events**: declare narrow events only — `onStartupFinished` (bridge), `onCommand:flauz.*`, `onView:flauz.*`, `onLanguageModelChatProvider:<vendor>` for provider extensions (this event is what model resolution activates — `src/vs/workbench/contrib/chat/common/languageModels.ts:1223-1244`, evidence 02/08). Never `*` (eager, blocks `onStartupFinished` for everyone — `extHostExtensionService.ts:671-687`).
2. **Affinity pinning (DL-5)**: `extensions.experimental.affinity: { "flauz.agent-bridge": 1 }` puts the Agent Bridge on its own extension host. Cost model (evidence 04): each distinct positive integer allocates a new local-process ext-host slot (`extensionRunningLocationTracker.ts:167-204`), and `_startExtensionHostsIfNecessary` creates one `ExtensionHostManager`/utility process per slot 0..maxAffinity (`abstractExtensionService.ts:820-839`). **Total cost: exactly one additional extension-host process** (~100-250 MB RSS **[E]**). Constraints: experimental setting; initial-allocation-only (reload required); ignored under extension debugging.
3. **Proposed-API posture (DL-4)**: enabled per built-in via `product.flauz.json#extensionEnabledApiProposals` — this is the mechanism the tree provides (`extensionsProposedApi.ts:42-114`, evidence 05); runtime overhead is a per-property-access guard (`checkProposedApiEnabled`, `extensions.ts:330-334`) ≈ zero. The real cost is upstream churn across ~180 proposed d.ts files — handled by the per-sync canary (MIGRATION-PLAN §5), not by runtime budget.

### 2.2 Activation budget table

| Event | When it fires (evidence) | Flauz rule |
|---|---|---|
| `*` | eagerly at ext-host start, once (`extHostExtensionService.ts:672`) | **forbidden** in flauz-* manifests |
| `onStartupFinished` | after `*`+workspaceContains+remoteResolver settle, ≤10s cap (`:682`) | bridge + workspace extensions only; ≤2 flauz extensions on it |
| `onLanguageModelChatProvider:<vendor>` | on first vendor model resolution (`languageModels.ts:1223-1244`) | provider extensions declare it; pre-warmed at handshake |
| `onCommand/onView/onTaskType`... | user action | default for UI-triggered features |
| Contribution phases (renderer) | `AfterRestored`/`Eventually`, idle-chunked (`contributions.ts:301-345`) | any Flauz workbench contrib lands here |

Per-extension activation is already telemetered (`extensionActivationTimes`: `codeLoadingTime`/`activateCallTime`/`activateResolvedTime` — `extHostExtensionService.ts:430-473`) and per-host (`extensionHostStartup`, `extensionHostManager.ts:110-115`) — CI gates use these events directly (§6).

---

## 3. Memory

### 3.1 Stock process baseline (evidence 06, 12)

Per desktop window/session, stock Code OSS at HEAD runs: main, renderer(s) + gpu, shared-process (gallery/downloads/local git/SSH-devcontainer-WSL agent hosts/Playwright channel — `sharedProcessMain.ts:512-515`), pty-host utility (`electronPtyHostStarter.ts:59-62`), **agent-host utility (AHP), prewarmed** (`electronAgentHostStarter.ts:169-199`), one local extension host (+1 per affinity slot), file-watcher process (`watcherMain.ts:13-21`), plus a sandboxed WebContentsView renderer **per browser pane** (`browserView.ts:141-162`).

Per-process heap caps: **none exist** (negative — no `--max-old-space-size` in any spawn path; only global `argv.jsFlags`, `desktop.contribution.ts:467`; evidence 12). Therefore Flauz memory policy = admission control + eviction at the orchestration layer.

### 3.2 Flauz memory budget table

| Surface | Process home | Budget (floor case, defaults) | Policy / eviction |
|---|---|---|---|
| Agent Bridge ext host (affinity-pinned) | +1 ext-host utility process | 100-250 MB RSS **[E]** | one pinned host total; health via `extensionHostStartup` + Process Explorer |
| Flauz Core service (DL-5) | separate process | ≤ 150 MB idle; ledger page-cache LRU cap 64 MB | spill ledger to `.flauz/` files (DL-9); never grow cache under memory pressure |
| AHP agent sessions | agent-host utility + provider SDK children | ≤ 2 concurrent local agent sessions **[E: 1 exec + 1 idle]** | idle-session eviction after 10 min; queue at admission |
| Browser panes | 1 sandboxed renderer per WebContentsView | ≤ 2 visible panes; dispose idle pane renderers after 10 min | per-agent ephemeral partitions auto-drop with session (`browserSession.ts:177-179`) |
| Parallel agent sandboxes (AHP RemoteProxy) | remote/cloud hosts | client-side: ≤ 4 concurrent transports | RemoteProxy reuses the remote agent connection (`agentService.ts:55-72`) — no per-agent client sockets |
| Terminal | pty-host utility + per-pty | unbounded ptys allowed; renderer protected by flow control (100k-char high watermark, `terminal.ts:876-891`) | stock behavior; no Flauz change |
| File watcher | watcher process | bounded by ThrottledWorker (500/200ms/30k — `parcelWatcher.ts:179-188`) | ship Flauz default `files.watcherExclude` for `.flauz/evidence/**` binaries |
| Search | transient rg per search | result cap 20000 (`search.ts:32`) | stock; agent searches inherit |
| Evidence ledger | Flauz Core + `.flauz/` files | bounded write queue (watermark pattern) | copy the terminal flow-control shape (§4.2) |

**Floor-case total**: Flauz-added RSS ≤ **~500 MB** above stock at defaults (pinned ext host + Core service + 2 panes + 2 agent sessions). Exceeding → eviction order: idle browser panes → idle agent sessions → ledger page cache → (last) refuse new admissions with a chat-visible reason.

### 3.3 Large workspace handling

- Watcher: stock budgets are chunked (evidence 11); Flauz's `.flauz/` artifact writes should avoid watcher storms by excluding binary evidence dirs from watching (default `files.watcherExclude` additions in the Flauz defaults profile — config, not core).
- Search: caps inherited; agent-driven search fan-out limited by §4 concurrency rules.

---

## 4. Parallelism

### 4.1 Concurrency limits (floor case: 2 cores / 4 GB)

| Resource | Max concurrent | Beyond that |
|---|---|---|
| Executing local agent sessions (AHP) | **1 executing + 1 idle** | queue (admission control in Flauz Core; progress visible via chat progress parts) |
| Browser tool calls (per session) | **1** (CDP ops serialize per session — `group.sendCDPMessage`, evidence 10) | queue per session |
| Visible browser panes | 2 | open-as-needed, dispose idle |
| Remote agent hosts (transports) | 4 | pool reuse (RemoteProxy) |
| Flauz background ledger flushes | 1 writer, bounded queue | spill to disk |

Subagent fan-out happens **inside the agent-host process** (`IAgentSpawnChatEvent`, `src/vs/platform/agentHost/common/agent.ts:711-722`) — client connection count stays flat; the constraint is host-process CPU/memory, hence the executing-session cap. The worker sandboxes running this very program (2 cores shared by browser + dev server + agents) are the existence proof that these limits are realistic.

### 4.2 Backpressure design points (in-tree precedents to copy)

1. **Terminal flow control** — high/low watermarks over unacknowledged chars on a direct MessagePort (`terminal.ts:876-891`, `terminalProcess.ts:326-327`): *the pattern for evidence-ledger writes and any Flauz frame streaming* (bounded buffer → pause producer → resume below low watermark).
2. **LM streaming** — each response part is an awaited RPC (`$acceptResponsePart`, `mainThreadLanguageModels.ts:243-246`) → backpressure is structural; bursts are coalesced by the ext-host sendQueue microtask flush (`extHostChatAgents2.ts:99-113`, evidence 07). Flauz adds nothing here; it must not *break* it (no unbounded renderer-side buffering of parts).
3. **Watcher** — ThrottledWorker chunking (`parcelWatcher.ts:179-188`): the pattern for ledger batch writes.
4. **Activation** — interest short-circuit + promise dedup (`abstractExtensionService.ts:989-1001`, `extensionHostManager.ts:327-332`): Flauz tools should dedupe identical in-flight tool calls per session.

### 4.3 AHP connection pooling

Channels are enumerated at `src/vs/platform/agentHost/common/agentService.ts:55-72` (`AgentHost`, `Logger`, `ConnectionTracker`, `Protocol`, `Management`, `RemoteProxy`). Renderer transport is one `AgentHostIpcChannelTransport` per window per host (`agentHostIpcChannelTransport.ts:37`); server-side hosts are reached via the `RemoteProxy` channel which "proxies AHP JSON-RPC frames between a renderer and the agent host running on the server" — i.e., pooled over the existing remote agent connection. **Flauz rule: never open additional transports per agent; fan-out is a host-process concern.**

---

## 5. Latency budgets

### 5.1 Chat first token

Path (evidence 07): `ChatWidget._acceptInput` (`chatWidget.ts:3557`) → `ChatService.sendRequest` (`chatService.ts:2127`) → `ChatModel` → **RPC 1** `$invokeAgent` (`mainThreadChatAgents2.ts:366-369`) → ext-host agent → **RPC 2** `$tryStartChatRequest` (`extHostLanguageModels.ts:529`) → provider → first part → **RPC 3** `$acceptResponsePart` → **RPC 4** `$handleProgressChunk` → widget. Four logical RPCs ≈ 12 wire messages, all on ONE direct MessagePort (request+ack+reply per call — `rpcProtocol.ts:377-392, 490-495`; port brokered once by main, `ipc.mp.ts:37-46`).

| Segment | Budget (p95, excluding model TTFB) | Notes |
|---|---|---|
| UI → `$tryStartChatRequest` issued | ≤ **100 ms** | 2 RPC legs + agent dispatch; cold-agent activation excluded (pre-activated via `onStartupFinished`) |
| First part → first visible token | ≤ **50 ms** | 2 RPC legs + render |
| Cold-vendor first selection | ≤ 2 s one-time | `onLanguageModelChatProvider:<vendor>` activation (`languageModels.ts:1223-1244`) — pre-warm vendors at handshake |

### 5.2 Tool invocation round trip

| Tool class | Process path (evidence) | Overhead budget (p95, excl. tool work) |
|---|---|---|
| In-workbench tools (renderer impl) | ext host → renderer and back (1 RPC round trip, `$invokeTool` — `mainThreadLanguageModelTools.ts:96-99`) | ≤ **60 ms** |
| Browser tools | ext host → renderer → **shared process** ('playwright' channel) → **main** (CDP) → Chromium (`browserToolHelpers.ts:162-171`, `playwrightService.ts:131-161`, `browserViewDebugger.ts:92`) | ≤ **250 ms** |
| Terminal tool | agent → shellIntegration stream (stable API, C-08) | ≤ 100 ms to first echo line |

### 5.3 Browser pane visuals

- **Desktop live pane: native composition, zero streaming cost.** The WebContentsView renders in its own process; the workbench positions an overlay (`overlayManager.ts:60-74`). No frame pipeline exists in-tree (negative: `startScreencast` has zero matches — evidence 10).
- **On-demand screenshots**: `screenshot_page` tool → `Page.captureScreenshot` with jpeg quality (`browserView.ts:910-913`); in-tree chat features use quality 80 (`browserEditorChatFeatures.ts:755`). Budget: ≤ **300 ms p95** for a viewport capture at quality ≤ 80.
- **Streaming (remote/cloud panes — Flauz work)**: B's lab evidence (`evidence/b-browser-ux/cdp/manifest.json`) captured 10 frames in a 0.5 s collection window (~20 fps burst during animation) inside a 12.6 s run on this sandbox class. Production budget for remote panes: **≥ 4 fps sustained at 720p, jpeg quality ≤ 70, ≤ 25% of one core**, dirty-frame-only, with terminal-style watermarks (§4.2) as the backpressure mechanism. On-demand snapshot fallback below budget.

### 5.4 Terminal echo

Renderer ↔ pty-host is a direct MessagePort (`localTerminalBackend.ts:135-146`, with its own mark `code/terminal/didConnectPtyHost`). Budget: ≤ **30 ms p50 / 60 ms p95** keystroke-to-cell local. Flow control engages only beyond 100k unacknowledged chars — not an interactive-path concern.

### 5.5 Environment switch

C's finding (N-8): live hand-off of a running session is **not** built-in; continuity is re-open-based. Budget the Flauz-side overhead only: warm switch (same machine, resolver cached) ≤ **1.5 s**; Flauz choreography overhead (persist task state, restore sessions/checkpoints) ≤ **500 ms** on top of container/resolver cold start.

---

## 6. Measurement plan

### 6.1 In-tree surfaces Flauz reuses (evidence 03 — no new measurement code)

| Surface | What it gives | Flauz use |
|---|---|---|
| `--prof-append-timers` (TSV appender, self-exiting) | per-run startup line: `ellapsed`, product, commit, standard-start verdict, `perfBaseline`, heap stats (`startupTimings.ts:70-101`) | **the CI harness**: N runs per build, diff vs upstream baseline |
| `--prof-duration-markers` / `--prof-duration-markers-file` | arbitrary mark-pair durations (`:104-127`) | direct `code/flauz/*` budget assertions |
| `startupTimeVaried` telemetry | full `IStartupMetrics` (`timerService.ts:638-647`) | release monitoring |
| `startup.timer.mark` telemetry | every `code/` mark (3% sampled; forced with `--prof-append-timers`) | release mark histograms |
| `extensionActivationTimes` / `extensionHostStartup` | per-extension + per-host activation cost | flauz-* activation gates |
| `perfBaseline` (fib(24) blob worker, `timerService.ts:560-603`) | machine-speed normalizer | budgets as deltas, not absolutes |
| Developer: Startup Performance view (`perfview.show`) | human-readable mark table | manual triage |
| Process Explorer (`contrib/processExplorer`) + `resolveProcesses()` | per-process CPU/mem incl. remote (`processMainService.ts:26-41`) | memory snapshots in CI + support |
| `startupHeapStatistics` | startup GC/heap | memory baseline |

### 6.2 Flauz-added instrumentation (all UPSTREAM-SAFE)

1. **Marks**: `code/flauz/will|didConnectCore`, `code/flauz/will|didRegisterParticipants`, `code/flauz/will|didWarmModels`, emitted from the Agent Bridge ext host — they ride `$setPerformanceMarks` automatically (evidence 02/03).
2. **Flauz Core service metrics** (separate process — cannot ride ext-host marks): reported through the extension `TelemetryLogger` API (`vscode.d.ts:10832`), the exact route A's UPSTREAM-STRATEGY table prescribes for custom product telemetry. Counters: ledger size, queue watermarks, active sessions/panes, eviction counts.
3. **Latency probes**: first-token split (UI→wire, wire→first part) and tool RTT measured extension-side — C's EV-11 N-7 notes per-request latency is absent upstream; Flauz adds it at the bridge.

### 6.3 Gates in CI (details in MIGRATION-PLAN §5)

Startup delta gates (§1.3), activation gates (§2.2), memory snapshot at `Eventually` + after a scripted agent session (via `resolveProcesses()` shape), latency probes on the golden path. **Mark-pair integrity check**: assert every `code/flauz/*` budgeted pair has both emit sites — protects against the drift class where timerService computes timers from marks nobody emits (live example found: `ellapsedWindowMaximize` — evidence 01, claim 4).

---

## 7. Risk table

| # | Perf risk | Budget at risk | Mitigation | Owner |
|---|---|---|---|---|
| R1 | `extensions.experimental.affinity` is experimental, initial-allocation-only, ignored while debugging | Agent Bridge isolation; activation budgets | config pin + CI canary asserting the "Placing extension(s) … on a separate extension host." log line (`extensionRunningLocationTracker.ts:222`); fallback: shared host is a perf-only degradation, not correctness | Flauz |
| R2 | AHP prewarm + provider SDK children saturate 2-core floor at startup | first-paint; memory | setting-gated providers off by default in Flauz profile (DL-3); prewarm decision by CI measurement (§1.2 rule 5) | Flauz |
| R3 | Browser panes multiply renderer processes | memory budget §3.2 | cap visible panes; idle disposal; ephemeral partitions for agent sessions (auto-drop) | Flauz (policy on upstream surface) |
| R4 | Streaming chunk RPC cost (≥3 wire msgs/chunk, awaited) on fast models | first-token; tokens/sec | rely on ext-host sendQueue coalescing (`extHostChatAgents2.ts:99-113`); monitor tokens/sec telemetry; escalate only with data | Upstream mechanism / Flauz monitoring |
| R5 | Proposed-API churn (~180 files; d.ts relocation precedent) | migration cost; activation breakage | per-sync canary diff of `extensionEnabledApiProposals` vs upstream (D-3 rota) | Flauz |
| R6 | Upstream mark/phase drift breaks Flauz budget assertions | measurement validity | mark-pair integrity check in CI (§6.3); budget only on marks with verified emit sites | Flauz CI |
| R7 | Remote-pane streaming exceeds CPU/fps budgets | §5.3 | quality ladder (fps→quality→on-demand snapshots), watermark backpressure (§4.2) | Flauz |
| R8 | Activation storms from third-party flauz-* extensions (future gallery) | startup | activation-events lint for the flauz extension category + `extensionActivationTimes` release gates | Flauz |

---

## 8. Open measurement questions (for Wave 3 CI to close)

1. Absolute stock baseline on CI runner class (marks table) — needed to convert **[E]** deltas into absolute guards.
2. AHP prewarm contribution to `code/didStartWorkbench` with Claude/Codex providers on vs off (R2).
3. Pinned ext-host RSS delta measured via `resolveProcesses()` (R1/R3 table numbers).
4. Browser tool 4-process path overhead (§5.2) on a cold vs warm shared process.
