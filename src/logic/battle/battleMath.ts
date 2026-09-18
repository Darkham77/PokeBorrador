const TECHNICIAN_MAX_POWER_LIMIT = 60;
const GUTS_STATUS_ATK_MULTIPLIER = 1.5;
const DEFAULT_STAT_FALLBACK_VAL = 10;
const CRIT_ROLL_DENOMINATOR_GEN6_BASE = 24;
const CRIT_ROLL_DENOMINATOR_GEN5_BASE = 16;
const DAMAGE_ROLL_MIN_INT = 85;
const DAMAGE_ROLL_RANGE_INT = 16;
const WEATHER_BOOST_MULTIPLIER = 1.5;
const WEATHER_REDUCTION_MULTIPLIER = 0.5;
const DAY_CYCLE_BOOST_MULTIPLIER = 1.2;
import type { DayPhase } from '@/logic/utils/timeUtils';
import { ACTIVE_GENERATION } from '@/data/system/constants';
import type { PokemonMoveId } from '@/data/battle/moves';
import type {
  PurePokemon,
  PureMove,
  PureBattleWeather,
  PureBattleStages,
  PureDamageOptions,
  PureDamageResult
} from './battleMathTypes.ts';
export * from './battleMathTypes.ts';

export const STAGE_MULTIPLIERS_STAT: Record<string, number> = {
  '-6': 2 / 8, '-5': 2 / 7, '-4': 2 / 6, '-3': 2 / 5, '-2': 2 / 4, '-1': 2 / 3,
  '0': 1.0, '1': 3 / 2, '2': 4 / 2, '3': 5 / 2, '4': 6 / 2, '5': 7 / 2, '6': 8 / 2
};

export const STAGE_MULTIPLIERS_ACC: Record<string, number> = {
  '-6': 3 / 9, '-5': 3 / 8, '-4': 3 / 7, '-3': 3 / 6, '-2': 3 / 5, '-1': 3 / 4,
  '0': 1.0, '1': 4 / 3, '2': 5 / 3, '3': 6 / 3, '4': 7 / 3, '5': 8 / 3, '6': 9 / 3
};

const WEATHER_KEYS = { SUN: 'sun', RAIN: 'rain', SANDSTORM: 'sandstorm', SNOW: 'snow', HAIL: 'hail', FOG: 'fog', WIND: 'wind', CLEAR: 'clear' } as const;
const DELTA_STREAM_WEAKNESS_SET: ReadonlySet<string> = new Set(['electric', 'ice', 'rock']); // runtime-set: Fast O(1) membership lookup set


import { getMechanicalWeather } from '../weather/weatherRegistry.ts';
import { isPokemonType, TYPE_CHART } from '../../data/battle/types.ts';

function getTypeEff(moveType: string | undefined, defType: string | undefined, scrapy = false): number {
  if (!moveType || !defType) return 1;
  const mType = isPokemonType(moveType) ? moveType : null;
  const dType = isPokemonType(defType) ? defType : null;
  if (!mType || !dType) return 1;

  if (scrapy && dType === 'ghost' && (mType === 'normal' || mType === 'fighting')) {
    return 1;
  }

  const row = TYPE_CHART[mType];
  if (!row) return 1;
  const mult = row[dType];
  return mult !== undefined ? mult : 1;
}


function getCombinedEff(moveType: string, defender: PurePokemon, attacker: PurePokemon | null = null, _weather: string | null = null): number {
  const scrapy = attacker?.ability === 'scrappy';
  let eff = getTypeEff(moveType, defender.type, scrapy);
  if (defender.type2) eff *= getTypeEff(moveType, defender.type2, scrapy);

  return eff;
}

import type { PokemonType } from '../../data/battle/types.ts';
import type { MoveCategory } from '../../data/battle/moves.ts';

const SPECIAL_POKEMON_TYPES_SET: ReadonlySet<PokemonType> = new Set<PokemonType>([ // runtime-set: Fast O(1) membership lookup set
  'fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark'
]);

export function getMoveCategory(move: PureMove): MoveCategory {
  if (move.cat === 'status') return 'status';
  if (ACTIVE_GENERATION <= 3) {
    if (move.type && SPECIAL_POKEMON_TYPES_SET.has(move.type)) return 'special';
    return 'physical';
  }
  return move.cat ?? 'physical';
}

