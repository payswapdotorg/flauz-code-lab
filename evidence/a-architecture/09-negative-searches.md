Evidence 09 — Negative Searches (Honest Absences)
All commands below are expected to return NO matches (or only unrelated hits, noted).Absence evidence for ARCHITECTURE-MAPPING rows 8, 12, 15, 24, 25 and the Environments table.Re-run at next upstream sync before relying on "still absent" (protocol at bottom).
8. Memory (long-term memory / MemoryService)
$ rg -ni "MemoryService|longTermMemory|agentMemory" src/vscode-dts/ src/vs/workbench/api/ src/vs/platform/→ expect: no agent-memory API. (Memento/IStorageService exist but are key-value state,  not memory — see evidence 05.)
12. AccessSurface (policy engine)
$ rg -ni "accessPolicy|capabilityGrant|permissionService" src/vs/platform/ src/vscode-dts/→ expect: no agent-capability permission system. Nearest: workspace trust (evidence 05).
15/24. Claim / Lease
$ rg -ni "lease|exclusiveLock|claimResource" src/vscode-dts/ src/vs/workbench/contrib/chat/→ expect: no lease/claim primitives over resources.
25. Collaboration
$ rg -ni "collaborationSession|coEditing|liveShare" src/vscode-dts/vscode.d.ts→ expect: no collaboration API in the OSS tree (Live Share heritage proprietary/retired).
Agent-to-agent messaging
$ rg -ni "agentToAgent|interAgent|multiAgentOrchestration" src/vscode-dts/→ expect: none (single-agent runtime only; multi-agent = Flauz service).
Proprietary remote/devcontainer built-ins
$ ls extensions | grep -iE "remote-ssh|devcontainer|remote-containers"→ expect: no match → Flauz ships its own OSS providers (evidence 07).
Re-verification protocol
Run each command on a fresh shallow clone of the mirror head; record match/no-match + firsthits in the sync log. Any newly-appearing symbol invalidates the correspondingARCHITECTURE-MAPPING row — flag to TL immediately.
