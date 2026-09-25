# EV-07 — Remote authority, SSH/containers/tunnels, cloud environments, env switching

## 1. Remote authority resolver API (`vscode.proposed.resolvers.d.ts`)

- `RemoteAuthorityResolverContext` (17–26): `resolveAttempt`, `execServer` — doc: "If the remote
  authority includes nested authorities delimited by `@`, it is resolved from outer to inner authorities
  with ExecServer passed down to each resolver in the chain." → **chained environments** (e.g.
  `container@ssh-host`) are modeled.
- `ResolvedAuthority` (28–34): host/port/connectionToken.
- `ManagedMessagePassing` (36–44) + `ManagedResolvedAuthority` (46–51): resolver can supply the **transport
  itself** (`makeConnection(): Thenable<ManagedMessagePassing>`) — custom cloud sockets without core changes
  (see also `extHostManagedSockets.ts`, proposed `tunnelFactory`/`tunnels`).
- `ResolvedOptions` (53–62): `extensionHostEnv`, `isTrusted`, `authenticationSessionForInitializingExtensions`.
- `workspace.registerRemoteAuthorityResolver(authorityPrefix, resolver)` (line 456).
- `env.appQuality`/`env.appCommit` (70–75).

→ This is the exact API Remote-SSH/Containers/Tunnels-style extensions implement. It is **proposed**;
a distribution enables it for its built-ins without forking (EV-10 §3).

## 2. Reference implementation in-tree: `extensions/vscode-test-resolver/`

`src/extension.ts`: downloads & starts the VS Code server (`downloadAndUnzipVSCodeServer`, line 16),
creates tunnels with features (`getTunnelFeatures()` ~43: elevation, privacy options), simulates
pause/slow networks, and bridges the **Agent Host** over the remote —
`VSCODE_AGENT_HOST_BRIDGE_CONNECTION_TOKEN` environment variable (~line 30) with expected-socket-close
handling for agent-host bridge connections.

→ Blueprint evidence that a Flauz remote/cloud resolver is extension-land work.

## 3. Tunnel serving & web remote

- Rust CLI `cli/src/`: `tunnels/` + `tunnels.rs`, `auth.rs`, `self_update.rs`, `singleton.rs`, `state.rs`,
  `desktop.rs`, `commands/`, `rpc.rs`. Product names: `code-tunnel-oss` (product.json:16),
  `code-server-oss` (14).
- contrib `remoteTunnel/`; `extensions/tunnel-forwarding/`; `remote/web/` (server for web builds).
- Stable: `env.remoteName` (10843), `env.appHost` (10763), workspace tunnel APIs (`extHostTunnelService.ts`).

## 4. Dev containers & agent hosts in platform

- `src/vs/platform/agentHost/common/devContainerAgentHost.ts` (imported as
  `IDevContainerAgentHostMainService`, agentService.ts:21) — dev containers as agent-host environments.
- `devcontainer.json` handling lives with container tooling outside `src/vs` (devcontainers/cli, OSS);
  in-tree test-resolver + `contrib/remote/` (help surfaces: `contribRemoteHelp.d.ts` proposed) cover the UX.

## 5. Cloud sandboxes (E2B-class)

- `chat/browser/remoteAgentHost/cloudSandbox*` (EV-02 §5): session list, credentials refresh, read-only
  sessions, connection customization — Microsoft cloud sandbox bound.
- AHP remoting channel `AgentHostIpcChannels.RemoteProxy` (agentService.ts:66–71) proxies agent-host
  frames from remote servers → **agents can execute where the environment lives**.
- Agent-Host terminals follow the connection (`vscode.agent-host-terminal` profile,
  agentHostTerminalService.ts:60) — terminal/agent continuity across environments.

## 6. Environment switching mid-session

- Remote window model: workspace opens with `authority` (vscode-remote://…); terminals
  (`remoteTerminalBackend.ts`, `remotePty.ts`), file system, extensions, debugger (DAP over remote),
  and agent host (RemoteProxy) all execute **on the remote** — switching local↔remote is a window
  open/reload on the same workspace folder; session continuity via persisted chat sessions (EV-08)
  and `editSessions` contrib (workspace state sync across machines).
- Chained authorities (§1) allow container-inside-ssh style hierarchies without separate windows.
- Seamless *live* migration of a running agent between environments is NOT a built-in flow —
  orchestrator-level work (see matrix row C-34).

## 7. Connection economics

contrib `meteredConnection/` + `vscode.proposed.envIsConnectionMetered.d.ts` +
`api/common/extHostMeteredConnection.ts` — metered-connection awareness for cost-sensitive remote work.
