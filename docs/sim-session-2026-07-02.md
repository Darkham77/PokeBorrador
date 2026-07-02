# Sesión de Simulación E2E — 2026-07-02

> Continuación autorizada de la sesión `366212`. Este documento preserva el estado
> completo para retomar en otra sesión sin perder contexto.

## Estado General

| Layer | Comando | Estado |
| --- | --- | --- |
| Layer 1 — unit (node:test) | `npm run test:node` | ✅ PASS 3273/3273 |
| Layer 2 — integration (Vitest) | `npm run test` | ✅ PASS 121 specs · Moves 682/0/0 · Abilities 283/0/0 · Items 228/0/0 |
| Layer 3 — E2E Playwright | `npm run test:e2e` | 🔴 EN PROGRESO — `fsm_sync.spec.ts` bloqueado |

---

## Fixes Aplicados Esta Sesión

### 1. `itemEffects.ts` — `healHp` rechazaba Pokémon con HP lleno

**Problema**: `healHp` retornaba `success: false` si `currentHp >= maxHp`, impidiendo que el fuzzer usara pociones en Pokémon con vida completa (el modal no mostraba targets válidos).

**Fix**: Cambiar a retornar `success: true` con mensaje "HP ya está al máximo" para Pokémon en plena salud. Solo retorna `false` si el Pokémon está debilitado (`hp <= 0`).

**Archivo**: `src/logic/items/itemEffects.ts` línea 197+

---

### 2. `orchestrator.ts` — Semilla RNG no inyectable desde tests

**Problema**: El worker de Showdown generaba semilla aleatoria ignorando la semilla del fuzzer, haciendo los combates no-deterministas entre fuzzer y E2E.

**Fix**: `initBattleSequence` lee `window.__VITE_DEBUG__.battleSeed` si existe antes de generar semilla aleatoria. El spec E2E inyecta la semilla del certified case.

**Archivo**: `src/logic/battle/orchestrator.ts` línea 516+

---

### 3. `showdown.worker.ts` — Tipo incorrecto para seed

**Problema**: El worker pasaba `seedArr.join(',')` (string) a Showdown `new Battle({ seed })` pero la API espera `number[]`.

**Fix**: Pasar `seedArr` (array) directamente.

**Archivo**: `src/logic/battle/showdown.worker.ts` línea 46

---

### 4. `battleTurn.ts` — Interceptor de choices enemigos para tests

**Fix**: `executeTurn` y `runEnemyAction` leen `window.__VITE_DEBUG__.enemyChoicesQueue` si existe para determinismo en E2E.

**Archivo**: `src/logic/battle/battleTurn.ts` líneas 132 y 301

---

### 5. `showdownAdapter.ts` — EVs no mapeados al crear PokemonSet

**Problema**: Los EVs del Pokémon siempre se enviaban como 0 a Showdown, causando diferencias de stats entre fuzzer y juego.

**Fix**: Mapear `poke.evs?.hp ?? 0` etc. para cada stat.

**Archivo**: `src/logic/battle/showdownAdapter.ts` línea 58

---

### 6. `pokemonDebugService.ts` — Parámetro `name` faltante

**Fix**: Añadido `name = null` como parámetro desestructurable en `createDebugPokemon` y aplicado con `if (name) p.name = name`.

**Archivo**: `src/logic/debug/pokemonDebugService.ts` líneas 73, 104

---

### 7. `run-tester.ts` — `finalState` y `seed` no serializados en certified cases

**Problema**: El JSON de casos certificados no incluía `finalState` (HP final de los 12 Pokémon) ni `seed`, por lo que el E2E no podía verificar paridad ni reproducir con la misma semilla.

**Fix**: Serializar `seed`, `playerChoices`, `enemyChoices`, `ended`, `winner`, `finalState` en el registro de cada batch.

**Archivo**: `scripts/battle-tester/run-tester.ts` líneas 329-341

---

### 8. `battle-agent.ts` — Lógica de useitem eliminada del agente de moves

**Contexto**: El usuario indicó que el fuzzer de movimientos DEBE poder generar items (es comportamiento real del juego). La lógica de `useitem:revive` y `useitem:potion` que estaba en `decide()` del `BattleAgent` se eliminó porque causaba desincronización con el E2E (el choice grabado en `batchChoices` era `useitem:potion:X` pero el E2E no lo manejaba correctamente en todos los casos).

