# Poké Vicio - Master E2E Simulation Certification Progress (From Scratch)

## Scope
Full execution from scratch of all 44 E2E simulation suites in Dual Driver Mode (`driver=dual clean`), certifying 100% behavioral parity between SQLite and PostgreSQL, zero cross-batch contamination under the Worker-Scoped Page Pool and 7-Pillar Atomic Reset, Showdown locked move normalization, and inclusion of newly added suites (`battle_party_rewards_exp_ev.simulation.ts`).

## Status
- **Overall**: 🟡 IN PROGRESS - Starting Suite 1/44 from scratch
- **Session**: 20260904-run2
- **Certification Date**: September 4, 2026
- **Total Registered Suites**: 44 suites (482 tests totales) + Suite 0 (Fuzzer Certification: 962 elementos)
- **Current Cursor**: Suite 1/44 (`scripts/e2e/abilities/field_abilities_daycare.simulation.ts`)
- **Execution Mode**: `npm run sim:e2e driver=dual clean`

## Dynamic Simulation Table (Generated via `npm run sim:e2e:table`)

| # | Suite / Archivo de Simulación | Casos / Elementos | Driver SQLite | Driver PostgreSQL | Estado |
|:---|:---|:---|:---|:---|:---|
| **0** | `scripts/e2e/fuzzer/runners/run_all_fuzzers.ts` | **962 elementos** / 393 batallas | 🟢 **100% PASS** | 🟢 **100% PASS** | 🟢 **100% PASS** |
| **1** | `scripts/e2e/abilities/field_abilities_daycare.simulation.ts` | **1** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **2** | `scripts/e2e/abilities/field_abilities_rewards.simulation.ts` | **1** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **3** | `scripts/e2e/battle/battle_capture_reload_persistence.simulation.ts` | **1** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **4** | `scripts/e2e/battle/battle_faint_switch_animation_sync.simulation.ts` | **1** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **5** | `scripts/e2e/battle/battle_pivot_and_phazing_mechanics.simulation.ts` | **1** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **6** | `scripts/e2e/battle/debug_ash_save.simulation.ts` | **1** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **7** | `scripts/e2e/battle/rocket_police_criminality.simulation.ts` | **1** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **8** | `scripts/e2e/breeding/breeding_lifecycle.simulation.ts` | **1** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **9** | `scripts/e2e/events/event_awards_gui_lifecycle.simulation.ts` | **1** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **10** | `scripts/e2e/events/event_home_section_and_schedule.simulation.ts` | **1** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **11** | `scripts/e2e/events/event_slot_management.simulation.ts` | **1** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **12** | `scripts/e2e/events/event_subcompetition_filters.simulation.ts` | **1** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **13** | `scripts/e2e/events/fishing_event_experience.simulation.ts` | **1** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **14** | `scripts/e2e/events/magikarp_contest_multiusers.simulation.ts` | **1** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **15** | `scripts/e2e/events/multi_species_competition.simulation.ts` | **1** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **16** | `scripts/e2e/events/saturday_global_contest_and_tiebreaks.simulation.ts` | **1** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **17** | `scripts/e2e/gts/gts_transactions.simulation.ts` | **1** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **18** | `scripts/e2e/gyms/gym_progression.simulation.ts` | **1** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **19** | `scripts/e2e/items/item_families_lifecycle.simulation.ts` | **1** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **20** | `scripts/e2e/missions/daycare_missions.simulation.ts` | **1** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **21** | `scripts/e2e/pokemon/pokemon_friendship_ui.simulation.ts` | **1** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **22** | `scripts/e2e/abilities/field_abilities_attraction.simulation.ts` | **2** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **23** | `scripts/e2e/abilities/field_abilities_fishing_levels.simulation.ts` | **2** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **24** | `scripts/e2e/abilities/field_abilities_spawns_weather.simulation.ts` | **2** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **25** | `scripts/e2e/battle/battle_catch_breakout_and_whiteout.simulation.ts` | **2** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **26** | `scripts/e2e/battle/battle_forced_switch_ui.simulation.ts` | **2** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **27** | `scripts/e2e/battle/battle_party_rewards_exp_ev.simulation.ts` | **2** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **28** | `scripts/e2e/battle/battle_weather_effects.simulation.ts` | **2** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **29** | `scripts/e2e/battle/battle_wild_encounter_jump.simulation.ts` | **2** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **30** | `scripts/e2e/battle/search_loop_sequential.simulation.ts` | **2** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **31** | `scripts/e2e/save/save_shield_restrictions.simulation.ts` | **2** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **32** | `scripts/e2e/abilities/field_abilities_capture.simulation.ts` | **3** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **33** | `scripts/e2e/battle/battle_flee_and_teleport.simulation.ts` | **3** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **34** | `scripts/e2e/battle/battle_healing_regression.simulation.ts` | **3** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **35** | `scripts/e2e/battle/battle_manual_scenarios.simulation.ts` | **3** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **36** | `scripts/e2e/battle/battle_capture.simulation.ts` | **4** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **37** | `scripts/e2e/battle/debug_creator.simulation.ts` | **4** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **38** | `scripts/e2e/gts/illegal_pokemon_security.simulation.ts` | **4** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **39** | `scripts/e2e/save/loading_gate_and_reload.simulation.ts` | **4** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **40** | `scripts/e2e/battle/battle_anti_cheat_refresh.simulation.ts` | **5** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **41** | `scripts/e2e/battle/battle_locked_moves.simulation.ts` | **6** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **42** | `scripts/e2e/battle/heuristic_ai.simulation.ts` | **6** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **43** | `scripts/e2e/battle/battle_held_items.simulation.ts` | **169** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **44** | `scripts/e2e/battle/battle_fsm_sync.simulation.ts` | **227** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **Final** | `scripts/e2e/run_sequential_simulations.ts` | **482 tests totales** en 44 suites | `npm run sim:e2e driver=sqlite` | `npm run sim:e2e driver=postgres` | ⏳ Pendiente tras validación individual |

