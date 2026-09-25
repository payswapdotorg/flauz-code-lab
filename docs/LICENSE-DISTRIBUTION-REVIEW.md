# Flauz Wave 2 / Worker D — Licensing & Distribution Review

**Scope:** everything that gates *shipping* Flauz (= Code OSS base + agent/workspace/orchestration +
browser + multi-model/multi-agent/multi-environment) under licensing, distribution and
branding constraints.

**Verification basis (self-contained):** every non-trivial claim cites a path in
`payswapdotorg/Flauz` @ `9bf9ae764da438b1234a8243dc9e47173ef58ee7` (pristine mirror of
`microsoft/vscode` main, 2026-09-24; shallow clone, read-only; commit verified via
`git ls-remote` = `git log -1`). Raw excerpts with line numbers:
`evidence/d-license-security/` (INDEX.md maps claim → receipt). Claims that come from outside
the tree are marked **[EXTERNAL]** and are reasoning aids, not tree facts. Uncertain items are
marked **UNCERTAIN** with the precise question.

**Method note:** no lore was assumed. The tree moved: e.g. workspace trust now lives in
`src/vs/platform/workspace/common/workspaceTrust.ts` (not the Wave-1-cited workbench path), and
`extensions/copilot` (GitHub Copilot Chat v0.68.0) is now *in-tree* — see §3.3.

---

## 1. Source license: MIT for `src/vs`

**Fact.** Root `LICENSE.txt:1-21` = MIT, "Copyright (c) 2015 - present Microsoft Corporation".
Every `src/vs/**`, `build/**`, `extensions/**`, `cli/**`, `remote/**` source file carries the
header "Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT
License. See License.txt in the project root" (spot-checked across all five trees; e.g.
`src/vs/platform/browserView/common/browserPermissions.ts:1-4`,
`extensions/copilot/src/platform/endpoint/common/licenseAgreement.ts:1-4`).
`product.json:8-10` self-declares `"licenseName": "MIT"` with `licenseUrl` → the same file.

**What MIT permits for Flauz.** Use, copy, modify, merge, publish, **distribute, sublicense,
and/or sell** — i.e. Flauz may be distributed as a product, commercially, under Flauz's own
product terms, without a separate Microsoft grant.

**What MIT obligates.**
1. *Preserve the copyright + permission notice* in "all copies or substantial portions"
   (`LICENSE.txt:12-13`). Concretely: keep `LICENSE.txt` (verbatim) in the source tree and in
   shipped product payloads, and keep the per-file headers of substantially-copied files.
2. *No trademark grant.* MIT licenses copyright, **not** trademarks. "Visual Studio Code",
   the VS Code logo and the Microsoft name are not licensed to Flauz (§6).
3. *No warranty.* AS-IS; no liability. Flauz's own product terms must not imply MS warranty.

**Attribution practice (what upstream itself does, i.e. the model to copy).** VS Code
distributions carry `LICENSE.txt` + `ThirdPartyNotices.txt` + `cgmanifest.json` +
`cglicenses.json` at the root; per-extension third-party material is noticed inside the
extension (`extensions/*/ThirdPartyNotices.txt`). Flauz should mirror this structure (§5).

---

## 2. In-tree extensions licensing (97 audited)

**Audit executed:** every `extensions/*` directory (97, incl. non-shipping test extensions)
was checked for `package.json#license`, bundled `LICENSE*`, and `ThirdPartyNotices.txt`.
Full receipt: `evidence/d-license-security/01-source-and-extensions-licenses.md`.

**Result:**
- 96/97 declare `"license": "MIT"` in `package.json`.
- `extensions/copilot` declares `"SEE LICENSE IN LICENSE.txt"`; its
  `extensions/copilot/LICENSE.txt:1-21` **is MIT** (Microsoft). Its bundled
  `extensions/copilot/chat-lib/LICENSE.txt` is MIT too. So the *code* is redistributable MIT —
  the constraint is **entitlement/services coupling**, not code license (§3.3).
- `extensions/types` (two `.d.ts` shims, `lib.textEncoder.d.ts` / `lib.url.d.ts`) has no
  package.json license field; files carry the standard MS-MIT header (`extensions/types/lib.url.d.ts:1-4`) — MIT-covered by the root license.