const PINCH_ABILITY_TYPES: Readonly<Record<string, string>> = {
  blaze: 'fire',
  torrent: 'water',
  overgrow: 'grass',
  swarm: 'bug',
};
const PINCH_MULTIPLIER = 1.5 as const;
const TECHNICIAN_MULTIPLIER = 1.5 as const;
const SAND_FORCE_MULTIPLIER = 1.3 as const;
const LOW_HP_DIVISOR = 3 as const;

function isSandForceType(type: string): boolean {
  return type === 'ground' || type === 'rock' || type === 'steel';
}

function checkPinchAbilityBoost(ab: string | null | undefined, moveType: string, hp: number, maxHp: number): boolean {
  return hp <= (maxHp / LOW_HP_DIVISOR) && Boolean(ab && PINCH_ABILITY_TYPES[ab] === moveType);
}

function checkSandForceBoost(ab: string | null | undefined, moveType: string, weather?: PureBattleWeather | null): boolean {
  if (!weather || weather.turns === 0 || ab !== 'sandforce') return false;
  return getMechanicalWeather(weather.type) === WEATHER_KEYS.SANDSTORM && isSandForceType(moveType);
}

export function getAbilityMultiplierPure(attacker: PurePokemon, move: PureMove, weather?: PureBattleWeather | null): { mult: number; triggeredAbility: string | null } {
  let mult = 1;
  let triggeredAbility: string | null = null;
  const ab = attacker.ability;
  const power = move.power ?? 0;
  const moveType = move.type ?? 'normal';

  if (checkPinchAbilityBoost(ab, moveType, attacker.hp ?? 0, attacker.maxHp ?? 1)) {
    mult *= PINCH_MULTIPLIER;
    triggeredAbility = ab!;
  }
  if (ab === 'guts' && attacker.status && getMoveCategory(move) === 'physical') {
    mult *= GUTS_STATUS_ATK_MULTIPLIER;
    triggeredAbility = ab;
  }
  if (ab === 'technician' && power > 0 && power <= TECHNICIAN_MAX_POWER_LIMIT) {
    mult *= TECHNICIAN_MULTIPLIER;
    triggeredAbility = ab;
  }
  if (checkSandForceBoost(ab, moveType, weather)) {
    mult *= SAND_FORCE_MULTIPLIER;
    triggeredAbility = ab!;
  }

  return { mult, triggeredAbility };
}

import { isStatIdExceptHP } from '@/logic/pokemon/statsMath';
import { calculateDetailedStatBreakdown } from './statBreakdownHelper.ts';

export function getEffectiveStatPure(
  pokemon: PurePokemon,
  statKey: keyof PurePokemon,
  stages: PureBattleStages,
  weather: PureBattleWeather | null,
  dayCycle: DayPhase = 'day',
  isGym: boolean = false
): number {
  if (typeof statKey !== 'string' || !isStatIdExceptHP(statKey)) {
    return (pokemon[statKey] as number) || DEFAULT_STAT_FALLBACK_VAL;
  }

  return calculateDetailedStatBreakdown(
    pokemon,
    statKey,
    stages,
    weather,
    { isGym, dayCycle }
  ).final;
}

const HELD_ITEM_TYPE_BOOSTERS: Record<string, string> = {
  charcoal: 'fire',
  magnet: 'electric',
  mystic_water: 'water',
  miracle_seed: 'grass',
  black_belt: 'fighting',
  twisted_spoon: 'psychic',
  spell_tag: 'ghost',
  silver_powder: 'bug',
  poison_barb: 'poison'
};

function calculateHeldItemDamageMultiplier(heldItem: string | undefined, moveType: string, moveCat: string): number {
  if (!heldItem) return 1;
  if (HELD_ITEM_TYPE_BOOSTERS[heldItem] === moveType) return 1.2;
  if (heldItem === 'choiceband' && moveCat === 'physical') return 1.5;
  if (heldItem === 'choicespecs' && moveCat === 'special') return 1.5;
  if (heldItem === 'lifeorb') return 1.3;
  return 1;
}

function calculateSunWeatherBonus(weatherType: string, moveType: string): number {
  if (moveType === 'fire') return WEATHER_BOOST_MULTIPLIER;
  if (moveType === 'water') {
    return (weatherType === 'intense_sun' || weatherType === 'heatwave') ? 0 : WEATHER_REDUCTION_MULTIPLIER;
  }
  return 1;
}

