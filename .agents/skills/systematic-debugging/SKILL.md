---
name: systematic-debugging
description: "Master evidence-based troubleshooting with Poké Vicio's mandatory 3-Tier Bug Fixing Protocol (Unit RED-to-GREEN, Integrity/Integration, and Playwright Simulations via /game-simulation). Use PROACTIVELY to solve complex bugs, perform root cause analysis, and ensure 0 regressions."
allowed-tools: Read, Glob, Grep
---

# Systematic Debugging

> Master evidence-based troubleshooting and Poké Vicio's mandatory 3-Tier Bug Fixing Protocol.

## Overview

This skill provides a structured approach to debugging that prevents random guessing, eliminates hasty fallbacks, and guarantees 100% test-backed regression protection across all 3 testing tiers.

---

## 🏛️ Mandatory 3-Tier Bug Fixing Protocol

Whenever investigating, diagnosing, or resolving ANY bug or unexpected state across the project, you MUST apply the 3-Tier Protocol:

| Tier | Purpose | Location | Verification Tool |
| :--- | :--- | :--- | :--- |
| **Tier 1: Unit Test** | Isolated, static reproduction test (RED-to-GREEN) | `tests/node/` or `tests/unit/` | `npx vitest run <test>` |
| **Tier 2: Integrity Test** | Contract, schema, FSM lifecycle & `@pkmn/sim` parity | `tests/integration/` or `tests/node/` | `npx vitest run tests/node/` |
| **Tier 3: Playwright Sim** | Real browser E2E interaction following `/game-simulation` | `scripts/e2e/` | `npx playwright test <sim>` |

---

## 🔄 4-Phase Debugging Process

### Phase 1: Reproduce (Tier 1 Unit Test in RED)

Before making ANY edit to `src/`, reliably reproduce the issue with an isolated unit test:
1. Extract failing state, seed, teams, and choice streams into a static inlined fixture.
2. Write a minimal reproduction test in `tests/node/` or `tests/unit/`.
3. Run Vitest and confirm that the test deterministically fails in **RED**.

```markdown
## Reproduction Steps
1. [Exact step to reproduce]
2. [Failing assertion / error trace]
3. [Isolated Unit Test path: tests/node/.../reproduce_xxx.test.ts]
4. [RED failure verified via: npx vitest run <path>]
```

### Phase 2: Isolate

Narrow down the source and extract immutable fixture data:

```markdown
## Isolation Questions
- When did this start happening?
- What changed recently?
- Is there a desynchronization between Showdown and UI state?
- Are choices, stat stages, or volatiles diverging?
- Can we reproduce with static inlined inputs without live fuzzer dependencies?
```

### Phase 3: Understand (Tier 2 Integrity Analysis)

Find the root cause, not just symptoms. Check cross-boundary contracts and schema integrity:
- Audit relevant DOX contracts (`AGENTS.md`).
- **MANDATORY PRE-FIX FALLBACK AUDIT**: Eliminate masking fallbacks (`||`, `??`, default assignments) hiding the real root cause so the system fails loudly.
- Verify FSM state flow and DBRouter persistence roundtrips.

```markdown
## Root Cause Analysis
### The 5 Whys
1. Why: [First observation]
2. Why: [Deeper reason]
3. Why: [Still deeper]
4. Why: [Getting closer]
5. Why: [Root cause in src/ logic]
```

### Phase 4: Fix & Verify (Full 3-Tier Cycle)

Apply clean fix at the upstream origin in `src/` and verify all tiers sequentially:
1. **Tier 1 Pass**: Re-run isolated unit test -> confirm it turns **GREEN**.
2. **Tier 2 Pass**: Run Node integration/integrity suite (`npx vitest run tests/node/` or `npm run test`) -> 0 regressions.
3. **Tier 3 Pass**: Re-run the affected Playwright E2E simulation following `@/game-simulation` protocols:
   - Passive joystick law (reacts ONLY to typed public events `battle-ready-for-input`, `battle-forced-switch-required`).
   - 100% ID-based locators (`#<id>`) and UID data attributes.
   - Strict 5s per-action timeout limit (`MAX_PER_ACTION_TIMEOUT_MS = 5000`).
   - Zero artificial timers and zero retry loops.
   - Replay certified case through `ShowdownBattleRunner`.
4. **Master Regression Pass**: Execute full master suite (`npm run sim:e2e`).

---

## Debugging Checklist

```markdown
## Before Starting Fix
- [ ] Isolated unit test written in tests/node/ or tests/unit/
- [ ] Static fixture inlined (no dynamic fuzzer query)
- [ ] Deterministic RED failure verified in Vitest
- [ ] Pre-fix fallback audit completed (no masking fallbacks)

## During Investigation
- [ ] Root cause identified in src/ (not patched with fallbacks)
- [ ] Architectural contracts in AGENTS.md respected
- [ ] Domain-Type-First compliance checked

## After Fix
- [ ] Tier 1 Unit Test turns GREEN
- [ ] Tier 2 Node integration suite passes with 0 regressions (npm run test)
- [ ] Tier 3 Playwright E2E simulation passes following /game-simulation
- [ ] Master regression pass (npm run sim:e2e) clean
- [ ] Fast lint passes (npm run lint)
```

---

## Anti-Patterns (AVOID)

| Anti-Pattern | Why |
| :--- | :--- |
| **Random changes / Guessing** | Leads to unpredictable states ("Maybe if I change this..."). |
| **Hasty fallbacks (`\|\|`, `??`, dummy defaults)** | Masks upstream bugs and corrupts simulation determinism. All missing data MUST fail fast. |
| **Inflating Playwright timeouts** | A timeout at 5s is ALWAYS a structural bug in `src/`, never a time shortage. |
| **Modifying `src/` before RED test** | Prevents proving the bug existed and prevents regression verification. |
| **Dynamic fuzzer ID lookups in tests** | Regenerating the fuzzer creates new IDs, breaking dynamic unit tests. Inline static fixtures! |
| **Fixing code but testing via HMR proxy** | When a Pinia store registers actions at startup (e.g., `window.__VITE_DEBUG__`), HMR reloads the module but the store's registered closures are NOT refreshed. Solution: do a full page refresh. |
| **Modifying working animations without isolation** | When a bug is in FSM flow or async sequencing, avoid rewriting state assignments feeding active GSAP animations without isolating the broken flow first. |