## Applied Code Fixes & Structural Refactors (Commit Ledger)
| ID | Area / Component | Root Cause / Issue | Fix Applied | Files Touched |
|---|---|---|---|---|
| FIX-01..FIX-40 | Grouped legacy fixes | Battle FSM sync, worker safety, medicine actions, database migration isolation | 100% resolved across earlier runs | Various `src/` files |
| FIX-41 | PostgreSQL / Events | `competition_results` query missing order by `ended_at` descending | Added `.order('ended_at', { ascending: false })` and `purgeEventState` | `scripts/e2e/events/base_event_simulation.ts` |
| FIX-42 | Vue / Events UI | Duplicate IDs in `HomeEventsSection` and `WorldEventsModal` for `EventCard` | Added `idPrefix` prop to `EventCard.vue` and scoped locators | `src/components/home/HomeEventsSection.vue`, `src/components/modals/EventCard.vue` |
| FIX-43 | PostgreSQL / Events | Saturday contest award accumulation across reruns | Purged awards and entries in `BaseEventSimulation.setup()` | `scripts/e2e/events/base_event_simulation.ts` |
| FIX-44 | Vite Dev Server / GTS | RAM buffer leak in `/api/dev-export-db` retaining seller DB | Added `cleanupSimulationDb` with physical file and memory purge | `scripts/e2e/base_simulation.ts` |
| FIX-45 | Playwright Reporter | Offset counting duplicate completed tests | Initialized counter to 0 when pending >= total | `scripts/e2e/logging/playwright_fuzzer_reporter.ts` |
| FIX-46 | Linux Network | Virtual network interface churn (`net::ERR_NETWORK_CHANGED`) | Centralized `isTransientNetworkError` with up to 3 retries and log buffer purge | `scripts/e2e/e2e_helpers.ts`, `scripts/e2e/helpers/batchSimulationHarness.ts` |
| FIX-47 | Showdown Move Choice | Multi-turn locked moves (e.g. `Shadow Force`) return single move array | Normalized choice to `move 1` and redirected out-of-range slots to legal move with PP | `src/logic/battle/helpers/showdownMoveChoiceHelper.ts` |
| FIX-48 | E2E Performance Pool | 20s per-test mounting overhead in massive batch suites | Implemented `WorkerSessionPool` with 7-pillar low-level atomic reset in `BaseBattleSimulation` | `scripts/e2e/helpers/batchSimulationHarness.ts`, `scripts/e2e/base_battle_simulation.ts` |

## Pending Simulations
- Suites 1 to 44 in Dual Driver Mode (`driver=dual clean`).

## Structural Blockers
None.

## Critical Decisions
- **Complete Run from Zero**: Executing full sequential pipeline from Suite 1 through Suite 44 under `driver=dual clean`.
- **Worker-Scoped Page Pool**: Used for high-density suites (Suites 43 & 44) with low-level 7-pillar reset.

## Coverage Gaps Detected
None.
