# Prototype: agent-task-state (charter prototype #6)

**Zero-install** (Node ≥ 20, no npm deps) rehearsal of the Flauz task/agent state shape —
**D-8/D-9 / DL-10**: the state machine **Plan → Execution → Verification with
HumanApproval gates**, persisted to a `.flauz/tasks.json`-style envelope
(`flauz.tasks/v0`), rendered as a timeline UI.

```
node server.mjs          # serves http://127.0.0.1:4173 (fixed port)
# then open http://127.0.0.1:4173 — advance states with the buttons;
# every transition is validated server-side and appended to .flauz/tasks.json
```

The UI also runs on a static host (e.g. the sandbox preview) with a clearly-labeled
localStorage simulation — `server.mjs` is the reference implementation with real
file persistence.

## State machine

```
 plan ──submit-plan(agent)──▶ awaiting-approval ◀─GATE 1 (HumanApproval)
   ▲                              │approve(human)          └─request-changes(human)─▶ plan
   │                              ▼
   │                            execute ──report(agent)──▶ verify
   │                              │  ▲                      │verify-pass(agent/tool)
   │                              │  └─verify-fail(agent)───┤
   │                              │fail(agent)              ▼
   │                              ▼                    awaiting-signoff ◀─GATE 2
   │                            failed                     │sign-off(human)
   │                                                       ▼
   └──────────── cancel(human): any active state ──────▶ done / cancelled
```

Every transition is validated server-side (`TRANSITIONS` in `server.mjs`); invalid
events return HTTP 409 with the allowed source states.

## Mapping onto native Code OSS surfaces (the point of the prototype)

| Prototype concept | Native surface | Reference tree path @ 9bf9ae764da |
|---|---|---|
| Task states `plan/execute/verify` | `ChatSessionStatus.InProgress (2)` | `src/vscode-dts/vscode.proposed.chatSessionsProvider.d.ts:10-30` |
| `awaiting-approval` / `awaiting-signoff` | `ChatSessionStatus.NeedsInput (3)` — "an unresolved confirmation" | same enum; derived in `src/vs/workbench/contrib/chat/browser/agentSessions/agentSessionApprovalModel.ts:120-131` from `IChatToolInvocation.StateKind.WaitingForConfirmation` / `WaitingForPostApproval` |
| HumanApproval gates | approval surface: `approvalId`, `kind` (terminal/question/other), `since`, `confirm()` → `ToolConfirmKind.UserAction` | `agentSessionApprovalModel.ts:151-158`; scopes session/profile/workspace per C's EV-03 §4-5 |
| `done` / `failed` | `ChatSessionStatus.Completed (1)` / `Failed (0)` | same enum |
| Execute→Verify checkpoint | chat-editing snapshot: `createSnapshot(requestId, undoStop)` → timeline checkpoint; restore via `restoreSnapshot(requestId, stopId)` | `src/vs/workbench/contrib/chat/browser/chatEditing/chatEditingSession.ts:386-389, 418-423` |
| Checkpoint persistence (private state) | workspaceStorage `<workspaceId>/chatEditingSessions/state.json + contents/` | `chatEditingSessionStorage.ts:22-47` |
| Evidence artifacts (`changeset/screenshot/evidence` chips) | SCM artifact groups + artifacts with `timestamp` + `command` (open evidence) | `src/vscode-dts/vscode.proposed.scmArtifactProvider.d.ts` (full shape) |
| Task timing (`created/updatedAt`) | `ChatSessionItem.timing {created, lastRequestStarted, lastRequestEnded}` | `vscode.proposed.chatSessionsProvider.d.ts:360-391` |
| Changed files per task | `ChatSessionItem.changes: readonly ChatSessionChangedFile[]` | `vscode.proposed.chatSessionsProvider.d.ts:396` |
| Task replay / resume | `provideChatSessionContent(resource, token, {inputState})` | `vscode.proposed.chatSessionsProvider.d.ts:556-558` |
| Envelope persistence | **hybrid (DL-9)**: private agent state in editor storage; shareable artifacts (tasks envelope, evidence, workflow envelope) in workspace-committed `.flauz/` — portable, git-diffable | DECISION-LOG DL-9 / C's D-9 |

**Design consequence for Wave 3** (MIGRATION-PLAN §3): `.flauz/tasks.json` does NOT
duplicate chat-editing checkpoints or session history — it references them
(`checkpoint: "req-8/stop-1"` style keys) and carries the orchestration-level state
(gates, artifacts, model routing) that has no native representation. The task↔session
link uses the session `resource` URI (the chatSessionsProvider id).

## What it proves

| # | Claim | Proof |
|---|---|---|
| P1 | The full gated lifecycle fits the native 4-value session status without core changes | state→`ChatSessionStatus` mapping shown live in every badge (`needsinput(3)` etc.) |
| P2 | HumanApproval gates map onto the existing tool-confirmation machinery | gate states = NeedsInput; approve/request-changes = the two `WaitingFor…` confirm kinds |
| P3 | The envelope is a small, git-diffable JSON that references (not duplicates) native state | `.flauz/tasks.json` written by the server on every transition (inspect after a run) |
| P4 | Transitions are server-validated (no client trust) | invalid event → HTTP 409 + allowed-states message |
| P5 | The same UI runs from a real API or degraded static host | mode badge: `live (.flauz/tasks.json)` vs `simulated (static host)` |

## What it does NOT prove

- Real adoption of `chatSessionsProvider` (proposed API) — this is the *shape* rehearsal;
  the Wave-3 `extensions/flauz-workspace` implements the provider for real.
- Multiple concurrent agents mutating one envelope (single-writer in the demo; the
  product assigns the ledger to Flauz Core — DL-5).
- `verify` steps actually running tools (buttons simulate agent/tool actors).

## Files

- `server.mjs` — zero-dep HTTP server + state machine + `.flauz/tasks.json` persistence (reference implementation).
- `index.html` / `styles.css` / `app.js` — timeline UI (vanilla; live-API mode + static-host fallback).
- `.flauz/tasks.json` — runtime artifact (git-ignored; regenerate with Reset).
