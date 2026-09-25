# Evidence 02 — Product Boundaries, Gallery Keys, Branding Surface

Tree: payswapdotorg/Flauz @ 9bf9ae764da (see Evidence 01 header).

## 1. product.json — full key inventory (249 lines, read in full)

Identity keys (with lines):
> :2-3   nameShort/nameLong = "Code - OSS"
> :4     applicationName = "code-oss"
> :5-6   dataFolderName ".vscode-oss" / sharedDataFolderName ".vscode-oss-shared"
> :7     win32MutexName "vscodeoss"
> :8-10  licenseName "MIT" / licenseUrl / serverLicenseUrl
> :14-16 serverApplicationName "code-server-oss" / serverDataFolderName / tunnelApplicationName "code-tunnel-oss"
> :17-19 win32DirName "Microsoft Code OSS" / win32NameVersion / win32RegValueName "CodeOSS"
> :20-23 win32x64AppId / win32arm64AppId / win32x64UserAppId / win32arm64UserAppId (GUIDs)
> :24    win32AppUserModelId "Microsoft.CodeOSS"
> :25    win32ShellNameShort "C&ode - OSS"
> :26-27 win32TunnelServiceMutex / win32TunnelMutex
> :28-30 darwinBundleIdentifier "com.visualstudio.code.oss" / darwinProfileUUID / darwinProfilePayloadUUID
> :31-32 linuxDesktopName "com.visualstudio.CodeOSS" / linuxIconName "code-oss"
> :33-34 licenseFileName / reportIssueUrl (→ microsoft/vscode issues)
> :37    urlProtocol "code-oss"
> :38    agentsTelemetryAppName "agents"
> :39    webviewContentExternalBaseUrlTemplate → "https://{{uuid}}.vscode-cdn.net/insider/ef65ac1ba57f…/…"
> :40-89 builtInExtensions: ms-vscode.js-debug-companion 1.1.3 / ms-vscode.js-debug 1.140.0 /
>        ms-vscode.vscode-js-profile-table 1.0.11 (each with sha256 + repo URL + verified-publisher metadata)
> :90-157 defaultChatAgent block (see §3 below)
> :158-168 trustedExtensionAuthAccess: github/github-enterprise → ["GitHub.copilot-chat"];
>        microsoft → ["vscode.github-authentication"]
> :169-243 onboardingKeymaps (6) / onboardingThemes (6)
> :244-246 builtInExtensionsEnabledWithAutoUpdates: ["GitHub.copilot-chat"]
> :247  sessionsWindowAllowedExtensions: []
> :248  voiceWsUrl "wss://falcon-caas.mai.microsoft.com/voice-code/api/v1/realtime/voice"

**NEGATIVE (verified):** no `extensionsGallery` key anywhere in product.json (all 249
lines enumerated above); no telemetry keys (crashReporter/appCenter/tasConfig/
enableTelemetry/enabledTelemetryLevels/settingsSearchUrl/emergencyAlertUrl/aiConfig/
aiGeneratedWorkspaceTrust/updateUrl/quality/downloadUrl all absent — typed surface for
them exists in product.ts §2 below).

## 2. src/vs/base/common/product.ts — typed product surface (473 lines; read :95-306)

