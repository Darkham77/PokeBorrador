# Bridge de Showdown — Guía de Implementación del Proyecto

> Este documento describe cómo este proyecto consume `@pkmn/sim` y cómo extender `showdownBridge.ts`.  
> Para el protocolo oficial completo, ver [`SIM-PROTOCOL.md`](./SIM-PROTOCOL.md).  
> Para el inventario de cobertura del bridge, ver [`../showdown_bridge_protocol_audit.md`](../showdown_bridge_protocol_audit.md).

---

## Arquitectura del Worker

```text
Vue Component
    └─► battleTurn.ts / battleFlee.ts / switchAction.ts
            └─► showdown.worker.ts  ←── @pkmn/sim (Battle)
                    └─► TURN_SUCCESS { logs: string[] }
                            └─► filterShowdownLogs()
                                    └─► parseShowdownLogLine()  ◄── showdownBridge.ts
```

El worker vive en `src/logic/battle/showdown.worker.ts`. Inicializa un `Battle` de `@pkmn/sim` con `gen3customgame@@@!Team Preview` y delega todas las decisiones al orchestrator.

---

## Ciclo de un turno

1. `battleTurn.ts` llama `worker.postMessage({ type: 'EXECUTE_TURN', payload: { p1Choice, p2Choice } })`
2. El worker resuelve el turno completo y devuelve `{ logs: string[], isOver, winner }`
3. `filterShowdownLogs()` filtra las líneas `|split|` para quedarse solo con la versión correcta del jugador o del público
4. El orchestrator itera los logs **en orden** con `parseShowdownLogLine()`
5. **Si alguna línea es `|faint|`, el loop se corta** (bug ya corregido — ver `battleTurn.ts`)

---

## Formato de los logs

Cada log es una string con `|` como separador:

```text
|TYPE|ARG1|ARG2|ARG3|...
```

Al parsear en el bridge:

```ts
const parts = line.split('|').map(p => p.trim());
const type  = parts[1];   // siempre el tipo
// parts[0] es '' (vacío antes del primer |)
// parts[2], parts[3]... son los argumentos
```

### Identificar el lado (p1/p2)

```ts
const getSide = (rawId: string): 'player' | 'enemy' | null => {
  if (rawId.startsWith('p1a:') || rawId.startsWith('p1:')) return 'player';
  if (rawId.startsWith('p2a:') || rawId.startsWith('p2:')) return 'enemy';
  return null;
};
```

`p1` = jugador, `p2` = enemigo (convención del proyecto: el jugador siempre es p1).

### Tags opcionales en los logs

Muchos logs traen tags adicionales pegados al final como contexto extra:

| Tag | Significado |
| --- | --- |
| `[from] move: X` | Efecto causado por el movimiento X |
| `[from] ability: X` | Efecto causado por la habilidad X |
| `[from] item: X` | Efecto causado por el objeto X |
| `[of] POKEMON` | El efecto pertenece a POKEMON |
| `[upkeep]` | Ocurre durante la fase de mantenimiento |
| `[silent]` | No mostrar mensaje al jugador |
| `[still]` | No animar |
| `[eat]` | La baya fue consumida |

**Ignorar el `[silent]`**: si un log tiene `[silent]`, no loguear mensaje al jugador.

---

## Cómo agregar un nuevo handler

### 1. Localizar en `showdownBridge.ts`

```ts
switch (type) {
  // ... handlers existentes ...

  case '-miss': {
    // Tu código aquí
    break;
  }

  default:
    logger.debug('ShowdownBridge', `Línea sin handler: ${line}`);
}
```

### 2. Chequear `[silent]`

```ts
case '-miss': {
  if (line.includes('[silent]')) break;          // respetar silencio
  const attacker = getPoke(parts[2] || '');
  if (attacker) {
    store.addLog(`¡El ataque de ${attacker.name} falló!`, 'log-info', attacker);
  }
  break;
}
```

### 3. Determinar el lado y el Pokémon

```ts
const side     = getSide(parts[2] || '');   // 'player' | 'enemy' | null
const poke     = getPoke(parts[2] || '');   // el objeto Pokémon del store
const logStyle = poke === p ? 'log-player' : 'log-enemy';
```

