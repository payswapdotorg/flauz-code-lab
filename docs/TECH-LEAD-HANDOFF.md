# Final Tech Lead #2 Handoff

**Primary repo:** `payswapdotorg/flauz-code-lab`  
**Product implementation:** `payswapdotorg/Flauz:flauz/main`  
**Date:** 2026-09-27

## Mission

Own the Code OSS feasibility/integration track for Flauz.

The objective is not to recreate an IDE. It is to preserve Code OSS's mature IDE surface and add Flauz's agent, model, browser, environment, workflow, evidence, orchestration, and workspace capabilities with minimal fork divergence.

## What is established

The investigation found that Code OSS already contains substantial agent-era infrastructure. The TL2 architecture work maps Flauz concepts onto:
- native chat/agent surfaces;
- language-model APIs;
- tools/MCP;
- edit-tracked changesets;
- tasks/terminal/debugging;
- remote/environment mechanisms;
- built-in extensions and additive product packaging.

The preferred architecture is hybrid:
- native Code OSS workbench/extension surfaces for user interaction;
- Flauz services for durable orchestration, memory, claims/leases, approvals, evidence, routing, and collaboration concerns that are not native Code OSS primitives.

The product fork has implementation on `flauz/main` for major TL2 waves, including agent, browser-policy, model, environment, and workflow surfaces.

## What is NOT complete

The lab's default `main` does not contain the full later-wave evidence set. The TL2 report therefore cannot itself be treated as the final repository handoff.

The remaining handoff work is documentation/reconciliation, not a return to speculative architecture:
1. consolidate the later-wave decisions into lab main;
2. reconcile the W4 exit and R20 status against the actual product branch;
3. record exactly what is prototype versus integrated;
4. record the product-branch baseline and branch-strategy decision;
5. define the next product work orders only after that reconciliation.

## Product branch rule

Do not accidentally confuse:
- `payswapdotorg/Flauz` default `main` (upstream Code OSS line)
with
- `payswapdotorg/Flauz:flauz/main` (current Flauz implementation candidate).

That distinction is mandatory in every future handoff.

## Handoff completion

This handoff becomes operationally complete once a new TL can:
- read this repo;
- identify the exact product SHA;
- inspect the relevant implementation;
- run the named verification;
- select the next experiment/work order;
- continue without any chat history.

## After handoff

TL2 should not remain a permanent general-purpose implementation lead.

Use TL2 again only for:
- major Code OSS/upstream architecture decisions;
- product-line migration/rebase decisions;
- difficult browser/agent/environment integration;
- cross-platform UX/performance validation;
- release-critical regressions in the Code OSS product line.

Routine implementation belongs to scoped workers following these repository instructions.
