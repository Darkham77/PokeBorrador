const MIST_ACCURACY_PENALTY_PCT = 0.8
const FOG_ACCURACY_PENALTY_PCT = 0.6
const WEATHER_PENALIZED_ACCURACY_TEXT = 'Penalizado por Clima Soleado (Precisión 50%)'
const WEATHER_ADVERSE_PENALTY_TEXT = 'Penalizado por clima adverso (0.5x y requiere carga)'
const WEATHER_BALL_BOOST_TEXT = 'Tipo y potencia adaptados al clima (100 BP).'
const WEATHER_RAIN_PENALTY_TEXT = 'Penalizado por Lluvia (0.5x)'
const WEATHER_SUN_BOOST_TEXT = 'Potenciado por Sol (1.5x)'
const WEATHER_SUN_PENALTY_TEXT = 'Penalizado por Sol (0.5x)'
const WEATHER_RAIN_BOOST_TEXT = 'Potenciado por Lluvia (1.5x)'
const HELD_ITEM_TYPE_BOOST_MULTIPLIER = 1.2
const SOLARBEAM_CLIMATE_PENALTY_MULTIPLIER = 0.5
const STAGE_MATH_BASE = 3
/** Pokémon Showdown stat stage bounds: stages range from -6 to +6 */
const STAGE_MIN_BOUND = -6
const STAGE_MAX_BOUND = 6
const THICK_FAT_REDUCTION_MULTIPLIER = 0.5
const STAGE_PRECISION_LIMIT = 100
const STAGE_PRECISION_FULL = 1000
const LOW_HP_THIRD_DIVISOR = 3
const BASE_POWER_MINIMAL_BOUND = 1
const DEFAULT_WEATHER_NEUTRAL_MULTIPLIER = 1
const STAGE_PRECISION_SUN_PENALTY = 50
const CRIT_REDUCTION_ZERO = 0
const CRIT_PERCENT_SCALE = 100

import type { DayPhase } from '@/logic/utils/timeUtils'
import { getMechanicalWeather, WEATHER_MECHANICAL } from '@/logic/weather/weatherRegistry'
import { type PurePokemon, type PureMove, calculateDamageRangePure } from '@/logic/battle/battleMath'
import type { Move } from '@/types/pokemon/pokemon'
import type { PokemonType } from '@/data/battle/types'
import { isItemId, type ItemId } from '@/data/inventory/items'
import {
  STAB_STANDARD_MULTIPLIER,
  STAB_ADAPTABILITY_MULTIPLIER,
  LOW_HP_ABILITY_MULTIPLIER,
  TECHNICIAN_POWER_CAP,
  SAND_FORCE_MULTIPLIER,
  DEFAULT_CRIT_RATE,
  SCOPE_LENS_CRIT_RATE,
  FOCUS_ENERGY_CRIT_RATE
} from '@/logic/constants/gameplay'

export { parseStatusEffectInfo } from './tooltip/moveTooltipConditions.ts'

const HELD_ITEM_TYPE_BOOSTERS_MAP: Readonly<Partial<Record<ItemId, PokemonType>>> = {
  blackbelt: 'fighting',
  blackglasses: 'dark',
  charcoal: 'fire',
  dragonfang: 'dragon',
  hardstone: 'rock',
  magnet: 'electric',
  metalcoat: 'steel',
  miracleseed: 'grass',
  mysticwater: 'water',
  nevermeltice: 'ice',
  poisonbarb: 'poison',
  sharpbeak: 'flying',
  silkscarf: 'normal',
  silverpowder: 'bug',
  softsand: 'ground',
  spelltag: 'ghost',
  twistedspoon: 'psychic'
} as const;

