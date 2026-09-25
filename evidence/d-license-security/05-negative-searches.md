# Evidence 05 — Negative Searches (receipts for absence claims)

Tree: payswapdotorg/Flauz @ 9bf9ae764da. Every command below was run against the
working tree; expected result and actual result recorded. Re-run protocol at bottom.

## N1. `extensionsGallery` absent from product.json

Command: full read of product.json (249 lines) + `rg -n "extensionsGallery" product.json`
Result: **no match** (key absent; typed optional surface exists at
src/vs/base/common/product.ts:147-155).
Supports: LICENSE-DISTRIBUTION-REVIEW §3.1.

## N2. No Remote-SSH / Dev-Containers built-ins

Command: `ls extensions/` (97 dirs enumerated, full list in transcript)
Result: **no** `remote-ssh`, `ms-vscode.remote-*`, `remote-containers`, `devcontainer`
directories. Nearest: `vscode-test-resolver` (test), `tunnel-forwarding`.
Supports: LICENSE-DISTRIBUTION-REVIEW §3.2.

## N3. No telemetry/crash/update product keys in OSS product.json

Command: full read of product.json (249 lines) checking for: crashReporter, appCenter,
tasConfig, enableTelemetry, enabledTelemetryLevels, settingsSearchUrl, emergencyAlertUrl,
aiConfig, updateUrl, quality, downloadUrl, aiGeneratedWorkspaceTrust.
Result: **all absent** (typed optional fields exist in product.ts §2 of evidence 02).
Supports: LICENSE-DISTRIBUTION-REVIEW §3.5.

## N4. No bundled fonts

Command: `ls resources/` → completions, darwin, linux, server, win32; `ls resources/fonts`
Result: **no fonts directory**.
Supports: LICENSE-DISTRIBUTION-REVIEW §3.4.

## N5. cli/Cargo.toml has no license field

Command: `rg -n "^license" cli/Cargo.toml`
Result: **no match** (crate relies on repo-root MIT LICENSE.txt).
Supports: LICENSE-DISTRIBUTION-REVIEW §5.4.

## N6. Wave-1 negative-search re-verification (evidence/a-architecture/09 protocol)

Commands re-run on this tree (this worker's lane — security-relevant subset):
- `rg -ni "agentToAgent|interAgent|multiAgentOrchestration" src/vscode-dts/`
  → **no match in the extension-API d.ts** (Wave-1 row stands for the API surface).
  BUT: AHP peer chats/subagents/merge exist in platform/agentHost (evidence 03 §6) —
  Wave-1's "single-agent runtime only" phrasing is stale for the *platform* (noted in
  SECURITY-MODEL.md §7.3).
- `rg -ni "MemoryService|longTermMemory|agentMemory" src/vscode-dts/ src/platform/`
  → no extension-API memory surface (not re-audited deeper; out of lane).
- Workspace trust path: Wave-1 cited `src/vs/workbench/contrib/workspace/common/workspaceTrust.ts`
  → **file does not exist at this commit** (platform/ moved); actual:
  `src/vs/platform/workspace/common/workspaceTrust.ts` (evidence 02 §4).
  SECURITY-MODEL.md §7.2 records the correction.

## N7. marketplace.visualstudio.com touchpoints in code (scoping, not ToS)

Command: `rg -n "marketplace\.visualstudio\.com" src/vs/ -l`
Result: only `src/vs/workbench/contrib/chat/browser/tools/languageModelToolsService.ts`
(extension-info tool fetches marketplace links for results) + one prompt-syntax test.
No default gallery wiring without product.json keys.
Note: marketplace **ToS text** is not in-tree; the §3.1 ToS claim is marked [EXTERNAL]
in LICENSE-DISTRIBUTION-REVIEW.

## N8. claude-agent-sdk license text located (not absent — confirming where it lives)

Command: programmatic parse of cglicenses.json (evidence 01 §7).
Result: the ONLY proprietary-licensed entry ("© Anthropic PBC … Commercial Terms of
Service"). No other all-rights-reserved entries in cglicenses.json (78 scanned).

## Re-verification protocol

Same as Wave-1 (evidence/a-architecture/09): re-run each command on a fresh shallow
clone of the mirror head at every upstream sync; any newly-appearing symbol/key
invalidates the corresponding doc row — flag to TL. Especially: product.json key set
(licensing §3/§6 tables), permissionKind vocabulary (security §2.4), copilot
enabledApiProposals count (currently 64).
