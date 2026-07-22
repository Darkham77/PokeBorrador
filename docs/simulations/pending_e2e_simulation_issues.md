# Reporte de Errores Pendientes en Simulaciones E2E (Playwright) — 2026-07-22

## Resumen de Estado
- **Pruebas Unitarias (`npm run test:node`)**: ✅ **PASS** (130 archivos, 746/746 pruebas pasadas).
- **Verificación de Tipos (`npm run validate:types`)**: ✅ **PASS** (0 errores de TypeScript).
- **Fuzzer Headless (`npm run sim:fuzzer`)**: ✅ **PASS** (100/100 batallas de paridad).
- **Simulación E2E Navegador (`npm run sim:e2e:combat`)**: ⚠️ **UNSTABLE / PENDING**

---

## Detalles de Errores Detectados en Simulaciones E2E

### 1. Desincronización de Acciones al Forzar Cambio por Debilitamiento (`SWITCH_MENU`)
- **Síntoma**: Durante ejecuciones E2E deterministas en navegador real (`battle_fsm_sync.simulation.ts`), la simulación arroja el siguiente error:
  ```text
  [E2E-SCRIPTED-AI] Attempted to execute move choice "move 3" but a switch is required (subState: SWITCH_MENU, activePoke: Mew (HP: 0)). Simulation has desynced.
  ```
- **Causa Raíz**: 
  1. En `showdownBridgeMisc.ts`, la guarda `isFsmAnimActive` difiere la asignación activa de `activeBattle.player` a `bState.switchingToPlayer` mientras corren las animaciones GSAP de retirada (`POKEMON_RECALL`, `POKEMON_CALL`, etc.).
  2. Mientras las animaciones GSAP están activas, `activeBattle.player` permanece apuntando al Pokémon debilitado (HP: 0).
  3. `scriptedAI.ts` / `e2e_helpers.ts` intenta consumir la siguiente decisión antes de que la FSM complete la transición de animación y promueva `switchingToPlayer` a `player`.

---

## Archivos Modificados en este Commit
- `src/logic/battle/showdownBridgeMisc.ts`: Preservación estricta de la guarda `isFsmAnimActive` para diferir `switchingToPlayer` y `switchingToEnemy` durante animaciones GSAP.
- `src/logic/battle/helpers/requestHelper.ts`: Detección estricta de requests `force-switch` mediante `forceSwitch.some(x => !!x)`.
- `src/logic/battle/helpers/showdownBattleRunner.ts`: Alineamiento de búsqueda de elecciones `switch` al procesar requests `force-switch`.
- `src/logic/battle/ai/scriptedAI.ts`: Sincronización de índices globales `p1ChoiceIdx` y `p2ChoiceIdx` en `window.__VITE_DEBUG__`.
- `src/stores/debug.ts`: Importación dinámica de `testResetShowdownWorker` para no interferir con los mocks de Vitest.
- `scripts/e2e/base_battle_simulation.ts` y `scripts/e2e/e2e_helpers.ts`: Consumo de la API debug global expuesta en `window.__VITE_DEBUG__`.
- `playwright.config.ts`: Restauración de `workers: '25%'` para paralelización dinámica según cores de CPU.

---

## Plan de Acción Pendiente
1. Refactorizar la espera reactiva en `e2e_helpers.ts` para que la ejecución de la siguiente acción espere a que `store.fsm.currentSubState` salga de `POKEMON_CALL` y `switchingToPlayer` sea consumido por `activeBattle.player`.
2. Validar que 100% de la suite Playwright pase en verde manteniendo intactas todas las animaciones GSAP y los timeouts de seguridad (5s / 15s).
