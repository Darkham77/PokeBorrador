/**
 * Módulo de gestión de Estados Alterados y Efectos de Turno
 * Portado de js/07_battle.js para cumplir con el estándar modular v6.
 */

import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleContext } from '@/types/battle/battleContext';
import type { BattleSide } from '@/types/battle/battle';
import { getStatusIcon, processPrimaryStatusDamage } from './status/primaryStatusEngine.ts';
import {
  processVolatileCounters,
  processControlTurns,
  processVolatileDamageAndHeal
} from './status/volatileStatusEngine.ts';

export { getStatusIcon };

const WISH_HEAL_DIVISOR = 2;

async function processWishCondition(
  pokemon: Pokemon,
  ctx: BattleContext,
  side: BattleSide,
  sideConds: Record<string, { turns?: number }>
): Promise<void> {
  delete sideConds['wish'];
  if (pokemon.hp <= 0) return;

  const healAmt = Math.floor(pokemon.maxHp / WISH_HEAL_DIVISOR);
  pokemon.hp = Math.min(pokemon.maxHp, pokemon.hp + healAmt);
  ctx.addLog(`¡Se cumplió el Deseo! ${pokemon.name} recuperó salud.`, 'log-info', pokemon);
  if (ctx.animations?.handleHealRequest) {
    await ctx.animations.handleHealRequest({ side });
  }
}

async function processSideConditions(
  pokemon: Pokemon,
  ctx: BattleContext,
  role: BattleSide | 'info'
): Promise<void> {
  const activeB = ctx.activeBattle.value;
  if (!activeB) return;

  const side: BattleSide = role === 'player' ? 'player' : 'enemy';
  const sideConds = role === 'player' ? activeB.playerSideConditions : activeB.enemySideConditions;
  if (!sideConds) return;

  for (const [key, cond] of Object.entries(sideConds)) {
    if (!cond || typeof cond.turns !== 'number') continue;
    cond.turns--;
    if (cond.turns <= 0 && key === 'wish') {
      await processWishCondition(pokemon, ctx, side, sideConds);
    }
  }
}

/**
 * Procesa los efectos permanentes y temporales al final del turno.
 * @returns {boolean} True si el Pokémon sigue en combate, False si se debilitó
 */
export async function tickStatus(pokemon: Pokemon, ctx: BattleContext, role: BattleSide | 'info' = 'info') {
  if (!pokemon) return false;

  // 0. Procesar Contadores Volátiles (ej: yawn, partiallytrapped)
  await processVolatileCounters(pokemon, ctx, role);

  // 0.5 Procesar Condiciones de Bando (ej: wish)
  await processSideConditions(pokemon, ctx, role);

  // 1. Efectos de control temporal (disabled, encore, taunt, thrash)
  processControlTurns(pokemon, ctx.addLog);
  
  // 2. Estados alterados persistentes (Daño)
  const hasPrimaryDamage = await processPrimaryStatusDamage(pokemon, ctx, role);
  if (hasPrimaryDamage) return true;

  // 3. Daño por atadura, arraigo, canto mortal y maldición
  await processVolatileDamageAndHeal(pokemon, ctx, role);

  return false;
}

/**
 * Procesa efectos de campo como Drenadoras.
 */
export async function tickLeechSeed(pokemon: Pokemon, opponent: Pokemon, ctx: BattleContext) {
  if (!pokemon || !pokemon.seeded || pokemon.hp <= 0) return false;

  const sideSelf = pokemon.uid === ctx.activeBattle.value?.player?.uid ? 'player' : 'enemy';
  const sideOpp = opponent.uid === ctx.activeBattle.value?.player?.uid ? 'player' : 'enemy';

  const dmg = Math.max(1, Math.floor(pokemon.maxHp / 8));
  pokemon.hp = Math.max(0, pokemon.hp - dmg);
  ctx.addLog(`¡Drenadoras resta salud a ${pokemon.name}! (-${dmg} HP)`, 'log-enemy', pokemon);

  const blinkPromise = ctx.animations?.handleBlinkRequest
    ? ctx.animations.handleBlinkRequest({ side: sideSelf })
    : Promise.resolve();

  if (opponent && opponent.hp > 0) {
    const heal = dmg;
    opponent.hp = Math.min(opponent.maxHp, opponent.hp + heal);
    ctx.addLog(`¡${opponent.name} recuperó salud!`, 'log-info', opponent);
    
    const healPromise = ctx.animations?.handleHealRequest
      ? ctx.animations.handleHealRequest({ side: sideOpp })
      : Promise.resolve();
      
    await Promise.all([blinkPromise, healPromise]);
  } else {
    await blinkPromise;
  }
  
  return true;
}

