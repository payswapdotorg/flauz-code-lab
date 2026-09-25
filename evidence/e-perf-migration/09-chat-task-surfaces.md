# Evidence 09 — Task/agent state surfaces: chat session status, approvals, chatEditing checkpoints, SCM artifacts

Tree: payswapdotorg/Flauz @ 9bf9ae764da. Quotes verbatim (2-c bundle + direct greps).
This is the native-surface map `prototypes/agent-task-state/` renders onto.

## ChatSessionStatus (the task-state enum)

`src/vscode-dts/vscode.proposed.chatSessionsProvider.d.ts:10-30` (verified directly):
```ts
	export enum ChatSessionStatus {
		/**
		 * The chat session failed to complete.
		 */
		Failed = 0,

		/**
		 * The chat session completed successfully.
		 */
		Completed = 1,

		/**
		 * The chat session is currently in progress.
		 */
		InProgress = 2,

		/**
		 * The chat session needs user input (e.g. an unresolved confirmation).
		 */
		NeedsInput = 3
	}
```
Identical enums at `src/vs/workbench/api/common/extHostTypes.ts:3602-3607` and `src/vs/workbench/contrib/chat/common/chatSessionsService.ts:58-63`.

## ChatSessionItem — the session-row surface (status, timing, changed files)

`vscode.proposed.chatSessionsProvider.d.ts:294-404`:
- `resource: Uri` ("unique id", `:300`), `label` (`:305`), `iconPath?`, `description?`, `badge?`
- `status?: ChatSessionStatus` (`:325`)
- `timing?: { created: number; lastRequestStarted?: number; lastRequestEnded?: number; startTime? (deprecated); endTime? (deprecated) }` (`:360-391`, ms since epoch)
- `changes?: readonly ChatSessionChangedFile[]` (`:396`), `archived?: boolean` (`:335`), `metadata?: { readonly [key: string]: any }` (`:403`)

## HumanApproval gates — the in-tree approval machinery

