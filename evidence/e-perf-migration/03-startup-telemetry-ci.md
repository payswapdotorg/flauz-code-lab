# Evidence 03 — Startup telemetry + CI measurement surfaces (the harness Flauz reuses)

Tree: payswapdotorg/Flauz @ 9bf9ae764da. Quotes verbatim, path:line verified.

## Telemetry events

- `src/vs/workbench/services/timer/browser/timerService.ts:638-647` (verified directly):
```ts
		// report IStartupMetrics as telemetry
		/* __GDPR__
			"startupTimeVaried" : {
				"owner": "jrieken",
				"${include}": [
					"${IStartupMetrics}"
				]
			}
		*/
		this._telemetryService.publicLog('startupTimeVaried', metrics as unknown as ITelemetryData);
```
- `startup.timer.mark` — every raw `code/` mark, sampled at 3% (`timerService.ts:527` `private readonly _rndValueShouldSendTelemetry = Math.random() < .03; // 3% of users`), forced ON with `--prof-append-timers` (`src/vs/workbench/services/timer/electron-browser/timerService.ts:89-92`). Event emission `timerService.ts:676`:
```ts
			this._telemetryService.publicLog2<Mark, MarkClassification>('startup.timer.mark', {
				source,
				name: new TelemetryTrustedValue(mark.name),
				startTime: mark.startTime
			});
```
- Negatives (2-a): `startupTimers` / `startupMilestones` / `appInsights` event names do NOT exist in this tree. Other events: `startup.resource.perf` (browser variant, `contrib/performance/browser/startupTimings.ts:130`), `startupHeapStatistics` (electron variant `:240`).

## The CI-ready TSV appender: `--prof-append-timers` (self-exiting)

`src/vs/workbench/contrib/performance/electron-browser/startupTimings.ts:70-101` (verified directly):
```ts
	private async _appendStartupTimes(standardStartupError: string | undefined) {
		const appendTo = this._environmentService.args['prof-append-timers'];
		const durationMarkers = this._environmentService.args['prof-duration-markers'];
		const durationMarkersFile = this._environmentService.args['prof-duration-markers-file'];
		if (!appendTo && !durationMarkers) {
			// nothing to do
			return;
		}

		try {
			await Promise.all([
				this._timerService.whenReady(),
				timeout(15000), // wait: cached data creation, telemetry sending
			]);

			const perfBaseline = await this._timerService.perfBaseline;
			const heapStatistics = await this._resolveStartupHeapStatistics();
			if (heapStatistics) {
				this._telemetryLogHeapStatistics(heapStatistics);
			}

			if (appendTo) {
				const content = coalesce([
					this._timerService.startupMetrics.ellapsed,
					this._productService.nameShort,
```
(one TSV line per run: `ellapsed`, product, commit, session id, standard-start verdict, `perfBaseline`, heap stats; then storage flushed and the app **exits** — `:130-146`). CLI flags declared at `src/vs/platform/environment/common/argv.ts:63-65`: `--prof-append-timers`, `--prof-duration-markers`, `--prof-duration-markers-file`, `--prof-startup-prefix`, `--trace-startup-*`.

`--prof-duration-markers` computes ARBITRARY mark-pair durations into a file (`startupTimings.ts:104-127`, format `from-to`, special value `ellapsed`) → Flauz can directly measure `code/flauz/*` mark pairs in CI with zero new code.

## Machine-speed normalizer: `perfBaseline`

`src/vs/workbench/services/timer/browser/timerService.ts:438-443`:
```ts
	/**
	 * A baseline performance indicator for this machine. The value will only available
	 * late after startup because computing it takes away CPU resources
	 *
	 * NOTE that this returns -1 if the machine is hopelessly slow...
	 */
	perfBaseline: Promise<number>;
```
Computed after `LifecyclePhase.Eventually` via a blob worker running `fib(24)` (`timerService.ts:560-603`).

## Mark aggregation pipeline (which sources, which prefix)

- Only `code/`-prefixed marks are accepted — `timerService.ts:617-623`: `const codeMarks = marks.filter(mark => mark.name.startsWith('code/'));`
- Sources already plumbed: `'main'` (via window config `perfMarks`, `electron-browser/timerService.ts:41`), `'renderer'` (`timerService.ts:549-552`), `'localExtHost'`/`'workerExtHost'`/`'remoteExtHost'` (`src/vs/workbench/api/browser/mainThreadExtensionService.ts:182-188` via `$setPerformanceMarks`), `'localPtyHost'`/`'remotePtyHost'` (`terminalService.ts:328`), `'server'` (`remote.ts:675`).

## Manual inspection surface

- `Developer: Startup Performance` view: command `perfview.show` registered `src/vs/workbench/contrib/performance/browser/performance.contribution.ts:48-64`; data rendered by `perfviewEditor.ts:137-207` after `ITimerService.whenReady()` + `LifecyclePhase.Eventually` + extensions registered; rows are durations between mark pairs (`import(main.js)`, `start => app.isReady`, `import(workbench.desktop.main.js)`, `overall workbench load`, `workbench ready` …).

## Claims supported (→ PERFORMANCE-PLAN §6, MIGRATION-PLAN §5)

1. A complete CI startup harness exists in-tree (`--prof-append-timers` + `--prof-duration-markers`) — Flauz needs no new measurement code, only new `code/flauz/*` marks + budget assertions in CI.
2. `perfBaseline` normalizes across machines → budgets asserted as deltas vs upstream baseline on the same runner, not absolute numbers.
3. Flauz Core (separate process) marks cannot ride `$setPerformanceMarks` (ext-host path); the UPSTREAM-SAFE route for service telemetry is the extension `TelemetryLogger` API (`vscode.d.ts:10832` `export function createTelemetryLogger(sender: TelemetrySender, options?): TelemetryLogger;`) per A's UPSTREAM-STRATEGY table.
