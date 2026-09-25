# EV-09 — Reusable workflows: prompt files, custom agents, automations, prompt UX

## 1. Prompt-file resource classes (`vscode.proposed.chatPromptFiles.d.ts`)

- `ChatResourceSource = 'local' | 'user' | 'extension' | 'plugin' | 'builtin'` (line 12)
- `ChatResource` (17–32): `uri` — doc line 19: "typically a `.agent.md`, `.instructions.md`, `.prompt.md`,
  or `SKILL.md` file"; optional `when` clause; optional `sessionTypes`.
- `ChatCustomAgent` (37+): `uri` (".agent.md"), `name`, `description`, `source`, `sessionTypes`,
  `extensionId`, `pluginUri`, `argumentHint`, **tool restrictions** (declared by the custom agent).
- 505-line file also covers prompts service integration (see `promptsServiceCustomizationItemProvider.ts`
  in aiCustomization).

→ **Agents-as-files and prompts-as-files, with tool restriction policies**, are first-class resource
types loadable from the workspace (`local`), user scope, extensions, plugins, or built-ins.

## 2. Editing & authoring support

- `extensions/prompt-basics/` — `syntaxes/`, `language-configuration.json` (grammar for prompt files).
- contrib `chat/browser/promptSyntax/` — prompt syntax support in chat.
- contrib `chat/browser/promptTimeline/` — prompt history/timeline in chat.
- contrib `chat/browser/planReviewFeedback/` — plan review feedback surface (agent plan review UX).

## 3. Automations (saved, re-runnable agent workflows) — AHP protocol

`platform/agentHost/common/agentService.ts` imports (line 25):

```ts
FetchAutomationRunsParams, FetchAutomationRunsResult,
ListAutomationTriggerDefinitionsParams, ListAutomationTriggerDefinitionsResult,
RunAutomationParams, RunAutomationResult
```

from `./state/protocol/channels-automation/commands.js`.

→ The Agent Host Protocol has **automation trigger definitions** (list) and **automation runs**
(fetch/run) channels — i.e. saved workflows with triggers are a protocol concept. Extension-facing
authoring UI is not shaped yet (no `automation` stable/proposed d.ts) → PROTOTYPABLE surface.

## 4. Task workflows

`tasks.json` + stable `tasks.fetchTasks/executeTask` (EV-05 §4) — deterministic, versionable workflows
agents can invoke; `taskPresentationGroup`/`taskProblemMatcherStatus` proposed refinements.

## 5. Session replay/export

- Chat sessions persisted as editor inputs (EV-08 §2); `ChatSession` history objects (chatSessionsProvider
  435) provide the serialization shape.
- No chat-session "export to file" command found in contrib listing (negative; would be extension-added).
