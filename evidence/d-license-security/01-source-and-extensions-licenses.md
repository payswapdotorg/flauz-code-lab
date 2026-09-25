# Evidence 01 — Source & Extensions Licensing

Provenance: payswapdotorg/Flauz (pristine microsoft/vscode mirror) @
`9bf9ae764da438b1234a8243dc9e47173ef58ee7` (2026-09-24), shallow clone, read-only.
All line numbers from this commit. Reproduce with `rg -n "<pattern>" <path>`.

## 1. Root license = MIT

`LICENSE.txt:1-21` (full file):
> 1  MIT License
> 3  Copyright (c) 2015 - present Microsoft Corporation
> 5-10 Permission is hereby granted, free of charge … to use, copy, modify, merge,
>    publish, distribute, sublicense, and/or sell copies of the Software …
> 12-13 The above copyright notice and this permission notice shall be included in all
>    copies or substantial portions of the Software.

`product.json:8-10`:
> "licenseName": "MIT" / "licenseUrl": "https://github.com/microsoft/vscode/blob/main/LICENSE.txt"
> "serverLicenseUrl": same

Standard MS-MIT file header (spot-checked; identical pattern in all five trees):
- `src/vs/platform/browserView/common/browserPermissions.ts:1-4`
- `extensions/copilot/src/platform/endpoint/common/licenseAgreement.ts:1-4`
- `src/vs/platform/workspace/common/workspaceTrust.ts:1-4`
- `extensions/types/lib.url.d.ts:1-4`

## 2. Extensions audit (97 dirs)

Command: enumerate `extensions/*/package.json#license` + LICENSE/ThirdPartyNotices files.

Result matrix (receipt):
- 96/97 = `"license": "MIT"` in package.json (re-run:
  `for d in extensions/*/; do python3 -c "import json;print('$d', json.load(open('$d/package.json')).get('license'))"; done`)
- `extensions/copilot/package.json` → `"license": "SEE LICENSE IN LICENSE.txt"`
- `extensions/copilot/LICENSE.txt:1-21` → MIT, "Copyright (c) Microsoft Corporation. All rights reserved."
- `extensions/copilot/chat-lib/LICENSE.txt:1-3` → "MIT License / Copyright (c) Microsoft Corporation."
- `extensions/types/` → no package.json license field; both `.d.ts` carry MS-MIT header
  (`lib.textEncoder.d.ts:1-4`, `lib.url.d.ts:1-4`)

## 3. Non-MIT material inside extensions (exhaustive)

`extensions/mermaid-markdown-features/ThirdPartyNotices.txt`:
> 10 %% elkjs NOTICES AND INFORMATION BEGIN HERE
> 12 # Eclipse Public License - v 2.0
(block spans lines 10-276; single component)

`extensions/terminal-suggest/ThirdPartyNotices.txt` (item 1):
> withfig/autocomplete — Copyright (c) 2021 Hercules Labs Inc. (Fig) — MIT text follows

