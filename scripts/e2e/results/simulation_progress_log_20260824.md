# Simulation Run — 2026-08-24
Session: 114300

## Scope
Validación exhaustiva E2E del juego tras la remediación de Fallow y modularización SRP (<500 líneas), reutilizando los casos certificados del fuzzer sin regeneración innecesaria.

## Status
Overall: PASSED (100% Complete)
Last action: Ejecución completa de las 15 suites de simulación E2E, auditoría integral y linting
Completed at: 12:45

## Dynamic Simulation Table (Generated via `npm run sim:e2e:table`)

| # | Suite / Archivo de Simulación | Casos / Elementos | Comando de Ejecución Directa | Estado |
|:---|:---|:---|:---|:---|
| **0** | `scripts/e2e/fuzzer/runners/run_all_fuzzers.ts` | **962 elementos** / 393 batallas | `npm run sim:fuzzer` | 🟢 **100% PASS** (Reutilizando certificados) |
| **1** | `scripts/e2e/battle/debug_ash_save.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/battle/debug_ash_save.simulation.ts` | 🟢 **100% PASS** (11.9s) |
| **2** | `scripts/e2e/battle/search_loop_sequential.simulation.ts` | **1** tests (10 batallas) | `npx playwright test scripts/e2e/battle/search_loop_sequential.simulation.ts` | 🟢 **100% PASS** (37.4s) |
| **3** | `scripts/e2e/breeding/breeding_lifecycle.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/breeding/breeding_lifecycle.simulation.ts` | 🟢 **100% PASS** (19.8s) |
| **4** | `scripts/e2e/gts/gts_transactions.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/gts/gts_transactions.simulation.ts` | 🟢 **100% PASS** (20.7s) |
| **5** | `scripts/e2e/gyms/gym_progression.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/gyms/gym_progression.simulation.ts` | 🟢 **100% PASS** (13.1s) |
| **6** | `scripts/e2e/missions/daycare_missions.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/missions/daycare_missions.simulation.ts` | 🟢 **100% PASS** (10.9s) |
| **7** | `scripts/e2e/battle/battle_weather_effects.simulation.ts` | **2** tests | `npx playwright test scripts/e2e/battle/battle_weather_effects.simulation.ts` | 🟢 **100% PASS** (15.9s) |
| **8** | `scripts/e2e/save/save_shield_restrictions.simulation.ts` | **2** tests | `npx playwright test scripts/e2e/save/save_shield_restrictions.simulation.ts` | 🟢 **100% PASS** (12.4s) |
| **9** | `scripts/e2e/battle/battle_healing_regression.simulation.ts` | **3** tests | `npx playwright test scripts/e2e/battle/battle_healing_regression.simulation.ts` | 🟢 **100% PASS** (18.4s) |
| **10** | `scripts/e2e/battle/battle_manual_scenarios.simulation.ts` | **3** tests | `npx playwright test scripts/e2e/battle/battle_manual_scenarios.simulation.ts` | 🟢 **100% PASS** (18.7s) |
| **11** | `scripts/e2e/battle/battle_capture.simulation.ts` | **4** tests | `npx playwright test scripts/e2e/battle/battle_capture.simulation.ts` | 🟢 **100% PASS** (19.7s) |
| **12** | `scripts/e2e/battle/debug_creator.simulation.ts` | **4** tests | `npx playwright test scripts/e2e/battle/debug_creator.simulation.ts` | 🟢 **100% PASS** (17.3s) |
| **13** | `scripts/e2e/battle/heuristic_ai.simulation.ts` | **6** tests | `npx playwright test scripts/e2e/battle/heuristic_ai.simulation.ts` | 🟢 **100% PASS** (52.9s) |
| **14** | `scripts/e2e/battle/battle_held_items.simulation.ts` | **169** tests | `npx playwright test scripts/e2e/battle/battle_held_items.simulation.ts` | 🟢 **100% PASS** (596.5s) |
| **15** | `scripts/e2e/battle/battle_fsm_sync.simulation.ts` | **227** tests | `npx playwright test scripts/e2e/battle/battle_fsm_sync.simulation.ts` | 🟢 **100% PASS** (1290.8s) |
| **Final** | `scripts/e2e/run_sequential_simulations.ts` | **426 tests totales** en 15 suites | `npm run sim:e2e` | 🟢 **100% PASS** (426/426) |

