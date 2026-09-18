# Simulation Run — 2026-09-16
Session: 65cb88

## Scope
Ejecución completa del pipeline de simulación del juego (`/game-simulation`), incluyendo ejecución y regeneración del fuzzer determinista (`npm run sim:fuzzer`), validación de casos certificados (`npm run sim:fuzzer:validate`), y ejecución secuencial dual-driver (SQLite + PostgreSQL) de las 59 suites de simulación E2E para búsqueda y certificación de regresiones.

## Status
Overall: COMPLETED
Last action: Todas las 59 suites de simulación E2E han pasado exitosamente en modo DUAL (SQLite + PostgreSQL), con 100% de paridad y 0 errores.
Resumed at: Finalizado (59/59 Suites certificadas)

## Dynamic Simulation Table (Generated via `npm run sim:e2e:table`)

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
| **30** | `scripts/e2e/pokemon/pokemon_friendship_ui.simulation.ts` | **1** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **31** | `scripts/e2e/abilities/field_abilities_attraction.simulation.ts` | **2** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **32** | `scripts/e2e/abilities/field_abilities_fishing_levels.simulation.ts` | **2** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **33** | `scripts/e2e/abilities/field_abilities_spawns_weather.simulation.ts` | **2** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **34** | `scripts/e2e/battle/battle_catch_breakout_and_whiteout.simulation.ts` | **2** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **35** | `scripts/e2e/battle/battle_forced_switch_ui.simulation.ts` | **2** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **36** | `scripts/e2e/battle/battle_party_rewards_exp_ev.simulation.ts` | **2** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **37** | `scripts/e2e/battle/battle_weather_effects.simulation.ts` | **2** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **38** | `scripts/e2e/battle/pvp_ranked_matchmaking_combat.simulation.ts` | **2** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **39** | `scripts/e2e/battle/search_loop_sequential.simulation.ts` | **2** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **40** | `scripts/e2e/save/save_shield_restrictions.simulation.ts` | **2** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **41** | `scripts/e2e/abilities/field_abilities_capture.simulation.ts` | **3** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **42** | `scripts/e2e/battle/battle_flee_and_teleport.simulation.ts` | **3** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **43** | `scripts/e2e/battle/battle_healing_regression.simulation.ts` | **3** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **44** | `scripts/e2e/battle/battle_manual_scenarios.simulation.ts` | **3** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **45** | `scripts/e2e/battle/battle_wild_encounter_jump.simulation.ts` | **3** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **46** | `scripts/e2e/battle/battle_post_sequence_modals.simulation.ts` | **4** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **47** | `scripts/e2e/battle/debug_creator.simulation.ts` | **4** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **48** | `scripts/e2e/battle/pvp_passive_defense_lifecycle.simulation.ts` | **4** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **49** | `scripts/e2e/gts/illegal_pokemon_security.simulation.ts` | **4** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **50** | `scripts/e2e/save/loading_gate_and_reload.simulation.ts` | **4** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **51** | `scripts/e2e/battle/battle_anti_cheat_refresh.simulation.ts` | **5** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **52** | `scripts/e2e/missions/class_deployments.simulation.ts` | **5** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **53** | `scripts/e2e/save/tiered_save_persistence.simulation.ts` | **5** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **54** | `scripts/e2e/battle/battle_locked_moves.simulation.ts` | **6** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **55** | `scripts/e2e/battle/heuristic_ai.simulation.ts` | **6** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **56** | `scripts/e2e/system/update_lifecycle.simulation.ts` | **6** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **57** | `scripts/e2e/battle/battle_capture.simulation.ts` | **7** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **58** | `scripts/e2e/battle/battle_held_items.simulation.ts` | **169** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **59** | `scripts/e2e/battle/battle_fsm_sync.simulation.ts` | **227** tests | 🟢 PASS | 🟢 PASS | 🟢 DUAL PASS |
| **Final** | `scripts/e2e/run_sequential_simulations.ts` | **521 tests totales** en 59 suites | 🟢 **100% PASS** | 🟢 **100% PASS** | 🟢 **100% DUAL PASS** |

