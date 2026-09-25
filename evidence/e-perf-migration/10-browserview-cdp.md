# Evidence 10 — browserView/CDP: tool suite, WebContentsView engine, session partitions, Playwright backend

Tree: payswapdotorg/Flauz @ 9bf9ae764da. Quotes verbatim (2-d bundle + direct grep).

## Agent browser tool suite (registered as language-model tools)

`src/vs/workbench/contrib/browserView/electron-browser/tools/`:

| file | tool id |
|---|---|
| openBrowserTool.ts | `open_browser_page` |
| openBrowserToolNonAgentic.ts | `open_browser_page` (narrowed clone) |
| navigateBrowserTool.ts | `navigate_page` |
| readBrowserTool.ts | `read_page` |
| screenshotBrowserTool.ts | `screenshot_page` |
| clickBrowserTool.ts | `click_element` |
| hoverElementTool.ts | `hover_element` |
| dragElementTool.ts | `drag_element` |
| typeBrowserTool.ts | `type_in_page` |
| runPlaywrightCodeTool.ts | `run_playwright_code` |
| handleDialogBrowserTool.ts | `handle_dialog` |
| listBrowserPagesTool.ts | `list_browser_pages` |

Registration — `tools/browserTools.contribution.ts:92-95` (via `ILanguageModelToolsService.registerTool`), contribution at `:167` `registerWorkbenchContribution2(..., WorkbenchPhase.AfterRestored)`:
```ts
this._toolsStore.add(this.toolsService.registerTool(OpenBrowserToolData, this.instantiationService.createInstance(OpenBrowserTool)));
this._toolsStore.add(this.toolsService.registerTool(ReadBrowserToolData, this.instantiationService.createInstance(ReadBrowserTool)));
this._toolsStore.add(this.toolsService.registerTool(ScreenshotBrowserToolData, this.instantiationService.createInstance(ScreenshotBrowserTool)));
this._toolsStore.add(this.toolsService.registerTool(NavigateBrowserToolData, this.instantiationService.createInstance(NavigateBrowserTool)));
```
Tool shape (navigate) — `navigateBrowserTool.ts:19-26, 54-60`:
```ts
export const NavigateBrowserToolData: IToolData = {
	id: 'navigate_page',
	toolReferenceName: BrowserChatToolReferenceName.NavigatePage,
	displayName: localize('navigateBrowserTool.displayName', 'Navigate Page'),
	...
	source: ToolDataSource.Internal,
```
```ts
export class NavigateBrowserTool implements IToolImpl {
	constructor(
		@IPlaywrightService private readonly playwrightService: IPlaywrightService,
		@IAgentNetworkFilterService private readonly agentNetworkFilterService: IAgentNetworkFilterService,
		@IBrowserViewWorkbenchService private readonly browserViewService: IBrowserViewWorkbenchService,
		@IRemoteExplorerService private readonly remoteExplorerService: IRemoteExplorerService,
```
Call path: `navigateBrowserTool.ts:152-154` → `playwrightInvoke(...)` → `browserToolHelpers.ts:162-171` (`playwrightService.invokeFunction(sessionId, pageId, fn.toString(), args)`) → `playwrightService.ts:158` `void group.sendCDPMessage(message);` → main-process raw CDP (`browserViewDebugger.ts:92` `Target.attachToTarget`).

## WebContentsView engine (main process) + sandboxed prefs + session partitions

`src/vs/platform/browserView/electron-main/browserView.ts:141-162` (verified directly):
```ts
		const webPreferences: Electron.WebPreferences = {
			...options?.webPreferences,
			nodeIntegration: false,
			contextIsolation: true,
			sandbox: true,
			...
			webviewTag: false,
			session: this.session.electronSession,
			focusOnNavigation: false
		};

		this._view = new WebContentsView({
			webPreferences,
			// Passing an `undefined` webContents triggers an error in Electron.
			...(options?.webContents ? { webContents: options.webContents } : {})
```
Partition taxonomy — `src/vs/platform/browserView/electron-main/browserSession.ts:134-179`:
```ts
	static getOrCreateGlobal(instantiationService: IInstantiationService): BrowserSession {
		const electronSession = session.fromPartition('persist:vscode-browser');
```
```ts
	const identityHash = createHash('sha256').update(identity).digest('hex');
	const electronSession = session.fromPartition(`vscode-browser-agent-${identityHash}`);
	return BrowserSession._bySession.get(electronSession)
		?? instantiationService.createInstance(BrowserSession, `agent:${identityHash}`, electronSession, BrowserViewStorageScope.Agent);
```
(also `:145` `session.fromPath(storage.fsPath)` workspace-scope; `:159` ephemeral `vscode-browser-${type}${viewId}`.)

