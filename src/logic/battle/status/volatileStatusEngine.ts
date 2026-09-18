import { requireVolatileStatusKey, type Pokemon } from '@/types/pokemon/pokemon';
import type { BattleContext } from '@/types/battle/battleContext';
import type { BattleSide } from '@/types/battle/battle';

const BOUND_DAMAGE_DIVISOR = 16 as const;
const TRAPPED_DAMAGE_DIVISOR = 16 as const;
const INGRAIN_HEAL_DIVISOR = 16 as const;
const CURSE_DAMAGE_DIVISOR = 4 as const;
const MIN_CONFUSION_TURNS = 2 as const;
const RANDOM_CONFUSION_TURNS_RANGE = 3 as const;
const MIN_SLEEP_TURNS = 1 as const;
const RANDOM_SLEEP_TURNS_RANGE = 3 as const;
const MIN_VOLATILE_DAMAGE = 1 as const;
const MIN_VOLATILE_HEAL = 1 as const;

async function applyVolatileDamageEffect(
  pokemon: Pokemon,
  ctx: BattleContext,
  side: BattleSide,
  dmg: number,
  logMessage: string
): Promise<void> {
  pokemon.hp = Math.max(0, pokemon.hp - dmg);
  ctx.addLog(logMessage, 'log-info', pokemon);
  if (ctx.animations?.handleBlinkRequest) {
    await ctx.animations.handleBlinkRequest({ side });
  }
}

async function handlePartiallyTrappedTick(
  pokemon: Pokemon,
  ctx: BattleContext,
  side: BattleSide
): Promise<void> {
  const dmg = Math.max(MIN_VOLATILE_DAMAGE, Math.floor(pokemon.maxHp / TRAPPED_DAMAGE_DIVISOR));
  await applyVolatileDamageEffect(pokemon, ctx, side, dmg, `¡${pokemon.name} sufre por el atrapamiento! (-${dmg} HP)`);
}

async function handleYawnExpiration(
  pokemon: Pokemon,
  ctx: BattleContext,
  side: BattleSide
): Promise<void> {
  delete pokemon.volatileCounters?.['yawn'];
  if (pokemon.status) return;

  if (pokemon.ability === 'insomnia' || pokemon.ability === 'vitalspirit') {
    ctx.addLog(`¡La habilidad de ${pokemon.name} evitó quedarse dormido!`, 'log-info', pokemon);
    return;
  }

  pokemon.status = 'slp';
  pokemon.sleepTurns = MIN_SLEEP_TURNS + Math.floor(Math.random() * RANDOM_SLEEP_TURNS_RANGE);
  ctx.addLog(`¡${pokemon.name} se quedó dormido por el Bostezo!`, 'log-info', pokemon);
  if (ctx.animations?.handleBlinkRequest) {
    await ctx.animations.handleBlinkRequest({ side });
  }
}

function handleLockedMoveExpiration(
  pokemon: Pokemon,
  ctx: BattleContext
): void {
  delete pokemon.volatileCounters?.['lockedmove'];
  if (pokemon.confused) return;

  if (pokemon.ability === 'owntempo') {
    ctx.addLog(`¡El Ritmo Propio de ${pokemon.name} evitó la confusión!`, 'log-info', pokemon);
    return;
  }

  pokemon.confused = MIN_CONFUSION_TURNS + Math.floor(Math.random() * RANDOM_CONFUSION_TURNS_RANGE);
  ctx.addLog(`¡${pokemon.name} se calmó, pero terminó confundido!`, 'log-info', pokemon);
}

function handlePartiallyTrappedExpiration(
  pokemon: Pokemon,
  ctx: BattleContext
): void {
  delete pokemon.volatileCounters?.['partiallytrapped'];
  ctx.addLog(`¡${pokemon.name} se liberó del atrapamiento!`, 'log-info', pokemon);
}

async function handleVolatileExpiration(
  key: string,
  pokemon: Pokemon,
  ctx: BattleContext,
  side: BattleSide
): Promise<void> {
  if (key === 'yawn') {
    await handleYawnExpiration(pokemon, ctx, side);
  } else if (key === 'lockedmove') {
    handleLockedMoveExpiration(pokemon, ctx);
  } else if (key === 'partiallytrapped') {
    handlePartiallyTrappedExpiration(pokemon, ctx);
  }
}

export async function processVolatileCounters(
  pokemon: Pokemon,
  ctx: BattleContext,
  role: BattleSide | 'info' = 'info'
) {
  if (!pokemon.volatileCounters) return;

  const side = role === 'player' ? 'player' : 'enemy';

  for (const [key, val] of Object.entries(pokemon.volatileCounters)) {
    if (val === undefined || key === 'twoturnmove' || key === 'lockedmove') continue;
    if (val <= 0) continue;

    const volatileKey = requireVolatileStatusKey(key);
    const newVal = val - 1;
    pokemon.volatileCounters[volatileKey] = newVal;

    if (key === 'partiallytrapped' && newVal > 0) {
      await handlePartiallyTrappedTick(pokemon, ctx, side);
    } else if (newVal === 0) {
      await handleVolatileExpiration(key, pokemon, ctx, side);
    }
  }
}

