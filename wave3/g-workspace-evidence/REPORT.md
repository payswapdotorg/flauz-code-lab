# FLAUZ WAVE 3 — LANE G DELIVERY REPORT
## extensions/flauz-workspace — `.flauz/` state envelope + evidence ledger (first product-code vertical slice)

- **Lane**: G (Worker G)
- **Branch**: `flauz/wave3/workspace-evidence` (local; commit `26474ff8`)
- **Base**: `9bf9ae764da438b1234a8243dc9e47173ef58ee7` (github.com/payswapdotorg/Flauz, verified at clone time: `git rev-parse HEAD` byte-exact match)
- **Delta**: additive-only — 22 new files under `extensions/flauz-workspace/`, zero upstream files touched (FORK-CRITICAL ledger remains empty; DL-12 holds)
- **Rebuild note**: this delivery is the sandbox-reset REBUILD of the original W3-G
  slice, reconstructed exactly from the surviving design record
  (`/home/z/my-project/worklog.md`, W3-G section) per TL directive. Design, contract
  behavior, file layout (22 files) and test count (55) match the original.

---

## WHAT-BUILT

A built-in extension (`publisher: flauz`, `onStartupFinished` activation — allowed for
flauz-workspace per PERFORMANCE-PLAN §2.2) owning the agent workspace state:

| file | role |
| --- | --- |
| `package.json` | activation (`onStartupFinished` + 8 × `onCommand:`), `enabledApiProposals: ["scmArtifactProvider"]`, contributes `openEvidence` |
| `tsconfig.json` | standalone strict `noEmit` (no upstream tsconfig coupling, no @types/node) |
| `src/api.ts` | shared vocabulary: envelope/event/task/row types, the 9-transition table with actor gates, canonical JSON, deep-sorted serialization, pure-TypeScript sha256, `FileSystemPort`/`Clock` ports, POSIX path joins |
| `src/taskService.ts` | envelope ownership: `.flauz/` bootstrap (idempotent), strict v0 validation (unknown keys rejected), `T-NNN` id allocation, atomic tmp+rename writes, state machine via `appendEvent` (transition-typed events gated by actor+source status; others appended verbatim), evidence/checkpoint timeline recording |
| `src/ledger.ts` | append-only `.flauz/evidence/ledger.jsonl`: rows stored as canonical 7-field JSON lines, hash chain (row hash = sha256 over the canonical line, never stored; next row's `prev` carries it), `verify()` with `firstBadSeq` across tamper classes, strict input validation |
| `src/checkpoint.ts` | chatEditing interop decision matrix: **attested** (caller-held `undoStopId` from `ChatResultStream.externalEdit`) / **blocked** (null ref + gap row) — **verified** mode documented as unreachable at HEAD |
| `src/scmArtifactProvider.ts` | proposed `scmArtifactProvider` consumer: 4 static kind groups (changeset/screenshot/command-output/note), rows→artifacts with row timestamp + `openEvidence` command, `onDidChangeArtifacts` fires changed group ids |
| `src/commands.ts` | the command seam: 7 contract commands + additive `openEvidence`; registration through `globals.vscodeApi()` (mockable) |
| `src/extension.ts` | composition root — the ONLY runtime `vscode`/node importer; wires node-backed `FileSystemPort`, bootstraps `.flauz/`, attaches the artifact provider to a dedicated `SourceControl` (`flauz-evidence`) |
| `src/globals.ts` | ambient vscode accessor (set by activate / test shim) |
| `src/node-shims.d.ts` | minimal ambient declarations (`node:fs/promises`, `TextEncoder`) so src typechecks without @types/node |
| `vscode-dts/` | vendored `vscode.d.ts` + `vscode.proposed.scmArtifactProvider.d.ts`, PROVENANCE line prepended, remainder byte-identical (diff-verified) |
| `test/` | 5 suites + helpers + mock-vscode shims = **55 tests**, zero runtime deps |
| `README.md` | the `.flauz/` contract v0 documentation (layout, schemas, state machine, ledger rules, commands, checkpoint matrix, diffability discipline, v0 scope) |

Key design property: everything below the composition root is free of runtime
`vscode` and node imports (ports + `import type` only), so the identical source files
run under `node --test` (native type stripping, Node 24) and inside the extension
host. That is what makes the slice behaviorally verifiable in this sandbox without
building the workbench.

## VERIFICATION-RECEIPTS

All commands run in the clone `/home/z/my-project/Flauz` on branch
`flauz/wave3/workspace-evidence` (Node v24.21.0, git 2.47.3, TypeScript 5.9.3 — the
single dev-dependency, installed inside the extension folder).

```
$ git rev-parse HEAD                      # at clone time (base check)
9bf9ae764da438b1234a8243dc9e47173ef58ee7      # exact match, binding requirement

$ cd extensions/flauz-workspace && node_modules/.bin/tsc --noEmit
(no output)  exit 0                              # strict, noEmit, standalone tsconfig

$ node --test test/*.test.ts
ℹ tests 55   ℹ suites 0   ℹ pass 55   ℹ fail 0   ℹ cancelled 0   ℹ skipped 0   # 55/55 GREEN

$ git status --porcelain
(empty)                                          # clean tree after commit

$ git diff --name-only 9bf9ae764da438b1234a8243dc9e47173ef58ee7..HEAD
extensions/flauz-workspace/**  (22 paths, all new — FORK-CRITICAL guard PASS)

$ diff <(tail -n +2 vscode-dts/vscode.d.ts) ../../../src/vscode-dts/vscode.d.ts
(empty) → VSCODE_DTS_BYTE_IDENTICAL              # same for the proposal d.ts

# staged copy self-sufficiency (flauz-delivery/g-workspace-evidence/extensions/flauz-workspace):
$ node --test test/*.test.ts        → 55/55 pass, 0 fail   (zero deps — no node_modules)
$ tsc --noEmit                      → exit 0               (typescript provided as dev-dep)

$ git bundle create /home/z/my-project/wave3-g-workspace-evidence.bundle \
    9bf9ae764da..flauz/wave3/workspace-evidence        → written; refreshed at every milestone
```

Test distribution: stateMachine 20 (9 legal transitions incl. cancel-from-all-active,
5 representative illegal sources, 3 terminal-status sweeps over all 9 transitions,
3 actor-gate cases) · ledger 14 (genesis/chaining/canonical-line fixtures, sha256
cross-check vs node:crypto, clean-chain verify, 5 tamper classes, validation) ·
envelope 10 (bootstrap shape+idempotency, schema rejection, round-trip identity +
determinism, byte-exact canonical fixture, id allocation, timeline recording,
no-*.tmp-residue) · commands 8 (registration surface, round trips, transition
routing, malformed args, evidence+artifact-change, verifyLedger, unknown-task,
openEvidence routing) · checkpoint 3 (attested, blocked+gap row, unknown task).

## CONTRACT-DEVIATIONS

All deviations are additive or byte-level clarifications; the seam contract §4
behavior is unchanged:

1. **Envelope byte order is fully canonical (sorted keys)**, not the contract's
   field-listing order — logically identical, required for DL-9 git-diffability.
   Semantics (JSON equality) unaffected.
2. **Additive 8th command `flauz.workspace.openEvidence`** — required by the SCM
   artifact mapping (artifacts carry a command; the palette entry is contributed in
   package.json). The 7 contract commands match exactly.
3. **`createCheckpoint` attested mode** accepts a caller-held `stopId` without
   independent platform confirmation (no query API exists at HEAD — see
   checkpoint.ts header). It is recorded as `attested`, never as `verified`.
4. **Checkpoint `changes[]` entries use a synthetic uri**
   `flauz-checkpoint://<stopId>` (v0 semantics: the entry references the snapshot,
   not a file; file-level changes come from `changeset` evidence rows).
5. **`listTasks` returns tasks sorted by id** (deterministic output; file order
   stays insertion order).
6. **Strict v0 envelope validation** — unknown keys at envelope/task/timing/change
   levels are rejected rather than dropped (fail loudly on forward-incompatible
   data; free-form data lives in event payloads).
7. **Evidence ids** are `E-` + seq zero-padded to 6 (`E-000001`).
8. **Tests are executed, not typechecked** (`node --test` with native type
   stripping; the tsc program covers `src/` + `vscode-dts/`). Rationale: no
   @types/node in the sandbox-by-design dependency set; hand-rolling ambient node
   types for the full test surface would be more fragile than runtime verification.

## DECISION-LOG-PROPOSALS

Numbering provisional (pending TL arbitration against sibling-lane proposals).

**DL-16 — product.flauz.json keys for flauz built-ins (owner: Worker F).**
Built-ins get proposed APIs only via the product allowlist ("NEW world — product.json
spells out what proposals each extension can use"):
`src/vs/workbench/services/extensions/common/extensionsProposedApi.ts:42-55`, field
declared at `src/vs/base/common/product.ts:250`
(`extensionEnabledApiProposals?: { readonly [extensionId: string]: string[] }`).
Proposed keys:

```json
{
  "extensionEnabledApiProposals": {
    "flauz.flauz-workspace": ["scmArtifactProvider"]
  }
}
```

(Also reserve `"flauz.flauz-agent"` as a future key holder.) Without this key the
proposal is not granted even to built-ins — the extension degrades, it does not
fail loudly. Proposal: fail-fast at startup for flauz built-ins whose declared
proposals are not allowlisted (product-configuration check), so misconfiguration
surfaces in CI rather than as silent degradation.

**DL-17 — chatEditing out-of-band checkpoint API promotion (F-02-class).**
At HEAD, snapshot creation/restore are workbench-internal
(`chatEditingSession.ts:386-423`; storage `chatEditingSessionStorage.ts:22-47`;
drivers `chatEditingServiceImpl.ts:236/371`). The only extension-reachable mint is
`ChatResultStream.externalEdit()` inside a live chat request
(`extHostChatAgents2.ts:316-330` → `mainThreadChatAgents2.ts:495`), which returns the
platform `undoStopId`. Propose an extHost surface for out-of-band use:
`createChatEditingSnapshot(scope) → {stopId}` / `restoreChatEditingSnapshot(ref)` /
`getChatEditingSnapshotInfo(ref)` — enabling (a) the `verified` checkpoint mode
(platform-confirmed mint, replacing caller attestation), (b) checkpoint restore on
the verify-fail/rollback path, and (c) snapshot listing for evidence UI. Until
promoted, Lane G's blocked path (`{checkpointRef: null}` + gap row) is the contract.

**DL-18 — signed evidence/checkpoint chain (Wave-4 hook, SECURITY-MODEL §3.3).**
v0 ships hash-chain-only integrity. Propose Wave-4: key signing of ledger rows (or
checkpoint refs) plus a persisted ledger-size watermark to close the
truncated-tail detection gap (see LEDGER-V0-SCOPE). The `verifyLedger` result shape
already reserves room (`firstBadSeq`, `reason`) for richer failure reporting.

## GAPS-AND-SKIPS

Intentional, per MIGRATION-PLAN §5 (CI-side verification) and sandbox discipline
(~2 cores/4 GB; building the vscode workbench is FORBIDDEN):

- **Real-IDE boot** — extension activation inside a real Code OSS workbench not run
  here (requires the upstream build). CI must boot the workbench with the extension
  built-in and assert `.flauz/` bootstrap on workspace open.
- **Real SCM artifact UI** — the `scmArtifactProvider` rendering (4 groups, artifact
  list, openEvidence command invocation) is verified against the vendored d.ts shape
  + the git extension's consumer pattern (`extensions/git/src/artifactProvider.ts`,
  `repository.ts:1000`) but not visually in the SCM view. CI-side.
- **chatEditing runtime interop** — the attested path (externalEdit-minted stopId)
  is implemented to the documented surface; the live-request flow (agent tool
  calling `externalEdit` and passing the stopId to `createCheckpoint`) needs a real
  chat session. CI-side.
- **Upstream compile** — `main: ./out/extension.js` is produced by the upstream
  built-in-extension build; not compiled in this sandbox by design.
- **product.flauz.json keys NOT created** — owned by Worker F; proposed as DL-16
  instead of touching product files (lane boundary).

## LEDGER-V0-SCOPE

- Hash chain only; **no signatures** (Wave-4 hook — DL-18). Tampering anywhere
  except the tail is detected; a **truncated tail** (deleted last rows) is NOT
  detectable by the chain alone.
- `verify()` is a full O(n) recompute; no compaction, no partial verification, no
  caching.
- Single-writer assumption (the agent); no cross-process locking; envelope writes
  are atomic (tmp+rename) but ledger appends are plain appends (crash mid-append
  leaves a partial last line → `verify` reports it as a malformed line, `firstBadSeq`
  at that line number).
- Gap rows (blocked checkpoints) are `note`-kind rows with `flauz://gap/...` uris
  and a self-minted sha256 over the canonical gap payload — honest records of
  platform limits, not evidence of artifacts.
- Ledger rows carry exactly the 7 contract fields; notes ride the task timeline
  (`evidence` events) so the chain surface stays minimal and stable.
