# 🎮 Dynamic E2E Simulation & Certification Status

Last updated: 2026-10-07
Session: fdfe369c

---

## 🎯 Scope
Ejecución completa desde cero del pipeline de simulación del juego (`/game-simulation`), incluyendo validación de casos certificados y ejecución secuencial dual-driver (SQLite + PostgreSQL) de las 60 suites de simulación E2E ordenadas estrictamente de menor a mayor complejidad (de 1 a 227 tests) para búsqueda y certificación de regresiones tras las actualizaciones críticas del auditor y refactorizaciones arquitectónicas.

## 📊 Current Status
- **Overall Status**: IN_PROGRESS
- **Last Action**: Reanudación secuencial tras corregir el descubridor de Playwright (`assetResolver.ts`) y ordenar las 60 suites por complejidad ascendente.
- **Resume Point**: Suite 5 (`scripts/e2e/battle/battle_pivot_and_phazing_mechanics.simulation.ts`).

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
| **46** | `scripts/e2e/battle/battle_wild_encounter_jump.simulation.ts` | **3** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **47** | `scripts/e2e/battle/battle_post_sequence_modals.simulation.ts` | **4** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **48** | `scripts/e2e/battle/debug_creator.simulation.ts` | **4** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **49** | `scripts/e2e/battle/pvp_passive_defense_lifecycle.simulation.ts` | **4** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **50** | `scripts/e2e/gts/illegal_pokemon_security.simulation.ts` | **4** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **51** | `scripts/e2e/save/loading_gate_and_reload.simulation.ts` | **4** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **52** | `scripts/e2e/battle/battle_anti_cheat_refresh.simulation.ts` | **5** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **53** | `scripts/e2e/missions/class_deployments.simulation.ts` | **5** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **54** | `scripts/e2e/save/tiered_save_persistence.simulation.ts` | **5** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **55** | `scripts/e2e/battle/battle_locked_moves.simulation.ts` | **6** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **56** | `scripts/e2e/battle/heuristic_ai.simulation.ts` | **6** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **57** | `scripts/e2e/system/update_lifecycle.simulation.ts` | **6** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **58** | `scripts/e2e/battle/battle_capture.simulation.ts` | **7** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **59** | `scripts/e2e/battle/battle_held_items.simulation.ts` | **169** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **60** | `scripts/e2e/battle/battle_fsm_sync.simulation.ts` | **227** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |
| **Final** | `scripts/e2e/run_sequential_simulations.ts` | **523 tests totales** en 60 suites | `npm run sim:e2e driver=sqlite` | `npm run sim:e2e driver=postgres` | ⏳ Pendiente tras validación individual |

---

## 🔍 Active Failure / Investigation
- **Suite**: Ninguna
- **Test**: N/A
- **Driver**: N/A
- **Failure**: N/A
- **Analysis**: N/A

---

## 📜 Complete & Uninterrupted Commit Ledger

