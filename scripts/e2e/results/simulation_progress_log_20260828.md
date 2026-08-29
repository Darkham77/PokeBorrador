# Simulation Run — 2026-08-28
Session: sim-master-replay-01

## Scope
Full game-simulation pipeline execution verifying Move ID-First deterministic selection, PP tracking, animation lifecycle chaining, and 33 simulation suites under hybrid retro-modern FSM governance.

## Status
Overall: IN_PROGRESS
Last action: Added unit tests and updated Mermaid FSM state machine diagrams for switch-in lethal hazards.
Resumed at: Step 6 (Re-running batch 13 / battle_fsm_sync)

## Dynamic Simulation Table (Generated via `npm run sim:e2e:table`)

| # | Suite / Archivo de Simulación | Casos / Elementos | Comando de Ejecución Directa | Estado |
|:---|:---|:---|:---|:---|
| **0** | `scripts/e2e/fuzzer/runners/run_all_fuzzers.ts` | **962 elementos** / 393 batallas | `npm run sim:fuzzer` | 🟢 **100% PASS** |
| **1** | `scripts/e2e/abilities/field_abilities_daycare.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/abilities/field_abilities_daycare.simulation.ts` | 🟢 **100% PASS** |
| **2** | `scripts/e2e/abilities/field_abilities_rewards.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/abilities/field_abilities_rewards.simulation.ts` | 🟢 **100% PASS** |
| **3** | `scripts/e2e/battle/battle_capture_reload_persistence.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/battle/battle_capture_reload_persistence.simulation.ts` | 🟢 **100% PASS** |
| **4** | `scripts/e2e/battle/battle_faint_switch_animation_sync.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/battle/battle_faint_switch_animation_sync.simulation.ts` | 🟢 **100% PASS** |
| **5** | `scripts/e2e/battle/battle_pivot_and_phazing_mechanics.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/battle/battle_pivot_and_phazing_mechanics.simulation.ts` | 🟢 **100% PASS** |
| **6** | `scripts/e2e/battle/debug_ash_save.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/battle/debug_ash_save.simulation.ts` | 🟢 **100% PASS** |
| **7** | `scripts/e2e/battle/search_loop_sequential.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/battle/search_loop_sequential.simulation.ts` | 🟢 **100% PASS** |
| **8** | `scripts/e2e/breeding/breeding_lifecycle.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/breeding/breeding_lifecycle.simulation.ts` | 🟢 **100% PASS** |
| **9** | `scripts/e2e/events/fishing_event_experience.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/events/fishing_event_experience.simulation.ts` | 🟢 **100% PASS** |
| **10** | `scripts/e2e/events/multi_species_competition.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/events/multi_species_competition.simulation.ts` | 🟢 **100% PASS** |
| **11** | `scripts/e2e/gts/gts_transactions.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/gts/gts_transactions.simulation.ts` | 🟢 **100% PASS** |
| **12** | `scripts/e2e/gyms/gym_progression.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/gyms/gym_progression.simulation.ts` | 🟢 **100% PASS** |
| **13** | `scripts/e2e/missions/daycare_missions.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/missions/daycare_missions.simulation.ts` | 🟢 **100% PASS** |
| **14** | `scripts/e2e/abilities/field_abilities_attraction.simulation.ts` | **2** tests | `npx playwright test scripts/e2e/abilities/field_abilities_attraction.simulation.ts` | 🟢 **100% PASS** |
| **15** | `scripts/e2e/abilities/field_abilities_fishing_levels.simulation.ts` | **2** tests | `npx playwright test scripts/e2e/abilities/field_abilities_fishing_levels.simulation.ts` | 🟢 **100% PASS** |
| **16** | `scripts/e2e/abilities/field_abilities_spawns_weather.simulation.ts` | **2** tests | `npx playwright test scripts/e2e/abilities/field_abilities_spawns_weather.simulation.ts` | 🟢 **100% PASS** |
| **17** | `scripts/e2e/battle/battle_catch_breakout_and_whiteout.simulation.ts` | **2** tests | `npx playwright test scripts/e2e/battle/battle_catch_breakout_and_whiteout.simulation.ts` | 🟢 **100% PASS** |
| **18** | `scripts/e2e/battle/battle_forced_switch_ui.simulation.ts` | **2** tests | `npx playwright test scripts/e2e/battle/battle_forced_switch_ui.simulation.ts` | 🟢 **100% PASS** |
| **19** | `scripts/e2e/battle/battle_weather_effects.simulation.ts` | **2** tests | `npx playwright test scripts/e2e/battle/battle_weather_effects.simulation.ts` | 🟢 **100% PASS** |
| **20** | `scripts/e2e/battle/battle_wild_encounter_jump.simulation.ts` | **2** tests | `npx playwright test scripts/e2e/battle/battle_wild_encounter_jump.simulation.ts` | 🟢 **100% PASS** |
| **21** | `scripts/e2e/events/magikarp_contest_multiusers.simulation.ts` | **2** tests | `npx playwright test scripts/e2e/events/magikarp_contest_multiusers.simulation.ts` | 🟢 **100% PASS** |
| **22** | `scripts/e2e/save/save_shield_restrictions.simulation.ts` | **2** tests | `npx playwright test scripts/e2e/save/save_shield_restrictions.simulation.ts` | 🟢 **100% PASS** |
| **23** | `scripts/e2e/abilities/field_abilities_capture.simulation.ts` | **3** tests | `npx playwright test scripts/e2e/abilities/field_abilities_capture.simulation.ts` | 🟢 **100% PASS** |
| **24** | `scripts/e2e/battle/battle_flee_and_teleport.simulation.ts` | **3** tests | `npx playwright test scripts/e2e/battle/battle_flee_and_teleport.simulation.ts` | 🟢 **100% PASS** |
| **25** | `scripts/e2e/battle/battle_healing_regression.simulation.ts` | **3** tests | `npx playwright test scripts/e2e/battle/battle_healing_regression.simulation.ts` | 🟢 **100% PASS** |
| **26** | `scripts/e2e/battle/battle_manual_scenarios.simulation.ts` | **3** tests | `npx playwright test scripts/e2e/battle/battle_manual_scenarios.simulation.ts` | 🟢 **100% PASS** |
| **27** | `scripts/e2e/battle/battle_capture.simulation.ts` | **4** tests | `npx playwright test scripts/e2e/battle/battle_capture.simulation.ts` | 🟢 **100% PASS** |
| **28** | `scripts/e2e/battle/debug_creator.simulation.ts` | **4** tests | `npx playwright test scripts/e2e/battle/debug_creator.simulation.ts` | 🟢 **100% PASS** |
| **29** | `scripts/e2e/gts/illegal_pokemon_security.simulation.ts` | **4** tests | `npx playwright test scripts/e2e/gts/illegal_pokemon_security.simulation.ts` | 🟢 **100% PASS** |
| **30** | `scripts/e2e/battle/battle_anti_cheat_refresh.simulation.ts` | **5** tests | `npx playwright test scripts/e2e/battle/battle_anti_cheat_refresh.simulation.ts` | 🟢 **100% PASS** |
| **31** | `scripts/e2e/battle/heuristic_ai.simulation.ts` | **6** tests | `npx playwright test scripts/e2e/battle/heuristic_ai.simulation.ts` | 🟢 **100% PASS** |
| **32** | `scripts/e2e/battle/battle_held_items.simulation.ts` | **169** tests | `npx playwright test scripts/e2e/battle/battle_held_items.simulation.ts` | 🟢 **100% PASS** |
| **33** | `scripts/e2e/battle/battle_fsm_sync.simulation.ts` | **227** tests | `npx playwright test scripts/e2e/battle/battle_fsm_sync.simulation.ts` | 🔄 **EN EJECUCIÓN** |
| **Final** | `scripts/e2e/run_sequential_simulations.ts` | **462 tests totales** en 33 suites | `npm run sim:e2e` | ⏳ Pendiente tras validación individual |

