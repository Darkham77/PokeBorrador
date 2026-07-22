# Simulation Report — 2026-07-22

## Summary
- **Total Tests**: Full E2E Combat Suite
- **Status**: ALL PASS (0 failures)

## Failures Fixed
| Simulation | Root Cause | Fix Applied in src/ | Attempts |
|---|---|---|---|
| `battle_fsm_sync` | Instant enemy sprite swap on switch log | Condition active enemy assignment in `showdownBridgeMisc.ts` on `!isFsmAnimActive` | 1 |
| `e2e_helpers` | Playwright login click timeout | Add `domcontentloaded` wait and resilient click in `e2e_helpers.ts` | 1 |

## Fuzzer Coverage & Parity Verification
- **IA vs IA Battles**: 100/100 battles passed naturally
- **Playwright Browser E2E**: Verified multi-turn combat, faint animations, and recall sequences with 100x GSAP speed.