| ID | Area / Component | Root Cause / Detected Issue | Fix Applied | Files Touched |
|---|---|---|---|---|
| 1 | Pokemon DB Generator (`scripts/data/generate_pokemon_db.ts`) | En `recordLearnsetMove`, el renombramiento del parámetro a `rawMoveKey` dejó referencias obsoletas a `moveId` en las líneas 99 y 101 (`movesMap.get(moveId)` / `movesMap.set(moveId, minLevel)`), provocando `ReferenceError: moveId is not defined` durante la inicialización de Vite en `buildStart` e impidiendo el arranque del servidor web de simulaciones en el puerto 5174. | Sustitución de `moveId` por `rawMoveKey` en `recordLearnsetMove`. Mejora de diagnóstico en `scripts/e2e/run_sequential_simulations.ts` para capturar e imprimir `stderr` de Vite en caso de fallo de arranque. Certificado con test unitario RED-to-GREEN en `tests/node/data/generate_pokemon_db.test.ts` y 100% PASS en la suite completa de Node (199/199 archivos, 4.753 tests). | `scripts/data/generate_pokemon_db.ts`, `scripts/e2e/run_sequential_simulations.ts`, `tests/node/data/generate_pokemon_db.test.ts` |
| 2 | DB Router & Client Factory (`src/logic/db/dbClientFactory.ts`, `src/logic/db/supabase.ts`) | En simulaciones E2E con motor PostgreSQL (`e2eDriver === 'postgres'`), `resolveInitialDbSession` priorizaba cualquier `config.url` verdadero sobre la configuración de Docker local (`config.url ? config : { url: 'http://127.0.0.1:54321', ... }`). Al inicializarse `DBRouter` con `DEFAULT_SERVER` (producción remota), el navegador intentaba comunicarse con Supabase en la nube con credenciales efímeras en vez del contenedor local en 54321, superando el timeout de 15000ms al recargar/sincronizar. Además, `switchServer` en `supabase.ts` no mapeaba `test_postgres`, ignorando la selección de servidor de pruebas. | Enrutamiento determinista a `http://127.0.0.1:54321` en `resolveInitialDbSession` para simulaciones E2E PostgreSQL, soporte explícito de `TEST_POSTGRES_SERVER` en `supabase.ts` (tanto en inicialización como en `switchServer`), e implementación de helpers globales agnósticos de entorno (`isE2EEnvironment`, `getE2EDriver`). Certificado con test unitario RED-to-GREEN en `tests/node/system/test_e2e_postgres_config.test.ts`, 100% PASS en suite completa de Node (200/200 archivos, 4.755 tests), y Paso 6B 100% DUAL CLEAN ZERO PASS en `field_abilities_attraction.simulation.ts` (SQLite: 12.3s \| Postgres: 11.4s). | `src/logic/db/dbClientFactory.ts`, `src/logic/db/supabase.ts`, `tests/node/system/test_e2e_postgres_config.test.ts` |
| 3 | Battle Trainer Entities Component (`src/components/battle/BattleTrainerEntities.vue`) | El componente invocaba `watch(...)` en las líneas 70 y 91 pero la línea 2 solo importaba `ref, computed, onUnmounted` desde `'vue'`. Durante el montaje en la vista de batalla (`BattleView.vue`), arrojaba `ReferenceError: watch is not defined {type: Vue Render Error, source: setup function}`, provocando `[CRITICAL-CONSOLE-ERROR]` y abortando el test. | Se añadió la importación de `watch` desde `'vue'` en `src/components/battle/BattleTrainerEntities.vue`. Certificado con test unitario aislado RED-to-GREEN en `tests/unit/components/battle/BattleTrainerEntities.test.ts`, regresión unitaria 100% PASS (221/221 archivos, 2.360 tests), auditoría `npm run audit:lint` 100% PASS (17/17 suites, 0 errores, 0 advertencias), y Paso 6B 100% DUAL CLEAN ZERO PASS en `battle_anti_cheat_refresh.simulation.ts` (SQLite: 81.2s \| Postgres: 79.2s). | `src/components/battle/BattleTrainerEntities.vue`, `tests/unit/components/battle/BattleTrainerEntities.test.ts` |
| 4 | E2E Battle Scenario Setup Helper (`scripts/e2e/helpers/battleScenarioSetupHelper.ts`) | En `resetSimulationToCleanState`, la función dentro de `page.evaluate` intentaba acceder directamente a las constantes `INITIAL_SEED_VAL` (500000) y `REPLAY_RANDOM_SCALE` (10000) sin pasarlas como parámetros desestructurados (`{ simTimeScale, initialSeedVal, replayRandomScale }`), provocando `ReferenceError: INITIAL_SEED_VAL is not defined` en el contexto del navegador, dejando el estado sucio para lotes posteriores de fuzzer como `case-74d33920fdff`. | Pasaje de `{ simTimeScale, initialSeedVal, replayRandomScale }` en `page.evaluate` en `scripts/e2e/helpers/battleScenarioSetupHelper.ts`. Certificado con test unitario RED-to-GREEN en `tests/node/e2e/test_battle_scenario_clean_state_eval.test.ts`, y verificación en progreso de los 227 lotes de fuzzer en `battle_fsm_sync.simulation.ts`. | `scripts/e2e/helpers/battleScenarioSetupHelper.ts`, `tests/node/e2e/test_battle_scenario_clean_state_eval.test.ts` |
| 5 | Asset Resolver & E2E Discovery Pipeline (`src/logic/utils/assetResolver.ts`, `src/logic/utils/env.ts`) | `resolveAsset` accedía a `import.meta.env.BASE_URL` sin encadenamiento opcional. Durante la introspección previa de Playwright (`npx playwright test --list --reporter=json`) en Node.js, `import.meta.env` era `undefined`, arrojando `TypeError: Cannot read properties of undefined (reading 'BASE_URL')`. Esto provocaba que `discoverPlaywrightTargets` cayera silenciosamente en el bloque `catch` asignando `caseCount = 1` a todas las suites, destruyendo la ordenación matemática por complejidad y desfasando la suite de 227 lotes al medio de la ejecución (#14) en vez del final (#60). Además, `isE2EEnvironment` estaba duplicada semánticamente en `dbClientFactory.ts` y `dbCompatibility.ts`. | Se añadió encadenamiento opcional `(typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) \|\| '/'` en `assetResolver.ts` y `env.ts`. Se centralizó `isE2EEnvironment` como Single Source of Truth en `src/logic/utils/env.ts`. Se documentó `tests/node/data/AGENTS.md` y se añadieron anotaciones `// test-fragmentation-ok` en los tests de regresión aislados. Certificado con `npm run audit` 100% PASS (65/65 suites, 0 errores), `npx playwright test --list` exitoso reportando 523 tests en 60 suites, y ordenación matemática estricta por complejidad ascendente. | `src/logic/utils/assetResolver.ts`, `src/logic/utils/env.ts`, `src/logic/db/dbClientFactory.ts`, `src/logic/db/dbCompatibility.ts`, `tests/node/data/AGENTS.md`, `tests/node/AGENTS.md`, `tests/node/data/generate_pokemon_db.test.ts`, `tests/node/e2e/test_battle_scenario_clean_state_eval.test.ts`, `tests/node/system/test_e2e_postgres_config.test.ts`, `tests/node/utils/asset_resolver_node_env.test.ts`, `tests/unit/components/battle/BattleTrainerEntities.test.ts` |
| 6 | Combat Rewards Event Breakdown Formatting (`src/logic/battle/rewards/combatantExpEvProcessor.ts`, `scripts/e2e/events/fishing_event_experience.simulation.ts`) | Tras el refactor de interfaz unificada de combate (`reward-entry-unified`), la función formateadora `buildPrimaryRewardLine` renderizaba el desglose de experiencia de evento como `(+XX evento)` omitiendo la palabra clave `EXP` (`(+XX EXP evento)`). Además, la simulación E2E `fishing_event_experience.simulation.ts` conservaba una aserción obsoleta buscando el verbo `ganó` en el texto del log, el cual fue eliminado del DOM a favor de la cabecera semántica `<strong>[Nombre]</strong>`. Esto causaba timeout de 15000ms en el matcher de Playwright. | Se restauró la etiqueta `(+${eventExtra} EXP evento)` en `buildPrimaryRewardLine` de `combatantExpEvProcessor.ts` y se exportó la función para cobertura determinista. Se actualizó la aserción de la simulación en `fishing_event_experience.simulation.ts` para verificar la presencia de `EXP` y `(+XX EXP evento)` en el log unificado. Certificado con test unitario RED-to-GREEN en `tests/node/events/fishing_event_exp_math.test.ts`, `npm run lint` 100% PASS (17/17 suites, 0 errores), y Paso 6B 100% DUAL CLEAN ZERO PASS en `fishing_event_experience.simulation.ts` (SQLite: 14.4s \| Postgres: 8.7s). | `src/logic/battle/rewards/combatantExpEvProcessor.ts`, `scripts/e2e/events/fishing_event_experience.simulation.ts`, `tests/node/events/fishing_event_exp_math.test.ts` |
| 7 | SQLite Dev Server Buffer Integrity & Persistence Race Condition (`vite.config.ts`, `src/logic/db/sqliteBufferValidator.ts`, `scripts/e2e/base_simulation.ts`) | Durante simulaciones E2E con recargas concurrentes (`reloadAndSync`), múltiples llamadas a `persistSQLite` (`/api/dev-export-db`) eran interrumpidas abruptamente por la navegación del navegador (`page.reload()`). `handleSimDbExport` en `vite.config.ts` no validaba si la petición fue abortada ni el `content-length` ni el header mágico `SQLite format 3\0`, guardando buffers truncados a mitad de página B-Tree. Además, `handleSimDbDownload` priorizaba lecturas desde disco mientras ocurrían renombrados asíncronos y borraba la caché en RAM con `simDbRamBuffers.delete(simKey)`, provocando `Critical Game Error: [SQLite] Failed to migrate trade_offers PK: database disk image is malformed`. | Creación de `src/logic/db/sqliteBufferValidator.ts` para validación estricta de headers y tamaño esperado de SQLite. En `vite.config.ts`, descarte inmediato de subidas abortadas (`!req.complete` o `isAborted`) o buffers corruptos, priorización absoluta de la RAM (`simDbRamBuffers`) para descargas sin I/O lock, y sincronización preventiva de guardado en `reloadAndSync()` de `base_simulation.ts`. Certificado con test unitario RED-to-GREEN en `tests/node/db/sqlite_buffer_validator.test.ts`, `npm run lint` 100% PASS (17/17 suites, 0 errores), y Paso 6B 100% DUAL CLEAN ZERO PASS en `rewards_claim_all_and_archive.simulation.ts` (SQLite: 22.6s \| Postgres: 13.8s). | `src/logic/db/sqliteBufferValidator.ts`, `vite.config.ts`, `scripts/e2e/base_simulation.ts`, `tests/node/db/sqlite_buffer_validator.test.ts` |
| 8 | Map Environment Boundaries & Debug Weather Scenario Sync (`src/components/admin/debug/useDebugPokemonCreator.ts`, `src/stores/debug/sections/pokeTools.ts`, `scripts/e2e/battle/battle_weather_effects.simulation.ts`, `scripts/e2e/battle/debug_creator.simulation.ts`) | En el juego, las fronteras climáticas (`BaseMapEnvironment`) prohíben estrictamente inyectar climas no admitidos en un mapa (Zero Error Suppression). En `route1` (pradera templada), `sandstorm` no está permitido. El creador de debug pokemon (`useDebugPokemonCreator.ts`) hardcodeaba `config.mapId = 'route1'` en inicialización y `onMounted` ignorando `mapStore.currentMap`, y `pokeTools.ts` caía a `'route1'` si `params.mapId` venía vacío. Además, `battle_weather_effects.simulation.ts` y `debug_creator.simulation.ts` activaban `sandstorm` sin cambiar a una ruta que admita tormentas de arena (como `route22`), arrojando `[MapEnvironment] Violación de límites: El clima "sandstorm" no está permitido en el mapa "route1"`. | Se sincronizó `useDebugPokemonCreator` con `mapStore.currentMap` tanto en estado reactivo como en `onMounted`, se actualizó `pokeTools.ts` para usar `mapStore.currentMap` como fallback, y se configuró `route22` en las simulaciones de prueba de `sandstorm` (con cleanup a `route1` en `afterEach`). Certificado con test unitario RED-to-GREEN en `tests/node/debug/debug_weather_map_boundaries.test.ts`, `npm run lint` 100% PASS (17/17 suites, 0 errores), y simulación E2E individual 100% DUAL PASS en `battle_weather_effects.simulation.ts` (SQLite: 23.2s \| Postgres: 14.9s). | `src/components/admin/debug/useDebugPokemonCreator.ts`, `src/stores/debug/sections/pokeTools.ts`, `scripts/e2e/battle/battle_weather_effects.simulation.ts`, `scripts/e2e/battle/debug_creator.simulation.ts`, `tests/node/debug/debug_weather_map_boundaries.test.ts` |


