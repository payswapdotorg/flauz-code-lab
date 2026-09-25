# Evidence 12 — Memory measurement surfaces + V8 heap levers

Tree: payswapdotorg/Flauz @ 9bf9ae764da. Quotes verbatim (2-d bundle + negatives).

## Process Explorer (migrated to a workbench contrib in this tree)

- Negative: `src/vs/code/electron-sandbox/processExplorer/processExplorerMain.ts` does NOT exist (migrated). Current home: `src/vs/workbench/contrib/processExplorer/` —
  - registration `electron-browser/processExplorer.contribution.ts:14-17` (editor pane `NativeProcessExplorerEditor`)
  - memory column `browser/processExplorerControl.ts:274` `templateData.memory.textContent = (element.mem / ByteSize.MB).toFixed(0);`
  - native resolve `electron-browser/processExplorerControl.ts:36-38` `resolveProcesses(): Promise<IResolvedProcessInformation> { return this.processService.resolveProcesses(); }`
- Process list source (NOT getProcessMemoryInfo): `src/vs/base/node/ps.ts:14-29` (`listProcesses(rootPid)`; Linux/mac via `ps -ax -o pid=,ppid=,pcpu=,pmem=,command=`, `ps.ts:220-223`; Windows via `@vscode/windows-process-tree` with `ProcessDataFlag.Memory`, `:114-156`).
- Main-process aggregation — `src/vs/platform/process/electron-main/processMainService.ts:26-41`:
```ts
	async resolveProcesses(): Promise<IResolvedProcessInformation> {
		const mainProcessInfo = await this.diagnosticsMainService.getMainDiagnostics();
		...
		for (const { pid, name } of UtilityProcess.getAll()) {
			pidToNames.push([pid, name]);
		}

		const processes: { name: string; rootProcess: ProcessItem | IRemoteDiagnosticError }[] = [];
		try {
			processes.push({ name: localize('local', "Local"), rootProcess: await listProcesses(process.pid) });
```
(+ remote machines via `getRemoteDiagnostics({ includeProcesses: true })`, `:42-57`.) Remote/browser variant: `browser/processExplorerControl.ts:589` `await this.remoteAgentService.getDiagnosticInfo({ includeProcesses: true });`.

## V8 heap levers (negative-heavy result)

Repo-wide `--max-old-space-size` inventory (2-d, complete):
1. `src/vs/platform/update/test/electron-main/updateRelaunchArguments.test.ts:82,86` — test fixture
2. `src/vs/workbench/api/test/node/extHostTunnelService.test.ts:139,144` — test fixture
3. `src/vs/workbench/electron-browser/desktop.contribution.ts:467` — argv.js `jsFlags` setting doc: "applied to the main process, renderer and utility processes"
4. `build/azure-pipelines/common/extract-telemetry.ts:83` — CI tooling (4096)
5. `extensions/typescript-language-features/src/tsServer/serverProcess.electron.ts:168` — `--max-old-space-size=${configuration.maxTsServerMemory}` (tsserver child, not ext host)
6. `package.json:56,67,70,80` — build tooling (gulp/tsec 8192)

Negatives: `VSCODE_MAX_MEMORY` absent; no per-ext-host or per-utility-process memory flag in any spawn path; `getProcessMemoryInfo` appears only in the sandbox preload shim (`src/vs/base/parts/sandbox/electron-browser/preload.ts:215-216`).

## Startup heap telemetry

`src/vs/workbench/contrib/performance/electron-browser/startupTimings.ts:240` — `startupHeapStatistics` telemetry event (GC counts/heap from `--trace-startup-*` traces); `_resolveStartupHeapStatistics` + `_printStartupHeapStatistics` feed the `--prof-append-timers` TSV line (`:85-98`).

## Extension host profiling (CPU, per-extension, GC-attributed)

`src/vs/workbench/services/extensions/electron-browser/extensionHostProfiler.ts:24-77` — V8 sampling profiler via inspector session; segments: `'(root)'`, `'(program)'`, `'(garbage collector)'` → `segmentId = 'gc'`, else `'self'` or the owning extension id; **CPU only — no heap profiling** (`ProfileSegmentId = string | 'idle' | 'program' | 'gc' | 'self'`, `extensions.ts:340`).

## Claims supported (→ PERFORMANCE-PLAN §3/§6)

1. Per-process memory is observable via Process Explorer / diagnostics channels (ps-based) — Flauz CI can snapshot the same data (`resolveProcesses()` shape) without new core code; remote environments included.
2. There is NO in-tree per-process memory cap mechanism for ext hosts/agent hosts — Flauz memory policy must be admission-control + eviction at the orchestration layer, not process limits.
3. GC attribution exists for ext-host CPU profiling; heap telemetry exists only at startup (`startupHeapStatistics`) → release-grade memory counters need Flauz-side TelemetryLogger instrumentation.
