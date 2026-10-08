import type { PurePokemon, PureMove, PureBattleStages, PureDamageResult } from './battleMathTypes.ts';

const CRIT_ROLL_DENOMINATOR_GEN6_BASE = 24 as const;
const CRIT_ROLL_DENOMINATOR_GEN5_BASE = 16 as const;
const DAMAGE_ROLL_MIN_INT = 85 as const;
const DAMAGE_ROLL_RANGE_INT = 16 as const;
const DAMAGE_FORMULA_DIVISOR = 50 as const;
const DAMAGE_FORMULA_BASE_ADDEND = 2 as const;
const DAMAGE_FORMULA_LEVEL_DIVISOR = 5 as const;
const CRIT_MULTIPLIER_GEN5 = 2.0 as const;
const CRIT_MULTIPLIER_GEN6 = 1.5 as const;
const BURN_PHYSICAL_DAMAGE_MULTIPLIER = 0.5 as const;
const PERCENT_CONVERSION_FACTOR = 100 as const;

export function calculateCritOutcome(
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
    critRate = rates[Math.min(critStage, 4)] ?? (1 / CRIT_ROLL_DENOMINATOR_GEN6_BASE);
  } else if (gen === 5) {
    const rates = [1 / CRIT_ROLL_DENOMINATOR_GEN5_BASE, 1 / 8, 1 / 4, 1 / 3, 1];
    critRate = rates[Math.min(critStage, 4)] ?? (1 / CRIT_ROLL_DENOMINATOR_GEN5_BASE);
  } else {
    critRate = Math.min(1, (1 / CRIT_ROLL_DENOMINATOR_GEN5_BASE) * Math.pow(2, critStage));
  }

  let isCrit = forceCrit !== undefined ? forceCrit : (Math.random() < critRate);
  if (defender.ability === 'shellarmor' || defender.ability === 'battlearmor') isCrit = false;

  const critMult = isCrit ? (gen <= 5 ? CRIT_MULTIPLIER_GEN5 : CRIT_MULTIPLIER_GEN6) : 1;
  return { isCrit, critMult };
}

export function adjustCritStages(aStages: PureBattleStages, dStages: PureBattleStages, isPhysical: boolean): void {
  const aKey = isPhysical ? 'atk' : 'spa';
  const dKey = isPhysical ? 'def' : 'spd';
  if ((aStages[aKey as keyof PureBattleStages] ?? 0) < 0) aStages[aKey as keyof PureBattleStages] = 0;
  if ((dStages[dKey as keyof PureBattleStages] ?? 0) > 0) dStages[dKey as keyof PureBattleStages] = 0;
}

export function resolveDamageRandomInt(randomFactor?: number): number {
  return randomFactor !== undefined
    ? Math.min(PERCENT_CONVERSION_FACTOR, Math.round(randomFactor * PERCENT_CONVERSION_FACTOR))
    : Math.min(PERCENT_CONVERSION_FACTOR, DAMAGE_ROLL_MIN_INT + Math.floor(Math.random() * DAMAGE_ROLL_RANGE_INT));
}

export function calculateBaseDamageFormula(level: number, power: number, a: number, d: number): number {
  return (
    Math.floor(
      Math.floor(
        Math.floor((2 * level) / DAMAGE_FORMULA_LEVEL_DIVISOR + DAMAGE_FORMULA_BASE_ADDEND) * power * a / d
      ) / DAMAGE_FORMULA_DIVISOR
    ) + DAMAGE_FORMULA_BASE_ADDEND
  );
}

export function calculateAppliedFinalDamage(
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
        ) / PERCENT_CONVERSION_FACTOR
      ) * stab
    ) * modifiers
  ));
  if (isBurnedPhysical) {
    dmg = Math.floor(dmg * BURN_PHYSICAL_DAMAGE_MULTIPLIER);
  }
  return dmg;
}

export function calculateKoChanceText(normalMin: number, normalMax: number, targetHp: number): string {
  if (normalMin >= targetHp) return 'OHKO garantizado';
  if (normalMax >= targetHp) {
    const diff = normalMax - normalMin;
    if (diff > 0) {
      const pct = Math.round(((normalMax - targetHp) / diff) * PERCENT_CONVERSION_FACTOR);
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

export function tryGetFixedDamage(move: PureMove, attacker: PurePokemon, defender: PurePokemon): PureDamageResult | null {
  if (move.fixedDmg !== undefined) return { dmg: move.fixedDmg, eff: 1, isNoEffect: false };
  if (move.levelDmg) return { dmg: attacker.level, eff: 1, isNoEffect: false };
  if (move.halfHP) {
    const dmg = Math.max(1, Math.floor((defender.hp ?? 1) / 2));
    return { dmg, eff: 1, isNoEffect: false };
  }
  return null;
}