function calculateRainWeatherBonus(weatherType: string, moveType: string): number {
  if (moveType === 'water') return WEATHER_BOOST_MULTIPLIER;
  if (moveType === 'fire') {
    return (weatherType === 'heavy_rain' || weatherType === 'storm') ? 0 : WEATHER_REDUCTION_MULTIPLIER;
  }
  return 1;
}

function calculateThunderstormBonus(moveType: string): number {
  if (moveType === 'electric' || moveType === 'dragon') return WEATHER_BOOST_MULTIPLIER;
  if (moveType === 'fire') return WEATHER_REDUCTION_MULTIPLIER;
  return 1;
}

function calculateActiveWeatherBonus(weather: PureBattleWeather, mechWeather: string, moveType: string): number {
  if (mechWeather === WEATHER_KEYS.SUN) {
    return calculateSunWeatherBonus(weather.type, moveType);
  }
  if (mechWeather === WEATHER_KEYS.RAIN) {
    return calculateRainWeatherBonus(weather.type, moveType);
  }
  if (weather.type === 'thunderstorm') {
    return calculateThunderstormBonus(moveType);
  }
  return 1;
}

function calculateDayCycleBonus(dayCycle: DayPhase | undefined, moveType: string): number {
  if ((dayCycle === 'day' || dayCycle === 'morning') && moveType === 'fire') return DAY_CYCLE_BOOST_MULTIPLIER;
  if ((dayCycle === 'night' || dayCycle === 'dusk') && moveType === 'water') return DAY_CYCLE_BOOST_MULTIPLIER;
  return 1;
}

function calculateSolarMovePenalty(
  isSolarMove: boolean,
  weather: PureBattleWeather | null | undefined,
  mechWeather: string,
  isGym: boolean,
  isMoveWeather: boolean
): number {
  if (!isSolarMove) return 1;
  if (!weather || weather.turns === 0) return 1;
  const isSun = mechWeather === WEATHER_KEYS.SUN;
  const isClear = (mechWeather === WEATHER_KEYS.CLEAR || weather.type === 'clear' || weather.type === 'none') && weather.type !== 'thunderstorm';
  if ((!isGym || isMoveWeather) && !isSun && !isClear) {
    return WEATHER_REDUCTION_MULTIPLIER;
  }
  return 1;
}

function calculateWeatherDamageMultiplier(
  weather: PureBattleWeather | null | undefined,
  mechWeather: string,
  moveType: string,
  isGym: boolean,
  isMoveWeather: boolean,
  isSolarMove = false,
  dayCycle?: DayPhase
): number {
  let weatherMult = 1;
  if ((!isGym || isMoveWeather) && weather && weather.turns !== 0) {
    weatherMult = calculateActiveWeatherBonus(weather, mechWeather, moveType);
  } else if (!isGym && (!weather || weather.type === 'clear' || weather.type === 'none')) {
    weatherMult = calculateDayCycleBonus(dayCycle, moveType);
  }

  const solarPenalty = calculateSolarMovePenalty(isSolarMove, weather, mechWeather, isGym, isMoveWeather);
  return weatherMult * solarPenalty;
}

function calculateDeltaStreamTypeEff(eff: number, defender: PurePokemon, moveType: string, isStrongWinds: boolean): number {
  if (isStrongWinds && (defender.type === 'flying' || defender.type2 === 'flying')) {
    if (eff > 1 && DELTA_STREAM_WEAKNESS_SET.has(moveType)) {
      return eff / 2;
    }
  }
  return eff;
}

