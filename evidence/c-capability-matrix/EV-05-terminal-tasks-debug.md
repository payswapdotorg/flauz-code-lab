# EV-05 — Terminal (incl. agent-driven), tasks, debug, notebooks

## 1. Interactive terminal — core

`src/vs/workbench/contrib/terminal/` (full stack: `terminalService`, `terminalInstance`, `terminalGroup`,
`terminalEditor*`, xterm addon layer, profiles, `localTerminalBackend`/`remoteTerminalBackend`,
environment-variable mutability, split panes, persistent terminal processes via `terminalEditingService`).
Shell-integration scripts shipped in `terminal/common/scripts/`: `shellIntegration-bash.sh`,
`shellIntegration-{login,rc,profile,env}.zsh`, `shellIntegration.fish`, `shellIntegration.ps1` (+ PSReadLine).

## 2. Agent-driven terminal — STABLE API (vscode.d.ts)

- `Terminal.shellIntegration: TerminalShellIntegration | undefined` (7721)
- `TerminalShellIntegration.executeCommand(commandLine: string)` (7885) and
  `executeCommand(executable: string, args: string[])` (7941)
- `TerminalShellExecution` (7947): `commandLine` w/ confidence (7972, 8002–8024), output stream — doc at
  7986: "…to not miss any data" (read via `execution.read()`), exit code on end
- `window.onDidChangeTerminalShellIntegration` (11198), `window.onDidStartTerminalShellExecution` (11205),
  `window.onDidEndTerminalShellExecution` (11212)
- Terminal creation: `window.createTerminal` (stable; options incl. `cwd`, `env`, `location`, and
  `useShellIntegration` semantics via profile); pseudoterminals via `ExtensionTerminal`.

Proposed additions (`src/vscode-dts/`): `terminalDataWriteEvent` (raw stream), `terminalDimensions`,
`terminalExecuteCommandEvent`, `terminalQuickFixProvider`, `terminalSelection`, `terminalShellEnv`,
`terminalTitle`, `terminalRemoteResolver`, `terminalCompletionProvider` (+ `extensions/terminal-suggest`).

## 3. Agent-Host terminals (core, agent-era)

`src/vs/workbench/contrib/terminal/browser/`:

- `agentHostTerminalService.ts` — `IAgentHostTerminalService` (62), profiles observable (68);
  `IAgentHostTerminalCreateOptions` (21–28: name/cwd/location); `IAgentHostEntry` (30–37) wraps
  `IAgentConnection` from `platform/agentHost/common/agentService.js` (line 11); profile extension id
  `'vscode.agent-host-terminal'` (60).
- `agentHostPty.ts`, `agentHostOutputChannel.ts`, `ahpTerminalCommandSource.ts`,
  `chatTerminalCommandMirror.ts` (chat↔terminal command mirroring), `terminalTabsChatEntry.ts`.
- Tests: `agentHostPty.test.ts`, `agentHostTerminalService.test.ts`, `chatTerminalCommandMirror.test.ts`.

→ Terminals can be backed by an **agent host connection** (incl. remote/cloud), not just local/remote ptys.

## 4. Tasks — STABLE API

`tasks` namespace (9350): `registerTaskProvider` (9359), `fetchTasks` (9369), `executeTask` (9382),
`taskExecutions` (9387), `onDidStartTask`/`onDidEndTask` (9392/9397), process events (9404/9411).
`tasks.json` autodetect (npm/scripts) + `TaskProvider` for custom task sources → agent-runnable build/test
steps. Proposed: `taskExecutionTerminal`, `taskPresentationGroup`, `taskProblemMatcherStatus`, `taskRunOptions`.

## 5. Debug — STABLE API (agent-driven capable)

`debug` namespace (17288): `onDidChangeActiveDebugSession` (17313), `onDidStartDebugSession` (17318),
**`onDidReceiveDebugSessionCustomEvent`** (17323), `onDidTerminateDebugSession` (17328),
`onDidChangeBreakpoints` (17333), `activeStackItem`/`onDidChangeActiveStackItem` (17341/17346),
`registerDebugConfigurationProvider` (17362), **`registerDebugAdapterDescriptorFactory`** (17373),
**`registerDebugAdapterTrackerFactory`** (17382), **`startDebugging`** (17395), `stopDebugging` (17403),
**`addBreakpoints`/`removeBreakpoints`** (17409/17415), `asDebugSourceUri` (17428).

→ An extension can launch sessions, set breakpoints, observe DAP events (via trackers/custom events),
and read the active stack item. Rich variable/evaluate introspection for agents is available through a
custom DebugAdapterTracker (DAP traffic) — deep introspection beyond events = custom adapter work.
Built-in `ms-vscode.js-debug` 1.140.0 is a `product.json` builtInExtension (58–71).

## 6. Notebooks / REPL

- `notebooks` stable namespace (16355); contrib `notebook/` (kernels, execution state, renderers,
  diff, web worker services), `interactive/` + `replNotebook/` (REPL notebooks), `extensions/ipynb`,
  `extensions/notebook-renderers`.
- Notebook execution is agent-accessible via commands + kernel APIs (`vscode.commands.executeCommand('notebook.execute')`,
  notebook controllers API).

## 7. External terminal & process surfaces

contrib `externalTerminal/`; `processExplorer/` contrib for process inspection.
