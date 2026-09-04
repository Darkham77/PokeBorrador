# Simulation Run — 2026-08-31
Session: sim-2237

## Scope
Fuzzer regeneration (`npm run sim:fuzzer`) and full game simulation validation pipeline (`/game-simulation`).

## Status
Overall: IN_PROGRESS
Last action: Completed Step 1 (Fuzzer regeneration & validation with 227 certified battle cases).
Resumed at: Step 2 (E2E Simulations Execution)

## Dynamic Simulation Table (Generated via `npm run sim:e2e:table`)

| # | Suite / Archivo de Simulación | Casos / Elementos | Comando de Ejecución Directa | Estado |
|:---|:---|:---|:---|:---|
| **0** | `scripts/e2e/fuzzer/runners/run_all_fuzzers.ts` | **962 elementos** / 393 batallas | `npm run sim:fuzzer` | 🟢 **100% PASS** (227 casos certificados) |
| **1** | `scripts/e2e/abilities/field_abilities_daycare.simulation.ts` | **1** test | `npx playwright test scripts/e2e/abilities/field_abilities_daycare.simulation.ts` | 🟢 **100% PASS** (3.9s) |
| **2** | `scripts/e2e/abilities/field_abilities_rewards.simulation.ts` | **1** test | `npx playwright test scripts/e2e/abilities/field_abilities_rewards.simulation.ts` | 🟢 **100% PASS** (4.0s) |
| **3** | `scripts/e2e/battle/battle_capture_reload_persistence.simulation.ts` | **1** test | `npx playwright test scripts/e2e/battle/battle_capture_reload_persistence.simulation.ts` | 🟢 **100% PASS** (11.5s) |
| **4** | `scripts/e2e/battle/battle_faint_switch_animation_sync.simulation.ts` | **1** test | `npx playwright test scripts/e2e/battle/battle_faint_switch_animation_sync.simulation.ts` | 🟢 **100% PASS** (4.7s) |
| **5** | `scripts/e2e/battle/battle_pivot_and_phazing_mechanics.simulation.ts` | **1** test | `npx playwright test scripts/e2e/battle/battle_pivot_and_phazing_mechanics.simulation.ts` | 🟢 **100% PASS** (9.8s) |
| **6** | `scripts/e2e/battle/debug_ash_save.simulation.ts` | **1** test | `npx playwright test scripts/e2e/battle/debug_ash_save.simulation.ts` | 🟢 **100% PASS** (10.4s) |
| **7** | `scripts/e2e/battle/rocket_police_criminality.simulation.ts` | **1** test | `npx playwright test scripts/e2e/battle/rocket_police_criminality.simulation.ts` | ⏳ Pendiente |
| **8** | `scripts/e2e/breeding/breeding_lifecycle.simulation.ts` | **1** test | `npx playwright test scripts/e2e/breeding/breeding_lifecycle.simulation.ts` | 🟢 **100% PASS** (9.3s) |
| **9** | `scripts/e2e/events/fishing_event_experience.simulation.ts` | **1** test | `npx playwright test scripts/e2e/events/fishing_event_experience.simulation.ts` | 🟢 **100% PASS** (7.7s) |
| **10** | `scripts/e2e/events/multi_species_competition.simulation.ts` | **1** test | `npx playwright test scripts/e2e/events/multi_species_competition.simulation.ts` | 🟢 **100% PASS** (8.0s) |
| **11** | `scripts/e2e/gts/gts_transactions.simulation.ts` | **1** test | `npx playwright test scripts/e2e/gts/gts_transactions.simulation.ts` | 🟢 **100% PASS** (13.5s) |
| **12** | `scripts/e2e/gyms/gym_progression.simulation.ts` | **1** test | `npx playwright test scripts/e2e/gyms/gym_progression.simulation.ts` | 🟢 **100% PASS** (9.3s) |
| **13** | `scripts/e2e/missions/daycare_missions.simulation.ts` | **1** test | `npx playwright test scripts/e2e/missions/daycare_missions.simulation.ts` | 🟢 **100% PASS** (7.8s) |
| **14** | `scripts/e2e/pokemon/pokemon_friendship_ui.simulation.ts` | **1** test | `npx playwright test scripts/e2e/pokemon/pokemon_friendship_ui.simulation.ts` | 🟢 **100% PASS** (5.3s) |
| **15** | `scripts/e2e/abilities/field_abilities_attraction.simulation.ts` | **2** tests | `npx playwright test scripts/e2e/abilities/field_abilities_attraction.simulation.ts` | 🟢 **100% PASS** (13.4s) |
| **16** | `scripts/e2e/abilities/field_abilities_fishing_levels.simulation.ts` | **2** tests | `npx playwright test scripts/e2e/abilities/field_abilities_fishing_levels.simulation.ts` | 🟢 **100% PASS** (13.2s) |
| **17** | `scripts/e2e/abilities/field_abilities_spawns_weather.simulation.ts` | **2** tests | `npx playwright test scripts/e2e/abilities/field_abilities_spawns_weather.simulation.ts` | 🟢 **100% PASS** (4.1s) |
| **18** | `scripts/e2e/battle/battle_catch_breakout_and_whiteout.simulation.ts` | **2** tests | `npx playwright test scripts/e2e/battle/battle_catch_breakout_and_whiteout.simulation.ts` | 🟢 **100% PASS** (9.8s) |
| **19** | `scripts/e2e/battle/battle_forced_switch_ui.simulation.ts` | **2** tests | `npx playwright test scripts/e2e/battle/battle_forced_switch_ui.simulation.ts` | ⏳ Pendiente |
| **20** | `scripts/e2e/battle/battle_weather_effects.simulation.ts` | **2** tests | `npx playwright test scripts/e2e/battle/battle_weather_effects.simulation.ts` | ⏳ Pendiente |
| **21** | `scripts/e2e/battle/battle_wild_encounter_jump.simulation.ts` | **2** tests | `npx playwright test scripts/e2e/battle/battle_wild_encounter_jump.simulation.ts` | ⏳ Pendiente |
| **22** | `scripts/e2e/battle/search_loop_sequential.simulation.ts` | **2** tests | `npx playwright test scripts/e2e/battle/search_loop_sequential.simulation.ts` | ⏳ Pendiente |
| **23** | `scripts/e2e/save/save_shield_restrictions.simulation.ts` | **2** tests | `npx playwright test scripts/e2e/save/save_shield_restrictions.simulation.ts` | 🟢 **100% PASS** (5.9s) |
| **24** | `scripts/e2e/abilities/field_abilities_capture.simulation.ts` | **3** tests | `npx playwright test scripts/e2e/abilities/field_abilities_capture.simulation.ts` | 🟢 **100% PASS** (13.2s) |
| **25** | `scripts/e2e/battle/battle_flee_and_teleport.simulation.ts` | **3** tests | `npx playwright test scripts/e2e/battle/battle_flee_and_teleport.simulation.ts` | ⏳ Pendiente |
| **26** | `scripts/e2e/battle/battle_healing_regression.simulation.ts` | **3** tests | `npx playwright test scripts/e2e/battle/battle_healing_regression.simulation.ts` | ⏳ Pendiente |
| **27** | `scripts/e2e/battle/battle_manual_scenarios.simulation.ts` | **3** tests | `npx playwright test scripts/e2e/battle/battle_manual_scenarios.simulation.ts` | ⏳ Pendiente |
| **28** | `scripts/e2e/events/magikarp_contest_multiusers.simulation.ts` | **3** tests | `npx playwright test scripts/e2e/events/magikarp_contest_multiusers.simulation.ts` | 🟢 **100% PASS** (16.7s) |
| **29** | `scripts/e2e/battle/battle_capture.simulation.ts` | **4** tests | `npx playwright test scripts/e2e/battle/battle_capture.simulation.ts` | 🟢 **100% PASS** (12.5s) |
| **30** | `scripts/e2e/battle/debug_creator.simulation.ts` | **4** tests | `npx playwright test scripts/e2e/battle/debug_creator.simulation.ts` | ⏳ Pendiente |
| **31** | `scripts/e2e/gts/illegal_pokemon_security.simulation.ts` | **4** tests | `npx playwright test scripts/e2e/gts/illegal_pokemon_security.simulation.ts` | 🟢 **100% PASS** (10.5s) |
| **32** | `scripts/e2e/battle/battle_anti_cheat_refresh.simulation.ts` | **5** tests | `npx playwright test scripts/e2e/battle/battle_anti_cheat_refresh.simulation.ts` | ⏳ Pendiente |
| **33** | `scripts/e2e/battle/battle_locked_moves.simulation.ts` | **6** tests | `npx playwright test scripts/e2e/battle/battle_locked_moves.simulation.ts` | 🟢 **100% PASS** (14.0s) |
| **34** | `scripts/e2e/battle/heuristic_ai.simulation.ts` | **6** tests | `npx playwright test scripts/e2e/battle/heuristic_ai.simulation.ts` | ⏳ Pendiente |
| **35** | `scripts/e2e/battle/battle_held_items.simulation.ts` | **169** tests | `npx playwright test scripts/e2e/battle/battle_held_items.simulation.ts` | ⏳ Pendiente |
| **36** | `scripts/e2e/battle/battle_fsm_sync.simulation.ts` | **227** tests | `npx playwright test scripts/e2e/battle/battle_fsm_sync.simulation.ts` | ⏳ Pendiente |
| **Final** | `scripts/e2e/run_sequential_simulations.ts` | **472 tests totales** en 36 suites | `npm run sim:e2e` | ⏳ Pendiente tras validación individual |

