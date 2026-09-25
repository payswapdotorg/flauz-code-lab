# flauz-code-lab worklog (append-only)

> NOTE (Worker D, Wave 2): this file did not exist on `main` as of branch point
> `08e7bfb` — Worker A's transit was transcript-reconstruction (see PROVENANCE.md) and
> the worklog was not among the 15 files that made it across. Creating it now with the
> Wave-1 context header below so future workers have one place to append; nothing of
> Worker A's was rewritten (their record lives in PROVENANCE.md + git history).

---
Task ID: wave1/a-architecture (historical, reconstructed reference)
Agent: Worker A (flauz-A4-w1) — delivered via TL transcript reconstruction
Task: Code OSS architecture & integration mapping

Work Log:
- (Not re-recorded here — 8 commits on the original worker sandbox; 14 deliverable files
  reconstructed by TL#2 and committed to main as 08e7bfb.)

Stage Summary:
- docs/{ARCHITECTURE,ARCHITECTURE-MAPPING,AGENT-INTEGRATION,UPSTREAM-STRATEGY}.md +
  evidence/a-architecture/01..09. FORK-CRITICAL = 0. Several [VERIFY] markers left for
  Wave 2; Worker D resolved the security-relevant ones (see below / SECURITY-MODEL.md §7).

---
Task ID: wave2/d-license-security
Agent: Worker D (flauz-D-w2), dispatched by TL#2
Task: Licensing/distribution review + security model for Flauz (Code OSS base @ 9bf9ae764da)

Work Log:
- Cloned flauz-code-lab (branch wave2/d-license-security from main @ 08e7bfb) and the
  Flauz mirror depth-1, verified HEAD = 9bf9ae764da438b1234a8243dc9e47173ef58ee7 (386 MB,
  19,182 files; first background clone attempt died with the shell session — retried
  foreground; connectivity verified via git ls-remote).
- Read Wave-1 docs (ARCHITECTURE, ARCHITECTURE-MAPPING, AGENT-INTEGRATION, UPSTREAM-
  STRATEGY) + all 9 evidence files; noted INDEX.md was contaminated by chat-DOM noise
  during TL reconstruction (flagged, not rewritten — out of my lane).
- Licensing evidence: LICENSE.txt (MIT), full product.json read (249 lines), product.ts
  typed surface, 97-extension license audit (programmatic), all ThirdPartyNotices files,
  cgmanifest.json (14 registrations), cglicenses.json (78 entries), cli/ Cargo + notices
  (416 crates), Monaco license, root TPN census + GPL caveats, SECURITY.md.
- Extensions audit result: 96/97 MIT; copilot in-tree MIT; non-MIT bundled material =
  elkjs EPL-2.0 (mermaid ext), plus notice-only seti/fig. cglicenses: claude-agent-sdk
  PROPRIETARY (Anthropic Commercial ToS) — headline finding.
- Proprietary boundaries: verified extensionsGallery absence, no Remote-SSH/devcontainer
  built-ins, no telemetry/update keys, defaultChatAgent → GitHub.copilot with
  copilot_internal entitlement URLs, licenseAgreement.ts build-injection points,
  GITHUB_COPILOT_PROTECTED_RESOURCE (agent.ts:360-366), trustedExtensionAuthAccess
  pre-grants, vscode-cdn.net webview template, voiceWsUrl MS endpoint.
- Security substrate: read browserPermissions.ts (full), browserSession.ts (full),
  networkFilterService.ts, navigateBrowserTool.ts + browserToolHelpers (driver-side
  gate), browserView.ts will-navigate (UX-only — Wave-1 Worker B formalization),
  languageModelToolsConfirmationService.ts + ToolConfirmKind,
  chatToolRiskAssessmentService.ts, sessionPermissions.ts (AHP permission engine —
  MAJOR Wave-1 correction), sessionSandbox.ts, agent.ts steering + permissionKind
  taxonomy, workspace trust (platform home — path correction), secrets/encryption,
  checkProposedApiEnabled, webview sandbox attrs.
- Wrote docs/LICENSE-DISTRIBUTION-REVIEW.md (committed 8f61201), docs/SECURITY-MODEL.md
  (committed 4e665a0), evidence/d-license-security/01..05 + INDEX.md (committed 7069d28).
- Verified every quantitative claim programmatically (64 copilot proposals — fixed an
  initial 62; 97 extensions; 78/14 manifest entries; 416 crates; 3,439-line TPN).

Stage Summary:
- Licensing verdicts: MIT base is clean; risks concentrate in (1) claude-agent-sdk
  proprietary terms [recommend runtime-download not bundling], (2) gallery choice
  [Open VSX → own registry; MS marketplace prohibited], (3) ffmpeg/H.264 patent+LGPL
  posture, (4) copilot ext entitlement coupling [disable as default agent], (5) notice
  regeneration pipeline (root TPN + 416-crate CLI + per-ext files; MS source-offer
  paragraph must be rewritten in Flauz voice).
- Security verdicts: tree is FAR more agent-native than Wave-1 recorded — AHP
  SessionPermissionManager = real per-session permission engine (permissionKind
  taxonomy ≈ AccessSurface vocabulary), sandbox floor + bypass escalation, combination-
  scoped confirmations, tool risk assessment, agent browser partitions (sha256-keyed,
  in-memory), driver-side navigation gate + agent-scope webRequest filter. Flauz gaps
  that remain: cross-session/org policy source, resource-graph rules, evidence-ledger
  integrity, post-commit browser-URL reconciliation, default-on agent network filter.
- Two Wave-1 corrections delivered (SECURITY-MODEL.md §7): AccessSurface row 12 stale;
  workspace-trust path moved; peer-chat/subagent caveat on "single-agent runtime".
- Open questions for TL: agent-SDK bundling posture; H.264/ffmpeg variant; gallery
  sequencing (W1 pending); copilot ext keep-or-strip; @github/copilot* tree-shaking;
  codex license pin.
- Evidence coverage: 5 evidence files, ~60 file:line-cited claims, 8 negative-search
  receipts with re-verification protocol.
