# Evidence 01 — Startup path: entries, perf marks, lifecycle phases

Tree: payswapdotorg/Flauz @ 9bf9ae764da438b1234a8243dc9e47173ef58ee7 (read-only mirror).
All quotes verbatim; `path:line` from the working tree. Collected by Worker E (Wave 2), via
Explore agents 2-a + direct spot-verification (grep re-run, line numbers confirmed).

## Main-process entry structure (drift vs classic vscode: bootstrap lives in `src/main.ts`)

- `src/main.ts:23` `perf.mark('code/didStartMain');` — first main-process mark
- `src/main.ts:25-30`:
```ts
perf.mark('code/willLoadMainBundle', {
	// When built, the main bundle is a single JS file with all
	// dependencies inlined. As such, we mark `willLoadMainBundle`
	// as the start of the main bundle loading process.
	startTime: Math.floor(performance.timeOrigin)
});
```
- `src/main.ts:218` `perf.mark('code/mainAppReady');` (inside `async function onReady()`)
- `src/vs/code/electron-main/app.ts:792-794`:
```ts
			// Open Windows
			mark('code/willOpenFirstWindow');
			await appInstantiationService.invokeFunction(accessor => this.openFirstWindow(accessor, initialProtocolUrls));
			mark('code/didOpenFirstWindow');
```
- Full main-side mark inventory (2-a): `src/main.ts` → didStartMain, willLoadMainBundle, didLoadMainBundle, will/didConfigureCommandlineSwitches, will/didGetUserDataPath, will/didStartCrashReporter, will/didRegisterSchemesAsPrivileged, will/didRegisterListeners, will/didGetPreferredSystemLanguages, will/didWaitForAppReady, mainAppReady, will/didBootstrapESM, will/didRunMainBundle, will/didResolveNlsConfiguration; `src/vs/code/electron-main/main.ts:109-119` → will/didCreateMainServices, will/didInitMainServices; `:355-357` will/didStartMainServer; `src/vs/code/electron-main/app.ts:695-794` → willStartCodeApplication, will/didResolveMachineId, will/didInitAppServices, will/didInitChannels, will/didSetupProtocolUrlHandlers, will/didOpenFirstWindow.

## Renderer entry (drift: `electron-sandbox` layer is gone)

- Entry is `src/vs/workbench/electron-browser/desktop.main.ts` (no perf marks there; `open()` awaits `initServices()` + `domContentLoaded` in parallel, then `new Workbench(...)` + `workbench.startup()` — `desktop.main.ts:117-145`).
- Marks live in the bootstrap loader `src/vs/code/electron-browser/workbench/workbench.ts`:
  - `:13` `performance.mark('code/didStartRenderer');`
  - `:29-31`:
```ts
	function showSplash(configuration: INativeWindowConfiguration) {
		performance.mark('code/willShowPartsSplash');
		showDefaultSplash(configuration);
		performance.mark('code/didShowPartsSplash');
	}
```
  - `:744` `code/willLoadWorkbenchMain` → `:750` `code/didLoadWorkbenchMain` (workbench bundle import, tracked in `beforeImport` hook, `workbench.ts:720-745`)
- Splash content + marks are shipped in the window config BEFORE loadURL: `src/vs/platform/windows/electron-main/windowImpl.ts:1364-1373`:
```ts
			configuration.partsSplash = this.themeMainService.getWindowSplash(configuration.workspace);
			...
			// Update with latest perf marks
			mark('code/willOpenNewWindow');
			configuration.perfMarks = getMarks();
```

## Workbench lifecycle phases

- `src/vs/workbench/services/lifecycle/common/lifecycle.ts:188-217`:
```ts
export const enum LifecyclePhase {
	Starting = 1,
	Ready = 2,
	Restored = 3,
	Eventually = 4
}
```
- `WorkbenchPhase` alias enum: `src/vs/workbench/common/contributions.ts:31-62` (BlockStartup=Starting, BlockRestore=Ready, AfterRestored=Restored, Eventually=Eventually; doc: "The last phase after views, panels and editors have restored and some time has passed (2-5 seconds).")
- Phase transitions emit perf marks and open barriers — `src/vs/workbench/services/lifecycle/common/lifecycleService.ts:92-125`:
```ts
	set phase(value: LifecyclePhase) {
		...
		this._phase = value;
		mark(`code/LifecyclePhase/${LifecyclePhaseToString(value)}`);

		const barrier = this.phaseWhen.get(this._phase);
		if (barrier) {
			barrier.open();
			this.phaseWhen.delete(this._phase);
		}
	}
```
- `Restored` is set on a `Promise.race` (restore is capped at 2s so slow editors don't block) — `src/vs/workbench/browser/workbench.ts:410-440` (verified directly):
```ts
		this.whenReady.finally(() =>
			Promise.race([
				this.whenRestored,
				timeout(2000)
			]).finally(() => {
				...
				function markDidStartWorkbench() {
					mark('code/didStartWorkbench');
					performance.measure('perf: workbench create & restore', 'code/didLoadWorkbenchMain', 'code/didStartWorkbench');
				}
				...
				// Set lifecycle phase to `Restored`
				lifecycleService.phase = LifecyclePhase.Restored;

				// Set lifecycle phase to `Eventually` after a short delay and when idle (min 2.5sec, max 5sec)
				const eventuallyPhaseScheduler = this._register(new RunOnceScheduler(() => {
					this._register(runWhenWindowIdle(mainWindow, () => lifecycleService.phase = LifecyclePhase.Eventually, 2500));
				}, 2500));
				eventuallyPhaseScheduler.schedule();
			})
		);
```
- Contributions instantiate per phase with idle chunking + marks: `src/vs/workbench/common/contributions.ts:301-345` — `mark(\`code/willCreateWorkbenchContributions/${phase}\`)` … `mark(\`code/didCreateWorkbenchContributions/${phase}\`)`; Restored/Eventually phases instantiate when idle (forcedTimeout 500ms / 3000ms).
- Window readiness (first show) is renderer-driven: `src/vs/workbench/electron-browser/window.ts:694` `this.lifecycleService.when(LifecyclePhase.Ready).then(() => this.nativeHostService.notifyReady());`

## Perf-mark API

- `src/vs/base/common/performance.ts:133-149` — `mark`, `clearMarks`, `getMarks` (one shared store keyed on `globalThis.MonacoPerformanceMarks`, `performance.ts:124-131`); negative: no `importFaster`, no `timer` export in this tree.

## Claims supported (→ PERFORMANCE-PLAN §1)

1. First-paint-relevant milestones exist as `code/*` perf marks from main bootstrap through `code/didStartWorkbench`, across 3 processes (main, renderer bootstrap, workbench).
2. `Restored` never waits longer than 2s on editors (Promise.race); `Eventually` lands ≥2.5s later, idle-gated.
3. The mark pipeline is prefix-gated: only `code/`-prefixed marks are aggregated by the timer service (see evidence 03) → Flauz must emit `code/flauz/*` marks to ride it.
4. Drift risk is real: timerService still computes `ellapsedWindowMaximize` from `code/will|didMaximizeCodeWindow` marks that no code in this tree emits (2-a negative finding) → Flauz CI must assert emit-sites for every mark pair it budgets on.