## Applied Code Fixes & Structural Refactors (Commit Ledger)
| ID | Area / Component | Root Cause / Issue | Fix Applied | Files Touched |
|---|---|---|---|---|
| FIX-01 | Logic / Schemas | Hotspot > 500 líneas en `schemas.ts` | Modularización en subesquemas | `src/logic/validation/schemas.ts`, `subschemas/*` |
| FIX-02 | Profile / Avatar | Hotspot > 500 líneas en `TrainerAvatar.vue` | Extracción de composable GSAP | `src/components/profile/TrainerAvatar.vue`, `useTrainerAvatarAnim.ts` |
| FIX-03 | Modals / Inventory | Hotspot > 500 líneas en `InventoryModal.vue` | Co-localización de SCSS | `src/components/modals/InventoryModal.vue`, `InventoryModal.styles.scss` |
| FIX-04 | DB / SQLite | Hotspot > 500 líneas en `sqliteEngine.ts` | Extracción de query builder | `src/logic/db/sqliteEngine.ts`, `sqliteQueryBuilder.ts` |
| FIX-05 | Modals / Routes | Hotspot > 500 líneas en `RouteSpawnsModal.vue` | Extracción de composable perks | `src/components/modals/RouteSpawnsModal.vue`, `useRoutePerks.ts` |
| FIX-06 | Battle / Arena | Hotspot > 500 líneas en `BattleArena.vue` | Co-localización de SCSS | `src/components/battle/BattleArena.vue`, `BattleArena.styles.scss` |
| FIX-07 | Battle / Combatant | Hotspot > 500 líneas en `BattleCombatant.vue` | Extracción de hazards y sprite loop | `src/components/battle/BattleCombatant.vue`, `BattleGroundHazards.vue` |
| FIX-08 | Breeding / Warehouse | Hotspot > 500 líneas en `EggWarehouse.vue` | Co-localización de SCSS | `src/components/breeding/EggWarehouse.vue`, `EggWarehouse.styles.scss` |
| FIX-09 | Navigation / HUD | Hotspot > 500 líneas en `HUD_Navigation.vue` | Extracción de subgrupos de menú | `src/components/ui/HUD_Navigation.vue`, `HUD_Navigation*.vue` |
| FIX-10 | Modals / Events | Hotspot > 500 líneas en `EventCard.vue` | Co-localización de SCSS | `src/components/modals/EventCard.vue`, `EventCard.styles.scss` |
| FIX-11 | Adventure / Sim | Hotspot > 500 líneas en `useAdventureSimulation.ts` | Extracción de travel loop y constantes | `src/composables/adventure/useAdventureSimulation.ts`, `useAdventureTravelLoop.ts` |
| FIX-12 | Social / Validation | `claimItemSchema` requería `type` a nivel raíz que no existe en tabla `claim_queue` | Se añadieron `user_id?: string` y `type?: string` opcionales en DTO y schema | `src/types/system/game.ts`, `src/logic/validation/subschemas/socialSchemas.ts` |

## Pending Simulations (not yet started)
- Ninguna. Todas las suites han finalizado con 100% de éxito.

## Structural Blockers (user review required)
- Ninguno.

## Critical Decisions
- Reutilizar `fuzzer_certified_cases.json` existente para no invalidar casos certificados ni gastar cómputo innecesario, siguiendo la indicación expresa del usuario.
- Ejecutar suites no-combate primero (`breeding`, `gts`, `gyms`, `missions`, `save`) antes de las suites pesadas de combate.
- Se reparó `claimItemSchema` en `socialSchemas.ts` para alinear el esquema con la estructura real de la tabla `claim_queue`.