function calculateCritOutcome(
  attacker: PurePokemon,
  defender: PurePokemon,
  gen: number,
  forceCrit?: boolean
): { isCrit: boolean; critMult: number } {
  let critStage = 0;
  if (attacker.heldItem === 'scopelens' || attacker.heldItem === 'razorclaw') critStage += 1;
  if (attacker.focusEnergy) critStage += 2;

  let critRate: number;
  if (gen >= 6) {
    const rates = [1 / CRIT_ROLL_DENOMINATOR_GEN6_BASE, 1 / 8, 1 / 2, 1, 1];
    critRate = rates[Math.min(critStage, 4)] ?? 1 / CRIT_ROLL_DENOMINATOR_GEN6_BASE;
  } else if (gen === 5) {
    const rates = [1 / CRIT_ROLL_DENOMINATOR_GEN5_BASE, 1 / 8, 1 / 4, 1 / 3, 1];
    critRate = rates[Math.min(critStage, 4)] ?? 1 / CRIT_ROLL_DENOMINATOR_GEN5_BASE;
  } else {
    critRate = Math.min(1, (1 / CRIT_ROLL_DENOMINATOR_GEN5_BASE) * Math.pow(2, critStage));
  }

  let isCrit = forceCrit !== undefined ? forceCrit : (Math.random() < critRate);
  if (defender.ability === 'shellarmor' || defender.ability === 'battlearmor') isCrit = false;

  const critMult = isCrit ? (gen <= 5 ? 2.0 : 1.5) : 1;
  return { isCrit, critMult };
}

function calculateStabMultiplier(attacker: PurePokemon, moveType: string): number {
  let stab = (moveType === attacker.type || moveType === attacker.type2) ? 1.5 : 1;
  if (attacker.ability === 'adaptability' && stab > 1) stab = 2;
  return stab;
}

function getEffectivenessPresentation(eff: number): { value: number; label: string; class: string } {
  let effLabel = 'Neutro';
  let effClass = 'neutral';
  if (eff > 1) {
    effLabel = 'Súper eficaz';
    effClass = 'boosted';
  } else if (eff < 1 && eff > 0) {
    effLabel = 'Poco eficaz';
    effClass = 'penalized';
  } else if (eff === 0) {
    effLabel = 'Inmune';
    effClass = 'penalized';
  }
  return { value: eff, label: effLabel, class: effClass };
}

function calculateKoChanceText(normalMin: number, normalMax: number, targetHp: number): string {
  if (normalMin >= targetHp) return 'OHKO garantizado';
  if (normalMax >= targetHp) {
    const diff = normalMax - normalMin;
    if (diff > 0) {
      const pct = Math.round(((normalMax - targetHp) / diff) * 100);
      return `OHKO posible (${pct}%)`;
    }
    return 'OHKO posible';
  }
  if (normalMin * 2 >= targetHp) return '2HKO garantizado';
  if (normalMax * 2 >= targetHp) return '2HKO posible';
  if (normalMin * 3 >= targetHp) return '3HKO garantizado';
  if (normalMax * 3 >= targetHp) return '3HKO posible';
  return '4+ HKO probable';
}

function tryGetFixedDamage(move: PureMove, attacker: PurePokemon, defender: PurePokemon): PureDamageResult | null {
  if (move.fixedDmg !== undefined) return { dmg: move.fixedDmg, eff: 1, isNoEffect: false };
  if (move.levelDmg) return { dmg: attacker.level, eff: 1, isNoEffect: false };
  if (move.halfHP) {
    const dmg = Math.max(1, Math.floor((defender.hp ?? 1) / 2));
    return { dmg, eff: 1, isNoEffect: false };
  }
  return null;
}

function adjustCritStages(aStages: PureBattleStages, dStages: PureBattleStages, isPhysical: boolean): void {
  const aKey = isPhysical ? 'atk' : 'spa';
  const dKey = isPhysical ? 'def' : 'spd';
  if ((aStages[aKey as keyof PureBattleStages] ?? 0) < 0) aStages[aKey as keyof PureBattleStages] = 0;
  if ((dStages[dKey as keyof PureBattleStages] ?? 0) > 0) dStages[dKey as keyof PureBattleStages] = 0;
}

function calculateAppliedFinalDamage(
  baseDamage: number,
  critMult: number,
  randomInt: number,
  stab: number,
  modifiers: number,
  isBurnedPhysical: boolean
): number {
  let dmg = Math.max(1, Math.floor(
    Math.floor(
      Math.floor(
        Math.floor(
          Math.floor(baseDamage * critMult) * randomInt
        ) / 100
      ) * stab
    ) * modifiers
  ));
  if (isBurnedPhysical) {
    dmg = Math.floor(dmg * 0.5);
  }
  return dmg;
}

