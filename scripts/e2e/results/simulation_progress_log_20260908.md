# 🎮 Estado Dinámico de Simulación y Certificación E2E (54 Simuladores E2E)

Última actualización: 2026-09-08

---

## 📊 Pipeline Completo de Simuladores (Orden Exacto de Ejecución de `npm run sim:e2e`)

> *Orden determinista generado por `npm run sim:e2e:table` (ordenado por complejidad/cantidad de casos y ruta relativa).*

| # | Suite / Archivo de Simulación | Casos / Elementos | Driver SQLite | Driver PostgreSQL | Estado |
|:---|:---|:---|:---|:---|:---|
| **0** | `scripts/e2e/fuzzer/runners/run_all_fuzzers.ts` | **962 elementos** / 393 batallas | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **1** | `scripts/e2e/abilities/field_abilities_daycare.simulation.ts` | **1** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **2** | `scripts/e2e/abilities/field_abilities_rewards.simulation.ts` | **1** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **3** | `scripts/e2e/battle/battle_capture_reload_persistence.simulation.ts` | **1** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **4** | `scripts/e2e/battle/battle_faint_switch_animation_sync.simulation.ts` | **1** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **5** | `scripts/e2e/battle/battle_pivot_and_phazing_mechanics.simulation.ts` | **1** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **6** | `scripts/e2e/battle/debug_ash_save.simulation.ts` | **1** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **7** | `scripts/e2e/battle/pvp_afk_timeout.simulation.ts` | **1** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **8** | `scripts/e2e/battle/pvp_casual_no_elo_change.simulation.ts` | **1** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **9** | `scripts/e2e/battle/pvp_certified_combat.simulation.ts` | **1** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **10** | `scripts/e2e/battle/pvp_offline_rival_asynchronous_combat.simulation.ts` | **1** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **11** | `scripts/e2e/battle/pvp_ranked_matchmaking_combat.simulation.ts` | **1** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **12** | `scripts/e2e/battle/pvp_reconnect_f5.simulation.ts` | **1** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **13** | `scripts/e2e/battle/pvp_replay_tactical_spectator.simulation.ts` | **1** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **14** | `scripts/e2e/battle/pvp_season_end_award_claim.simulation.ts` | **1** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **15** | `scripts/e2e/battle/rocket_police_criminality.simulation.ts` | **1** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **16** | `scripts/e2e/breeding/breeding_lifecycle.simulation.ts` | **1** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **17** | `scripts/e2e/events/event_awards_gui_lifecycle.simulation.ts` | **1** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **18** | `scripts/e2e/events/event_capture_auto_enroll.simulation.ts` | **1** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **19** | `scripts/e2e/events/event_home_section_and_schedule.simulation.ts` | **1** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **20** | `scripts/e2e/events/event_slot_management.simulation.ts` | **1** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **21** | `scripts/e2e/events/event_subcompetition_filters.simulation.ts` | **1** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **22** | `scripts/e2e/events/fishing_event_experience.simulation.ts` | **1** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **23** | `scripts/e2e/events/magikarp_contest_multiusers.simulation.ts` | **1** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **24** | `scripts/e2e/events/multi_species_competition.simulation.ts` | **1** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **25** | `scripts/e2e/events/rewards_claim_all_and_archive.simulation.ts` | **1** tests | ✅ PASS | ✅ PASS | ✅ 100% DUAL CLEAN PASS |
| **26** | `scripts/e2e/events/saturday_global_contest_and_tiebreaks.simulation.ts` | **1** tests | ✅ PASS | ✅ PASS | ✅ 100% DUAL CLEAN PASS |
| **27** | `scripts/e2e/gts/gts_transactions.simulation.ts` | **1** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **28** | `scripts/e2e/gyms/gym_progression.simulation.ts` | **1** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **29** | `scripts/e2e/items/item_families_lifecycle.simulation.ts` | **1** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **30** | `scripts/e2e/missions/daycare_missions.simulation.ts` | **1** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **31** | `scripts/e2e/pokemon/pokemon_friendship_ui.simulation.ts` | **1** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **32** | `scripts/e2e/abilities/field_abilities_attraction.simulation.ts` | **2** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **33** | `scripts/e2e/abilities/field_abilities_fishing_levels.simulation.ts` | **2** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **34** | `scripts/e2e/abilities/field_abilities_spawns_weather.simulation.ts` | **2** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **35** | `scripts/e2e/battle/battle_catch_breakout_and_whiteout.simulation.ts` | **2** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **36** | `scripts/e2e/battle/battle_forced_switch_ui.simulation.ts` | **2** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **37** | `scripts/e2e/battle/battle_party_rewards_exp_ev.simulation.ts` | **2** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **38** | `scripts/e2e/battle/battle_weather_effects.simulation.ts` | **2** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **39** | `scripts/e2e/battle/battle_wild_encounter_jump.simulation.ts` | **2** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **40** | `scripts/e2e/battle/search_loop_sequential.simulation.ts` | **2** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **41** | `scripts/e2e/save/save_shield_restrictions.simulation.ts` | **2** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **42** | `scripts/e2e/abilities/field_abilities_capture.simulation.ts` | **3** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **43** | `scripts/e2e/battle/battle_flee_and_teleport.simulation.ts` | **3** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **44** | `scripts/e2e/battle/battle_healing_regression.simulation.ts` | **3** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **45** | `scripts/e2e/battle/battle_manual_scenarios.simulation.ts` | **3** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **46** | `scripts/e2e/battle/battle_capture.simulation.ts` | **4** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **47** | `scripts/e2e/battle/debug_creator.simulation.ts` | **4** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **48** | `scripts/e2e/gts/illegal_pokemon_security.simulation.ts` | **4** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **49** | `scripts/e2e/save/loading_gate_and_reload.simulation.ts` | **4** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **50** | `scripts/e2e/battle/battle_anti_cheat_refresh.simulation.ts` | **5** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **51** | `scripts/e2e/battle/battle_locked_moves.simulation.ts` | **6** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **52** | `scripts/e2e/battle/heuristic_ai.simulation.ts` | **6** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **53** | `scripts/e2e/battle/battle_held_items.simulation.ts` | **169** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **54** | `scripts/e2e/battle/battle_fsm_sync.simulation.ts` | **227** tests | ✅ PASS | ✅ PASS | ✅ 100% PASS |
| **Final** | `scripts/e2e/run_sequential_simulations.ts` | **492 tests totales** en 54 suites | ✅ PASS (SQLite) | ✅ PASS (Postgres) | ✅ 100% DUAL CERTIFIED |

