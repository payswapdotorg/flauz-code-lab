# EV-02 — Agent Host Platform (AHP), agent sessions, subagents, steering, changesets

`src/vs/platform/agentHost/common/agentService.ts` (1,259 lines) is the IPC contract between workbench
clients and a dedicated **agent host process**. Quotes below are verbatim with line refs.

## 1. Built-in agent providers (line 29 imports; 46–51 re-exports)

```ts
import { type AgentProvider, CLAUDE_AGENT_PROVIDER_ID, CODEX_AGENT_PROVIDER_ID, ... } from './agent.js';
```

```ts
export {
        AgentSession, CLAUDE_AGENT_PROVIDER_ID, CODEX_AGENT_PROVIDER_ID, GITHUB_COPILOT_PROTECTED_RESOURCE,
        GITHUB_REPO_PROTECTED_RESOURCE, protectedResourcesRequireGitHubCopilotSignIn, resolveAgentChatContext,
        resolveAgentChatOrigin, resolveSubagentChatParent, resolveAgentHostCustomizations, subagentChatTitle,
        SubagentChatSignal,
} from './agent.js';
```

→ **Claude and Codex are first-class built-in agent providers.** Copilot-linked resources are gated by
`protectedResourcesRequireGitHubCopilotSignIn` (licensing-relevant).

## 2. Provider/session model (re-exported types, 33–45)

`IAgent`, `IAgentChats`, `IAgentCreateChatOptions`, `IAgentCreateChatResult`, `IAgentSessionMetadata`,
`IAgentSpawnedChatParent`, `IAgentSpawnChatEvent`, `IAgentChatDataChange`, `IAgentModelInfo`,
`AgentSignal`, `IAgentActionSignal`, **`IAgentToolPendingConfirmationSignal`**,
**`IAgentSubagentStartedSignal`**, **`IAgentSubagentResumedSignal`**, **`IAgentSubagentCompletedSignal`**,
**`IAgentSteeringConsumedSignal`**, `IMcpNotification`, `AgentProvider`, `IAgentCapabilities`,
`IAgentDescriptor`, `AuthenticateParams/Result`, `IAgentHostNetworkEndpoint`.

→ Subagents, mid-run **steering**, tool-confirmation, model info per agent, MCP notifications: all modeled
in the platform protocol.

## 3. Changesets & automations (imports, 21–25)

```ts
import type { InvokeChangesetOperationParams, InvokeChangesetOperationResult } from './state/protocol/channels-changeset/commands.js';
import type { FetchAutomationRunsParams, FetchAutomationRunsResult, ListAutomationTriggerDefinitionsParams, ListAutomationTriggerDefinitionsResult, RunAutomationParams, RunAutomationResult } from './state/protocol/channels-automation/commands.js';
```

→ The AHP protocol has **changeset operations** and **automation trigger definitions / runs** — i.e. saved,
re-runnable agent workflows are a protocol concept.

## 4. Remote agent host & resource protocol (imports 27–28; IPC 55–72)

- `ResourceRead/Write/List/Move/Delete/Mkdir/Copy/Resolve` + `ResourceWatchState`, `IStateSnapshot`,
  `RootState` — a full file-resource protocol against the agent host.
- `AgentHostIpcChannels`: `AgentHost`, `Logger`, `ConnectionTracker`, `Protocol` (raw AHP frames over
  MessagePort), `Management`, **`RemoteProxy`** — doc (66–71): "Channel registered by the remote server
  that proxies AHP JSON-RPC frames between a renderer and the agent host running on the server."
  → Agent host follows the remote; agents can run server-side.

## 5. Dev containers & cloud sandboxes

- `import type { IDevContainerAgentHostMainService } from './devContainerAgentHost.js'` (line 21) —
  **dev containers as agent hosts** exist in platform.
- `src/vs/workbench/contrib/chat/browser/remoteAgentHost/`:

```
cloudSandboxAgentHostService.ts  cloudSandboxApiService.ts  cloudSandboxConnectionCustomization.ts
cloudSandboxCredentialRefresh.ts  cloudSandboxLegacySessionPreparation.ts
cloudSandboxReadOnlySessionHandler.ts  cloudSandboxSessionContribution.ts
cloudSandboxSessionListController.ts  cloudSandboxTelemetry.ts  editorCloudSandboxContribution.ts
remoteAgentHost.contribution.ts  remoteAgentHostAuthentication.ts  remoteAgentHostChatContribution.ts
remoteAgentHostConnectionCustomization.ts  remoteAgentHostCustomizationHarness.ts
remoteAgentHostLogForwarder.ts
```