**Non-MIT material found inside extensions (exhaustive list):**

| # | Path | Component | License | Implication for Flauz |
|---|------|-----------|---------|------------------------|
| 1 | `extensions/mermaid-markdown-features/ThirdPartyNotices.txt:10-276` | **elkjs** (bundled via mermaid layout) | **EPL-2.0** | Weak copyleft. Satisfiable by source-offer / notice; EPL-2.0 is compatible with *conveying* in a larger work if terms met. Flauz keeps the notice file and decides on EPL compliance text (source availability for the elkjs component). LOW friction because it ships as an isolated in-extension asset, but the notice **must** be carried. |
| 2 | `extensions/terminal-suggest/ThirdPartyNotices.txt` (item 1) | withfig/autocomplete specs (Fig/Hercules Labs) | MIT | Notice-carry only. |
| 3 | `extensions/theme-seti/ThirdPartyNotices.txt` (item 1) | Seti UI icons (Jesse Weed) | MIT | Notice-carry only. |
| 4 | `extensions/copilot/cgmanifest.json` (single registration) | **openai/codex** @ `acc4acc81ee…` | declared as git component; **no license field in the manifest** | The bundled Codex provider. openai/codex is Apache-2.0 **[EXTERNAL — verify against the pinned tag before ship]**; tree alone does not declare it. UNCERTAIN(question): confirm license text of openai/codex @ `acc4acc81e` and record it in Flauz's own cgmanifest. |

**Also relevant (not a license file but licensing surface):**
`extensions/copilot/package.json` — `publisher: "GitHub"`, `name: "copilot-chat"`,
`version: 0.68.0`, activation on `onFileSystem:ccreq` / `ccsettings` custom schemes, and a
64-entry `enabledApiProposals` list (`defaultChatParticipant`, `chatParticipantPrivate`,
`mcpServerDefinitions`, `resolvers`, `workspaceTrust`, …). The extension is a GitHub-owned
product surface living in an MS-MIT repo — see §3.3 for the entitlement boundary.

---

## 3. Proprietary / Microsoft boundaries (the product-defining list)

### 3.1 Marketplace

**Fact (negative, verified):** `product.json` (all 249 lines read) contains **no
`extensionsGallery` key**. The typed product surface expects it optionally:
`src/vs/base/common/product.ts:147-155` (`extensionsGallery?: { serviceUrl; controlUrl;
extensionUrlTemplate; resourceUrlTemplate; nlsBaseUrl; accessSKUs; accessScopes }`). OSS builds
therefore boot with no gallery configured.

**[EXTERNAL]** The Microsoft Marketplace ToS restricts use to Visual Studio products and
prohibits other clients; this is the documented reason VSCodium/Open VSX exist. Flauz must
treat `marketplace.visualstudio.com` as off-limits as a *default* distribution endpoint.

**Residual in-tree marketplace touchpoints to neutralize in Flauz builds:**
- `product.json:158-168` — `trustedExtensionAuthAccess` (github/github-enterprise/microsoft
  → `GitHub.copilot-chat`, `vscode.github-authentication`): product-level grants of auth
  access **without per-user consent dialogs**. If Flauz ships its own gallery/auth these must
  be re-pointed or dropped.
- `product.json:244-246` — `builtInExtensionsEnabledWithAutoUpdates: ["GitHub.copilot-chat"]`.
- `src/vs/base/common/product.ts:166-174` — `mcpGallery` (MCP server discovery service +
  ToS/privacy/report URLs). OSS `product.json` has none; a Flauz build pointing at MS's
  MCP registry would inherit MS registry terms **[EXTERNAL verify ToS]**.
- `product.json:39` — `webviewContentExternalBaseUrlTemplate` →
  `https://{{uuid}}.vscode-cdn.net/insider/ef65ac1ba…/…`: webview bootstrap assets are fetched
  from Microsoft's CDN keyed to an upstream commit. Flauz builds must self-host or pin their
  own template (also a privacy/telemetry boundary — the CDN sees install IPs).