function getSpecialMoveModifier(
  moveId: string,
  weather: string | undefined,
  mechWeather: string
): { type: string; text: string } | null {
  const isSunny = mechWeather === WEATHER_MECHANICAL.SUN;
  const isRaining = mechWeather === WEATHER_MECHANICAL.RAIN;
  const isSnowing = mechWeather === WEATHER_MECHANICAL.SNOW || mechWeather === WEATHER_MECHANICAL.HAIL;
  const isThunderstorm = weather?.toLowerCase() === 'thunderstorm';

  if (moveId === 'thunder' || moveId === 'hurricane') {
    if (isSunny) return { type: 'penalized', text: WEATHER_PENALIZED_ACCURACY_TEXT };
    if (isRaining || isThunderstorm) return { type: 'boosted', text: `Potenciado por ${isThunderstorm ? 'Tormenta Eléctrica' : 'Lluvia'} (¡No falla!)` };
  }
  if (moveId === 'blizzard' && isSnowing) {
    return { type: 'boosted', text: 'Potenciado por Granizo/Nieve (¡No falla!)' };
  }
  if (moveId === 'solarbeam' || moveId === 'solarblade') {
    if (isSunny) return { type: 'boosted', text: 'Carga instantánea por Sol.' };
    if (mechWeather !== WEATHER_MECHANICAL.CLEAR) return { type: 'penalized', text: WEATHER_ADVERSE_PENALTY_TEXT };
  }
  if (moveId === 'weatherball' && mechWeather !== WEATHER_MECHANICAL.CLEAR) {
    return { type: 'boosted', text: WEATHER_BALL_BOOST_TEXT };
  }
  return null;
}

function getTypeWeatherModifier(
  moveType: string | undefined,
  mechWeather: string
): { type: string; text: string } | null {
  const isRaining = mechWeather === WEATHER_MECHANICAL.RAIN;
  const isSunny = mechWeather === WEATHER_MECHANICAL.SUN;

  if (moveType === 'fire') {
    if (isRaining) return { type: 'penalized', text: WEATHER_RAIN_PENALTY_TEXT };
    if (isSunny) return { type: 'boosted', text: WEATHER_SUN_BOOST_TEXT };
  }
  if (moveType === 'water') {
    if (isSunny) return { type: 'penalized', text: WEATHER_SUN_PENALTY_TEXT };
    if (isRaining) return { type: 'boosted', text: WEATHER_RAIN_BOOST_TEXT };
  }
  return null;
}

/**
 * Gets modifier info for a move based on weather and cycle.
 */
export function calculateMoveModifierInfo(
  move: Move,
  weather: string | undefined,
  _cycle: string
): { type: string; text: string } | null {
  const mechWeather = getMechanicalWeather(weather);
  const moveId = move.id || '';

  const specialMod = getSpecialMoveModifier(moveId, weather, mechWeather);
  if (specialMod) return specialMod;

  if (mechWeather === WEATHER_MECHANICAL.FOG) {
    const isMist = weather?.toLowerCase() === 'mist';
    const label = isMist ? 'Bruma' : 'Niebla'; // spanish-ok
    const penalty = isMist ? '80%' : '60%';
    return { type: 'penalized', text: `Precisión reducida al ${penalty} por ${label}.` };
  }

  if (move.cat === 'status') return null;

  return getTypeWeatherModifier(move.type, mechWeather);
}

interface PowerContext {
  powerList: { label: string; mult: number }[];
  currentPower: number;
}

function resolveWeatherBallAdaptation(
  moveId: string | undefined,
  moveType: string,
  mechWeather: string,
  ctx: PowerContext
): string {
  if (moveId !== 'weatherball') return moveType;
  if (mechWeather === WEATHER_MECHANICAL.SUN) { ctx.currentPower = 100; ctx.powerList.push({ label: 'Weather Ball (Sol)', mult: 2.0 }); return 'fire'; }
  if (mechWeather === WEATHER_MECHANICAL.RAIN) { ctx.currentPower = 100; ctx.powerList.push({ label: 'Weather Ball (Lluvia)', mult: 2.0 }); return 'water'; }
  if (mechWeather === WEATHER_MECHANICAL.HAIL || mechWeather === WEATHER_MECHANICAL.SNOW) { ctx.currentPower = 100; ctx.powerList.push({ label: 'Weather Ball (Nieve)', mult: 2.0 }); return 'ice'; }
  if (mechWeather === WEATHER_MECHANICAL.SANDSTORM) { ctx.currentPower = 100; ctx.powerList.push({ label: 'Weather Ball (Arena)', mult: 2.0 }); return 'rock'; }
  return moveType;
}

