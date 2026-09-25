# EV-08 — Persistence: chat sessions, state, secrets, memory

## 1. Stable extension storage (vscode.d.ts, `ExtensionContext`)

- `workspaceState: Memento` (8437), `globalState: Memento & { setKeysForSync }` (8443),
  `secrets: SecretStorage` (8464), `storageUri`/`globalStorageUri` (8506+), `extensionUri` (8346/8469).
- `extHostMemento.ts`, `extHostStorage.ts`, `extHostSecrets.ts`, `extHostSecretState.ts` (api/common).

## 2. Chat session persistence (core)

- contrib `chat/browser/chatSessions/` + `extHostChatSessions.ts` — chat sessions are workbench editor
  inputs with serializers (persisted per workspace in storage; restorable across restarts).
- `chat/browser/chatEditing/chatEditingSessionStorage.ts` — agent edit sessions persisted with checkpoints
  (`chatEditingCheckpointTimeline.ts`).

## 3. Third-party agent sessions (proposed `chatSessionsProvider.d.ts`)

- `chat.registerChatSessionItemProvider(type, provider)` (45; deprecated alias of 57
  `createChatSessionItemController(chatSessionType, refreshHandler)`) + package.json `chatSessions`
  contribution (doc line 38).
- `ChatSessionItemProvider.provideChatSessionItems()` (65/75) — list external sessions (e.g. CLI agent runs).
- `registerChatSessionContentProvider(scheme, provider, defaultChatParticipant, capabilities?)` (599) —
  `provideChatSessionContent(resource, token, context)` (556) returns `ChatSession` (435) with history;
  capabilities at 626. Provider options incl. model metadata (699/736/806), input state (824).
- `ChatSessionStatus.NeedsInput` (10–30) — persisted sessions can re-enter "needs user input".
→ Claude-Code-style session history in the chat view is an intended extension pattern.

## 4. Cross-machine / cross-environment continuity

- contrib `editSessions/` (+ proposed `editSessionIdentityProvider`, `contribEditSessions`) — resume
  working state across devices/environments.
- contrib `userDataSync/`, `userDataProfile/` — settings/state/profile sync infrastructure.
- contrib `localHistory/`, `timeline/` — file-local history timelines.

## 5. Workspace-scoped memory / context

Present pieces:

- Prompt-file resources (EV-09): `.agent.md`, `.instructions.md`, `SKILL.md` loadable from
  `local | user | extension | plugin | builtin` sources with `sessionTypes`.
- `chat/browser/contextContrib/` + proposed `chatContextProvider.d.ts` + `extHostChatContext.ts` —
  chat context contributions.
- Embeddings: `extHostEmbedding.ts`, `extHostEmbeddingVector.ts`, proposed `embeddings.d.ts`,
  `aiRelatedInformation.d.ts` (AI-related info provider), search contrib `AISearch/` models.
- Attachments: `chat/browser/attachments/` + `extHostVariableResolverService.ts` (`#file`-style variables).

Absent (negative): no built-in persistent semantic memory store keyed by workspace (no "memory service"
in contrib/ or platform/ — verified by directory enumeration in EV-00 §1/§2). Flauz memory = extension
work on top of embeddings API + storage + prompt files.

## 6. Cost/quota state

`extHostChatQuota.ts` + `product.json:144–145` (quota-exceeded context keys) — per-agent quota state exists
for the default-agent path.
