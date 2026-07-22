# Simulation Run Report — 2026-07-21

## Summary
- **Total E2E Suites Executed**: 7 Domains
- **Total Tests Passed**: 46 / 46 (100% PASS)
- **Total Unit & Integration Tests Passed**: 3,363 / 3,363 (100% PASS)
- **Overall Status**: COMPLETE (Zero Failures, Zero Regressions)

## Failures Fixed during Run
| Simulation | Root Cause | Fix Applied in `src/` or Test Script | Attempts | Result |
|---|---|---|---|---|
| `gts_transactions` | 11th publication attempt re-used detached `.list-item` DOM handle. | Re-instantiated locator `pageSeller.locator('.selection-list .list-item').first()` and synchronized `!store.isProcessing` with strict <= 5s timeout. | 2 | PASS |
| `debug_creator` | `openDebugTab` attempted to click `.trigger-btn` when Admin Debug Panel was already open. | Updated `openDebugTab` in `debug_creator.simulation.ts` to check `page.locator('.debug-nav').isVisible()` before clicking trigger button. | 1 | PASS |
| `e2e_helpers` | `loginTestUser` clicked `Local` tab before Vue login view mounted. | Added explicit `.waitFor({ state: 'visible', timeout: 5000 })` on `localTab`, `userInput`, and `jugarBtn`. | 1 | PASS |
| `heuristic_ai` | `checkBattleOver` only checked `state.over` instead of evaluating FSM `REWARDS_PHASE` and `EXIT_BATTLE` states; move card locator handle was static outside loop. | Updated `checkBattleOver` to evaluate `store.currentFsmState`, re-evaluated `moveBtn` locator inside loop, and placed `waitForWaitInput` before `checkBattleOver`. | 3 | PASS |
| `BattleQuickBag.vue` | Spanish string check `'revivir'` violated immutable English ID rule. | Refactored `BattleQuickBag.vue` to use strict `dbItem.id.toLowerCase().includes('revive')`. | 1 | PASS |
| `base_battle_simulation.ts` | `voluntarySwitch` attempted switch when requested UID was already active on field. | Added guard check `activeUid === pokemonUid` in `voluntarySwitch`. | 1 | PASS |

## Domain Results Breakdown
- **Gym Progression** (`sim:e2e:gyms`): 1/1 PASS (23.5s)
- **Breeding Lifecycle** (`sim:e2e:breeding`): 1/1 PASS (23.1s)
- **GTS Transactions** (`sim:e2e:gts`): 1/1 PASS (29.1s)
- **Daycare Missions** (`sim:e2e:missions`): 1/1 PASS (22.7s)
- **Save Shield Security** (`sim:e2e:save`): 2/2 PASS (21.9s)
- **Heuristic AI** (`sim:e2e:ai`): 6/6 PASS (38.9s)
- **Fuzzer Combat & GSAP Sync** (`sim:e2e:combat`): 30/30 PASS (2.8m)
- **Admin Debug Tools** (`debug_creator`): 4/4 PASS (26.4s)
- **Battle Healing Regression** (`battle_healing_regression`): 3/3 PASS (18.2s)

## Regressions Detected
- None. All 46 tests across all 7 domain suites pass 100% with zero failures.

## Critical Architectural Principles Enforced
1. **Zero Timeout Inflation**: All timeouts strictly enforced at `<= 5000ms`.
2. **Event-Driven Architecture**: State synchronization driven strictly by reactive store flags and `battle-ready-for-input` custom events.
3. **Immutable English IDs**: Elimination of all Spanish translated string comparisons in application logic.
4. **Strict Sequential Protocol**: Sequential execution across all domain test suites avoiding CPU saturation and race conditions.