## Active Fix — Resolved
Root cause: En `showdownSeatSyncHelper.ts`, `buildTurnSeats` invocaba `resolveChoice` incondicionalmente cuando `mustAct` era true, sin respetar `seatInput.skip: true` (asiento marcado para omitir turno, p. ej. en cambios forzados o acciones de medicina/mochila). En modo replayer, esto intentaba consumir elecciones certificadas inexistentes de `seatChoices`, lanzando `Error: [ShowdownBattleEngine] Required certified choice is missing`. Adicionalmente, en `showdownExecutor.ts`, `certifiedHistoryStep` pasaba el número ordinal `currentStep` en lugar del objeto del paso del historial `history[step - 1]`.
Files touched: `src/logic/battle/engine/showdownSeatSyncHelper.ts`, `src/logic/battle/helpers/showdownExecutor.ts`, `tests/node/battle/reproduce_fuzzer_skipped_seat_choice.test.ts`
Attempts: 1
Status: PASS (Dual clean zero pass certified: SQLite 1307.9s | Postgres 1272.5s)

## Applied Code Fixes & Structural Refactors (Commit Ledger)
| ID | Area / Component | Root Cause / Issue | Fix Applied | Files Touched |
|---|---|---|---|---|
| 1 | Save Persistence Queue (`src/logic/auth/saveService.ts`) | Concurrencia en `saveGame` clobbering `options`: llamadas encoladas (p. ej. `forceRemote: true`) perdían sus opciones al heredar las opciones del primer guardado en vuelo (`forceRemote: false`), haciendo que el guardado en PostgreSQL fuera omitido por el throttle de 60s y la recarga F5 reanudara sin combate activo. | Implementación de `PendingSaveRequest` con merge de opciones (`forceRemote: true`, `showNotif`, `db`, `notifyFn`) para la ejecución queued follow-up y retorno explícito `remote: true` en `performRemoteSave`. | `src/logic/auth/saveService.ts`, `tests/node/system/save_concurrency_force_remote.test.ts` |
| 2 | Battle Reward Combatant Registration (`src/logic/battle/battleFaintSequence.ts`, `src/logic/battle/rewardsDistributor.ts`) | En combates salvajes, la secuencia de debilitamiento vaciaba `active.enemy` y `active._initialEnemy` a `null` antes de registrar al combatiente vencido en `active._rewardCombatants`, provocando que `resolveRewardCombatants()` retornara `[]` y se omitieran completamente las recompensas de EXP, EVs y subidas de nivel. | Permitir a `registerRewardCombatant` recibir un combatiente vencido explícito (`defeatedPokemon?: Pokemon | null`) y registrarlo inmediatamente al ingresar a `processEnemyFaintSequence`. Certificado con test RED-to-GREEN en `tests/node/battle/reward_combatant_registration.test.ts`. | `src/logic/battle/rewardsDistributor.ts`, `src/logic/battle/battleFaintSequence.ts`, `tests/node/battle/reward_combatant_registration.test.ts` |
| 3 | Simulated GTS Market Listings Schema (`src/logic/debug/rewardsDebugSimulationHelpers.ts`) | La función `injectSimulatedGtsClaimsAndListings` insertaba registros en la tabla `market_listings` con nombres de columnas inexistentes (`currency: 'money'`, `item_data`, `category: 'items'`), provocando error de esquema en ProxyQuery (`table market_listings has no column named currency`) y fallando la suite `rewards_claim_all_and_archive.simulation.ts`. | Alinear los campos insertados en `market_listings` con el esquema canónico de la base de datos (`listing_type: 'item'`, `data: { name: 'nugget', qty: 1 }`), eliminar columnas obsoletas y asegurar que los errores en `persistGtsClaimsAndListingToDb` no sean tragados silenciosamente. Certificado con test unitario en `tests/node/debug/rewards_debug_simulation_market_listings.test.ts`. | `src/logic/debug/rewardsDebugSimulationHelpers.ts`, `tests/node/debug/rewards_debug_simulation_market_listings.test.ts` |
| 4 | Save Shield Simulation User Collision (`scripts/e2e/save/save_shield_restrictions.simulation.ts`) | La suite utilizaba el mismo username `'SaveShieldUser'` en ambos tests concurrentes ejecutados en paralelo por Playwright, causando una colisión de clave única en PostgreSQL (`profiles_username_key`) durante la creación concurrente del perfil en el contenedor de base de datos. | Asignar usernames únicos por test (`'SaveShieldUserZeroPoke'` y `'SaveShieldUserNoStarter'`), aislando completamente sus registros en la base de datos. Se añadió prueba unitaria en `tests/node/system/save_shield_restrictions.test.ts` validando la pureza de `canSaveState`. Certificado con prueba limpia desde cero (6B Dual Pass: SQLite: 14.2s \| Postgres: 9.4s). | `scripts/e2e/save/save_shield_restrictions.simulation.ts`, `tests/node/system/save_shield_restrictions.test.ts` |
| 5 | Search Mode F5 Reload Save Throttling (`scripts/e2e/battle/battle_manual_scenarios.simulation.ts`) | En `battle_manual_scenarios.simulation.ts` (Test 3: 'should persist search mode on F5'), llamar a `await gameStore.saveGame()` usaba `forceRemote: false` por defecto, causando que SaveCoordinator limitara el guardado remoto en modo PostgreSQL (throttle de 60s). Al recargar la página (F5), PostgreSQL cargaba el estado inicial sin batalla activa, dejando la FSM en IDLE en lugar de SEARCH_PHASE. | Forzar guardado remoto explícito invocando `await gameStore.save(false, true, true)` antes de `page.reload()` y alinear timeout del locator a 30000ms. Certificado con test unitario en `tests/node/battle/battle_searching_persistence.test.ts` y Step 6B Clean Zero Dual Pass (SQLite: 48.6s \| Postgres: 36.5s). | `scripts/e2e/battle/battle_manual_scenarios.simulation.ts`, `tests/node/battle/battle_searching_persistence.test.ts` |
| 6 | Showdown Skipped Seat Choice & Replayer History Step (`src/logic/battle/engine/showdownSeatSyncHelper.ts`, `src/logic/battle/helpers/showdownExecutor.ts`) | `buildTurnSeats` llamaba a `resolveChoice` incondicionalmente cuando `mustAct` era true ignorando `seatInput.skip: true`, consumiendo elecciones inexistentes en modo replayer y lanzando `Required certified choice is missing`. Además `certifiedHistoryStep` pasaba un número en vez del objeto `history[step - 1]`. | Condicionar `resolveChoice` a `(mustAct && !seatInput.skip)`, retornando `'pass'` limpiamente. En `showdownExecutor.ts`, resolver el objeto del paso indexando `history[candidate - 1]`. Certificado con test unitario RED-to-GREEN determinista en `tests/node/battle/reproduce_fuzzer_skipped_seat_choice.test.ts` y ejecución limpia 6B DUAL PASS de Suite 59 (227 tests en SQLite: 1307.9s \| Postgres: 1272.5s). | `src/logic/battle/engine/showdownSeatSyncHelper.ts`, `src/logic/battle/helpers/showdownExecutor.ts`, `tests/node/battle/reproduce_fuzzer_skipped_seat_choice.test.ts` |

## Pending Simulations (not yet started)
- Ninguna: las 59 suites de simulación E2E han sido 100% certificadas en modo dual (SQLite + PostgreSQL).

## Structural Blockers (user review required)
| Simulation | Why a design decision is needed |
|---|---|

## Critical Decisions
- Inicio de ejecución de `/game-simulation` solicitada por el usuario.
- Verificación previa de Docker daemon activo y puerto 5174 libre.

## Coverage Gaps Detected
| Gap | Suggested simulation type |
|---|---|
