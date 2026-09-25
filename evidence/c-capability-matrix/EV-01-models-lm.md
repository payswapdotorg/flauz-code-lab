# EV-01 — Models, LM API, model picker, model management

All citations `src/vscode-dts/vscode.d.ts` unless noted. "STABLE" = shipped, non-proposed API.

## 1. Stable Language Model API (`lm` namespace, 20738–20852)

- `lm.onDidChangeChatModels` (20743)
- `lm.selectChatModels(selector?)` (20770) — doc example at 20750: `const models = await vscode.lm.selectChatModels({ family: 'gpt-3.5-turbo' }); ... first.sendRequest(...)`
- `lm.registerTool<T>(name, tool)` (20778) — requires `languageModelTools` contribution in package.json
- `lm.tools` (20784), `lm.invokeTool(name, options, token)` (20812) — doc 20793–20796: pass `toolInvocationToken` from a `ChatRequest` "makes sure the chat UI shows the tool invocation for the correct conversation"
- `lm.registerMcpServerDefinitionProvider(id, provider)` (20842) — with `contributes.mcpServerDefinitionProviders` package.json point (doc 20819–20831)
- `lm.registerLanguageModelChatProvider(vendor, provider)` (20851) — third-party model vendors register chat models (this is how Ollama/local/other-vendor models appear)
- `LanguageModelChat.sendRequest(messages, options?, token?)` (20302) — direct model calls from extensions
- `LanguageModelChatMessage` with `User`/`Assistant` content parts incl. `LanguageModelToolCallPart`, `LanguageModelToolResultPart`, `LanguageModelDataPart` (20145–20187)
- `LanguageModelChatResponse.stream/text` async iterables (20194–20234)

→ **Multi-model, multi-vendor, per-request model choice is STABLE extension API.**

## 2. Stable chat participant API

- `chat.createChatParticipant(id, handler)` (20124) — the only stable `chat` function; participants get `ChatRequest` (with `toolInvocationToken`) and stream `ChatResponsePart`s:
  `ChatResponseMarkdownPart | ChatResponseFileTreePart | ChatResponseAnchorPart | ChatResponseCommandButtonPart` (union at 20107; anchor class 20031) — anchors = citations/references into workspace files.

## 3. Model picker (core UI, `src/vs/workbench/contrib/chat/browser/widget/input/modelPicker/`)

```
modelPickerWidget.ts  modelPickerCard.ts  modelPickerBadges.ts  modelPickerItemSections.ts
modelPickerModelConfig.ts  modelPickerHover.ts  modelPickerTelemetry.ts  modelPickerWelcome.ts
chatModelConfigurationStore.ts (parent input dir)
```

The tabbed/chat-input model picker (per-session model choice) is a **core workbench widget**. Related:
`chat/browser/chatManagement/` (`chatModelsViewModel.ts`, `chatModelsWidget.ts`, `chatManagementEditor.ts`) — model management UI.

## 4. AI asset management surface (`src/vs/workbench/contrib/chat/browser/aiCustomization/`)

File listing (selection; 50+ files):

```
aiCustomizationManagementEditor.ts  aiCustomizationManagementEditorInput.ts  aiCustomizationListWidget.ts
customizationMarketplace.contribution.ts  customizationMarketplaceInstallService.ts
customizationMarketplaceWorkbenchService.ts  customizationCreatorService.ts  customizationCardList.ts
mcpListWidget.ts  pluginListWidget.ts  toolsListWidget.ts  promptsServiceCustomizationItemProvider.ts
embeddedAgentPluginDetail.ts  embeddedExtensionToolsDetail.ts  embeddedMcpServerDetail.ts
aiCustomizationDiscoveryPage.ts  aiCustomizationWorkspaceService.ts  aiCustomizationWelcomePagePromptLaunchers.ts
mcpServerCustomizationMigration.ts  customizationMigration*.ts  mcpServerCount.ts
```

→ Core UI exists for managing models/tools/MCP servers/prompts/agent plugins, incl. install-from-marketplace flows.

## 5. Cost / latency awareness

- `src/vscode-dts/vscode.proposed.languageModelPricing.d.ts` — `LanguageModelChatInformation` + `LanguageModelChatChat` gain: `pricing` ("Free", "$0.01/request"), `inputCost`, `outputCost`, `cacheCost`, `cacheWriteCost`, `longContext*Cost` (lines 15–65), `priceCategory` ("low"…"very_high", 71), `category` ("lightweight"/"versatile"/"powerful", 77). Doc: "Displayed in the model management UI" / "in the model picker hover".
- `vscode.proposed.languageModelCapabilities.d.ts`, `languageModelSystem.d.ts`, `languageModelThinkingPart.d.ts`, `languageModelToolSets.d.ts`, `languageModelProxy.d.ts` exist (file names, `src/vscode-dts/`).
- `extHostChatQuota.ts` (api/common) + `product.json:144–145` quota-exceeded context keys — request-quota accounting exists for the default agent.
- Connection cost: contrib `meteredConnection/` + `vscode.proposed.envIsConnectionMetered.d.ts`.
- Latency: no dedicated per-request latency API found; measurable extension-side around `sendRequest` (negative result — no `latency` field in pricing/capabilities files as read).

## 6. Model picker prerequisites (caveat)

`product.json:90–157` `defaultChatAgent` wires the picker/chat to `GitHub.copilot` / `GitHub.copilot-chat`
(entitlement URLs at 142–143). On a Flauz build, either ship a default chat agent extension or re-point
`defaultChatAgent` — a product.json build-input change, not a code fork.
