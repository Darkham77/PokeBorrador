# Showdown Bridge — Implementation Guide

> This document describes how this project consumes `@pkmn/sim` and how to extend `showdownBridge.ts`.

---

## Worker Architecture

```text
Vue Component
    └─► battleTurn.ts / battleFlee.ts / switchAction.ts
            └─► showdown.worker.ts  ←── @pkmn/sim (Battle)
                    └─► TURN_SUCCESS { logs: string[] }
                            └─► filterShowdownLogs()
                                    └─► parseShowdownLogLine()  ◄── showdownBridge.ts
```

The worker lives in `src/logic/battle/showdown.worker.ts`. It initializes a `@pkmn/sim` `Battle` instance dynamically using `ACTIVE_SHOWDOWN_FORMAT` (`gen${ACTIVE_GENERATION}customgame@@@!Team Preview`) and delegates decisions to the orchestrator.

---

## Turn Lifecycle

1. `battleTurn.ts` calls `worker.postMessage({ type: 'EXECUTE_TURN', payload: { p1Choice, p2Choice } })`
2. The worker resolves the full turn and returns `{ logs: string[], isOver, winner }`
3. `filterShowdownLogs()` filters `|split|` lines to keep the correct player or spectator perspective
4. The orchestrator iterates through logs **in sequence** using `parseShowdownLogLine()`
5. **If any line is `|faint|`, the loop terminates** (guaranteeing proper faint flow handling)

---

## Log Format

Each log is a pipe-delimited string:

```text
|TYPE|ARG1|ARG2|ARG3|...
```

When parsing in the bridge:

```ts
const parts = line.split('|').map(p => p.trim());
const type  = parts[1];   // Always the message type
// parts[0] is '' (empty string before leading pipe)
// parts[2], parts[3]... are arguments
```

### Side Identification (p1/p2)

```ts
const getSide = (rawId: string): 'player' | 'enemy' | null => {
  if (rawId.startsWith('p1a:') || rawId.startsWith('p1:')) return 'player';
  if (rawId.startsWith('p2a:') || rawId.startsWith('p2:')) return 'enemy';
  return null;
};
```

`p1` = player, `p2` = enemy (project convention: player is always `p1`).

### Optional Context Tags

Many logs append optional context tags at the end:

| Tag | Meaning |
| --- | --- |
| `[from] move: X` | Effect caused by move X |
| `[from] ability: X` | Effect caused by ability X |
| `[from] item: X` | Effect caused by item X |
| `[of] POKEMON` | Effect belongs to target POKEMON |
| `[upkeep]` | Occurs during upkeep phase |
| `[silent]` | Do not log message to player |
| `[still]` | Do not trigger animation |
| `[eat]` | Berry was consumed |

**Respecting `[silent]`**: If a log contains `[silent]`, do not log messages to the player UI.

---

## Adding a New Log Handler

### 1. Locate Switch Statement in `showdownBridge.ts`

```ts
switch (type) {
  // ... existing handlers ...

  case '-miss': {
    // Handler code here
    break;
  }

  default:
    logger.debug('ShowdownBridge', `Unhandled line: ${line}`);
}
```

### 2. Check for `[silent]`

```ts
case '-miss': {
  if (line.includes('[silent]')) break;
  const attacker = getPoke(parts[2] || '');
  if (attacker) {
    store.addLog(`The attack from ${attacker.name} missed!`, 'log-info', attacker);
  }
  break;
}
```

### 3. Determine Side and Combatant Reference

```ts
const side     = getSide(parts[2] || '');   // 'player' | 'enemy' | null
const poke     = getPoke(parts[2] || '');   // Pokemon object from store SSoT
const logStyle = poke === p ? 'log-player' : 'log-enemy';
```

### 4. Trigger Animations (Optional)

```ts
if (store.animations?.handleShakeRequest) {
  await store.animations.handleShakeRequest({ side });
}
```

---

## `store.addLog` Reference

```ts
store.addLog(message: string, style: LogStyle, source: Pokemon | string)
```

Available styles:
- `'log-player'` — Player message (blue/green)
- `'log-enemy'` — Enemy message (red)
- `'log-info'` — Neutral information (grey/white)
- `'log-error'` — Error message (intense red)

---

## Special Handlers & Conventions

### `-miss` Format
`parts[2]` = attacker (who missed), `parts[3]` = optional target.

### `cant` Reasons
`par` (paralyzed), `slp` (asleep), `frz` (frozen), `attract` (infatuated), `recharge` (recharging), `Disable` (move disabled).

### Side Conditions (`-sidestart` / `-sideend`)
`parts[2]` format is `p1: Name` or `p2: Name` (no position letter `a`). Use `parts[2].startsWith('p1')`.

### Project Conventions
- **No `setTimeout`**: All waits use `await store.animations.awaitTween(...)` or GSAP timelines.
- **No `any`**: Ensure strict typing and interface assertions.
- **No Production `console.log`**: Use `logger.debug()` for development traces.