---

## 📜 Libro Mayor Completo e Ininterrumpido de Correcciones (Commit Ledger)

| ID | Área / Componente | Causa Raíz / Problema Detectado | Corrección Aplicada | Archivos Modificados |
|---|---|---|---|---|
| FIX-01 | Events / Awards RLS | Postgres RLS impedía a usuarios autenticados insertar o leer sus propios premios y claim_queue | Migración forward-only `20260908060000_grant_awards_insert_policy.sql` y sincronización de postgREST | `database/migrations/20260908060000_grant_awards_insert_policy.sql`, `...sqlite.sql` |
| FIX-02 | Debug / Rewards | TDZ ReferenceError al acceder a `isOnlineDb` antes de inicialización en `simulatePastEventAndMissionsReward` | Mover `isOnlineDb` a scope superior de la función y unificar | `src/logic/debug/rewardsDebugSimulation.ts` |
| FIX-03 | GTS / Claim Asset Parity | `claim_asset_v2` en Postgres fallaba con `case not found` si `asset_data` se insertaba como JSON string escalar | Migración `20260908070000_resilient_claim_asset_jsonb_parsing.sql` para desanidar string JSONB y normalizar inserciones TS | `database/migrations/20260908070000_...`, `src/stores/game/actions/saveActions.ts`, `src/logic/debug/rewardsDebugSimulation.ts` |
| FIX-04 | E2E Events Simulation | El hito inicial de 1000 ELO aparecía como recompensa pendiente en `HomePendingRewardsWidget`, sumando 3 items en vez de los 2 del evento | Marcar `bronce_1000` como reclamado por defecto en `BaseEventSimulation.setup()` y en el escenario del test | `scripts/e2e/events/base_event_simulation.ts`, `scripts/e2e/events/saturday_global_contest_and_tiebreaks.simulation.ts` |
| FIX-05 | E2E Battle Teleport Simulation | `page.evaluate` bloqueando con `await startBattle` causaba que V8 recolectara como basura la promesa CDP durante la animación de intro con alta concurrencia | Invocar `startBattle` con `void` dentro de `page.evaluate` delegando la espera de sincronización a `awaitBattleReadyForInput` | `scripts/e2e/battle/battle_flee_and_teleport.simulation.ts` |

---

## 🧪 Tests de Reproducción de Casos Extraídos (Vitest Inmutable)

| ID | Caso / Fixture Extraído | Test de Unidad de Reproducción | Estado | Causa Raíz Diagnosticada y Reparada |
|:---|:---|:---|:---|:---|
| TEST-01 | Inserción y lectura de awards bajo RLS | `tests/node/events/test_awards_rls_and_uuid_parity.test.ts` | ✅ PASS | Políticas RLS de Postgres para `public.awards` y `public.claim_queue` |
| TEST-02 | Invocación de `claim_asset_v2` con JSON string | `tests/node/events/test_claim_queue_resilience.test.ts` | ✅ PASS | Desanidación de JSONB escalar en PL/pgSQL y cláusula ELSE resiliente |

