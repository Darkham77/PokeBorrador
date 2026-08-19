# Simulation Run — 2026-08-19
Session: `sim-20260819`

## Scope
Full `/game-simulation` protocol execution starting 100% from scratch: complete fuzzer regeneration (`npm run sim:fuzzer`), validation of certified cases, and exhaustive execution of all 15 simulation suites under strict 5s fail-fast timeouts, zero fallbacks, and immutable RED-to-GREEN reproduction tests.

## Status
Overall: COMPLETE
Last action: Master Regression Pass (`npm run sim:e2e`) executed all 15 suites in sequence — 100% GREEN (15/15 passed, 424 tests completed).
Finished at: 2026-08-19 14:50:25 UTC

## Dynamic Simulation Table (Generated via `npm run sim:e2e:table`)

| # | Suite / Archivo de Simulación | Casos / Elementos | Comando de Ejecución Directa | Estado |
|:---|:---|:---|:---|:---|
| **0** | `scripts/e2e/fuzzer/runners/run_all_fuzzers.ts` | **962 elementos** / 393 batallas | `npm run sim:fuzzer` | 🟢 **100% PASS** |
| **1** | `scripts/e2e/battle/battle_manual_scenarios.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/battle/battle_manual_scenarios.simulation.ts` | 🟢 **100% PASS** |
| **2** | `scripts/e2e/battle/debug_ash_save.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/battle/debug_ash_save.simulation.ts` | 🟢 **100% PASS** |
| **3** | `scripts/e2e/battle/search_loop_sequential.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/battle/search_loop_sequential.simulation.ts` | 🟢 **100% PASS** |
| **4** | `scripts/e2e/breeding/breeding_lifecycle.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/breeding/breeding_lifecycle.simulation.ts` | 🟢 **100% PASS** |
| **5** | `scripts/e2e/gts/gts_transactions.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/gts/gts_transactions.simulation.ts` | 🟢 **100% PASS** |
| **6** | `scripts/e2e/gyms/gym_progression.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/gyms/gym_progression.simulation.ts` | 🟢 **100% PASS** |
| **7** | `scripts/e2e/missions/daycare_missions.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/missions/daycare_missions.simulation.ts` | 🟢 **100% PASS** |
| **8** | `scripts/e2e/battle/battle_weather_effects.simulation.ts` | **2** tests | `npx playwright test scripts/e2e/battle/battle_weather_effects.simulation.ts` | 🟢 **100% PASS** |
| **9** | `scripts/e2e/save/save_shield_restrictions.simulation.ts` | **2** tests | `npx playwright test scripts/e2e/save/save_shield_restrictions.simulation.ts` | 🟢 **100% PASS** |
| **10** | `scripts/e2e/battle/battle_healing_regression.simulation.ts` | **3** tests | `npx playwright test scripts/e2e/battle/battle_healing_regression.simulation.ts` | 🟢 **100% PASS** |
| **11** | `scripts/e2e/battle/battle_capture.simulation.ts` | **4** tests | `npx playwright test scripts/e2e/battle/battle_capture.simulation.ts` | 🟢 **100% PASS** |
| **12** | `scripts/e2e/battle/debug_creator.simulation.ts` | **4** tests | `npx playwright test scripts/e2e/battle/debug_creator.simulation.ts` | 🟢 **100% PASS** |
| **13** | `scripts/e2e/battle/heuristic_ai.simulation.ts` | **6** tests | `npx playwright test scripts/e2e/battle/heuristic_ai.simulation.ts` | 🟢 **100% PASS** |
| **14** | `scripts/e2e/battle/battle_held_items.simulation.ts` | **169** tests | `npx playwright test scripts/e2e/battle/battle_held_items.simulation.ts` | 🟢 **100% PASS** (169/169) |
| **15** | `scripts/e2e/battle/battle_fsm_sync.simulation.ts` | **227** tests | `npx playwright test scripts/e2e/battle/battle_fsm_sync.simulation.ts` | 🟢 **100% PASS** (227/227) |
| **Final** | `scripts/e2e/run_sequential_simulations.ts` | **424 tests totales** en 15 suites | `npm run sim:e2e` | 🟢 **100% PASS** (15/15 suites) |

