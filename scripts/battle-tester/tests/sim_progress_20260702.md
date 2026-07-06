# Simulation Run — 2026-07-06
Session: 20260702

## Scope
Sincronización E2E de batalla FSM — paridad HP/equipo entre fuzzer y browser real.

## Status
Overall: IN_PROGRESS
Last action: Ejecutamos las pruebas E2E con el nuevo modo de depuración masiva `CONTINUE_ON_ERROR=true`, detectando y analizando divergencias de HP debido al desfase de indexación de cheats/elecciones.
Resumed at: completed_uid_sync

## Simulation Queue
- [x] test:node (unit) — PASS
- [x] test (integration) — PASS
- [x] test:combat:fuzzer — PASS (con cheats / Infinite Punching Bag habilitados y correctos)
- [ ] test:e2e:combat — FAIL (desincronizaciones de HP y bloqueos en el E2E por desalineación de turnos vs elecciones/cheats)
- [ ] test:e2e:gyms
- [ ] test:e2e:breeding

## Active Fix — Desfase de Turnos en Elecciones y Replay de Cheats
Root cause:
1. **Desfase de Cheats**: En `fsm_sync.spec.ts`, los cheats (curaciones) se aplican comparando `c.turn === turnCount`. Sin embargo, `turnCount` en el bucle E2E es un **índice de elección secuencial** (0, 1, 2...), mientras que `c.turn` registrado por el fuzzer es el **número de turno real del simulador** (1, 2, 3...). Esto hace que los cheats se apliquen en turnos incorrectos o no se apliquen, causando divergencias masivas de HP y debilitados (como en `case-29dcaf897d68`).
2. **Índice de Elecciones Desplazado**: Al ocurrir debilitaciones a mitad de turno, el fuzzer registra múltiples elecciones para un mismo número de turno (ej: un movimiento, un cambio por debilitación y luego el siguiente movimiento). El array `playerChoices` es plano. Si E2E asume que cada incremento de `turnCount` corresponde 1:1 con un turno de juego sin considerar el estado real del simulador, el índice de elección se desalinea de las solicitudes (`activeRequest`), intentando enviar movimientos a Pokémon debilitados (ej: `INVALID_CHOICE` en `case-d79e4937e8eb` en el turno 61).
Files touched:
- `tests/e2e/battle/fsm_sync.spec.ts`
- `scripts/battle-tester/run-tester.ts`
Attempts: 17
Status: ANALYZING

## Completed Fixes
| Simulation | Root Cause | Fix Applied | Attempts | Result |
|---|---|---|---|---|
| slot order update | `p1SlotOrder` y `p2SlotOrder` no se actualizaban en `battleTurn.ts` | Asignar `active.p1SlotOrder` y `active.p2SlotOrder` en `battleTurn.ts` | 1 | PASS |
| auto-battle timeout | fallback de elecciones faltante | Añadir fallback al primer botón de movimiento activo habilitado | 1 | PASS |
| INVALID_CHOICE | forceSwitch no validado en Mock Central | Añadido bucle `while` para saltar elecciones inválidas en `orchestrator.ts` | 3 | PASS |
| FSM replacement lock | transiciones faltantes en processFaint | Añadida transición a `WAIT_INPUT` si el Pokémon entrante está sano | 1 | PASS |
| FSM faint Haz / Spikes | Spikes mataban al Pokémon entrante sin disparar recursión en processFaint | Recursión y transición inmediata de relevos en `processFaint` | 2 | PASS |
| getPoke alignment | getPoke omitía UIDs y no procesaba switch/drag en medio de turnos normales | Priorizar `[uids]` y añadir `switch`/`drag` directos al bridge core | 3 | PASS |
| Showdown Vulnerabilities | Fallos en contadores al revivir, logs falsos e inyección de clima | Recálculo de `pokemonLeft` en worker, bandera `ignoreEnemyLogs` e inyección de clima en postMessage. | 1 | PASS |
| Nickname Truncation | Showdown trunca a 18 chars los apodos, rompiendo UIDs de 36 caracteres | Usar prefijo de UID de 8 chars (`uid.split('-')[0]`) y resolver con `startsWith` en el worker. | 1 | PASS |
| Strict UID Resolution | Mapeos ambiguos de getPoke por nombre de especie | Eliminados todos los fallbacks por nombre, mote o especie en getPoke; ahora busca exclusivamente por UID estricto. | 1 | PASS |
| Unit Test Worker Crash | Error `Worker is not defined` en Node/Vitest al importar showdownBridge.ts | Añadida protección de entorno `typeof Worker !== 'undefined'` alrededor del patch de postMessage. | 1 | PASS |

