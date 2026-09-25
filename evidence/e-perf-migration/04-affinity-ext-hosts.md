# Evidence 04 — Affinity → extra extension-host processes; ext-host kinds & counts

Tree: payswapdotorg/Flauz @ 9bf9ae764da. Quotes verbatim, path:line verified (2-b bundle + spot-check).

## The setting

`src/vs/workbench/contrib/extensions/browser/extensions.contribution.ts:269-284`:
```ts
'extensions.experimental.affinity': {
	type: 'object',
	markdownDescription: localize('extensions.affinity', "Configure an extension to execute in a different extension host process."),
	patternProperties: {
		'([a-z0-9A-Z][a-z0-9-A-Z]*)\\.([a-z0-9A-Z][a-z0-9-A-Z]*)$': {
			type: 'integer',
			default: 1
		}
	},
	additionalProperties: false,
	default: {},
```
(only 3 occurrences in src/vs: registration, consumer below, one test).

## Consumption: each distinct affinity value allocates a NEW local-process ext-host slot

`src/vs/workbench/services/extensions/common/extensionRunningLocationTracker.ts:167-174` (verified directly):
```ts
			const configuredAffinities = this._configurationService.getValue<{ [extensionId: string]: number } | undefined>('extensions.experimental.affinity') || {};
			const configuredExtensionIds = Object.keys(configuredAffinities);
			const configuredAffinityToResultingAffinity = new Map<number, number>();
			for (const extensionId of configuredExtensionIds) {
				const configuredAffinity = configuredAffinities[extensionId];
				if (typeof configuredAffinity !== 'number' || configuredAffinity <= 0 || Math.floor(configuredAffinity) !== configuredAffinity) {
					this._logService.info(`Ignoring configured affinity for '${extensionId}' because the value is not a positive integer.`);
					continue;
```
- `_computeAffinity` allocates `const affinity3 = ++lastAffinity;` per distinct configured value; extensions sharing a value share the host; groups also merge by `extensionDependencies` and by the proposed `extensionAffinity` manifest field (gated on `isProposedApiEnabled(extension, 'extensionAffinity')`).
- **Initial allocation only**: `extensionRunningLocationTracker.ts` — `this._logService.info(\`Ignoring configured affinity for '${extensionId}' because extension host(s) are already running. Reload window.\`)`; affinity is ignored under `isExtensionDevelopment` (debugging runs a single ext host).
- Log marker when placed: `:222` `this._logService.info(\`Placing extension(s) ${...} on a separate extension host.\`)` — usable as a CI canary assertion string.

## One ExtensionHostManager (one utility process) per affinity slot

`src/vs/workbench/services/extensions/common/abstractExtensionService.ts:820-834` (verified directly):
```ts
	private _startExtensionHostsIfNecessary(isInitialStart: boolean, initialActivationEvents: string[]): void {
		const locations: ExtensionRunningLocation[] = [];
		for (let affinity = 0; affinity <= this._runningLocations.maxLocalProcessAffinity; affinity++) {
			locations.push(new LocalProcessRunningLocation(affinity));
		}
		for (let affinity = 0; affinity <= this._runningLocations.maxLocalWebWorkerAffinity; affinity++) {
			locations.push(new LocalWebWorkerRunningLocation(affinity));
		}
		locations.push(new RemoteRunningLocation());
		for (const location of locations) {
			if (this._extensionHostManagers.getByRunningLocation(location)) {
				// already running
				continue;
			}
			const res = this._createExtensionHostManager(location, isInitialStart, initialActivationEvents);
```

## Ext-host kinds and defaults

- `src/vs/workbench/services/extensions/common/extensionHostKind.ts:9-13`:
```ts
export const enum ExtensionHostKind {
	LocalProcess = 1,
	LocalWebWorker = 2,
	Remote = 3
}
```
- Factory switch: `src/vs/workbench/services/extensions/electron-browser/nativeExtensionService.ts:565-590` — `LocalProcess` → `NativeLocalProcessExtensionHost` (`electron-browser/localProcessExtensionHost.ts:95`); `LocalWebWorker` → `WebWorkerExtensionHost` (`browser/webWorkerExtensionHost.ts`, iframe-hosted worker); `Remote` → `RemoteExtensionHost` (`common/remoteExtensionHost.ts:47`) when a remote authority is connected.
- **Default count: exactly 1 local-process ext host per window** (default `maxLocalProcessAffinity = 0` → loop `0..0` yields one location). Negative: no `ExtensionHostLocation`/`AffinityState` types in this tree.

## Ext-host process spawn (utility process, not fork)

`src/vs/platform/extensions/electron-main/extensionHostStarter.ts:105-127`:
```ts
async start(id: string, opts: IExtensionHostProcessOptions): Promise<{ pid: number | undefined }> {
	...
	extHost.start({
		...opts,
		type: 'extensionHost',
		name: 'extension-host',
		entryPoint: 'vs/workbench/api/node/extensionHostProcess',
		...
		windowLifecycleBound: true,
		windowLifecycleGraceTime: extensionHostGraceTimeMs,
		correlationId: id
	});
```
(`createExtensionHost()` constructs a `WindowUtilityProcess` — Electron `utilityProcess`.) Renderer side: `localProcessExtensionHost.ts:221-233` sets `VSCODE_ESM_ENTRYPOINT: 'vs/workbench/api/node/extensionHostProcess'`. Ext-host entry file: `src/vs/workbench/api/node/extensionHostProcess.ts` (negative: `services/extensions/node/extensionHostProcessSetup.ts` does not exist — renamed).

## Memory levers

- Negative: no per-ext-host memory flag exists (`VSCODE_MAX_MEMORY` absent; no `--max-old-space-size` in ext-host spawn args).
- Only user lever over ext-host heap: `argv.json` `jsFlags` — `src/vs/workbench/electron-browser/desktop.contribution.ts:467`: "Specifies V8 JavaScript engine flags to pass (e.g. \"--max-old-space-size=4096\"). These flags are applied to the main process, renderer and utility processes."

## Claims supported (→ PERFORMANCE-PLAN §2, §3)

1. DL-5's affinity-pinned Agent Bridge costs exactly ONE additional extension-host utility process — bounded, known cost.
2. The pin is config-only (`extensions.experimental.affinity: {"flauz.agent-bridge": 1}`), experimental, initial-allocation-only (reload required), and ignored while debugging — needs a canary + fallback posture.
3. Memory accounting surface: Process Explorer + `extensionHostStartup` telemetry give per-host health; per-host heap has no dedicated knob (jsFlags is global).
