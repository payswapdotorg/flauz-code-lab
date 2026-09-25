# EV-06 — SCM, git, GitHub auth, PRs, artifacts

## 1. Stable SCM API (vscode.d.ts, `scm` namespace 16657)

- `scm.createSourceControl(id, label, rootUri?)` (16675) → `SourceControl` with
  `quickDiffProvider`, `historyProvider` (proposed richer: `scmHistoryProvider.d.ts`), resource groups,
  `inputBox` (16665).
- Proposed SCM surfaces (`src/vscode-dts/`): `scmActionButton`, `scmHistoryProvider`,
  `scmMultiDiffEditor`, `scmValidation`, `scmSelectedProvider`, `scmTextDocument`, `scmProviderOptions`,
  contribution-point files `contribSourceControl*Menu.d.ts` (artifact/history/item/title menus).

## 2. Built-in git extension — programmatic (agent-usable) API

`extensions/git/` (with `git-base` shared lib). Exported API surface in `extensions/git/src/api/`:
`api1.ts`, `extension.ts`, `git.constants.ts`, `git.d.ts` (typed via
`extensions/git/src/api/git.d.ts`; obtained by extensions through
`vscode.extensions.getExtension('vscode.git').exports`).

`extensions/git/src/api/api1.ts`:

- line 321–322: `commit(message: string, opts?: CommitOptions): Promise<void>`
- line 293–302: `fetch(arg0?: FetchOptions | string | undefined, ...)` (remote/ref/depth/prune)
- (repository objects expose status/branch/checkout/push operations per `git.d.ts` API types)

→ Agent-driven commit/branch/fetch/push is a **typed public extension API** (used by Copilot's own
`generateCommitMessageCommand`, `product.json:149`).

## 3. GitHub & auth

- `extensions/github-authentication/` + `extensions/github/` (in tree); `extensions/microsoft-authentication/`.
- Stable `authentication` namespace (18096): `getSession`, `registerAuthenticationProvider`,
  `onDidChangeSessions`. `product.json:158–168` `trustedExtensionAuthAccess` maps providers to extensions.
- GitHub Enterprise: `github-enterprise.uri` setting (`product.json:127`).

## 4. Pull requests — NOT in tree

`extensions/` contains no PR extension (full listing in EV-00 §5). GitHub PRs require the external
`GitHub.vscode-pull-request-github` extension (marketplace/Open VSX distribution) or REST via
`vscode.env.openExternal`/auth session. → INTEGRABLE, external dependency + licensing note for MS gallery.

## 5. SCM artifacts (resource/evidence tracking) — proposed

`vscode.proposed.scmArtifactProvider.d.ts` (issue #253665):

- `SourceControl.artifactProvider?: SourceControlArtifactProvider` (9–11)
- `SourceControlArtifactProvider` (13–18): `onDidChangeArtifacts`, `provideArtifactGroups()`,
  `provideArtifacts(group)`
- `SourceControlArtifactGroup` (20–25): id/name/icon/supportsFolders
- `SourceControlArtifact` (27–34): id/name/description/icon/**timestamp**/**command**

→ A dedicated surface to list, group, timestamp, and open artifacts (screenshots, logs, reports) inside
the SCM view — natural substrate for evidence/claims tracking. Proposed API.

## 6. Agent-edit ↔ SCM integration

- `chatEditing*` changesets (EV-02 §8) feed the multi-diff editor (`contrib/multiDiffEditor/`,
  `scmMultiDiffEditor.d.ts` proposed) — "review agent changes" UX exists in core.
- `editTelemetry/browser/telemetry/scmAdapter.ts` — edit-source tracking wired to SCM.
- `contrib/timeline/` + `localHistory/` — file-history timeline views (stable `timeline` API:
  `extHostTimeline.ts`; proposed `timeline.d.ts`).