function resetBasicVolatiles(poke: Pokemon): void {
  poke.volatileCounters = {};
  poke.lastMove = null;
  poke.confused = 0;
  poke.flinched = false;
  poke.substitute = 0;
  poke.seeded = false;
  poke.attracted = false;
  poke.cursed = false;
  poke.protect = false;
  poke.detect = false;
  poke.destinyBond = false;
  poke.perishSongCount = 0;
  poke.tauntTurns = 0;
  poke.disabledTurns = 0;
  poke.disabledMove = null;
  poke.encoreTurns = 0;
  poke.encoreMove = null;
  poke.focusEnergy = false;
  poke.lockOn = false;
  poke.ingrain = false;
  poke.badPoison = 0;
  poke.chargingMove = null;
  poke.choiceMove = undefined;
  poke.thrashTurns = 0;
  poke.mustRecharge = false;
  poke.endure = false;
  poke.trapped = false;
  poke.isTransformed = false;
  poke.rageActive = false;
  poke.snatching = false;
  poke.tormentActive = false;
  poke.bound = 0;
  poke.identified = false;
  poke.furyCutterCount = 0;
  if (Array.isArray(poke.moves)) {
    poke.moves.forEach(m => {
      if (m && m.pp > 0) {
        m.disabled = false;
      }
    });
  }
}

function restoreTransformedOriginalStats(poke: Pokemon): void {
  if (poke._originalMoves) {
    poke.moves = poke._originalMoves;
    poke._originalMoves = undefined;
  }
  if (poke._originalId) {
    poke.id = poke._originalId;
    poke.name = poke._originalId;
    poke._originalId = undefined;
  }
  if (poke._originalType) {
    poke.type = poke._originalType;
    poke._originalType = undefined;
  }
  if (poke._originalType2 !== undefined) {
    poke.type2 = poke._originalType2;
    poke._originalType2 = undefined;
  }
  if (poke._originalAbility) {
    poke.ability = poke._originalAbility;
    poke._originalAbility = undefined;
  }
}

function restoreDittoOriginalStats(poke: Pokemon): void {
  if (!poke.originalDitto) return;
  const orig = poke.originalDitto;
  poke.id = orig.id || poke.id;
  poke.name = orig.name || poke.name;
  poke.type = orig.type || poke.type;
  poke.type2 = orig.type2;
  if (orig.atk !== undefined) poke.atk = orig.atk;
  if (orig.def !== undefined) poke.def = orig.def;
  if (orig.spa !== undefined) poke.spa = orig.spa;
  if (orig.spd !== undefined) poke.spd = orig.spd;
  if (orig.spe !== undefined) poke.spe = orig.spe;
  if (orig.moves) poke.moves = orig.moves;
  if (orig.ivs) poke.ivs = orig.ivs;
  if (orig.isShiny !== undefined) poke.isShiny = orig.isShiny;
  if (orig.level !== undefined) poke.level = orig.level;
  if (orig.nature !== undefined) poke.nature = orig.nature;
  if (orig.ability !== undefined) poke.ability = orig.ability;
  if (orig.maxHp !== undefined) {
    poke.maxHp = orig.maxHp;
    poke.hp = Math.min(poke.hp, orig.maxHp);
  }
  poke.originalDitto = undefined;
}

function revertCastformForm(poke: Pokemon): void {
  if (poke.id === 'castform' && poke.form && poke.form !== 'normal') {
    poke.form = 'normal';
    poke.type = 'normal';
    poke.type2 = undefined;
  }
}

/**
 * Limpia todos los estados temporales/volátiles de un Pokémon al salir o entrar en combate.
 */
export function clearVolatileStatus(poke: Pokemon) {
  if (!poke) return;
  resetBasicVolatiles(poke);
  restoreTransformedOriginalStats(poke);
  restoreDittoOriginalStats(poke);
  revertCastformForm(poke);
}