- `product.json:248` — `voiceWsUrl: wss://falcon-caas.mai.microsoft.com/...`: Microsoft voice
  endpoint; must be removed/re-pointed in Flauz builds.

### 3.2 Remote-SSH / Dev-Containers

**Fact (negative, verified):** `extensions/` has **no** `ms-vscode.remote-ssh` /
`remote-containers` directories (97 dirs enumerated). The OSS tree ships
`extensions/vscode-test-resolver` (test resolver) and `extensions/tunnel-forwarding`
(MIT) only. **[EXTERNAL]** the production Remote-SSH and Dev-Containers extensions are
marketplace-distributed and their licenses do not permit OSS-build redistribution.
Wave-1's plan stands: Flauz ships its own OSS resolvers
(`vscode.proposed.resolvers.d.ts` → `registerRemoteAuthorityResolver`,
`extensions/vscode-test-resolver` as precedent).

**Tree evidence the mechanism is OSS and complete:** `src/vscode-dts/vscode.proposed.resolvers.d.ts`
(`registerRemoteAuthorityResolver`), `src/vs/server/` (in-repo remote server),
`cli/src/tunnels/` + `tunnelApplicationName` (`product.json:16`) for `code tunnel`.
Note the in-tree agent-host world already exercises this heavily:
`src/vs/platform/agentHost/common/sshRemoteAgentHost.ts`, `sshHostKeyTrust.ts`,
`sshHostKeyPolicy.ts`, `devContainerAgentHost.ts`, `wslRemoteAgentHost.ts`,
`tunnelAgentHost.ts` — all MIT, so Flauz can build OSS remote agents on first-class substrate.

### 3.3 Default chat agent entitlement (`defaultChatAgent` + protected resources)

**Facts.**
- `product.json:90-157` — `defaultChatAgent` block: `extensionId: "GitHub.copilot"`,
  `chatExtensionId: "GitHub.copilot-chat"`, entitlement endpoints
  `https://api.github.com/copilot_internal/user`, `.../v2/token`, `.../subscribe_limited_user`,
  `mcpRegistryDataUrl`, `managedSettingsUrl`, plus `providerScopes` incl. `repo`, `workflow`.
  This is *product configuration* in the OSS tree: the mechanism is MIT, the **entitlements it
  points at are GitHub services with their own terms**.
- `src/vs/platform/agentHost/common/agent.ts:360-366` —
  `GITHUB_COPILOT_PROTECTED_RESOURCE = { resource: 'https://api.github.com',
  resource_name: 'GitHub Copilot', authorization_servers: ['https://github.com/login/oauth'],
  scopes_supported: ['read:user','user:email'], required: true }` — the agent-host auth
  boundary is keyed to GitHub as OAuth Protected Resource (RFC-8707-style metadata).
- `src/vs/workbench/contrib/chat/browser/agentSessions/agentHost/agentHostProtectedResourcesService.ts:16-27`
  — providers advertise protected resources; the service doc states: *"whether a session type
  requires GitHub Copilot sign-in right now: Claude in native mode / Codex on OpenAI advertise
  the Copilot resource with `required: false`, so they are usable without signing in"*.
  I.e. **Claude & Codex agent providers are in-tree and can run without Copilot entitlement**;
  the Copilot provider itself is entitlement-gated.
- `src/vs/platform/endpoint/common/licenseAgreement.ts:11-12` and
  `extensions/copilot/src/platform/endpoint/common/licenseAgreement.ts:11-12` — build-time
  injection points: `COPILOT_LICENSE_AGREEMENT = undefined` / `LICENSE_AGREEMENT = undefined`,
  `INTEGRATION_ID = 'code-oss'`. MS product builds inject a Copilot license agreement string
  here ("This file is modified as part of the production build"). **Flauz builds leave these
  `undefined` (OSS behavior) or inject Flauz's own terms — the plumbing is OSS-safe.**
- Settings exist to disable providers wholesale:
  `src/vs/platform/agentHost/common/agentService.ts:179-196` —
  `chat.agentHost.claudeAgent.enabled`, `chat.agentHost.codexAgent.enabled` (Codex defaults
  off in Stable).

