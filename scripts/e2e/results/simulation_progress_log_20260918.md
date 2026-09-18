# 🎮 Dynamic E2E Simulation & Certification Status

Last updated: 2026-09-18
Session: 9c8b83

---

## 🎯 Scope
Ejecución completa del pipeline de simulación del juego (`/game-simulation`), incluyendo ejecución y regeneración del fuzzer determinista (`npm run sim:fuzzer`), validación de casos certificados (`npm run sim:fuzzer:validate`), y ejecución secuencial dual-driver (SQLite + PostgreSQL) de las 60 suites de simulación E2E para búsqueda y certificación de regresiones.

## 📊 Current Status
- **Overall Status**: COMPLETE
- **Last Action**: Las 60 suites de simulación E2E han pasado exitosamente en modo DUAL (60/60 certificadas, 523 tests ejecutados al 100% en SQLite y PostgreSQL).
- **Resume Point**: Completado al 100% (Pipeline Certificado).

---

## 📊 Complete Simulation Pipeline (Exact Execution Order of `npm run sim:e2e`)

| # | Suite / Archivo de Simulación | Casos / Elementos | Driver SQLite | Driver PostgreSQL | Estado |
|:---|:---|:---|:---|:---|:---|
| **0** | `scripts/e2e/fuzzer/runners/run_all_fuzzers.ts` | **962 elementos** / 393 batallas | 🟢 **100% PASS** | 🟢 **100% PASS** | 🟢 **100% PASS** |
| **1** | `scripts/e2e/abilities/field_abilities_daycare.simulation.ts` | **1** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **2** | `scripts/e2e/abilities/field_abilities_rewards.simulation.ts` | **1** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **3** | `scripts/e2e/battle/battle_capture_reload_persistence.simulation.ts` | **1** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **4** | `scripts/e2e/battle/battle_faint_switch_animation_sync.simulation.ts` | **1** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **5** | `scripts/e2e/battle/battle_pivot_and_phazing_mechanics.simulation.ts` | **1** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **6** | `scripts/e2e/battle/debug_ash_save.simulation.ts` | **1** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **7** | `scripts/e2e/battle/pvp_afk_timeout.simulation.ts` | **1** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **8** | `scripts/e2e/battle/pvp_casual_no_elo_change.simulation.ts` | **1** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **9** | `scripts/e2e/battle/pvp_certified_combat.simulation.ts` | **1** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **10** | `scripts/e2e/battle/pvp_offline_rival_asynchronous_combat.simulation.ts` | **1** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **11** | `scripts/e2e/battle/pvp_reconnect_f5.simulation.ts` | **1** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **12** | `scripts/e2e/battle/pvp_replay_tactical_spectator.simulation.ts` | **1** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **13** | `scripts/e2e/battle/pvp_season_end_award_claim.simulation.ts` | **1** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **14** | `scripts/e2e/battle/rocket_police_criminality.simulation.ts` | **1** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **15** | `scripts/e2e/breeding/breeding_lifecycle.simulation.ts` | **1** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **16** | `scripts/e2e/events/event_awards_gui_lifecycle.simulation.ts` | **1** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **17** | `scripts/e2e/events/event_capture_auto_enroll.simulation.ts` | **1** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **18** | `scripts/e2e/events/event_home_section_and_schedule.simulation.ts` | **1** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **19** | `scripts/e2e/events/event_slot_management.simulation.ts` | **1** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **20** | `scripts/e2e/events/event_subcompetition_filters.simulation.ts` | **1** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **21** | `scripts/e2e/events/fishing_event_experience.simulation.ts` | **1** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **22** | `scripts/e2e/events/magikarp_contest_multiusers.simulation.ts` | **1** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **23** | `scripts/e2e/events/multi_species_competition.simulation.ts` | **1** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **24** | `scripts/e2e/events/rewards_claim_all_and_archive.simulation.ts` | **1** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **25** | `scripts/e2e/events/saturday_global_contest_and_tiebreaks.simulation.ts` | **1** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **26** | `scripts/e2e/gts/gts_transactions.simulation.ts` | **1** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **27** | `scripts/e2e/gyms/gym_progression.simulation.ts` | **1** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **28** | `scripts/e2e/items/item_families_lifecycle.simulation.ts` | **1** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **29** | `scripts/e2e/missions/daycare_missions.simulation.ts` | **1** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **30** | `scripts/e2e/modals/modal_fast_mode_lifecycle.simulation.ts` | **1** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **31** | `scripts/e2e/pokemon/pokemon_friendship_ui.simulation.ts` | **1** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **32** | `scripts/e2e/abilities/field_abilities_attraction.simulation.ts` | **2** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **33** | `scripts/e2e/abilities/field_abilities_fishing_levels.simulation.ts` | **2** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **34** | `scripts/e2e/abilities/field_abilities_spawns_weather.simulation.ts` | **2** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **35** | `scripts/e2e/battle/battle_catch_breakout_and_whiteout.simulation.ts` | **2** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **36** | `scripts/e2e/battle/battle_forced_switch_ui.simulation.ts` | **2** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **37** | `scripts/e2e/battle/battle_party_rewards_exp_ev.simulation.ts` | **2** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **38** | `scripts/e2e/battle/pvp_ranked_matchmaking_combat.simulation.ts` | **2** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **39** | `scripts/e2e/battle/search_loop_sequential.simulation.ts` | **2** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **40** | `scripts/e2e/save/save_shield_restrictions.simulation.ts` | **2** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **41** | `scripts/e2e/abilities/field_abilities_capture.simulation.ts` | **3** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **42** | `scripts/e2e/battle/battle_flee_and_teleport.simulation.ts` | **3** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **43** | `scripts/e2e/battle/battle_healing_regression.simulation.ts` | **3** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **44** | `scripts/e2e/battle/battle_manual_scenarios.simulation.ts` | **3** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **45** | `scripts/e2e/battle/battle_weather_effects.simulation.ts` | **3** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **46** | `scripts/e2e/battle/battle_wild_encounter_jump.simulation.ts` | **3** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **47** | `scripts/e2e/battle/battle_post_sequence_modals.simulation.ts` | **4** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **48** | `scripts/e2e/battle/debug_creator.simulation.ts` | **4** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **49** | `scripts/e2e/battle/pvp_passive_defense_lifecycle.simulation.ts` | **4** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **50** | `scripts/e2e/gts/illegal_pokemon_security.simulation.ts` | **4** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **51** | `scripts/e2e/save/loading_gate_and_reload.simulation.ts` | **4** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **52** | `scripts/e2e/battle/battle_anti_cheat_refresh.simulation.ts` | **5** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **53** | `scripts/e2e/missions/class_deployments.simulation.ts` | **5** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **54** | `scripts/e2e/save/tiered_save_persistence.simulation.ts` | **5** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **55** | `scripts/e2e/battle/battle_locked_moves.simulation.ts` | **6** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **56** | `scripts/e2e/battle/heuristic_ai.simulation.ts` | **6** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **57** | `scripts/e2e/system/update_lifecycle.simulation.ts` | **6** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **58** | `scripts/e2e/battle/battle_capture.simulation.ts` | **7** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **59** | `scripts/e2e/battle/battle_held_items.simulation.ts` | **169** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **60** | `scripts/e2e/battle/battle_fsm_sync.simulation.ts` | **227** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **Final** | `scripts/e2e/run_sequential_simulations.ts` | **523 tests totales** en 60 suites | 🟢 **100% PASS** | 🟢 **100% PASS** | 🟢 **100% DUAL PASS** |

