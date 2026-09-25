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

---

# Wave-3 Adjudication (TL#2, 2026-09-25/26 — first PRODUCT CODE wave)

Inputs adjudicated: Worker F (`wave3/f-agent-bridge` REPORT.md — Agent Bridge + flauz-models + product.flauz.json overlay; 56 A / 0 M / 0 D, tsc x2 green, node --test 26/26 + 12/12 + 5/5), Worker G (`wave3/g-workspace-evidence` REPORT.md — .flauz/ envelope + evidence ledger; 22 new files, tsc green, 55/55 tests), Worker H (`wave3/h-perf-ci` REPORT.md — CI harness; 69 files, 29/29 fixture matrix, YAML 4/4, FORK-CRITICAL FAIL-proven). Lane branches live on the mirror (payswapdotorg/Flauz: wave3/f-agent-bridge @ 8bbc49d, wave3/g-workspace-evidence @ 26474ff, wave3/h-perf-ci @ 52ec6dd; base 9bf9ae764da). Both F and G deliveries are sandbox-reset REBUILDS (platform re-image 2026-09-25T17:39:54Z destroyed the original runs; the rebuilds used the surviving worklogs as complete design records — zero design drift reported). Proposal numbering below is the TL's unified renumbering of the three lanes' independent DL-16+ drafts.

## DL-16 — product.flauz.json overlay merge semantics (F-DL16)

**Ruling**: adopt F's implemented semantics as normative: strict-JSON recursive merge; `null` DELETES the key (this is the mechanism that disables the Copilot default-agent block); objects merge recursively; arrays REPLACE (never concatenate); unknown keys warn; output tab-indented. The merger (`build/flauz/merge-product.mjs`) is the single implementation, with its 5-test suite as the contract pin.

**Evidence**: F REPORT §WHAT-BUILT (merge-product.mjs), §PRODUCT-KEYS (`defaultChatAgent: null` with chatEntitlementService.ts:458-460 master-gate citation).

**Class**: STRUCTURAL (build-time contract).

## DL-17 — `identifier` is not a product key: dropped (F-DL17)

**Ruling**: the work-order v0 spec listed `identifier`; F's recon found no such key in IProductConfiguration and zero consumers. Dropped from the overlay spec. The overlay carries nameShort/nameLong/version + the two mechanism keys below.

**Evidence**: F REPORT §PRODUCT-KEYS row (W3-F-r1 grep: no field, no consumer).

**Class**: EASILY-REVERSED (spec text).

## DL-18 — `version` stamping conflict: CI reconciles (F-DL18)

**Ruling**: `version` in the overlay conflicts with the build's package.json-derived stamp (gulpfile.vscode.ts:198-205). Keep the overlay value as the identity source; the CI hygiene job must reconcile (stamp from overlay) or fail loudly. H's lane owns the assertion.

**Evidence**: F REPORT §PRODUCT-KEYS version row; §DECISION-LOG-PROPOSALS.

**Class**: CONFIG.

## DL-19 — extensionEnabledApiProposals is the sole proposal grant for flauz built-ins (G-DL16 + F implementation)