> :102 quality? · :115-122 name/applicationName/dataFolder… · :124 builtInExtensions?
> :128-133 downloadUrl? / updateUrl? / webUrl / webEndpointUrlTemplate / webviewContentExternalBaseUrlTemplate / nlsCoreBaseUrl
> :138-139 settingsSearchBuildId / settingsSearchUrl?
> :141-145 tasConfig { endpoint; telemetryEventName; assignmentContextTelemetryPropertyName }
> :147-155 extensionsGallery? { serviceUrl; controlUrl; extensionUrlTemplate; resourceUrlTemplate; nlsBaseUrl; accessSKUs?; accessScopes? }
> :157 agentSdks? { [packageId]: IAgentSdkProductConfig }
> :159-162 copilotVersions { runtime; sdk }
> :164 dictationRuntime
> :166-174 mcpGallery { serviceUrl; itemWebUrl; publisherUrl; supportUrl; privacyPolicyUrl; termsOfServiceUrl; reportUrl }
> :176-177 extensionPublisherOrgs? / trustedExtensionPublishers?
> :179-192 recommendation/tips keys · trustedExtensionUrlPublicKeys · trustedExtensionAuthAccess · trustedMcpAuthAccess · trustedExtensionProtocolHandlers
> :196-199 crashReporter { companyName; productName }
> :201-203 removeTelemetryMachineId / enabledTelemetryLevels / enableTelemetry
> :205-207 aiConfig { ariaKey }
> :209-224 documentation/releaseNotes/keyboardShortcuts/… / reportIssueUrl / reportMarketplaceIssueUrl / licenseUrl / privacyStatementUrl
> :225 showTelemetryOptOut
> :242 appCenter: IAppCenterConfiguration · :356-363 per-OS map
> :246-248 extensionKind / extensionPointExtensionKind / extensionSyncedKeys
> :250 extensionEnabledApiProposals? { [extensionId]: string[] }
> :251-252 extensionUntrustedWorkspaceSupport / extensionVirtualWorkspacesSupport
> :257-259 extensionsForceVersionByQuality / builtInExtensionsEnabledWithAutoUpdates / sessionsWindowAllowedExtensions
> :261-262 msftInternalDomains / linkProtectionTrustedDomains
> :266-268 configurationSync.store / editSessions.store
> :274 aiGeneratedWorkspaceTrust
> :276 defaultChatAgent: IDefaultChatAgent
> :277-280 chatParticipantRegistry / chatSessionRecommendations / emergencyAlertUrl / voiceWsUrl

## 3. defaultChatAgent + protected resources (entitlement coupling)

`product.json:90-157`:
> :91 "extensionId": "GitHub.copilot"
> :92 "chatExtensionId": "GitHub.copilot-chat"
> :95-103 documentationUrl/termsStatementUrl/privacyStatementUrl/skusDocumentationUrl… (aka.ms links)
> :104-125 provider map: default=github, enterprise=github-enterprise, google, apple, microsoft
> :126 providerExtensionId "vscode.github-authentication"
> :128-141 providerScopes incl. ["read:user","user:email","repo","workflow"]
> :142 "entitlementUrl": "https://api.github.com/copilot_internal/user"
> :143 "entitlementSignupLimitedUrl": "https://api.github.com/copilot_internal/subscribe_limited_user"
> :154 "tokenEntitlementUrl": "https://api.github.com/copilot_internal/v2/token"
> :155 "mcpRegistryDataUrl": "https://api.github.com/copilot/mcp_registry"
> :156 "managedSettingsUrl": "https://api.github.com/copilot_internal/managed_settings"

`src/vs/platform/agentHost/common/agent.ts:360-366`:
> export const GITHUB_COPILOT_PROTECTED_RESOURCE: ProtectedResourceMetadata = {
>   resource: 'https://api.github.com', resource_name: 'GitHub Copilot',
>   authorization_servers: ['https://github.com/login/oauth'],
>   scopes_supported: ['read:user', 'user:email'], required: true, };

`src/vs/workbench/contrib/chat/browser/agentSessions/agentHost/agentHostProtectedResourcesService.ts:16-27` (doc comment):
> "whether a session type requires GitHub Copilot sign-in right now: Claude in native
>  mode / Codex on OpenAI advertise the Copilot resource with `required: false`, so they
>  are usable without signing in"

`src/vs/platform/agentHost/common/agentService.ts:179-196` (provider enable/disable):
> :186 AgentHostClaudeAgentEnabledSettingId = 'chat.agentHost.claudeAgent.enabled' ("Defaults to `true`")
> :196 AgentHostCodexAgentEnabledSettingId = 'chat.agentHost.codexAgent.enabled' ("defaults to enabled outside Stable and disabled in Stable")
> :214 AgentHostClaudeSdkRootEnvVar = 'VSCODE_AGENT_HOST_CLAUDE_SDK_ROOT'
> :222/:231 env-var forms of both provider toggles

