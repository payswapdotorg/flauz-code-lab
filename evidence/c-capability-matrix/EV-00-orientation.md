# EV-00 — Orientation & tree map

- **Repo**: `payswapdotorg/Flauz` (pristine mirror of `microsoft/vscode` main)
- **HEAD**: `9bf9ae764da438b1234a8243dc9e47173ef58ee7` — matches TL pin `9bf9ae764da`
- **Commit date**: `2026-09-24 16:22:21 +0000` ("test: cache WSL kernel installer for Windows smoke jobs (#337644)")
- **Clone**: `git clone --depth 1` → 19,182 files, 386 MB on disk. Never built (sandbox discipline).

## 1. Workbench contribution areas (`src/vs/workbench/contrib/`, top-level)

87 entries (verbatim `ls -d */`):

```
accessibility accessibilitySignals agentsVoice authentication bracketPairColorizer2Telemetry browserView
bulkEdit callHierarchy chat codeActions codeEditor commands comments customEditor debug dropOrPasteInto
editSessions editTelemetry emergencyAlert emmet encryption extensions externalTerminal externalUriOpener
files folding format git github imageCarousel inlayHints inlineChat inlineCompletions interactive issue
keybindings keybindingsExport languageDetection languageStatus limitIndicator list localHistory localization
logs markdown markers mcp mergeEditor meteredConnection modernUI multiDiffEditor notebook onboarding opener
outline output performance policyExport preferences processExplorer quickaccess relauncher remote
remoteCodingAgents remoteTunnel replNotebook sash scm scrollLocking search searchEditor share snippets
speech splash surveys tags tasks telemetry terminal terminalContrib testing themes timeline typeHierarchy
update url userDataProfile userDataSync webview webviewPanel webviewView welcomeAgentSessions welcomeBanner
welcomeGettingStarted welcomeOnboarding welcomeViews welcomeWalkthrough workspace workspaces
```

**Agent-era areas that did not exist in pre-2025 VS Code**: `browserView`, `mcp`, `remoteCodingAgents`,
`agentsVoice`, `welcomeAgentSessions`, `meteredConnection`, `editTelemetry`, `imageCarousel`,
`chatEditing`-era chat subtree (below), `remoteAgentHost` (inside chat), `agentSessions` (inside chat).

## 2. Chat contrib subtree (`src/vs/workbench/contrib/chat/browser/`)

```
accessibility actions agentPluginEditor agentSessions aiCustomization attachments chatDebug chatEditing
chatManagement chatSessions chatSetup chatStatus contextContrib expNotification feedbackSurvey
planReviewFeedback promptSyntax promptTimeline remoteAgentHost speechToText telemetry tools viewsWelcome
voiceClient voiceInputMode widget widgetHosts
```

## 3. Extension-host API layer (`src/vs/workbench/api/common/`)

Agent/AI-relevant extHost modules (selection):

```
extHostAgentEditorComments.ts  extHostBrowsers.ts  extHostBrowserTunnelProxy.ts  extHostChatAgents2.ts
extHostChatContext.ts  extHostChatDebug.ts  extHostChatInputNotification.ts  extHostChatOutputRenderer.ts
extHostChatQuota.ts  extHostChatSessions.ts  extHostChatStatus.ts  extHostCodeMapper.ts
extHostEmbedding.ts  extHostEmbeddingVector.ts  extHostLanguageModels.ts  extHostLanguageModelTools.ts
extHostMcp.ts  extHostManagedSockets.ts  extHostDataChannels.ts  extHostMeteredConnection.ts
extHostTerminalShellIntegration.ts  extHostTerminalService.ts  extHostTask.ts  extHostDebugService.ts
extHostSCM.ts  extHostGitExtensionService.ts  extHostSecrets.ts  extHostSecretState.ts  extHostMemento.ts
extHostStorage.ts  extHostTesting.ts  extHostSpeech.ts  extHostTunnelService.ts  extHostWebview*.ts
extHostCustomEditors.ts  extHostTreeViews.ts  extHostTimeline.ts  extHostAuthentication.ts
```

## 4. API definition files moved to `src/vscode-dts/`

The classic `src/vs/vscode.d.ts` no longer exists; the surface lives at:

