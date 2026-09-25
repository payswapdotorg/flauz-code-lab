# Evidence INDEX — Wave 2 / Worker D (Licensing & Security)

Deliverables: `docs/LICENSE-DISTRIBUTION-REVIEW.md`, `docs/SECURITY-MODEL.md`.
Tree of record: payswapdotorg/Flauz @ `9bf9ae764da438b1234a8243dc9e47173ef58ee7`
(pristine microsoft/vscode mirror, 2026-09-24; shallow clone; read-only).
All evidence gathered on this exact commit; line numbers are commit-stable.

## File map

| File | Covers | Doc sections served |
|---|---|---|
| `01-source-and-extensions-licenses.md` | Root MIT, per-file headers, 97-extension audit, non-MIT list (elkjs EPL-2.0, seti/fig MIT-with-notices, codex cgmanifest), licenseAgreement.ts build-injection points, copilot ext identity, cgmanifest 14 components (ffmpeg LGPL, H.264, codicons CC-BY), cglicenses 78 (claude-agent-sdk proprietary, ahp MIT, @github/copilot copyright-only), root TPN census (56 MIT/15 Apache/zsh+fish GPL caveats), Rust CLI (416 crates, MS source-offer para), Monaco, package.json agent deps, SECURITY.md boilerplate | LICENSING §1 §2 §5; SECURITY §2.5 |
| `02-product-boundaries.md` | product.json full key inventory w/ lines, product.ts typed surface (extensionsGallery :147-155, extensionEnabledApiProposals :250, telemetry/crash keys, mcpGallery, agentSdks), defaultChatAgent block + GITHUB_COPILOT_PROTECTED_RESOURCE (agent.ts:360-366), provider enable/disable settings + SDK downloader, workspace trust platform home, secrets/BYOK, checkProposedApiEnabled, webview sandbox attrs, remote machinery absence + in-tree substrate | LICENSING §3 §4 §6; SECURITY §2.1 §2.5 §2.6 §2.7 |
| `03-security-substrate.md` | AHP SessionPermissionManager (approval ladder incl. sandbox-bypass escalation, path hardening, restricted dirs), permissionKind taxonomy (agent.ts:959), confirmation service (3 scopes + combination + MCP-server + result-posting), ToolConfirmKind enum, risk assessment service, sandbox floor policy, steering signals, agent-host infra existence receipts, telemetry boundaries | SECURITY §2.2-2.7, §5 |
| `04-browser-layers.md` | The 7 browser layers L1-L7: driver-side gate (navigateBrowserTool + helpers), webRequest filter (agent-scope only), will-navigate (UX-only), session partitions (global/workspace/ephemeral/agent-sha256), origin permissions (browserPermissions.ts full model), file:// trusted roots (403 gate), Playwright/CDP surface + Wave-1 residual restated | SECURITY §4 |
| `05-negative-searches.md` | Receipts: extensionsGallery absence, no remote-ssh/devcontainer built-ins, no telemetry/update keys in OSS product.json, no fonts, no Cargo license field, Wave-1 negative-search re-verification (agentToAgent stale vs AHP peer chats; workspaceTrust path moved), marketplace touchpoint scoping, claude-agent-sdk as sole proprietary cglicenses entry | LICENSING §3.1 §3.2 §3.5 §3.4 §5; SECURITY §7 |

## Claim → receipt quick table (most load-bearing)

| Claim | Receipt |
|---|---|
| Base is MIT, distribute/sublicense/sell allowed | 01 §1 (LICENSE.txt:1-21) |
| extensions/copilot code is MIT | 01 §2 (copilot/LICENSE.txt) |
| Only non-MIT bundled license in extensions = elkjs EPL-2.0 | 01 §3 (mermaid TPN :10-276) |
| claude-agent-sdk is proprietary (Anthropic Commercial ToS) | 01 §7 (cglicenses.json) |
| ffmpeg LGPL-2.1+ + H.264 patent component in build | 01 §6 (cgmanifest.json) |
| OSS product.json has no gallery | 05 §N1; 02 §1 |
| defaultChatAgent → GitHub.copilot + copilot_internal URLs | 02 §3 (product.json:90-157) |
| Claude/Codex providers usable without Copilot sign-in | 02 §3 (agentHostProtectedResourcesService.ts:16-27) |
| AHP permission engine exists (Wave-1 correction) | 03 §1 (sessionPermissions.ts + agent.ts:959) |
| Combination-scoped tool confirmations exist | 03 §2 (confirmation service :351-370) |
| Browser driver-side gate is the authoritative agent-nav check | 04 §L1 (navigateBrowserTool.ts :102-110) |
| webRequest filter applies to Agent-scope sessions only | 04 §L2 (browserSession.ts:310-330) |
| will-navigate is UX-only in the integrated browser | 04 §L3 (browserView.ts:328-344) |
| Agent browser partitions are per-identity hash, in-memory | 04 §L4 (browserSession.ts:57-62,165-180) |
| file:// restricted to trusted roots (403) | 04 §L6 (browserSession.ts:341-347) |
| Steering consumed signal + mid-turn hooks | 03 §5 (agent.ts:1063-1068, 1247-1248) |

## Worker-D method notes

- Sandbox: ~2 cores/4 GB RAM; NO build was run (work-order §2 honored); all evidence is
  source reading + programmatic JSON parsing of manifests (python3) on the shallow clone
  (386 MB working tree, 19,182 files).
- The shallow clone's git history is depth-1: no history-derived claims were made; all
  claims are working-tree facts at the pinned commit.
- External-knowledge claims (marketplace ToS, VSCodium patch set, Electron codec builds,
  trademark guidelines, codex/github npm license texts) are marked [EXTERNAL]/UNCERTAIN in
  the docs and are NOT backed by the tree — flagged for TL adjudication.
- One count-verification pass was run on every quantitative claim (64 proposals,
  97 extensions, 78 cglicenses entries, 14 cgmanifest registrations, 416 CLI crates,
  3,439-line TPN, 249-line product.json).
