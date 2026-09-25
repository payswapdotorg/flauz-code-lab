# Flauz Decision Log

**Owner**: TL#2 (tech lead/orchestrator). Format: each decision cites the worker inputs it adjudicates (D-#, evidence refs), the options, the ruling, and its reversibility class (EASILY-REVERSED / CONFIG / STRUCTURAL). No `src/vs` divergence without an entry here (per D-10 ruling).

Wave-1 inputs adjudicated: Worker A (`docs/ARCHITECTURE-MAPPING.md`, `docs/AGENT-INTEGRATION.md`, `docs/UPSTREAM-STRATEGY.md`), Worker B (`docs/BROWSER-ARCHITECTURE.md`, `docs/UX-ARCHITECTURE.md`, `docs/PROTOTYPE-RESULTS.md`), Worker C (`docs/CODE-OSS-INTEGRATION-MATRIX.md`, `docs/DECISION-LOG-INPUTS.md` D-1..D-10).

---

## DL-1 — Foundation: leverage, don't rebuild (D-2/D-4/D-10; A leverage list; B verdict)

**Ruling**: Flauz is built ON the agent-native Code OSS tree (Agent Host Platform, MCP core, CDP browser, chat editing, sessions), not parallel to it. Flauz's product surface = orchestration, workspace/evidence state, multi-vendor neutrality, UX.

