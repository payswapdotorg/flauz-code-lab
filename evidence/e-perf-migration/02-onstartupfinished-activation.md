# Evidence 02 — `onStartupFinished` activation + eager/star activation discipline

Tree: payswapdotorg/Flauz @ 9bf9ae764da. Quotes verbatim, path:line verified.

## onStartupFinished fires after ALL eager activation, hard-capped at 10s

`src/vs/workbench/api/common/extHostExtensionService.ts:671-687` (verified directly):
```ts
	private _handleEagerExtensions(): Promise<void> {
		const starActivation = this._activateByEvent('*', true).then(undefined, (err) => {
			this._logService.error(err);
		});
		...
		const eagerExtensionsActivation = Promise.all([remoteResolverActivation, starActivation, workspaceContainsActivation]).then(() => { });

		Promise.race([eagerExtensionsActivation, timeout(10000)]).then(() => {
			this._activateAllStartupFinished();
		});

		return eagerExtensionsActivation;
	}
```

## onStartupFinished forwards ext-host marks; deferred variant exists (50ms chunks)

- `extHostExtensionService.ts:647-668` — `_activateAllStartupFinished()` first calls `this._mainThreadExtensionsProxy.$setPerformanceMarks(performance.getMarks())`, then reads `extensions.experimental.deferredStartupFinishedActivation` and either activates directly or calls `_activateAllStartupFinishedDeferred`.
- Deferred variant budget `extHostExtensionService.ts:624-645`:
```ts
	private _activateAllStartupFinishedDeferred(extensions: IExtensionDescription[], start: number = 0): void {
		const timeBudget = 50; // 50 milliseconds
		const startTime = Date.now();

		setTimeout0(() => {
			for (let i = start; i < extensions.length; i += 1) {
				const desc = extensions[i];
				for (const activationEvent of (desc.activationEvents ?? [])) {
					if (activationEvent === 'onStartupFinished') {
						if (Date.now() - startTime > timeBudget) {
							// time budget for current task has been exceeded
							// set a new task to activate current and remaining extensions
							this._activateAllStartupFinishedDeferred(extensions, i);
```
- Setting id: `extensions.experimental.deferredStartupFinishedActivation` — registered `src/vs/workbench/contrib/extensions/browser/extensions.contribution.ts:314` ("When enabled, extensions which declare the `onStartupFinished` activation event will be activated after a timeout.")

## Activation-event documentation lives in the manifest schema, NOT vscode.d.ts

`src/vs/workbench/services/extensions/common/extensionsRegistry.ts:312-316` (verified directly):
```ts
				{
					label: 'onStartupFinished',
					description: nls.localize('vscode.extension.activationEvents.onStartupFinished', 'An activation event emitted after the start-up finished (after all `*` activated extensions have finished activating).'),
					body: 'onStartupFinished'
				},
```
Negative (2-a): `onStartupFinished` has ZERO matches in `src/vscode-dts/vscode.d.ts`.

## Star activation: fired once, eagerly, deduped

- `src/vs/workbench/api/common/extHostExtensionActivator.ts:172-229` — `activateByEvent` short-circuits via `_alreadyActivatedEvents` map ("A map of already activated events to speed things up if the same activation event is triggered multiple times.").
- Renderer-side dedup-by-promise: `src/vs/workbench/services/extensions/common/extensionHostManager.ts:65-68, 327-332` — `_cachedActivationEvents` map.
- Activation-interest short-circuit: `abstractExtensionService.ts:989-1001` — `if (!this._registry.containsActivationEvent(activationEvent)) { return NO_OP_VOID_PROMISE; }`
- Progress UI caps activation waits: `src/vs/workbench/contrib/extensions/browser/extensionsActivationProgress.ts:43` — `Promise.race([e.activation, timeout(5000, CancellationToken.None)])`.

## Activation timings telemetry (per-extension)

`src/vs/workbench/api/common/extHostExtensionService.ts:430-473`:
```ts
const activationTimes = activatedExtension.activationTimes;
this._mainThreadExtensionsProxy.$onDidActivateExtension(extensionDescription.identifier, activationTimes.codeLoadingTime, activationTimes.activateCallTime, activationTimes.activateResolvedTime, reason);
this._logExtensionActivationTimes(extensionDescription, reason, 'success', activationTimes);
```
```ts
this._mainThreadTelemetryProxy.$publicLog2<ExtensionActivationTimesEvent, ExtensionActivationTimesClassification>('extensionActivationTimes', {
	...event, ...(activationTimes || {}), outcome
});
```
Fields: `startup?, codeLoadingTime?, activateCallTime?, activateResolvedTime?` (`:453-458`). Ext-host perf marks per extension: `code/extHost/willActivateExtension/<id>` / `didActivateExtension/<id>` (`:493, :496`). Host-level startup event: `extensionHostManager.ts:110-115` — `publicLog2('extensionHostStartup', ...)` with `action: 'starting' | 'success' | 'error'`, `kind: LocalProcess | LocalWebWorker | Remote`.

## LM vendor resolution itself triggers activation (latency-relevant!)

`src/vs/workbench/contrib/chat/common/languageModels.ts:1223-1237` (verified directly):
```ts
	private async _resolveAllLanguageModels(vendorId: string, silent: boolean): Promise<void> {

		const vendor = this._vendors.get(vendorId);

		if (!vendor) {
			return;
		}

		// If a provider is already registered (e.g. a renderer-side provider
		// such as the agent host), skip the activation wait — there's nothing
		// more for an extension to contribute, and waiting would block on
		// extension host startup unnecessarily.
		let provider = this._providers.get(vendorId);
		if (!provider) {
			// Activate extensions before requesting to resolve the models
```
(continues into `activateByEvent('onLanguageModelChatProvider:${vendorId}')` — see evidence 09.)

## Claims supported (→ PERFORMANCE-PLAN §1, §2)

1. `onStartupFinished` = "after all `*` extensions finished activating", capped at 10s — the correct hook for Flauz Agent Bridge startup work; never declare `*`.
2. A throttled deferred variant exists in-tree (`extensions.experimental.deferredStartupFinishedActivation`, 50ms/chunk) — a zero-fork lever if activation storms appear.
3. Per-extension activation cost is already telemetered (`extensionActivationTimes`) → Flauz CI can gate on flauz-* activation budgets without new instrumentation.
4. First `lm.selectChatModels` on a vendor may pay extension-activation cost → pre-warm vendor resolution at handshake.
