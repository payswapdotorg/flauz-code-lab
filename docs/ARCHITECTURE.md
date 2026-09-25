Flauz Target Architecture (Wave 1 / Worker A)

**Flauz = Code OSS + Flauz agent/workspace/orchestration/resource/context capabilities

a real browser + multi-model/multi-agent/multi-environment capabilities.**

Ground truths: the IDE is one surface of the product, not the product; mature Code OSScapabilities are the baseline to keep; nothing is "just an extension" and nothing needs adeep fork by default — every capability gets an evidence-based home (seeARCHITECTURE-MAPPING.md; raw evidence in evidence/a-architecture/).

Concept diagram
flowchart TB  subgraph SHELL["Flauz Shell (product.json + branding + default profile)"]    direction LR    IDE["PILLAR 1 · IDE\n(editor, terminal, SCM, debug,\ntasks, notebooks, extensions)"]    AGENT["PILLAR 2 · AGENT OS\n(chat agents, lm, tools, MCP +\nFlauz runtime, memory, claims,\napprovals, evidence, skills)"]    WOS["PILLAR 3 · WORKSPACE OS\n(workspace, profiles, storage +\nresource graph, env registry,\ncollaboration, workflows)"]  end  ENV[["Environments dimension:\nlocal · remote SSH · containers · VMs ·\ncloud workspaces · E2B · tunnels"]]  BR[["Browser dimension:\nsimple-browser-style webview preview →\nFlauz real browser (CDP-driven) → devtools"]]  SVC[["Flauz Service (separate process)\nruntime · orchestration · claims/leases ·\nmemory · evidence · workflow store · policy"]]  BE[["Persistent backend state\nsessions · workflows · audit ledger"]]  IDE --> ENV  AGENT --> SVC --> BE  WOS --> SVC  IDE --> BR  AGENT --> BR


```
┌──────────────────────────────────────────────────────────────────────────────┐
│  FLAUZ CLIENT  = Code OSS shells (Electron main/browser) + product.json      │
├──────────────────────┬──────────────────────────────┬────────────────────────┤
│ PILLAR 1 · IDE       │ PILLAR 2 · AGENT OS          │ PILLAR 3 · WORKSPACE OS│
│ (keep, never regress)│ (native substrate + Flauz)   │ (native + Flauz)       │
├──────────────────────┼──────────────────────────────┼────────────────────────┤
│ editor/LS            │ chat agents/participants     │ workspace services     │
│ terminals            │ vscode.lm models             │ profiles               │
│ git/SCM              │ lm.registerTool tools        │ storage/Memento        │
│ debug                │ MCP servers/clients          │ tasks/launch           │
│ tasks                │ chat editing sessions        │ SCM resources          │
│ notebooks            │ sessions / Agent Host [V]    │ search                 │
│ extensions           │ ── Flauz adds ──             │ ── Flauz adds ──       │
│ remote/dev containers│ runtime+orchestration (svc)  │ resource graph (svc)   │
│ accessibility        │ memory (svc)                 │ claims/leases (svc)    │
│                      │ approvals+evidence (svc)     │ env registry (svc)     │
│                      │ skills, workflows (svc+files)│ collaboration (svc)    │
└──────────────────────┴──────────────────────────────┴────────────────────────┘
        Environments dimension ↕ (local/SSH/containers/VMs/E2B/cloud/tunnels)
        Browser dimension ↕ (webview preview → real CDP browser → devtools)
[V] = symbol named in recent upstream commits; verify with command in evidence INDEX.
```

Pillar 1 — IDE

Code OSS provides (baseline, keep): editor + LSP, terminals (incl. shell-integration
API), git/SCM, debug (DAP), tasks, notebooks, extension platform, remote/dev-container
machinery, accessibility. Evidence: src/vs/workbench/contrib/{notebook,terminal,tasks,scm,debug}/,
src/vscode-dts/vscode.d.ts.
Flauz adds: nothing that regresses the above; product flavor only — branding/product.json,
default profile, contributes.configurationDefaults for layout/UX defaults.
Home: product.json (UPSTREAM-DIVERGENT but config-only) + built-in extension
extensions/flauz-defaults (UPSTREAM-SAFE/FRIENDLY). No core patch.

Pillar 2 — Agent OS

Code OSS already provides (agent-era tree): chat participants/agents
(chatAgents.ts, extHostChatAgents2.ts), Language Model API (vscode.lm), tool API
(lm.registerTool, LanguageModelToolCallPart), MCP (src/vs/workbench/contrib/mcp/),
edit-tracked multi-file sessions (chatEditingService.ts), chat modes/tool loop, model
picker UI; sessions/Agent Host infra reported in recent commits [VERIFY].
Flauz adds: multi-agent orchestration, long-term memory, claims/leases, human-approval
ledger + evidence trail, skills, reusable workflows, agent-to-agent boundaries, model
routing policy across vendors (Codex, Claude, Qwen, Muse, Copilot, local).
Home: Flauz service (separate process) owns stateful runtime; a built-in Agent
Bridge extension (affinity-pinned ext host process) owns all vscode.* surface.
See AGENT-INTEGRATION.md for the process-model decision and invocation path.

Pillar 3 — Workspace OS

Code OSS provides: workspace services, user-data profiles (settings/exts/UI per
profile), storage (IStorageService, Memento), tasks/launch, SCM model, search.
Flauz adds: workspace-as-resource graph (files + non-file resources in one addressed
model), environment registry, claims/leases over resources, collaboration (multi-user +
multi-agent co-presence), workflow store.
Home: Flauz service + persistent backend state; surfaced through native extension
points (SCM decorations, custom editors, tree views).

Environments dimension

ENVIRONMENT
	
MECHANISM TODAY
	
FLAUZ ADDITION

local	native workbench	—
remote SSH/VM	Remote authority + src/vs/server/ (server in-tree); Remote-SSH ext is proprietary → ship OSS equivalent	Flauz remote provider extension
containers	devcontainer tooling (proprietary upstream ext, not in tree)	Flauz OSS container provider via registerRemoteAuthorityResolver
cloud workspaces / E2B / other providers	same resolver API + tunnels (cli/src/tunnels/)	Flauz Environment Registry (service) + provider extensions; catalog UI

Home: extension API surface (resolvers) + Flauz service for the registry. No fork.

Browser dimension

v1: webview-based real preview — precedent in tree: extensions/simple-browser/
(built-in webview browser). Home: built-in extension. UPSTREAM-SAFE.
v2: Flauz real browser = headless Chromium controlled via CDP by the Flauz service,
rendered in webview/custom-editor surfaces; network/console/devtools data becomes
resources + tool results. Home: Flauz service + extension. No fork.
Only a top-level, non-webview browser surface would be FORK-CRITICAL — explicitly
demoted in UPSTREAM-STRATEGY.md unless TL signs off.

Where things live — decision rules

CHOICE
	
WHEN
	
UPSTREAM CLASS

product.json / branding	always	UPSTREAM-DIVERGENT (config-only)
built-in extension extensions/flauz-*	anything needing vscode.*	UPSTREAM-FRIENDLY
new contrib dir src/vs/workbench/contrib/flauz/	workbench-integrated UI/service plumbing, additive	UPSTREAM-FRIENDLY
Flauz service (separate process)	stateful, long-lived, cross-surface, multi-user	external (best)
core patch under src/vs/**	only with TL sign-off; ledgered FORK-CRITICAL	FORK-CRITICAL (target: empty)


```

```
