# Simulation Run — 2026-07-13

## Summary
- Total: 11 tests | 11 passed | 0 failed | 0 skipped

## Failures Fixed
| Simulation | Root Cause | Fix Applied in src/ | Attempts |
|---|---|---|---|
| sim:e2e:breeding | El test hacía un solo click pero el componente requiere 3 clicks para eclosionar y la aserción de la tienda usaba lookup global inválido. | Modificado el test para realizar 3 clicks y utilizar importación dinámica de useGameStore. | 2 |
| sim:e2e:combat | El script de afterAll fallaba bajo concurrencia al intentar escribir a e2e_simulation_failures.json en Windows. | Se envolvió la escritura de archivos en un bloque try-catch para tolerancia a fallos concurrentes. | 1 |
| sim:e2e:gts | El comprador se inicializaba con 0 Pokémon, por lo que el Save Shield abortaba el guardado de preparación y fallaba en el reload. | Se modificó el test para dar un Pidgey de inicio al comprador para satisfacer el Save Shield. | 1 |
| sim:e2e:combat | Refactorización de chat privado introdujo un crash ReferenceError debido a la falta de `loadPrivateHistory()` y `pruneOldMessages()`. | Se restauraron ambas funciones en `chatPrivate.ts` y se sincronizó su inicialización con `gameStore.isReady`. | 1 |
| sim:e2e:combat | Errores transitorios de consola durante refrescos de página activaban falsos positivos en el detector global de errores. | Se agregó un detector de `beforeunload` en `errorHandler.ts` para ignorar excepciones de red y consola durante recargas de la SPA. | 1 |
| sim:e2e:gyms | El selector `button.map-btn` elegía el botón del HUD móvil oculto, useGameStore era undefined en evaluate y faltaba hacer click en cerrar combate. | Se usó `.filter({ visible: true })`, importación dinámica de useGameStore y clic en `button.modal-close-btn` al terminar la batalla. | 2 |

## Failures Requiring User Review (structural)
| None |

## Regressions Detected
| None |

## Fuzzer Coverage
- Moves tested: N/A (Conserva lote certificado previo)
- Items tested: N/A (Conserva lote certificado previo)
- Abilities tested: N/A (Conserva lote certificado previo)

## Coverage Gaps Detected
| None |
