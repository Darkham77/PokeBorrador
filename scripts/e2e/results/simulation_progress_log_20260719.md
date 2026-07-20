# Simulation Run — 2026-07-19
Session: bba8e2

## Scope
Reparar todas las fallas de los simuladores E2E y certificar la paridad del lote de fuzzer de items #1 (items fuzzer).

## Status
Overall: IN_PROGRESS
Last action: Corregido `showdownExecutor.ts` para unificar el cálculo de `p1NeedsAction` / `p2NeedsAction` usando `requiresAction` y evitar desincronización de índices de elecciones en Playwright.
Resumed at: sim:e2e:combat

## Completed — Lint & TypeScript (100% limpio)

| Check | Result |
|---|---|
| `validate:types` (vue-tsc) | ✅ 0 errores |
| `eslint . --cache` | ✅ 0 errores |
| `lint:md` (markdownlint) | ✅ 0 errores |
| `test:node` (3357 unit tests) | ✅ PASS |

## Root Causes Fixed (lint/TS, combat, breeding & GTS hangs)

| File | Error | Fix |
|---|---|---|
| `src/logic/battle/actions/switchAction.ts` | Crash `INVALID_CHOICE` con `"pass"` del fuzzer | Interceptar la elección `"pass"` y traducirla a skip flags en el worker durante switches no forzados. |
| `src/logic/battle/showdownAdapter.ts` | Pokémon iniciaban con 0 HP en simulación offline/fuzzer | Corregido monkey-patch `spreadModify` para mapear correctamente `maxHp` a `hp` en minúsculas para Showdown. |
| `src/logic/battle/showdown.worker.ts` | Doble consumo de trucos (cheats) post-turno | Corregidos filtros en showdown.worker.ts para aplicar trucos exactamente en el turno correspondiente y evitar consumirlos antes de tiempo. |
| `src/logic/battle/helpers/battleCheatManager.ts` | Lógica de cheats fragmentada y errática | Creado `BattleCheatManager` to centralizar pre-turn/post-turn checks y evitar parches ad-hoc redundantes. |
| `src/logic/battle/orchestrator.ts` | Trucos no aplicados en simulación E2E | Inyectado el arreglo de trucos en el payload de `INIT_BATTLE` enviado al worker. |
| `scripts/e2e/e2e_helpers.ts` | Desincronización por inputs de movimientos inválidos en forceSwitch | Modificada la validación en `isPlayerChoiceValid` para que marque como inválidos los movimientos durante forceSwitch, saltándolos adecuadamente. |
| `src/logic/battle/helpers/showdownExecutor.ts` | Desincronización de índices de elecciones (falsos positivos en p1NeedsAction/p2NeedsAction) | Unificado el cálculo de `p1NeedsAction` y `p2NeedsAction` usando la función `requiresAction` para coincidir 1:1 con `showdown.worker.ts`. |

## Simulation Queue

- [x] test:node (unit) — 3357/3357 PASS ✅
- [x] lint/build — 0 errores ✅
- [x] sim:e2e:gyms (gym_progression) — 1/1 PASS ✅
- [x] sim:e2e:breeding — 1/1 PASS ✅
- [x] sim:e2e:gts — 1/1 PASS ✅
- [x] sim:e2e:missions — 1/1 PASS ✅
- [/] sim:e2e:combat — IN_PROGRESS (Ejecutando suite completa con CONTINUE_ON_ERROR=true)

## Active Fix — sim:e2e:combat
Root cause: Desincronización de índices de elecciones P1/P2 en la UI debido a cálculos asimétricos de `p1NeedsAction` / `p2NeedsAction` entre `showdownExecutor.ts` (usado por el cliente) y `showdown.worker.ts` (usado por el simulador).
Files touched: `src/logic/battle/helpers/showdownExecutor.ts`
Attempts: 1
Status: PENDING_RERUN

## Completed Fixes
| Simulation | Root Cause | Fix Applied | Attempts | Result |
|---|---|---|---|---|
| sim:e2e:combat | Divergencia por stats sin HP en monkey-patch | Corregido el mapeo de `maxHp` a `hp` en `spreadModify` y regenerados los casos del fuzzer de items. | 1 | PASSING_LOCAL |
| sim:e2e:combat (lote 26) | Desincronización en forceSwitch por cheats tardíos y elecciones inválidas | Creado `BattleCheatManager`, inyectados cheats en `INIT_BATTLE` y corregido `isPlayerChoiceValid`. | 2 | PASS ✅ |

## Pending Simulations (not yet started)
- sim:e2e (full clean run con todos los lotes de items regenerados)

## Structural Blockers (user review required)
| Simulation | Why a design decision is needed |
|---|---|

## Critical Decisions
1. **Centralizar en BattleCheatManager**: Todos los trucos se controlan en un único punto pre/post-turno usando el gestor unificado.
2. **Inyección en INIT_BATTLE**: Pasar el estado de cheats al inicio de la batalla de forma nativa.
3. **Consistencia en requiresAction**: Todas las capas del simulador (fuzzer, worker, executor) deben usar la misma función `requiresAction` para decidir si un lado necesita elección.

## Coverage Gaps Detected
| Gap | Suggested simulation type |
|---|---|