---

## 🔍 Active Failure / Investigation
- **Suite**: Ninguna (100% de las 60 suites certificadas en modo dual).
- **Test**: N/A
- **Driver**: N/A
- **Failure**: N/A
- **Analysis**: N/A

---

## 📜 Complete & Uninterrupted Commit Ledger

| ID | Area / Component | Root Cause / Detected Issue | Fix Applied | Files Touched |
|---|---|---|---|---|
| 1 | PvP Store (`src/stores/pvp.ts`) | `loadPvPData(force = false)` retornaba anticipadamente cuando `isLoaded.value` era `true` (`if (isLoaded.value && !force) return`), impidiendo consumir la bandera `pvp_login_reminder_pending` de `sessionStorage` y omitiendo el toast recordatorio cuando la tienda ya había sido inicializada en el arranque de la app. | Extracción de `consumeLoginReminderIfNeeded()` para verificar y consumir la bandera `pvp_login_reminder_pending` y despachar la notificación tanto en el camino cacheado (`isLoaded.value && !force`) como al final de la carga completa de datos. Certificado con test unitario RED-to-GREEN en `tests/node/pvp/reproduce_pvp_reminder_reload.test.ts` y Step 6B Clean Zero Dual Pass (SQLite: 22.6s \| Postgres: 19.8s). | `src/stores/pvp.ts`, `tests/node/pvp/reproduce_pvp_reminder_reload.test.ts` |
| 2 | Base E2E Simulation (`scripts/e2e/base_simulation.ts`) & Anti-Cheat Suite (`scripts/e2e/battle/battle_anti_cheat_refresh.simulation.ts`) | En modo PostgreSQL, guardados de combate previos a recarga de página (F5) invocaban `saveGame()` sin `forceRemote: true`. Al haber transcurrido <60s desde el guardado remoto previo, el guardado en la nube quedaba throttled localmente (`remote: false`). Al recargar la página, PostgreSQL restauraba un guardado previo desactualizado donde no había combate activo, dejando la FSM en `EXIT_BATTLE`. | Incorporación del método por herencia `persistBattleAndSave()` en `BaseE2ESimulation` (`useBattleStore().persistBattle(); await useGameStore().saveGame(false, true, true);`) para forzar la persistencia remota completa antes de recargas en todos los simuladores. Refactorización de las 5 llamadas manuales en `battle_anti_cheat_refresh.simulation.ts` para consumir `sim.persistBattleAndSave()`. Certificado con test unitario RED-to-GREEN en `tests/node/battle/reproduce_rival_anti_cheat_persistence.test.ts`, regresión completa de Node (195 archivos, 4788 tests) y Step 6B Dual Clean Zero Pass (SQLite: 101.3s \| Postgres: 92.9s). | `scripts/e2e/base_simulation.ts`, `scripts/e2e/battle/battle_anti_cheat_refresh.simulation.ts`, `tests/node/battle/reproduce_rival_anti_cheat_persistence.test.ts` |