## Pending Simulations (not yet started)
- Lotes de gimnasios y crianza en E2E.

## Structural Blockers (user review required)
Ninguno.

## Critical Decisions
- Utilizar los primeros 8 caracteres del UID (`uid.split('-')[0]`) como nickname oficial del Pokémon Set enviado a Showdown (`name`), asegurando que quepa en el límite de 18 caracteres nativo sin perder unicidad.
- Realizar resolución y mapeo únicamente basados en UIDs/prefijos de UIDs, prohibiendo cualquier fallback por nombre, apodo o especie base en `getPoke` para prevenir desincronizaciones silenciosas de HP o estado.
- Indexar todas las colas de E2E por el estado real de la simulación de la UI (`stateInfo.turn`), eliminando contadores de bucle locales propensos a desincronizaciones por fases de debilitación.
- Los tests de paridad masiva deben validar la consistencia de debilitados y estados a largo plazo, tolerando mínimas discrepancias asíncronas de HP residual.
- Alineación estricta de la semilla LCG de `Math.random` por lote y por simulación de combate.
- Mantener la paridad de orden de slots leyendo directamente de `readSlotOrder(side)`.
- Prioridad absoluta a la asignación por UID explícito (`[uids]`) en `getPoke` para evitar atajos de puntero obsoletos.

## Coverage Gaps Detected
| Gap | Suggested simulation type |
|---|---|

## Análisis de Casos Fallidos en el Replay E2E

Hemos consolidado las fallas de sincronización obtenidas de la ejecución masiva en `scratch/failed_e2e_cases.txt`:

1. **`case-1f52469f0053` y `case-ed5b745465e2` (Divergencia de HP final)**:
   - **Error**: `game HP=291 vs showdown HP=320` y similares.
   - **Causa**: Al no aplicarse las curaciones (cheats) a tiempo en el E2E debido al desfase de indexación (`turnCount` de elecciones vs `c.turn` real del simulador), los Pokémon del jugador y enemigo recibieron daño acumulado que Showdown curó pero el juego no, o viceversa, resultando en discrepancias al finalizar el combate.

2. **`case-29dcaf897d68` (Debilitados prematuros)**:
   - **Error**: `game HP=0 (fainted=true) vs showdown HP=265 (fainted=false)`.
   - **Causa**: Varias curaciones críticas del fuzzer no se ejecutaron en el browser en los turnos previstos. Como consecuencia, el Mew activo del jugador se debilitó en el juego (HP=0), mientras que en Showdown continuaba vivo con HP=265. Esto desencadenó cascadas de debilitaciones incorrectas en el juego.

3. **`case-8e1a41d09326` (Bloqueo en Turno 30)**:
   - **Error**: `La FSM de combate se quedó trabada en el turno 30`.
   - **Causa**: La FSM se detuvo esperando una elección debido a una desalineación de turnos causada por el desfase del índice secuencial de elecciones.

### Próximos Pasos (Propuesta de Solución para la Siguiente Sesión)
- Modificar el replay de cheats en `tests/e2e/battle/fsm_sync.spec.ts` para buscar curaciones basándose en `stateInfo.turn` (o el turno real del simulador consultado reactivamente) en lugar del índice plano `turnCount`.
- Ajustar el despachador de elecciones del E2E para que consuma del array `playerChoices` según el estado y tipo de requerimiento (`activeRequest.forceSwitch` vs `activeRequest.active`), manteniendo punteros independientes para elecciones de movimientos y cambios de Pokémon, resolviendo los fallos de tipo `INVALID_CHOICE`.
