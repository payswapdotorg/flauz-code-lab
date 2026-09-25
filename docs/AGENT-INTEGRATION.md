```markdown
# Flauz Agent Runtime ↔ Workbench Integration (Wave 1 / Worker A)

## 1. Process model — options and recommendation

| Option | Activation/latency | vscode.* API access | Crash blast radius | Permissions | IPC cost | Upstream safety |
|---|---|---|---|---|---|---|
| A. pure extension-host agent | starts with workbench; fastest | full | dies with ext host (bad for long agents) | subject to ext host trust | none (in-proc) | best |
| B. separate Flauz service (Node proc) | spawn on demand; +startup | none direct — via bridge | isolated from UI ext host | own, explicit capability grants | 1 JSON-RPC hop (in-tree pattern: `src/vs/base/parts/ipc/`) | best (external) |
| C. language-server style (LSP) | server lifecycle managed for us | none (editor-centric protocol) | isolated | poor fit for tools/terminals | LSP overhead, wrong vocabulary | best but expressive loss |
| D. hybrid (A for surface + B for core) | bridge in ext host; core on demand | full via bridge | UI ext host crash ≠ agent core crash | layered (see §4) | 1 hop bridge↔core | best |

**Recommendation: D — hybrid.**
- **Flauz Agent Bridge** — built-in extension pinned to its own extension-host process via
  `"extensions.experimental.affinity"` (documented workbench setting for pinning extensions
  to separate ext host processes; verify: `rg -n "experimental.affinity" src/vs/workbench/`),
  holding: chat participants, `lm.*` model/tool access, terminal/task/debug execution,
  webviews. Activation: `onStartupFinished` — latency paid once, before user opens a chat.
- **Flauz Agent Core** — separate process, spawned by the bridge over stdio JSON-RPC
  (mirrors how the tree already multiplexes services over `src/vs/base/parts/ipc/`). Owns:
  orchestration, memory, claims/leases, approvals, evidence, skills, workflows, model
  routing. Survives ext-host restarts; re-attach via bridge.
- When to revisit: OS-level daemon autostart or thousands of headless agents → we would
  need electron-main/core changes → FORK-CRITICAL; demoted (see UPSTREAM-STRATEGY).

## 2. Relation to the agent-era infra already in the tree

**LEVERAGE (do not rebuild):**
- Chat participant/agent registry — `src/vs/workbench/contrib/chat/common/chatAgents.ts`
  (`IChatAgent`, `IChatAgentService`), ext-host registration `extHostChatAgents2.ts`.
- Model access — `vscode.lm` (`languageModels.ts`, `extHostLanguageModels.ts`); model picker
  UI already in chat input (`chatInputParts.ts` [VERIFY symbol]).
- Tools — `lm.registerTool`/`LanguageModelTool` + native tool-call loop and confirmation UI;
  MCP for out-of-process tool servers (`src/vs/workbench/contrib/mcp/`).
- Edit-tracked changesets — `IChatEditingSession` (`chatEditingService.ts`) gives us
  multi-file diffs for free; Flauz agents write through it, not around it.
- Sessions/Agent Host — recent upstream commits carry session persistence/hosting; strategy:
  **layer on top** (Flauz session objects reference native sessions). [VERIFY symbols:
  `rg -n "AgentHost\|ChatSessionsService" src/vs/workbench/`]

**RUN PARALLEL (genuinely ours):** orchestration across many agents; memory; claims/leases;
approval ledger; cross-vendor model routing; multi-user collaboration. These are stateful
products concerns, not editor concerns — hence the service.

**We do NOT fork the chat UI.** Flauz agents appear as native participants, so all native UX
(model picker, edits, diffs, confirmations) works on Flauz agents day one. A custom Flauz UI
would raise FORK-CRITICAL surface — rejected for Wave 1.

## 3. Tool invocation path (proposed)

```text
User ──chat──▶ Chat UI (native) ──▶ Flauz participant (Bridge ext-host, affinity proc)
  1 participant → Core: beginTask(planRef)
  2 Core → model via vscode.lm (vendor routed: Codex/Claude/Qwen/Muse/Copilot/local)
  3 model → tool_call: LanguageModelToolCallPart
  4 policy check: AccessSurface + Claim/Lease acquisition (Core)
  5 irreversible/privileged? → HumanApproval gate (native confirmation UI + Core ledger)
  6 execute: native tool (terminal/task/debug/notebook) | MCP server | Flauz service tool
  7 result: LanguageModelToolResult → evidence append (Core, persisted)
  8 response stream parts (markdown/filetree/reference) back to chat; edits via
    IChatEditingSession → native multi-file diff
```

4. Human-approval gates

Outer gate — Workspace Trust (workspaceTrust.ts): untrusted workspaces restrict
everything Flauz runs, exactly as they restrict tasks/extensions today.
Native tool gate — LanguageModelTool.prepareInvocation/confirmation metadata: user
sees the native confirmation affordance per tool call [VERIFY exact type name].
Flauz Approval Service (Core) — for service-side/irreversible ops (lease grants,
cross-environment mutations, spend on model APIs): approval request persisted in the
evidence ledger, surfaced via native modals/notifications/chat buttons; decisions are
auditable and replayable. Approvals are keyed by (agent, capability, resource-digest).

5. Agent-to-agent boundaries

Process: each Flauz agent runtime pinned to its own affinity ext-host process where
isolation matters; Core is a single mediator (no agent↔agent direct references).
Protocol: agents talk through Core's typed message bus (Message abstraction); external
capabilities cross only MCP/tool boundaries.
State: no shared mutable state; mutation of a shared resource requires Claim+Lease
from Core; conflicts degrade to the native SCM merge machinery.
Failure: bridge crash → UI re-attach; Core crash → tasks checkpointed via evidence
ledger + TaskState journal; never lose the user's editor.
