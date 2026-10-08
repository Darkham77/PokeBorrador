import type { DayPhase } from '@/logic/utils/timeUtils';
import { ACTIVE_GENERATION } from '@/data/system/constants';
import { isStatIdExceptHP } from '@/logic/pokemon/statsMath';
import { getMechanicalWeather } from '../weather/weatherRegistry.ts';
import { calculateDetailedStatBreakdown } from './statBreakdownHelper.ts';
import type {
  PurePokemon,
  PureMove,
  PureBattleWeather,
  PureBattleStages,
  PureDamageOptions,
  PureDamageResult
} from './battleMathTypes.ts';
export * from './battleMathTypes.ts';

import { getCombinedEff, getEffectivenessPresentation } from './battleTypeEffectiveness.ts';
import {
  getMoveCategory,
  getAbilityMultiplierPure,
  calculateHeldItemDamageMultiplier,
  calculateStabMultiplier,
  resolveAbilitiesMultiplier
} from './battleAbilityDamage.ts';
export { getMoveCategory, getAbilityMultiplierPure };

import { resolveEnvironmentModifiers } from './battleEnvironmentModifiers.ts';
import {
  calculateCritOutcome,
  adjustCritStages,
  resolveDamageRandomInt,
  calculateBaseDamageFormula,
  calculateAppliedFinalDamage,
  calculateKoChanceText,
  tryGetFixedDamage
} from './battleDamageRoll.ts';

const DEFAULT_STAT_FALLBACK_VAL = 10 as const;
const DAMAGE_ROLL_MIN_RATIO = 0.85 as const;
const DAMAGE_ROLL_MAX_RATIO = 1.0 as const;

export const STAGE_MULTIPLIERS_STAT: Record<string, number> = {
  '-6': 2 / 8, '-5': 2 / 7, '-4': 2 / 6, '-3': 2 / 5, '-2': 2 / 4, '-1': 2 / 3,
  '0': 1.0, '1': 3 / 2, '2': 4 / 2, '3': 5 / 2, '4': 6 / 2, '5': 7 / 2, '6': 8 / 2
};

export const STAGE_MULTIPLIERS_ACC: Record<string, number> = {
  '-6': 3 / 9, '-5': 3 / 8, '-4': 3 / 7, '-3': 3 / 6, '-2': 3 / 5, '-1': 3 / 4,
  '0': 1.0, '1': 4 / 3, '2': 5 / 3, '3': 6 / 3, '4': 7 / 3, '5': 8 / 3, '6': 9 / 3
};

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

  const power = move.power ?? 0;
  const moveType = move.type ?? 'normal';
  const moveCat = getMoveCategory({ ...move, type: moveType });

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
  normalMin: number;
  normalMax: number;
  normalPctMin: number;
  normalPctMax: number;
  critMin: number;
  critMax: number;
  critPctMin: number;
  critPctMax: number;
  koChanceText: string;
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
    const normalMin = calculateDamagePure(attacker, defender, move, ctx, dayCycle, DAMAGE_ROLL_MIN_RATIO, false).dmg;
    const normalMax = calculateDamagePure(attacker, defender, move, ctx, dayCycle, DAMAGE_ROLL_MAX_RATIO, false).dmg;

    const critMin = calculateDamagePure(attacker, defender, move, ctx, dayCycle, DAMAGE_ROLL_MIN_RATIO, true).dmg;
    const critMax = calculateDamagePure(attacker, defender, move, ctx, dayCycle, DAMAGE_ROLL_MAX_RATIO, true).dmg;

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
