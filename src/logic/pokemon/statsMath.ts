/**
 * src/logic/pokemon/statsMath.ts
 *
 * Pure math for calculating Pokémon stats, EXP, and levels.
 * Zero browser, Vue, Pinia, or Supabase dependencies.
 *
 * @module statsMath
 */

import { MAX_POKEMON_LEVEL } from '../../data/system/constants.ts';

/**
 * Calculates the EXP needed for the current level.
 * Medium Fast curve scaled for web game: (Lv+1)^3 - Lv^3
 */
export function getExpNeededPure(level: number): number {
  if (level >= MAX_POKEMON_LEVEL) return 0;
  return Math.floor(Math.pow(level + 1, 3) - Math.pow(level, 3));
}

export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spa?: number;
  spd?: number;
  spe?: number;
}

export interface IVs {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export const COMBAT_STAT_IDS = ['atk', 'def', 'spa', 'spd', 'spe'] as const; // domain-ok
export type StatIDExceptHP = (typeof COMBAT_STAT_IDS)[number];
export const COMBAT_STAT_IDS_SET: ReadonlySet<string> = new Set(COMBAT_STAT_IDS); // runtime-set

export const STAT_IDS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;
export type StatId = (typeof STAT_IDS)[number];
export const STAT_IDS_SET: ReadonlySet<string> = new Set(STAT_IDS); // runtime-set

export interface NatureData {
  up: StatId | null;
  down: StatId | null;
}

export interface CalculatedStats {
  maxHp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

/**
 * Calculates stats stat-by-stat according to standard Gen 3+ formulas.
 */
export function calcStatsPure(
  level: number,
  ivs: IVs,
  base: BaseStats,
  natureData: NatureData,
  isDittoMetalPowder: boolean = false,
  evs?: { hp?: number; atk?: number; def?: number; spa?: number; spd?: number; spe?: number } | null,
  isDittoQuickPowder: boolean = false
): CalculatedStats {
  const getStat = (baseVal: number, iv: number, ev: number, lvl: number, statId: StatId) => {
    let val = Math.floor(((baseVal * 2) + iv + Math.floor(ev / 4)) * lvl / 100 + 5);
    if (natureData.up === statId) val = Math.floor(val * 1.1);
    if (natureData.down === statId) val = Math.floor(val * 0.9);
    return val;
  };

  const clampEv = (val: number) => Math.min(252, Math.max(0, val));

  const hpEv = clampEv(evs?.hp ?? 0);
  const atkEv = clampEv(evs?.atk ?? 0);
  const defEv = clampEv(evs?.def ?? 0);
  const spaEv = clampEv(evs?.spa ?? 0);
  const spdEv = clampEv(evs?.spd ?? 0);
  const speEv = clampEv(evs?.spe ?? 0);

  const maxHp = base.hp === 1 ? 1 : Math.floor(((base.hp * 2) + ivs.hp + Math.floor(hpEv / 4)) * level / 100 + level + 10);
  const atk = getStat(base.atk, ivs.atk, atkEv, level, 'atk');
  let def = getStat(base.def, ivs.def, defEv, level, 'def');
  
  if (isDittoMetalPowder) {
    def = Math.floor(def * 1.5);
  }

  const spa = getStat(base.spa ?? base.atk, ivs.spa, spaEv, level, 'spa');
  let spd = getStat(base.spd ?? base.def, ivs.spd, spdEv, level, 'spd');
  
  if (isDittoMetalPowder) {
    spd = Math.floor(spd * 1.5);
  }

  const DEFAULT_BASE_SPEED = 45;
  let spe = getStat(base.spe ?? DEFAULT_BASE_SPEED, ivs.spe, speEv, level, 'spe');
  if (isDittoQuickPowder) {
    spe = Math.floor(spe * 2);
  }

  return { maxHp, atk, def, spa, spd, spe };
}

export function isStatId(stat: string): stat is StatId {
  return STAT_IDS_SET.has(stat);
}

export function isStatIdExceptHP(stat: string): stat is StatIDExceptHP {
  return COMBAT_STAT_IDS_SET.has(stat);
}

export function requireStatIdExceptHP(stat: string): StatIDExceptHP {
  if (!isStatIdExceptHP(stat)) {
    throw new Error(`[Stats] Invalid StatIDExceptHP: "${stat}". Expected one of: ${COMBAT_STAT_IDS.join(', ')}`);
  }
  return stat;
}

export function calculateTotalIVs(ivs?: Partial<Record<StatId, number>> | null): number {
  if (!ivs) return 0;
  return (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0);
}

export function hasMaxIV(ivs?: Partial<Record<StatId, number>> | null): boolean {
  if (!ivs) return false;
  return ivs.hp === 31 || ivs.atk === 31 || ivs.def === 31 || ivs.spa === 31 || ivs.spd === 31 || ivs.spe === 31;
}

export function calculateTotalBaseStats(stats?: Partial<BaseStats> | null): number {
  if (!stats) return 0;
  return (stats.hp || 0) + (stats.atk || 0) + (stats.def || 0) + (stats.spa || 0) + (stats.spd || 0) + (stats.spe || 0);
}

export function modifyStatStage(stages: Record<string, number>, stat: string, delta: number): number {
  const current = stages[stat] || 0;
  const next = Math.max(-6, Math.min(6, current + delta));
  stages[stat] = next;
  return next;
}