`extensions/theme-seti/ThirdPartyNotices.txt` (item 1):
> Seti UI (https://github.com/jesseweed/seti-ui) — Copyright (c) 2014 Jesse Weed — MIT text follows

`extensions/copilot/cgmanifest.json` (full file, 1 registration):
> "component": { "type": "git", "git": { "name": "codex",
>   "repositoryUrl": "https://github.com/openai/codex",
>   "commitHash": "acc4acc81eea0339ad46d1c6f8459f58eaee6211" } }
> — NO license field declared in manifest (UNCERTAIN item in review §2)

## 4. Build-time / platform license injection points

`src/vs/platform/endpoint/common/licenseAgreement.ts:6-12`:
> * This file is modified as part of the production build.
> * WARNING: Do not move or rename this file.
> export const COPILOT_LICENSE_AGREEMENT: string | undefined = undefined;
> export const COPILOT_INTEGRATION_ID: string = 'code-oss';

`extensions/copilot/src/platform/endpoint/common/licenseAgreement.ts:11-12`:
> export const LICENSE_AGREEMENT: string | undefined = undefined;
> export const INTEGRATION_ID: string = 'code-oss';

## 5. Copilot extension identity & coupling

`extensions/copilot/package.json`:
> "name": "copilot-chat", "publisher": "GitHub", "displayName": "GitHub Copilot",
> "version": "0.68.0", "license": "SEE LICENSE IN LICENSE.txt"
> "enabledApiProposals": [64 entries — programmatically counted]
> "activationEvents": ["onStartupFinished", "onLanguageModelChat:copilot", "onUri", …,
>   "onFileSystem:ccreq", "onFileSystem:ccsettings"]

## 6. Root cgmanifest.json (14 registrations)

`cgmanifest.json` (parsed programmatically; types: 9 git / 4 npm / 1 other):
> chromium → chromium.googlesource.com (BSD full text inline as licenseDetail)
> ffmpeg → LGPL-2.1+ (declared license field)
> nodejs → github.com/nodejs/node (no license field in entry)
> electron → MIT
> inno setup → github.com/jrsoftware/issrc (no license field in entry)
> spdlog original → MIT
> vscode-codicons → "MIT and Creative Commons Attribution 4.0"
> ripgrep → MIT
> vscode-win32-app-container-tokens → (no license field in entry)
> other: H.264/AVC Video Standard (downloadUrl → chromium/third_party/ffmpeg)
> npm: mdn-data 2.0.31, @mdn/browser-compat-data 5.2.45,
>      @iktakahiro/markdown-it-katex 4.0.2, cacheable-request 7.0.4

## 7. cglicenses.json (78 curated entries — material ones)

`cglicenses.json` (list of 78; entries carry licenseDetail / fullLicenseText /
fullLicenseTextUri / prependLicenseText):
> @anthropic-ai/claude-agent-sdk → licenseDetail:
>   "© Anthropic PBC. All rights reserved. Use is subject to Anthropic's
>    Commercial Terms of Service."
> ahp / ahp-types / ahp-ws → MIT, "Copyright (c) Microsoft Corporation. All rights reserved."
> @github/copilot → prependLicenseText: ["Copyright (c) GitHub, Inc."] only (no OSS license text)
> @github/copilot-darwin-arm64/-x64, -linux-arm64/-x64, -win32-arm64/-x64, -linuxmusl-* →
>   prepend-only "Copyright (c) GitHub, Inc." (9 platform packages + base)
> @github/copilot-sdk → fullLicenseTextUri: github/copilot-sdk main/LICENSE
> @microsoft/mxc-sdk → MIT
> wasm-tools family (wit-component, wasm-metadata, wasmparser, wit-parser, wasm-encoder) →
>   fullLicenseTextUri …/wasm-tools/…/LICENSE-APACHE (Apache-2.0)
> @microsoft/dev-tunnels-{connections,contracts,management,ssh,ssh-tcp} → MIT
> tweetnacl → Unlicense; robust-predicates → Unlicense; chownr → ISC;
> emitter-listener → BSD 2-Clause; @iconify-json/{logos,mdi} → license URIs;
> typescript / jschardet / @types/node → prepend/fullLicenseTextUri (DT Apache-2.0 URI)
> onnxruntime-node → MIT; @vscode/* family → MIT/URIs

## 8. Root ThirdPartyNotices.txt (3,439 lines)

Header:
> 1-3 NOTICES / This repository incorporates material as listed below or described in the code.

License census (grep-based):
> 56 × "MIT License" · 15 × "Apache License" · 9 × "Version 2.0" · 2 × "ISC License"
> 1 × "Python Software Foundation"

GPL-caveat entries:
> :1088-1093 fish — "Most of fish is licensed under the GNU General Public License version 2 …
>   certain shell functions … GNU Library General Public License version 2"
> :3429 (zsh 5.9 entry) — "note that certain shell functions are licensed under versions of
>   the GNU General Public Licence. Anyone distributing the shell as a binary including those
>   files needs to take account of this. … None of the core functions are affected by this,
>   so those files may simply be omitted."

## 9. Rust CLI

`cli/Cargo.toml` — **no `license` field** (rg '^license' → no match); crate covered by root MIT.
`cli/ThirdPartyNotices.txt`:
> :1-16 "NOTICES AND INFORMATION / Do Not Translate or Localize / This software incorporates
>   material from third parties. Microsoft makes certain open source code available at
>   https://3rdpartysource.microsoft.com, or you may send a check or money order for
>   US $5.00 … Source Code Compliance Team, Microsoft Corporation, One Microsoft Way …
>   Notwithstanding any other terms, you may reverse engineer this software to the extent
>   required to debug changes to any libraries licensed under the GNU Lesser General Public License."
> :24 adler2 2.0.1 - 0BSD OR MIT OR Apache-2.0 (first crate of …)
> 416 crates total (grep -cE '^[a-z0-9_-]+ [0-9]')

## 10. Monaco standalone

`build/monaco/LICENSE:1-3` → "The MIT License (MIT) / Copyright (c) 2016 - present Microsoft
Corporation" (21 lines, MIT).
`build/monaco/ThirdPartyNotices.txt` exists alongside.

## 11. package.json runtime deps of note

`package.json`:
> :102 "@github/copilot-sdk": "1.0.15-preview.2"
> :171 "@anthropic-ai/claude-agent-sdk": "0.3.258"
> also: "@anthropic-ai/sdk": "^0.82.0", "@microsoft/mxc-sdk": "0.8.0",
>       "@vscode/copilot-api": "^0.5.2"
> totals: 69 dependencies / 101 devDependencies

## 12. SECURITY.md is Microsoft boilerplate

`SECURITY.md:1-14` — "BEGIN MICROSOFT SECURITY.MD V1.0.0 BLOCK … aka.ms/SECURITY.md …
END MICROSOFT SECURITY.MD BLOCK" (must be replaced by Flauz policy).
