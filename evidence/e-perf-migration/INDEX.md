# Evidence Index — Worker E (Wave 2: performance + migration lane)

Branch: `wave2/e-perf-migration` on `flauz-code-lab`.
Reference tree: `payswapdotorg/Flauz` @ `9bf9ae764da438b1234a8243dc9e47173ef58ee7` (depth-1 clone, read-only, never built).
Method: 4 parallel read-only Explore agents (Task IDs 2-a..2-d, records in `/home/z/my-project/worklog.md`) + direct grep/Read spot-verification of every load-bearing quote by Worker E. Negatives are recorded as negatives.

## Excerpt files (every perf-claim's verbatim backing)

| File | Subject | Key sources (path:line) | Feeds |
|---|---|---|---|
| `01-startup-path.md` | main/renderer entries, perf marks, lifecycle phases | `src/main.ts:23,25-31,218`; `electron-main/app.ts:792-794`; `code/electron-browser/workbench/workbench.ts:13,29-31,744-750`; `lifecycle.ts:188-217`; `lifecycleService.ts:92-125`; `workbench.ts:410-440`; `contributions.ts:31-62,301-345` | PERF-PLAN §1 |
| `02-onstartupfinished-activation.md` | onStartupFinished/star activation, deferred variant, activation telemetry, LM-vendor activation | `extHostExtensionService.ts:624-687`; `extensionsRegistry.ts:312-316`; `extHostExtensionActivator.ts:172-229`; `extensionHostManager.ts:65-68,327-332,110-115`; `languageModels.ts:1223-1244` | PERF-PLAN §1, §2 |
| `03-startup-telemetry-ci.md` | startupTimeVaried / startup.timer.mark / --prof-append-timers TSV / perfBaseline / mark aggregation | `timerService.ts:438-443,527,549-552,617-623,638-647,676`; `startupTimings.ts:70-101,104-127`; `mainThreadExtensionService.ts:182-188` | PERF-PLAN §6; MIGRATION §5 |
| `04-affinity-ext-hosts.md` | extensions.experimental.affinity → extra ext-host processes; kinds/defaults; spawn; memory levers | `extensions.contribution.ts:269-284`; `extensionRunningLocationTracker.ts:167-222`; `abstractExtensionService.ts:820-839`; `extensionHostKind.ts:9-13`; `nativeExtensionService.ts:565-590`; `extensionHostStarter.ts:105-127`; `desktop.contribution.ts:467` | PERF-PLAN §2, §3 |
| `05-proposed-api.md` | product.json proposal enablement, runtime guard, 180 d.ts count, churn precedent | `extensionsProposedApi.ts:42-114`; `extensions.ts:330-334`; `extHost.api.impl.ts:150` | PERF-PLAN §2; MIGRATION §2, §5 |
| `06-process-inventory.md` | utility-process census: agentHost (AHP), ptyHost, shared process, watcher; AHP channels/providers/prewarm; resolver bridge | `electronAgentHostStarter.ts:169-199`; `agentHostService.ts:43-65,118`; `agentService.ts:55-72`; `agentHostMain.ts:154-185`; `agent.ts:280-283,711-722`; `ptyHostService.ts:25-33`; `electronPtyHostStarter.ts:51-66`; `localTerminalBackend.ts:135-146`; `sharedProcess.ts:171-178`; `sharedProcessMain.ts:512-515`; `watcherMain.ts:13-21`; `vscode-test-resolver/src/extension.ts:26,188-195` | PERF-PLAN §3, §4 |
| `07-rpc-protocol-hops.md` | RPC message structure, MessagePort transport, first-token 4-RPC path, per-chunk cost, tool crossings, browser-tool 4-process path | `rpcProtocol.ts:249-262,377-392,490-495,940-953`; `localProcessExtensionHost.ts:412-444`; `ipc.mp.ts:37-46`; `chatWidget.ts:3557`; `chatService.ts:2127`; `mainThreadChatAgents2.ts:366-369`; `extHostLanguageModels.ts:529`; `mainThreadLanguageModels.ts:219-246`; `extHostChatAgents2.ts:99-113`; `mainThreadLanguageModelTools.ts:96-99` | PERF-PLAN §5 |
| `08-vscode-lm-selector.md` | vscode.lm d.ts surface + FULL matching implementation + pricing metadata + picker stack | `vscode.d.ts:20116-20124,20242-20312,20314-20344,20745-20770,20772-20778,20844-20851,21161-21178`; `extHost.api.impl.ts:1893-1895`; `extHostLanguageModels.ts:489-496`; `languageModels.ts:1412-1435`; `vscode.proposed.languageModelPricing.d.ts:10-78` | prototype #3; PERF-PLAN §2, §5 |
| `09-chat-task-surfaces.md` | ChatSessionStatus enum, approval model, ChatSessionItem, chatEditing snapshots + storage, SCM artifacts, content provider | `vscode.proposed.chatSessionsProvider.d.ts:10-30,294-404,435-498,527-575`; `agentSessionApprovalModel.ts:19-26,44-49,120-158`; `chatEditingSession.ts:386-423`; `chatEditingSessionStorage.ts:22-47`; `chatEditingService.ts:469-474`; `vscode.proposed.scmArtifactProvider.d.ts` (full) | prototype #6; MIGRATION §3 |
| `10-browserview-cdp.md` | 12 agent browser tools + registration, WebContentsView engine + session partitions, overlay manager, Playwright-in-shared-process backend, screencast NEGATIVE, proposed browser.d.ts | `browserTools.contribution.ts:92-95,167`; `navigateBrowserTool.ts:19-60,152-154`; `browserView.ts:141-162,859-861,910-913`; `browserSession.ts:134-179`; `overlayManager.ts:60-74`; `playwrightService.ts:51-64,131-161`; `browserViewDebugger.ts:92`; `vscode.proposed.browser.d.ts:13-47,83-90` | PERF-PLAN §3, §5; MIGRATION §3 |
| `11-terminal-watcher-search.md` | pty flow-control watermarks, parcel watcher budgets, watcherExclude defaults, rg spawn/streaming/caps | `terminal.ts:876-891`; `terminalProcess.ts:326-327`; `parcelWatcher.ts:6,159,179-188`; `files.contribution.ts:294-310`; `ripgrepFileSearch.ts:17-27`; `ripgrepTextSearchEngine.ts:78-114`; `search.ts:32` | PERF-PLAN §3, §4 |
| `12-memory-surfaces.md` | Process Explorer migration, process list source, V8 heap levers (negatives), startup heap telemetry, ext-host CPU profiler | `processExplorer.contribution.ts:14-17`; `processExplorerControl.ts:36-38,274`; `ps.ts:14-29,220-223`; `processMainService.ts:26-41`; `startupTimings.ts:240`; `extensionHostProfiler.ts:24-77` | PERF-PLAN §3, §6 |

