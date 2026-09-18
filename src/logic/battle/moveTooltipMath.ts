/**
 * src/logic/battle/moveTooltipMath.ts
 *
 * Move power, accuracy, crit chance, and damage estimation math for combat tooltips.
 */

import type { DayPhase } from '@/logic/utils/timeUtils.ts';
import { getMechanicalWeather, WEATHER_MECHANICAL, isWeatherId, type WeatherMechanical } from '@/logic/weather/weatherRegistry.ts';
import { calculateDamageRangePure, type PurePokemon, type PureMove } from '@/logic/battle/battleMath.ts';
import type { PureBattleWeather, PureDamageOptions } from '@/logic/battle/battleMathTypes.ts';
import type { Pokemon, Move } from '@/types/pokemon/pokemon.ts';
import { toPokemonType, type PokemonType } from '@/data/battle/types.ts';
import { isPokemonMoveId, type PokemonMoveId } from '@/data/battle/moves.ts';
import type { ItemId } from '@/data/inventory/items.ts';
import {
  STAB_STANDARD_MULTIPLIER,
  STAB_ADAPTABILITY_MULTIPLIER,
  DEFAULT_CRIT_RATE,
  SCOPE_LENS_CRIT_RATE,
  FOCUS_ENERGY_CRIT_RATE
} from '@/logic/constants/gameplay.ts';

import {
  WEATHER_RAIN_PENALTY_TEXT,
  WEATHER_SUN_BOOST_TEXT,
  WEATHER_SUN_PENALTY_TEXT,
  WEATHER_RAIN_BOOST_TEXT,
  STAGE_PRECISION_LIMIT,
  STAGE_PRECISION_FULL,
  LOW_HP_THIRD_DIVISOR,
  BASE_POWER_MINIMAL_BOUND,
  DEFAULT_WEATHER_NEUTRAL_MULTIPLIER,
  CRIT_REDUCTION_ZERO,
  CRIT_PERCENT_SCALE,
  THICK_FAT_REDUCTION_MULTIPLIER,
  type PowerContext,
  getSpecialMoveModifier,
  applyWeatherPowerMod,
  resolveAttackerAbilityMultiplier,
  resolveHeldItemMultiplier,
  resolveThunderHurricaneAccuracy,
  resolveBlizzardAccuracy,
  resolveFogAccuracy,
  applyStageAccuracyModifier
} from './tooltip/moveTooltipMathHelper.ts';

export { parseStatusEffectInfo } from './tooltip/moveTooltipConditions.ts';

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

function getTypeWeatherModifier(
  moveType: PokemonType | undefined,
  mechWeather: WeatherMechanical
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
  const cleanWeather = typeof weather === 'string' && isWeatherId(weather) ? weather : undefined;
  const mechWeather = getMechanicalWeather(weather);
  const moveId = move.id || '';

  const specialMod = isPokemonMoveId(moveId) ? getSpecialMoveModifier(moveId, cleanWeather, mechWeather) : null;
  if (specialMod) return specialMod;

  if (mechWeather === WEATHER_MECHANICAL.FOG) {
    const isMist = weather?.toLowerCase() === 'mist';
    const label = isMist ? 'Bruma' : 'Niebla'; // spanish-ok: UI Spanish text localization label
    const penalty = isMist ? '80%' : '60%';
    return { type: 'penalized', text: `Precisión reducida al ${penalty} por ${label}.` };
  }

  if (move.cat === 'status') return null;

  return getTypeWeatherModifier(move.type, mechWeather);
}

