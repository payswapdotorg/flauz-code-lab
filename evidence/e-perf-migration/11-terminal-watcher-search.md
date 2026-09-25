# Evidence 11 — Terminal pty, file watcher budgets, search (ripgrep) memory behavior

Tree: payswapdotorg/Flauz @ 9bf9ae764da. Quotes verbatim (2-d bundle).

## Terminal flow control (backpressure precedent to copy)

`src/vs/platform/terminal/common/terminal.ts:876-891`:
```ts
export const enum FlowControlConstants {
	/**
	 * The number of _unacknowledged_ chars to have been sent before the pty is paused in order for
	 * the client to catch up.
	 */
	HighWatermarkChars = 100000,
	/**
	 * After flow control pauses the pty for the client the catch up, this is the number of
	 * _unacknowledged_ chars to have been caught up to on the client before resuming the pty again.
	 ...
	 */
	LowWatermarkChars = 5000,
```
Pause site `src/vs/platform/terminal/node/terminalProcess.ts:326-327`:
```ts
if (!this._isPtyPaused && this._unacknowledgedCharCount > FlowControlConstants.HighWatermarkChars) {
	this._logService.trace(`Flow control: Pause (${this._unacknowledgedCharCount} > ${FlowControlConstants.HighWatermarkChars})`);
```
Renderer ack: `src/vs/workbench/contrib/terminal/browser/terminalProcessManager.ts:752-754` (while `unsentCharCount > CharCountAckSize` → callback ack).

## File watcher: @parcel/watcher + in-tree budgets

- Recursive backend — `src/vs/platform/files/node/watcher/parcel/parcelWatcher.ts:6` `import parcelWatcher from '@parcel/watcher';`; backend selection `:159` `PARCEL_WATCHER_BACKEND = isWindows ? 'windows' : isLinux ? 'inotify' : 'fs-events'`; subscribe `:364-382`.
- Budgets (the pattern to mirror for the evidence ledger) — `parcelWatcher.ts:179-188`:
```ts
private readonly throttledFileChangesEmitter = this._register(new ThrottledWorker<IFileChange>(
	{
		maxWorkChunkSize: 500,  // only process up to 500 changes at once before...
		throttleDelay: 200,             // ...resting for 200ms until we process events again...
		maxBufferedWork: 30000  // ...but never buffering more than 30000 events in memory
	},
	events => this._onDidChangeFile.fire(events)
));
```
- Drop warning at `:480` ("started ignoring events due to too many file change events at once … Use 'files.watcherExclude' …"). Nodejs watcher budgets `nodejsWatcher.ts:87-90`: 100/100ms/`Number.MAX_VALUE`.
- `files.watcherExclude` defaults — `src/vs/workbench/contrib/files/browser/files.contribution.ts:294-310`: `.git/objects/**`, `.git/subtree-cache/**`, `.hg/store/**`, `*/.git/objects/**`, … ("Avoiding a '**' pattern here which results in a very complex RegExp that can slow things down significantly in large workspaces"). Applied in `workspaceWatcher.ts:138-143`.

## Search: transient rg processes, streaming, caps

- Spawn (file search) `src/vs/workbench/services/search/node/ripgrepFileSearch.ts:17-27`:
```ts
export async function spawnRipgrepCmd(config: IFileQuery, folderQuery: IFolderQuery, includePattern?: glob.IExpression, excludePattern?: glob.IExpression, numThreads?: number) {
	const rgArgs = getRgArgs(config, folderQuery, includePattern, excludePattern, numThreads);
	const cwd = folderQuery.folder.fsPath;
	const resolvedRgDiskPath = await rgDiskPath();
	return {
		cmd: cp.spawn(resolvedRgDiskPath, rgArgs.args, { cwd }),
```
- Text search spawn + per-line streaming (no file-level buffering) — `ripgrepTextSearchEngine.ts:78` spawn; `:87-114`:
```ts
ripgrepParser.on('result', (match: TextSearchResult2) => {
	gotResult = true;
	dataWithoutResult = '';
	progress.report(match);
});
```
- Caps: `src/vs/workbench/services/search/common/search.ts:32` `export const DEFAULT_MAX_SEARCH_RESULTS = 20000;` (engine honors `maxResults`, kills rg on hitLimit, `ripgrepTextSearchEngine.ts:102-106`); stderr capped at 1e6 chars (`:124`).

## Claims supported (→ PERFORMANCE-PLAN §3/§4)

1. Terminal backpressure = high/low watermark over unacknowledged chars on a direct MessagePort — the exact pattern Flauz should reuse for evidence-ledger writes and screencast frames (bounded buffer, spill/pause semantics).
2. Watcher memory is bounded by ThrottledWorker budgets (500-event chunks / 200ms rest / 30k buffered) — Flauz `.flauz/` artifact writes must respect `files.watcherExclude` guidance (exclude heavy binary evidence dirs to avoid watcher churn).
3. Search cost is transient rg processes with streaming + result caps — no persistent memory concern; agent-driven searches inherit the caps.
