# Autonomous Execution

This file replaces dependency on chat context.

## Startup

```
read docs/CURRENT-STATE.md
→ read docs/TECH-LEAD-HANDOFF.md
→ inspect payswapdotorg/Flauz:flauz/main
→ inspect current lab branches
→ select the smallest unresolved roadmap item
→ run the required experiment
→ record evidence + decision
→ integrate only when acceptance is met
```

## Classification law

Every result must be one of:

- RESEARCHED
- PROTOTYPED
- VERIFIED
- INTEGRATED
- BLOCKED
- SUPERSEDED

Never use “done” without one of these states and an evidence pointer.

## Worker model

Use three concurrent workers when work is disjoint:

### Worker A — upstream/product architecture
Maps Code OSS changes, extension boundaries, upstream sync, packaging, and fork risk.

### Worker B — agent/browser/environment product integration
Owns the actual integration proofs on the Flauz product branch: agent bridge, browser, models, environments, workflows, and user-facing seams.

### Worker C — adversarial validation
Runs compatibility, security, performance, UX, reproducibility, and end-to-end product simulations.

The TL must merge their findings into one decision record.

## Product-line rule

Experiments live in this lab.

Product implementation lives in `payswapdotorg/Flauz:flauz/main`.

A prototype is not integrated until:
- implementation is on the product line;
- tests pass;
- evidence names the exact product SHA;
- the integration decision is recorded.

## Upstream rule

Prefer extension/additive mechanisms.

Any deliberate core Code OSS fork divergence must have:
- rationale;
- upstream alternative considered;
- maintenance cost;
- rollback/demotion path;
- owner.

## Browser rule

Treat “browser support” as a first-class architecture surface, not as a webview checkbox.

Record:
- browsing model;
- session isolation;
- navigation/auth handling;
- agent control boundary;
- security policy;
- evidence capture;
- failure/recovery behavior.

## Stop condition

Once the remaining architecture questions are answered and the product branch has implementation-ready handoff artifacts, stop the standing TL2 loop. New work should be created as a focused product work order or experiment.
