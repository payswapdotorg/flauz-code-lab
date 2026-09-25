# EV-10 — Ecosystem, product identity, proposed-API posture, a11y, i18n

## 1. Marketplace posture

- `product.json` has **no `extensionsGallery`** (rg count = 0; EV-00 §7). OSS builds ship
  marketplace-neutral; the gallery is a build-input (VSCodium/Open VSX precedent).
- `builtInExtensions` (product.json:40–89) are pinned by SHA256 (js-debug etc.);
  `builtInExtensionsEnabledWithAutoUpdates: ["GitHub.copilot-chat"]` (244–246).
- `extensions/copilot/` is in-tree source (EV-00 §5) with MIT `LICENSE.txt` — auditable/forkable
  reference chat agent. Entitlement coupling: `product.json:90–157` (defaultChatAgent URLs,
  `api.github.com/copilot_internal/*`) + `GITHUB_COPILOT_PROTECTED_RESOURCE`,
  `protectedResourcesRequireGitHubCopilotSignIn` (agentService.ts re-exports 47–51) +
  `IChatEntitlementService` (welcomeAgentSessions contribution:26).

## 2. Product identity = build config, not fork

`product.json` fields cover: `nameShort/nameLong` (2–3), `applicationName` (4), `dataFolderName` (5),
`win32*` ids (17–27), `darwinBundleIdentifier` (28), `linuxDesktopName/linuxIconName` (31–32),
`urlProtocol` (37), `serverApplicationName`/`serverDataFolderName` (14–15), `tunnelApplicationName` (16).
No `src/vs` edit required for identity/branding at this level.

## 3. Proposed-API posture (meta-capability)

- ~190 `vscode.proposed.*.d.ts` files (EV-00 §4). Proposed APIs are enabled per-extension
  (`--enable-proposed-api` / product config) — the mechanism VS Code itself uses for built-ins.
- Consequence for Flauz: **browser.d.ts, resolvers.d.ts, mcpServerDefinitions.d.ts,
  chatSessionsProvider.d.ts, languageModelPricing.d.ts etc. are usable by Flauz trusted built-in
  extensions without touching `src/vs`** — at the cost of tracking upstream API churn (these APIs
  are unstable by contract).
- Stable-vs-proposed splits verified in this audit: `lm`/`chat`/`terminal shell integration`/
  `tasks`/`debug`/`scm core`/`authentication`/`l10n`/`notebooks`/`tests` = stable;
  browser, resolvers, MCP gateway/tool-defs, chat sessions providers, pricing, agent-sessions window,
  terminal raw-stream = proposed.

## 4. Accessibility

- contribs: `accessibility/`, `accessibilitySignals/`; per-feature a11y: `searchAccessibilityHelp.ts`,
  `commentsAccessibility.ts`, `chatEditingEditorAccessibility.ts`, `diffEditorAccessibilityHelp.ts`,
  `editorFindAccessibilityHelp.ts`, `webviewFindAccessibilityHelp.ts`, `chat/browser/accessibility/`.
- `mcp/browser` + tools surfaces come with a11y-reviewed chat widgets; keyboard-first command palette,
  accessible views, screen-reader announcements are baseline VS Code behavior. (No regression risk
  identified by adopting the base.)

## 5. i18n / localization

- Stable `l10n` namespace (18197): `t()` overloads (18212/18228/18237), `bundle` (18261), `uri` (18267).
- contrib `localization/` (common/browser/electron-browser, `minimalTranslations.ts`), language packs are
  extensions (Open VSX distributes `vscode-language-pack-*`).

## 6. Cross-extension messaging substrate

- Proposed `dataChannels.d.ts`: `env.getDataChannel<T>(channelId)` → `DataChannel<T>` with
  `onDidReceiveData` (lines 9–18); proposed `ipc.d.ts`; `extHostDataChannels.ts` in api/common.
- AHP `IAgentSpawnChatEvent`/subagent signals (EV-02) cover agent-level message passing for AHP agents.
- No stable participant-to-participant chat messaging API (negative; see EV-11).

## 7. Telemetry & updates

- contrib `telemetry/`, `update/` (update feed URLs are product.json inputs);
  `agentsTelemetryAppName: "agents"` (product.json:38); `policyExport/` for managed settings.
- Emergency: contrib `emergencyAlert/` (server-pushable alerts).

## 8. Voice / speech

- contrib `speech/`, `agentsVoice/`, `chat/browser/voiceClient/`, `voiceInputMode/`, `speechToText/`;
  proposed `speech.d.ts`; `product.json:248` `voiceWsUrl` (first-party voice WS).
  Editor dictation: `codeEditor/browser/dictation/`.
