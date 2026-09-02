# Simulation Run — 2026-09-01
Session: 9e8d41

## Scope
Verification of Loading Gate, Web Worker off-thread save processing, boot coordination, page reload combinations, offline network restoration, single source of truth data centralisation, and regression checks across relevant simulation suites.

## Status
Overall: COMPLETE
Last action: Verified all 10 potentially affected E2E simulation suites with 100% PASS
Resumed at: Complete

## Dynamic Simulation Table
| # | Suite / Archivo de Simulación | Casos / Elementos | Comando de Ejecución Directa | Estado |
|:---|:---|:---|:---|:---|
| **0** | `scripts/e2e/save/loading_gate_and_reload.simulation.ts` | **4** tests | `npx playwright test scripts/e2e/save/loading_gate_and_reload.simulation.ts` | 🟢 **100% PASS** |
| **1** | `scripts/e2e/save/save_shield_restrictions.simulation.ts` | **2** tests | `npx playwright test scripts/e2e/save/save_shield_restrictions.simulation.ts` | 🟢 **100% PASS** |
| **2** | `scripts/e2e/battle/battle_capture_reload_persistence.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/battle/battle_capture_reload_persistence.simulation.ts` | 🟢 **100% PASS** |
| **3** | `scripts/e2e/battle/battle_anti_cheat_refresh.simulation.ts` | **5** tests | `npx playwright test scripts/e2e/battle/battle_anti_cheat_refresh.simulation.ts` | 🟢 **100% PASS** |
| **4** | `scripts/e2e/breeding/breeding_lifecycle.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/breeding/breeding_lifecycle.simulation.ts` | 🟢 **100% PASS** |
| **5** | `scripts/e2e/missions/daycare_missions.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/missions/daycare_missions.simulation.ts` | 🟢 **100% PASS** |
| **6** | `scripts/e2e/events/fishing_event_experience.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/events/fishing_event_experience.simulation.ts` | 🟢 **100% PASS** |
| **7** | `scripts/e2e/events/multi_species_competition.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/events/multi_species_competition.simulation.ts` | 🟢 **100% PASS** |
| **8** | `scripts/e2e/gts/gts_transactions.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/gts/gts_transactions.simulation.ts` | 🟢 **100% PASS** |
| **9** | `scripts/e2e/gyms/gym_progression.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/gyms/gym_progression.simulation.ts` | 🟢 **100% PASS** |

## Applied Code Fixes & Structural Refactors (Commit Ledger)
| ID | Area / Component | Root Cause / Issue | Fix Applied | Files Touched |
|---|---|---|---|---|
| FIX-01 | Web Worker Save Processing | Main thread CPU blocking on GZIP decompression and JSON parsing | Created dedicated `save.worker.ts` and `saveWorkerClient.ts` bridge | `src/logic/workers/save.worker.ts`, `src/logic/workers/saveWorkerClient.ts`, `src/logic/auth/loadService.ts` |
| FIX-02 | Boot Coordinator & Query Deduplication | Redundant store loading calls from multiple home widgets | Added `isLoaded` and `inFlightPromise` deduplication with `Promise.allSettled` parallel preloading | `src/stores/game.ts`, `src/stores/war.ts`, `src/stores/events.ts`, `src/stores/breeding.ts`, `src/stores/gts.ts` |
| FIX-03 | Loading Gate Zero Pop-in | Premature modal release before async chunk and child widgets mounted | Statically imported `HomeView` and synced gate release to `nextTick` + `requestAnimationFrame` | `src/views/game/MainGameView.vue`, `src/views/game/HomeView.vue` |
| FIX-04 | Hybrid Environment Logger | Web Worker attempting to import `node:util` in browser | Implemented `'importScripts' in self` check without type casts | `src/logic/utils/logger.ts` |
| FIX-05 | Web Worker Legality Debug Mode | Dev/test mode flag (`window.__VITE_DEBUG__`) inaccessible in Web Workers | Added `import.meta.env.DEV` check to `saveSanitizer.ts` | `src/logic/auth/saveSanitizer.ts` |
| FIX-06 | Home Economy Sprite Resolution | `poke.species` can be undefined in raw GTS market listings | Fallback to `poke.id || poke.species` in `getListingSprite` | `src/components/home/HomeEconomyWidget.vue` |