**Ruling**: built-ins get proposed APIs ONLY via the product allowlist (extensionsProposedApi.ts:42-55; the product list REPLACES the extension's own declaration, :80-102). v0 grants: `"flauz.flauz-agent": ["defaultChatParticipant", "chatParticipantAdditions"]` (the statically-contributed isDefault participant parses only under these — chatParticipant.contribution.ts:268-321) and `"flauz.flauz-workspace": ["scmArtifactProvider"]`. G's fail-fast-at-startup proposal is adopted as a CI-side assertion (activation-lint + rota already inventory the union; a product-key cross-check belongs in the hygiene job), NOT a runtime behavior change.

**Evidence**: G REPORT §DECISION-LOG-PROPOSALS DL-16 (product.ts:250 field declaration); F REPORT §PRODUCT-KEYS extensionEnabledApiProposals row.

**Class**: CONFIG.

## DL-20 — Evidence ledger v0 scope: hash-chain only (F-DL19 + G-DL18, merged — lanes converged)

**Ruling**: both lanes independently proposed identical scope: v0 ships the sha256 hash chain (row hash over canonical 7-field JSON, never stored; next row's `prev` carries it; `verifyLedger` reports `firstBadSeq` across tamper classes); signatures/keys AND the persisted ledger-size watermark (truncated-tail detection) are the Wave-4 SECURITY-MODEL §3.3 hook. Known v0 limitation recorded: last-row tamper is only visible via the caller's known sha256.

**Evidence**: F REPORT §DECISION-LOG-PROPOSALS DL-19 + DEVIATIONS 7; G REPORT §LEDGER-V0-SCOPE + DL-18.

**Class**: STRUCTURAL (artifact format).

## DL-21 — Seam contract v0 interpretation canonized (F-DL20 + G deviations, merged — lanes converged)

**Ruling**: the F/G §4 seam contract is closed under these interpretations, identical in both implementations: (1) `fail` is legal ONLY from `execute` (the "any-active" clause covers `cancel` alone); illegal events are rejected with allowed source statuses listed, actor validation AFTER state validation. (2) Envelope serialization is fully canonical (sorted keys, 2-space, trailing newline, atomic tmp+rename) — required by DL-9 git-diffability. (3) Additive 8th command `flauz.workspace.openEvidence` (SCM artifacts need a command; the 7 contract commands match exactly). (4) Evidence ids `E-NNNNNN` (6-digit zero-pad). (5) Artifacts dir `.flauz/artifacts/<taskId>/`, workspace-relative POSIX URIs. (6) createCheckpoint decision matrix: `attested` (caller-held stopId from ChatResultStream.externalEdit — reachable at HEAD), `blocked` (null ref + gap row — out-of-band create/restore unreachable), `verified` documented-unreachable; never hacked around. (7) Non-transition events append freely.

**Evidence**: F REPORT §CONTRACT-DEVIATIONS 1-7; G REPORT §CONTRACT-DEVIATIONS 1-8; both lanes' test suites pin every clause.

**Class**: STRUCTURAL (the vertical-slice contract).

## DL-22 — chatEditing out-of-band snapshot API: promotion deferred (G-DL17)

**Ruling**: G's proposed extHost surface (`createChatEditingSnapshot(scope) → {stopId}` / restore / info) is an F-02-class promotion: correctly designed, DEFERRED until a Flauz feature actually needs out-of-band checkpoints (verify-fail rollback, evidence UI). Until promotion, DL-21's blocked-path contract governs. Re-evaluate at the first sync after Wave-4 planning.

**Evidence**: G REPORT §DECISION-LOG-PROPOSALS DL-17 (chatEditingSession.ts:386-423; extHostChatAgents2.ts:316-330; mainThreadChatAgents2.ts:495).

**Class**: EASILY-REVERSED (posture; no code).

## DL-23 — Extension-host mark forwarding: best-effort accepted for v0 (F-DL21)

**Ruling**: the bridge emits `code/flauz/*` marks synchronously; the host's forwarding (extHostExtensionService.ts:647-649 → timerService.ts:617-623, code/-prefix filter) has no guaranteed flush at process exit — accepted as best-effort for v0. H's startup-pair mark-pair integrity check (emit sites greppable in source) is the drift guard.

**Evidence**: F REPORT §DECISION-LOG-PROPOSALS DL-21; H startup-pair.mjs mark-pair integrity.

**Class**: CONFIG.

## DL-24 — Perf-pair runner class + N (H-DL16)

**Ruling**: pin `ubuntu-24.04` (not `ubuntu-latest`) and N=10 nearest-rank (p50 = 5th, p95 = max); deltas stay the portable contract, absolutes only meaningful per runner class. Optional N=20 at monthly sync checkpoints.

**Evidence**: H REPORT §DECISION-LOG-PROPOSALS 1.

**Class**: CONFIG.

## DL-25 — Flauz CI gating paths (H-DL17)

**Ruling**: exactly `extensions/flauz-*/**`, `build/flauz/**`, `product.flauz.json`, `.github/workflows/flauz-*` (+ `workflow_dispatch`). Additions (e.g. `.flauz/**`) require a decision-log entry.

**Evidence**: H REPORT §DECISION-LOG-PROPOSALS 2 (uniform across all four workflows).

**Class**: CONFIG.

## DL-26 — Skip-vs-fail merge-window policy (H-DL18)

**Ruling**: zero-dep gates SKIP (recorded, greppable) while lanes F/G are unmerged so CI stays green through the Wave-3 merge window; the sync runbook flips `--require*` at the first `flauz/sync/<date>` tag AFTER lane F lands.

**Evidence**: H REPORT §DECISION-LOG-PROPOSALS 3.

**Class**: CONFIG.

## DL-27 — Memory capture contract (H-DL19)

**Ruling**: §3.2 CI assertions accept three interchangeable capture shapes (resolveProcesses JSON [em in MB], `--status` text, ps text); a lane-F dump command may supersede ps without changing the assertion layer. Recorded converter hazard: Linux `ProcessItem.mem` is percent-of-total (apply totalmem).

**Evidence**: H REPORT §DECISION-LOG-PROPOSALS 4 (diagnosticsService.ts reference).

**Class**: CONFIG.

## DL-28 — GITHUB_TOKEN narrow exception: deferred, flagged (H-DL20)

**Ruling**: NOT decided now. The no-secrets policy stands; if an upstream sub-step of the compile&hygiene line ever hard-requires it, propose a narrow auto-token read-only exception as a new entry — never widen silently.

**Evidence**: H REPORT §DECISION-LOG-PROPOSALS 5.

**Class**: record (flagged).

## Post-Wave-3 facts entered into the record

1. **product.json @ 9bf9ae764da has NO `extensionsGallery` key** (46 top-level keys — F verified during the rebuild; the Wave-3 work-order assumption was wrong). Amends DL-7's premise: the gallery ships ONLY via the overlay; F's merger test 4 pins the actual posture as a tripwire.
2. **Default-agent mechanism verified end-to-end in code**: no product key selects the default agent — it is a statically-contributed `isDefault` participant (gated on the defaultChatParticipant proposal, force-enabled per DL-19) + `defaultChatAgent: null` deletion (DL-16) disabling the Copilot setup/entitlement machinery (chatEntitlementService.ts:457-460), leaving `flauz.agent` the sole default via `_preferExtensionAgent` (chatAgents.ts:458-484). U-1 canary checklist D1-D11 carries the closure statuses.
3. **Wave-3 exit criteria met**: golden path with HumanApproval gate green in both seam implementations (F orchestrator test; G state-machine suite); FORK-CRITICAL ledger EMPTY on all three branches (verified by TL from the harvested bundles against the local pristine mirror); product keys → this adjudication; U-1/C-20 closure spec delivered (F canary checklist + H canary workflows).
