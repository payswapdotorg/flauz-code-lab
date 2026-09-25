# Flauz Code Lab — Worker Worklog

Append-only discipline: never rewrite or delete other workers' content; append your
section below using the house template (`---` header, Task ID, Agent, Task, Work Log,
Stage Summary).

Provenance note (created by Worker E, Wave 2): branch `main` carried no worklog.md at
Wave-2 start (A's delivery is docs+evidence only). Wave-1 worker worklogs live on their
delivery branches: `wave1/b-browser-ux:worklog.md` (B) and `wave1/c-capability-matrix:worklog.md`
(C, incl. A's and B's earlier entries). This file starts the main-branch worklog lineage.

---
Task ID: wave2-E (main session; evidence agents 2-a..2-d ran as subagents — records in /home/z/my-project/worklog.md)
Agent: Worker E (performance + migration lane; gap prototypes #3/#6)
Task: Deliver docs/PERFORMANCE-PLAN.md, docs/MIGRATION-PLAN.md, prototypes/model-provider-fabric, prototypes/agent-task-state, and evidence/e-perf-migration/ on branch wave2/e-perf-migration of flauz-code-lab.

Work Log:
- Env: 2 cores / 4.1 GB RAM / 8.0 GB disk free; git 2.47.3, node v24.21.0, bun 1.3.14. GitHub reachable; no PAT (push expected blocked — verified blocked at end, see below).
- Cloned flauz-code-lab (full, small) + depth-1 clone of payswapdotorg/Flauz (386 MB, 19,182 files) at /home/z/Flauz — READ-ONLY, never built, nothing installed. Verified mirror HEAD = 9bf9ae764da438b1234a8243dc9e47173ef58ee7 (TL pin match).
- Surveyed Wave-1 context before any writing: tl/decision-log DECISION-LOG.md (DL-1..DL-15), C's 50-row capability matrix + D-1..D-10 + U-1..U-5 + EV-00..EV-11, A's UPSTREAM-STRATEGY/ARCHITECTURE/AGENT-INTEGRATION, B's PROTOTYPE-RESULTS/BROWSER-ARCHITECTURE + cdp manifest (screencast window +2.40s→+2.90s for 10 frames inside a 12.6s run).
- Created branch wave2/e-perf-migration from main (08e7bfb); local identity worker-e@flauz.local.
- Evidence sweep: 4 parallel read-only Explore agents on the mirror (startup/marks; activation/affinity/proposed-API/AHP; RPC/lm/chat surfaces; browserView/terminal/watcher/memory) + direct grep spot-verification of every load-bearing quote (20+ greps re-run personally). Key tree-drift findings recorded as negatives: electron-sandbox layer gone; d.ts at src/vscode-dts/; NO in-tree screencast streaming; NO empty-selector throw in lm.selectChatModels; onStartupFinished capped at 10s after eager activation; affinity = exactly one extra ext-host utility process; AHP = separate utility process prewarmed at BlockRestore.
- Wrote 12 evidence excerpt files + run artifacts + INDEX.md under evidence/e-perf-migration/.
- Wrote docs/PERFORMANCE-PLAN.md: startup (marks/phases cited; Flauz budget table; code/flauz/* prefix rule), activation discipline (onStartupFinished-only, affinity cost model, proposed-API posture), memory (process census + per-surface budget table, floor-case total ≤ ~500 MB), parallelism (2-core floor-case caps + backpressure precedents: terminal watermarks, ThrottledWorker, awaited-RPC streaming), latency budgets (first-token 4-RPC ≈ 12-wire-message path; browser tools 4-process path; screencast reasoning from B's timestamps), measurement plan (--prof-append-timers CI harness, perfBaseline deltas, TelemetryLogger for Flauz Core), risk table R1-R8 with owners.
- Wrote docs/MIGRATION-PLAN.md: repo strategy adjudication (concur DL-12/DL-11: pristine main + flauz/main, monthly-while-zero → weekly-after-divergence, with sync/rebase runbooks), directory layout tree sketch (product.flauz.json overlay + extensions/flauz-* + build/flauz + contrib/flauz last resort), Wave 3/4/5 roadmap with binary exit criteria and owner lanes, prototype promotion gates + graduation map (lab informs policy; only Flauz-delta code graduates), CI/checkpoint strategy (no sandbox builds; local hygiene subset incl. FORK-CRITICAL shape check; CI jobs incl. canaries on C-20/C-23/C-24/C-28 + proposed-API rota), team workflow mapping (lab transit → PR gates + DECISION-LOG discipline).
- Built prototypes/model-provider-fabric (zero-dep Node 24, deterministic seed): mock registry (Codex/Claude/Qwen/Muse/Copilot/local), selectChatModels mirroring languageModels.ts:1412-1435 verbatim semantics, provider-extension activation simulation, two-model routing with per-model cost/latency accounting (languageModelPricing.d.ts field names), policy routing. RAN EXIT=0; transcript + out/run-report.json committed.
- Built prototypes/agent-task-state (zero-dep): server.mjs (state machine plan→awaiting-approval→execute→verify→awaiting-signoff→done + failed/cancelled; server-validated transitions; .flauz/tasks.json persistence) + vanilla timeline UI (gates as diamonds, ChatSessionStatus badges, history log, mapping legend table). Browser-verified with agent-browser: page renders, gate click fires POST /api/tasks/T-001/events → 200, state transitions, invalid event → HTTP 409, console clean, desktop/interaction/mobile screenshots captured.
- Hosted both prototypes on the sandbox preview (B's delivery pattern): statics under public/flauz/, Next.js API routes ported from server.mjs (src/lib/flauz-tasks.ts + api/tasks/*), host page at /. Verified end-to-end: iframe mode badge "persistence: live (.flauz/tasks.json)", badge transition awaiting-approval·needsinput(3) → execute·inprogress(2) via DOM click, envelope persisted through the host API, lint clean, dev.log clean.
- Environment learnings recorded for future workers: sandbox reaper kills background processes at bash-call end (setsid+nohup insufficient; double-fork detached spawn survives); `cd X && cmd &` backgrounds the whole chain (use `cd X; cmd &`).
- Commits on wave2/e-perf-migration: 6cd11e3 (docs+evidence excerpts), 8cd368f (proto #3), 2d7af13 (proto #6), + final (INDEX, worklog, preview evidence). Push attempted once at the end: rejected, no credentials (expected per work order; TL harvests).

Stage Summary:
- Key results: both gap prototypes RAN and browser-verified with captured evidence; PERFORMANCE-PLAN and MIGRATION-PLAN delivered with path:line citations for every architectural claim (12 evidence files, 6 explicit negatives); preview hosts the interactive prototype live for the operator.
- Key decisions recommended: adopt DL-11/DL-12 verbatim (operationalized with sync runbooks); AHP prewarm = measured decision with providers off by default in Flauz profile; Flauz marks must use code/flauz/* prefix; memory policy = admission control + eviction (no in-tree per-process caps exist).
- Artifacts: branch wave2/e-perf-migration @ <final SHA — see git log>; docs/PERFORMANCE-PLAN.md; docs/MIGRATION-PLAN.md; prototypes/{model-provider-fabric,agent-task-state}/; evidence/e-perf-migration/ (12 excerpts + 5 run artifacts + 5 PNGs + INDEX.md).
- Open items for TL: see final report (CI baseline pair needed to convert [E] estimates into absolute guards; U-1 closure via Wave-3 canary; proposed-API rota owner).
