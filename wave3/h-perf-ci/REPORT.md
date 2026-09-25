# REPORT — Worker H, Wave 3, Lane H (flauz-H4-w3): perf harness + CI + budget enforcement

- **Branch**: `flauz/wave3/perf-ci` (4 commits on `9bf9ae764da438b1234a8243dc9e47173ef58ee7`)
- **Delivery**: this directory (`/home/z/my-project/flauz-delivery/h-perf-ci/`, repo-relative
  paths preserved) + `MANIFEST.txt` (sha256 per file) + git bundle
  `/home/z/my-project/wave3-h-perf-ci.bundle` (`9bf9ae764da..flauz/wave3/perf-ci`)
- **Commits**: fe57c6db (scripts + fixtures) → a930ee7b (workflows) → fb22ef2f
  (canaries + measure-§8 + README) → 52ec6dd3 (verify-fixtures matrix)

---

## WHAT-BUILT

All paths NEW (69 files; `git diff --name-only 9bf9ae764da..HEAD` lists only
new paths under `.github/workflows/flauz-*` (4), `build/flauz/` (13),
`test/fixtures/` (52)).

### .github/workflows/ (GitHub Actions; no secrets; read-only perms; gated on `extensions/flauz-*/**`, `build/flauz/**`, `product.flauz.json`, `.github/workflows/flauz-*` + `workflow_dispatch`; action SHAs pinned to upstream's own)

- **flauz-hygiene.yml** — MIGRATION §5 job 1. Zero-dep gates FIRST (FORK-CRITICAL
  guard, activation lint — fail fast, no install), then the upstream hygiene
  pipeline shaped on upstream's `pr.yml` (restore-node-modules composite action,
  apt build tools, preinstall/electronTypes, `npm exec -- npm-run-all2 -lp
  core-ci hygiene eslint …`), then the glob-discovered unit subset touching
  Flauz dirs (`find out … | grep flauz` → `./scripts/test.sh --run` per file,
  documented skip while lanes are in flight).
- **flauz-perf.yml** — jobs 2+3. `startup-pair`: flauz tree + pristine upstream
  tree on the SAME runner (one job, two checkouts, shared caches/node_modules),
  N=10 interleaved boots with `--prof-append-timers` +
  `--prof-duration-markers(-file)` (invocation shaped on upstream's own
  startup-verify step), §1.3 assertions via startup-pair.mjs; mark-pair
  integrity + phase gate run before the build. `memory-snapshot`: ps capture
  during the Eventually window of the self-exiting prof run → §3.2 asserts;
  after-scripted-session capture rides the C-23 shared driver (documented skip
  until lane F). Runner pinned `ubuntu-24.04` (DL-16 candidate).
- **flauz-canaries.yml** — job 4, the DL-11 sync canaries: one job per gated row
  (C-20/C-23/C-24/C-28), each = spec-present check + lane-presence glob probe +
  xvfb scripted boot + boot-level assertions from
  `build/flauz/canaries/C-<id>.md` (PROBE-ONLY mode while lanes are in flight,
  with recorded reasons — never silent).
- **flauz-rota.yml** — job 5: union (`product.flauz.json#extensionEnabledApiProposals`
  + all `extensions/flauz-*/package.json#enabledApiProposals`) vs
  `src/vscode-dts/vscode.proposed.*.d.ts` inventory + generated-registry
  cross-check; drift report artifacts (`if: always()`); baseline-delta mode
  (renames/removals since last sync via `--baseline`); checkpoint-reminder step
  printing the §5 job 6 DECISION-LOG checklist at sync tags.

### build/flauz/scripts/ (zero-dep node>=20 / POSIX sh; every script `--help` + exit codes documented)

- **fork-critical-guard.sh** — asserts `git diff --stat <base>...<head> -- src/vs
  ':(exclude)src/vs/workbench/contrib/flauz'` EMPTY; refs mode (CI), staged
  mode (pre-commit hook), worktree mode, name-only mode.