function resolveAbilitiesMultiplier(
  attacker: PurePokemon,
  defender: PurePokemon,
  moveData: PureMove & { cat: string },
  moveType: string,
  weather: PureBattleWeather | null | undefined
): { finalAbilityMult: number; triggeredAbility?: string | null } {
  let { mult: finalAbilityMult, triggeredAbility } = getAbilityMultiplierPure(attacker, moveData, weather);
  if (defender.ability === 'thickfat' && (moveType === 'fire' || moveType === 'ice')) {
    finalAbilityMult *= 0.5;
    triggeredAbility = 'thickfat';
  }
  return { finalAbilityMult, triggeredAbility };
}

function resolveTerrainMultiplier(terrain: string | null | undefined, moveType: string, cleanMoveId: PokemonMoveId): number {
  if (terrain === 'grassyterrain' && moveType === 'ground' && (cleanMoveId === 'earthquake' || cleanMoveId === 'bulldoze' || cleanMoveId === 'magnitude')) {
    return 0.5;
  }
  return 1;
}

function resolveDamageRandomInt(randomFactor?: number): number {
  return randomFactor !== undefined
    ? Math.min(100, Math.round(randomFactor * 100))
    : Math.min(100, DAMAGE_ROLL_MIN_INT + Math.floor(Math.random() * DAMAGE_ROLL_RANGE_INT));
}

const DAMAGE_FORMULA_DIVISOR = 50 as const;
const DAMAGE_FORMULA_BASE_ADDEND = 2 as const;
const DAMAGE_FORMULA_LEVEL_DIVISOR = 5 as const;

function calculateBaseDamageFormula(level: number, power: number, a: number, d: number): number {
  return Math.floor(Math.floor(Math.floor((2 * level) / DAMAGE_FORMULA_LEVEL_DIVISOR + DAMAGE_FORMULA_BASE_ADDEND) * power * a / d) / DAMAGE_FORMULA_DIVISOR) + DAMAGE_FORMULA_BASE_ADDEND;
}

function resolveEnvironmentModifiers(
  weather: PureBattleWeather | null,
  mechWeather: string | undefined,
  moveType: string,
  move: PureMove,
  isGym: boolean,
  dayCycle: DayPhase,
  terrain: string | null | undefined,
  eff: number,
  defender: PurePokemon,
): { weatherMult: number; finalEff: number; terrainMult: number } {
  const isMoveWeather = Boolean(weather && weather.type !== 'clear' && weather.type !== 'none' && weather.turns !== -1);
  const isSolarMove = move.id === 'solarbeam' || move.id === 'solarblade';
  const weatherMult = calculateWeatherDamageMultiplier(weather, mechWeather || '', moveType, isGym, isMoveWeather, isSolarMove, dayCycle);

  const isStrongWinds = Boolean((!isGym || isMoveWeather) && weather && weather.turns !== 0 && weather.type === 'strong_winds');
  const finalEff = calculateDeltaStreamTypeEff(eff, defender, moveType, isStrongWinds);
  const terrainMult = move.id ? resolveTerrainMultiplier(terrain, moveType, move.id) : 1;

  return { weatherMult, finalEff, terrainMult };
}

