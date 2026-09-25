# Evidence 06 — Process inventory: utility processes, AHP host, pty host, shared process, watcher

Tree: payswapdotorg/Flauz @ 9bf9ae764da. Quotes verbatim (2-b + 2-d bundles).

## The Agent Host Platform is a SEPARATE OS process (utility process), prewarmed at BlockRestore

`src/vs/platform/agentHost/electron-main/electronAgentHostStarter.ts:169-199`:
```ts
const utilityProcess = new UtilityProcess(this._logService, NullTelemetryService, this._lifecycleMainService);
...
if (!utilityProcess.start({
	type: 'agentHost',
	name: 'agent-host',
	entryPoint: 'vs/platform/agentHost/node/agentHostMain',
	...
})) { throw new Error('Agent Host utility process did not start.'); }
const port = utilityProcess.connect();
const client = new MessagePortClient(port, 'agentHost');
```
- Renderer client selection — `src/vs/workbench/services/agentHost/electron-browser/agentHostService.ts:43-48`:
```ts
const inner = environmentService.remoteAuthority
	? instantiationService.createInstance(EditorRemoteAgentHostServiceClient)
	: instantiationService.createInstance(LocalAgentHostServiceClient, ...);
```
(remote authority → agent host on the remote server; else local utility process.)
- **Prewarm at startup** — `agentHostService.ts:63-65` + `:118`:
```ts
this.agentHostService.startAgentHost();
```
inside `AgentHostPrewarmer` (registered `AgentHostPrewarmContribution`, **WorkbenchPhase.BlockRestore**).
- AHP channels (data plane) — `src/vs/platform/agentHost/common/agentService.ts:55-72` (verified directly): `AgentHostIpcChannels { AgentHost='agentHost', Logger='agentHostLogger', ConnectionTracker='agentHostConnectionTracker', Protocol='agentHostProtocol', Management='agentHostManagement', RemoteProxy='agentHostProxy' }` — RemoteProxy "proxies AHP JSON-RPC frames between a renderer and the agent host running on the server. Pairs with `AgentHostIpcChannelTransport` on the renderer side."
- Renderer transport: `src/vs/platform/agentHost/browser/agentHostIpcChannelTransport.ts:37` `export class AgentHostIpcChannelTransport extends Disposable implements IClientTransport` (`call('connect')` / `call('send', frame)`).
- Providers registered in the host process — `src/vs/platform/agentHost/node/agentHostMain.ts:154-185`: `providerService.registerProvider(instantiationService.createInstance(CopilotAgent)); ... registerProvider(... ClaudeAgent ...) ... registerProvider(... CodexAgent ...)` with env/setting gates (`chat.agentHost.claudeAgent.enabled`, `chat.agentHost.codexAgent.enabled` — `agentService.ts:186,196`). Provider IDs `CLAUDE_AGENT_PROVIDER_ID='claude'`, `CODEX_AGENT_PROVIDER_ID='codex'` (`src/vs/platform/agentHost/common/agent.ts:280,283`).
- Subagent fan-out happens INSIDE the agent host: `agent.ts:711-722` `IAgentSpawnChatEvent { session: URI; chat: URI; parent?; title? }`; signals `IAgentSubagentStartedSignal { kind:'subagent_started'; chat; toolCallId; agentName; agentDisplayName; ... }` (`agent.ts:998-1005`).
- AHP state/protocol lives at `src/vs/platform/agentHost/common/state/protocol/` with per-channel dirs: `channels-annotations/ channels-automation/ channels-automation-run/ channels-changeset/ channels-chat/ channels-otlp/ channels-resource-watch/ channels-root/ channels-session/ channels-terminal/` (each with actions/commands/reducer/state.ts). Negative: `src/vs/platform/agentHost/state/protocol/` (without `common/`) does not exist.

## AHP bridge in the reference resolver

`extensions/vscode-test-resolver/src/extension.ts:26` + `:188-195`:
```ts
const agentHostBridgeConnectionTokenEnvironmentVariable = 'VSCODE_AGENT_HOST_BRIDGE_CONNECTION_TOKEN';
...
if (typeof agentHostBridgePort === 'number' && agentHostBridgePort > 0) {
	commandArgs.push('--agent-host-bridge-port', String(agentHostBridgePort));
}
const agentHostBridgeToken = getConfiguration('agentHostBridgeConnectionToken');
if (typeof agentHostBridgeToken === 'string' && agentHostBridgeToken && agentHostBridgeToken) {
	env[agentHostBridgeConnectionTokenEnvironmentVariable] = agentHostBridgeToken;
}
```
(also `src/vs/server/node/serverEnvironmentService.ts:18`, `cli/src/tunnels/code_server.rs:46`).