function applyStabMultiplier(attacker: PurePokemon, moveType: string, ctx: PowerContext): void {
  const isStab = attacker.type === moveType || attacker.type2 === moveType;
  if (isStab) {
    const stabMult = attacker.ability === 'adaptability' ? STAB_ADAPTABILITY_MULTIPLIER : STAB_STANDARD_MULTIPLIER;
    ctx.powerList.push({ label: `STAB ${attacker.ability === 'adaptability' ? '(Adaptabilidad)' : ''}`.trim(), mult: stabMult });
    ctx.currentPower *= stabMult;
  }
}

function applyWeatherPowerMod(moveId: string | undefined, moveType: string, mechWeather: string, ctx: PowerContext): void {
  if (moveType === 'fire') {
    if (mechWeather === WEATHER_MECHANICAL.SUN) { ctx.powerList.push({ label: 'Clima (Sol)', mult: 1.5 }); ctx.currentPower *= 1.5; }
    else if (mechWeather === WEATHER_MECHANICAL.RAIN) { ctx.powerList.push({ label: 'Clima (Lluvia)', mult: 0.5 }); ctx.currentPower *= 0.5; }
  } else if (moveType === 'water') {
    if (mechWeather === WEATHER_MECHANICAL.RAIN) { ctx.powerList.push({ label: 'Clima (Lluvia)', mult: 1.5 }); ctx.currentPower *= 1.5; }
    else if (mechWeather === WEATHER_MECHANICAL.SUN) { ctx.powerList.push({ label: 'Clima (Sol)', mult: 0.5 }); ctx.currentPower *= 0.5; }
  }

  if (moveId === 'solarbeam' || moveId === 'solarblade') {
    if (mechWeather !== WEATHER_MECHANICAL.SUN && mechWeather !== WEATHER_MECHANICAL.CLEAR) {
      ctx.powerList.push({ label: 'Clima Adverso', mult: SOLARBEAM_CLIMATE_PENALTY_MULTIPLIER });
      ctx.currentPower *= SOLARBEAM_CLIMATE_PENALTY_MULTIPLIER;
    }
  }
}

const LOW_HP_PINCH_ABILITIES: Readonly<Record<string, string>> = {
  overgrow: 'grass',
  blaze: 'fire',
  torrent: 'water',
  swarm: 'bug'
};

function applyAttackerAbilityPowerMod(attacker: PurePokemon, moveType: string, basePower: number, mechWeather: string, ctx: PowerContext): void {
  if (!attacker.ability) return;
  const a = attacker.ability;
  const curHp = attacker.hp || 1;
  const maxHp = attacker.maxHp || 1;
  const isLowHp = curHp <= Math.floor(maxHp / LOW_HP_THIRD_DIVISOR);

  let abilMult = DEFAULT_WEATHER_NEUTRAL_MULTIPLIER;
  if (isLowHp && LOW_HP_PINCH_ABILITIES[a] === moveType) {
    abilMult *= LOW_HP_ABILITY_MULTIPLIER;
  }

  if (a === 'technician' && basePower <= TECHNICIAN_POWER_CAP) abilMult *= 1.5;
  if (a === 'sandforce' && mechWeather === WEATHER_MECHANICAL.SANDSTORM && (moveType === 'rock' || moveType === 'ground' || moveType === 'steel')) {
    abilMult *= SAND_FORCE_MULTIPLIER;
  }

  if (abilMult !== DEFAULT_WEATHER_NEUTRAL_MULTIPLIER) {
    ctx.powerList.push({ label: `Habilidad (${attacker.ability})`, mult: abilMult });
    ctx.currentPower *= abilMult;
  }
}

function applyDefenderAbilityPowerMod(defender: PurePokemon | null, moveType: string, ctx: PowerContext): void {
  if (defender && defender.ability === 'thickfat' && (moveType === 'fire' || moveType === 'ice')) {
    ctx.powerList.push({ label: 'Habilidad Rival (Sebo)', mult: THICK_FAT_REDUCTION_MULTIPLIER });
    ctx.currentPower *= THICK_FAT_REDUCTION_MULTIPLIER;
  }
}

