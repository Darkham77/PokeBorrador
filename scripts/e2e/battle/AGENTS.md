# Purpose

Battle-related scenario simulations verifying FSM synchronization, GSAP animations, held items effects, and weather system parity within the browser.

## Ownership

QA / Automation Engineers.

## Local Contracts

- Playwright simulations run turn-by-turn until the battle reaches absolute completion (over === true).
- Every Playwright combat must initialize one current fuzzer-certified scenario and reproduce its immutable seed, `history`, `playerChoices`, `enemyChoices`, recorded game actions, and IPB flags through the shared `ShowdownBattleRunner`. All subsequent gameplay, including opening/closing UI, move selection, switching, bag use, targeting, fleeing, confirmation, movement, and battle exit, must use visible official controls. A manual combat setup or real-AI browser decision stream is invalid. Certified IPB healing flags remain permitted deterministic parity instrumentation.

## Work Guidance

- Ensure `fsm_sync.sim.ts` covers the batch movement/ability combinations.
- Write specific simulations for held items (`held_items.sim.ts`) and weather conditions (`weather.sim.ts`).

## Verification

- **Replay Headless (Recomendado/Rápido):** Si necesitas verificar paridad de HP, FSM, estados de combate o depurar errores de lógica de combate fuzzer, **NUNCA** utilices Playwright. Usa el replayer headless en Node.js que ejecuta Showdown directamente y corre en 1-2 segundos:
  - Ejecutar un caso: `$env:TEST_CASE_ID="case-47212c07bc5d"; npm run sim:fuzzer:trace`
  - Ejecutar varios casos: `$env:TEST_CASE_ID="case-47212c07bc5d,case-006487488a68"; npm run sim:fuzzer:trace`
- **Simulaciones E2E (Navegador):** Usa Playwright (`npm run sim:e2e:battle`) únicamente para regresiones finales de flujo o para verificar animaciones GSAP y UI:
  - Filtrar por casos específicos: `$env:TEST_CASE_ID="case-47212c07bc5d,case-006487488a68"; npm run sim:e2e:combat`
  - Filtrar por lote del fuzzer: `npm run sim:e2e:combat -- -g "lote #21"`
  - Filtrar por rango o lista de lotes: `$env:TEST_BATCH="1,3,5"; npm run sim:e2e:combat` (formatos soportados: `"3"`, `"1-5"`, o `"1,3,5"`)

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