**Implication.** Flauz's own default agent must be a Flauz participant, not GitHub Copilot:
`defaultChatAgent` in `product.flauz.json` should point at a Flauz agent (or be restructured),
and `trustedExtensionAuthAccess` should not pre-grant GitHub scopes to a third-party extension.

### 3.4 Fonts, branding, trademark

**Facts.**
- `resources/` contains no bundled font directory (verified: `darwin`, `linux`, `win32`,
  `server`, `completions` only). OSS tree ships **no MS fonts**; product VS Code adds them
  **[EXTERNAL]**. Flauz: ship open fonts (e.g. its own choice) and must not extract VS Code's.
- `SECURITY.md:1-14` is the boilerplate **Microsoft** security-reporting block
  (aka.ms/SECURITY.md). Flauz must replace with its own policy.
- `README.md` titles the project "Visual Studio Code" (OSS repo readme) — Flauz replaces
  top-level docs (README, CONTRIBUTING, SECURITY) as identity artifacts.
- `product.json:2-37` identity keys enumerate the whole rename surface:
  `nameShort/nameLong` ("Code - OSS"), `applicationName` (`code-oss`),
  `dataFolderName` (`.vscode-oss`), `sharedDataFolderName`, `win32MutexName`, `win32DirName`,
  `win32NameVersion`, `win32RegValueName`, `win32x64/arm64AppId` + user variants (GUIDs),
  `win32AppUserModelId`, `win32ShellNameShort`, `darwinBundleIdentifier`
  (`com.visualstudio.code.oss`), `darwinProfileUUID`, `linuxDesktopName`
  (`com.visualstudio.CodeOSS`), `linuxIconName`, `urlProtocol` (`code-oss`),
  `serverApplicationName` (`code-server-oss`), `serverDataFolderName`, `tunnelApplicationName`
  (`code-tunnel-oss`), `win32TunnelServiceMutex`/`win32TunnelMutex`, plus
  `licenseUrl`/`serverLicenseUrl`/`reportIssueUrl` (→ github.com/microsoft/vscode).
- **[EXTERNAL]** "Visual Studio Code" is a Microsoft trademark; Microsoft's usage guidelines
  require forks to rename and re-icon. This is the classic VSCodium posture: rename, re-icon,
  own update channel, own telemetry, no MS endpoints.

### 3.5 Crash reporting / telemetry endpoints (product keys)

`src/vs/base/common/product.ts` defines the full telemetry/crash surface; OSS `product.json`
sets **none of them** (verified absence across all 249 lines):
`crashReporter` (`product.ts:196-199`), `appCenter` per-OS (`product.ts:242, 356-363`),
`tasConfig` experimentation (`product.ts:141-145`), `enabledTelemetryLevels`
(`product.ts:202`), `enableTelemetry` (`product.ts:203`), `removeTelemetryMachineId`
(`product.ts:201`), `showTelemetryOptOut` (`product.ts:225`), `settingsSearchUrl`
(`product.ts:139`), `emergencyAlertUrl` (`product.ts:279`), `aiConfig.ariaKey`
(`product.ts:205-207`), `aiGeneratedWorkspaceTrust` (`product.ts:274`).
What OSS *does* set: `agentsTelemetryAppName: "agents"` (`product.json:38`) — the app-name
token used by agent-host telemetry (`src/vs/platform/agentHost/common/agentHostTelemetry.ts`
family). Flauz builds set their own values or omit; default posture = no MS endpoints.
`base/common/product.ts:201` (`removeTelemetryMachineId`) is the documented knob to keep
machine IDs out.

---

## 4. Gallery / distribution options

**Mechanism keys (all in `src/vs/base/common/product.ts`):**
`extensionsGallery` (`:147-155`), `builtInExtensions` (`:124`, used by OSS
`product.json:40-89` for js-debug trio), `extensionEnabledApiProposals` (`:250`),
`builtInExtensionsEnabledWithAutoUpdates` (`:258`), `sessionsWindowAllowedExtensions`
(`:259`), `extensionPublisherOrgs`/`trustedExtensionPublishers` (`:176-177`),
`mcpGallery` (`:166-174`), `reportMarketplaceIssueUrl` (`:221`),
`extensionVerificationFlags`-adjacent hardening via `trustedExtensionProtocolHandlers`
(`:192`). Proposed-API gating is enforced at runtime by
`checkProposedApiEnabled` (`src/vs/workbench/services/extensions/common/extensions.ts:330-334`):
an extension may only use a proposal if declared in `package.json#enabledApiProposals` **and**
enabled via the product/build switch — the OSS build's own list lives in
`product.json`-supplied `extensionEnabledApiProposals` (none in OSS product.json →
built-ins' proposals are dev-mode only; the in-tree copilot ext's 64 proposals are enabled
where the product says so).