---

## 🧪 Extracted Case Reproduction Tests (Immutable Vitest)

| ID | Extracted Case / Fixture | Unit Reproduction Test | Status | Diagnosed & Repaired Root Cause |
|:---|:---|:---|:---|:---|
| 1 | Cached `loadPvPData` with pending `pvp_login_reminder_pending` | `tests/node/pvp/reproduce_pvp_reminder_reload.test.ts` | 🟢 PASS | Consumo del recordatorio de login pendiente en llamadas cacheadas de `loadPvPData` |
| 2 | PostgreSQL 60s remote save throttling during active battle persistence before reload | `tests/node/battle/reproduce_rival_anti_cheat_persistence.test.ts` | 🟢 PASS | Omisión del throttling de guardado remoto mediante `forceRemote: true` en `persistBattleAndSave()` |

---

## ⚠️ Structural Blockers (user review required)
| Simulation | Why a design decision is needed |
|---|---|

---

## 💡 Critical Decisions
- Fuzzer regenerado desde cero con `npm run sim:fuzzer` (227 casos certificados validados).
- Tabla dinámica de simulación generada vía `npm run sim:e2e:table` (60 suites, 523 tests totales).
- 60 suites de simulación E2E (523 tests totales) certificadas exitosamente en modo dual SQLite + PostgreSQL (60/60 DUAL PASS).
- Suite 49 (`pvp_passive_defense_lifecycle.simulation.ts`) reparada y certificada tras corregir el consumo de recordatorios en `src/stores/pvp.ts`.
- Suite 52 (`battle_anti_cheat_refresh.simulation.ts`) reparada y certificada tras incorporar `persistBattleAndSave()` por herencia en `BaseE2ESimulation` para forzar guardado remoto sin throttling de 60s antes de recargas de página en PostgreSQL.

---

## 🔍 Coverage Gaps Detected
| Gap | Suggested simulation type |
|---|---|
