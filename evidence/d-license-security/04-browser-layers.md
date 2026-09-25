# Evidence 04 — Browser Security Layers (Wave-1 Worker B formalization)

Tree: payswapdotorg/Flauz @ 9bf9ae764da (see Evidence 01 header).

## L1. Driver-side pre-navigation gate (the authoritative agent-nav gate)

`src/vs/workbench/contrib/browserView/electron-browser/tools/navigateBrowserTool.ts`
(read :1-120):
> :17 import { IAgentNetworkFilterService } from …/networkFilter/common/networkFilterService.js
> :39-41 NavigateBrowserToolData { id: 'navigate_page', toolReferenceName:
>   BrowserChatToolReferenceName.NavigatePage, source: ToolDataSource.Internal }
> :71-74 constructor injects IPlaywrightService + IAgentNetworkFilterService +
>   IBrowserViewWorkbenchService + IRemoteExplorerService
> :102-105 (prepareToolInvocation, type='url' branch):
>   "const resourceNavigationError = this.getResourceNavigationError(params.pageId, params.url);
>    if (resourceNavigationError) { throw new Error(resourceNavigationError); }"
> :107-110 "const networkPolicyError = getBrowserNetworkPolicyError(params.url,
>    this.agentNetworkFilterService); if (networkPolicyError) { throw new Error(networkPolicyError); }"
> :112-116 confirmationMessages { title: 'Navigate Browser?',
>    message: 'This will navigate the browser to {0} and allow the agent to access its
>    contents.', allowAutoConfirm: true }

`src/vs/workbench/contrib/browserView/electron-browser/tools/browserToolHelpers.ts`:
> :226-229 export function getBrowserNetworkPolicyError(url, agentNetworkFilterService) {
>    const uri = URI.parse(url);
>    return agentNetworkFilterService.isUriAllowed(uri) ? undefined : agentNetworkFilterService.formatError(uri); }
> :231-242 getExternalTunnelNetworkPolicyError — rewritten tunnel URLs re-checked unless
>    localhost authority

Tool inventory (same dir): clickBrowserTool, typeBrowserTool, hoverElementTool,
dragElementTool, handleDialogBrowserTool, readBrowserTool, screenshotBrowserTool,
runPlaywrightCodeTool, openBrowserTool (+ NonAgentic), listBrowserPagesTool,
browserToolHelpers, browserTools.contribution.

Tool reference names: `src/vs/platform/browserView/common/browserChatToolReferenceNames.ts`
(OpenBrowserPage, ReadPage, ScreenshotPage, NavigatePage, ClickElement, TypeInPage,
HoverElement, DragElement, HandleDialog, RunPlaywrightCode) — "Lives in `platform` … so
the Copilot agent host — which cannot import from `workbench` — can gate its browser tool
instructions on the same names."

## L2. webRequest filter (agent sessions only)

`src/vs/platform/browserView/electron-main/browserSession.ts:310-330`:
> "Dynamically apply network filtering to Agent sessions."
> private updateNetworkFilter(): void {
>   if (this.storageScope !== BrowserViewStorageScope.Agent) { return; }
>   const enabled = this.agentNetworkFilterService.isEnabled();
>   …
>   this.electronSession.webRequest.onBeforeRequest(enabled ? (details, callback) => {
>     let uri: URI; try { uri = URI.parse(details.url, true); } catch { callback({ cancel: true }); return; }
>     callback({ cancel: !this.agentNetworkFilterService.isUriAllowed(uri) });
>   } : null); }

`src/vs/platform/networkFilter/common/networkFilterService.ts`:
> :26-35 (doc) "Service that filters network requests made by agent tools (fetch tool,
>   integrated browser) based on the configured allowed/denied domain lists. Filtering is
>   active for all callers when the `chat.agent.networkFilter` setting is enabled.
>   When both domain lists are empty, all domains are denied. When a domain appears on
>   the denied list it is always blocked, even if it also matches an entry on the
>   allowed list."
> :36-63 IAgentNetworkFilterService { isUriAllowed; isEnabled; formatError; onDidChange }
> :103-107 isUriAllowed: "if (!this.isEnabled()) { return true; }" (filter OFF ⇒ allow all)
> :109-110 (file URIs / authority-less schemes always pass)
> :19-24 filtered schemes: http, https, ws, wss

Settings ids: `src/vs/platform/networkFilter/common/settings.ts`
(AgentNetworkDomainSettingId.NetworkFilter / AllowedNetworkDomains / DeniedNetworkDomains).

## L3. will-navigate / will-redirect (UX-only today)

