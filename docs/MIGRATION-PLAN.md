# Flauz Migration Plan — from investigation to product

**Wave 2 / Worker E.** Scope: the program's path from the Wave-1/2 investigation (flauz-code-lab) to the payswapdotorg/Flauz product: repo strategy, directory layout, wave roadmap, prototype promotion, CI/checkpoint strategy, and team workflow.

**Inputs adjudicated**: TL's DECISION-LOG (DL-1..DL-15, branch `tl/decision-log`), Worker A (`docs/UPSTREAM-STRATEGY.md`, `docs/ARCHITECTURE.md`, `docs/AGENT-INTEGRATION.md`), Worker B (`docs/BROWSER-ARCHITECTURE.md`, `docs/PROTOTYPE-RESULTS.md`), Worker C (`docs/CODE-OSS-INTEGRATION-MATRIX.md`, `docs/DECISION-LOG-INPUTS.md` D-1..D-10), Worker E (this wave: `docs/PERFORMANCE-PLAN.md`, prototypes #3/#6). Tree evidence: `evidence/e-perf-migration/` (this branch) + Wave-1 evidence dirs.

**Ground truth**: the tree at `9bf9ae764da` is agent-native (AHP, MCP core, CDP browserView + 12 agent browser tools, chat-editing checkpoints, sessions) and FORK-CRITICAL = 0 (C's matrix: 3 conditional fork rows F-01..F-03, 2 blocked rows B-01/B-02 — none needed for Waves 3-5 scope).

---

## 1. Repo strategy (adjudication: A's structure vs C's cadence)

**Recommendation — adopt A's structure verbatim (already ruled DL-12) and C's cadence condition (already ruled DL-11); the two are compatible and together form the operating model:**

| Question | Ruling | Source |
|---|---|---|
| Branch topology | `main` = pristine upstream mirror (never committed to directly); `flauz/main` = integration branch carrying ALL Flauz divergence | A UPSTREAM-STRATEGY; **DL-12** |
| Product identity | `product.flauz.json` build-time overlay (never conflicts with upstream's `product.json` — product.json is a build input, not code) | A; C EV-10 §1-2; **DL-12** |
| Sync cadence | **monthly while `src/vs` divergence = 0** (today: nothing to rebase but the mirror); **weekly rebase of `flauz/main` onto upstream/main once real divergence lands**; monthly tag snapshots either way | C D-10; **DL-11** |
| Sync style | rebase-based, not merge-based (keeps Flauz commits reviewable, conflicts local) | A |
| Conflict strategy | `product.flauz.json` → never conflicts (separate file); `extensions/flauz-*`, `contrib/flauz/` → additive, no conflicts; any ledgered core patch → owner must carry an upstream-issue link or demotion plan within 2 syncs | A |
| Divergence policy | **No `src/vs` divergence without a DECISION-LOG entry** (target: FORK-CRITICAL ledger empty) | C D-10; **DL-10** |

**Adjudication note (the work order asked me to weigh A-weekly vs C-monthly)**: A's weekly cadence assumed divergence exists; C's monthly cadence assumed zero divergence. The TL's DL-11 already resolves this correctly as a *conditional*: monthly-while-zero is strictly cheaper (there is literally nothing to rebase while `flauz/main` is upstream + additive dirs), and the moment Wave-3 code lands, weekly windows become the discipline that keeps rebase conflicts small. **Concur with DL-11; operationalize it**:

- Monthly sync runbook (divergence=0): fetch upstream → fast-forward mirror `main` → verify `flauz/main` = `main` + additive-only diff → run canaries (§5) → tag `flauz/sync/<date>`.
- Weekly rebase window (divergence>0): freeze merges Mon–Tue → rebase `flauz/main` → full CI → tag → unfreeze. Conflicts beyond ½ day escalate to TL with a demotion-alternative proposal (A's ledger discipline).

---

## 2. Directory layout for Flauz additions

Everything Flauz adds lives in **additive** locations; `src/vs/**` stays byte-identical to upstream except (worst case) the single additive dir `src/vs/workbench/contrib/flauz/` (A's UPSTREAM-FRIENDLY class), which itself requires a DECISION-LOG entry to use.

```
flauz/main  (= upstream/main + additive paths only)
├── product.flauz.json              # BUILD-TIME OVERLAY (UPSTREAM-DIVERGENT, config-only):
│                                   #   nameShort/name/identifier/version quality
│                                   #   extensionsGallery → Open VSX (DL-7) + own registry later
│                                   #   extensionEnabledApiProposals → flauz-* built-ins (DL-4)
│                                   #   defaultChatAgent → flauz.agent participant (DL-3, C-20)
│                                   #   telemetry endpoints; crashes keys (own)
├── extensions/
│   ├── flauz-agent/                # Agent Bridge built-in (DL-5): chat participant, tool
│   │                               #   registration, AHP client, affinity-pinned ext host
│   │                               #   (extensions.experimental.affinity: {"flauz.agent-bridge": 1})
│   ├── flauz-models/               # vendor pack: lm providers (registerLanguageModelChatProvider —
│   │                               #   vscode.d.ts:20844-20851) + pricing metadata
│   │                               #   (languageModelPricing.d.ts field names — evidence 08)
│   ├── flauz-workspace/            # .flauz/ envelope: tasks.json, evidence ledger writer,
│   │                               #   SCM artifact provider (scmArtifactProvider.d.ts, evidence 09)
│   ├── flauz-sandbox/              # environment providers: resolvers (registerRemoteAuthorityResolver)
│   │                               #   + AHP RemoteProxy bridge (Wave 4; C-33, DL-8)
│   └── flauz-defaults/             # contributes.configurationDefaults: layout/UX defaults,
│                                   #   watcherExclude additions, provider gates (perf plan §1.2)
├── src/vs/workbench/contrib/flauz/ # ONLY if workbench-integrated UI plumbing is unavoidable
│                                   #   (F-01 avoidance: prefer extension/webview surfaces first)
├── build/flauz/                    # packaging scripts, branding assets, CI definitions;
│                                   #   never edit build/lib/** in place (A's rule)
└── .flauz/                         # RUNTIME workspace artifacts (git-committed per DL-9/D-9;
                                    #   NOT part of the repo — per-workspace, git-diffable)
```

**Why this shape holds FORK-CRITICAL = 0 through Wave 5** (C's matrix crosswalk): chat participant (C-22, stable), lm providers (C-19, stable), pricing display (C-21, proposed→product config), browser control (C-28, in-tree browserView + proposed `browser.d.ts` enabled for built-ins), resolvers (C-30, proposed→product config), SCM artifacts (C-18, proposed→product config), gallery/branding (C-42/C-44, product.json build inputs). The only `src/vs` candidate left is F-01 (chat UX replacement) — explicitly demoted unless the TL signs off (A's ledger).

---

## 3. Wave roadmap (lab → product)

### Wave 3 — Vertical slice (the first product-shaped thing)

**Scope**
1. Own default chat participant on stable `vscode.chat`/`vscode.lm` (DL-3; `chat.createChatParticipant` — vscode.d.ts:20116-20124), powered by `flauz-models` providers + AHP Claude/Codex where entitled.
2. Agent Bridge skeleton (DL-5): `extensions/flauz-agent` affinity-pinned (one extra ext host — perf plan §2.1), tool registration via `lm.registerTool` (vscode.d.ts:20772-20778), Flauz Core service process + handshake (`code/flauz/*` marks, perf plan §1.2).
3. `.flauz/` workspace state (DL-9/D-9) + evidence ledger v0: tasks envelope **`flauz.tasks/v0` — the schema rehearsed by `prototypes/agent-task-state/` (this wave)**, evidence rows onto SCM artifacts (proposed `scmArtifactProvider.d.ts`), checkpoints interop with chatEditing (`createSnapshot(requestId, stopId)` — evidence 09).
4. Perf harness live in CI from day one (perf plan §6; gates §1.3/§2.2).

**Exit criteria** (all binary): (a) golden path end-to-end — chat request → plan → HumanApproval gate (NeedsInput status) → tool call (in-tree terminal or browser tool) → chatEditing checkpoint → evidence artifact written to `.flauz/` + SCM row visible; (b) startup deltas within perf plan §1.3 budgets on CI pair (flauz/main vs upstream/main); (c) FORK-CRITICAL ledger still empty; (d) every `product.flauz.json` key has a DECISION-LOG entry; (e) U-1 closed (which ⚠ surfaces light up with a non-Copilot default agent — C's gate question, canary C-20).

**Owner lanes**: TL (adjudication + DECISION-LOG); worker lane 1 = Agent Bridge + participant; worker lane 2 = workspace/evidence/ledger; worker lane 3 (E-style) = perf harness + budget enforcement.

### Wave 4 — Browser surface + environments + workflow envelope

**Scope**: adopt in-tree browserView as THE desktop browser surface with Flauz policy (DL-6: driver-side allowlist + webRequest + will-navigate layering + per-workspace/agent partitions — B's hardening finding; `IAgentNetworkFilterService` hook, evidence 10); environment registry on resolvers + AHP RemoteProxy (DL-8; `vscode-test-resolver` blueprint incl. `VSCODE_AGENT_HOST_BRIDGE_CONNECTION_TOKEN` bridge — evidence 06); workflow envelope v1 (D-8/DL-10: `.agent.md`/`.prompt.md` + `.flauz/tasks.json` fragments + AHP automation triggers); agent-to-agent messaging at orchestrator level (C-26).

**Exit criteria**: (a) policy-gated browser pane in default profile — CDP navigation to non-allowlisted host blocked at ALL layers (B's B1c finding covered); (b) env switch demo with session continuity (re-open based — N-8; Flauz overhead ≤ perf plan §5.5); (c) workflow envelope round-trip: save a run → re-run from one command; (d) remote-pane streaming meets perf plan §5.3 budget or degrades to on-demand snapshots gracefully.

**Owner lanes**: browser/policy worker; environments worker; workflow-envelope worker; perf continuity (E-lane).

### Wave 5 — Distribution

**Scope**: Open VSX default gallery + optional own registry (DL-7; `extensionsGallery` in product.flauz.json — data-driven, reversible); branding/identity complete; per-platform packaging + update channel; legal closure (D-1/D-7/U-4: marketplace terms, resolver-extension licensing, Copilot-reference usage rules); telemetry/privacy posture (TelemetryLogger-based, opt-in defaults).

**Exit criteria**: (a) installable desktop build produced by CI only (never in sandboxes); (b) update path exercised (update channel + signed artifacts); (c) legal review sign-off recorded in DECISION-LOG; (d) extension compatibility sweep against chosen gallery (C-42).

**Owner lanes**: build/release worker; legal review (TL + counsel); gallery curation.

---

## 4. Prototype promotion (lab → product)

**Acceptance gates** (uniform, from this wave's lessons):

| Gate | Check |
|---|---|
| G-review | TL + ≥1 worker lane review recorded in the lab repo |
| G-intent | Documented design intent vs in-tree surface: does it validate a mechanism the tree already ships (→ spec/reference), or fill a real gap (→ candidate code)? |
| G-license | Zero-dep code written by workers = ours (MIT, Flauz attribution); no MS-copied code; third-party deps cleared by legal lane |
| G-evidence | Run transcripts/screenshots/manifests committed as evidence (B's manifest pattern; this wave's transcripts) |

**Graduation map**:

| Wave-1/2 artifact | Destination | What graduates vs stays lab-only |
|---|---|---|
| B: electron-webcontentsview prototype | reference → Wave-4 policy spec | **stays lab-only** — the tree already ships the real engine (`browserView.ts:141-162`); prototype validates mechanism only |
| B: cdp-bridge (zero-dep CDP client) | reference + patterns → `extensions/flauz-agent` browser policy code | zero-dep CDP framing/retry/timeout patterns graduate; the transport itself is in-tree |
| B: webview-limits disqualification | permanent negative-result record | **stays lab-only** (evidence for DL-6 Option-C rejection) |
| B: agent-surface UX mock | IA spec → Wave-3/4 UX | stays lab-only until product UI wave; mapping badges already cite verified tree paths |
| E: model-provider-fabric (this wave) | design seed → `extensions/flauz-models` | selector semantics (mirrors `languageModels.ts:1412-1435`), pricing envelope (languageModelPricing field names), cost/latency accounting hooks graduate as the vendor-pack design |
| E: agent-task-state (this wave) | schema seed → `.flauz/tasks.json` envelope | `flauz.tasks/v0` state machine + native-surface mapping table graduate into the Wave-3 ledger spec; the HTML demo stays lab-only |

**Rule of thumb** (from B's decisive B4 discovery + this wave's evidence): *if the tree ships it, the lab prototype informs policy/spec — only Flauz-delta code (orchestration, policy, envelope formats) graduates into product code.*

---

## 5. CI / checkpoint strategy (no sandbox builds — binding)

**Sandbox rule (work-order §2 + A)**: workers never run `npm install`/gulp/full build in the 2-core/4GB sandboxes; the Flauz mirror clone is read-only; installs >4 min are skipped + documented. Full builds happen **only on CI runners**.

**Local hygiene subset (zero-install, run per worker session)**:
1. `git status` clean; branch shape check — `git diff --stat upstream/main...flauz/main -- src/vs ':(exclude)src/vs/workbench/contrib/flauz'` must be EMPTY (FORK-CRITICAL guard, automatable as a pre-commit hook in the lab repo).
2. Docs/prototype re-runs: `node prototypes/*/…` zero-dep demos re-run clean; transcripts refreshed when behavior changes.
3. Citation spot-checks: evidence files' `path:line` claims greppable in the mirror (the discipline this wave followed — every load-bearing quote re-verified directly).

**CI runner jobs**:
1. **Build + upstream hygiene**: compile, eslint, unit subset touching Flauz dirs (upstream's own pipeline shapes this).
2. **Startup perf pair**: N=10 runs of flauz/main vs upstream/main with `--prof-append-timers` on the same runner; assert perf plan §1.3 deltas; `--prof-duration-markers` for `code/flauz/*` pairs; mark-pair integrity check (every budgeted mark has both emit sites — R6).
3. **Memory snapshot**: `resolveProcesses()` shape at `LifecyclePhase.Eventually` + after a scripted agent session; assert §3.2 table.
4. **Upstream-sync canaries (run at EVERY sync, per DL-11) on C's gated rows**: C-20 (default-agent re-point: model picker + management editor light up with the flauz participant), C-23 (parallel agent sessions via own provider), C-24 (subagents + steering signals via own provider), C-28 (browser tools light up for non-Copilot agent) — these are exactly C's ⚠ rows and U-1's closure spike.
5. **Proposed-API rota**: diff `extensionEnabledApiProposals` vs upstream proposal renames/removals each sync (D-3; the d.ts relocation is the precedent that proves churn is real).
6. **Checkpoints**: monthly sync tag `flauz/sync/<date>` (divergence=0) or weekly rebase tag (divergence>0) + canary report attached to the tag; DECISION-LOG diff reviewed at every checkpoint.

---

## 6. Team workflow (lab transit → real org)

**What this wave proved about transit** (C's worklog + B's worklog + this wave): sandbox pushes are credential-blocked (PAT redaction is permanent); the TL harvests via file staging (C's `flauz-delivery/` + MANIFEST sha256 pattern); workers commit locally on named branches and emit a greppable final-report line. That maps to a real org as follows:

| Lab mechanism (Wave 1-2) | Product org equivalent |
|---|---|
| TL work order per worker lane | GitHub issue per lane, assigned by TL, with the same self-contained mission context |
| Worker branches `waveN/x-lane` | feature branches `flauz/<lane>/<topic>` off `flauz/main` |
| TL harvest via file staging + MANIFEST | **PR review gates** (below) — the transit constraint disappears; branch protection replaces the trust model |
| Append-only `worklog.md` per branch | PR descriptions carry the worklog; the repo worklog remains the audit trail |
| `FLAUZ-WAVEN-X-REPORT END` completion gate | CI required checks + TL merge checklist |
| DECISION-LOG (TL-owned) | `DECISION-LOG.md` on flauz/main, PR-annotated, TL-merge-only |

**PR review gates into `flauz/main`** (all four required):
1. **FORK-CRITICAL diff gate**: the §5.1 shape check passes (no `src/vs` divergence outside `contrib/flauz/`; any exception carries a DECISION-LOG entry + demotion alternative).
2. **Perf impact statement**: PR states which PERFORMANCE-PLAN budget it touches + CI pair results (startup/memory/latency gates green).
3. **Proposed-API diff**: any change to enabled proposals listed and justified (D-3 rota).
4. **Licensing note**: new third-party code or MS-derived patterns flagged for the legal lane (B-01/B-02 boundaries).

**Decision-log discipline (unchanged from D-10/DL-10)**: no `src/vs` divergence without an entry; entries cite worker evidence files; every entry carries a reversibility class (EASILY-REVERSED / CONFIG / STRUCTURAL).

---

## 7. Appendix — Wave-1/2 outputs → product components

| Output | Feeds |
|---|---|
| A: ARCHITECTURE / ARCHITECTURE-MAPPING / AGENT-INTEGRATION / UPSTREAM-STRATEGY | §1-2 (this doc); target architecture; DL-5/DL-12 |
| B: BROWSER-ARCHITECTURE / UX-ARCHITECTURE / 4 prototypes + evidence | Wave-4 policy spec; DL-6; §4 promotion map |
| C: CODE-OSS-INTEGRATION-MATRIX (50 rows) / DECISION-LOG-INPUTS (D-1..D-10) / EV-00..EV-11 | capability register; §5 canary rows (C-20/23/24/28); DL-1..DL-15 |
| D (Wave-2): SECURITY-MODEL.md (pending) | DL-6 hardening; DL-13 access-surface precision |
| E (this wave): PERFORMANCE-PLAN / MIGRATION-PLAN / prototypes #3 #6 | budgets + gates (§5 CI); `flauz.tasks/v0` + vendor-pack design (§3 Wave-3) |
