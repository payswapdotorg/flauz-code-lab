# Flauz Wave 2 / Worker D — Security Model

**Scope:** the security posture required to ship Flauz = Code OSS + agent/workspace/
orchestration/resource/context + real browser + multi-model/multi-agent/multi-environment.

**Verification basis:** tree citations are from `payswapdotorg/Flauz` @
`9bf9ae764da438b1234a8243dc9e47173ef58ee7` (pristine mirror). Raw excerpts:
`evidence/d-license-security/03-security-substrate.md` + `04-browser-layers.md`
(product/licensing receipts: `01-source-and-extensions-licenses.md`, `02-product-boundaries.md`).
**This document corrects two Wave-1 assessments** (marked ⚠ below): the tree at this
commit is *substantially more agent-native than Wave-1 recorded* — the Agent Host Platform
(AHP) has its own permission engine, sandbox and steering, and workspace trust moved to
platform. "Flauz additions" are designs, not tree facts (per work order §3b.3).

**Reading key:** [T] = tree fact (cited); [W1] = Wave-1 finding (inherited); [F] = Flauz
design (proposed); [E] = external knowledge, reasoning aid only.

---

## 1. Threat model for an agent-native IDE

Assets: user's files & git history; credentials (auth sessions, tokens in SecretStorage,
agent-provider keys); the user's machine (terminal, filesystem, browser); cross-agent
state (workspaces, ledgers); the user's cloud accounts (model spend, tunnels); Flauz's
trust brand (signed extensions, evidence integrity).

Adversaries: malicious workspace content (the classic prompt-injection vector —
README/issues/markdown/notebooks read by agents); malicious *instructions inside tool
results* (web pages, search results, terminal output — indirect injection); malicious or
compromised MCP servers / extensions; compromised model endpoints; other agents (buggy or
adversarial) in shared workspaces; local network adversaries (exfil via browser/terminal).

### 1.1 Prompt injection (workspace files → agent context)

- **[T]** Agents ingest workspace files as context: prompt files
  (`extensions/prompt-basics`, `src/vs/workbench/contrib/chat/common/promptSyntax/`),
  notebook/README content as tool results, chat references. Any file text is model-bound
  instructions *unless* the pipeline marks provenance.
- **[T]** The AHP already models tool results as data channels: tool-call state carries
  `meta` (readToolCallMeta, `src/vs/platform/agentHost/common/meta/agentToolCallMeta.ts`)
  and the browser tools return page text to the model
  (`readPage` tool → `LanguageModelToolResult`).
- **[F] Flauz requirement:** provenance-tag every context fragment fed to models
  (file/tool/terminal/browser origin), treat untrusted-origin content as *data, never
  instructions*, and require human confirmation when a *write/execute* action is
  attributable to text that originated outside the workspace or the user
  (see §5 gates). This is the AccessSurface "intent attestation" input.

### 1.2 Tool abuse chains

- **[T]** Native tool surface: `lm.registerTool` + `LanguageModelTool`
  (`src/vscode-dts/vscode.d.ts`), MCP servers (`src/vs/workbench/contrib/mcp/`), AHP
  server tools (`src/vs/platform/agentHost/common/agentServerTools.ts`,
  `serverToolNames.ts`), terminal tools (`terminalToolIds.ts`), browser tools
  (§4). Chain examples: read README → "run this curl | sh"; browser reads page →
  "type your API key into this form"; terminal output → "now delete the evidence".
- **[T]** Terminal output is structured (shell integration; OSC 633 parser:
  `src/vs/platform/agentHost/node/osc633Parser.ts`) — good for provenance tagging.
- **[F]** Countermeasure: per-tool-class capability ceilings + argument policies (what a
  tool may do *regardless* of instructions), which is what the AHP permission taxonomy
  (§2.4) makes expressible — Flauz adds the *policy source* (workspace/user/org).

### 1.3 Exfiltration paths

- **[T]** Channels that exist today: terminal (network), browser (Agent-scope sessions with
  network filter — §4), `fetch` tools (filtered by the same service:
  `networkFilterService.ts:27-31` "filters network requests made by agent tools (fetch
  tool, integrated browser)"), MCP servers (arbitrary network by design), extension hosts
  (full network), remote/tunnel agents (SSH/WSL/tunnel agent hosts, agentHost common:
  `sshRemoteAgentHost.ts`, `tunnelAgentHost.ts`), clipboard (browser permission category
  `Clipboard`), and *the model providers themselves* (chat content leaves the machine).
