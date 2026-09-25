# Evidence 05 — Proposed-API enablement: distribution-level, zero-fork posture

Tree: payswapdotorg/Flauz @ 9bf9ae764da. Quotes verbatim (2-b bundle).

## product.json `extensionEnabledApiProposals` wins over the extension manifest

`src/vs/workbench/services/extensions/common/extensionsProposedApi.ts:42-55`:
```ts
// NEW world - product.json spells out what proposals each extension can use
if (productService.extensionEnabledApiProposals) {
	for (const [k, value] of Object.entries(productService.extensionEnabledApiProposals)) {
		const key = ExtensionIdentifier.toKey(k);
		const proposalNames = value.filter(name => { if (!allApiProposals[<ApiProposalName>name]) { ...DOES NOT EXIST... } return true; });
		this._productEnabledExtensions.set(key, proposalNames);
```
`extensionsProposedApi.ts:80-101` — for product-enabled extensions, product.json proposals **override** the manifest's declaration ("NOTE that proposals that are listed in product.json override whatever is declared in the extension itself. This is needed for us to know what proposals are used 'in the wild'...").

## Otherwise: built-ins keep declared proposals; non-built-ins get stripped

`extensionsProposedApi.ts:104-114`:
```ts
if (this._envEnablesProposedApiForAll || this._envEnabledExtensions.has(key)) {
	// proposed API usage is not restricted and allowed just like the extension has declared it
	return;
}
if (!extension.isBuiltin && isNonEmptyArray(extension.enabledApiProposals)) {
	// restrictive: extension cannot use proposed API in this context and its declaration is nulled
	...
	extension.enabledApiProposals = [];
}
```
Dev/source runs (`--enable-proposed-api`) open the gate for all (`:34-37`).

## Runtime guard: property-access-time check, no upfront cost

- API factory: `src/vs/workbench/api/common/extHost.api.impl.ts:150` `export function createApiFactoryAndRegisterActors(accessor: ServicesAccessor): IExtensionApiFactory {` — proposed surfaces are gated inline via `checkProposedApiEnabled(extension, '<proposalName>')` calls sprinkled through the factory (e.g. lines 141, 331, 344, 360, 400, 448, 495, 516, 584...). Negative: `extHostApiFactory.ts` does not exist (renamed to `extHost.api.impl.ts`).
- The guard — `src/vs/workbench/services/extensions/common/extensions.ts:330-334`:
```ts
export function checkProposedApiEnabled(extension: IExtensionDescription, proposal: ApiProposalName): void {
	if (!isProposedApiEnabled(extension, proposal)) {
		throw new Error(`Extension '${extension.identifier.value}' CANNOT use API proposal: ${proposal}. ... you must start in extension development mode or use the following command line switch: --enable-proposed-api ${extension.identifier.value}`);
	}
}
```

## Scale of the proposed surface

- **180** files matching `src/vscode-dts/vscode.proposed.*.d.ts` (glob count, 2-b) — includes `vscode.proposed.extensionAffinity.d.ts`, `vscode.proposed.agentSessionsWorkspace.d.ts`, `vscode.proposed.remoteCodingAgents.d.ts`, `vscode.proposed.mcpServerDefinitions.d.ts`, `vscode.proposed.browser.d.ts`, `vscode.proposed.languageModelPricing.d.ts`, `vscode.proposed.chatSessionsProvider.d.ts`, `vscode.proposed.scmArtifactProvider.d.ts`, ...
- Churn precedent: the public API d.ts itself was relocated to `src/vscode-dts/` (C's EV-11 N-12; verified by this wave's negative searches for classic paths).

## Claims supported (→ PERFORMANCE-PLAN §2, MIGRATION-PLAN §2/§5)

1. DL-4's posture (enable-for-built-ins via `extensionEnabledApiProposals` in product.flauz.json) is exactly the mechanism the tree provides; runtime overhead is a guard function per property access (negligible); the real cost is upstream churn tracking across ~180 proposal files.
2. Proposed-API enablement adds NO activation/startup cost by itself; it changes review/migration surface only.
3. A per-sync canary must diff the Flauz-enabled proposal list vs upstream renames/removals (the empty `remoteCodingAgents` placeholder is a live example — C's EV-11 N-4/U-2).
