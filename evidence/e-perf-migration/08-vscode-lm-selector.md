# Evidence 08 — vscode.lm: selector semantics + provider registration + pricing metadata

Tree: payswapdotorg/Flauz @ 9bf9ae764da. Quotes verbatim, path:line verified (2-c bundle + direct greps).
This is the spec `prototypes/model-provider-fabric/` mirrors.

## d.ts surface (src/vscode-dts/vscode.d.ts)

- `:20745-20770` (verified directly):
```ts
	/**
	 * Select chat models by a {@link LanguageModelChatSelector selector}. This can yield multiple or no chat models and
	 * extensions must handle these cases, esp. when no chat model exists, gracefully.
	 ...
	 * A selector can be written to broadly match all models of a given vendor or family, or it can narrowly select one model by ID.
	 ...
	 * @param selector A chat model selector. When omitted all chat models are returned.
	 * @returns An array of chat models, can be empty!
	 */
	export function selectChatModels(selector?: LanguageModelChatSelector): Thenable<LanguageModelChat[]>;
```
- `:20314-20344`:
```ts
export interface LanguageModelChatSelector {
	vendor?: string;
	family?: string;
	version?: string;
	id?: string;
}
```
Negative: NO doc note in this build that an empty selector is illegal (all fields optional; omission allowed).
- `LanguageModelChat` `:20242-20312`: `readonly name; readonly id; readonly vendor; readonly family; readonly version; readonly maxInputTokens: number;` + `sendRequest(messages, options?, token?): Thenable<LanguageModelChatResponse>` (`:20302`) + `countTokens(text, token?): Thenable<number>` (`:20311`).
- `registerLanguageModelChatProvider` `:20844-20851`:
```ts
	/**
	 * Registers a {@linkcode LanguageModelChatProvider}
	 * Note: You must also define the language model chat provider via the `languageModelChatProviders` contribution point in package.json
	 * @param vendor The vendor for this provider. Must be globally unique. An example is `copilot` or `openai`.
	 */
	export function registerLanguageModelChatProvider(vendor: string, provider: LanguageModelChatProvider): Disposable;
```
- Provider shape `:20687-20722`: `provideLanguageModelChatInformation(options, token): ProviderResult<T[]>` (`:20700`), `provideLanguageModelChatResponse(model, messages, options, progress, token): Thenable<void>` (`:20712`), `provideTokenCount(model, text, token): Thenable<number>` (`:20721`), optional `onDidChangeLanguageModelChatInformation?`.
- Tool API: `lm.registerTool` `:20772-20778` ("A registered tool is available in the {@link lm.tools} list for any extension to see. But in order for it to be seen by a language model, it must be passed in the list of available tools in {@link LanguageModelChatRequestOptions.tools}."); `LanguageModelTool<T>` `:21161-21178` (`invoke(...)`, `prepareInvocation?(...)`).
- `chat.createChatParticipant` `:20116-20124`:
```ts
	/**
	 * Create a new {@link ChatParticipant chat participant} instance.
	 * @param id A unique identifier for the participant.
	 * @param handler: ChatRequestHandler
	 */
	export function createChatParticipant(id: string, handler: ChatRequestHandler): ChatParticipant;
```

## THE matching implementation (mirrored by the prototype)

