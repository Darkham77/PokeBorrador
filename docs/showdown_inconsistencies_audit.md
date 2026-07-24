# 🔍 Auditoría de Inconsistencias: Showdown vs Implementación

> Análisis generado por 4 subagentes Pro en paralelo.  
> Archivos de referencia: `external/pokemon-showdown-code/sim/sim/`  
> Archivos auditados: `scripts/e2e/fuzzer/`, `src/logic/battle/`, `src/stores/battle/`

---

## Leyenda de Severidad

| Ícono | Nivel | Descripción |
| ------- | ------- | ------------- |
| 🔴 | **CRÍTICO** | Causa desyncs, crashes, o viola reglas absolutas del AGENTS.md |
| 🟠 | **ALTO** | Comportamiento incorrecto demostrable en condiciones reales |
| 🟡 | **MEDIO** | Cobertura incompleta, gaps de testing |
| 🟢 | **INFO** | Divergencia intencional, correctamente manejada |

---

## Tabla Maestra de Inconsistencias

| # | Sev. | Categoría | Descripción del Bug | Nuestro Código (archivo:línea) | Showdown Esperado (referencia) | Impacto Real |
| --- | ------ | ----------- | --------------------- | ------------------------------- | ------------------------------- | -------------- |
| 1 | 🔴 | **Zero-Fallback Violation** | `getPoke()` implementa fallback silencioso al slot activo cuando el UID lookup falla, en vez de lanzar error | [`showdownBridge.ts:220-237`](file:///home/franco/Trabajos/PokeBorrador/src/logic/battle/showdownBridge.ts#L220-L237): `return battle.player` | AGENTS.md §3: *"Si no se puede resolver el UID... MUST lanzar un error descriptivo"* | Enmascara desyncronizaciones de UID; datos incorrectos avanzan silenciosamente |
| 2 | 🔴 | **Invalid Choice Ignored** | `choose()` devuelve `false` cuando el choice es inválido, pero este valor se ignora por completo | [`fuzzer_ai_engine.ts:171-172`](file:///home/franco/Trabajos/PokeBorrador/scripts/e2e/fuzzer/core/fuzzer_ai_engine.ts#L171-L172): `simBattle.choose('p1', p1Choice)` sin check | [`battle.ts:3007`](file:///home/franco/Trabajos/PokeBorrador/external/pokemon-showdown-code/sim/sim/battle.ts): `if (!side.choose(input)) { return false; }` | El `stallGuard` existe como parche de este bug. El turn no avanza, el AI repite el mismo choice ilegal infinitamente |
| 3 | 🔴 | **4-Seat Mandate — Force Switch** | En doubles con `forceSwitch: [true, true]`, solo se genera UNA acción (`switch X`), no la lista comma-separated requerida | [`fuzzer_agent.ts:77`](file:///home/franco/Trabajos/PokeBorrador/scripts/e2e/fuzzer/core/fuzzer_agent.ts#L77): retorna `switch X` simple | [`side.ts:546`](file:///home/franco/Trabajos/PokeBorrador/external/pokemon-showdown-code/sim/sim/side.ts): `choiceStrings.length >= this.active.length` | Showdown rechaza el choice incompleto; battle se traba indefinidamente en doubles |
| 4 | 🔴 | **4-Seat Mandate — Active Slot** | `active![0]` hardcodeado en move-selection; no itera sobre todos los slots activos | [`fuzzer_agent.ts:131`](file:///home/franco/Trabajos/PokeBorrador/scripts/e2e/fuzzer/core/fuzzer_agent.ts#L131): `request!.active![0]` | [`side.ts:546`](file:///home/franco/Trabajos/PokeBorrador/external/pokemon-showdown-code/sim/sim/side.ts): respuesta debe tener longitud == `active.length` | Doubles/Triples: solo se envía el choice del slot 0, slots 1+ quedan sin acción → choice rechazado |
| 5 | 🔴 | **4-Seat Mandate — Switch Loop** | El loop de switch decisions también opera sobre `team.find(p => p.active) \|\| team[0]` hardcodeado para 1 slot | [`fuzzer_agent.ts:88`](file:///home/franco/Trabajos/PokeBorrador/scripts/e2e/fuzzer/core/fuzzer_agent.ts#L88): `const activePoke = team.find(p => p.active) \|\| team[0]` | Showdown: `forceSwitch` es un array; debe iterarse para generar un choice por índice `true` | El agente nunca puede manejar múltiples faints simultáneos en doubles |
| 6 | 🟠 | **maybeTrapped Ignorado** | El check de `trapped` ignora completamente el campo `maybeTrapped` de Showdown | [`fuzzer_agent.ts:93`](file:///home/franco/Trabajos/PokeBorrador/scripts/e2e/fuzzer/core/fuzzer_agent.ts#L93): `!!request?.active?.[0]?.trapped` | Showdown expone `maybeTrapped: true` para Arena Trap no revelado. [`side.ts:983`](file:///home/franco/Trabajos/PokeBorrador/external/pokemon-showdown-code/sim/sim/side.ts): lanza `Can't switch: The active Pokémon is trapped` | El AI intenta switches voluntarios cuando hay `maybeTrapped`, Showdown los rechaza → stall |
| 7 | 🟠 | **Trapped Solo Slot 0** | El check de `trapped` usa `active?.[0]` hardcodeado; slots 1+ nunca se verifican | [`fuzzer_agent.ts:93`](file:///home/franco/Trabajos/PokeBorrador/scripts/e2e/fuzzer/core/fuzzer_agent.ts#L93): `active?.[0]?.trapped` | Debe ser `request.active.map(slot => slot.trapped \|\| slot.maybeTrapped)` | En doubles, el Pokémon en slot 1 puede estar trapped; el agente lo ignora e intenta switearlo |
| 8 | 🟠 | **Doubles Format ID** | No existe lógica para generar el format ID correcto para battles doubles | [`showdownAdapter.ts:72`](file:///home/franco/Trabajos/PokeBorrador/src/logic/battle/showdownAdapter.ts#L72): solo genera `gen${N}customgame` | Showdown: [`battle.ts:236`](file:///home/franco/Trabajos/PokeBorrador/external/pokemon-showdown-code/sim/sim/battle.ts): `gameType` determina `activePerHalf`. Doubles requiere `gen${N}doublescustomgame` | Las battles doubles usan la misma config que singles, `activePerHalf=1` en lugar de 2 |
| 9 | 🟠 | **Move Targeting en Doubles** | La IA nunca incluye el target location (`move 1 -1`) en choices de doubles | [`fuzzer_ai_engine.ts:99`](file:///home/franco/Trabajos/PokeBorrador/scripts/e2e/fuzzer/core/fuzzer_ai_engine.ts#L99): `return \`move ${slot + 1}\`` sin target | Showdown acepta `move [slot] [targetLoc]`. Sin `strictChoices`, usa auto-target. Con él, puede rechazar en casos edge | Auto-target funciona en mayoria de casos, pero moves que requieren target explícito fallan |
| 10 | 🟡 | **Mega/Z-move/Tera — Sin Cobertura** | El fuzzer nunca genera choices con modificadores (`mega`, `zmove`, `dynamax`, `terastallize`) | [`fuzzer_agent.ts:178`](file:///home/franco/Trabajos/PokeBorrador/scripts/e2e/fuzzer/core/fuzzer_agent.ts#L178): nunca usa sufijos | Showdown acepta: `move 1 mega`, `move 1 terastallize`, `move 1 zmove`. Ref: [`side.ts:1204`](file:///home/franco/Trabajos/PokeBorrador/external/pokemon-showdown-code/sim/sim/side.ts) | Cero cobertura de Mega Evolution, Z-Moves, Dynamax, y Terastallize en toda la suite de fuzzing |
| 11 | 🟡 | **ChoiceRequest — Campos Faltantes** | La interfaz `ChoiceRequest` no declara los campos opcionales de Showdown para mecánicas avanzadas | [`requestHelper.ts`](file:///home/franco/Trabajos/PokeBorrador/scripts/e2e/fuzzer/core): sin `canMegaEvo`, `canZMove`, `canDynamax`, `canTerastallize`, `maybeTrapped` | Request JSON de Showdown incluye `active[].canMegaEvo`, `active[].canTerastallize`, `active[].maybeTrapped` | Sin los tipos, la lógica que los usa no es type-safe; viola Zero-Any Policy |
| 12 | 🟡 | **Nature Mapping en Español** | `fuzzer_engine.ts` mapea natures usando strings en español que luego se pasan a `statsMap` | [`fuzzer_engine.ts`](file:///home/franco/Trabajos/PokeBorrador/scripts/e2e/fuzzer/core/fuzzer_engine.ts): `'At. Esp'` en lugar de `'spa'` | Showdown usa el ID canónico (`spa`, `spe`, `atk`, `def`, `spd`) para nature stat effects | Potencial desync en cálculo de stats si el mapeo no es 100% biyectivo |
| 13 | 🟢 | **`useitem` Extension** | Choice type `useitem:potion:1` no existe en el protocolo nativo de Showdown | [`e2e_helpers.ts`](file:///home/franco/Trabajos/PokeBorrador/scripts/e2e/e2e_helpers.ts): intercept de `useitem:` | Showdown no tiene este choice; es una extensión RPG del proyecto | **Intencional y correcto.** El bridge lo intercepta antes de llegar al simulador |
| 14 | 🟢 | **Recharge Pseudo-Move** | `recharge` se intercept y se auto-ejecuta sin input del usuario | [`e2e_helpers.ts`](file:///home/franco/Trabajos/PokeBorrador/scripts/e2e/e2e_helpers.ts): ignora choices `moveToken === 'recharge'` | Showdown: Recharge es un turno forzado; el cliente no necesita enviar choice | **Correcto.** El bridge ejecuta automáticamente el recharge en el turno siguiente |
| 15 | 🟢 | **UID Truncation** | Showdown trunca nicknames a 20 chars; nosotros truncamos a 8 (más conservador) | [`showdownUidMapper.ts`](file:///home/franco/Trabajos/PokeBorrador/src/logic/battle/showdownUidMapper.ts): `uid.split('-')[0]` → 8 chars | [`pokemon.ts:358`](file:///home/franco/Trabajos/PokeBorrador/external/pokemon-showdown-code/sim/sim/pokemon.ts): `set.name.substr(0, 20)` | **Correcto.** Nuestro límite más estricto garantiza que el UID nunca sea truncado por Showdown |
| 16 | 🟢 | **Stat Boosts en Request** | Showdown NO envía stat boosts en el request JSON; los enviamos solo por protocolo | [`showdownBridgeStages.ts`](file:///home/franco/Trabajos/PokeBorrador/src/logic/battle/showdownBridgeStages.ts): intercepta `-boost`/`-unboost` | [`pokemon.ts:1188`](file:///home/franco/Trabajos/PokeBorrador/external/pokemon-showdown-code/sim/sim/pokemon.ts): `stats` en request = `baseStoredStats` sin boosts | **Correcto.** Usamos protocol messages, no el request JSON, para boosts |

---

## Agrupación por Módulo Afectado

### `scripts/e2e/fuzzer/core/fuzzer_agent.ts`

Issues: **#3, #4, #5, #6, #7, #10** — El módulo más crítico. Tiene al menos 6 bugs directos.

### `scripts/e2e/fuzzer/core/fuzzer_ai_engine.ts`

Issues: **#2, #9** — Ignora el bool de retorno de `choose()` y no genera targets.

### `src/logic/battle/showdownBridge.ts`

Issues: **#1** — Viola el Zero-Fallback Mandate explícitamente.

### `src/logic/battle/showdownAdapter.ts`

Issues: **#8** — No soporta format ID de doubles.

### `scripts/e2e/fuzzer/core/requestHelper.ts` (o equivalente)

Issues: **#11** — Interfaz TypeScript incompleta.

### `scripts/e2e/fuzzer/core/fuzzer_engine.ts`

Issues: **#12** — Natures en español en lugar de IDs canónicos de Showdown.

---

## Prioridad de Corrección

```text
🔴 P0 — Fixes Inmediatos (rompen correctness del fuzzer):
  #1 → Throw error en getPoke cuando UID no resuelve
  #2 → Chequear bool de choose() y hacer fallback a move válido
  #3 → Generar comma-separated choices para todos los slots activos
  #4 → Iterar request.active[] completo, no solo [0]
  #5 → Iterar forceSwitch[] para generar switch por cada slot true

🟠 P1 — Fixes Importantes (comportamiento incorrecto):
  #6 → Chequear maybeTrapped además de trapped
  #7 → Iterar active[] para trapped check, no solo slot 0
  #8 → Agregar lógica de format ID para doubles en getShowdownFormatId()
  #9 → Agregar target location en choices de doubles

🟡 P2 — Gaps de Cobertura:
  #10 → Agregar modificadores mega/tera/zmove al generador de choices
  #11 → Extender ChoiceRequest con campos faltantes del Showdown request
  #12 → Unificar mapeo de natures al ID canónico de Showdown
```

---

## Showdown Protocol Quick Reference

### Request Types

| `requestType` | Cuándo se envía | Choice esperado |
| --------------- | ----------------- | ----------------- |
| `move` | Inicio de cada turno | `move N [target] [modifier]` |
| `switch` | Pokémon fainta o switch forzado | `switch N` o `pass` para slots que no cambian |
| `team` | Team Preview | `team 1,2,3,...` |
| `wait` | Ya hiciste tu choice, esperando rival | Ninguno |

### Indexing Rules (Showdown)

| Contexto | Base | Ejemplo |
| ---------- | ------ | --------- |
| Move slot | **1-based** | `move 1` = primer move del moveset |
| Switch slot | **1-based (team index)** | `switch 2` = 2do Pokémon del equipo total |
| Target location | **Relativo al campo** | `move 1 -1` = enemigo de la izquierda |
| Team preview | **1-based** | `team 1,3,2` = orden de lead |

### Choice String Grammar

```text
choice     ::= action ("," action)*
action     ::= move_action | switch_action | pass | shift
move_action::= "move" " " (moveId | slotIndex) (" " targetLoc)? (" " modifier)?
switch_action::= "switch" " " slotIndex
modifier   ::= "mega" | "megax" | "megay" | "zmove" | "dynamax" | "terastallize"
targetLoc  ::= integer (positive = ally side, negative = enemy side)
```