→ A **cloud sandbox** agent-host experience (sessions list, credentials, read-only sessions, telemetry)
is in core. Provider is Microsoft-bound (Copilot entitlements — see auth/credential files); wiring an
independent sandbox (E2B-style) = new contribution work, not deep core surgery.

## 6. Agent sessions UI (`src/vs/workbench/contrib/chat/browser/agentSessions/`)

```
agentHost/  agentSessionApprovalModel.ts  agentSessionHoverWidget.ts  agentSessions.contribution.ts
agentSessions.ts  agentSessionsActions.ts  agentSessionsBanner.ts  agentSessionsControl.ts
agentSessionsFilter.ts  agentSessionsModel.ts  agentSessionsOpener.ts  agentSessionsPicker.ts
agentSessionsService.ts  agentSessionsViewer.ts  experiments  externalSessionsFilterMenu.ts
localAgentSessionsController.ts  media  repositoryPicker.ts  sessionSummaryHover.ts
sessionSummaryHoverService.ts  sessionTypeAvailability.ts
```

→ Session list/viewer with **approval model**, filters, repo picker, local-session controller, summaries.

## 7. Agent-sessions *window* (dedicated agent surface)

- `src/vscode-dts/vscode.proposed.agentSessionsWorkspace.d.ts:16` — `workspace.isAgentSessionsWorkspace`:
  "a special workspace used for AI agent interactions where the window is dedicated to agent session management."
- Companions: `vscode.proposed.agentsWindowActivation.d.ts`, `agentsWindowConfiguration.d.ts`,
  `vscode.proposed.agentEditorComments.d.ts` (+ `extHostAgentEditorComments.ts`).
- `product.json:247` `sessionsWindowAllowedExtensions: []` — product-level allowlist for that window.
- `src/vs/workbench/contrib/welcomeAgentSessions/browser/agentSessionsWelcome.contribution.ts:29–45` —
  registers editor pane "Agent Sessions Welcome" (`workbench.editors.agentSessionsWelcomeInput`) with
  serializer; imports `IChatEntitlementService` (line 26).

## 8. Edit-tracked changesets (`src/vs/workbench/contrib/chat/browser/chatEditing/`)

```
chatEditingSession.ts  chatEditingServiceImpl.ts  chatEditingSessionStorage.ts
chatEditingCheckpointTimeline.ts(+Impl)  chatEditingModifiedFileEntry.ts  chatEditingModifiedDocumentEntry.ts
chatEditingModifiedNotebookEntry.ts  chatEditingDeletedFileEntry.ts  chatEditingOperations.ts
chatEditingCodeEditorIntegration.ts  chatEditingEditorOverlay.ts  chatEditingEditorActions.ts
chatEditingEditorAccessibility.ts  chatEditingExplanationModelManager.ts  chatEditingExplanationWidget.ts
chatEditingTextModelChangeService.ts  chatEditingTextModelContentProviders.ts  chatEditingActions.ts
```

→ Core "agent edit session": per-file entries (document/notebook/deleted), **checkpoint timeline**
(undo/restore points), stored sessions, editor overlays, explanations, accessibility.

Supporting telemetry: `src/vs/workbench/contrib/editTelemetry/browser/telemetry/agentHostEditMarkerService.ts`
(edits attributable to agent host), `aiEditTelemetryService`, `aiStatsFeature` (edit-stats chart/status bar).

## 9. External CLI coding agents

`src/vs/workbench/contrib/remoteCodingAgents/common/remoteCodingAgentsService.ts:13–27`:

```ts
export interface IRemoteCodingAgent {
        id: string;
        command: string;
        displayName: string;
        description?: string;
        followUpRegex?: string;
        when?: string;
}
export interface IRemoteCodingAgentsService { getRegisteredAgents(); getAvailableAgents(); registerAgent(agent); }
```

→ Extensions can register external CLI agents (command + output regex) surfaced in chat.
`vscode.proposed.remoteCodingAgents.d.ts` is an "empty placeholder for coding agent contribution point
from core" (lines 6–8) — extension API for this not yet shaped.