## Overlay/z-order + workbench surface

- `src/vs/workbench/contrib/browserView/electron-browser/overlayManager.ts:60-74` — `IBrowserOverlayManager` "Get overlays overlapping with the given element" (tracks workbench DOM overlays so the native view avoids them).
- Renderer feature: `electron-browser/features/webContentsViewRendererFeature.ts` ("Default browser renderer: drives a Chromium WebContentsView"); `browserEditor.ts` (browser as editor surface); `widgets/browserUrlBarWidget.ts` (omnibox widget).

## Playwright backend runs in the SHARED process, driving the in-app WebContentsView group over CDP

`src/vs/platform/browserView/node/playwrightService.ts:51-64`:
```ts
/**
 * Shared-process implementation of {@link IPlaywrightService}.
 *
 * Manages {@link PlaywrightSession} instances keyed by session ID.
 * Each session has its own Playwright browser connection and browser view
 * group, created eagerly by the service when the session is first requested.
 */
export class PlaywrightService extends Disposable implements IPlaywrightService {
```
`:131-161`:
```ts
const playwright = await import('playwright-core');
const sub = group.onCDPMessage(msg => transport.onmessage?.(msg));
const transport: ConnectOverCDPTransport = {
	close() { ... },
	send: (rawMessage) => { ... void group.sendCDPMessage(message); }
};
browser = await playwright.chromium.connectOverCDP(transport);
```
Channel 'playwright' registered in shared process: `src/vs/code/electron-utility/sharedProcess/sharedProcessMain.ts:514-515`.

## Screenshots: on-demand only — screencast NEGATIVE

- `Page.captureScreenshot` (full-page, jpeg quality param) — `browserView.ts:910-913`:
```ts
		const result = await this.debugger.sendCommand('Page.captureScreenshot', {
			format,
			...(format === 'jpeg' ? { quality } : {}),
			captureBeyondViewport: true,
```
- Non-fullPage uses Electron native capture: `browserView.ts:859-861` `return await this._view.webContents.capturePage(options?.screenRect, { stayHidden: true });`
- Chat features capture at quality 80: `features/browserEditorChatFeatures.ts:755` `const screenshotBuffer = await model.captureScreenshot({ quality: 80 });`; `features/webContentsViewRendererFeature.ts:279` `const screenshot = await this._model.captureScreenshot({ quality: 80 });`
- **NEGATIVE (grep-verified)**: `startScreencast` has ZERO matches across src/vs — the in-tree browserView does NOT stream frames; every `screencast` hit is the unrelated a11y "Screencast Mode" overlay (`workbench/browser/actions/developerActions.ts:133-140` etc.).

## Proposed extension-side browser API

`src/vscode-dts/vscode.proposed.browser.d.ts:13-28, 30-47, 83-90`:
```ts
export interface BrowserTab {
	readonly url: string;
	readonly title: string;
	readonly icon: IconPath;
	/** Create a new CDP session that exposes this browser tab. */
	startCDPSession(): Thenable<BrowserCDPSession>;
	/** Close this browser tab. */
	close(): Thenable<void>;
}
export interface BrowserCDPSession {
	readonly onDidReceiveMessage: Event<unknown>;
	readonly onDidClose: Event<void>;
	sendMessage(message: unknown): Thenable<void>;
	close(): Thenable<void>;
}
...
export function openBrowserTab(url: string, options?: BrowserTabShowOptions): Thenable<BrowserTab>;
```

## Claims supported (→ PERFORMANCE-PLAN §3/§5, MIGRATION-PLAN §3 Wave-4)

1. Browser panes = one sandboxed WebContentsView renderer process per pane with per-scope session partitions (global persist / per-agent hash / workspace path / ephemeral) — memory cost is per-pane, policy is which partitions exist.
2. Browser tool calls traverse ext host → renderer → shared process (Playwright channel) → main (CDP) → Chromium — a 4-process path that needs its own latency budget.
3. Live pane rendering is native composition (no frame streaming in-tree); streaming exists only in B's lab prototype (10 frames in a 0.5s window, evidence/b-browser-ux/cdp/manifest.json) — production streaming (remote/cloud panes) is Flauz work, not an upstream feature to adopt.
4. The `browser.d.ts` proposed API gives extensions raw CDP — Flauz's policy layer (DL-6) hooks `IAgentNetworkFilterService` + partitions + layered navigation gates.
