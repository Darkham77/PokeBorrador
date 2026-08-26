# Simulation Run — 2026-08-26
Session: 51a76d

## Scope
Verificación completa del pipeline de simulaciones Playwright E2E siguiendo estrictamente el protocolo de `@/game-simulation`:
- 19 Suites de simulación (438 tests).
- Fuzzer y Replayers de combate.

## Status
Overall: IN_PROGRESS
Last action: Suite 19/19 (battle_fsm_sync.simulation.ts) en ejecución limpia completa (227 casos).

## Dynamic Simulation Table (Generated via `npm run sim:e2e:table`)

| # | Suite / Archivo de Simulación | Casos / Elementos | Comando de Ejecución Directa | Estado |
|:---|:---|:---|:---|:---|
| **0** | `scripts/e2e/fuzzer/runners/run_all_fuzzers.ts` | **962 elementos** / 393 batallas | `npm run sim:fuzzer` | 🟢 **100% PASS** |
| **1** | `scripts/e2e/battle/debug_ash_save.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/battle/debug_ash_save.simulation.ts` | 🟢 **PASS** (16.7s) |
| **2** | `scripts/e2e/battle/search_loop_sequential.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/battle/search_loop_sequential.simulation.ts` | 🟢 **PASS** (52.3s) |
| **3** | `scripts/e2e/breeding/breeding_lifecycle.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/breeding/breeding_lifecycle.simulation.ts` | 🟢 **PASS** (23.2s) |
| **4** | `scripts/e2e/events/fishing_event_experience.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/events/fishing_event_experience.simulation.ts` | 🟢 **PASS** (17.1s) |
| **5** | `scripts/e2e/gts/gts_transactions.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/gts/gts_transactions.simulation.ts` | 🟢 **PASS** (24.7s) |
| **6** | `scripts/e2e/gyms/gym_progression.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/gyms/gym_progression.simulation.ts` | 🟢 **PASS** (20.3s) |
| **7** | `scripts/e2e/missions/daycare_missions.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/missions/daycare_missions.simulation.ts` | 🟢 **PASS** (15.6s) |
| **8** | `scripts/e2e/battle/battle_weather_effects.simulation.ts` | **2** tests | `npx playwright test scripts/e2e/battle/battle_weather_effects.simulation.ts` | 🟢 **PASS** (18.6s) |
| **9** | `scripts/e2e/events/magikarp_contest_multiusers.simulation.ts` | **2** tests | `npx playwright test scripts/e2e/events/magikarp_contest_multiusers.simulation.ts` | 🟢 **PASS** (37.4s) |
| **10** | `scripts/e2e/save/save_shield_restrictions.simulation.ts` | **2** tests | `npx playwright test scripts/e2e/save/save_shield_restrictions.simulation.ts` | 🟢 **PASS** (15.8s) |
| **11** | `scripts/e2e/battle/battle_healing_regression.simulation.ts` | **3** tests | `npx playwright test scripts/e2e/battle/battle_healing_regression.simulation.ts` | 🟢 **PASS** (19.4s) |
| **12** | `scripts/e2e/battle/battle_manual_scenarios.simulation.ts` | **3** tests | `npx playwright test scripts/e2e/battle/battle_manual_scenarios.simulation.ts` | 🟢 **PASS** (27.2s) |
| **13** | `scripts/e2e/battle/battle_capture.simulation.ts` | **4** tests | `npx playwright test scripts/e2e/battle/battle_capture.simulation.ts` | 🟢 **PASS** (24.6s) |
| **14** | `scripts/e2e/battle/debug_creator.simulation.ts` | **4** tests | `npx playwright test scripts/e2e/battle/debug_creator.simulation.ts` | 🟢 **PASS** (20.6s) |
| **15** | `scripts/e2e/gts/illegal_pokemon_security.simulation.ts` | **4** tests | `npx playwright test scripts/e2e/gts/illegal_pokemon_security.simulation.ts` | 🟢 **PASS** (19.3s) |
| **16** | `scripts/e2e/battle/battle_anti_cheat_refresh.simulation.ts` | **5** tests | `npx playwright test scripts/e2e/battle/battle_anti_cheat_refresh.simulation.ts` | 🟢 **PASS** (94.0s) |
| **17** | `scripts/e2e/battle/heuristic_ai.simulation.ts` | **6** tests | `npx playwright test scripts/e2e/battle/heuristic_ai.simulation.ts` | 🟢 **PASS** (55.4s) |
| **18** | `scripts/e2e/battle/battle_held_items.simulation.ts` | **169** tests | `npx playwright test scripts/e2e/battle/battle_held_items.simulation.ts` | 🟢 **PASS** (674.1s) |
| **19** | `scripts/e2e/battle/battle_fsm_sync.simulation.ts` | **227** tests | `npx playwright test scripts/e2e/battle/battle_fsm_sync.simulation.ts` | ⏳ **EN EJECUCIÓN AISLADA (Paso 6)** |
| **Final** | `scripts/e2e/run_sequential_simulations.ts` | **438 tests totales** en 19 suites | `npm run sim:e2e` | ⏳ Pendiente tras Suite 19 |