export function calculateDamagePure(
  attacker: PurePokemon,
  defender: PurePokemon,
  move: PureMove,
  ctx: PureDamageOptions = {},
  dayCycle: DayPhase = 'day',
  randomFactor?: number,
  forceCrit?: boolean
): PureDamageResult {
  const { atkStages = 0, defStages = 0, weather: rawWeather = null } = ctx;

  const hasAclimatacion = attacker.ability === 'cloudnine' || defender.ability === 'cloudnine';
  const weather = hasAclimatacion ? null : rawWeather;

  const power    = move.power ?? 0;
  const moveType = move.type  ?? 'normal';
  const moveCat  = getMoveCategory({ ...move, type: moveType });

  const fixedResult = tryGetFixedDamage(move, attacker, defender);
  if (fixedResult) return fixedResult;

  const eff = getCombinedEff(moveType, defender, attacker, weather?.type);

  if (power === 0) return { dmg: 0, eff, isNoEffect: eff === 0 };

  const mechWeather = getMechanicalWeather(weather?.type);
  const isPhysical = moveCat === 'physical';

  const aStages: PureBattleStages = { [isPhysical ? 'atk' : 'spa']: atkStages };
  const dStages: PureBattleStages = { [isPhysical ? 'def' : 'spd']: defStages };

  const gen = ACTIVE_GENERATION as number;
  const { isCrit, critMult } = calculateCritOutcome(attacker, defender, gen, forceCrit);

  if (isCrit) {
    adjustCritStages(aStages, dStages, isPhysical);
  }

  const isGym = ctx.isGym || false;
  const A = getEffectiveStatPure(attacker, isPhysical ? 'atk' : 'spa', aStages, weather, dayCycle, isGym);
  const D = getEffectiveStatPure(defender, isPhysical ? 'def' : 'spd', dStages, weather, dayCycle, isGym);

  // Damage formula matching Showdown's exact integer arithmetic (floor at each step)
  const baseDamage = calculateBaseDamageFormula(attacker.level, power, A, D);

  const { finalAbilityMult, triggeredAbility } = resolveAbilitiesMultiplier(
    attacker,
    defender,
    { ...move, type: moveType, power, cat: moveCat },
    moveType,
    weather
  );

  const itemMult = calculateHeldItemDamageMultiplier(attacker.heldItem ?? undefined, moveType, moveCat);
  const stab = calculateStabMultiplier(attacker, moveType);
  const { weatherMult, finalEff, terrainMult } = resolveEnvironmentModifiers(
    weather,
    mechWeather,
    moveType,
    move,
    isGym,
    dayCycle,
    ctx.terrain,
    eff,
    defender,
  );
  const randomInt = resolveDamageRandomInt(randomFactor);

  const totalModifiers = finalEff * finalAbilityMult * weatherMult * itemMult * terrainMult;
  const isBurnedPhysical = attacker.status === 'brn' && isPhysical && attacker.ability !== 'guts';

  const finalDmg = (power > 0 && finalEff > 0 && weatherMult > 0)
    ? calculateAppliedFinalDamage(baseDamage, critMult, randomInt, stab, totalModifiers, isBurnedPhysical)
    : 0;

  return {
    dmg: finalDmg,
    damage: finalDmg,
    eff: finalEff,
    stab,
    power,
    isCrit,
    isSuperEffective: finalEff > 1,
    isNotVeryEffective: finalEff > 0 && finalEff < 1,
    isNoEffect: finalEff === 0 || weatherMult === 0,
    triggeredAbility
  };
}

export interface PureDamageRange {
  normalMin: number
  normalMax: number
  normalPctMin: number
  normalPctMax: number
  critMin: number
  critMax: number
  critPctMin: number
  critPctMax: number
  koChanceText: string
}

export function calculateDamageRangePure(
  attacker: PurePokemon,
  defender: PurePokemon,
  move: PureMove,
  ctx: PureDamageOptions,
  dayCycle: DayPhase = 'day'
): { effectiveness: { value: number; label: string; class: string } | null; damageRange: PureDamageRange | null } {
  const sim = calculateDamagePure(attacker, defender, move, ctx, dayCycle, 1.0, false);
  const effectiveness = getEffectivenessPresentation(sim.eff);

  let damageRange: PureDamageRange | null = null;
  const isStatus = move.cat === 'status';

  if (!isStatus && (move.power ?? 0) > 0) {
    const normalMin = calculateDamagePure(attacker, defender, move, ctx, dayCycle, 0.85, false).dmg;
    const normalMax = calculateDamagePure(attacker, defender, move, ctx, dayCycle, 1.0, false).dmg;

    const critMin = calculateDamagePure(attacker, defender, move, ctx, dayCycle, 0.85, true).dmg;
    const critMax = calculateDamagePure(attacker, defender, move, ctx, dayCycle, 1.0, true).dmg;

    const rivalMaxHp = defender.maxHp || 100;
    const normalPctMin = Math.round((normalMin / rivalMaxHp) * 100);
    const normalPctMax = Math.round((normalMax / rivalMaxHp) * 100);
    const critPctMin = Math.round((critMin / rivalMaxHp) * 100);
    const critPctMax = Math.round((critMax / rivalMaxHp) * 100);

    const targetHp = (defender.hp !== undefined ? defender.hp : defender.maxHp) ?? 100;
    const koChanceText = calculateKoChanceText(normalMin, normalMax, targetHp);

    damageRange = {
      normalMin,
      normalMax,
      normalPctMin,
      normalPctMax,
      critMin,
      critMax,
      critPctMin,
      critPctMax,
      koChanceText
    };
  }

  return { effectiveness, damageRange };
}
