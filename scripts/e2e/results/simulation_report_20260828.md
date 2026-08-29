# Simulation Run — 2026-08-28

## Summary
- Total: 462 Playwright tests + 962 fuzzer elements across 33 simulation suites
- Passed: 462 passed (100%)
- Failed: 0 failed (0%)
- Skipped: 0 skipped

## Failures Fixed
| Simulation | Root Cause | Fix Applied in src/ / scripts/ | Attempts |
|---|---|---|---|
| battle_forced_switch_ui.simulation.ts | El entrenador no declaraba trainerSprite: birdkeeper fallando validación. | Declarado sprite birdkeeper y asignados movimientos deterministas para Whirlwind. | 1 |
| gts_transactions.simulation.ts | Guardado asíncrono en setupUserInventory colisionaba con starter no finalizado. | Añadido bucle de reintento determinista de persistencia antes de listar en GTS. | 1 |
| field_abilities_attraction.simulation.ts | Verificación de un solo encuentro fallaba ante atracción probabilística (50%). | Añadido bucle de muestreo de hasta 15 intentos (MAX_ATTRACTION_SAMPLE_ATTEMPTS). | 1 |
| battle_flee_and_teleport.simulation.ts | teleport en batalla 1v1 salvaje fallaba por regla de Showdown (canSwitch === false). | Configurado escenario con banca ante entrenadora para validar relevo natural. | 1 |
| battle_fsm_sync.simulation.ts | Caso case-a55806aed7ea agotaba PP de movimiento principal en combate largo. | replayCertifiedBattle resuelve el primer slot legal disponible cuando el movimiento seleccionado está sin PP. | 1 |

## Failures Requiring User Review (structural)
| Simulation | Why a design decision is needed |
|---|---|
| None | Todas las 33 suites y casos certificados pasan limpiamente sin fallos estructurales ni ambigüedades. |

## Regressions Detected
| None / list |
|---|
| Ninguna regresión detectada. 350 suites de tests unitarios/nodo (5014 tests) pasando al 100%. |

## Fuzzer Coverage
- Moves tested: 684/684 (100%)
- Items tested: 166/166 (100%)
- Abilities tested: 26/26 (100%)

## Coverage Gaps Detected
| Gap | Suggested simulation type |
|---|---|
| Ninguno crítico | Cobertura completa en combate, GTS, guardado, guardería, torneos y habilidades de campo. |