**Estado actual**: `useItemsEnabled` sigue en la clase pero la lógica `useitem` fue removida en esta sesión. **PENDIENTE**: decidir si reintroducirla de forma unificada o mantenerla desactivada.

---

### 9. `fsm_sync.spec.ts` + `e2e_helpers.ts` — Fixes de SWITCH_MENU

**Problema serie**: El E2E intentaba hacer click en movimientos cuando la FSM estaba en `SWITCH_MENU` o `PLAYER_FAINT_SEQ`.

**Fixes aplicados progresivamente**:

1. **`SWITCH_MENU` con choice `switch N`**: Handler ahora usa `.quick-card-override:not(.is-active)` nth(slot-2) — **sidebar, NO modal**. El modal (`.list-item`) era incorrecto.

2. **Botón de movimiento disabled**: Retorna `false` si el botón está disabled (en vez de lanzar timeout), permite que el loop espere al estado correcto.

3. **Índice posicional incluye debilitados**: El selector `:not(.is-fainted)` fue eliminado del conteo — el slot de Showdown es posicional sobre TODA la banca incluyendo debilitados. Solo se excluye `:not(.is-active)`.

4. **Código muerto eliminado**: El bloque `isForcedSwitch` con `.list-item` era código muerto (nunca se ejecutaba porque `SWITCH_MENU` se intercepta antes). Fue eliminado, unificando toda la lógica de switch en una sola regla posicional.

---

## Bug Pendiente — CRITICAL (sin resolver al cerrar sesión)

### `INVALID_CHOICE` en turno 16: Pokémon debilitado como activo

**Error exacto** (del modal de error del juego):

```
INVALID_CHOICE: Elección "move accelerock" rechazada por el simulador para p1.
ActiveMon: P-Poke2-2
condition: "0 fnt", active: true
```

**Síntoma**: El E2E ejecuta un movimiento con un Pokémon debilitado como activo. El juego muestra modal de error y la FSM queda trabada.

**Hipótesis principales**:

A) **El click del switch forzado no se ejecutó**: La tarjeta de la sidebar fue clickeada pero el juego no la reconoció como un switch válido (por algún estado intermedio de la FSM). El Pokémon anterior quedó como activo.

B) **La tarjeta clickeada era el Pokémon debilitado activo**: Si al debilitarse el Pokémon activo **pierde `.is-active`** y gana `.is-fainted`, entonces `:not(.is-active)` incluiría esa tarjeta en el índice 0, y `nth(0)` clickearía al Pokémon debilitado.

- **Investigar**: ¿El Pokémon activo conserva `.is-active` cuando se debilita, o solo tiene `.is-fainted`?
- **Solución propuesta**: Usar `.quick-card-override:not(.is-active):not(.is-fainted)` para el CLICK, pero mantener el conteo total con `:not(.is-active)` para el índice. Esto requiere separar la búsqueda del índice del elemento clickeable.
- **Alternativa más robusta**: Usar `data-pokemon-uid` en las quick-card-override si el componente las expone, y resolver el UID desde el store por slot de Showdown.

C) **Desfase de turnCount**: El choice `switch N` del fuzzer y el turno de la FSM no están alineados. El E2E procesa `switch N` pero el FSM ya avanzó a `WAIT_INPUT` (porque el switch se hizo de forma diferente), y luego el next choice `move X` se ejecuta cuando el Pokémon activo aún tiene HP=0.

**Archivos a investigar**:

- Componente Vue que renderiza `.quick-card-override` (buscar en `src/components/`) → verificar clases CSS cuando el Pokémon activo se debilita
- `tests/e2e/e2e_helpers.ts` líneas 155-193 — lógica actual del handler SWITCH_MENU
- `tests/e2e/battle/fsm_sync.spec.ts` línea 110 — waitForWaitInput y loop de turnCount

---

## Investigaciones Pendientes

### A) Clases CSS de `.quick-card-override` post-debilitación

El switch E2E depende de saber qué clases tiene la tarjeta del Pokémon activo cuando se debilita.
Buscar el componente que renderiza la barra lateral con las tarjetas de equipo.
Comandos útiles:

```bash
grep -r "quick-card-override" src/components/ --include="*.vue" -l
grep -r "is-fainted\|is-active" src/components/ --include="*.vue" -l
```

