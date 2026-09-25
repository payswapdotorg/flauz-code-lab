# Prototype: model-provider-fabric (charter prototype #3)

**Zero-install** (Node ≥ 20, no npm deps, deterministic seed) proof of the multi-model
abstraction layer — **D-2 / DL-3**: Flauz's default agent is a vendor-neutral participant,
and model routing composes `vscode.lm` selectors instead of hard-coding vendors.

```
node index.mjs                    # run the demo (deterministic; seed 1337)
node index.mjs --seed 42          # different seeded run
node index.mjs --json out/x.json  # alternate JSON artifact path
```

Run transcript captured as evidence: `../../evidence/e-perf-migration/run-model-provider-fabric.txt`
(+ JSON artifact in `out/run-report.json`).

## What it proves

| # | Claim | How it's proven |
|---|---|---|
| P1 | The selector contract is sufficient for vendor-neutral routing | mock registry of 6 models / 6 vendors (Codex, Claude, Qwen, Muse, Copilot, local-Ollama per C-19); routing via `{vendor}` / `{family}` / `{id}` selectors only — §2 and §4 of the run |
| P2 | Selector semantics mirror the reference tree exactly | matching logic is a line-for-line port of `src/vs/workbench/contrib/chat/common/languageModels.ts:1412-1435` @ `9bf9ae764da`: strict `===` on each present field, `undefined` = wildcard, empty selector ⇒ resolve ALL vendors ⇒ return every cached model, no matches ⇒ `[]`. Case-sensitivity is demonstrated live (`{vendor:'Anthropic'}` ⇒ 0 matches). Negative fact preserved: the historical "illegal open-ended selector" throw does **not** exist at this commit |
| P3 | Provider registration is vendor-keyed and pluggable | mock provider extensions keyed by globally-unique vendor (mirrors `registerLanguageModelChatProvider(vendor, provider)` — `src/vscode-dts/vscode.d.ts:20844-20851`) |
| P4 | First-resolution vendor cost = extension activation | one-time `onLanguageModelChatProvider:<vendor>` activation then cached (mirrors `languageModels.ts:1223-1244`) — grounds PERFORMANCE-PLAN §5.1's pre-warm rule |
| P5 | Per-request cost/latency accounting is derivable at the routing layer | per-model in/out token counts, per-1M costs (field names from `vscode.proposed.languageModelPricing.d.ts`: `inputCost`/`outputCost`/`cacheCost`/`cacheWriteCost`/`priceCategory`/`category` + display `pricing` label), latency, tok/s; unmetered models (Copilot subscription, local) are first-class |
| P6 | Policy sits *on top* of the fabric | §5 of the run routes task-classes to models by `priceCategory`/`category` metadata — zero vendor-specific code |

## Tree anchors (why this maps to the product)

- `lm.selectChatModels` — `src/vscode-dts/vscode.d.ts:20745-20770` ("When omitted all chat models are returned").
- `LanguageModelChat` — `vscode.d.ts:20242-20312` (`sendRequest` :20302, `countTokens` :20311, `maxInputTokens`, `vendor`/`family`/`version`).
- Provider API — `vscode.d.ts:20844-20851`.
- Pricing metadata (proposed) — `src/vscode-dts/vscode.proposed.languageModelPricing.d.ts:10-78`.
- Matching implementation — `src/vs/workbench/contrib/chat/common/languageModels.ts:1412-1435`.
- Model picker/management surfaces already exist renderer-side (C-20): `contrib/chat/browser/widget/input/modelPicker/` (21 files), `chatManagement/` (5), `aiCustomization/` (43).

Per C's matrix C-19 (INTEGRABLE, stable API) this decouples the product from vendor SDKs:
the Wave-3 `extensions/flauz-models` vendor pack implements providers against
`registerLanguageModelChatProvider`, and the Flauz orchestrator only ever speaks selectors
— exactly the boundary rehearsed here. Cost accounting (C-21: no cross-agent budget
accounting upstream) consumes the per-request records this prototype shapes.

## What it does NOT prove

- Real provider auth/streams (`sendRequest` is a deterministic mock — real latency/TTFB
  numbers belong to CI measurement, PERFORMANCE-PLAN §8).
- `onDidChangeChatModels` dynamic re-query behavior (noted in d.ts:20764-20765; static registry here).
- The `languageModelChatProviders` package.json contribution point (required by the real API; N/A for a standalone demo).

## Files

- `index.mjs` — the fabric + demo (registry, selector, provider-activation simulation, routing, accounting, JSON artifact).
- `out/run-report.json` — machine-readable run artifact (committed as evidence).
