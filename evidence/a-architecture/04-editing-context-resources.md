Evidence 04 — Chat Editing, Context/Variables, Resources & File System
Chat editing sessions (edit-tracked changesets)
$ rg -n "export interface IChatEditingSession" src/vs/workbench/contrib/chat/common/chatEditingService.ts→ `export interface IChatEditingSession { ... }` — working set of files being modified  [VERIFY exact field names: entries/workingSet]$ rg -n "IChatEditingService" src/vs/workbench/contrib/chat/common/chatEditingService.ts→ DI decorator present; browser UI (multi-file diff editors) under  src/vs/workbench/contrib/chat/browser/.
Chat variables (context contribution)
$ rg -n "IChatVariablesService" src/vs/workbench/contrib/chat/common/chatVariablesService.ts→ `export const IChatVariablesService = createDecorator<IChatVariablesService>('chatVariablesService');`$ rg -n "ChatPromptReference|ChatRequest" src/vscode-dts/vscode.d.ts | head→ `ChatRequest.references: readonly ChatPromptReference[]` region [VERIFY exact interface shape]$ rg -n "export function findFiles" src/vscode-dts/vscode.d.ts→ `export function findFiles(include: GlobPattern, exclude?: GlobPattern | null,   maxResults?: number, token?: CancellationToken): Thenable<Uri[]>;`
File system + resources
$ rg -n "registerFileSystemProvider" src/vscode-dts/vscode.d.ts→ `export function registerFileSystemProvider(scheme: string, provider: FileSystemProvider, options?: {...}): Disposable;`$ rg -n "export interface IFileService" src/vs/platform/files/common/files.ts→ present (core file service; IFileStat etc. in same module).$ rg -n "IUriIdentityService" src/vs/platform/uriIdentity/common/uriIdentity.ts→ [VERIFY] expect `export const IUriIdentityService = createDecorator<IUriIdentityService>('uriIdentityService');`
Working-copy dirty state (ResourceState)
$ rg -n "isDirty" src/vs/workbench/services/workingCopy/common/workingCopyService.ts src/vs/workbench/services/workingCopy/common/workingCopy.ts→ `isDirty(): boolean` on IWorkingCopy + change events on IWorkingCopyService.
SCM resource state
$ rg -n "export interface ISCMResource" src/vs/workbench/contrib/scm/common/scm.ts→ present (per-provider resource states; async-collab substrate per mapping row 25).