**Evidence**: three independent Wave-1 workers converged on the same reading of the tree @ 9bf9ae764da (A's leverage-vs-parallel list; C's headline + EV-02; B's browser verdict).

**Class**: STRUCTURAL.

## DL-2 — Attribution: the agent-era infra is upstream (B Q1)

**Ruling**: B's open question ("is the browserView/sessions/AgentHost stack upstream or pre-existing patching?") is answered by TL verification: payswapdotorg/Flauz is a byte-level pristine mirror of microsoft/vscode main @ 9bf9ae764da (166,026 commits, zero divergence, stock README/product.json, single branch; upstream ls-remote cross-checked). Everything the workers found IS upstream code. Upstream tracking is therefore clean: there is no hidden patch layer to reconcile.

**Class**: STRUCTURAL (fact record).

## DL-3 — Default chat agent: own participant, not a copilot fork (D-2)

**Ruling**: adopt C's recommendation (b): Flauz ships its own chat participant on the stable `vscode.chat`/`vscode.lm` APIs, with AHP's Claude/Codex providers plus lm vendor adapters for the rest. The in-tree MIT copilot extension remains reference-only. This decouples the product from `copilot_internal` entitlements (C's B-01) and preserves multi-vendor neutrality (charter).

**Evidence**: D-2 (EV-01 §6, EV-02 §1); A's "build ON native participants" finding.

**Class**: EASILY-REVERSED at this stage (no code yet), STRUCTURAL once Wave-3 code lands.

## DL-4 — Proposed-API posture: enable-for-built-ins, zero promotion (D-3)

**Ruling**: Wave 1–2 run with proposed APIs enabled per-extension via `extensionEnabledApiProposals` (product.json), with an upstream-churn tracking rota (the d.ts relocation proves churn is real). API promotion (F-02) is deferred until Flauz must publish a stable third-party API. Rationale: keeps FORK-CRITICAL = 0.

**Evidence**: D-3; A's UPSTREAM-STRATEGY (proposed-API gating row); C's F-02 conditional.

**Class**: CONFIG.

## DL-5 — Orchestration backbone: AHP semantics + Flauz service (D-4; A hybrid model)

**Ruling**: combine A's hybrid process model with C's AHP adoption: the Flauz orchestrator adopts AHP semantics (providers, subagents, steering, changesets, automations) and presents itself as (1) an Agent Bridge built-in extension pinned to its own extension-host process via `extensions.experimental.affinity` for all `vscode.*` surface, backed by (2) the Flauz Core service (separate process) owning stateful orchestration, memory, claims/leases, approvals persistence, evidence ledger. Escalation to F-03 (AHP protocol changes) only if U-2 (provider extensibility) closes negatively.

**Evidence**: A AGENT-INTEGRATION (option D hybrid); D-4 (EV-02; U-2/U-3).

**Class**: STRUCTURAL.

## DL-6 — Browser: in-tree dual-track + layered security gates (D-5; B verdict; B Q2)

**Ruling**: desktop ships the in-tree WebContentsView browser (browserView contrib + agent tools) with per-workspace session partitions; web/cloud builds use the Playwright backend (platform/browserView/node/playwrightService.ts) as the standard component. Webview/iframe is DISQUALIFIED as the browser surface (B's live SecurityError probes). B's hardening finding is adopted as a requirement: layered navigation gates (driver-side allowlist + webRequest + will-navigate + session partitions), since CDP-initiated navigations bypass will-navigate alone. Wave-2 Worker D formalizes this into SECURITY-MODEL.md.

**Evidence**: B PROTOTYPE-RESULTS + BROWSER-ARCHITECTURE; D-5 (EV-04, EV-11 N-9).

**Class**: STRUCTURAL.

## DL-7 — Gallery & remote extensions: Open VSX default + own resolver category (D-1/D-7)

**Ruling**: ship `extensionsGallery` data-driven in product.flauz.json with Open VSX as default; make "remote/environment provider" a first-class Flauz extension category built on the resolver API blueprint (vscode-test-resolver in-tree reference). MS marketplace and MS Remote-SSH/Dev-Containers extensions stay out (license-blocked for non-VS-Code products). Worker D's licensing review will validate or amend this entry.

**Evidence**: D-1 (EV-11 N-1, EV-10 §1); D-7 (EV-07 §2).

**Class**: CONFIG.

## DL-8 — Cloud environments: Flauz contrib on resolvers + AHP (D-6)

**Ruling**: build the Flauz sandbox/environment contrib against the resolver API + AHP RemoteProxy (E2B and own infra as provider extensions); treat the in-tree Microsoft cloudSandbox services as reference implementation only (entitlement-coupled).

**Evidence**: D-6 (EV-02 §5, EV-07 §1/§4).

**Class**: STRUCTURAL.

## DL-9 — Persistence: hybrid storage with `.flauz/` shareable artifacts (D-9)

**Ruling**: private agent state in editor storage (workspaceStorage/Memento); shareable artifacts (evidence, workflow envelopes, memory snapshots) in workspace-committed `.flauz/` — portable across machines and environments, git-diffable.

**Evidence**: D-9 (EV-08; sessions 5/6 continuity).

**Class**: EASILY-REVERSED (a directory convention) but STRUCTURAL for artifact formats.

## DL-10 — Workflow envelope: compose prompt files + tasks + automations (D-8)

**Ruling**: the canonical "saved workflow" is a Flauz envelope (workspace-committed, git-diffable) composing `.agent.md`/`.prompt.md` files + tasks.json fragments + AHP automation triggers. Authoring UI is Wave-2+ scope; Worker E's agent-task-state prototype rehearses the state shape.

**Evidence**: D-8 (EV-09).

**Class**: STRUCTURAL.

## DL-11 — Upstream sync cadence: monthly while divergence=0, weekly when >0 (A vs C adjudication)

**Ruling**: A recommended weekly rebase; C recommended monthly while divergence stays zero. Adjudication: **monthly while `src/vs` divergence = 0** (current state — nothing to rebase but the mirror); **weekly rebase of `flauz/main` onto upstream/main once real divergence lands**. Monthly tag snapshots either way. CI canaries on C's ⚠-gated rows (C-20/C-23/C-24/C-28) run at every sync.

**Evidence**: A UPSTREAM-STRATEGY sync mechanics; D-10.

**Class**: CONFIG.

## DL-12 — Repo strategy: main stays pristine mirror; flauz/main integration branch (A)

**Ruling**: adopt A's structure verbatim: `main` = pristine upstream mirror (never committed to directly), `flauz/main` = integration branch carrying all Flauz divergence, product identity in `product.flauz.json` (build-time overlay, never conflicts with upstream's product.json). FORK-CRITICAL ledger target: zero entries; any candidate requires a decision-log entry + demotion alternative (A's ledger discipline).

**Evidence**: A UPSTREAM-STRATEGY; D-10.

**Class**: STRUCTURAL.

## DL-13 — AccessSurface granularity (A Q3)

**Ruling**: per-tool × per-agent × per-resource is the target model, implemented as Flauz Core policy layered on native gates (workspace trust outer ring, tool confirmation middle ring, Flauz per-resource claims inner ring). Worker D's SECURITY-MODEL.md carries the formal design; precision of the triple-axis model is deferred to that review.

**Class**: STRUCTURAL (deferred detail).

## DL-14 — Multi-user collaboration scope (A Q5)

**Ruling**: NOT in Wave-1..3 scope. It is the only pillar with residual fork risk if pushed into editor core (A's demotion table). Multi-AGENT collaboration IS in scope (AHP subagents + Flauz orchestration). Multi-USER co-presence re-enters planning only with explicit operator demand.

**Class**: EASILY-REVERSED (scope decision).

## DL-15 — Wave-1 prototype verdicts (B; charter's 8 prototypes)

**Ruling**: charter prototypes #1/#2/#4/#5/#7 (native surface, agent surface, browser integration, terminal+agent coexistence, environment selection) are SATISFIED by B's four prototypes + UX mock (browser-verified golden path incl. env re-scoping and approval gates). Prototypes #3 (model/provider fabric) and #6 (task/agent state integration) are assigned to Worker E (Wave 2) as small zero-install demos. #8 (architecture-objects mapping) is satisfied by A's 27-abstraction mapping table (docs-as-proof).

**Class**: record.
