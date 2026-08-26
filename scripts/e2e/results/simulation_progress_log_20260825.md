# Simulation Run — 2026-08-25
Session: 922293

## Scope
Full `/game-simulation` protocol execution across all 17 simulation suites (435 total tests) with strict zero-fallback governance, event-driven joystick protocol, Showdown 1:1 math and state synchronization, and zero-error audit.

## Status
Overall: IN_PROGRESS
Last action: Regenerated certified cases and launched full E2E simulation suites (npm run sim:e2e).
Resumed at: Step 2 (Full E2E Simulation Execution across 17 suites / 435 tests)

## Dynamic Simulation Table (Generated via `npm run sim:e2e:table`)

| # | Suite / Archivo de Simulación | Casos / Elementos | Comando de Ejecución Directa | Estado |
|:---|:---|:---|:---|:---|
| **0** | `scripts/e2e/fuzzer/runners/run_all_fuzzers.ts` | **962 elementos** / 393 batallas | `npm run sim:fuzzer` | 🟢 **100% PASS** |
| **1** | `scripts/e2e/battle/debug_ash_save.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/battle/debug_ash_save.simulation.ts` | 🟢 **100% PASS** |
| **2** | `scripts/e2e/battle/search_loop_sequential.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/battle/search_loop_sequential.simulation.ts` | ⏳ Pendiente |
| **3** | `scripts/e2e/breeding/breeding_lifecycle.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/breeding/breeding_lifecycle.simulation.ts` | ⏳ Pendiente |
| **4** | `scripts/e2e/gts/gts_transactions.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/gts/gts_transactions.simulation.ts` | ⏳ Pendiente |
| **5** | `scripts/e2e/gyms/gym_progression.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/gyms/gym_progression.simulation.ts` | ⏳ Pendiente |
| **6** | `scripts/e2e/missions/daycare_missions.simulation.ts` | **1** tests | `npx playwright test scripts/e2e/missions/daycare_missions.simulation.ts` | ⏳ Pendiente |
| **7** | `scripts/e2e/battle/battle_weather_effects.simulation.ts` | **2** tests | `npx playwright test scripts/e2e/battle/battle_weather_effects.simulation.ts` | ⏳ Pendiente |
| **8** | `scripts/e2e/save/save_shield_restrictions.simulation.ts` | **2** tests | `npx playwright test scripts/e2e/save/save_shield_restrictions.simulation.ts` | ⏳ Pendiente |
| **9** | `scripts/e2e/battle/battle_healing_regression.simulation.ts` | **3** tests | `npx playwright test scripts/e2e/battle/battle_healing_regression.simulation.ts` | ⏳ Pendiente |
| **10** | `scripts/e2e/battle/battle_manual_scenarios.simulation.ts` | **3** tests | `npx playwright test scripts/e2e/battle/battle_manual_scenarios.simulation.ts` | ⏳ Pendiente |
| **11** | `scripts/e2e/battle/battle_capture.simulation.ts` | **4** tests | `npx playwright test scripts/e2e/battle/battle_capture.simulation.ts` | ⏳ Pendiente |
| **12** | `scripts/e2e/battle/debug_creator.simulation.ts` | **4** tests | `npx playwright test scripts/e2e/battle/debug_creator.simulation.ts` | ⏳ Pendiente |
| **13** | `scripts/e2e/gts/illegal_pokemon_security.simulation.ts` | **4** tests | `npx playwright test scripts/e2e/gts/illegal_pokemon_security.simulation.ts` | ⏳ Pendiente |
| **14** | `scripts/e2e/battle/battle_anti_cheat_refresh.simulation.ts` | **5** tests | `npx playwright test scripts/e2e/battle/battle_anti_cheat_refresh.simulation.ts` | ⏳ Pendiente |
| **15** | `scripts/e2e/battle/heuristic_ai.simulation.ts` | **6** tests | `npx playwright test scripts/e2e/battle/heuristic_ai.simulation.ts` | ⏳ Pendiente |
| **16** | `scripts/e2e/battle/battle_held_items.simulation.ts` | **169** tests | `npx playwright test scripts/e2e/battle/battle_held_items.simulation.ts` | ⏳ Pendiente |
| **17** | `scripts/e2e/battle/battle_fsm_sync.simulation.ts` | **227** tests | `npx playwright test scripts/e2e/battle/battle_fsm_sync.simulation.ts` | 🔄 EN PROGRESO (Lotes #1, #2, #5 Verificados) |
| **Final** | `scripts/e2e/run_sequential_simulations.ts` | **435 tests totales** en 17 suites | `npm run sim:e2e` | ⏳ Pendiente tras validación individual |

## Active Fix — `scripts/e2e/battle/battle_fsm_sync.simulation.ts` (Lote #3)
Root cause:
1. Web Worker PRNG initialization discrepancy: string-formatted seed vs 4-number seed tuple `[w, x, y, z]` passed to `new Battle({ seed })` causing internal Showdown string hashing instead of raw word seeding.
2. Scripted replay cursor double-advancement / misdirection during enemy forced switch resolution in `battleFaintSequence.ts`.
Files touched:
- `src/logic/battle/showdown.worker.ts`
- `src/logic/battle/helpers/seedInitializer.ts`
- `src/logic/battle/battleFaintSequence.ts`
Attempts: 1
Status: FIXING

## Applied Code Fixes & Structural Refactors (Commit Ledger)
| ID | Area / Component | Root Cause / Issue | Fix Applied | Files Touched |
|---|---|---|---|---|
| FIX-01 | `scripts/e2e/base_battle_simulation.ts` | Legacy `.name ?? .species` fallbacks in test harness | Strict UID access and clean properties | `scripts/e2e/base_battle_simulation.ts` |
| FIX-02 | `scripts/e2e/fuzzer/core/fuzzer_engine.ts` | Fallback species name derivations in fuzzer | Strict canonical species ID resolution | `scripts/e2e/fuzzer/core/fuzzer_engine.ts` |
| FIX-03 | `scripts/e2e/fuzzer/core/fuzzer_medicine_cases.ts` | Ternary fallback on medicineTargetUid | Clean validation guard | `scripts/e2e/fuzzer/core/fuzzer_medicine_cases.ts` |

## Pending Simulations (not yet started)
- `scripts/e2e/battle/battle_fsm_sync.simulation.ts` (Batches 3, 4, 6..227)
- Suites #1 through #16

## Structural Blockers (user review required)
None.

## Critical Decisions
- All animations execute at 100x GSAP speed in simulations (`SIMULATION_GSAP_TIME_SCALE = 100`), preserving 100% of tween registrations, callbacks, and FSM transitions, and playing at 1x in production.
- Passive joystick protocol: Playwright waits exclusively for typed events (`battle-ready-for-input`, `battle-forced-switch-required`) before clicking official `#id` controls.
- 0 audit errors across 1,437 files.