## Applied Code Fixes & Structural Refactors (Commit Ledger)
| ID | Area / Component | Root Cause / Issue | Fix Applied | Files Touched |
|---|---|---|---|---|
| FIX-01 | Battle Rewards | Combat log did not state extra EXP from active events | Added (+XX EXP evento) parenthetical breakdown in battle rewards logging | src/logic/battle/rewardsDistributor.ts |
| FIX-02 | SQLite RPC Emulation | Missing RPC emulation for automated event awarding and award claims in offline mode | Created eventRpc.ts with fn_award_event_automated and claim_award emulations | src/logic/db/rpcEmulations/eventRpc.ts, src/logic/db/sqliteRpcEmulation.ts |
| FIX-03 | Events Store | claimAward only updated database state without fulfilling resource payloads to gameStore | Implemented reward parsing and crediting to player balance/inventory/team | src/stores/events.ts |
| FIX-04 | UI Testability | Missing explicit ID attributes on claim buttons in WorldEventsModal and PastEventCard | Added deterministic IDs for Playwright selection | src/components/modals/WorldEventsModal.vue, src/components/modals/PastEventCard.vue |
| FIX-05 | Time Sync & Stores | Circular dependency between dbRouter and timeUtils / stores.ts | Extracted timeSync.ts and made stores.ts 100% type-only | src/logic/auth/timeSync.ts, src/logic/utils/timeUtils.ts, src/types/system/stores.ts |
| FIX-06 | Dead Code | Obsolete dual-engine moveExecutor and switchActions files | Removed legacy dead code | src/logic/battle/actions/moveExecutor.ts, src/logic/battle/actions/switchActions.ts |
| FIX-07 | Auditor Rules | Fallow circular deps, dead files, stale suppressions were warnings | Mapped to hard error severity with dedicated categories | scripts/maintenance/audit_project.ts, scripts/maintenance/audit_full.ts |
| FIX-08 | Replay Cursor | History index boundary error when battle finishes on last step (100/100) | Added `if (workerEnded \|\| historyIndex >= history.length) return null` and set `certifiedReplayWorkerEnded = true` | src/logic/battle/helpers/showdownBattleRunner.ts |
| FIX-09 | Move Choice Normalization | Replay engine chose disabled / 0 PP moves instead of valid slots | Extracted modular `showdownMoveChoiceHelper.ts` with `resolveValidMoveChoice` and `getFirstValidMoveSlot` + 17 unit tests | src/logic/battle/helpers/showdownMoveChoiceHelper.ts, src/logic/battle/engine/showdownBattleEngine.ts, tests/node/system/showdown_move_choice_helper.test.ts |
| FIX-10 | Enemy Replacement Fallback | If enemy Pokémon fainted earlier than in recorded history, fallback to live bench mon did not trigger when targetChoice was empty | Ensured `nextEnemy` fallback runs unconditionally if `hasLiveEnemy` is true | src/logic/battle/battleFaintSequence.ts |
| FIX-11 | Player Replay Switch Fallback | When in SWITCH_MENU, if history did not record a switch action, selecting playerSwitchSlots[0] picked fainted slot | Delegated to `getHealthyBenchUid()` to switch in a valid live bench Pokémon | scripts/e2e/base_battle_simulation.ts |
| FIX-12 | Protocol Hard Gates | Lack of pre-condition gates allowed skipping Node unit tests before Playwright runs | Added 4 inviolable Hard Gates and bilingual triggers to `@/game-simulation` | .agents/skills/game-simulation/SKILL.md |