## Applied Code Fixes & Structural Refactors (Commit Ledger)
| ID | Area / Component | Root Cause / Issue | Fix Applied | Files Touched |
|---|---|---|---|---|
| FIX-01 | Dead Code / Quality | Unused exports and obsolete mock constants | Removed export modifiers from internal calculation helpers and purged dead constants | `movePowerMultipliers.ts`, `npcEncounterChances.ts`, `gameplay.ts`, `encounters.ts` |
| FIX-02 | Security (CWE-79) | Non-literal v-html sink flags in Vue components | Added hasSecuritySuppression bridge in audit_project.ts to recognize localized fallow-ignore annotations | `scripts/auditors/architecture/audit_project.ts` |
| FIX-03 | UI Translation | Unannotated Spanish UI string in buffs helper | Marked name: 'Repelente' with // spanish-ok: UI Spanish text localization label | `src/stores/battle/buffsHelper.ts` |
| FIX-04 | Audit CLI Tools | Ad-hoc node -e scripting for warnings reporting | Built official report_audit_warnings.ts CLI and package.json scripts audit:warnings / audit:summary | `scripts/auditors/architecture/report_audit_warnings.ts`, `package.json` |
| FIX-05 | Breeding UI | Faltaba atributo :id determinista en tarjetas de huevos (`egg-hud-card-${egg.uid}`) | Agregado :id strictly usando `egg.uid` sin fallbacks | `src/components/home/HomeBreedingWidget.vue` |
| FIX-06 | E2E Capture Suites | Uso de import inválido `requireInventoryItemId` y dependencias de UI de depuración inestables | Reemplazado por inicialización determinista de store con `requireItemId` | `battle_capture.simulation.ts`, `battle_capture_reload_persistence.simulation.ts`, `battle_catch_breakout_and_whiteout.simulation.ts` |

## Next Suites in Queue (Sequential Step-by-Step)
- `scripts/e2e/battle/rocket_police_criminality.simulation.ts` (Suite #7)
