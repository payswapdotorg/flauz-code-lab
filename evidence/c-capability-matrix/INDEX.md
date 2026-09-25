# Evidence Index — c-capability-matrix

Map: evidence file → matrix rows it supports (`docs/CODE-OSS-INTEGRATION-MATRIX.md`).
All citations are `file:line` in the Flauz mirror @ `9bf9ae764da438b1234a8243dc9e47173ef58ee7`.

| File | Supports (rows / sections) | Notes |
|---|---|---|
| `EV-00-orientation.md` | All — tree map, HEAD pin, product.json facts | 87 contrib areas; chat subtree; api/common extHost inventory; vscode-dts relocation; extensions & cli listings; product.json (no gallery) |
| `EV-01-models-lm.md` | C-19, C-20, C-21, C-22 | Stable `lm` (selectChatModels/sendRequest/registerTool/invokeTool/MCP defs/LM providers), model picker widget stack, aiCustomization management, pricing (P), quota/metered |
| `EV-02-agent-host.md` | C-23, C-24, C-25, C-33, C-34, C-38, F-03, Session 2/3/6 | AHP IPC contract; Claude/Codex providers; subagent/steering/confirmation signals; changeset & automation channels; devContainer + cloud sandbox; agent sessions UI incl. approval model; chatEditing stack; remoteCodingAgents service |
| `EV-03-mcp-tools-approval.md` | C-25, C-18(partial), C-29(partial), D-5 | Stable MCP definition providers; MCP contrib incl. elicitation; gateway for external agent loops; confirmation service scopes; NeedsInput status; toolsets |
| `EV-04-browser.md` | C-28, C-29, B-02, D-5 | browserView contrib (CDP, 17 features), 14 agent browser tools incl. screenshot + Playwright code; proposed `browser.d.ts`; simple-browser fallback; evidence capture surfaces |
| `EV-05-terminal-tasks-debug.md` | C-07, C-08, C-09, C-10, C-11, C-12, C-13 | Stable shell-integration exec API; proposed terminal set; agent-host terminals; tasks API; debug API incl. breakpoints/trackers; notebooks/REPL |
| `EV-06-scm-git.md` | C-14, C-15, C-16, C-17, C-18 | Stable SCM; git ext exported API (`commit`/`fetch`); auth extensions; PR absence; scmArtifactProvider (P); changeset↔SCM review path |
| `EV-07-remote-environments.md` | C-30, C-31, C-32, C-33, C-34, D-6/D-7 | Resolver API incl. nested authorities & managed transports; test-resolver blueprint (AHP bridge env var); Rust tunnel CLI; devContainer agent host; cloud sandbox files; env-switch continuity; metered connections |
| `EV-08-persistence-state.md` | C-27, C-35, C-36, C-37, D-9 | Stable storage/secrets; chat session persistence; chatSessionsProvider (P); editSessions/userDataSync; memory building blocks + absence |
| `EV-09-workflow-reuse.md` | C-39, C-40, C-41, D-8 | Prompt-file resource classes (.agent.md/.prompt.md/SKILL.md, tool restrictions); prompt-basics grammar; promptSyntax/Timeline/planReviewFeedback; AHP automation channels; tasks |
| `EV-10-ecosystem-product.md` | C-42, C-43, C-44, C-45, B-01, D-1/D-2/D-3 | product.json facts (no gallery, defaultChatAgent, builtIns); in-tree copilot ext + entitlement guards; proposed-API posture; a11y & i18n inventory; dataChannels/ipc; voice/speech |
| `EV-11-negative-results.md` | B-01, B-02, C-26, C-27, C-28, C-34, C-40, U-1..U-5 | 12 named negative results incl. failed-search receipts |

**Coverage summary**: 12 files, ~90 file:line citations, 12 negative results; every non-trivial matrix classification cites at least one EV row; UNCERTAIN items carry precise questions in Matrix §6 (U-1..U-5).
