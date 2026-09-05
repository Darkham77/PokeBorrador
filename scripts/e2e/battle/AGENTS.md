# Purpose

Battle-related scenario simulations verifying FSM synchronization, GSAP animations, held items effects, and weather system parity within the browser.

## Ownership

QA / Automation Engineers.

## Local Contracts

- Playwright simulations run turn-by-turn until the battle reaches absolute completion (over === true).
- Every Playwright combat must initialize one current fuzzer-certified scenario and reproduce its immutable seed, `history`, `playerChoices`, `enemyChoices`, recorded game actions, and IPB flags through the shared `ShowdownBattleRunner`. All subsequent gameplay, including opening/closing UI, move selection, switching, bag use, targeting, fleeing, confirmation, movement, and battle exit, must use visible official controls. A manual combat setup or real-AI browser decision stream is invalid. Certified IPB healing flags remain permitted deterministic parity instrumentation.
- **Simulator Modularization & Shared Base Inheritance Contract**: Simulation suites MUST NOT implement infrastructure harness logic (such as reading checkpoints, calculating offsets, handling `test.skip` loops, or buffering failure logs). All batch-driven suites MUST delegate test registration to `registerCertifiedBatchTests` in `scripts/e2e/helpers/batchSimulationHarness.ts`. Non-batch suites MUST inherit setup, inventory seeding, and turn execution methods directly from `BaseBattleSimulation`, which provides both modular granular helpers (`setupWildBattle`, `setupTrainerBattle`, `seedInventory`, `setMapWeather`) and a unified declarative `setupBattleScenario(options)` method to eliminate ad-hoc `page.evaluate` store manipulation blocks across individual simulation suites.
- **Worker-Scoped Page Pool & 7-Pillar Atomic Reset Contract**: Batch-driven simulation suites (`battle_held_items.simulation.ts`, `battle_fsm_sync.simulation.ts`) MUST NOT instantiate a new browser context or page for every individual batch. Instead, they MUST delegate batch execution to `registerCertifiedBatchTests` in `scripts/e2e/helpers/batchSimulationHarness.ts`, which maintains a persistent worker-scoped page pool (`WorkerSessionPool`). Each concurrent Playwright worker retains a single warm browser context and page dedicated to its isolated user (`Worker_${workerIndex}`). Between consecutive batches on a reused page, the harness MUST execute `BaseBattleSimulation.resetToCleanState()`, enforcing the 7-pillar low-level atomic reset (Showdown worker termination, GSAP timeline purge, Pinia store wipe, DOM toast cleanup, PRNG seed re-initialization, E2E promise purge, and PostgreSQL save deletion). If any test fails, the worker context MUST be destroyed immediately under the Fail-Fast mandate (`maxFailures: 1`) to eliminate cascading contamination.

## Work Guidance

- Ensure `fsm_sync.sim.ts` covers the batch movement/ability combinations.
- Write specific simulations for held items (`held_items.sim.ts`) and weather conditions (`weather.sim.ts`).
- `rocket_police_criminality.simulation.ts` covers Team Rocket criminality progression, visual HUD scaling (`#criminality-bar`), scaled SWAT police encounters, and post-battle resolution resets.
- `battle_party_rewards_exp_ev.simulation.ts` covers canonical Gen VI–IX party-wide Exp and EV distribution, 100% undivided EV yield, `expshare` boost, strict 0 HP fainted exclusion, Power item isolation, and capture rewards.

## Verification

- **Replay Headless (Recomendado/Rápido):** Si necesitas verificar paridad de HP, FSM, estados de combate o depurar errores de lógica de combate fuzzer, **NUNCA** utilices Playwright. Usa el replayer headless en Node.js que ejecuta Showdown directamente y corre en 1-2 segundos:
  - Ejecutar un caso: `$env:TEST_CASE_ID="case-47212c07bc5d"; npm run sim:fuzzer:trace`
  - Ejecutar varios casos: `$env:TEST_CASE_ID="case-47212c07bc5d,case-006487488a68"; npm run sim:fuzzer:trace`
- **Simulaciones E2E (Navegador):** Usa Playwright (`npm run sim:e2e:combat`) únicamente para regresiones finales de flujo o para verificar animaciones GSAP y UI:
  - Filtrar por lote del fuzzer: `$env:TEST_BATCH="21"; npm run sim:e2e:combat`
  - Filtrar por rango o lista de lotes: `$env:TEST_BATCH="1,3,5"; npm run sim:e2e:combat` (formatos soportados: `"3"`, `"1-5"`, o `"1,3,5"`)

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