### B) ¿Los `.quick-card-override` tienen `data-pokemon-uid`?

Si existe ese atributo, la solución más robusta es:

1. Obtener el team del gameStore en orden (team[0]...team[5])
2. El slot de Showdown N = team[N-1]
3. Click en `.quick-card-override[data-pokemon-uid="${team[slot-1].uid}"]`

```bash
grep -r "data-pokemon-uid" src/components/ --include="*.vue" | head -10
```

### C) Paridad de RNG fuzzer ↔ E2E

Investigar si la inyección de semilla via `window.__VITE_DEBUG__.battleSeed` realmente sincroniza el RNG del worker con el del fuzzer Node. La semilla en el fuzzer es `[n,n,n,n]` y en el worker se pasa como array directamente. Verificar que `@pkmn/sim` acepta la misma semilla de ambos lados.

---

## Arquitectura del Sistema de Testing (aprendido esta sesión)

### Flujo certificado completo

```
npm run test (Vitest) 
  → moves_coverage_fuzzer.spec.ts 
  → run-tester.ts [REGENERATE_CASES=true]
  → Simula batallas en Node con @pkmn/sim
  → Graba playerChoices, enemyChoices, finalState, seed en certified_fuzzer_cases.json

npm run test:e2e (Playwright)
  → fsm_sync.spec.ts
  → Lee certified_fuzzer_cases.json
  → Reproduce EXACTAMENTE las mismas batallas en el browser
  → Verifica paridad HP de los 12 Pokémon contra finalState
```

### Reglas del fuzzer (aprendidas)

- `batchChoices` incluye TODOS los choices de P1: `move X`, `switch N`, y opcionalmente `useitem:Y:Z`
- El índice de Showdown es POSICIONAL sobre toda la banca (incluye debilitados)
- `switch N` en forceSwitch: N-1 = índice en `side.pokemon[]`, N-2 = índice en la sidebar del juego (desde 0)
- La sidebar muestra los 5 Pokémon de banca en orden de equipo; el activo tiene `.is-active`

### Dos formas de switch en la UI

1. **Sidebar rápida**: `.quick-card-override` — siempre visible durante `SWITCH_MENU`
2. **Modal MOCHILA/CAMBIAR**: Botón `CAMBIAR` → modal con `.list-item` — acceso alternativo

### Dos formas de usar ítems en la UI

1. **Quick item card**: `.quick-item-card[data-item-id="X"]` — visible en barra lateral para ítems frecuentes
2. **Modal MOCHILA**: Botón `.bag-btn` → `.inventory-item-card` → target `.list-item[data-pokemon-uid]`

---

## Comando para Continuar

```bash
# Regenerar casos certificados con semilla y finalState:
REGENERATE_CASES=true npm run test -- tests/integration/battle/moves_coverage_fuzzer.spec.ts

# Re-correr solo fsm_sync (casos certificados ya generados):
npm run test:e2e -- tests/e2e/battle/fsm_sync.spec.ts

# Investigar componente de sidebar:
grep -r "quick-card-override" src/components/ --include="*.vue" -l
grep -rn "data-pokemon-uid" src/components/ --include="*.vue" | head -20
```

---

## Archivos Modificados Esta Sesión

| Archivo | Tipo de cambio |
| --- | --- |
| `src/logic/items/itemEffects.ts` | Fix bug: healHp full-HP |
| `src/logic/battle/orchestrator.ts` | Inyección de semilla RNG via debug |
| `src/logic/battle/showdown.worker.ts` | Tipo correcto para seed (number[]) |
| `src/logic/battle/battleTurn.ts` | Interceptor enemyChoicesQueue para tests |
| `src/logic/battle/showdownAdapter.ts` | Mapeo de EVs al crear PokemonSet |
| `src/logic/debug/pokemonDebugService.ts` | Parámetro `name` en createDebugPokemon |
| `scripts/battle-tester/run-tester.ts` | Serialización finalState + seed en certified cases |
| `scripts/battle-tester/battle-agent.ts` | Eliminación lógica useitem del agente |
| `tests/e2e/battle/fsm_sync.spec.ts` | Parity check full-team + break fix |
| `tests/e2e/e2e_helpers.ts` | SWITCH_MENU handler unificado, índice posicional |