- **[F]** Flauz requirement: a single egress policy point — all agent-attributable network
  goes through `IAgentNetworkFilterService`-style gates with per-agent, per-destination
  defaults (deny-by-default for secrets-adjacent contexts); secrets never enter model
  context (vault §3.4).

### 1.4 Agent-to-agent escalation

- **[W1]** No agent-to-agent messaging API (negative search, evidence/a-architecture/09) —
  *still true for the extension API*; **[T]** but the AHP has peer chats and subagents:
  `agentHostPeerChatStore.ts`, `agentPeerChats.ts` (node), `IAgentSubagent*Signal` +
  subagent signals (`agent.ts:884` region) and `agentMerge.ts` (merge of agent work).
  Agents now *can* spawn/review each other's work through AHP state.
- **[T]** Shared resources: working directories
  (`agentHostWorkingDirectories.ts`, create-time length guard per sessionPermissions
  comment), chat-editing working sets, the sessions database
  (`sessionDatabase.ts`, node), lockfile (`agentHostLockfile.ts`).
- **[F]** Flauz adds: agent identity is a first-class permission principal (agent A's
  grant ≠ agent B's grant); capability hand-off between agents must be monotone-
  decreasing (child agents cannot exceed parent capability); peer-chat merges require
  mutual-claim checks (§3.2).

### 1.5 Malicious extensions co-existing with agents

- **[T]** Extension attack surface: full API in ext host; proposed APIs gated by
  `checkProposedApiEnabled` (`extensions.ts:330-334`) + product
  `extensionEnabledApiProposals` (`product.ts:250`); marketplace-signing expectations
  (`extensionPublisherOrgs`, `trustedExtensionPublishers`, product.ts:176-177);
  `trustedExtensionAuthAccess` pre-grants (product.json:158-168 — an *enterprise-configured*
  auth pre-grant surface Flauz must re-own); webviews sandboxed as iframes with explicit
  sandbox attribute sets (`webview/browser/pre/index.html:1024-1032`:
  allow-same-origin/pointer-lock + conditional allow-scripts/downloads/forms).
- **[T]** Extension agents specifically: `extensionsAny`, `resolvers`,
  `environmentPower` are *proposed APIs* in the in-tree copilot extension — meaning agent
  capability amplification via extensions is exactly the privileged surface
  (`extensions/copilot/package.json#enabledApiProposals`).
- **[F]** Flauz rule: extensions that contribute agents/tools inherit the extension's
  trust level *as an upper bound*; untrusted extension + workspace-trust restrictions
  compose multiplicatively (§2.1 × §2.4).

---

## 2. Native security substrate (what the tree already gives us)

### 2.1 Workspace trust

- **[T] ⚠ Wave-1 correction:** trust now lives at
  `src/vs/platform/workspace/common/workspaceTrust.ts` (not the workbench contrib path of
  older trees): `IWorkspaceTrustEnablementService` (:33),
  `IWorkspaceTrustManagementService` (:41-62: `isWorkspaceTrusted`,
  `setWorkspaceTrust`, per-URI trust `get/setUrisTrust`, transition participants),
  `IWorkspaceTrustRequestService` (:77-95: open-files trust prompts, resource trust
  requests). Workbench wrapper: `src/vs/workbench/services/workspaces/common/workspaceTrust.ts`.
- **[T]** Product can force/virtualize trust per extension:
  `extensionUntrustedWorkspaceSupport` (product.ts:251) and the new
  `aiGeneratedWorkspaceTrust` product key (product.ts:274).
- **[F]** Flauz position: untrusted workspace ⇒ all Flauz agent capabilities degrade to
  read-only + confirmation-gated exactly like tasks/extensions do today. Trust boundary
  is the *outer* gate; AHP permissions are the *inner* gate.

### 2.2 Tool confirmation gates (workbench layer)

- **[T]** `src/vs/workbench/contrib/chat/browser/tools/languageModelToolsConfirmationService.ts`
  — auto-confirm store in three scopes: memory (session) → workspace store → profile
  store (`:100-130`), exposed as `ToolConfirmKind.LmServicePerTool` with
  `scope: 'session' | 'workspace' | 'profile'`; **combination-level** confirmations
  (tool **+ argument digest** — "Allow this particular combination of tool and arguments"
  `:351-370`) and **server-level** for MCP ("Allow all tools from this server"
  `:418-437`); plus *result-posting* confirmations ("Allow results from this tool to be
  sent without confirmation" `:472-516`).
- **[T]** `ToolConfirmKind` enum at
  `src/vs/workbench/contrib/chat/common/chatService/chatService.ts:847-854`:
  `Denied | ConfirmationNotNeeded | Setting | LmServicePerTool | UserAction | Skipped`;
  `ConfirmedReason` union :856-861.
- **[T]** Tools declare confirmations via `prepareInvocation`/`confirmationMessages`
  (`IToolData`/`IPreparedToolInvocation` in
  `chat/common/tools/languageModelToolsService.ts`; instance: navigateBrowserTool
  `confirmationMessages{title,message,allowAutoConfirm:true}`, §4).
- **[F]** Flauz maps HumanApproval onto this: one native gate (never bypass it), Flauz
  policy on *what may be pre-approved* (e.g. combination-scopes are the ceiling for
  irreversible tools; profile-scope requires org policy).

### 2.3 Tool risk assessment

- **[T]** `src/vs/workbench/contrib/chat/browser/tools/chatToolRiskAssessmentService.ts` —
  `IChatToolRiskAssessmentService` assesses tool calls into
  `ToolRiskLevel { Green, Orange, Red }` with a ≤140-char explanation (:19-33), LRU-cached
  (200), LLM-judged with rubric kinds `'terminal' | 'generic'` (:36-39), enabled by
  config (`ChatConfiguration.ToolRiskAssessmentEnabled`, default on per `!== false`
  :76-78), used by "the Autopilot risk gate" via `options.ignoreEnablement` (:41-43).
- **[F]** Flauz uses risk levels as policy inputs: Red ⇒ always HumanApproval;
  Orange ⇒ default-confirm; Green ⇒ combination-scoped auto-confirm allowed.

### 2.4 ⚠ Wave-1 correction — the AHP permission engine (AccessSurface largely exists)

Wave-1 recorded "AccessSurface: No (nearest: workspace trust)". At this commit the
**Agent Host Platform has its own per-session permission manager**:

- **[T]** `src/vs/platform/agentHost/node/sessionPermissions.ts` —
  `SessionPermissionManager.getAutoApproval` (:246-…; ordered-checks doc :238-244) evaluates, in order:
  0. **sandbox-bypass requests always escalate** (`requestSandboxBypass` →
     confirmation; `:257-261`);
  1. global auto-approve setting (`chat.tools.global.autoApprove`);
  2. session-level bypass;
  3. per-tool session permissions (`permissions.allow`);
  4. read-path rules (within working directories);
  5. write-path rules (working dirs + glob patterns,
     `DEFAULT_EDIT_AUTO_APPROVE_PATTERNS` / `ALWAYS_CHECKED_EDIT_PATTERNS` from
     `chat/common/chatSettings.ts`);
  6. shell command rules via tree-sitter-parsed `CommandAutoApprover`
     (`commandAutoApprover.ts`, `initialize()` loads WASM :196-201).
- **[T]** Permission taxonomy (`agent.ts:959`): `permissionKind ∈
  'shell' | 'write' | 'mcp' | 'read' | 'url' | 'skill' | 'custom-tool' | 'hook' | 'memory'
  | 'factory' | 'extension-management' | 'extension-permission-access' |
  'extension-env-access'` — a *complete AccessSurface vocabulary*, plus
  `permissionPath` for resource scoping, `managedApprovalRequired` (managed settings
  force UI confirmation; runtime sets it "for managed Shell, Read, Edit, and Domain
  selector asks" `:963-966`).
- **[T]** Hardening in the same file: `assertPathIsSafe` (:90-145: NTFS alternate-data-
  stream, reserved-device, 8.3-short-name, trailing-dot/space checks),
  `resolveRealPathForNonexistent` (:149-181: symlink-walk for not-yet-created paths),
  `PLATFORM_RESTRICTED_DIRS` (~Library, %APPDATA% writes require confirmation :66-77).
- **[T]** Managed settings floor: `agentHostManagedSettings.ts` /
  `agentHostManagedRules.ts` (common) reference the network filter settings
  (`sandboxConfigSchema.ts:7`) — enterprise can pin allow/deny domains.
- **[T]** Sandbox: `sessionSandbox.ts` — `ISessionSandboxPolicy { enabled; allowBypass }`
  resolves session overrides against a managed **policy floor** ("never a policy parser" —
  the projection comment, :15-44); bypass requires host opt-in via `sandbox.allowBypass`
  (`agent.ts:966-972`).
- **[F]** What's *missing* for Flauz (the real gaps): (a) a **cross-session/cross-agent
  policy source** (the engine is session-scoped; org/user policy, persisted, auditable);
  (b) **resource-graph-aware rules** (per-resource, not only per-path); (c) the evidence
  ledger integrity binding (§3.3). These are Flauz additions, layered on this engine —
  not replacements.

### 2.5 Secret storage & auth

- **[T]** `src/vs/platform/secrets/common/secrets.ts` (SecretStorage service surface) over
  `src/vs/platform/encryption/common/encryptionService.ts`
  (`IEncryptionMainService :15`) — OS-keychain-backed (Electron `safeStorage`) encrypted
  storage; auth sessions through `authentication.getSession`
  (`vscode.d.ts`) with per-provider consent; product-level pre-grants only from
  `trustedExtensionAuthAccess` (product.json:158-168).
- **[T]** Agent-provider auth is OAuth-Protected-Resource-shaped:
  `GITHUB_COPILOT_PROTECTED_RESOURCE` (agent.ts:360-366), provider advertise/require
  flags via `agentHostProtectedResourcesService.ts` (workbench contrib, agentSessions).
- **[F]** Flauz adds the **credential vault integration**: provider API keys (BYOK models
  exist natively — `agentHostByokLm.ts`, `agentModelByokMeta.ts` [T]) stored in
  SecretStorage, *referenced* by key in agent configs, never copied into model context,
  prompt logs, or the evidence ledger; ledger records hold key *ids* + digests only.

### 2.6 Extension enablement & proposed-API gating

- **[T]** `checkProposedApiEnabled` throws unless declared + enabled
  (`extensions.ts:330-334`); product key `extensionEnabledApiProposals` (product.ts:250)
  is the Flauz control point for which built-ins get which proposals (Wave-1 pending
  decision: posture). `extensionEnablementService.ts` consults `defaultChatAgent` /
  trust (`workbench/services/extensionManagement/browser/extensionEnablementService.ts`
  hits `defaultChatAgent`), so agent defaults interact with enablement.
- **[T]** The in-tree copilot extension's 64 proposals show the *shape* of privileged
  agent APIs (`defaultChatParticipant`, `chatParticipantPrivate`, `mcpServerDefinitions`,
  `resolvers`, `environmentPower`, `toolInvocationApproveCombination`, …).

### 2.7 Process model & sandboxes

- **[T]** Webviews: sandboxed iframes w/ explicit sandbox attribute sets
  (`webview/browser/pre/index.html:1024-1032`); webview content from external CDN
  template (product.json:39) — Flauz self-hosts (licensing doc §6).
- **[T]** Ext hosts: separate processes; affinity pinning (`extensions.experimental.affinity`
  [W1], verify still present at sync) for isolating the Flauz Agent Bridge ext host.
- **[T]** Agent host: its **own node process** (`agentHostMain.ts`, `agentHostServerMain.ts`,
  `nodeAgentHostStarter.ts`), state over typed protocol
  (`state/protocol/` — channels for chat/terminal/resource-watch/automation/changeset),
  with `agentHostLockfile.ts` for exclusive ownership, `sessionDatabase.ts` persistence,
  and headless terminal (`agentHostHeadlessTerminal.ts`).
- **[T]** Environment separation: dev-container/cloud-sandbox/SSH/WSL/tunnel agent hosts
  (`devContainerAgentHost.ts`, `cloudSandboxAgentHost.ts`, `sshRemoteAgentHost.ts`,
  `wslRemoteAgentHost.ts`, `tunnelAgentHost.ts` + workbench contrib
  `remoteAgentHost/` incl. `cloudSandboxReadOnlySessionHandler.ts` — read-only cloud
  sessions exist as a containment mode). SSH trust: `sshHostKeyTrust.ts`,
  `sshHostKeyPolicy.ts`, `sshKnownHosts.ts` (host-key pinning policy for agent SSH!).

---

## 3. Flauz additions (design)

### 3.1 AccessSurface policy engine (Flauz service)

Layered on the AHP permission manager (§2.4) — **not a parallel system**:
- **Principals:** user, org policy, agent (identity = AHP provider + session),
  extension, MCP server, workflow.
- **Decisions:** per (principal × tool-class (`permissionKind` vocabulary) × resource
  (URI/graph node) × action (read/write/execute/egress)) → allow / confirm / deny,
  with **confidence provenance** (was this auto-derived from a managed rule, a prior
  approval digest, or an explicit grant?).
- **Enforcement points** (all exist natively): AHP `getAutoApproval` (pre-exec),
  confirmation services (workbench UI), network filter (egress), browser driver gates
  (§4), sandbox bypass veto.
- **Defaults:** deny egress outside workspace+declared domains; confirm writes outside
  working dirs; confirm any `extension-env-access`/`extension-management`/`factory`
  permission; Red-risk (§2.3) always confirms.

### 3.2 Claims & leases (mutual exclusion)

- [T] Nearest native: chat-editing working set (claim-like, workspace), AHP lockfile
  (process-level), changeset subscriptions (`agentHostChangesetSubscriptionService.ts`).
- [F] Flauz Claim = (resource, holder-agent, mode exclusive/shared, TTL, human-approval
  ref). Lease acquisition is itself a permission-gated action. Conflict → native SCM
  merge machinery (W1 demotion decision). Ledger-recorded.

### 3.3 Evidence ledger integrity

- [T] Nearest native: AHP session database + `taskEventReplay.ts` + telemetry
  correlation (`agentTelemetryCorrelation.ts`) — append-only-adjacent but not tamper-evident.
- [F] Flauz ledger: append-only log of (decision, approvals, tool calls, results-digest,
  claim events) with **hash chain + periodic signed checkpoint** (key from user keystore,
  not a Flauz service key — the user owns the chain); replay = verification by re-deriving.
  Tool-result digests link to stored artifacts; nothing secret ever enters the chain (§2.5).

### 3.4 Approval persistence & agent-to-agent boundary policy

- [F] Persisted approvals = (agent, capability, resource-digest) tuples (W1 §4) — but now
  expressible natively as AHP session-permission entries + combination-digest confirmations
  (§2.2), so Flauz persistence = writing those stores with provenance + expiry; cross-agent
  visibility (agent B sees agent A's grants only as *facts*, never as *permissions*).
- [F] Environment escape containment: agent running in dev-container/cloud sandbox gets
  capabilities scoped to that environment; escape (SSH back to host, tunnel abuse) is an
  `environmentPower`-class permission on the *host* principal, default-confirm. Read-only
  cloud sessions [T: cloudSandboxReadOnlySessionHandler.ts] are the safe default tier.

### 3.5 Credential vault integration — see §2.5 [F]. Keys referenced, never materialized
outside SecretStorage; redaction filter on ledger/context pipelines
(`agentHostRestrictedTelemetry.ts` exists as precedent for restricted telemetry [T]).

---

## 4. Browser security hardening (formalizing Wave-1 Worker B)

**Wave-1 finding [W1]:** CDP-initiated navigations bypass `will-navigate`; `webRequest`
cancels content but the URL still commits. **Tree state at 9bf9ae764da** — the layered
defense, layer by layer:

| Layer | File:line | What it does | Status |
|---|---|---|---|
| L1 Driver-side pre-navigation gate | `src/vs/workbench/contrib/browserView/electron-browser/tools/navigateBrowserTool.ts` (`prepareToolInvocation` → `getBrowserNetworkPolicyError(params.url, agentNetworkFilterService)` throws **before** navigation; also `getResourceNavigationError` restricting to browser-page resources) + `browserToolHelpers.ts:226-242` (`getBrowserNetworkPolicyError`, `getExternalTunnelNetworkPolicyError` — rewritten tunnel URLs re-checked; localhost exempt) | The tool refuses to drive the browser to disallowed URLs | **[T] present** — this is the primary enforcement point for agent-initiated navigation |
| L2 webRequest filter | `src/vs/platform/browserView/electron-main/browserSession.ts:310-330` — `updateNetworkFilter()` installs `webRequest.onBeforeRequest` **on Agent-scope sessions only** (`storageScope === Agent` check), canceling any URL not allowed by `IAgentNetworkFilterService`; policy from `chat.agent.networkFilter` + allowed/denied domain lists (`src/vs/platform/networkFilter/common/networkFilterService.ts:26-35`: "When both domain lists are empty, all domains are denied… denied list always wins"; file URIs pass — § note) | Blocks subresources/fetches in agent browser sessions even if top-level commits | **[T] present**; ⚠ known gap [W1]: cancel ≠ rollback of committed top-level URL; only content is blocked |
| L3 will-navigate | `src/vs/platform/browserView/electron-main/browserView.ts:328-344` — `will-navigate`/`will-redirect` handlers `preventDefault()` **only for pinned-navigation redirects** (UX correctness), favicon bookkeeping otherwise | Would be a renderer-side nav gate; CDP-initiated navigations don't reliably hit it | **[T] present but NOT a security gate today** — by design, security lives in L1/L2/L4 |
| L4 Session partitions | `browserSession.ts:57-62,134-180` — partition IDs: `persist:vscode-browser` (global), workspace = `session.fromPath(<workspaceStorage>/browserStorage)` (path-backed, per-workspace), ephemeral `vscode-browser-${type}${viewId}`, **agent = `vscode-browser-agent-<sha256(identity)>` in-memory** (identity = affinity|workspace|window) | Blast-radius containment: cookies/storage/credentials never cross scopes; agent sessions are memory-only by default | **[T] present** |
| L5 Origin permissions | `src/vs/platform/browserView/common/browserPermissions.ts` — per-origin `PermissionStore` with categories (location/camera/mic/sensors/clipboard/notifications/devices), `'ask'` default (except sensors/devices 'allow'), `ALWAYS_ALLOWED_PERMISSIONS` = pointerLock/keyboardLock/fullscreen/clipboard-sanitized-write (:194-199), Electron permission-string mapping (:249-266), opaque-origin (`null`) excluded from grants (:277-299) | Site-settings model for the integrated browser | **[T] present**; electron-main authoritative instance + browserSessionPermissions.ts wiring |
| L6 file:// trust | `browserSession.ts:341-347` — session `protocol.handle(file)` serves only paths under `BrowserSession._trustedFileRoots` (TST match; 403 otherwise), `_trustAllFiles` escape hatch | Stops `file://` reads of arbitrary disk from web content | **[T] present** |
| L7 TLS trust | `browserSessionTrust.ts` (+ per-session cert-error memory, `getCertificateError` surfaced in navigation events, browserView.ts:358) | Per-session trusted-cert handling | **[T] present** |

**[F] Flauz hardening requirements on top:**
1. Treat L1 as the *only* authoritative agent-navigation gate (matches tree reality);
   add a **workspace-declared navigation allowlist** to the driver layer (policy source =
   AccessSurface §3.1), so L1 decisions are org/user controllable, not just user setting.
2. Close the L2 residual [W1]: after any committed navigation in an Agent-scope session,
   reconcile final URL against the filter; on violation, force `about:blank` + record a
   ledger event (evidence of attempt, even when blocked content never rendered).
3. Make `networkFilter` **default-on for agent sessions** with an explicit empty-list
   policy (current default: filter disabled ⇒ allow-all — `networkFilterService.ts:104-107`).
   Flauz product default flips this for Agent scope only (user browsing stays unfiltered).
4. Extend L4: agent identity should include *task/session UUID*, not just affinity/
   workspace/window, when Flauz runs concurrent agents in one workspace (per-agent cookie
   jars to prevent cross-agent session riding).
5. `file URIs … always pass` the network filter (:109-110 + isUriAllowed comment) —
   L6 covers browser file reads, but the **fetch tool** path needs the same trusted-root
   check Flauz-side; UNCERTAIN(question): does the fetch tool apply trusted-file-roots?
   Verify `tools/` fetch tool wiring at next pass; flag for TL.

---

## 5. Human-in-the-loop gates & steering

**The three-layer gate stack (Flauz mapping):**

| Gate | Native mechanism [T] | Flauz layer [F] |
|---|---|---|
| Outer | Workspace trust (§2.1): untrusted ⇒ everything degrades | Trust is inherited, not re-implemented |
| Native tool gate | Confirmation services (§2.2): combination/tool/server scopes × session/workspace/profile; `prepareInvocation` confirmationMessages; `allowAutoConfirm` opt-in per tool | Policy ceiling: which scopes an irreversible tool may be granted; Red-risk (§2.3) forces UserAction |
| AHP agent gate | `SessionPermissionManager` (§2.4): auto-approval ladder incl. sandbox-bypass escalation, managed-approval override, restricted-dir writes | **HumanApproval** = the *union* decision surfaced as one native confirmation with Flauz provenance (why asked, what scope, expiry); persisted to ledger (§3.3) |

**Mid-execution steering [T]:** `IAgentSteeringConsumedSignal`
(`agent.ts:1063-1068`: `kind: 'steering_consumed'`, chat, id) acknowledges steering
messages consumed by the model mid-turn; providers implement
`setPendingMessages` (`agent.ts:1247-1248`) to accept messages during an active turn;
subagent lifecycle signals (`IAgentSubagent*Signal`, `agent.ts:884`) let the host cancel/
resume children. **[F]** Flauz steering policy: any HumanApproval-pending state accepts
steering *and cancellation*; steering messages are ledger-recorded; steering cannot widen
capability mid-turn (policy re-evaluated on next tool call, not carried).

---

## 6. Risk register (top risks; L=likelihood, I=impact, 1-5)

| # | Risk | L | I | Mitigation | Owner |
|---|------|---|---|---|---|
| R1 | Prompt injection from workspace/tool content drives destructive tool call | 5 | 4 | Provenance tagging §1.1; combination-scoped confirmations (native); Red-risk gate; write-path rules (native) | Flauz (policy) on native gates |
| R2 | Agent browser exfil: committed-URL residual [W1] + filter default-off | 4 | 4 | §4 F1-F3: default-on filter for agent scope, post-commit reconciliation, driver allowlist | Flauz + upstream-fix upstreamable |
| R3 | Entitlement/credential sprawl: `trustedExtensionAuthAccess`-style pre-grants + BYOK keys leaking into context/ledger | 3 | 5 | §2.5 vault (keys referenced not copied); rewrite product pre-grants; restricted-telemetry-style redaction | Flauz |
| R4 | Malicious MCP server as tool-abuse proxy | 3 | 4 | Server-level confirmations (native §2.2); server identity pinning in AccessSurface; managed rules floor | Flauz + config |
| R5 | Agent-to-agent interference (working sets, shared browser session, lockfile races) | 3 | 3 | Claims/leases §3.2; per-agent browser partitions §4-F4; AHP lockfile as primitive | Flauz |
| R6 | Supply chain: proposed-API surface abuse by a built-in or gallery extension | 2 | 5 | `extensionEnabledApiProposals` pinning (Wave-1 decision); own gallery trust anchors (licensing doc §4); `trustedExtensionPublishers` allowlists | Flauz + upstream |
| R7 | Remote/cloud agent host escape (SSH/tunnel/container) | 2 | 5 | SSH host-key pinning [T: sshHostKeyTrust/Policy]; `environmentPower` default-confirm; read-only cloud tier default [T: cloudSandboxReadOnlySessionHandler] | Flauz + config |
| R8 | Ledger tampering invalidates evidence/audit trail | 2 | 3 | Hash-chained, user-key-signed checkpoints §3.3 | Flauz |
| R9 | Telemetry/CDN endpoints leak user data to MS infra in Flauz builds | 3 | 3 | Licensing doc §6 checklist (self-host webview CDN, strip voiceWsUrl/AppCenter/tasConfig); CI assert no MS endpoints | Flauz (build) |
| R10 | Sandbox bypass normalization (agents trained to ask for bypass) | 3 | 3 | Native: bypass always escalates (§2.4-0); Flauz: bypass grants are per-command, never session-scoped; ledger-audited | Flauz on native gate |

---

## 7. Wave-1 deltas recorded (for ARCHITECTURE-MAPPING.md owners)

1. **AccessSurface row 12** — "No (as a policy concept)" is stale: AHP
   `SessionPermissionManager` + permission taxonomy (§2.4) is a session-scoped policy
   engine; remaining Flauz gap is the *cross-session policy source + resource graph*.
2. **Workspace trust path** — now `src/vs/platform/workspace/common/workspaceTrust.ts`.
3. **Agent-to-agent** — "single-agent runtime only" is stale: peer chats, subagents,
   agent merge exist in AHP (§1.4); still no *extension-API* surface for it.
4. **Claim/Lease row 15** — AHP lockfile + changeset subscriptions are nearer analogs
   than Wave-1 recorded.