function applyHeldItemPowerMod(attacker: PurePokemon, move: Move, moveType: string, ctx: PowerContext): void {
  if (!attacker.heldItem) return;
  const h = attacker.heldItem;
  const canonicalKey = h.replace(/_/g, '');
  const itemKey: ItemId | null = isItemId(h) ? h : (isItemId(canonicalKey) ? canonicalKey : null);
  let itemMult = DEFAULT_WEATHER_NEUTRAL_MULTIPLIER;
  if (itemKey && HELD_ITEM_TYPE_BOOSTERS_MAP[itemKey] === moveType) itemMult = HELD_ITEM_TYPE_BOOST_MULTIPLIER;
  
  if (h === 'choiceband' || h === 'choice_band') {
    if (move.cat === 'physical') {
      itemMult = STAB_STANDARD_MULTIPLIER;
    } else {
      ctx.powerList.push({ label: 'Objeto (choice_band - Solo Físico)', mult: DEFAULT_WEATHER_NEUTRAL_MULTIPLIER });
    }
  }

  if (itemMult !== DEFAULT_WEATHER_NEUTRAL_MULTIPLIER) {
    ctx.powerList.push({ label: `Objeto (${h})`, mult: itemMult });
    ctx.currentPower *= itemMult;
  }
}

/**
 * Calculates move base power factoring STAB, abilities, weather, and held items.
 */
export function calculateMovePower(
  move: Move,
  attacker: PurePokemon,
  defender: PurePokemon | null,
  _weather: { type: string; turns: number } | null,
  mechWeather: string,
  _cycle: DayPhase | undefined,
  basePower: number,
  moveTypeOverride?: string
): { base: number; final: number; list: { label: string; mult: number }[]; class: string } {
  const ctx: PowerContext = {
    currentPower: basePower,
    powerList: []
  };

  if (basePower > 0) {
    let moveType = (moveTypeOverride || move.type || '').toLowerCase();
    moveType = resolveWeatherBallAdaptation(move.id, moveType, mechWeather, ctx);
    applyStabMultiplier(attacker, moveType, ctx);
    applyWeatherPowerMod(move.id, moveType, mechWeather, ctx);
    applyAttackerAbilityPowerMod(attacker, moveType, basePower, mechWeather, ctx);
    applyDefenderAbilityPowerMod(defender, moveType, ctx);
    applyHeldItemPowerMod(attacker, move, moveType, ctx);
  }

  const finalPower = Math.max(BASE_POWER_MINIMAL_BOUND, Math.round(ctx.currentPower));
  return {
    base: basePower,
    final: finalPower,
    list: ctx.powerList,
    class: finalPower > basePower ? 'boosted' : (finalPower < basePower ? 'penalized' : '')
  };
}

function applyWeatherAccuracyOverride(
  moveId: string | undefined,
  weather: { type: string; turns: number } | null,
  mechWeather: string,
  baseAcc: number,
  accList: { label: string; mult: number | string }[]
): number {
  const isThunderOrHurricane = moveId === 'thunder' || moveId === 'hurricane';
  if (isThunderOrHurricane) {
    if (mechWeather === WEATHER_MECHANICAL.RAIN || weather?.type === 'thunderstorm') {
      accList.push({ label: 'Lluvia (¡No falla!)', mult: '100%' });
      return STAGE_PRECISION_LIMIT;
    }
    if (mechWeather === WEATHER_MECHANICAL.SUN) {
      accList.push({ label: 'Sol (Precisión 50%)', mult: '0.5' });
      return STAGE_PRECISION_SUN_PENALTY;
    }
  }

  if (moveId === 'blizzard' && (mechWeather === WEATHER_MECHANICAL.HAIL || mechWeather === WEATHER_MECHANICAL.SNOW)) {
    accList.push({ label: 'Nieve (¡No falla!)', mult: '100%' });
    return STAGE_PRECISION_LIMIT;
  }

  if (mechWeather === WEATHER_MECHANICAL.FOG) {
    const isMist = weather?.type === "mist" || weather?.type === "mist_visual";
    const factor = isMist ? MIST_ACCURACY_PENALTY_PCT : FOG_ACCURACY_PENALTY_PCT;
    accList.push({ label: `Niebla/Bruma`, mult: factor });
    return Math.floor(baseAcc * factor);
  }
  return baseAcc;
}

