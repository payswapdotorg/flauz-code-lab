# Flauz UX Architecture — the unified work environment

**Scope:** Wave 1 / Worker B. Companion prototype: `prototypes/agent-surface/`
(static IA mock — open `index.html`, or the sandbox preview `/` route). Tree citations
refer to the Flauz mirror at `9bf9ae764da`.

## 0. TL;DR

The unified environment is **not** "VS Code + a giant Flauz sidebar". The IA that survived
prototyping:

1. **The sidebar is for navigation and state lists; the center grid is for work surfaces.**
   Editor, Terminal, Agent conversation, and Browser are **co-equal tiles in one resizable
   surface grid** (editor-group-class containers), not nested sidebars.
2. **Every surface has a scope, and the scope is visible**: a single Environment selector
   (top bar + status bar, remote-indicator pattern) visibly re-scopes terminal, browser
   session, agent context, and resources in one gesture.
3. **State is ambient and actionable**: task/agent/approval/evidence states surface in the
   status bar, the sidebar lists, and inline in the agent thread — no polling, no digging.
4. **Everything is reachable from the palette** (quick input), including Flauz-native
   verbs (spawn agent, switch environment, open isolated browser session).
5. **No dead ends**: every surface has a first-run/empty state with exactly one primary CTA.

## 1. Information architecture

```
┌ top bar: workspace ▾ · palette ⌘K · env selector · mapping toggle · first-run ┐
├ activity rail: [baseline VS Code views] | Workspace · Agents · Tasks · Resources · Evidence
├ sidebar (one at a time): the five Flauz LIST views (navigation/state, not surfaces)
├ SURFACE GRID (the product): Editor │ Agent conversation
│                             Terminal │ Browser
├ status bar: env scope · git · agents/approvals · model
└ every tile: same chrome, movable ("to editor area", "maximize", "split")
```

Key moves vs. stock VS Code:
- **Surface presets** (`Solo Code` / `Agent-Led` / `Browser Test` / `Review`) re-proportion
  the grid instead of moving surfaces into/out of a sidebar. Emphasis is a layout fact,
  not a hierarchy fact. (Code OSS equivalent: editor-grid layouts + panel/auxbar
  arrangements — `src/vs/workbench/browser/parts/editor/editorPart.ts` on
  `src/vs/base/browser/ui/grid/grid.ts` `SerializableGrid`.)
- **The agent conversation is a tile, not a sidebar prison**: it can be an editor-area
  surface (chat sessions already open in editors) while the roster/management list lives
  in the sidebar. The tree confirms the chat view container lives in the auxiliary bar by
  default (`src/vs/workbench/contrib/chat/browser/chatParticipant.contribution.ts`,
  `ViewContainerLocation.AuxiliaryBar, { isDefault: true }`) — Flauz's UX exposes it as a
  grid tile with the same co-equality as editor/terminal/browser.

## 2. Surface inventory — what hosts what (all verified paths)

| Surface | Code OSS container | In-tree infra that already exists |
|---|---|---|
| Editor | editor group in `editorPart` grid | `src/vs/workbench/browser/parts/editor/` (+ `services/editor/` for tiling arbitrary inputs) |
| Terminal | panel part OR editor-area terminal | `src/vs/workbench/contrib/terminal/browser/terminalEditor.ts`, `terminalEditorInput.ts`, `terminalEditorService.ts`; remote: `remoteTerminalBackend.ts`; agent-host terminals: `agentHostTerminalService.ts`, `agentHostPty.ts` |
| Agent conversation | auxiliary-bar view container AND editor input | chat container registration (above); agent sessions: `src/vs/workbench/contrib/chat/browser/agentSessions/` (`agentSessionsViewer.ts`, `agentSessionsModel.ts`); sessions layer `src/vs/sessions/` |
| Browser | custom editor input + WebContentsView overlay | `src/vs/workbench/contrib/browserView/` (`browserEditor.ts`, `common/browserEditorInput.ts`, `webContentsViewRendererFeature.ts`, `overlayManager.ts`, `widgets/browserUrlBarWidget.ts`) |
| Workspace/Context | view container in primary sidebar | `src/vs/workbench/browser/parts/activitybar/` + `parts/views/viewPane.ts` |
| Tasks | view container in primary sidebar | Flauz-native view (new); task-like state already flows through agent sessions |
| Resources | view container in primary sidebar | pattern exists (Ports view: `src/vs/workbench/contrib/remote/browser/tunnelView.ts`) |
| Evidence | view container + editor inputs for artifacts | custom editors: `src/vs/workbench/api/common/extHostCustomEditors.ts`; webview views: `extHostWebviewView.ts` |
| Environment selector | status bar item + quick pick (remote-indicator pattern) | `src/vs/workbench/contrib/remote/browser/remoteIndicator.ts` (statusbar entry `status.host`) + `src/vs/platform/quickinput/browser/quickInputService.ts` |
| Command palette | quick input | `src/vs/platform/quickinput/` |
| Model picker (per agent) | quick pick / view item | `src/vs/sessions/contrib/chat/browser/modelPicker.ts` (`ModelPickerActionViewItem`), `newChatModelPicker.ts`; workbench: `chat/browser/chatManagement/chatModelsWidget.ts` |
| Approval gates | inline chat tool confirmation | `src/vs/workbench/contrib/chat/common/model/chatProgressTypes/chatToolInvocation.ts` (streaming tool calls with confirmation hooks) |