`src/vs/platform/agentHost/node/agentSdkDownloader.ts` (SDK sourcing):
> :54 "Key under `product.agentSdks` — e.g. `'claude'`, `'codex'`."
> :189-200 resolution order: bare import (dev node_modules) → download from product.agentSds[pkg.id]
> :296 `!!this._productService.agentSdks?.[pkg.id] && resolveSdkTarget(pkg) !== undefined`
> :378-381 error when neither node_modules nor `product.agentSdks.${pkg.id}` configured

## 4. Workspace trust (platform home — Wave-1 path correction)

`src/vs/platform/workspace/common/workspaceTrust.ts`:
> :33 IWorkspaceTrustEnablementService
> :41-62 IWorkspaceTrustManagementService — isWorkspaceTrustForced/isWorkspaceTrusted/
>   setWorkspaceTrust/getUriTrustInfo/setUrisTrust/getTrustedUris/setTrustedUris/
>   addWorkspaceTrustTransitionParticipant/acceptsOutOfWorkspaceFiles
> :77-95 IWorkspaceTrustRequestService — requestOpenFilesTrust/requestResourcesTrust/
>   requestWorkspaceTrust/onDidInitiate* events
(workbench wrapper: `src/vs/workbench/services/workspaces/common/workspaceTrust.ts`)

## 5. Secrets & auth

`src/vs/platform/secrets/common/secrets.ts` — SecretStorage service surface.
`src/vs/platform/encryption/common/encryptionService.ts:15` — `IEncryptionMainService extends IEncryptionService`.
BYOK precedent: `src/vs/platform/agentHost/common/agentHostByokLm.ts`, `agentModelByokMeta.ts`,
setting `chat.agentHost.byokModels.enabled` (agentService.ts:203).

## 6. Proposed-API gating

`src/vs/workbench/services/extensions/common/extensions.ts:330-334`:
> export function checkProposedApiEnabled(extension, proposal): void {
>   if (!isProposedApiEnabled(extension, proposal)) {
>     throw new Error(`Extension '${…}' CANNOT use API proposal: ${proposal}.\n
>       Its package.json#enabledApiProposals-property declares: …\n The missing proposal
>       MUST be added and you must start in extension development mode or use the
>       following command line switch: --enable-proposed-api ${extension.identifier.value}`); } }

## 7. Webview sandbox

`src/vs/workbench/contrib/webview/browser/pre/index.html:1024-1032`:
> const sandboxRules = new Set(['allow-same-origin', 'allow-pointer-lock']);
> sandboxRules.add('allow-scripts');   (conditional)
> sandboxRules.add('allow-downloads'); (conditional)
> sandboxRules.add('allow-forms');     (conditional)
> newFrame.setAttribute('sandbox', Array.from(sandboxRules).join(' '));

## 8. Remote/SSH absence + in-tree remote machinery

**NEGATIVE (verified):** `extensions/` contains no `ms-vscode.remote-ssh` or
`remote-containers`/`devcontainer` directories (97-dir listing; nearest:
`vscode-test-resolver` test resolver, `tunnel-forwarding` MIT).

In-tree remote agent-host substrate (existence receipts, `src/vs/platform/agentHost/common/`):
> sshRemoteAgentHost.ts · sshHostKeyTrust.ts · sshHostKeyPolicy.ts · sshKnownHosts.ts (node)
> devContainerAgentHost.ts · devContainerAgentHostProtocol.ts
> wslRemoteAgentHost.ts · tunnelAgentHost.ts · tunnelAgentHostConnector.ts
> cloudSandboxAgentHost.ts
Resolver API: `src/vscode-dts/vscode.proposed.resolvers.d.ts` (registerRemoteAuthorityResolver).
Workbench contrib: `src/vs/workbench/contrib/chat/browser/remoteAgentHost/` incl.
`cloudSandboxReadOnlySessionHandler.ts` (read-only cloud sessions),
`cloudSandboxAgentHostService.ts`, `remoteAgentHostAuthentication.ts`.
