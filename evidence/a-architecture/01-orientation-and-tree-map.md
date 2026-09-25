Evidence 01 — Orientation & Tree Map
Provenance: payswapdotorg/Flauz (pristine microsoft/vscode mirror) @9bf9ae764da438b1234a8243dc9e47173ef58ee7 (2026-09-24), shallow clone, read-only.Line numbers intentionally omitted; every command reproduces file:line in one step.
Top-level layout
$ ls src/vs→ base  code  editor  platform  server  workbench   (+ API d.ts at src/vscode-dts/)$ ls→ cli  build  extensions  product.json  remote  src  ... (standard OSS layout)
Notes:
src/vs/code = process entrypoints (electron-main desktop shell, browser workbench entry).
src/vs/server = in-repo remote server (non-electron).
src/vscode-dts = main + proposed extension API declaration files.
cli/ = CLI binary source incl. tunnels.
remote/ = remote packaging helpers.
Workbench contrib inventory
$ ls src/vs/workbench/contrib | wc -l→ ~90$ ls src/vs/workbench/contrib→ relevant subset incl.: chat  mcp  notebook  terminal  tasks  scm  debug  testing  workspace  search  userDataProfile  webview  files  logs  ...
chat
mcp
Built-in extensions inventory
$ ls extensions | wc -l→ ~60$ ls extensions | grep -iE "git$|notebook|simple|auth|terminal"→ git  github-authentication  notebook-renderers  simple-browser  terminal-suggest ...
API surface size
$ wc -l src/vscode-dts/vscode.d.ts→ ~13,000 lines$ ls src/vscode-dts | grep -c proposed→ ~100 proposed API d.ts files
History note (honest limitation)
$ git log -1 --oneline→ 9bf9ae7 (mirror head)
Depth-1 clone: subject-level claims about "recent upstream commits reference Agent Host /sessions / tabbed model picker" come from TL repo verification and are carried as [VERIFY]symbol-level searches in evidence 02 — they are NOT re-derived from git history here.