`src/vs/workbench/contrib/chat/browser/agentSessions/agentSessionApprovalModel.ts`:
- Class doc `:44-49`: "Tracks approval state for all live chat sessions. For each session, exposes an observable that emits {@link IAgentSessionApprovalInfo} when a tool invocation is waiting for user confirmation, or `undefined` when no approval is needed."
- Derivation `:120-131`:
```ts
const needsInput = response.isPendingConfirmation.read(reader);
if (!needsInput) {
	continue;
}

for (const part of response.pendingToolInvocations.read(reader)) {
	...
	const state = part.state.read(reader);
	if (state.type === IChatToolInvocation.StateKind.WaitingForConfirmation || state.type === IChatToolInvocation.StateKind.WaitingForPostApproval) {
```
- Surfacing + confirm `:151-158`:
```ts
setIfChanged({
	approvalId: part.toolCallId,
	kind,
	label,
	languageId,
	since: new Date(),
	confirm: () => IChatToolInvocation.confirmWith(part, { type: ToolConfirmKind.UserAction, ...(selectedButton ? { selectedButton } : {}) }),
```
- Kind taxonomy `:19-26`: `AgentSessionApprovalKind = { Terminal='terminal', Question='question', Other='other' }` ("Question is 'The agent is asking the user a question / needs a free-form response.'").
- Tool confirmation scopes (C's EV-03 §4–5): `LanguageModelToolsConfirmationService` with `ToolConfirmKind.LmServicePerTool`, scope session/profile/workspace (lines 113–119).

## ChatEditingService — checkpoints (the verification/rollback surface)

- `src/vs/workbench/contrib/chat/browser/chatEditing/chatEditingSession.ts:386-389` (verified directly):
```ts
	public createSnapshot(requestId: string, undoStop: string | undefined): void {
		const label = undoStop ? `Request ${requestId} - Stop ${undoStop}` : `Request ${requestId}`;
		this._timeline.createCheckpoint(requestId, undoStop, label);
	}
```
- `:391-416`: `getSnapshotContents(requestId, uri, stopId)`, `getSnapshotModel(...)`, `getSnapshotUri(requestId, uri, stopId): URI | undefined`
- `:418-423`:
```ts
	public async restoreSnapshot(requestId: string, stopId: string | undefined): Promise<void> {
		const checkpointId = this._timeline.getCheckpointIdForRequest(requestId, stopId);
		if (checkpointId) {
			await this._timeline.navigateToCheckpoint(checkpointId);
		}
	}
```
- Interface decls: `src/vs/workbench/contrib/chat/common/editing/chatEditingService.ts:133` (`restoreSnapshot(requestId, stopId)`), `:148-151` (`getSnapshotUri/getSnapshotContents/getSnapshotModel`). Negative: `createSnapshot` is public on the concrete class only, not on `IChatEditingSession`.
- Session state enum `:469-474`:
```ts
export const enum ChatEditingSessionState {
	Initial = 0,
	StreamingEdits = 1,
	Idle = 2,
	Disposed = 3
}
```
- Persistence — `src/vs/workbench/contrib/chat/browser/chatEditing/chatEditingSessionStorage.ts:22-47`:
```ts
const STORAGE_CONTENTS_FOLDER = 'contents'; const STORAGE_STATE_FILE = 'state.json';
...
protected _getStorageLocation(): URI {
	const workspaceId = this._workspaceContextService.getWorkspace().id;
	const storageRoot = joinPath(this._environmentService.workspaceStorageHome, workspaceId, 'chatEditingSessions');
	return getChatSessionStorageResource(storageRoot, this.storageKey);
}
```
(state.json + contents/ files, `:189-199`.)

## SCM artifact rows — the evidence surface (proposed)

`src/vscode-dts/vscode.proposed.scmArtifactProvider.d.ts` (full shape, 35 lines; issue #253665 at `:7`):
```ts
export interface SourceControl {
	artifactProvider?: SourceControlArtifactProvider;
}
export interface SourceControlArtifactProvider {
	readonly onDidChangeArtifacts: Event<string[]>;
	provideArtifactGroups(token: CancellationToken): ProviderResult<SourceControlArtifactGroup[]>;
	provideArtifacts(group: string, token: CancellationToken): ProviderResult<SourceControlArtifact[]>;
}
export interface SourceControlArtifactGroup {
	readonly id: string;
	readonly name: string;
	readonly icon?: IconPath;
	readonly supportsFolders?: boolean;
}
export interface SourceControlArtifact {
	readonly id: string;
	readonly name: string;
	readonly description?: string;
	readonly icon?: IconPath;
	readonly timestamp?: number;
	readonly command?: Command;
}
```

## Chat session content provider (task replay surface)

`vscode.proposed.chatSessionsProvider.d.ts:527-575` — `provideChatSessionContent(resource: Uri, token: CancellationToken, context: { readonly inputState: ChatSessionInputState; }): Thenable<ChatSession> | ChatSession` (`:556-558`); `ChatSession` shape `:435-498`: `history: ReadonlyArray<ChatRequestTurn | ChatResponseTurn2>`, `options?`, `activeResponseCallback?`, `requestHandler?`, `forkHandler?`. Item provider `:65-103` (`onDidChangeChatSessionItems`, `provideChatSessionItems`).

## Claims supported (→ prototype #6, MIGRATION-PLAN §3 Wave-3)

1. A four-value session status (Failed/Completed/InProgress/NeedsInput) + per-item timing + changed-file list is already a proposed-API surface — Flauz task state maps onto it without core changes.
2. Human-approval gates have three native layers: tool-confirmation service (scoped), agent-session approval model (NeedsInput derivation), MCP elicitation (C EV-03 §6) — Flauz adds policy, not mechanics.
3. Checkpoint semantics = (requestId, stopId) → timeline checkpoint; storage is per-workspace state.json + contents — Flauz's `.flauz/tasks.json` envelope (DL-9/D-10) must interop with, not duplicate, this (workspace-committed shareable layer vs private workspaceStorage).
4. SCM artifact groups/artifacts with timestamp + command = the evidence-row surface for the ledger.