## pty host: utility process, direct renderer MessagePort, restart capped

- `src/vs/platform/terminal/node/ptyHostService.ts:25-33` — `enum Constants { MaxRestarts = 5 }`; "This service implements IPtyService by launching a pty host process, forwarding messages to and from the pty host process and manages the connection."
- Spawn: `src/vs/platform/terminal/electron-main/electronPtyHostStarter.ts:51-66` — `utilityProcess.start({ type: 'ptyHost', name: 'pty-host', entryPoint: 'vs/platform/terminal/node/ptyHostMain', ... })`.
- Renderer connects DIRECTLY (bypassing shared process for data) — `src/vs/workbench/contrib/terminal/electron-browser/localTerminalBackend.ts:135-146`:
```ts
acquirePort('vscode:createPtyHostMessageChannel', 'vscode:createPtyHostMessageChannelResult').then(port => {
	mark('code/terminal/didConnectPtyHost');
	this._logService.trace('Renderer->PtyHost#connect: connection established');
	...
	const client = store.add(new MessagePortClient(port, `window:${this._nativeHostService.windowId}`));
```

## Shared process: utility process hosting heavy services

`src/vs/platform/sharedProcess/electron-main/sharedProcess.ts:171-178`:
```ts
this.utilityProcess.start({
	type: 'shared-process',
	name: 'shared-process',
	entryPoint: 'vs/code/electron-utility/sharedProcess/sharedProcessMain',
	payload: this.createSharedProcessConfiguration(),
	respondToAuthRequestsFromMainProcess: true,
	execArgv
});
```
Contents (`src/vs/code/electron-utility/sharedProcess/sharedProcessMain.ts`): extension gallery/management/signature verification, checksums, diagnostics, downloads, language packs, storage/log cleanup, remote tunnel, local git, SSH/dev-container/WSL agent hosts, and the **Playwright channel** — `:512-515`:
```ts
// Playwright
const agentNetworkFilterService = this._register(new AgentNetworkFilterService(accessor.get(IConfigurationService)));
const playwrightChannel = this._register(new PlaywrightChannel(this._server, accessor.get(IMainProcessService), accessor.get(ILogService), agentNetworkFilterService, accessor.get(ITelemetryService)));
this._server.registerChannel('playwright', playwrightChannel);
```

## File watcher: its own utility/child process

`src/vs/platform/files/node/watcher/watcherMain.ts:13-21` (verified directly):
```ts
let server: ChildProcessServer<string> | UtilityProcessServer;
if (isUtilityProcess(process)) {
	server = new UtilityProcessServer();
} else {
	server = new ChildProcessServer('watcher');
}

const service = new UniversalWatcher();
server.registerChannel('watcher', ProxyChannel.fromService(service, new DisposableStore()));
```

## Utility-process census (per desktop window/session)

| process | type string | entry point | evidence |
|---|---|---|---|
| extension host (×1 + one per affinity) | `extensionHost` | `vs/workbench/api/node/extensionHostProcess` | extensionHostStarter.ts:105-127 |
| agent host (AHP) | `agentHost` | `vs/platform/agentHost/node/agentHostMain` | electronAgentHostStarter.ts:169-199 |
| pty host | `ptyHost` | `vs/platform/terminal/node/ptyHostMain` | electronPtyHostStarter.ts:59-62 |
| shared process (1 per app) | `shared-process` | `vs/code/electron-utility/sharedProcess/sharedProcessMain` | sharedProcess.ts:171-178 |
| file watcher | (utility or child process) | `watcherMain.ts` | watcherMain.ts:13-21 |
| + pooled generic workers | — | `src/vs/platform/utilityProcess/electron-main/` | UtilityProcessWorkerMainService (app.ts:128-129) |

## Claims supported (→ PERFORMANCE-PLAN §3)

1. Stock desktop already runs: main, renderer(s), gpu, shared-process, pty-host, agent-host (prewarmed at BlockRestore!), 1+ ext hosts, watcher process, per-pane browserView renderers — Flauz memory budgeting starts from THIS baseline.
2. AHP prewarm is a stock startup cost today (BlockRestore contribution) — Flauz must measure its contribution and decide keep/defer (setting-gated providers exist: `chat.agentHost.claudeAgent.enabled`).
3. Subagent fan-out lives inside the agent-host process → client-side connection count stays flat (pooling by construction); RemoteProxy reuses the remote agent connection for server-side hosts.
