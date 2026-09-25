# Flauz on Code OSS — Final Investigation Report

**Author**: TL#2 (tech lead/orchestrator). **Basis**: 5 worker lanes (Wave 1: A/B/C; Wave 2: D/E), all delivered with sha256-verified transit; TL adjudication (DECISION-LOG.md DL-1..DL-15); direct verification of the payswapdotorg/Flauz mirror against microsoft/vscode main.

**All deliverables live in payswapdotorg/flauz-code-lab**: `wave1/a-architecture` (architecture + 27-abstraction mapping + agent integration + upstream strategy), `wave1/b-browser-ux` (browser architecture + UX architecture + 3 browser prototypes + UX mock + 26 evidence PNGs), `wave1/c-capability-matrix` (50-capability truth table + six-session simulation + decision inputs), `wave2/d-license-security` (licensing/distribution review + security model), `wave2/e-perf-migration` (performance plan + migration plan + 2 gap prototypes), `tl/decision-log` (15 adjudicated decisions), this report.

---

## 1. The formula, realized

**Flauz = Code OSS + Flauz's agent/workspace/orchestration/resource/context capabilities + a real browser + multi-model / multi-agent / multi-environment capabilities.**

The investigation's single most consequential finding (three independent workers converged, TL verified): **Code OSS upstream (microsoft/vscode main @ 9bf9ae764da, mirrored byte-pristine in payswapdotorg/Flauz) is already an agent-native platform**:

- **Agent Host Platform** (`src/vs/platform/agentHost/`): an IPC'd agent-host process with built-in Claude and Codex providers, subagent signals, steering signals, tool-confirmation signals, changeset operations, resource watch/read/write protocol, automation triggers/runs, dev-container agent hosts, cloud sandboxes.
- **MCP as a core subsystem** (`src/vs/workbench/contrib/mcp/`): MCP server/tool definition + gateway (lm.startMcpGateway exposes editor MCP servers over localhost HTTP for external agent loops).
- **A real CDP browser platform** (`src/vs/platform/browserView/`): Electron-main browserSession with per-session partitions, CDP proxy, Playwright backend service, and **14 agent browser tools** (navigate/click/type/hover/drag/screenshot/read/list-pages/run-playwright-code) — browser-as-chat-tool already exists in-tree.
- **Chat-editing checkpoints** (edit-tracked changesets with multi-file diff editors), **sessions infra** (chatSessionsProvider, agent sessions, remoteCodingAgents), **model picker UI**, **agents/prompts-as-files** (.agent.md/.prompt.md/SKILL.md resource classes), **language-model pricing metadata**.

Therefore Flauz is NOT a re-implementation of an agent IDE — it is the **orchestration, workspace, resource/evidence, and distribution layer on top of an already-agent-native base**, plus product identity. The IDE is one (powerful) surface of the product, exactly per the charter's design principle.

## 2. Where every capability lives (the mapping, summarized)

