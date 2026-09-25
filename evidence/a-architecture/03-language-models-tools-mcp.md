Evidence 03 — Language Model API, Tools, MCP
selectChatModels (vendor-agnostic model access)
$ rg -n "selectChatModels" src/vscode-dts/vscode.d.ts→ `export function selectChatModels(selector?: ChatSelector, token?: CancellationToken):   Thenable<LanguageModelChat[]>;`$ rg -n "ILanguageModelsService" src/vs/workbench/contrib/chat/common/languageModels.ts→ `export const ILanguageModelsService = createDecorator<ILanguageModelsService>('languageModelsService');`$ rg -n "selectChatModels" src/vs/workbench/api/common/extHostLanguageModels.ts→ ext-host implementation present.
Provider registration [VERIFY]
$ rg -n "registerLanguageModel|registerChatModelProvider" src/vscode-dts/→ [VERIFY] proposed-API name churn across releases; pin exact symbol + d.ts file at next  sync before the Flauz provider adapters are written.
Tool registration + tool calls
$ rg -n "export function registerTool" src/vscode-dts/vscode.d.ts→ `export function registerTool<T>(name: string, tool: LanguageModelTool<T>): Disposable;`  [VERIFY generic arity on this mirror: rg -n "registerTool" src/vscode-dts/vscode.d.ts]$ rg -n "LanguageModelToolCallPart" src/vscode-dts/vscode.d.ts→ `export class LanguageModelToolCallPart { readonly name: string; readonly input: object; ... }`$ rg -n "LanguageModelToolResult" src/vscode-dts/vscode.d.ts→ result type returned into the model loop (mapping row 14).
Tool confirmation metadata [VERIFY]
$ rg -n "confirmationMessages|prepareInvocation" src/vscode-dts/vscode.d.ts→ [VERIFY] expect `prepareInvocation?(options, token)` returning invocation options with  confirmation fields (mapping row 22). Pin exact type name at next sync.
MCP in-tree
$ ls src/vs/workbench/contrib/mcp→ common/  browser/  ... (MCP contrib present in the OSS tree)$ rg -n "createDecorator<IMcpService>|export interface IMcpService" src/vs/workbench/contrib/mcp/common/→ [VERIFY exact file: mcpService.ts / mcpRegistry*.ts] expect the standard DI decorator pattern.$ rg -n "mcp" src/vscode-dts/ | head→ [VERIFY] whether any MCP surface is exposed to extensions vs. workbench-internal only.