| Option | Licensing posture | Operational posture | Verdict |
|---|---|---|---|
| **A. Open VSX** (`open-vsx.org`) | Open VSX is Eclipse Foundation-hosted, API-compatible gallery; its terms allow third-party products **[EXTERNAL — re-check current ToS at ship time]** | Instant catalog breadth; upstream tooling (vsce/openvsx) works; but rate limits, signing/PKI differences vs MS, and reputation of some extensions | **Recommended default** for Wave-2 planning: `extensionsGallery.serviceUrl = https://open-vsx.org/vscode`, `resourceUrlTemplate` etc. per Open VSX docs; keep it swappable via product.json |
| **B. Self-hosted registry** | Fully Flauz-controlled; no third-party ToS; must mirror/curate catalog | Cold-start catalog problem; infra + security review burden of hosting/signing; needs its own abuse policy | Long-term goal; ship behind the same product.json keys so switch is config-only |
| **C. Dual-source** (Open VSX default + Flauz registry for Flauz-signed agents/skills) | Mixed; Flauz-curated surface under Flauz terms | Best of both: breadth from A, trust anchor for the agent ecosystem (Flauz Agent Bridge, provider adapters, browser tool) distributed only via B | **Recommended target state**; start with A, add B when Flauz has first-party extensions to ship |

**VSCodium precedent [EXTERNAL — general posture only; specifics re-derived from tree]:**
their patch set exists precisely because of §3: (1) product.json → own identity + Open VSX
gallery keys; (2) no MS telemetry/AppCenter/tasConfig; (3) own icons/name; (4) keep MIT
LICENSE.txt + ThirdPartyNotices (regenerated); (5) disable `defaultChatAgent`-style MS
entitlement surfaces. Every one of those maps to a tree-verified key above — which is the
point: **the fork surface for distribution is product.json-shaped, not src/vs-shaped.**

**builtInExtensions mechanism:** OSS `product.json:40-89` pulls
`ms-vscode.js-debug-companion`, `ms-vscode.js-debug` (1.140.0),
`ms-vscode.vscode-js-profile-table` at build time with `sha256` pins. All three are MIT
**[EXTERNAL — verify each repo's LICENSE at pin time; the cgmanifest/cglicenses path in §5
does not list them, they are marketplace-sourced]**. Flauz can use the same mechanism for
its own external built-ins (`UPSTREAM-STRATEGY.md` "packaging" row) — licensing-clean as
long as each pulled artifact's license is recorded (add to Flauz cgmanifest).

---

## 5. Third-party dependency obligations (release mechanics)

**What the tree tracks (and therefore what a Flauz release must regenerate/carry):**