function resolveWeatherBallAdaptation(
  moveType: PokemonType,
  mechWeather: WeatherMechanical,
  ctx: PowerContext,
  moveId?: PokemonMoveId
): PokemonType {
  if (moveId !== 'weatherball') return moveType;
  if (mechWeather === WEATHER_MECHANICAL.SUN) { ctx.currentPower = 100; ctx.powerList.push({ label: 'Weather Ball (Sol)', mult: 2.0 }); return 'fire'; }
  if (mechWeather === WEATHER_MECHANICAL.RAIN) { ctx.currentPower = 100; ctx.powerList.push({ label: 'Weather Ball (Lluvia)', mult: 2.0 }); return 'water'; }
  if (mechWeather === WEATHER_MECHANICAL.HAIL || mechWeather === WEATHER_MECHANICAL.SNOW) { ctx.currentPower = 100; ctx.powerList.push({ label: 'Weather Ball (Nieve)', mult: 2.0 }); return 'ice'; }
  if (mechWeather === WEATHER_MECHANICAL.SANDSTORM) { ctx.currentPower = 100; ctx.powerList.push({ label: 'Weather Ball (Arena)', mult: 2.0 }); return 'rock'; }
  return moveType;
}

function applyStabMultiplier(attacker: PurePokemon | Pokemon | null | undefined, moveType: PokemonType, ctx: PowerContext): void {
  if (!attacker) return;
  const isStab = (attacker as PurePokemon).type === moveType || (attacker as PurePokemon).type2 === moveType || (attacker as Pokemon).type === moveType || (attacker as Pokemon).type2 === moveType;
  if (isStab) {
    const stabMult = attacker.ability === 'adaptability' ? STAB_ADAPTABILITY_MULTIPLIER : STAB_STANDARD_MULTIPLIER;
    ctx.powerList.push({ label: `STAB ${attacker.ability === 'adaptability' ? '(Adaptabilidad)' : ''}`.trim(), mult: stabMult });
    ctx.currentPower *= stabMult;
  }
}

function applyAttackerAbilityPowerMod(
  attacker: PurePokemon | Pokemon | null | undefined,
  moveType: string,
  basePower: number,
  mechWeather: string,
  ctx: PowerContext
): void {
  if (!attacker?.ability) return;
  const curHp = attacker.hp || 1;
  const maxHp = attacker.maxHp || 1;
  const isLowHp = curHp <= Math.floor(maxHp / LOW_HP_THIRD_DIVISOR);
  const abilMult = resolveAttackerAbilityMultiplier(attacker.ability, moveType, basePower, mechWeather, isLowHp);

  if (abilMult !== DEFAULT_WEATHER_NEUTRAL_MULTIPLIER) {
    ctx.powerList.push({ label: `Habilidad (${attacker.ability})`, mult: abilMult });
    ctx.currentPower *= abilMult;
  }
}

function applyDefenderAbilityPowerMod(defender: PurePokemon | Pokemon | null | undefined, moveType: string, ctx: PowerContext): void {
  if (defender && defender.ability === 'thickfat' && (moveType === 'fire' || moveType === 'ice')) {
    ctx.powerList.push({ label: 'Habilidad Rival (Sebo)', mult: THICK_FAT_REDUCTION_MULTIPLIER });
    ctx.currentPower *= THICK_FAT_REDUCTION_MULTIPLIER;
  }
}