`src/vs/platform/browserView/electron-main/browserView.ts:328-344`:
> webContents.on('will-navigate', (event) => {
>   if (this._redirectPinnedNavigation(event.url)) { event.preventDefault(); return; }
>   … favicon bookkeeping only … });
> webContents.on('will-redirect', event => {
>   if (this._redirectPinnedNavigation(event.url)) { event.preventDefault(); } });
(:352-359 fireNavigationEvent surfaces certificateError via session.trust.getCertificateError)

## L4. Session partitions

`src/vs/platform/browserView/electron-main/browserSession.ts`:
> :57-62 ID derivation rules quoted: Global → "global"; Workspace → "workspace:${workspaceId}";
>   Ephemeral per-view → "ephemeral:${viewId}"; Agent → "agent:${identityHash}";
>   Custom → "${type}:${viewId}"
> :134-138 getOrCreateGlobal — session.fromPartition('persist:vscode-browser')
> :143-148 getOrCreateWorkspace — session.fromPath(<workspaceStorageHome>/<workspaceId>/browserStorage)
> :153-162 getOrCreateEphemeral — session.fromPartition('vscode-browser-${type}${viewId}')
> :165-180 getOrCreateAgent — identity = affinity|workspace|window →
>   sha256 → session.fromPartition('vscode-browser-agent-<hash>'), Agent storage scope
> :40-87 class doc: one-to-one with Electron.Session; id doubles as CDP browserContextId;
>   knownSessions WeakSet + isBrowserViewWebContents
> :119-129 static updateNetworkFiltering() fans out to all live sessions

## L5. Origin permissions

`src/vs/platform/browserView/common/browserPermissions.ts` (full read):
> :12-24 module doc — per-origin permission model, Chromium-site-settings categories;
>   "ships NO UI and no Electron import so it can load in both the main process
>   (authoritative store) and the workbench renderer (read mirror)"
> :32-39 PermissionDecision 'allow'|'deny'; PermissionState + 'ask' (never stored)
> :47-55 PermissionCategory: Location, Camera, Microphone, Notifications, Sensors,
>   Clipboard, Devices
> :62 BrowserDeviceType 'usb'|'serial'|'hid'|'bluetooth'
> :97-157 descriptors — defaults: ask (location/camera/mic/clipboard/notifications),
>   allow (sensors, devices); 'media' disambiguated via mediaTypes
> :158-186 unlisted permissions: always-denied by default; documented no-op list
>   (smart-card, nfc, mediaKeySystem, ar/vr, payment-handler, background-sync, …)
> :194-199 ALWAYS_ALLOWED_PERMISSIONS = pointerLock, keyboardLock, fullscreen,
>   clipboard-sanitized-write
> :249-266 electronPermissionToCategories; media → strictest (both camera+mic) when
>   no hint
> :277-299 toOriginKey — origin else scheme+path (file:); "null" opaque origins → '' (no
>   category defaults apply)
> :302-483 BrowserPermissionStore — Map<originKey, Map<category, decision>>; set/clear/
>   clearOrigin/clear/serialize/hydrate; onDidChange

Electron-main wiring: `browserSessionPermissions.ts` (configure(electronSession) —
setPermissionRequestHandler etc.), `browserSessionTrust.ts` (cert trust per session,
storage-backed), `browserSessionRemote.ts` (proxy lifecycle), `browserSessionHistory.ts`.

## L6. file:// trusted roots

`src/vs/platform/browserView/electron-main/browserSession.ts:221-235,341-347`:
> :221-222 private static readonly _trustedFileRoots = TernarySearchTree.forPaths<true>(!isLinux);
>   private static _trustAllFiles = false;
> :227-235 setTrustedFileRoots(roots, trustAllFiles)
> :341-347 protocol.handle(Schemas.file, …):
>   "if (!BrowserSession._trustAllFiles && !BrowserSession._trustedFileRoots.findSubstr(filePath)) {
>      return new Response(localize('browserSession.untrustedFile',
>      'Forbidden. File does not reside within a trusted folder.'), { status: 403 }); }"

## L7. Playwright + CDP surface

`src/vs/platform/browserView/common/playwrightService.ts` (IPlaywrightService);
`src/vs/platform/browserView/common/cdp/` (CDP plumbing);
`src/vs/platform/browserView/electron-main/browserViewCDPTarget.ts`,
`browserViewDebugger.ts`, `browserViewEmulator.ts`, `browserViewFrameInspector.ts`.

`src/vs/sessions/contrib/browserView/` — sessions-subsystem browser contrib.

## Known residual (Wave-1 [W1], restated for the record)

CDP-initiated navigations bypass will-navigate (L3 is UX-only); webRequest cancel (L2)
blocks content but the top-level URL may still commit. Consequence in-model: L1 is the
authoritative agent-navigation gate; L4 contains blast radius; Flauz adds post-commit
reconciliation (SECURITY-MODEL.md §4-F2).