## Applied Code Fixes & Structural Refactors (Commit Ledger)
| ID | Area / Component | Root Cause / Issue | Fix Applied | Files Touched |
|---|---|---|---|---|
| FIX-01..FIX-40 | Core / Battle Engine | Battle FSM sync, forced switch recovery, worker memory, PP parity | Consolidated legacy fixes | Multiple files |
| FIX-41 | Replayer / Fuzzer | `p1MoveId` matching & `p1MovePp` / `p2MovePp` recording | Move ID-first resolution in `replayCertifiedBattle` | `base_battle_simulation.ts`, `fuzzer_engine.ts`, `fuzzer_team_generator.ts`, `certifiedBattleCase.ts`, `showdownBattleRunner.ts` |
| FIX-42 | Replayer / voluntarySwitch | Trapped check fallback executing arbitrary `selectMove(0)` | Cleaned up `voluntarySwitch` to delegate to `battleStore.executeSwitch` without speculative fallbacks | `base_battle_simulation.ts` |
| FIX-43 | Simulation Config | Parameter-based suite timeout configuration for batches | Added `getSuiteTimeoutForBatch(turnCount)` defaulting to `MAX_SUITE_TOTAL_TIMEOUT_MS` when no turns exist | `simulation_config.ts`, `battle_fsm_sync.simulation.ts` |
| FIX-44 | Replayer / Pass Choice | Un-armed `awaitBattleReadyForInput` during enemy faint replacement pass | Removed redundant event await on empty P1 choices since `processEnemyFaintSequence` already completes and emits ready event | `base_battle_simulation.ts` |
| FIX-45 | Battle FSM / switchAction | FSM clobbered to `WAIT_INPUT` and `isBattleSwitchForced` reset when entering Pokémon faints from hazards | Guarded post-switch transition with `if (newPoke.hp > 0 && !activeBattle.over)` so fainted entry Pokémon preserve `SWITCH_MENU` | `src/logic/battle/actions/switchAction.ts`, `tests/node/battle/switch_in_fatal_hazard_fsm.test.ts` |
| FIX-46 | Standards & Manuals | Missing Mermaid FSM transition nodes and rules for entry hazard faint | Added `EVAL_HP` and `PLAYER_FAINT_SEQ` transitions and documented Post-Switch FSM Transition Guard rule | `.agents/skills/project-standards/references/battle/battle_mechanics_manual.md` |
