# Simulation Run — 2026-07-31
Session: bbe460db

## Scope
Full game simulation pipeline starting from fuzzer case regeneration, through E2E battle FSM sync, AI, gyms, GTS, breeding, daycare missions, save shield, and full regression pass.

## Status
Overall: IN_PROGRESS
Last action: Regenerating fuzzer_certified_cases.json with 100% native executeBattleTurn IPB healing encapsulation.

## Simulation Queue
- [/] sim:fuzzer (fuzzer cases regeneration) — IN_PROGRESS (task-5245)
- [ ] sim:e2e:combat (battle FSM sync & manual scenarios) — PENDING
- [ ] sim:e2e:ai (heuristic AI simulation) — PENDING
- [ ] sim:e2e:gyms (gym progression) — PENDING
- [ ] sim:e2e:gts (GTS transactions) — PENDING
- [ ] sim:e2e:breeding (breeding lifecycle) — PENDING
- [ ] sim:e2e:missions (daycare missions) — PENDING
- [ ] sim:e2e:save (save shield restrictions) — PENDING
- [ ] sim:e2e (full E2E cross-domain regression pass) — PENDING

## Active Fix — sim:fuzzer
Root cause: Mandatory 100% Shared Code Mandate (`AGENTS.md` Section 6): IPB healing logic must NOT exist outside `executeBattleTurn`. It was refactored natively inside `src/logic/battle/helpers/showdownExecutor.ts`.
Files touched: src/logic/battle/helpers/showdownExecutor.ts, scripts/e2e/fuzzer/core/fuzzer_engine.ts, src/logic/battle/cheats.ts
Attempts: 9
Status: IN_PROGRESS

## Completed Fixes
| Simulation | Root Cause | Fix Applied | Attempts | Result |
|---|---|---|---|---|
| fuzzer_worker_serialization.test.ts | Missing worker batch return data | Object.assign(batches[i + idx], res.batch) + Node unit test | 1 | PASS |
| fuzzer_engine.ts | Undeclared batchRecord variable | Replaced with batchRec | 1 | PASS |
| e2e_helpers.ts | Missing substate in isBattleOver | Included `SWITCH_MENU` in endingSubStates | 1 | PASS |
| showdownWorkerClient.ts / showdown.worker.ts | Web Worker cheat transmission | Filter cheats by turnCount in EXECUTE_TURN + dynamic BattleCheatManager | 2 | PASS |
| e2e_helpers.ts | Client poke matching by name prefix | Extended checkFinalStateVerification lookup to match p.name | 1 | PASS |
| showdownExecutor.ts | External duplicate IPB heal block in fuzzer_engine | Encapsulated `processIPBHeals` natively inside `executeBattleTurn` | 1 | APPLIED |

## Pending Simulations
- sim:e2e:combat
- sim:e2e:ai
- sim:e2e:gyms
- sim:e2e:gts
- sim:e2e:breeding
- sim:e2e:missions
- sim:e2e:save
- sim:e2e

## Critical Decisions
- Absolute Single-Path Execution: `executeBattleTurn` (`showdownExecutor.ts`) is now the **only place in the entire codebase** where turn choices, weather, pre/post-turn cheats, and IPB healing are executed. `fuzzer_engine.ts` has 0 lines of custom turn or cheat code.
