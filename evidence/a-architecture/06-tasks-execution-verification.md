Evidence 06 — Tasks, Terminals, Debug, Testing, Notebooks, Diagnostics
Tasks (TaskState / Execution / Verification substrate)
$ rg -n "export namespace TaskGroup" src/vs/workbench/contrib/tasks/common/tasks.ts→ `export namespace TaskGroup { export const Build: TaskGroup; ... }` (Build/Clean/Test/Rebuild)$ rg -n "problemMatchers" src/vs/workbench/contrib/tasks/common/tasks.ts | head→ problem-matcher wiring on task definitions (verification pipeline).$ rg -n "class CustomExecution" src/vs/workbench/api/common/extHostTypes.ts→ `export class CustomExecution ...` — programmatic task execution from extensions.
Terminals (execution surface)
$ ls src/vs/workbench/contrib/terminal | head→ browser/  common/  ... (contrib present)$ rg -n "shellIntegration|onDidChangeShellIntegration" src/vscode-dts/vscode.d.ts | head→ shell-integration API surface present (structured terminal output for tools).
Debug
$ rg -n "export interface IDebugSession" src/vs/workbench/contrib/debug/common/debug.ts→ present (DAP session model; per-session run state, mapping row 9).
Testing
$ rg -n "createTestController" src/vscode-dts/vscode.d.ts→ `export function createTestController(providerId: string, controllerLabel: string): TestController;`  region; TestRun types nearby (verification runs, mapping row 19).
Diagnostics
$ rg -n "export interface DiagnosticCollection" src/vscode-dts/vscode.d.ts→ present (ext-host impl in src/vs/workbench/api/common/extHostDiagnostics.ts).
Notebooks (execution + artifact surface)
$ rg -n "interface NotebookCellExecution" src/vscode-dts/vscode.d.ts→ present (kernel execution lifecycle).$ ls extensions | grep notebook→ notebook-renderers etc. (built-in notebook pieces).