/**
 * Calculates move accuracy details.
 */
export function calculateMoveAccuracy(
  move: Move,
  weather: { type: string; turns: number } | null,
  mechWeather: string,
  _cycle: DayPhase | undefined,
  baseAcc: number,
  accStage: number,
  evaStage: number
): { base: number; final: number; list: { label: string; mult: number | string }[]; class: string } {
  let currentAcc = baseAcc;
  const accList: { label: string; mult: number | string }[] = [];

  if (baseAcc > 0 && baseAcc < STAGE_PRECISION_FULL) {
    currentAcc = applyWeatherAccuracyOverride(move.id, weather, mechWeather, baseAcc, accList);

    const netStage = Math.max(STAGE_MIN_BOUND, Math.min(STAGE_MAX_BOUND, accStage - evaStage));
    if (netStage !== 0) {
      const factor = netStage >= 0 
        ? (STAGE_MATH_BASE + netStage) / STAGE_MATH_BASE
        : STAGE_MATH_BASE / (STAGE_MATH_BASE - netStage);
      accList.push({ label: `Modificador Rango (${netStage > 0 ? '+' : ''}${netStage})`, mult: Number(factor.toFixed(3)) });
      currentAcc *= factor;
    }
  }

  const finalAccuracy = Math.max(0, Math.min(STAGE_PRECISION_LIMIT, Math.round(currentAcc)));
  return {
    base: baseAcc,
    final: baseAcc === STAGE_PRECISION_FULL ? STAGE_PRECISION_FULL : finalAccuracy,
    list: accList,
    class: baseAcc === STAGE_PRECISION_FULL ? '' : (finalAccuracy > baseAcc ? 'boosted' : (finalAccuracy < baseAcc ? 'penalized' : ''))
  };
}

/**
 * Calculates crit chance.
 */
export function calculateCritChance(
  attacker: PurePokemon,
  defender: PurePokemon | null
): { value: string; class: string } {
  let critRate = DEFAULT_CRIT_RATE;
  if (attacker.heldItem === 'scopelens') critRate = SCOPE_LENS_CRIT_RATE;
  if (attacker.focusEnergy) critRate = FOCUS_ENERGY_CRIT_RATE;
  if (defender && (defender.ability === 'shellarmor' || defender.ability === 'battlearmor')) {
    critRate = CRIT_REDUCTION_ZERO;
  }

  const critVal = (critRate * CRIT_PERCENT_SCALE).toFixed(2).replace('.00', '');
  const critClass = critRate > DEFAULT_CRIT_RATE ? 'boosted' : (critRate === CRIT_REDUCTION_ZERO ? 'penalized' : 'neutral');

  return {
    value: critVal,
    class: critClass
  };
}

/**
 * Calculates effectiveness and estimated damage range.
 */
export function calculateMoveEffectivenessAndDamage(
  move: Move,
  md: { type?: PokemonType; cat?: Move['cat']; power?: number; acc?: number },
  attacker: PurePokemon,
  defender: PurePokemon | null,
  weather: { type: string; turns: number } | null,
  cycle: DayPhase | undefined,
  basePower: number,
  playerStages: { atk?: number } | null,
  enemyStages: { def?: number } | null
) {
  if (!defender) return { effectiveness: null, damageRange: null };

  const pureMove: PureMove = {
    id: move.id,
    name: move.name,
    type: move.type || md.type || 'normal',
    power: basePower,
    cat: (move.cat || md.cat || 'physical') as PureMove['cat'],
    effect: typeof move.effect === 'string' ? move.effect : undefined
  };

  const pureCtx = {
    atkStages: playerStages?.atk || 0,
    defStages: enemyStages?.def || 0,
    weather: weather ? { type: weather.type, turns: weather.turns } : null
  };

  return calculateDamageRangePure(attacker, defender, pureMove, pureCtx, cycle);
}
