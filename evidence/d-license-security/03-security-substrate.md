# Evidence 03 — Security Substrate: Agent Host, Confirmations, Risk, Sandbox

Tree: payswapdotorg/Flauz @ 9bf9ae764da (see Evidence 01 header).

## 1. AHP permission engine (SessionPermissionManager)

`src/vs/platform/agentHost/node/sessionPermissions.ts` (read :1-260):
> :47-55 IToolApprovalEvent { toolCallId, session, permissionKind?, permissionPath?,
>         toolInput?, requestSandboxBypass?, shellLanguage? }
> :60-67 CONFIRMATION_OPTIONS = Allow-in-this-Session / Allow-Once / Skip (grouped)
> :68 MANAGED_CONFIRMATION_OPTIONS = [Allow-Once, Skip] (managed settings strip session-grants)
> :69 SANDBOX_BYPASS_META_KEY = 'agentHost.sandboxBypass'
> :66-77 PLATFORM_RESTRICTED_DIRS = Windows %APPDATA%/%LOCALAPPDATA%, macOS ~/Library
>         ("Writes under these require confirmation unless the working directory itself
>          lives inside the restricted directory")
> :90-145 assertPathIsSafe — null bytes; NTFS Alternate-Data-Stream colon check; invalid
>         filename chars; `\\\\.` / `\\\\?` device paths; CON/PRN/AUX/NUL/COM[1-9]/LPT[1-9]
>         reserved names; trailing dot/space; 8.3 short-name (`~`+digit) detection
> :149-181 resolveRealPathForNonexistent — walks existing ancestors so symlinked parents
>         are followed for not-yet-created files
> :183-209 class SessionPermissionManager — "Single entry point for all tool-call
>         approval logic in the agent host"; initialize() loads tree-sitter WASM
> :238-244 ordered-checks doc comment; :246 getAutoApproval — evaluation order:
>         "1. Global auto-approve setting (`chat.tools.global.autoApprove`) 2. Session-level
>          bypass (`autoApprove`) 3. Per-tool session permissions (`permissions.allow`)
>          4. Read path rules (within working directory) 5. Write path rules (within working
>          directory + glob patterns) 6. Shell command rules (tree-sitter parsed, default
>          allow/deny)"
> :246 getAutoApproval signature; :257-261 "0. Sandbox bypass: a shell command that
>          opted out of the sandbox (`requestSandboxBypass`) escapes the sandbox's
>          containment." → `return undefined` (no auto-approval) ⇒ confirmation path

`src/vs/platform/agentHost/common/agent.ts:952-972` (IAgentToolPendingConfirmationSignal):
> :952-959 interface … permissionKind?: 'shell' | 'write' | 'mcp' | 'read' | 'url' |
>         'skill' | 'custom-tool' | 'hook' | 'memory' | 'factory' | 'extension-management' |
>         'extension-permission-access' | 'extension-env-access'
> :963-966 managedApprovalRequired — "the runtime currently sets it for managed Shell,
>         Read, Edit, and Domain selector asks"
> :966-972 requestSandboxBypass — "the model requested this shell command run OUTSIDE the
>         sandbox (and the host opted in via `sandbox.allowBypass`)"

## 2. Workbench confirmation service (three scopes + combination + server levels)

`src/vs/workbench/contrib/chat/browser/tools/languageModelToolsConfirmationService.ts`:
> :27 combination auto-confirm entries exist ("Represents an auto-confirmation entry in
>    the confirm store")
> :113-119 checkAutoConfirmation returns LmServicePerTool with scope
>    'workspace' | 'profile' | 'session' (workspace store → profile store → memory map)
> :221 class LanguageModelToolsConfirmationService
> :266-274 check order: combination-level → tool-level → server-level (MCP)
> :310-316 (second path) tool-level → server-level
> :351-370 "Allow this particular combination of tool and arguments" — session/workspace/
>    "Always" (globally) variants
> :384-403 "Allow this tool to run … in this session / in this workspace / Always"
> :418-437 "Allow all tools from this server …" (MCP server level)
> :472-516 result-POSTING confirmations ("Allow results from this tool to be sent without
>    confirmation" × session/workspace/globally; server variants :506-516)

`src/vs/workbench/contrib/chat/common/chatService/chatService.ts:847-861`:
> 847 export const enum ToolConfirmKind { Denied, ConfirmationNotNeeded, Setting,
>    LmServicePerTool, UserAction, Skipped }
> 856 export type ConfirmedReason = { type: ToolConfirmKind.Denied } | … | { type:
>    ToolConfirmKind.LmServicePerTool; scope: 'session' | 'workspace' | 'profile' } | …

## 3. Tool risk assessment

`src/vs/workbench/contrib/chat/browser/tools/chatToolRiskAssessmentService.ts`:
> :19-23 ToolRiskLevel { Green='green', Orange='orange', Red='red' }
> :25-29 IToolRiskAssessment { risk; explanation ≤140 chars }
> :36-39 service surface + ToolRiskPromptKind = 'terminal' | 'generic'
> :41-43 "options.ignoreEnablement (used by the Autopilot risk gate)"
> :58 class ChatToolRiskAssessmentService — LRU cache 200, in-flight dedup
> :76-78 isEnabled(): `getValue(ChatConfiguration.ToolRiskAssessmentEnabled) !== false`
> :70-71 MAX_PARAM_BYTES 2000, CACHE_SIZE 200

## 4. Sandbox policy floor

`src/vs/platform/agentHost/node/sessionSandbox.ts`:
> :15-17 ISessionSandboxPolicy { enabled; allowBypass? } —
>    "A projection of the runtime's resolved sandbox floor, never a policy parser."
> :28-44 getSessionSandboxOverrides — policy floor from
>    `configuration.getSessionSandboxPolicy(session)`; session selection 'on'/'off';
>    allowUnsandboxedCommands = policy?.allowBypass === true
> imports `AgentSandboxEnabledValue` from `src/vs/platform/sandbox/common/settings.js`
> and `AgentHostSandboxKey` from `sandboxConfigSchema.js` (which imports
> `AgentNetworkDomainSettingId` from networkFilter settings — sandbox+network config kinship)

## 5. Steering signals

`src/vs/platform/agentHost/common/agent.ts`:
> :884 (signal union includes IAgentSubagentCompletedSignal … IAgentSteeringConsumedSignal)
> :1063-1068 /** A steering message was consumed (sent to the model). */
>    interface IAgentSteeringConsumedSignal { kind: 'steering_consumed'; chat: URI; id: string }
> :1247-1248 "Optional steering hook for providers that can accept messages during an
>    active turn." setPendingMessages?(chat, steeringMessage, queuedMessages, sender)

## 6. Agent-host process/infra existence receipts

`src/vs/platform/agentHost/node/`: agentHostMain.ts, agentHostServerMain.ts,
nodeAgentHostStarter.ts (process bootstrap); sessionDatabase.ts, sessionDataService.ts
(persistence); agentHostLockfile.ts (exclusive ownership); agentHostHeadlessTerminal.ts;
osc633Parser.ts (terminal output protocol); agentHostToolCallTracker.ts;
commandAutoApprover.ts (tree-sitter WASM shell parsing); agentHostPeerChatStore.ts +
agentPeerChats.ts (peer chats); agentMerge.ts / agentMergeController.ts (agent merges);
agentSdkDownloader.ts (runtime SDK download); sshKnownHosts/sshHostKeyTrust/sshHostKeyPolicy
(host-key pinning); devContainerAgentHostService.ts; cloudSandbox*, ssh*, wsl*, tunnel*
remote hosts.

`src/vs/platform/agentHost/common/state/protocol/` — typed channels:
channels-chat, channels-terminal, channels-resource-watch, channels-changeset,
channels-automation, channels-automation-run, channels-otlp, channels-root,
channels-session + state.ts, commands.ts, messages.ts, actions.ts, notifications.ts.

`src/vs/sessions/` — sessions subsystem with contribs incl. `policyBlocked/`,
`blockedSessions/`, `browserView/`, `automations/`; docs LAYERS.md, SESSIONS.md, MOBILE.md.

## 7. Endpoint license agreement plumbing

See Evidence 01 §4 (licenseAgreement.ts ×2) — build-time injection; OSS values undefined.

## 8. Telemetry-with-boundaries receipts

`src/vs/platform/agentHost/node/agentHostRestrictedTelemetry.ts` (restricted telemetry
exists), `agentHostMicrosoftTelemetry.ts` (MS-specific channel),
`src/vs/base/common/product.ts:201` removeTelemetryMachineId,
`product.json:38` agentsTelemetryAppName "agents".
