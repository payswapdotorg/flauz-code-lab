Evidence 07 — Remote/Environments, Tunnels, Browser/Webviews
Remote authority resolver API (Environment dimension mechanism)
$ rg -n "registerRemoteAuthorityResolver" src/vscode-dts/vscode.proposed.resolvers.d.ts→ `export function registerRemoteAuthorityResolver(authorityPrefix: string,   resolver: RemoteAuthorityResolver): Disposable;`→ env providers (SSH/containers/E2B/cloud) plug in here without core changes.
In-repo remote server
$ ls src/vs/server→ (server ext host / connection services) — non-electron server inside the OSS tree.
Tunnels CLI
$ ls cli/src/tunnels→ (tunnel server/protocol code) — powers `code tunnel`.
Proprietary remote pieces are NOT in the OSS tree
$ ls extensions | grep -iE "remote|container"→ (no Remote-SSH / Dev Containers built-ins) — see evidence 09; Flauz ships OSS providers.
Web worker ext host (browser platform)
$ ls src/vs/workbench/services/extensions/browser | grep -i worker→ [VERIFY] expect webWorkerExtensionHost.ts.
Browser surfaces
$ ls extensions/simple-browser→ package.json  src/extension.ts ... (built-in webview browser — v1 precedent)$ rg -n "simpleBrowser.show" extensions/simple-browser/package.json→ command contribution present.$ rg -n "createWebviewPanel" src/vscode-dts/vscode.d.ts→ `export function createWebviewPanel(viewType: string, title: string, showOptions: ViewColumn,   options?: WebviewPanelOptions & WebviewOptions): WebviewPanel;`→ v2 CDP-driven browser renders via webview/custom-editor surfaces (see ARCHITECTURE.md).
