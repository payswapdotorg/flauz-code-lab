# Flauz Wave 1 — Decision-Log Inputs (Worker C)

**NOT the decision log.** The TL owns that. These are the open questions my capability matrix
(`docs/CODE-OSS-INTEGRATION-MATRIX.md`) surfaces, each phrased so a decision can be taken:
options → evidence → my recommendation. IDs D-1…D-10. Evidence refs point to
`evidence/c-capability-matrix/EV-*.md`.

---

## D-1 — Extension gallery & distribution channel

- **Question**: Which extension gallery does Flauz ship against — Open VSX, a self-hosted registry, or dual?
- **Options**: (a) Open VSX only; (b) own registry (Eclipse openvsx server / forks); (c) dual-source with precedence.
- **Evidence**: OSS `product.json` has **no `extensionsGallery`** (EV-11 N-1); gallery is a build input (EV-10 §1). MS marketplace is license-blocked for non-VS-Code products (Matrix B-01).
- **Recommendation**: (c) Open VSX default + optional own registry for Flauz-curated extensions; keep `product.json` gallery config data-driven so it's reversible.

## D-2 — Default chat agent strategy

- **Question**: What powers the default chat experience — fork of in-tree `extensions/copilot`, a Flauz-built participant on the stable `lm` API, or a multi-vendor neutral shell?
- **Options**: (a) Fork in-tree copilot ext (MIT source, fastest to parity, carries `copilot_internal` entitlement coupling); (b) own participant (`chat.createChatParticipant`, stable) + vendor providers; (c) neutral shell that requires users to bring a provider (Ollama/Claude/Codex auth).
- **Evidence**: C-20/C-45; `defaultChatAgent` product.json wiring (EV-01 §6); entitlement guards `GITHUB_COPILOT_PROTECTED_RESOURCE` (EV-02 §1); Claude/Codex are built-in AHP providers (EV-02 §1).
- **Recommendation**: (b) — own participant as product identity, with AHP providers for Claude/Codex plus `lm` vendors for the rest; keep the in-tree copilot source as reference, not product dependency. Decouples from B-01 entirely.

## D-3 — Proposed-API posture

- **Question**: Does Flauz (a) run proposed APIs enabled-for-built-ins only, or (b) fork-promote selected APIs to Flauz-stable?
- **Evidence**: ~190 proposed d.ts files; browser/resolvers/MCP-gateway/chat-sessions/pricing are proposed (EV-10 §3); promotion is the only F-02 fork trigger found.
- **Recommendation**: (a) for Wave 1-2 — zero fork, per-extension enablement; revisit (b) only when Flauz publishes a stable third-party API of its own. Budget an upstream-churn tracking rota (the tree moves fast: `vscode.d.ts` already relocated to `src/vscode-dts/`, EV-11 N-12).

## D-4 — Orchestration backbone: AHP vs side-car

- **Question**: Build Flauz multi-agent orchestration **on the Agent Host Platform** (providers, subagents, changesets, automations) or as an independent side-car service?
- **Evidence**: AHP is a core platform with Claude/Codex providers, steering/confirmation signals, automation channels, remote proxying (EV-02); but provider extensibility from extension-land is unproven (`remoteCodingAgents.d.ts` empty placeholder — EV-11 N-4, U-2).
- **Recommendation**: Adopt AHP semantics; build the Flauz orchestrator as extension/contrib first; escalate to F-03 (protocol change) only if U-2/U-3 close negatively.

## D-5 — Browser strategy per platform

- **Question**: Desktop uses in-box CDP browserView; what is the **web build** story — MCP-driven external browser (Playwright), cloud browser service, or display-only simple-browser?
- **Evidence**: browserView is Electron-only (EV-11 N-9); core MCP can host external browser servers (EV-03 §3); simple-browser is display-only (EV-04 §3).
- **Recommendation**: Desktop = in-box browserView tools; web = Playwright-MCP server as the standard Flauz component; document evidence formats so both paths write identical artifacts (C-29).

## D-6 — Cloud sandbox provider

- **Question**: Use the in-tree Microsoft cloud-sandbox experience (entitlement-bound), build an E2B/own-infra sandbox contrib, or both?
- **Evidence**: Core `cloudSandbox*` services exist but are Microsoft/Copilot-coupled (EV-02 §5, EV-07 §5); resolvers + AHP RemoteProxy give a clean integration path for alternatives (EV-07 §1/§4).
- **Recommendation**: Build the Flauz sandbox contrib against resolvers + AHP (C-33, PROTOTYPABLE); treat the MS sandbox as a reference implementation, mirroring D-2's decoupling principle.

## D-7 — Remote extension licensing (SSH/containers)

- **Question**: Ship open-source resolver extensions (open-remote-ssh pattern), write our own, or both?
- **Evidence**: Resolver API is proposed-but-complete with a reference impl in-tree (`vscode-test-resolver`, EV-07 §2); MS Remote-SSH/Dev-Containers are license-blocked on OSS builds (B-01/U-4).
- **Recommendation**: Own resolver built from the test-resolver blueprint + contribute to/adopt open-remote-* per license review; make "remote provider" a Flauz extension category (feeds D-1).

## D-8 — Workflow artifact format

- **Question**: What is the canonical "saved workflow" artifact — prompt-file bundles (`.agent.md`/`.prompt.md` + tool restrictions), `tasks.json`, AHP automations, or a Flauz envelope composing all three?
- **Evidence**: prompt files are core resource classes (EV-09 §1); automations are AHP protocol channels without authoring UI (EV-09 §3, EV-11 N-10); tasks are stable & versionable (EV-05 §4).
- **Recommendation**: Flauz envelope (workspace-committed, git-diffable) that composes prompt files + tasks + automation triggers; authoring UI is Wave-2 work (C-40).

## D-9 — Session/memory persistence location

- **Question**: Where do Flauz agent sessions, memory, and evidence live — editor workspaceStorage (private), or workspace folder (`.flauz/`, git-committed)?
- **Evidence**: Core sessions persist in storage (EV-08 §2); extension storage scopes exist (EV-08 §1); no built-in memory store (EV-11 N-6); SCM artifact surface exists for evidence (EV-06 §5).
- **Recommendation**: Hybrid: private state in editor storage; **shareable artifacts (evidence, workflow envelopes, memory snapshots) in `.flauz/`** in the workspace — portable across machines/environments (aligns with Session 5/6 continuity).

## D-10 — Fork-surface policy & upstream cadence

- **Question**: What is the standing policy on `src/vs` divergence (currently F-01..F-03, all conditional) and the rebase cadence onto vscode main?
- **Evidence**: Matrix §3 — the only fork triggers are chat-UX replacement, API promotion, AHP protocol change; product identity/gallery are build inputs (EV-10 §1–2).
- **Recommendation**: Standing rule: **no `src/vs` divergence without a decision-log entry**; monthly rebase cadence while divergence = 0; add CI canaries for the ⚠-gated rows (C-20/C-23/C-24/C-28) so gating regressions surface early (U-1).

---

### Cross-links
- Matrix rows ↔ decisions: B-01→D-1/D-7; C-20/C-45→D-2; C-43→D-3; C-24/C-26/C-40→D-4/D-8; C-28→D-5; C-33→D-6; C-30/C-32→D-7; C-35/C-27→D-9; F-01..F-03→D-10.
- Uncertainties U-1..U-5 (Matrix §6) are the closure work-items for D-2/D-4/D-5/D-7.