`src/vs/workbench/api/common/extHost.api.impl.ts:1893-1895`:
```ts
		selectChatModels: (selector) => {
			return extHostLanguageModels.selectLanguageModels(extension, selector ?? {});
		},
```
`extHostLanguageModels.ts:489-496` → RPC `$selectChatModels` (`extHost.protocol.ts:1455`) → `mainThreadLanguageModels.ts:215-217` → **`src/vs/workbench/contrib/chat/common/languageModels.ts:1412-1435`** (verified directly):
```ts
	async selectLanguageModels(selector: ILanguageModelChatSelector): Promise<string[]> {

		if (selector.vendor) {
			await this._resolveAllLanguageModels(selector.vendor, true);
		} else {
			const allVendors = Array.from(this._vendors.keys());
			await Promise.all(allVendors.map(vendor => this._resolveAllLanguageModels(vendor, true)));
		}

		const result: string[] = [];

		for (const [internalModelIdentifier, model] of this._modelCache) {
			if ((selector.vendor === undefined || model.vendor === selector.vendor)
				&& (selector.family === undefined || model.family === selector.family)
				&& (selector.version === undefined || model.version === selector.version)
				&& (selector.id === undefined || model.id === selector.id)) {
				result.push(internalModelIdentifier);
			}
		}

		this._logService.trace('[LM] selected language models', selector, result);

		return result;
	}
```
Semantics (exact, for the prototype):
1. Vendor given → resolve just that vendor; no vendor → resolve ALL registered vendors (each resolution may activate `onLanguageModelChatProvider:<vendor>` extensions, `languageModels.ts:1223-1244`).
2. Filter: strict `===` on each present field (vendor/family/version/id); `undefined` = wildcard. Case-sensitive. No fuzzy, no prefix.
3. No matches → empty array. Empty/omitted selector → all cached models. (Negative: the classic "illegal open-ended selector" throw does NOT exist at this commit.)
4. Provider re-resolution guard: `mainThreadLanguageModels.ts:74-86` only fires `$onChatModelsChange` when the model-id set actually changes.

## Pricing metadata (proposed) — `src/vscode-dts/vscode.proposed.languageModelPricing.d.ts`

`LanguageModelChatInformation` fields `:10-78` (verified directly):
```ts
	readonly pricing?: string;              // display label, e.g. "Free", "$0.01/request"
	readonly inputCost?: number;            // AI credits / 1M input tokens
	readonly outputCost?: number;           // AI credits / 1M output tokens
	readonly cacheCost?: number;            // AI credits / 1M cached tokens
	readonly cacheWriteCost?: number;       // AI credits / 1M cache-write tokens
	readonly longContextInputCost?: number;   // only when long-context differs
	readonly longContextOutputCost?: number;
	readonly longContextCacheCost?: number;
	readonly longContextCacheWriteCost?: number;
	readonly priceCategory?: string;        // "low" | "medium" | "high" | "very_high"
	readonly category?: string;             // "lightweight" | "versatile" | "powerful"
```
Same fields augmented onto `LanguageModelChat` `:80-142` (doc: "provided by the model provider and is meant for display purposes only"). Ext-host copying: `extHostLanguageModels.ts:454-459`. Session-option mirror incl. `multiplierNumeric`, `promo {id, discountPercent, endsAt, message}`, `maxInputTokens/maxOutputTokens/maxContextWindowTokens`, `capabilities {vision, toolCalling}`: `vscode.proposed.chatSessionsProvider.d.ts:699-731`.

## Model picker + management stack (C-20 gating surface — confirmed)

- `src/vs/workbench/contrib/chat/browser/widget/input/modelPicker/` — 21 files (`modelPickerWidget.ts:113` "Renders a button showing the currently selected model name. On click, opens a grouped picker popup with: Auto → Promoted (recently used + curated) → Other Models (collapsed with search)."; tabbed picker; details/hover incl. pricing; badges; telemetry).
- `src/vs/workbench/contrib/chat/browser/chatManagement/` — 5 files (Models Management editor pane; BYOK vendor add-models dropdown `chatModelsWidget.ts:170-180`).
- `src/vs/workbench/contrib/chat/browser/aiCustomization/` — 43 files (customization management/marketplace/migration/welcome).

## Claims supported (→ prototype #3, PERFORMANCE-PLAN §2/§5, D-2)

1. The vendor/family/id selector contract is small, strict, and stable — a Flauz routing layer can mirror it exactly without core changes (D-2 multi-model decoupling is a pure extension-side concern).
2. Pricing metadata has a concrete in-tree shape (per-1M-token costs + categories + display label) — Flauz cost accounting should adopt these field names for upstream compatibility.
3. First selection on a cold vendor pays extension activation (onLanguageModelChatProvider:<vendor>) → pre-warm at Flauz handshake to keep chat first-token inside budget.
4. The model picker/management UI is renderer-side and gated on a default chat agent (C-20 ⚠) — DL-3's own-participant re-point lights it up; no Flauz UI fork needed.