function applyHeldItemPowerMod(attacker: PurePokemon | Pokemon | null | undefined, move: Move, moveType: string, ctx: PowerContext): void {
  if (!attacker || !attacker.heldItem) return;
  const h = attacker.heldItem;
  const itemMult = resolveHeldItemMultiplier(h, move, moveType, HELD_ITEM_TYPE_BOOSTERS_MAP, ctx);

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
  attacker: PurePokemon | Pokemon | null | undefined,
  defender: PurePokemon | Pokemon | null | undefined,
  mechWeather: WeatherMechanical,
  _cycle: DayPhase | undefined,
  basePower: number,
  moveTypeOverride?: string
): { base: number; final: number; list: { label: string; mult: number }[]; class: string } {
  const ctx: PowerContext = {
    currentPower: basePower,
    powerList: []
  };

  if (basePower > 0) {
    let moveType = toPokemonType(moveTypeOverride || move.type || 'normal');
    moveType = resolveWeatherBallAdaptation(moveType, mechWeather, ctx, move.id);
    applyStabMultiplier(attacker, moveType, ctx);
    applyWeatherPowerMod(moveType, mechWeather, ctx, move.id);
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
  weather: PureBattleWeather | null | undefined,
  mechWeather: WeatherMechanical,
  baseAcc: number,
  accList: { label: string; mult: number | string }[],
  moveId?: PokemonMoveId
): number {
  if (moveId === 'thunder' || moveId === 'hurricane') {
    const res = resolveThunderHurricaneAccuracy(mechWeather, weather, accList);
    if (res !== null) return res;
  }

  if (moveId === 'blizzard') {
    const res = resolveBlizzardAccuracy(mechWeather, accList);
    if (res !== null) return res;
  }

  return resolveFogAccuracy(mechWeather, weather, baseAcc, accList);
}

/**
 * Calculates move accuracy details.
 */
export function calculateMoveAccuracy(
  move: Move,
  weather: PureBattleWeather | null,
  mechWeather: WeatherMechanical,
  _cycle: DayPhase | undefined,
  baseAcc: number,
  accStage: number,
  evaStage: number
): { base: number; final: number; list: { label: string; mult: number | string }[]; class: string } {
  let currentAcc = baseAcc;
  const accList: { label: string; mult: number | string }[] = [];

  if (baseAcc > 0 && baseAcc < STAGE_PRECISION_FULL) {
    currentAcc = applyWeatherAccuracyOverride(weather, mechWeather, baseAcc, accList, move.id);
    currentAcc = applyStageAccuracyModifier(currentAcc, accStage, evaStage, accList);
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
): { value: string; percent: number; label: string; class: string } {
  const heldItemKey = attacker.heldItem;
  const isScopeLens = heldItemKey === 'scopelens';
  const isFocusEnergy = attacker.focusEnergy;

  let critRate = DEFAULT_CRIT_RATE;
  if (isScopeLens) critRate = SCOPE_LENS_CRIT_RATE;
  if (isFocusEnergy) critRate = FOCUS_ENERGY_CRIT_RATE;
  if (isScopeLens && isFocusEnergy) critRate = 1.0;
  if (defender && (defender.ability === 'shellarmor' || defender.ability === 'battlearmor')) {
    critRate = CRIT_REDUCTION_ZERO;
  }

  const critVal = (critRate * CRIT_PERCENT_SCALE).toFixed(2).replace('.00', '');
  const critClass = critRate > DEFAULT_CRIT_RATE ? 'boosted' : (critRate === CRIT_REDUCTION_ZERO ? 'penalized' : 'neutral');

  return {
    value: critVal,
    percent: Math.round(critRate * 100),
    label: `${critVal}%`,
    class: critClass
  };
}

/**
 * Calculates effectiveness and estimated damage range.
 */
export function calculateMoveEffectivenessAndDamage(
  move: Move,
  md: { type?: PokemonType; cat?: Move['cat']; power?: number; acc?: number },
  attacker: PurePokemon | null | undefined,
  defender: PurePokemon | null | undefined,
  weather: PureBattleWeather | null,
  cycle: DayPhase | undefined,
  basePower: number,
  playerStages: { atk?: number } | null,
  enemyStages: { def?: number } | null
) {
  if (!attacker || !defender) return { effectiveness: null, damageRange: null };

  const pureMove: PureMove = {
    id: move.id,
    name: move.name,
    type: move.type || md.type || 'normal',
    power: basePower,
    cat: (move.cat || md.cat || 'physical') as PureMove['cat'],
    effect: typeof move.effect === 'string' ? move.effect : undefined
  };

  const pureCtx: PureDamageOptions = {
    atkStages: playerStages?.atk || 0,
    defStages: enemyStages?.def || 0,
    weather
  };

  return calculateDamageRangePure(attacker, defender, pureMove, pureCtx, cycle);
}
