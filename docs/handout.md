# Handout de Continuación: Game Simulation Protocol

**Fecha**: 12 de Agosto, 2026  
**ID de Sesión**: `625fd303-6af3-48ae-af2b-b7e6ac2d93a5`  
**Estado General**: `IN_PROGRESS` (Avance ~90% completado, simulaciones de dominio en verde, resta suite final de combate).

---

## 1. Estado de Calidad y Reglas del Proyecto

- **Strict TypeScript & Domain Types (`/domain-type-first` & `AGENTS.md`)**:
  - `npm run lint` pasa **100% limpio (0 errores)**. Todos los tipos de dominio, interfaces y tipos JSON wrapper respetan `AGENTS.md`.
  - Se eliminaron todos los `as any` y `as unknown as` del proyecto.
- **Prohibición de Rolback / Checkout**:
  - **REGLA DEL USUARIO**: No hacer `git checkout` ni rollback. Todo el progreso no commiteado debe conservarse intacto. No realizar commits hasta petición explícita del usuario.
- **Interacciones 100% UI Oficiales & 5s Action Timeout**:
  - El simulador no utiliza bypasses, ni modifica FSMs ni infla timeouts. El timeout por acción se mantiene estrictamente en **5s** (`MAX_PER_ACTION_TIMEOUT_MS = 5000`).

---

## 2. Resumen de Cambios Recientes Implementados

1. **Apertura Automática de Modal en Switch Forzado (`SWITCH_MENU`)**:
   - `src/components/battle/BattleArenaControls.vue`: Se añadió un watcher reactivo que abre automáticamente el modal `PokemonSelectionModal` cuando `battleStore.currentSubState === 'SWITCH_MENU'`, evitando loops infinitos de actualización en Vue.
2. **Prohibición de Cambio sin Banca Disponible**:
   - Cuando no hay Pokémon sanos en la banca, el botón de cambio se deshabilita y se emite un toast informativo. No se permite la apertura del modal sin banca disponible.
3. **Replay Certificado en Action Switch**:
   - `src/logic/battle/actions/switchAction.ts`: La resolución del switch UI para el cliente utiliza la UID del Pokémon seleccionado de la banca.

---

## 3. Estado de las Simulaciones (`simulation_progress.md`)

| Suite | Comando | Estado | Notas |
| --- | --- | --- | --- |
| `sim:fuzzer` | `npm run sim:fuzzer` | **PASS** (100%) | Casos certificados regenerados (`fuzzer_certified_cases.json`). |
| `sim:e2e:save` | `npm run sim:e2e:save` | **PASS** (2/2) | Guardado y restricciones UI. |
| `sim:e2e:gyms` | `npm run sim:e2e:gyms` | **PASS** (1/1) | Desafío y victoria Gimnasio Brock. |
| `sim:e2e:breeding` | `npm run sim:e2e:breeding` | **PASS** (1/1) | Ciclo completo de guardería y eclosión. |
| `sim:e2e:missions` | `npm run sim:e2e:missions` | **PASS** (1/1) | Misiones diarias de guardería. |
| `sim:e2e:gts` | `npm run sim:e2e:gts` | **PASS** (1/1) | Transacción de intercambio dual-browser. |
| `sim:e2e:ai` | `npm run sim:e2e:ai` | **PASS** (6/6) | Verificación de 6 escenarios con IA heurística. |
| `sim:e2e:search` | `npm run sim:e2e:search` | **PASS** (1/1) | Bucle secuencial de 10 combates en hierba. |
| `sim:e2e:combat` | `npm run sim:e2e:combat` | **IN_PROGRESS** | Combate FSM de los 228 casos fuzzer. |
| `sim:e2e` | `npm run sim:e2e` | **PENDING** | Pase final de regresión cruzada. |

---

## 4. Diagnóstico Detallado del Pendiente en `sim:e2e:combat`

Durante la ejecución de la simulación de combate (`battle_fsm_sync.simulation.ts`), el lote de fuzzer #58 (`case-7d49e70df55e`) se detuvo por timeout de Playwright.

**Logs Relevantes Extraídos**:

```text
[E2E-SWITCH-WARN] No valid bench Pokémon available for switch. Closing modal and skipping switch.
[E2E-SWITCH-WARN] No valid bench Pokémon available for switch. Closing modal and skipping switch.
```

**Causa Raíz Identificada**:
En `scripts/e2e/base_battle_simulation.ts` (líneas 161-163):

```typescript
const selectionItem = (await targetBtn.count() > 0 && await targetBtn.isVisible().catch(() => false))
  ? targetBtn
  : this.page.locator('.list-item:not(.is-fainted)').first();
```

Cuando un slot específico de la banca es solicitado para cambio forzado pero ese elemento en `PokemonSelectionModal` tiene la clase `.is-active` o `.disabled` porque es el Pokémon activo o está debilitado, `targetBtn` no es elegible o `hasSelectionItem` retorna `false`.

**Próximo Paso Inmediato para el Siguiente Agente**:

1. Inspeccionar `scripts/e2e/base_battle_simulation.ts` alrededor de la línea 161 para asegurar que al seleccionar el Pokémon de reemplazo en `PokemonSelectionModal`, el selector elija un slot válido disponible con `:not(.is-fainted):not(.is-active)` si el slot objetivo no está disponible.
2. Ejecutar la simulación de combate de prueba para verificar la resolución:

   ```bash
   npx playwright test scripts/e2e/battle/battle_fsm_sync.simulation.ts -g "#58"
   ```

3. Ejecutar la suite completa de combate:

   ```bash
   npm run sim:e2e:combat
   ```

4. Correr la regresión final `npm run sim:e2e` y validar los scripts de auditoría (`npm run lint`, `npm run audit:warnings-diff`, `npm run validate:sql`, `npm run build`).