All 27 Flauz abstractions mapped (ARCHITECTURE-MAPPING.md; Worker C's matrix agrees):

- **Native already** (~majority): Client, Model (vscode.lm is vendor-agnostic), AgentRuntime substrate (chat agents + tools + MCP), Environment (remote authority + resolvers + tunnels + in-tree server), Provider patterns, Resource (URI + file service + provider schemes), TaskState executors (tasks/terminals/debug/tests), AgentContext (ChatContext/ChatRequest), Message (typed LM/chat messages), Execution/Verification (terminals, problem matchers, diagnostics, test runs), Artifact (URIs/filetrees/notebooks), multi-model fabric (lm.selectChatModels + picker UI), Workflow-adjacent (prompt files, tasks, profiles).
- **Flauz service (separate process)** — the genuinely-missing stateful layer: Memory (long-term), Claims/Leases, AccessSurface policy engine, Evidence ledger, Plan objects, multi-agent orchestration, Collaboration (multi-user), approvals persistence, workflow store.
- **Layered on native gates**: HumanApproval (tool confirmation + workspace trust + Flauz policy), AgentDecision records (tool-call parts + Flauz decision log).

**FORK-CRITICAL surface: zero required for Wave 1; three conditional triggers exist** (F-01 chat-UX replacement, F-02 proposed-API promotion, F-03 AHP protocol mutation) — all with demotion alternatives; any future use requires a DECISION-LOG entry (DL-12 ledger discipline).

## 3. The browser answer

Ranked and prototyped (Worker B, live evidence):

- **Desktop**: the in-tree WebContentsView browser (per-session partitions + 14 agent tools) — adopt as-is; Flauz adds policy/hardening only.
- **Web/cloud**: the in-tree Playwright backend (platform/browserView/node/playwrightService.ts) as the standard component.
- **Webview/iframe: DISQUALIFIED** by live probes (SOP blocks agent read/click/type cross-origin; no per-workspace session middle ground).
- **Security**: CDP-initiated navigations bypass will-navigate → layered gates mandatory (driver-side allowlist authoritative + webRequest + will-navigate + per-workspace partitions) — formalized in SECURITY-MODEL.md.

## 4. Multi-model / multi-agent / multi-environment

- **Multi-model**: native-shaped (vscode.lm vendor-agnostic + pricing metadata + picker); Flauz ships provider adapters (Codex/Claude/Qwen/Muse/Copilot/local) as built-in extensions; own chat participant as product identity (DL-3) — proven by the model-provider-fabric prototype (selector semantics mirrored from tree, per-model cost/latency accounting).
- **Multi-agent**: AHP semantics adopted (DL-5); Flauz orchestration = Agent Bridge extension (affinity-pinned ext host) + Flauz Core service for stateful coordination; claims/leases for interference control.
- **Multi-environment**: resolver API + AHP RemoteProxy; Flauz environment registry + provider extensions (own OSS resolvers for SSH/containers; E2B/cloud as providers; MS entitlement-bound sandbox = reference only) (DL-7/DL-8).

## 5. Upstream strategy

- `main` stays a **pristine mirror** (never committed to); `flauz/main` = the only divergence carrier; product identity in a build-time `product.flauz.json` overlay (zero-conflict with upstream's product.json).
- Everything Flauz lives in **additive paths**: `extensions/flauz-*`, `build/flauz/`, at-most `src/vs/workbench/contrib/flauz/` (last resort).
- Sync: **monthly while divergence=0** (current state), **weekly rebase windows once Wave-3 code lands**; tag snapshots; CI canaries on gated rows + proposed-API rota (DL-11/DL-12).

## 6. Licensing & distribution (Worker D, 97-extension audit)

- **@anthropic-ai/claude-agent-sdk is PROPRIETARY** (cglicenses.json) → ship as on-demand download keyed to user acceptance (in-tree agentSdkDownloader precedent), never bundled. HIGH priority finding.
- MS marketplace prohibited (no extensionsGallery in OSS product.json + ToS) → **Open VSX first**, evolve to dual-source own registry.
- ffmpeg LGPL-2.1+ / H.264 patent decision required (codec-free Electron variant vs patent path).
- In-tree copilot extension: MIT source but entitlement-coupled → disabled as default agent; drop trustedExtensionAuthAccess pre-grants.
- Notice pipeline (3,439-line TPN + 416 CLI crates) must be automated in release CI.
- Branding checklist: name/icons/telemetry/update URLs via product.flauz.json fields (evidenced list in LICENSE-DISTRIBUTION-REVIEW.md).

## 7. Security model (Worker D + B finding)

Native substrate (workspace trust, tool confirmations with combination scopes, chatToolRiskAssessmentService, SecretStorage, browserView permissions/partitions, sandboxed webviews/process model) + Flauz additions: AccessSurface triple-axis policy (per-tool × per-agent × per-resource), claims/leases, hash-chained user-key-signed evidence checkpoints, credential vault (references-not-copies), provenance-tagged context fragments against prompt injection. Top-10 risk register with owners in SECURITY-MODEL.md.

## 8. Performance (Worker E, tree-grounded budgets)

Startup path mapped with Flauz budget table; activation discipline (`onStartupFinished`-only); affinity = exactly one extra ext-host utility process; memory budgets per surface on the 2-core/4GB floor; latency: chat first-token = 4 logical RPCs ≈ 12 wire messages; browser tools' 4-process path; measurement via in-tree perf marks + TelemetryLogger; R1–R8 risks with owners (top: affinity is experimental + allocation-only → CI canary + fallback posture; AHP prewarm default-off; browser pane caps + idle disposal; proposed-API churn rota; upstream mark/emit drift).

## 9. Migration path (lab → product)

Wave roadmap: **Wave 3** vertical slice (own chat participant on vscode.lm + affinity-pinned Agent Bridge skeleton + `.flauz/` state + evidence ledger v0 + perf harness in CI from day one); **Wave 4** browser adoption with layered policy + environment registry + workflow envelope v1; **Wave 5** distribution (Open VSX, branding, packaging, update channel, legal closure). Prototypes graduate as specs/design-seeds — only Flauz-delta code enters the product repo. Full runbooks + exit criteria in MIGRATION-PLAN.md.

## 10. Charter closure checklist

| Charter requirement | Status |
|---|---|
| 13 documents | ✅ ARCHITECTURE, ARCHITECTURE-MAPPING, CODE-OSS-INTEGRATION-MATRIX, BROWSER-ARCHITECTURE, AGENT-INTEGRATION, UPSTREAM-STRATEGY, LICENSE-DISTRIBUTION-REVIEW, SECURITY-MODEL, PERFORMANCE-PLAN, UX-ARCHITECTURE, PROTOTYPE-RESULTS, MIGRATION-PLAN, DECISION-LOG (+DECISION-LOG-INPUTS, FINAL-REPORT) |
| 8 prototypes | ✅ #1/#2 native+agent surface (UX mock, browser-verified), #3 model/provider fabric (RAN), #4 browser integration (3 prototypes, live evidence), #5 terminal+agent (UX mock + terminal tiles), #6 task/agent state (RAN, live event API), #7 environment selection (mock re-scoping, verified), #8 abstraction mapping (27/27 with evidence) |
| Six-session simulation | ✅ in CODE-OSS-INTEGRATION-MATRIX.md (each with weakest link) |
| 10 decision criteria | ✅ D-1..D-10 inputs → DL-1..DL-15 rulings |
| Evidence discipline | ✅ every non-trivial claim cites tree path:line or run receipt; negative claims carry failed-search receipts |
| Prototypes → Flauz repo | Deferred by design: prototypes are lab artifacts that inform Wave-3+ product code (MIGRATION-PLAN graduation gates); flauz-code-lab is not a second product implementation |
| Working through replay, workers only | ✅ all 5 worker lanes dispatched as watchable agents-tab GLM-5.3 sessions inside the replay; TL implemented nothing |

## 11. Residual uncertainties (honest)

- U-2 AHP provider extensibility from extension-land (unproven; closure rides the Wave-3 canary).
- Agent-SDK bundling posture + H.264 variant + copilot-ext keep/strip: product decisions pending operator input (Worker D Q1/Q2/Q4).
- CI runner ownership for absolute perf guards (Worker E Q1).
- remote-pane streaming ≥4fps is net-new Flauz code (in-tree screencast verified negative).
- Upstream moves fast (d.ts relocation happened mid-investigation) — the churn rota is load-bearing.

---

**Bottom line**: Flauz-on-Code-OSS is not a fork story; it is an integration-and-product story on an agent-native base that already ships the browser, MCP, model fabric, and agent-host engines. The Flauz delta is orchestration, workspace state, evidence, policy, and distribution — all buildable in additive paths with a FORK-CRITICAL ledger at zero. Wave 3's vertical slice is the recommended first build.

---

# Wave 3 Addendum — The First Product Code (2026-09-25/26)

**Basis**: 3 product-code lanes (F: Agent Bridge; G: workspace/evidence; H: CI harness), all delivered with sha256-verified transit and adjudicated (DECISION-LOG.md now DL-1..DL-28). Code branches on the pristine mirror payswapdotorg/Flauz: `wave3/f-agent-bridge` (8bbc49d), `wave3/g-workspace-evidence` (26474ff), `wave3/h-perf-ci` (52ec6dd) — base `9bf9ae764da`, FORK-CRITICAL ledger EMPTY on all three (TL re-verified from the harvested git bundles against the local mirror). Delivery records in flauz-code-lab: `wave3/f-agent-bridge`, `wave3/g-workspace-evidence`, `wave3/h-perf-ci`.

## What now exists (the vertical slice, proven in-sandbox)

1. **The Agent Bridge** (extensions/flauz-agent, 26 files): the `flauz.agent` chat participant (stable `chat.createChatParticipant`) with the statically-contributed `isDefault` identity; the `flauz_terminal` tool whose `prepareInvocation → confirmationMessages` is exactly the WaitingForConfirmation HumanApproval gate (agentSessionApprovalModel.ts:120-158 semantics); the golden-path orchestrator (request → createTask → submit-plan → human approve → tool-run → evidence → report → verify-pass → human sign-off → done); model selection via `lm.selectChatModels` with vendor preference; the zero-dep Flauz Core service (stdio JSONL handshake). 26 tests green incl. the full end-to-end golden path against the real spawned service.
2. **The vendor pack** (extensions/flauz-models, 19 files): `flauz-mock`, a deterministic streaming echo provider on the STABLE `registerLanguageModelChatProvider` API (the CI golden-path model — no entitlements), plus frozen design-only Codex/Claude/Qwen stubs with pricing envelopes. 12 tests green.
3. **The workspace layer** (extensions/flauz-workspace, 22 files): the `.flauz/` state envelope (flauz.tasks/v0, 9 actor-gated transitions, canonical git-diffable serialization, atomic writes), the hash-chained evidence ledger (sha256 row chain, verifyLedger with firstBadSeq across 5 tamper classes), the SCM artifact provider on the proposed `scmArtifactProvider` surface (4 kind groups → artifacts → openEvidence), chatEditing checkpoint interop with the attested/blocked decision matrix. 55 tests green.
4. **The product identity** (product.flauz.json + build/flauz, 6 files): the v0 overlay (nameShort/nameLong/version + extensionEnabledApiProposals grants + defaultChatAgent:null deletion) and the zero-dep merger with null-deletes semantics — the mechanism that makes `flauz.agent` the sole default agent and disables the Copilot entitlement machinery. Merger spot-checked: 47 merged top-level keys, no defaultChatAgent, correct proposal grants.
5. **The CI harness** (.github/workflows/flauz-* + build/flauz/scripts + 52-file fixture corpus): five jobs (upstream hygiene + FORK-CRITICAL guard; startup perf pair with §1.3 delta gates + mark-pair integrity; memory snapshot vs §3.2; DL-11 sync canaries C-20/23/24/28; proposed-API rota), all zero-dep, all fixture-proven (29/29 matrix incl. every gate's FAILURE mode; guard FAIL proven on a throwaway divergence commit).

**Golden path, twice-proven**: the same §4 seam contract was implemented independently by lanes F and G and converged (DL-21 canonizes the seven shared interpretations). That convergence — plus tsc x3, node --test 43+55+5, FORK-CRITICAL 56+22+69 all-A — is the wave's verification story.

## The operational story (recorded for the record)

Wave 3 executed through a hostile platform window: the SyntaxError generation-queue region block (cleared by routing browser egress through the operator's TurboVPN per the boot-prompt lesson), a platform re-image at 17:39:54Z that wiped both executing worker sandboxes (only /home/z/my-project persists across pod recycles — both lanes rebuilt from their surviving worklogs with zero design drift, under a new persisted-volume + milestone-cadence transit discipline), and a MODEL_CONCURRENCY_LIMIT capacity crunch handled on a disciplined retry cadence. Recovery cost ~4.5 hours; the milestone-transit discipline means a pod reset can never again cost more than one milestone.

## What Wave 3 deliberately leaves open (the Wave-4 door)

- Real-IDE boots, real CI runners (MIGRATION-PLAN §5): all canary/spec surfaces carry explicit first-run procedures; H's workflows trigger on first push of the integration branch.
- Signatures + ledger watermark (DL-20 Wave-4 hook per SECURITY-MODEL §3.3).
- chatEditing out-of-band snapshot API (DL-22, deferred with the blocked-path contract).
- Packaging (dist/ esbuild bundle for the bridge), real vendor adapters, model-driven plan generation (F GAPS 1-8; H GAPS 1-6).
- §8 measurement closure (absolute baselines, AHP prewarm contribution, pinned ext-host RSS, browser-tool cold/warm) — H's measure-§8.md maps each to its exact CI job.

**The roadmap position**: Waves 1-2 answered "what is Flauz on Code OSS" (investigation, DL-1..15). Wave 3 answered "can the vertical slice be built additively, verified in-sandbox, and kept fork-free" — yes: 147 new-path files across three branches, zero upstream files touched, the FORK-CRITICAL ledger empty. The next wave is integration (flauz/main assembly, first real CI run, first real boot) — everything it needs is now staged and pinned.
