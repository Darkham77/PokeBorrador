# Simulation Run — 2026-07-12
Session: 080800

## Scope
Reparar la mayor cantidad de casos posibles usando la simulación de juego E2E y determinista de Playwright para lograr paridad 1:1 absoluta.

## Status
Overall: COMPLETE
Last action: Suite de combates finalizada exitosamente con paridad matemática unificada y sincronización de banca activa (32/32 Passed).

## Simulation Queue
- [x] sim:e2e:combat — PASS



## Completed Fixes
| Simulation | Root Cause | Fix Applied | Attempts | Result |
|---|---|---|---|---|
| Lote #24 | HP de la UI sobrescribía cheats de curación en el worker. | Protegido HP en worker para omitir HP UI desactualizado contra valores máximos restaurados. | 1 | PASS |
| Lote #24 | Cheats aplicados un turno tarde debido a forceSwitch. | Ajustada ventana temporal de cheats en worker a `ch.turn <= battle.turn + 1`. | 1 | PASS |
| Lote #24 | Elecciones del oponente ausentes en turnos normales y switches. | Modificado `battleTurn.ts` y `switchAction.ts` para interceptar `nextEnemyChoice` desde window. | 1 | PASS |
| Lote #24 | Semilla determinista inestable por tipos array-like. | Robustecido `battleSeedManager.ts` con conversiones explícitas de array a numéricos de 16 bits. | 1 | PASS |
| Lote #24 | Pokémon resucitados permanecían inactivos en el simulador. | Modificado `cheats.ts` para forzar `faintQueued = false` y `fainted = false` en Showdown. | 1 | PASS |
| Lote #25 | Disparidad de HP y stats base entre fuzzer, replayer y UI (651 vs 714) por no usar el provider del RPG y limpiar EVs a 0 en E2E. | Unificada la resolución en `resolveBaseStats` y centralizado el parche en `patchShowdownSpreadModify`. Grabado `.stats` en el JSON corrigiendo el bug de `p.position` en fuzzer y habilitada la sincronización de banca en worker. | 1 | PASS |
| Clima (E2E) | Bug de doble mapeo en `orchestrator.ts` que anulaba climas visuales (raindance) y selectores CSS desactualizados (.battle-arena-view). | Corregido el mapeo doble para leer `battleState.weather.type` directamente, cambiado selector de atmósfera a `.battle-arena` y usado `forceFlee()` asíncrono para salida limpia. | 1 | PASS |
| Cría/Combate (E2E) | Bloqueo de persistencia en recargas por el Save Shield debido a falta de `starterChosen` en la preparación del test. | Configurado `starterChosen = true` en las inicializaciones de los tests de Playwright antes de llamar a `saveGame()`. | 1 | PASS |