- `src/vscode-dts/vscode.d.ts` (stable, 21,240 lines at HEAD)
- `src/vscode-dts/vscode.proposed.*.d.ts` (≈190 proposed API files)

Notable proposed files for this audit: `browser`, `remoteCodingAgents`, `resolvers`, `mcpServerDefinitions`,
`mcpToolDefinitions`, `chatSessionsProvider`, `chatSessionCustomizationProvider`, `chatPromptFiles`,
`chatHooks`, `agentSessionsWorkspace`, `agentsWindowActivation`, `agentsWindowConfiguration`,
`languageModelPricing`, `languageModelCapabilities`, `languageModelSystem`, `languageModelThinkingPart`,
`languageModelToolSets`, `languageModelProxy`, `toolInvocationApproveCombination`, `toolProgress`,
`terminalDataWriteEvent`, `terminalDimensions`, `terminalExecuteCommandEvent`, `terminalQuickFixProvider`,
`terminalRemoteResolver`, `terminalShellEnv`, `terminalCompletionProvider`, `scmArtifactProvider`,
`scmHistoryProvider`, `scmMultiDiffEditor`, `dataChannels`, `ipc`, `tunnelFactory`, `tunnels`,
`embeddings`, `editSessionIdentityProvider`, `envIsConnectionMetered`, `environmentPower`,
`workspaceTrust`, `defaultChatParticipant`, `chatContextProvider`, `mappedEditsProvider`.

Stable namespaces in `vscode.d.ts` (line refs): `tasks` 9350, `env` 10742, `commands` 10976, `window` 11072,
`workspace` 13802, `languages` 14727, `notebooks` 16355, `scm` 16657, `debug` 17288, `extensions` 17463,
`authentication` 18096, `l10n` 18197, `tests` 18276, `chat` 20116, `lm` 20738.

## 5. Built-in extensions (`extensions/`, selection)

```
copilot  prompt-basics  git  git-base  github  github-authentication  microsoft-authentication
simple-browser  tunnel-forwarding  terminal-suggest  vscode-test-resolver  media-preview
notebook-renderers  + ~60 language/theme/feature extensions
```

`extensions/copilot/` is a full source checkout (src, test, chat-lib, docs, `LICENSE.txt`, MIT header present)
— the GitHub Copilot Chat extension source is **in-tree** at HEAD.

## 6. Remote & CLI

- `remote/web/` — the web (vscode.dev-style) server.
- `cli/src/` — Rust CLI: `tunnels/`, `tunnels.rs`, `auth.rs`, `self_update.rs`, `singleton.rs`, `state.rs`,
  `desktop.rs`, `commands/`, `rpc.rs`, `msgpack_rpc.rs`, `json_rpc.rs`, `async_pipe.rs`.
  `product.json:16` → `"tunnelApplicationName": "code-tunnel-oss"`, `product.json:14` → `"serverApplicationName": "code-server-oss"`.

## 7. `product.json` (read in full; 249 lines)

Key facts:

- Branding/config fields: `nameShort` "Code - OSS" (line 2), `applicationName` "code-oss" (4),
  `urlProtocol` "code-oss" (37), win32/darwin/linux ids (17–32).
- **No `extensionsGallery` key** — verified `rg -c "extensionsGallery" product.json` → 0 matches (exit 1).
  Marketplace is a build-time product decision, not present in OSS default.
- `defaultChatAgent` (90–157): `extensionId: "GitHub.copilot"`, `chatExtensionId: "GitHub.copilot-chat"`,
  entitlement/quota URLs incl. `api.github.com/copilot_internal/user` (142),
  `generateCommitMessageCommand` (149), `mcpRegistryDataUrl` (155).
- `builtInExtensionsEnabledWithAutoUpdates: ["GitHub.copilot-chat"]` (244–246).
- `sessionsWindowAllowedExtensions: []` (247) — allowlist hook for the agent-sessions window.
- `agentsTelemetryAppName: "agents"` (38); `voiceWsUrl` (248).
- `builtInExtensions` (40–89): js-debug-companion, js-debug 1.140.0, js-profile-table.

## 8. Platform layer of note

`src/vs/platform/agentHost/` exists (see EV-02) — an agent-host platform *below* workbench contribs.
