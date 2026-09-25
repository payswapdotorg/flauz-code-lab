# EV-03 — MCP, tools, approval gates, elicitation

## 1. Stable API (vscode.d.ts)

- `lm.registerMcpServerDefinitionProvider(id, provider)` (20842); package.json contribution
  `mcpServerDefinitionProviders` (doc 20823–20830): editor auto-discovers servers/tools on chat submit.
- `lm.registerTool` (20778) / `lm.tools` (20784) / `lm.invokeTool` (20812) with `toolInvocationToken`
  so "the chat UI shows the tool invocation for the correct conversation" (20794–20796).
- Tool-calling protocol: `LanguageModelChatTool` (20880), `LanguageModelChatToolMode.Auto|Required`
  (20900–20911), `LanguageModelToolCallPart` (20917), `LanguageModelToolResultPart` (20946).

## 2. MCP subsystem (core contrib `src/vs/workbench/contrib/mcp/`)

```
browser/: mcp.contribution.ts  mcp.view.contribution.ts  mcpAddContextContribution.ts  mcpCommands.ts
mcpCommandsAddConfiguration.ts  mcpConfigurationDestination.ts  mcpDiscovery.ts  mcpElicitationService.ts
mcpGatewayService.ts  mcpGatewayToolBrokerContribution.ts  mcpLanguageFeatures.ts  mcpMigration.ts
mcpPromptArgumentPick.ts  mcpResourceQuickAccess.ts  mcpServerActions.ts  mcpServerEditor.ts
mcpServerEditorInput.ts  (+ common/ electron-browser/ node/ test/)
```

→ MCP server editor, discovery, elicitation service, gateway service, language features, quick access.
`extHostMcp.ts` (api/common) is the extension-host bridge.

## 3. MCP gateway for external agent loops (`vscode.proposed.mcpServerDefinitions.d.ts`)

- `lm.mcpServerDefinitions` (57) + `onDidChangeMcpServerDefinitions` (64) — servers from user/workspace
  `mcp.json` **and** extensions.
- `lm.startMcpGateway(chatSessionResource?)` (84) — doc (66–77): gateway "creates a localhost HTTP server
  where each MCP server known to the editor gets its own endpoint. **External processes (such as CLI-based
  agent loops) can connect to these endpoints**…"; with `chatSessionResource`, "MCP tool calls made through
  this gateway will be associated with the chat session, enabling **inline elicitation UI** in the chat
  response" (78–81).

→ Editor-as-MCP-hub for external agents; human-in-the-loop elicitation flows back into chat.

Also: `vscode.proposed.mcpToolDefinitions.d.ts` (extension-defined MCP tools);
`product.json:155` `mcpRegistryDataUrl` (a default MCP registry under `defaultChatAgent`).

## 4. Tool confirmation & risk assessment (core)

`src/vs/workbench/contrib/chat/browser/tools/`:

```
languageModelToolsConfirmationService.ts  chatToolRiskAssessmentService.ts  languageModelToolsService.ts
toolSetsContribution.ts  clientToolSetsContribution.ts  toolResultCompressorService.ts
renameTool.ts  usagesTool.ts  toolHelpers.ts
```

`languageModelToolsConfirmationService.ts`:

- line 18: `import { ConfirmedReason, ToolConfirmKind } from '../../common/chatService/chatService.js';`
- lines 113–119 (policy resolution):
  `{ type: ToolConfirmKind.LmServicePerTool, scope: 'workspace' }` / `scope: 'profile'` / `scope: 'session'`
- line 221: `export class LanguageModelToolsConfirmationService extends Disposable implements ILanguageModelToolsConfirmationService`

→ Per-tool confirmation with session/profile/workspace scoping is core. Companion proposed APIs:
`toolInvocationApproveCombination.d.ts`, `toolProgress.d.ts`, `languageModelToolResultAudience.d.ts`,
`languageModelToolSupportsModel.d.ts`.

## 5. Approval in agent sessions & session status

- `chat/browser/agentSessions/agentSessionApprovalModel.ts` (file).
- `vscode.proposed.chatSessionsProvider.d.ts:10–30`: `ChatSessionStatus { Failed=0, Completed=1,
  InProgress=2, NeedsInput=3 }` — "Needs user input (e.g. an unresolved confirmation)".
- AHP signal: `IAgentToolPendingConfirmationSignal` (EV-02 §2).
- `vscode.proposed.chatHooks.d.ts` exists (hooks into chat flow — pre/post tool, etc.).

## 6. MCP elicitation

`mcp/browser/mcpElicitationService.ts` + gateway doc above → server-initiated requests for
information/confirmation surface in-editor.

## 7. Toolsets

`toolSetsContribution.ts`, `clientToolSetsContribution.ts`, `vscode.proposed.contribLanguageModelToolSets.d.ts`
(`languageModelToolSets` contribution point) — named tool bundles selectable per context/agent.