- **activation-lint.mjs** — PERF §2.1/§2.2: no `*`; event whitelist
  (onStartupFinished / onCommand|onView|onTaskType:flauz.* /
  onLanguageModelChatProvider:<vendor>); ≤2 on onStartupFinished and only
  bridge+workspace ids; affinity key shape `^flauz\.[a-z0-9-]+$`; affinity
  value integer ≥1; single pinned slot (all values 1 — one extra ext host,
  DL-5/§3.2); bridge-pin WARN; enabledApiProposals shape.
- **proposed-api-rota.mjs** — union/inventory/registry diff + absence detection
  + baseline deltas with rename hints (trigram similarity) + DECISION-LOG
  reminder on drift; `--snapshot` (TL commits at sync tags), `--report` (CI
  artifacts), `--no-fail`.
- **startup-pair.mjs** — §1.3 gates: TSV p50/p95 deltas (rows 1-2), duration-
  marker pair budgets (rows 2-3 + §6.2 marks incl. warm-models ≤2s), non-
  standard-run exclusion with min-runs validity, perfBaseline reporting;
  mark-pair integrity (every budgeted `code/flauz/*` mark greppable in flauz
  sources — R6 drift class, cf. upstream `ellapsedWindowMaximize`); §1.3 row 4
  phase gate (no flauz workbench contribution before AfterRestored/Eventually).
- **memory-snapshot.mjs** — §3.2 rows R1-R6 (pinned ext-host RSS [E] with
  `--enforce` escalation; flauz-core idle ≤150MB; sessions ≤2; panes ≤2;
  flauz-added total ≤500MB; stock utility shape informational); three
  interchangeable capture paths: `--json` (resolveProcesses shape — the PERF
  §6.1 surface), `--status` (diagnostics text), `--ps` (CI-native);
  `--pattern` overrides for lane-owned process names.
- **perf-log-parse.mjs** — shared parsers (append-timers TSV, duration-markers
  TSV, resolveProcesses JSON, --status text) + nearest-rank percentile stats;
  importable module + CLI selftest (single source of truth for both perf
  scripts).
- **verify-fixtures.sh** — the 29-case verification matrix (below).

### build/flauz/canaries/ — C-20.md, C-23.md, C-24.md, C-28.md

Scripted-boot assertion specs for C's gated rows: setup, steps, expected
assertions (boot-level automated; interactive steps marked WAITING-ON-LANE F
riding the golden-path smoke suite), tree citations re-verified in the mirror
(modelPicker/, chatManagement/, aiCustomization/, product.json:90,
agent.ts:711/880-884/952, browserView contrib + tools/, browser.d.ts:24/90),
drift trip-wires per canary, U-1 closure note (C-20), §8 q4 timing capture
(C-28), shared session driver with the perf memory job (C-23). C-20
cross-references Worker F's `build/flauz/canaries/default-agent-checklist.md`
for when it lands.

### build/flauz/measure-§8.md — §8 closure map