1. **`cgmanifest.json`** (root, 774 lines) — 14 build-time components:
   chromium (BSD, full text inline), **ffmpeg LGPL-2.1+**, nodejs, electron (MIT),
   inno setup (installer), spdlog (MIT), **vscode-codicons (MIT + CC-BY 4.0)**, ripgrep (MIT),
   vscode-win32-app-container-tokens, mdn-data, @mdn/browser-compat-data,
   @iktakahiro/markdown-it-katex, cacheable-request, and **"H.264/AVC Video Standard"** as a
   patent-bearing `other` component (downloadUrl → chromium ffmpeg).
   → Flauz releases must regenerate this (component governance) and **decide the H.264/ffmpeg
   posture**: shipping Electron's default Chromium (with proprietary codecs) vs a
   `ffmpeg-free`/system-ffmpeg build **[EXTERNAL: Electron publishes both; licensing call is
   Flauz's]**. LGPL-2.1+ ffmpeg → dynamic linking + offer-to-provide-source compliance text.
2. **`cglicenses.json`** (78 entries) — curated license texts for deps whose npm metadata is
   insufficient. Material findings:
   - **`@anthropic-ai/claude-agent-sdk` — "© Anthropic PBC. All rights reserved. Use is
     subject to Anthropic's Commercial Terms of Service."** (`cglicenses.json` entry; also a
     runtime dep `package.json:171` `"@anthropic-ai/claude-agent-sdk": "0.3.258"`). This is a
     **proprietary-licensed dependency inside the MIT repo's dependency graph**.
   - `@github/copilot` + 9 platform binaries (`@github/copilot-darwin-*` etc.) — prepend-only
     copyright "© GitHub, Inc." with no OSS license text in the tree (their npm packages
     carry GitHub's own pre-release license **[EXTERNAL verify]**).
   - `@github/copilot-sdk` (license text at github/copilot-sdk repo), `@microsoft/mxc-sdk`
     (MIT), wasm-tools family (Apache-2.0), `ahp`/`ahp-types`/`ahp-ws` (MIT, Microsoft —
     the **A**gent **H**ost **P**rotocol packages), dev-tunnels family (MIT),
     tweetnacl/robust-predicates (Unlicense), chownr (ISC), emitter-listener (BSD-2),
     iconify json packs (CC-BY / MDI terms via URI).
3. **`ThirdPartyNotices.txt`** (root, 3,439 lines) — flat per-package notices for shipped npm
   deps (~86 blocks; census: 56 MIT, ~15 Apache-2.0, ISC, PSF, plus **zsh 5.9** and **fish**
   entries carrying GPL caveats for shell-function snippets — "None of the core functions
   are affected by this, so those files may simply be omitted" (zsh block, ~line 3429)).
   → Flauz must regenerate (tooling: the repo's own `gulp hygiene`-adjacent notice task in
   `build/`; do **not** hand-edit) and carry it in every installer + server image.
4. **`cli/ThirdPartyNotices.txt`** — the Rust CLI's notices: **416 crates** enumerated with
   licenses (adler2 "0BSD OR MIT OR Apache-2.0" etc.), plus Microsoft's source-offer
   paragraph ("$5 check" + LGPL reverse-engineering clause) that **a Flauz release must
   rewrite in Flauz's own voice** (that paragraph is Microsoft's compliance text, not a
   license obligation). `cli/Cargo.toml` declares **no** `license` field — the crate is
   covered by the repo root MIT (Flauz keeps the same posture).
5. **`build/monaco/LICENSE`** — Monaco standalone MIT (2016-present) + its own
   ThirdPartyNotices (`build/monaco/ThirdPartyNotices.txt`) — relevant if Flauz re-ships
   Monaco builds.
6. **node_modules snapshots.** The repo ships no node_modules; obligations flow via
   `package.json` (69 deps / 101 devDeps) + `package-lock.json` at build time → notices are
   generated at build. The four dev-embedded dep trees with their own licensing files:
   `extensions/copilot` (own `cgmanifest.json` + `package-lock.json`),
   `extensions/terminal-suggest`, `extensions/theme-seti`,
   `extensions/mermaid-markdown-features` (per-extension ThirdPartyNotices, above).

**Release checklist distilled:** regenerate `ThirdPartyNotices.txt` (root),
`cli/ThirdPartyNotices.txt`, per-extension notices; refresh cgmanifest (esp. new Flauz
built-ins); carry `LICENSE.txt` (MS MIT) **and** Flauz's product license; record
claude-agent-sdk/codex/copilot-sdk terms (§ open questions); decide H.264/ffmpeg variant.

---

## 6. Branding / identity checklist (legal non-VS-Code product)

Every field below is verified present-and-load-bearing in the tree; changing it in
`product.flauz.json` (build-time overlay, per Wave-1 UPSTREAM-STRATEGY) is config-only
divergence:

| # | product.json field (line) | Role (evidence) | Flauz action |
|---|---|---|---|
| 1 | `nameShort`, `nameLong` (:2-3) | Display name everywhere (title bars, dialogs) | "Flauz" |
| 2 | `applicationName` (:4) | Binary/CLI name, install dirs (`dataFolderName` :5 `~/.vscode-oss`) | `flauz` + `.flauz` |
| 3 | `win32MutexName` (:7), `win32TunnelServiceMutex`/`win32TunnelMutex` (:26-27) | single-instance + service mutexes | re-namespace |
| 4 | `win32x64AppId`/`win32arm64AppId`/user AppIds (:20-23) | Windows installer/product GUIDs (SxS with VS Code) | own GUIDs (new) |
| 5 | `win32AppUserModelId` (:24) | Taskbar/AUM identity | `Flauz.Flz` |
| 6 | `win32DirName`/`win32NameVersion`/`win32RegValueName`/`win32ShellNameShort` (:17-19,25) | install dir, registry key, shell name | Flauz values |
| 7 | `darwinBundleIdentifier` (:28) + `darwinProfileUUID` (:29-30) | macOS bundle id + provisioning profile | `app.flauz.Flauz` |
| 8 | `linuxDesktopName`/`linuxIconName` (:31-32) | `.desktop` identity + icon name | Flauz + own icon set |
| 9 | `urlProtocol` (:37) | `flauz://` URL handler | `flauz` |
| 10 | `serverApplicationName`/`serverDataFolderName` (:14-15) | remote server binary + `~/.flauz-server` | Flauz |
| 11 | `tunnelApplicationName` (:16) | `flauz tunnel` CLI identity | `flauz-tunnel` |
| 12 | `reportIssueUrl` (:34) | Help menu → issue tracker | Flauz tracker |
| 13 | `licenseUrl`/`serverLicenseUrl` (:9-10) | About/license links | Flauz product terms |
| 14 | `webviewContentExternalBaseUrlTemplate` (:39) | webview bootstrap CDN (MS) | self-host |
| 15 | `voiceWsUrl` (:248) | MS voice WS | remove or own service |
| 16 | `defaultChatAgent` (:90-157) | §3.3 | point at Flauz agent |
| 17 | `trustedExtensionAuthAccess` (:158-168) | product-level auth pre-grants | drop/re-point |
| 18 | `builtInExtensions` (:40-89) | external built-ins w/ sha256 | Flauz set (or keep js-debug trio after §5 checks) |
| 19 | `extensionsGallery` (absent; product.ts:147-155) | gallery wiring | Open VSX / own (§4) |
| 20 | `extensionEnabledApiProposals` (product.ts:250) | proposed-API enablement for built-ins | Flauz list pinned per sync (Wave-1 decision) |
| 21 | `agentsTelemetryAppName` (:38) | agent telemetry app token | `flauz-agents` or removed |
| 22 | Icons/logos | `resources/` tree + `linuxIconName` | own brand assets (codicons are MIT+CC-BY — may keep with attribution; brand logo must be Flauz's) |
| 23 | `SECURITY.md` | MS reporting block (§3.4) | Flauz security policy |
| 24 | Telemetry/updates (§3.5 keys) | absent in OSS; do **not** add MS values | Flauz update feed (`updateUrl` product.ts:129) if auto-update shipped |

---

## 7. Verdict table

Risk scale: **none/low/medium/high** — licensing risk of *shipping Flauz as a product* under
that decision, before mitigation. "M" = mitigation.

| # | Distribution decision | Risk | Why (tree evidence) | Mitigation |
|---|---|---|---|---|
| 1 | Base = Code OSS @ 9bf9ae764da, MIT | **none** | LICENSE.txt:1-21 grants distribute/sublicense/sell | Keep LICENSE + notices + headers; provenance doc |
| 2 | Ship `extensions/copilot` in-tree code as-is | **medium** | Code is MIT (extensions/copilot/LICENSE.txt) but identity/entitlement are GitHub's (`defaultChatAgent`, `copilot_internal` URLs, `ccreq` schemes) | Disable as default agent; either excise from Flauz builds or keep as optional user-installed; never pre-grant `trustedExtensionAuthAccess` |
| 3 | Ship Claude/Codex AHP providers | **high** | claude-agent-sdk = Anthropic Commercial ToS (cglicenses.json); codex = openai/codex (extensions/copilot/cgmanifest.json, license undeclared in-tree) | Ship as **runtime on-demand download** keyed to user-side acceptance (native pattern: `agentSdkDownloader.ts` + `product.agentSdks`), NOT bundled in Flauz installer; get own vendor agreements if bundled |
| 4 | Gallery = Open VSX | **low** | Config-only (`extensionsGallery` product.ts:147-155) | Verify Open VSX ToS at ship; keep keys swappable |
| 5 | Gallery = own registry (target) | **low** | Same keys; no third-party ToS | Own signing + abuse policy; start dual-source |
| 6 | Gallery = MS marketplace | **high** | No extensionsGallery in OSS product.json (verified absence); MS ToS blocks non-VS-Code products [EXTERNAL] | Do not use; never set serviceUrl to marketplace.visualstudio.com |
| 7 | Ship Chromium+ffmpeg as-is (default Electron) | **medium** | cgmanifest: ffmpeg LGPL-2.1+ + H.264/AVC patent component | Either ship `ffmpeg`-free Electron build (no proprietary codecs) or accept codec patent licensing path; LGPL compliance text + source offer |
| 8 | Rename/identity per §6 | **low** (execution risk only) | All fields verified product.json/product.ts | Ship checklist §6; CI assert no `vscode-cdn.net`/`*.microsoft.com`/`api.github.com/copilot_internal` defaults |
| 9 | Remote agents (SSH/WSL/tunnel/devcontainer) | **low** | All in-tree MIT (agentHost ssh*/wsl/tunnel/devContainer files, §3.2) | Ship own resolvers; keep MS extensions out |
| 10 | Keep builtInExtensions js-debug trio | **low** | product.json:40-89, sha256-pinned, MIT [EXTERNAL verify] | Record licenses in Flauz cgmanifest at each bump |
| 11 | Notices/regeneration pipeline | **medium** if skipped | 3,439-line TPN + 416-crate CLI notices + per-extension files (§5) | Automate notice regeneration in release CI; audit gate comparing `package-lock.json` ↔ TPN coverage |
| 12 | zsh/fish shell-integration snippets GPL caveat | **low** | TPN zsh 5.9 / fish entries (GPL'd shell functions; "may simply be omitted") | Carry notices; confirm shipped snippets are the non-GPL subset |
| 13 | elkjs (EPL-2.0) in mermaid ext | **low** | extensions/mermaid-markdown-features/ThirdPartyNotices.txt:10-276 | Carry notice + EPL source-offer for elkjs component |
| 14 | Replace SECURITY.md + MS-flavored notice paragraphs | **low** | SECURITY.md:1-14; cli/ThirdPartyNotices.txt MS source-offer para | Flauz-authored policy + regenerated CLI notices |
| 15 | Monaco standalone (if shipped) | **low** | build/monaco/LICENSE (MIT) + its TPN | Carry both files with Monaco artifacts |

---

## 8. Open questions for TL

1. **Agent-SDK bundling posture** (verdict #3): on-demand download (user accepts vendor
   terms; zero Flauz redistribution exposure) vs bundled (needs Anthropic Commercial Terms
   compatibility with Flauz distribution + codex Apache-2.0 confirmation). Recommend
   on-demand; needs product decision because it shapes the first-run experience.
2. **H.264/ffmpeg**: codec-free Electron build (video sites degraded) vs patent-licensed
   default? Product/UX call, not just legal.
3. **Open VSX vs own-gallery sequencing** (Wave-1 pending decision — this review's input:
   start Open VSX, dual-source later; both config-only).
4. **copilot extension in Flauz tree**: keep as optional or strip from Flauz product builds
   (upstream-merge cost either way — it's in-tree upstream now).
5. **`@github/copilot*` npm deps**: they sit in `cglicenses.json` with copyright-only
   entries; confirm whether Flauz builds that don't exercise the Copilot provider can
   tree-shake them from shipped artifacts (build-size + notice-surface win).
6. **codex license pin**: confirm openai/codex @ `acc4acc81eea0339ad46d1c6f8459f58eaee6211`
   license text (Apache-2.0 expected) and record in Flauz cgmanifest.