**The one-sentence rule the mock enforces:** if it's a PLACE YOU WORK, it's a grid tile
(editor-group-class container); if it's a LIST OF THINGS OR STATES, it's a sidebar view;
if it's AMBIENT STATE, it's the status bar; if it's A VERB, it's in the palette.

## 3. Environment model (the re-scoping gesture)

Environments (mock): `Local` · `Container (devcontainer)` · `Remote (ssh)` · `Cloud VM` ·
`E2B sandbox`. One selection re-scopes three surfaces + two lists, visibly and audited:

- terminal: prompt/hostname/cwd + "re-attaching shell to <env>… ok"
- browser: session chip re-scopes (`partition:persist:ws-acme` → `session:e2b-9f2/ephemeral`)
  with a "re-scoping session…" transition
- agent thread: system line "environment changed → terminal + browser re-attached to <env>"
- resources: per-env rows activate/deactivate; status bar chip mirrors

Tree grounding — this is not invented: Agent Host providers already exist per environment
type: `src/vs/sessions/contrib/providers/agentHost/` (local, devcontainer) and
`src/vs/sessions/contrib/providers/remoteAgentHost/` (ssh, wsl, tunnel, websocket,
cloud-sandbox: `cloudSandboxAgentHostContribution.ts`), with terminal integration
(`src/vs/sessions/contrib/terminal/browser/agentHostSessionTaskRunner.ts`). Flauz's UX
work is to make the *current* scope visible everywhere at once (the mock's contribution).

## 4. State visibility model

| Object | States | Where surfaced |
|---|---|---|
| Task | queued · running · blocked-on-approval · done | sidebar Tasks (owner agent, evidence links), status bar count, palette |
| Agent phase | plan · execute · verify | phase chips in agent tile (mock), roster cards |
| Tool invocation | running… · ok (time) · blocked-approval | inline rows in agent thread w/ expand + evidence chips |
| Approval gate | pending · approved · changes-requested | gate card (Approve / Request changes / Add constraint), status bar "1 approval needed", palette jump |
| Resource | connected · standby · locked · per-env | Resources view rows |
| Evidence | captured · attached · verified | Evidence view rows w/ provenance (producer tool + agent + time), inline previews |
| Browser session | scope chip (workspace/ephemeral/per-agent isolated) | browser tile toolbar; status bar when agent-driven |

Provenance is first-class on evidence items (`shot-01.png — browser.screenshot · Agent A ·
14:31`) — the trust story for agent-produced artifacts (see open questions for TL).

## 5. Multi-model / multi-agent

- Per-agent model picker (dropdown grouped by provider incl. local) — in-tree:
  `src/vs/sessions/contrib/chat/browser/modelPicker.ts`.
- Parallel agent lanes as tabs in the agent tile (Agent A: claude-4.5-sonnet · Agent B:
  gpt-5.2) — maps to chat sessions / agent sessions (`agentSessionsPicker.ts`).
- Status bar shows aggregate ("◉ 2 agents · 1 approval needed") with jump-to.

## 6. First-run & empty states (no dead ends)

Every surface ships a designed empty state with ONE primary CTA (mock demonstrates all):
Agent → "Describe a goal…" + example chips; Browser → "Pick an environment, then open a
session" (+ `Open workspace session` ghost); Terminal → `Create terminal`; Editor →
`Open folder`; Tasks/Resources/Evidence → one-line empties. Welcome card states the
principle: "every surface is co-equal — start anywhere."

## 7. What the mock proves / does NOT prove

Proves (IA-level): co-equal grid readability at 1440px; env re-scoping is understandable
in one gesture; approval gates are legible inline; evidence provenance rows read well;
sidebar-vs-grid split avoids the giant-sidebar trap; all surfaces map onto EXISTING Code
OSS containers (mapping overlay in the mock cites the paths).

Does NOT prove: real data flow/perf, accessibility beyond basics, mobile, multi-monitor,
aux-window behavior, and visual design (this is a UX shell, not art direction).

## 8. Baseline guarantee

Stock Code OSS surfaces (explorer, search, SCM, run/debug, extensions, settings, notebooks
at `src/vs/workbench/contrib/notebook/`, auxiliary windows at
`src/vs/workbench/services/auxiliaryWindow/`) remain untouched and first-class — the Flauz
views are ADDITIONS to the activity rail and grid, not replacements. The mock shows the
baseline group literally (toast: "Baseline Code OSS surface — never regressed").