## Run artifacts (prototypes)

| File | What it proves |
|---|---|
| `run-model-provider-fabric.txt` | prototype #3 ran clean (EXIT=0, deterministic): registry/selector matrix incl. case-sensitivity + empty-selector semantics, vendor-activation one-time cost, two-model routing with per-model cost/latency accounting, policy routing |
| `run-agent-task-state.txt` | prototype #6 ran + browser-verified on `node server.mjs` (127.0.0.1:4173): gate click → `POST /api/tasks/T-001/events` 200 → state `execute`; invalid event → HTTP 409 with allowed-states; envelope persisted to `.flauz/tasks.json`; console clean (includes a transparency note about an EADDRINUSE second-instance in the log) |
| `agent-task-state-desktop.png` | timeline UI at 1440×900, T-001 at HumanApproval gate (before interaction) |
| `agent-task-state-interaction.png` | after clicking ✓ Approve — T-001 advanced to execute, action buttons changed |
| `agent-task-state-mobile.png` | responsive check at 390×844 |
| `run-preview-host.txt` | the same prototype live in the sandbox preview host (Next.js `/` route, iframe + ported API routes): mode badge `persistence: live (.flauz/tasks.json)`, badge transition `awaiting-approval · needsinput(3)` → `execute · inprogress(2)`, host API 409 validation, console clean |
| `preview-host.png` / `preview-host-after-approve.png` | full-page screenshots of the preview host before/after the gate approval |

## Negative results worth keeping

1. **No screencast streaming in-tree** — `startScreencast` has zero matches across src/vs (all `screencast` hits are the a11y overlay). Live panes are native composition; streaming is Flauz work (PERF-PLAN §5.3).
2. **No empty-selector error in `lm.selectChatModels`** at this commit (classic vscode threw `illegal open-ended selector`) — mirrored by prototype #3.
3. **No per-process memory caps** anywhere in spawn paths (`VSCODE_MAX_MEMORY` absent; `--max-old-space-size` only in build tooling/tests/jsFlags doc).
4. **`onStartupFinished` is not documented in vscode.d.ts** — only in the manifest schema (`extensionsRegistry.ts:312-316`).
5. **Mark/emit drift exists upstream** — timerService computes `ellapsedWindowMaximize` from marks no code emits (motivates the CI mark-pair integrity check).
6. **Tree drift vs classic vscode**: `electron-sandbox` layer gone; d.ts relocated to `src/vscode-dts/`; chatEditing under `common/editing/`; Process Explorer under `contrib/`; ext-host API factory is `extHost.api.impl.ts`.
