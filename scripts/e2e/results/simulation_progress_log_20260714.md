# Simulation Run — 2026-07-14
Session: 0ec76d

## Scope
Verificación y estabilización de la suite de simulación E2E de objetos equipados (`battle_held_items.simulation.ts`) y regresiones del fuzzer.

## Status
Overall: IN_PROGRESS
Last action: Fix aplicado en `showdownWorkerClient.ts` — interceptor de mock ahora cubre `p2Choice === "pass"`, reemplazándolo con el siguiente choice válido del array `mockEnemyChoices`. Ejecutando suite sin CONTINUE_ON_ERROR.
Resumed at: Validando fix INVALID_CHOICE pass para p2

## Simulation Queue
- [x] sim:fuzzer:items — regenerados casos con seed y enemyChoices ✅
- [x] sim:e2e (battle_held_items) — 41/41 pass con CONTINUE_ON_ERROR (errores pass p2 ignorados)
- [/] sim:e2e (battle_held_items) — EN PROGRESO sin CONTINUE_ON_ERROR
- [ ] sim:e2e:combat (battle_fsm_sync) — PENDING
- [ ] sim:e2e:combat (battle_healing_regression) — PENDING

## Active Fix — showdownWorkerClient.ts (p2 INVALID_CHOICE: pass)
Root cause:
  El bloque interceptor de `mockEnemyChoices` en `executeTurnInWorker` excluía el caso
  `p2Choice === "pass"` mediante la condición `p2Choice !== ''`. Cuando P1 hacía switch
  y el battleStore enviaba "pass" para P2, el simulador sí pedía una elección real a P2
  pero el interceptor nunca se ejecutaba, dejando "pass" sin reemplazar.
Fix:
  Añadido bloque `else if (p2Choice === 'pass' && mockEnemyChoices)` que corre la misma
  lógica de validación e interception, reemplazando "pass" por el siguiente choice válido
  del array del fuzzer.
Files touched:
- src/logic/battle/showdownWorkerClient.ts
- scripts/e2e/battle/battle_held_items.simulation.ts (cast lint)
Attempts: 7
Status: PENDING_RERUN

## Completed Fixes
| Simulation | Root Cause | Fix Applied | Attempts | Result |
|---|---|---|---|---|
| battle_held_items (Leftovers, Life Orb, Focus Sash) | Fuga de clima y falta de determinismo | Forzado clima a 'clear', habilidad 'chlorophyll' en Focus Sash | 2 | PASS |
| battle_held_items (enemy choices mock) | Doble incremento enemyChoiceIndex | Delegado al interceptor `window.__VITE_DEBUG__.mockEnemyChoices` | 3 | PARTIAL |
| fuzzer_engine.ts (seed + enemyChoices) | Casos sin seed ni historial de elecciones del rival | Añadidos `seed` y `enemyChoices` al JSON certificado | 1 | PASS |
| battle_held_items.simulation.ts (waitForTimeout) | `waitForTimeout(20/500)` causaban delay fijo | Reemplazados por `waitForFunction` determinista | 1 | PASS |
| tests/AGENTS.md | Regla de concurrencia de workers no documentada | Añadida `Playwright Workers Concurrency Rule` | 1 | PASS |
| showdownWorkerClient.ts (pass interception) | Interceptor excluía p2Choice==="pass" | Añadido else-if para "pass" que corre misma lógica de interception | 1 | PENDING_RERUN |

## Pending Simulations (not yet started)
- battle_fsm_sync (full suite)
- battle_healing_regression
- sim:e2e:gyms / gts / breeding / missions / save

## Critical Decisions
- El fuzzer filtra "pass" de batchEnemyChoices (línea 313 de fuzzer_engine.ts). El E2E reconstruye el flujo desde mockEnemyChoices que solo tiene choices reales. Cuando el orden P1/P2 difiere entre fuzzer y E2E, puede haber desalineación.

## Coverage Gaps Detected
| Gap | Suggested simulation type |
|---|---|
| Combates que duran >50 turnos sin KO | Aumentar maxTurns o infinite punching bag más agresivo |
