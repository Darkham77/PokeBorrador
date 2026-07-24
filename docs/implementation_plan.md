# Plan de Trabajo: Finalización del Sistema de Dominancia de Mapas

Este plan de trabajo detalla las tareas necesarias para completar al 100% el **Sistema de Dominancia de Mapas** en Poké Vicio, garantizando paridad total entre los documentos de diseño (`dominancia_mapas_plan.md`, `dominancia_prompts.md`, `war_system_manual.md`) y el codebase moderno en Vue 3 / Pinia / TypeScript.

---

## User Review Required

> [!IMPORTANT]
> **Puntos clave para revisión y confirmación del usuario:**
>
> 1. **Resolución Semanal vía SQL/RPC en Supabase**: La resolución de la dominancia semanal (`resolve_weekly_dominance`) se ejecutará mediante una función almacenada SQL / RPC en Supabase para congelar y consolidar la dominancia por mapa de la semana anterior directamente en la base de datos.
> 2. **Zonas de Conflicto Diarias**: Se actualizarán las zonas de conflicto diarias de 5 a **12 mapas** de forma determinística por hash diario.
> 3. **Puntos por Tier de Guardián**: Se ajustarán los puntos otorgados al capturar un Guardián según su rareza (Common: 150 PT, Rare: 300 PT, Elite: 750 PT). Derrotarlo otorgará el 70% de dichos puntos.
> 4. **Hitos y Bonus Semanal de Monedas**: Al iniciar la fase de dominancia o finalizar la semana, los usuarios recibirán monedas en función de sus PT totales acumulados en la semana + 50 monedas extra si su facción ganó la mayoría de los mapas.

---

## Open Questions

> [!NOTE]
> ¿Tienes alguna preferencia sobre modificar alguna de las cantidades de Monedas de Guerra o los hitos semanales antes de proceder con la implementación?

---

## Proposed Changes

### Componente: Lógica del Motor de Guerra (`src/logic/war/`)

---

#### [MODIFY] [guardianEngine.ts](file:///c:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/logic/war/guardianEngine.ts)

- Actualizar `getConflictZones()` para seleccionar **12 mapas de conflicto diarios** determinísticamente en lugar de 5.
- Actualizar los puntos de la tabla `GUARDIAN_POOL`:
  - `common`: 150 PT
  - `rare`: 300 PT
  - `elite`: 750 PT

---

#### [MODIFY] [warEngine.ts](file:///c:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/logic/war/warEngine.ts)

- Confirmar y formalizar la tabla de recompensas por hitos semanales (`WEEKLY_REWARD_MILESTONES`) y las utilidades para calcular la semana anterior (`getPreviousWeekId`).

---

### Componente: Estado y Store de Guerra (`src/stores/war.ts`)

---

#### [MODIFY] [war.ts](file:///c:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/stores/war.ts)

- Implementar la función `resolveWeekIfNeeded()`:
  - Detectar cambio de semana o inicio de Fase de Dominancia.
  - Leer los puntos de la semana anterior en `war_points`, agrupar por mapa y calcular el bando ganador (`union` vs `poder`).
  - Guardar/Upsert los resultados en `war_dominance`.
- Implementar la función `distributeWeeklyWarCoins()`:
  - Calcular los PT totales aportados por el jugador durante la semana.
  - Determinar las Monedas de Guerra correspondientes según los hitos alcanzados (hasta 150 monedas).
  - Verificar si el bando del jugador dominó la mayoría de los mapas para otorgar el bonus de victoria (+50 monedas).
  - Actualizar `state.warCoins` y notificar al usuario.
- Integrar `resolveWeekIfNeeded()` al inicio de `loadWarData()`.

---

### Componente: Interfaz y Flujo del Guardián (`src/components/war/` & Batalla)

---

#### [MODIFY] [WarDashboard.vue](file:///c:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/components/war/WarDashboard.vue)

- Asegurar que el banner de fase y los contadores muestren correctamente la información de mapas dominados y la cuenta regresiva o estado de resolución semanal.

---

## Verification Plan

### Automated Tests

- Ejecutar suite de pruebas unitarias del motor de guerra con `npm run lint` / `npm run test` (si aplica para `warEngine` y `guardianEngine`).

### Manual Verification

1. **Verificación de Zonas de Conflicto y Guardianes**:
   - Abrir la consola y probar `getConflictZones()` para comprobar que genera 12 mapas de conflicto únicos.
   - Generar un encuentro con un Guardián Élite y comprobar que otorga 750 PT al capturarlo o 525 PT (70%) al derrotarlo.
2. **Verificación de Cierre Semanal**:
   - Simular un cambio de semana o llamar a `resolveWeekIfNeeded()` en el store para verificar la inserción en `war_dominance` y la correcta adjudicación de Monedas de Guerra en el perfil del jugador.
