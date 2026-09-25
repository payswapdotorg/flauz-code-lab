# EV-04 — Real browser in the workbench + agent browser control + evidence capture

## 1. Core browserView contrib (`src/vs/workbench/contrib/browserView/`)

```
browser/:  browserView.contribution.ts  browserWelcome.ts  media/
common/:   browserEditorInput.ts  browserSearch.ts  browserView.ts  browserZoomService.ts
electron-browser/: browserEditor.ts  browserViewCDPService.ts  browserViewWorkbenchService.ts
                   overlayManager.ts  features/  tools/  widgets/  media/
test/
```

An **integrated, Chromium-backed browser surface inside the workbench** (Electron, `WebContentsView`-based
per `features/webContentsViewRendererFeature.ts`), with search, zoom, and its own editor input type.

### features/ (17 files)

```
browserAutoReloadFeatures.ts  browserDataStorageFeatures.ts  browserDevToolsFeature.ts
browserEditorChatFeatures.ts  browserEditorEmulationFeatures.ts  browserEditorErrorFeatures.ts
browserEditorFindFeature.ts   browserEditorZoomFeature.ts  browserFavoritesFeature.ts
browserHistoryFeature.ts      browserNavigationFeatures.ts  browserPermissionsFeature.ts
browserRemoteFeatures.ts      browserSearchFeatures.ts  browserTabManagementFeatures.ts
browserWelcomeFeature.ts      webContentsViewRendererFeature.ts
```

Note `browserEditorChatFeatures.ts` (chat integration in the browser surface) and
`browserRemoteFeatures.ts` (browser over remotes).

### tools/ (14 files) — the agent browser tool suite

```
browserTools.contribution.ts  browserToolHelpers.ts
navigateBrowserTool.ts  clickBrowserTool.ts  typeBrowserTool.ts  hoverElementTool.ts
dragElementTool.ts  handleDialogBrowserTool.ts  listBrowserPagesTool.ts  openBrowserTool.ts
openBrowserToolNonAgentic.ts  readBrowserTool.ts  runPlaywrightCodeTool.ts  screenshotBrowserTool.ts
```

→ **navigate / click / type / hover / drag / dialog-handling / read / screenshot / list-pages / run
Playwright code** are shipped as core language-model tools. This is exactly the "agent uses a REAL
browser (navigate/click/screenshot)" capability, present in tree at HEAD.

## 2. Extension API for the browser (`vscode.proposed.browser.d.ts`, issue #300319)

- `BrowserTab` (13–28): `url`, `title`, `icon`, **`startCDPSession(): Thenable<BrowserCDPSession>`**, `close()`.
- `BrowserCDPSession` (35–47): `onDidReceiveMessage: Event<unknown>`, `onDidClose`, `sendMessage(message)`,
  `close()` — bidirectional raw CDP.
- `window` additions (64–91): `browserTabs`, `onDidOpenBrowserTab`, `onDidCloseBrowserTab`,
  `activeBrowserTab`, `onDidChangeActiveBrowserTab`, `onDidChangeBrowserTabState`,
  **`openBrowserTab(url, options?)`**.

→ Extensions can open a browser tab in the editor area and drive it via CDP (Page.navigate,
Runtime.evaluate, Input.dispatchMouseEvent, Page.captureScreenshot…). **Proposed API** — a distribution
enables it for trusted built-in extensions without forking (see EV-10 §3).
Supporting extHost files: `api/common/extHostBrowsers.ts`, `extHostBrowserTunnelProxy.ts`.

## 3. Web-build fallback

`extensions/simple-browser/` — webview-based browser preview (iframe; no CDP control). On web/serverless
builds the CDP browser is not available (browserView lives in `electron-browser/`); agent-driven browsing
on web requires an external browser service (e.g. Playwright MCP server) — see EV-03 §3.

## 4. Evidence capture into the workspace

- `screenshotBrowserTool.ts` (above) produces screenshots as tool results.
- Stable `workspace.fs: FileSystem` (vscode.d.ts:13810) + `workspace.openTextDocument`/`showTextDocument`
  allow writing/linking artifacts.
- Chat citations: `ChatResponseAnchorPart` (20031) and response-part union (20107) — clickable references
  to URIs/ranges in chat turns.
- `src/vs/workbench/contrib/imageCarousel/` — image carousel contrib for rich media display.
- AHP debug-log artifacts (EV-02 §4 refs): `IAgentHostDebugLogsArtifact` streaming (agentService.ts:87–108)
  — evidence-bundling precedent in the agent host.
