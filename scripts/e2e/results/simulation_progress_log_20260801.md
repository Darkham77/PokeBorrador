# Simulation Run — 2026-08-01
Session: bbe460db

## Scope
Full game simulation pipeline starting from fuzzer case regeneration (`sim:fuzzer`), through E2E battle FSM sync (`sim:e2e:combat`), AI, gyms, GTS, breeding, daycare missions, save shield, and full regression pass.

## Status
Overall: IN_PROGRESS
Last action: Completed `sim:fuzzer` suite with 100% PASS across all 4 fuzzers. Certified cases saved to `scripts/e2e/results/fuzzer_certified_cases.json`.
Resumed at: `sim:e2e:combat` (pending for next session)

## Simulation Queue
- [x] sim:fuzzer (fuzzer cases regeneration) — COMPLETE (29/29 batches, 80 abilities, 39 items, 86 scenarios)
- [ ] sim:e2e:combat (battle FSM sync & manual scenarios) — PENDING (NEXT)
- [ ] sim:e2e:ai (heuristic AI simulation) — PENDING
- [ ] sim:e2e:gyms (gym progression) — PENDING
- [ ] sim:e2e:gts (GTS transactions) — PENDING
- [ ] sim:e2e:breeding (breeding lifecycle) — PENDING
- [ ] sim:e2e:missions (daycare missions) — PENDING
- [ ] sim:e2e:save (save shield restrictions) — PENDING
- [ ] sim:e2e (full E2E cross-domain regression pass) — PENDING

## Active Fix — sim:fuzzer (Resolved)
Root cause: 
1. `cheats.ts`: Destructive mutation `delete side.activeRequest.forceSwitch` stripped `forceSwitch` from Showdown's live request.
2. `showdownBattleEngine.ts`: IPB healing on `force-switch` turns restored HP to 100% before switch selection, canceling Showdown's forced-switch requirement.
3. `fuzzer_agent.ts`: Re-attempting rejected voluntary switches in a loop until PP exhaustion. Added `failedSwitches` set and fallback loop over `move 1..4`.

Files touched:
- `src/logic/battle/cheats.ts`
- `src/logic/battle/engine/showdownBattleEngine.ts`
- `src/logic/battle/showdownBridgeField.ts`
- `scripts/e2e/fuzzer/core/fuzzer_agent.ts`
- `scripts/e2e/fuzzer/core/fuzzer_engine.ts`

Status: PASS (0 crashes, 0 stalls, 100% certified)

## Completed Fixes
| Simulation | Root Cause | Fix Applied | Attempts | Result |
|---|---|---|---|---|
| fuzzer_worker_serialization.test.ts | Missing worker batch return data | Object.assign(batches[i + idx], res.batch) + Node unit test | 1 | PASS |
| fuzzer_engine.ts | Undeclared batchRecord variable | Replaced with batchRec | 1 | PASS |
| e2e_helpers.ts | Missing substate in isBattleOver | Included `SWITCH_MENU` in endingSubStates | 1 | PASS |
| showdownWorkerClient.ts / showdown.worker.ts | Web Worker cheat transmission | Filter cheats by turnCount in EXECUTE_TURN + dynamic BattleCheatManager | 2 | PASS |
| e2e_helpers.ts | Client poke matching by name prefix | Extended checkFinalStateVerification lookup to match p.name | 1 | PASS |
| showdownBridgeField.ts | `typechange` log line metadata tag `[...]` | Added `!newType.startsWith('[')` guard in typechange handler | 1 | PASS |
| cheats.ts | Destructive `delete side.activeRequest.forceSwitch` | Removed destructive deletion from `applyHealCheatToSide` | 1 | PASS |
| fuzzer_agent.ts | Switch loop & move-lock trapping | Added `cannotSwitch` guard, excluded self-switching moves from fallback, added `failedSwitches` set | 2 | PASS |
| showdownBattleEngine.ts | IPB heal cancellation of forced switch | Suppressed IPB heal on `force-switch` turns and wrapped `battle.choose` in try-catch fallback loop | 2 | PASS |

## Pending Simulations
- `sim:e2e:combat` (battle_fsm_sync.sim.ts, battle_held_items.sim.ts, etc.)
- `sim:e2e:ai`
- `sim:e2e:gyms`
- `sim:e2e:gts`
- `sim:e2e:breeding`
- `sim:e2e:missions`
- `sim:e2e:save`
- `sim:e2e`

## Critical Decisions
- **Absolute Single-Path Execution**: `ShowdownBattleEngine` is the single source of truth for battle state transitions.
- **Force-Switch Protection**: IPB healing is strictly suppressed when any side has a pending `force-switch` request, ensuring forced-switch mechanics (e.g. `Shed Tail`, fainted mons) complete naturally before restoring HP.
- **Failed Switch Re-routing**: When Showdown rejects a voluntary switch command, `BattleAgent` records the rejected index in `failedSwitches` so it skips that candidate on subsequent turns, preventing infinite PP exhaustion loops.

## Coverage Gaps Detected
- None in fuzzer level (0 untested moves, 0 untested abilities, 0 untested items).