## Applied Code Fixes & Structural Refactors (Commit Ledger)

| ID | Área / Componente | Causa Raíz / Problema Detectado | Corrección Aplicada | Archivos Modificados |
|---|---|---|---|---|
| **FIX-01** | `AuthLocalLogin.vue` & E2E Suites | `AuthLocalLogin` tenía `maxlength="20"` mientras `trainerNameSchema` validaba un límite estricto de 15 caracteres (`MAX_TRAINER_NAME_LENGTH`), provocando rechazo de login en nombres largos de pruebas | Se alineó `maxlength="15"` en `AuthLocalLogin.vue` y se normalizaron los nombres de usuario de todas las suites E2E dentro del límite de 15 caracteres | `src/components/auth/AuthLocalLogin.vue`<br>`scripts/e2e/battle/battle_manual_scenarios.simulation.ts`<br>`scripts/e2e/battle/battle_healing_regression.simulation.ts`<br>`scripts/e2e/battle/battle_held_items.simulation.ts`<br>`scripts/e2e/battle/battle_fsm_sync.simulation.ts`<br>`scripts/e2e/battle/heuristic_ai.simulation.ts`<br>`scripts/e2e/search_loop_sequential.simulation.ts`<br>`scripts/e2e/breeding/breeding_lifecycle.simulation.ts`<br>`scripts/e2e/gts/gts_transactions.simulation.ts`<br>`scripts/e2e/gyms/gym_progression.simulation.ts`<br>`scripts/e2e/missions/daycare_missions.simulation.ts`<br>`scripts/e2e/save/save_shield_restrictions.simulation.ts` |
| **FIX-02** | `gameInitialState.ts` & Save Validation | `INITIAL_STATE` no definía `passiveTeamUids: []` ni `passiveTeamActive: false`, provocando que al serializar el estado inicial para guardar partida, `passiveTeamActive` fuera `undefined`, fallando la validación del esquema de guardado (`Expected boolean but received undefined`) | Se agregaron `passiveTeamUids: []` y `passiveTeamActive: false` a `INITIAL_STATE` asegurando conformidad con `GameState` y `gameStateSchema` | `src/stores/gameInitialState.ts` |
| **FIX-03** | `statsMath.ts` & Level 100 Pokemon Serialization | `getExpNeededPure(100)` y funciones de subida de nivel asignaban `expNeeded = Infinity` a Pokémon de nivel 100. En JSON, `Infinity` se serializa como `null`, provocando fallos críticos de validación de esquema al guardar partida (`Expected number but received null`) | Se normalizó `expNeeded = 0` para nivel 100 en todas las fuentes de cálculo de experiencia y subida de nivel | `src/logic/pokemon/statsMath.ts`<br>`src/logic/battle/battleRewards.ts`<br>`src/logic/battle/rewardsDistributor.ts`<br>`src/logic/pokemon/pokemonFactory.ts`<br>`src/stores/game/actions/trainerActions.ts`<br>`src/stores/player/playerClass.ts`<br>`src/components/admin/debug/IndividualPokemonEditor.vue`<br>`tests/node/pokemon/pokemon_stats.test.ts` |
| **FIX-04** | Fuzzer Engine & Cheat Manager | Curaciones pre-turn se guardaban con la misma clave `Heal` que las curaciones post-turn IPB en el historial atómico del fuzzer, causando desincronización de curaciones durante el replay de batallas largas | Se agregaron campos `PreHeal` al contrato `CertifiedBattleHistoryEntry`, se desacopló el procesamiento de pre-turn y post-turn en `BattleCheatManager` y se alineó la semilla RNG LCG en `base_battle_simulation.ts` | `scripts/e2e/fuzzer/generators/fuzzer_team_generator.ts`<br>`scripts/e2e/fuzzer/core/certifiedBattleCase.ts`<br>`scripts/e2e/fuzzer/core/fuzzer_engine.ts`<br>`src/logic/battle/helpers/battleCheatManager.ts`<br>`scripts/e2e/base_battle_simulation.ts` |
| **FIX-05** | Battle FSM, Replay Turn Resolution & Reporter | Replays forzaban strings estáticos de slots de turnos pasados en sustituciones, `waitForBattleReady` no observaba reactividad con `skipImmediate: true`, `Revival Blessing` intentaba seleccionar candidatos vivos en lugar de debilitados, y el logger utilizaba columnas desordenadas | Se implementó derivación dinámica de slots mediante `ShowdownTeamResolver.getShowdownSlotForUid`, se corrigió la selección de candidatos fainted en `switchAction.ts`, se aseguró la reactividad de `waitForBattleReady`, se creó el reporter unificado secuencial `playwright_fuzzer_reporter.ts` y se agregó balanceador Round-Robin por peso de lote | `src/logic/battle/actions/switchAction.ts`<br>`src/logic/battle/actions/switchWorkerTurn.ts`<br>`src/logic/battle/battleTurnChoiceHelper.ts`<br>`src/logic/battle/battleFaintSequence.ts`<br>`src/logic/battle/helpers/battleResolutionHelpers.ts`<br>`src/logic/battle/helpers/showdownExecutor.ts`<br>`src/logic/battle/battleDebug.ts`<br>`scripts/e2e/logging/playwright_fuzzer_reporter.ts`<br>`playwright.config.ts`<br>`scripts/e2e/battle/battle_fsm_sync.simulation.ts` |
| **FIX-06** | Terminal FSM Check & Streamed Logger | En `heuristic_ai.simulation.ts`, combates ganados por OHKO transicionaban a `REWARDS_PHASE` y `EXIT_BATTLE` haciendo que `waitForWaitInput` esperara indefinidamente; además `run_sequential_simulations.ts` usaba `execSync` bloqueante que retenía la salida | Se añadió `REWARDS_PHASE` y `EXIT_BATTLE` como estados terminales en `waitForWaitInput`, se verificó `checkBattleOver` antes de seleccionar movimientos, se unificó el prefijo emoji en `base_runner_logger.ts` y se migró el runner a `spawn` con streaming en tiempo real | `scripts/e2e/e2e_helpers.ts`<br>`scripts/e2e/battle/heuristic_ai.simulation.ts`<br>`scripts/e2e/logging/base_runner_logger.ts`<br>`scripts/e2e/run_sequential_simulations.ts` |

