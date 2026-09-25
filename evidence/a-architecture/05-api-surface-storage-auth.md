Evidence 05 — Ext Host Process, Affinity, Storage, Secrets, Auth, Trust
Extension host surface
$ wc -l src/vs/workbench/api/common/extHostTypes.ts→ large; hundreds of exported types$ rg -c "export class" src/vs/workbench/api/common/extHostTypes.ts→ (count at run time; establishes the ext-host type vocabulary)$ ls src/vs/workbench/api/node/→ ... extensionHostProcess.ts ... (ext host process entry)
Extension-host process affinity (hybrid runtime dependency)
$ rg -n "experimental.affinity" src/vs/workbench/→ setting `extensions.experimental.affinity` — pins selected extensions to separate  extension host processes [VERIFY exact registration file + description string at next sync]→ This is the load-bearing mechanism for the Agent Bridge process isolation  (AGENT-INTEGRATION.md §1, option D).
Memento / global & workspace state
$ rg -n "export class Memento" src/vs/workbench/api/common/extHostMemento.ts→ `export class Memento { get<T>(key: string): T | undefined; update(key, value): Thenable<void>; ... }`  (context.workspaceState / context.globalState)$ rg -n "export const IStorageService" src/vs/platform/storage/common/storage.ts→ DI decorator present (workbench-side storage service).
Secrets + auth
$ rg -n "export interface SecretStorage" src/vscode-dts/vscode.d.ts→ present (store/get/delete + onDidChangeSecretStorage).$ rg -n "export function getSession" src/vscode-dts/vscode.d.ts→ `namespace authentication { export function getSession(providerId: string, scopes: readonly string[],   options?: AuthenticationGetSessionOptions): Thenable<AuthenticationSession | undefined>; }`
Workspace trust
$ rg -n "IWorkspaceTrustManagementService|IWorkspaceTrustRequestService" src/vs/workbench/contrib/workspace/common/workspaceTrust.ts→ both interfaces + DI decorators present (outer approval gate).
configurationDefaults (default-UX without core patch) [VERIFY]
$ rg -n "configurationDefaults" src/vs/workbench/services/extensions/→ [VERIFY] contribution-point schema location; expected under the extensions registry/schema files.
