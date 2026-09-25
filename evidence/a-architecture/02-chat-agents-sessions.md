Evidence 02 — Chat Agents, Participants, Sessions, Model Picker
IChatAgent / IChatAgentService (core-side agent registry)
$ rg -n "export interface IChatAgent\b" src/vs/workbench/contrib/chat/common/chatAgents.ts→ `export interface IChatAgent { id: string; ... }` (registry entry shape: id, metadata, handler plumbing)$ rg -n "IChatAgentService" src/vs/workbench/contrib/chat/common/chatAgents.ts→ `export const IChatAgentService = createDecorator<IChatAgentService>('chatAgentService');`
Participant registration from extensions (ext-host side)
$ rg -n "createChatParticipant" src/vscode-dts/vscode.d.ts→ `export function createChatParticipant(id: string, handler: ChatRequestHandler): ChatParticipant;`$ rg -n "createChatParticipant" src/vs/workbench/api/common/extHostChatAgents2.ts→ ext-host bridge implementation present; registration flows into IChatAgentService.
ChatRequestHandler / ChatContext / ChatRequest
$ rg -n "export type ChatRequestHandler" src/vscode-dts/vscode.d.ts→ `export type ChatRequestHandler = (request: ChatRequest, context: ChatContext,   response: ChatResponseStream, token: CancellationToken) => ProviderResult<void>;`$ rg -n "export interface ChatContext" src/vscode-dts/vscode.d.ts→ `export interface ChatContext { readonly history: ... }` (request turn types nearby)
Chat modes [VERIFY]
$ rg -n "enum ChatMode|ChatModeKind" src/vs/workbench/contrib/chat/common/→ [VERIFY on this mirror] run to pin the mode enum + file. Docs claim Ask/Edit/Agent  modes drive the tool loop (mapping row 17).
Sessions / Agent Host [VERIFY]
$ rg -n "AgentHost" src/vs/→ [VERIFY] TL repo verification found recent commit subjects referencing "Agent Host"  and chat sessions; symbol-level search in this shallow working tree pending.  If zero matches at next sync, treat "Agent Host" as commit-subject vocabulary until  the subsystem lands, and keep the Flauz-service design as the integration point.$ rg -n "ChatSessionsService|chatSessions" src/vs/workbench/contrib/chat/→ [VERIFY]
Model picker [VERIFY]
$ rg -n "LanguageModelPicker|modelPicker" src/vs/workbench/contrib/chat/browser/→ [VERIFY] tabbed model picker UI expected in the chat input parts (chatInputParts.ts family).
Widget variants (side chats)
$ ls src/vs/workbench/contrib/chat/browser/→ listing includes the chatWidget family [VERIFY exact filenames for side-chat variants]