---

## 🧪 Tests de Reproducción de Casos Extraídos (Vitest Inmutable)

| ID | Caso / Fixture Extraído | Test de Unidad de Reproducción | Estado | Causa Raíz Diagnosticada y Reparada |
|:---|:---|:---|:---|:---|
| **FIX-01** | Validación de nombres de entrenador con límite de 15 caracteres | `tests/node/validation/test_auth_schemas.test.ts` | 🟢 **PASS** | `validateTrainerName` rechaza nombres > 15 caracteres y acepta <= 15 |
| **FIX-02** | Validación de serialización de `INITIAL_STATE` contra `validateSaveData` | `tests/node/system/initial_state_save_validation.test.ts` | 🟢 **PASS** | `passiveTeamActive` boolean requerido definido en `INITIAL_STATE` |
| **FIX-03** | Validación de serialización de Pokémon nivel 100 con `expNeeded: 0` | `tests/node/pokemon/level100_exp_serialization.test.ts` | 🟢 **PASS** | `expNeeded` finito (0) serializa limpiamente en JSON y pasa `validateSaveData` |
| **FIX-04** | Desacoplamiento de fases de curación pre-turn y post-turn | `tests/node/battle/battle_cheat_manager.test.ts` | 🟢 **PASS** | Validación de orden y ejecución de trucos atómicos por turno |
| **FIX-05** | Validación de selección de Pokémon debilitado en peticiones `reviving: true` | `tests/node/battle/revival_blessing_switch_resolution.test.ts` | 🟢 **PASS** | Derivación dinámica de slots e inmunidad a desincronización de switches |
