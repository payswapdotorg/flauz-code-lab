# Flauz Code OSS Lab Roadmap

## Mission

Determine and prove how Flauz can be built on the Code OSS foundation while preserving mature IDE capabilities and adding the Flauz agent/workspace/environment/browser system.

## Repository topology

```
payswapdotorg/flauz-code-lab
    research + prototypes + evidence + decisions
                 │
                 ▼
payswapdotorg/Flauz:flauz/main
    Code OSS fork + Flauz implementation
```

The lab is not a second product fork.

## Current state

### W1 — Code OSS feasibility
- [x] Architecture investigation (Worker A is integrated on lab main)
- [ ] Browser/UX investigation integrated into lab main
- [ ] Capability matrix integrated into lab main

### W2 — Legal / security / performance / migration
- [ ] Integrate final evidence/decisions into lab main
- [ ] Ensure unresolved legal/security questions are explicitly recorded

### W3 — Vertical integration
- [ ] Finalize handoff records for Agent Bridge
- [ ] Finalize workspace/evidence design
- [ ] Finalize performance/CI findings
- [x] Implementation exists on the Flauz product line for core agent/model surfaces

### W4 — Strengthening / multi-environment
- [x] Browser policy implementation exists on `Flauz:flauz/main`
- [x] Environment registry/continuity implementation exists on `Flauz:flauz/main`
- [x] Workflow envelope implementation exists on `Flauz:flauz/main`
- [ ] Final lab reconciliation into one current evidence index

### W4 exit / decision log
- [x] Decision-log work exists on the lab/product lines
- [ ] Publish one canonical decision summary in lab main

### R20
- [ ] Resolve/reclassify the remaining technical-debt items recorded by TL2
- [ ] Verify the assumptions against the current product line

### W5 distribution
- [ ] Release pipeline/update-channel design
- [ ] Gallery/branding decision
- [ ] Legal closeout and telemetry/privacy decision
- [ ] Product-line integration verification

## Definition of done for the lab

The lab handoff is complete when:

1. The current Code OSS product branch is named and pinned.
2. All completed waves have one canonical evidence index.
3. Every open question has an owner and next experiment.
4. Prototypes are distinguished from integrated product code.
5. The browser, agent, model, environment, workflow, security, performance, and upstream strategy each have a current decision.
6. A new lead can continue without this chat.
7. The lab contains no ambiguous “done” claim that exists only on a stale branch.

## Stop rule

Do not keep adding waves once the lab has a complete decision record and implementation-ready next actions. At that point future work belongs in the product repo or in a narrowly scoped new experiment.