### 4. Llamar animaciones opcionales

```ts
if (store.animations?.handleShakeRequest) {
  await store.animations.handleShakeRequest({ side });
}
```

---

## Referencia de `store.addLog`

```ts
store.addLog(mensaje: string, estilo: LogStyle, fuente: Pokemon | string)
```

Estilos disponibles:

- `'log-player'` — mensaje del jugador (azul/verde)
- `'log-enemy'`  — mensaje del enemigo (rojo)
- `'log-info'`   — información neutral (gris/blanco)
- `'log-error'`  — error (rojo intenso)

---

## Casos especiales documentados

### `-miss` — Formato real

```text
|-miss|p1a: Gyarados|p2a: Pikachu
       ^ SOURCE       ^ TARGET (opcional)
```

`parts[2]` = atacante (quien falló), `parts[3]` = objetivo (opcional, puede no estar).

### `cant` — Razones conocidas

```text
|cant|p1a: Jolteon|par
|cant|p1a: Jolteon|slp
|cant|p1a: Jolteon|frz
|cant|p1a: Jolteon|attract
|cant|p1a: Jolteon|recharge
|cant|p1a: Jolteon|Disable|Thunderbolt
                             ^ movimiento que intentó usar (solo si Disable)
```

Mapa de razones → mensaje:

```ts
const cantMessages: Record<string, string> = {
  'par':      'está paralizado',
  'slp':      'está dormido',
  'frz':      'está congelado',
  'attract':  'está enamorado',
  'recharge': 'debe recargar',
  'Disable':  'tiene el movimiento desactivado',
};
```

### `-crit`, `-supereffective`, `-resisted` — Sin atacante explícito

```text
|-crit|p2a: Pikachu
|-supereffective|p2a: Pikachu
|-resisted|p2a: Pikachu
```

`parts[2]` = el **defensor** (quien recibe el golpe). No hay info del atacante.

### `-sidestart` / `-sideend` — Condiciones de campo lateral

```text
|-sidestart|p1: Franco|move: Reflect
|-sidestart|p2: Rival|move: Stealth Rock
                       ^ la condición
```

`parts[2]` = `p1: nombre` o `p2: nombre` (no tiene posición `a`). Usar `parts[2].startsWith('p1')` para el lado.

### `|split|` — Ya manejado por `filterShowdownLogs`

No necesitás manejarlo en el bridge. El filter ya lo resuelve antes de que llegue al switch.

---

## Convenciones del proyecto

| Regla | Detalle |
| --- | --- |
| Sin `setTimeout` en el bridge | Todas las esperas usan `await store.animations.awaitTween(...)` o `gsapSleep` |
| Sin `any` | El `type` del switch ya es `string`; usar type guards o assertions concretos |
| Sin logs en producción | Usar `logger.debug()` para el `default`, nunca `console.log` |
| Faint interrumpe | El loop de `parseShowdownLogLine` se corta al encontrar `\|faint\|` — los handlers que llegan post-faint nunca se ejecutan |
| Await de animación | Solo si `store.animations` existe (puede ser undefined en tests) |

---

## Archivos clave

| Archivo | Rol |
| --- | --- |
| [`src/logic/battle/showdownBridge.ts`](../../src/logic/battle/showdownBridge.ts) | Parser y dispatcher de logs |
| [`src/logic/battle/showdown.worker.ts`](../../src/logic/battle/showdown.worker.ts) | Worker que contiene la instancia de `Battle` de `@pkmn/sim` |
| [`src/logic/battle/battleTurn.ts`](../../src/logic/battle/battleTurn.ts) | Orchestrator del turno — llama al worker y itera logs |
| [`src/logic/battle/battleFlee.ts`](../../src/logic/battle/battleFlee.ts) | Orchestrator de huida — también itera logs del contraataque enemigo |
| [`src/types/battle/battleContext.ts`](../../src/types/battle/battleContext.ts) | Tipo `BattleContext` que recibe el bridge |
| [`docs/showdown/SIM-PROTOCOL.md`](./SIM-PROTOCOL.md) | Protocolo oficial completo |
| [`docs/showdown_bridge_protocol_audit.md`](../showdown_bridge_protocol_audit.md) | Inventario de tipos implementados vs faltantes |