Each PERF §8 open question → exact job + measurement + recalibration act:
q1 absolute baseline (perf-pair upstream side + stock ps snapshot), q2 AHP
prewarm on/off (two dispatches with provider settings), q3 pinned ext-host RSS
(memory-snapshot R1/R5 numbers), q4 browser-tool cold/warm path (C-28 steps
5-8, WARM = §5.2's ≤250ms p95).

### build/flauz/README.md

Job map (every workflow/script → MIGRATION §5 job → PERF §6.3 gate → §8
closure), script table with modes/exit codes, skip-vs-fail policy, local-run
instructions, the capture contract, fixture receipts, honest follow-ups.

### test/fixtures/ (52 files)

- `perf-timers/`: upstream/flauz append-timers TSVs (pass/regressed/too-few) +
  duration-marker TSVs (pass/regressed with absent pair) — deterministic
  nearest-rank percentiles.
- `process-shape/`: resolveProcesses-shaped JSONs (eventually PASS; after-session
  PASS at 498MB; violations FAIL: R1+R3+R4+R5), `--status` text, `--ps` text.
- `manifests/`: good set (the four MIGRATION §2 extensions); bad/ (12 files —
  every rule R1-R8 violated at least once, incl. invalid JSON); bad-set/
  (exactly R3).
- `rota/`: clean mini-tree, dirty mini-tree (absent proposals + registry
  mismatch), baseline snapshot (rename signature).
- `marks/`: src-ok (all budgeted emit sites + AfterRestored contribution),
  src-missing (3 marks without emit sites), src-phase-bad (BlockRestore).

---

## VERIFICATION-RECEIPTS (in-sandbox; no IDE boots, no CI runners — per MIGRATION §5 binding)

### 1. Script-vs-fixture matrix — `sh build/flauz/scripts/verify-fixtures.sh`

```
verify-fixtures: node v24.21.0, repo root /home/z/my-project/Flauz
  ok    perf-log-parse --selftest                            exit=0 (expected)
  ok    startup-pair timers PASS                             exit=0 (expected)
  ok    startup-pair markers PASS                            exit=0 (expected)
  ok    startup-pair regressed FAIL                          exit=1 (expected)
  ok    startup-pair too-few-runs FAIL                       exit=1 (expected)
  ok    check-marks src-ok PASS                              exit=0 (expected)
  ok    check-marks src-missing FAIL                         exit=1 (expected)
  ok    check-marks no-sources SKIP                          exit=0 (expected)
  ok    phase-gate src-ok PASS                               exit=0 (expected)
  ok    phase-gate src-phase-bad FAIL                        exit=1 (expected)
  ok    phase-gate no-sources SKIP                           exit=0 (expected)
  ok    memory eventually (json) PASS                        exit=0 (expected)
  ok    memory after-session (json) PASS                     exit=0 (expected)
  ok    memory violations (json) FAIL                        exit=1 (expected)
  ok    memory violations --enforce (R1) FAIL                exit=1 (expected)
  ok    memory eventually (status text) PASS                 exit=0 (expected)
  ok    memory eventually (ps text) PASS                     exit=0 (expected)
  ok    activation-lint good set PASS                        exit=0 (expected)
  ok    activation-lint bad dir FAIL (R1-R8)                 exit=1 (expected)
  ok    activation-lint bad-set FAIL (R3 only)               exit=1 (expected)
  ok    activation-lint empty dir SKIP                       exit=0 (expected)
  ok    activation-lint empty dir --require FAIL             exit=1 (expected)
  ok    rota clean fixture PASS                              exit=0 (expected)
  ok    rota dirty fixture FAIL (absent+mismatch)            exit=1 (expected)
  ok    rota dirty + baseline FAIL (deltas)                  exit=1 (expected)
  ok    rota dirty --no-fail (informational)                 exit=0 (expected)
  ok    rota real mirror (no lanes) SKIP                     exit=0 (expected)
  ok    fork-critical guard on this branch PASS              exit=0 (expected)
  ok    fork-critical guard usage error (no base)            exit=2 (expected)
----------------------------------------------------------------
verify-fixtures: ALL 29 CASES AS EXPECTED (0 deviations)
```

Key output lines (spot receipts):

- startup-pair timers PASS: `PASS §1.3 row 1 first-paint p50 delta: delta +23.0ms (budget +75ms)` · `p95 delta +26.0ms (budget +150ms)` · `row 2 … +26.0ms (budget +100ms)`
- startup-pair regressed FAIL: `+220.0ms` / `+247.0ms` / `+247.0ms` over budget; markers: `handshake p95 678.0ms … (absolute budget 500ms)` + `willWarmModels … absent from ALL 10 flauz run(s) (R6 drift class)`
- memory violations: `R3 3 concurrent agent sessions > 2` · `R4 3 visible browser panes > 2` · `R5 flauz-added RSS total 1077MB > 500MB`; with `--enforce` also `R1 … 310MB outside [100, 250]MB [E]`
- rota dirty: `ABSENT: 'oldRenamed' … extensionsProposedApi.ts:47 will silently drop it at runtime` + `INVENTORY-REMOVED: 'chatHooks' — possible RENAME to 'chatHooksNew' (name similarity)` + DECISION-LOG reminder block
- FORK-CRITICAL guard failure modes proven on a scratch branch (deleted after):
  refs `exit=1`, staged `exit=1`, name-only lists `src/vs/base/common/platform.ts`

### 2. Workflow YAML validation (python3 3.12.14 + pyyaml 6.0.3)

```
YAML OK   .github/workflows/flauz-canaries.yml  jobs=4 steps=21
YAML OK   .github/workflows/flauz-hygiene.yml   jobs=1 steps=14
YAML OK   .github/workflows/flauz-perf.yml      jobs=2 steps=29
YAML OK   .github/workflows/flauz-rota.yml      jobs=1 steps=5
STRUCTURAL CHECKS PASSED
```

Structural checks performed programmatically: parse OK; jobs non-empty;
`workflow_dispatch` trigger present; push/pull_request paths include all four
gating patterns; `permissions` read-only; no `secrets.*` anywhere; every job
has `runs-on` + `timeout-minutes`; every step has `run:` or `uses:`; no
`uses:` inside `run:` blocks.

### 3. FORK-CRITICAL guard receipt (verification standard item 3)

```
$ git status --porcelain | wc -l          → 0        (clean)
$ git -c core.quotepath=false diff --name-only 9bf9ae764da..HEAD | wc -l → 69
  (.github/workflows 4 · build/flauz 13 · test/fixtures 52 — ONLY new paths)
$ git diff --stat upstream/main...HEAD -- src/vs ':(exclude)src/vs/workbench/contrib/flauz' | wc -l → 0  (EMPTY)
$ sh build/flauz/scripts/fork-critical-guard.sh --base upstream/main --head HEAD
  fork-critical-guard: PASS — src/vs divergence outside contrib/flauz is EMPTY
  fork-critical-guard: FORK-CRITICAL ledger stays EMPTY (DL-12/DL-10).
```

### 4. Environment

node v24.21.0 · python3 3.12.14 + pyyaml 6.0.3 · git 2.47.3 · mirror clone
`/home/z/my-project/Flauz` HEAD == `9bf9ae764da438b1234a8243dc9e47173ef58ee7`
(SHA-verified at clone). No repo build ever run (sandbox discipline).

---

## CI-JOB-MAP (workflow → MIGRATION-PLAN §5 job → PERF §8 closure)

| Workflow | §5 job | What it enforces | §8 closure |
|---|---|---|---|
| flauz-hygiene.yml | 1 (build + upstream hygiene) | upstream compile/eslint/unit subset + FORK-CRITICAL guard + activation lint (§2.1/§2.2) | — |
| flauz-perf.yml · startup-pair | 2 (startup perf pair) | §1.3 rows 1-3 deltas; duration markers on code/flauz/* pairs; mark-pair integrity (R6); §1.3 row 4 phase gate | q1 (absolute baseline), q2 (prewarm on/off, dispatch recipe) |
| flauz-perf.yml · memory-snapshot | 3 (memory snapshot) | §3.2 R1-R6 at Eventually + after scripted session | q3 (pinned ext-host RSS + totals), q1 (stock ps baseline) |
| flauz-canaries.yml | 4 (sync canaries, every sync per DL-11) | C-20/C-23/C-24/C-28 specs; U-1 closure spike | q4 (C-28 cold/warm browser-tool path) |
| flauz-rota.yml | 5 (proposed-API rota) + 6 (checkpoint support) | DL-4 union drift + baseline deltas; DECISION-LOG reminder; `--snapshot` at tags | — |

---

## DECISION-LOG-PROPOSALS (DL-16+ candidates)

1. **DL-16: perf-pair runner class + N.** Pin the startup pair to
   `ubuntu-24.04` (not `ubuntu-latest`) and N=10 nearest-rank (p50 = 5th, p95 =
   max of 10) — absolute numbers are only meaningful per runner class; deltas
   stay the portable contract. Alternative: larger N (20) at monthly sync
   checkpoints for tighter confidence.
2. **DL-17: gating paths for Flauz CI.** Adopt exactly
   `extensions/flauz-*/**`, `build/flauz/**`, `product.flauz.json`,
   `.github/workflows/flauz-*` (already uniform across all four workflows);
   additions (e.g. `.flauz/**`) require an entry here.
3. **DL-18: skip-vs-fail merge-window policy.** Zero-dep gates SKIP (recorded,
   greppable) while lanes F/G are unmerged, so CI stays green through the
   Wave-3 merge window; `--require*` flags exist to flip skips to failures —
   the sync runbook should flip them at the first `flauz/sync/<date>` tag
   AFTER lane F lands.
4. **DL-19: memory capture contract.** §3.2 CI assertions accept three
   interchangeable capture paths (resolveProcesses-JSON [mem in MB],
   `--status` text, ps text); lane F's eventual dump command supersedes ps
   without changing the assertion layer. (Also notes Linux `ProcessItem.mem`
   is percent-of-total — converters must apply totalmem, as diagnosticsService
   does.)
5. **DL-20 (candidate, flagged not decided): GITHUB_TOKEN exception.** The
   no-secrets constraint omits `GITHUB_TOKEN` from the upstream compile&hygiene
   line; if an upstream sub-step ever hard-requires it, propose a narrow
   exception (auto-token, read-only) rather than widening the policy.
6. **§8 recalibration entries** (post-first-CI-baseline): convert §1.3 [E]
   absolutes to `upstream.p95 + delta` hard gates; promote memory R1 to
   `--enforce` defaults once measured (measure-§8.md defines each act).

---

## GAPS-AND-SKIPS (honest list, with blocking reasons)

1. **Real CI execution not run** — GitHub runners don't exist in this sandbox
   (MIGRATION §5 binding). Workflows are YAML-validated + structurally checked
   only; first real run happens when the TL pushes `flauz/wave3/perf-ci` (or
   merges it) and the workflows trigger. Expect first-run friction in the
   upstream-pipeline steps (cache keys, apt flakes) — the zero-dep Flauz steps
   are fixture-proven.
2. **Real IDE boots not run** — no build in the 2-core/4GB sandbox (binding).
   All perf-log formats were derived from source (`startupTimings.ts`,
   `timerService.ts`, `diagnosticsService.ts`, `processMainService.ts`) and
   fixtures mirror those formats exactly; first real boot validates the
   end-to-end formats.
3. **Canary interactive assertions WAITING-ON-LANE F** — A5/A6 (C-20), A3-A5
   (C-23), A2-A5 (C-24), A3-A5 (C-28) need the session/agent wiring from
   `extensions/flauz-agent` + `product.flauz.json` (Worker F). Jobs run
   PROBE-ONLY with recorded reasons until then; specs carry the full steps.
4. **§8 q2 prewarm variant is a dispatch recipe, not a knob** — two manual
   workflow_dispatch runs with different provider settings (measure-§8.md §q2);
   automating the settings injection is deferred until the first baseline
   proves the recipe.
5. **§1.3 row 5 (Agent Bridge activation ≤300ms/≤50ms)** is gated via the
   bridge-emitted mark pair (`code/flauz/willActivateBridge-didActivateBridge`
   in startup-pair budgets) + spec'd from `extensionActivationTimes` telemetry
   (PERF §2.2); the telemetry-parse path lands with lane F's marks — noted in
   README §8.
6. **pyyaml availability was checked and present** (no skip needed); python3
   was used for YAML validation and fixture generation only — all shipped
   scripts are node/sh.
7. **Bundle/stage refreshed at every milestone** (5 refreshes; see worklog) —
   pod-recycle cost is capped at the current milestone by design.

---

*Transit: TL harvests this directory; pushes are credential-blocked from the
sandbox (platform redacts tokens). Completion gate line follows in the worker
message.*