function handleDisabledTurns(pokemon: Pokemon, addLogFn: BattleContext['addLog']): void {
  if ((pokemon.disabledTurns ?? 0) > 0) {
    pokemon.disabledTurns = (pokemon.disabledTurns ?? 0) - 1;
    if (pokemon.disabledTurns <= 0) {
      addLogFn(`¡${pokemon.name} ya puede usar ${pokemon.disabledMove || 'su movimiento'} de nuevo!`, 'log-info', pokemon);
      pokemon.disabledMove = null;
    }
  }
}

function handleEncoreTurns(pokemon: Pokemon, addLogFn: BattleContext['addLog']): void {
  if ((pokemon.encoreTurns ?? 0) > 0) {
    pokemon.encoreTurns = (pokemon.encoreTurns ?? 0) - 1;
    if (pokemon.encoreTurns <= 0) {
      addLogFn(`¡${pokemon.name} ya no está bajo el efecto de Otra Vez!`, 'log-info', pokemon);
      pokemon.encoreMove = null;
    }
  }
}

function handleTauntTurns(pokemon: Pokemon, addLogFn: BattleContext['addLog']): void {
  if ((pokemon.tauntTurns ?? 0) > 0) {
    pokemon.tauntTurns = (pokemon.tauntTurns ?? 0) - 1;
    if (pokemon.tauntTurns <= 0) {
      addLogFn(`¡La mofa sobre ${pokemon.name} ha terminado!`, 'log-info', pokemon);
    }
  }
}

function handleThrashTurns(pokemon: Pokemon, addLogFn: BattleContext['addLog']): void {
  if ((pokemon.thrashTurns ?? 0) > 0) {
    pokemon.thrashTurns = (pokemon.thrashTurns ?? 0) - 1;
    if (pokemon.thrashTurns <= 0) {
      addLogFn(`¡${pokemon.name} se calmó, pero terminó confundido!`, 'log-info', pokemon);
      pokemon.confused = MIN_CONFUSION_TURNS + Math.floor(Math.random() * RANDOM_CONFUSION_TURNS_RANGE);
    }
  }
}

export function processControlTurns(pokemon: Pokemon, addLogFn: BattleContext['addLog']): void {
  handleDisabledTurns(pokemon, addLogFn);
  handleEncoreTurns(pokemon, addLogFn);
  handleTauntTurns(pokemon, addLogFn);
  handleThrashTurns(pokemon, addLogFn);
}

async function handleBoundDamage(pokemon: Pokemon, ctx: BattleContext, side: BattleSide): Promise<void> {
  if ((pokemon.bound ?? 0) <= 0) return;

  pokemon.bound = (pokemon.bound ?? 0) - 1;
  if (pokemon.bound <= 0) {
    ctx.addLog(`¡${pokemon.name} se libró de la atadura!`, 'log-info', pokemon);
    return;
  }

  const dmg = Math.max(MIN_VOLATILE_DAMAGE, Math.floor(pokemon.maxHp / BOUND_DAMAGE_DIVISOR));
  await applyVolatileDamageEffect(pokemon, ctx, side, dmg, `¡${pokemon.name} sufre por la atadura! (-${dmg} HP)`);
}

async function handleIngrainHeal(pokemon: Pokemon, ctx: BattleContext, side: BattleSide): Promise<void> {
  if (!pokemon.ingrain || pokemon.hp <= 0 || pokemon.hp >= pokemon.maxHp) return;

  const heal = Math.max(MIN_VOLATILE_HEAL, Math.floor(pokemon.maxHp / INGRAIN_HEAL_DIVISOR));
  pokemon.hp = Math.min(pokemon.maxHp, pokemon.hp + heal);
  ctx.addLog(`¡${pokemon.name} recuperó salud por sus raíces!`, 'log-info', pokemon);
  if (ctx.animations?.handleHealRequest) {
    await ctx.animations.handleHealRequest({ side });
  }
}

function handlePerishSongTick(pokemon: Pokemon, ctx: BattleContext): void {
  if ((pokemon.perishSongCount ?? 0) <= 0) return;

  pokemon.perishSongCount = (pokemon.perishSongCount ?? 0) - 1;
  ctx.addLog(`¡La cuenta de Canto Mortal de ${pokemon.name} bajó a ${pokemon.perishSongCount}!`, 'log-info', pokemon);
  if (pokemon.perishSongCount === 0) {
    pokemon.hp = 0;
    ctx.addLog(`¡El destino de ${pokemon.name} se cumplió!`, 'log-info', pokemon);
  }
}

async function handleCurseDamage(pokemon: Pokemon, ctx: BattleContext, side: BattleSide): Promise<void> {
  if (!pokemon.cursed || pokemon.hp <= 0) return;

  const dmg = Math.max(MIN_VOLATILE_DAMAGE, Math.floor(pokemon.maxHp / CURSE_DAMAGE_DIVISOR));
  await applyVolatileDamageEffect(pokemon, ctx, side, dmg, `¡${pokemon.name} sufre por la maldición! (-${dmg} HP)`);
}

export async function processVolatileDamageAndHeal(
  pokemon: Pokemon,
  ctx: BattleContext,
  role: BattleSide | 'info' = 'info'
): Promise<void> {
  const side: BattleSide = role === 'player' ? 'player' : 'enemy';
  await handleBoundDamage(pokemon, ctx, side);
  await handleIngrainHeal(pokemon, ctx, side);
  handlePerishSongTick(pokemon, ctx);
  await handleCurseDamage(pokemon, ctx, side);
}
