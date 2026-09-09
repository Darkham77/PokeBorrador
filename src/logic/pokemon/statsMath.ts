/**
 * src/logic/pokemon/statsMath.ts
 *
 * Pure math for calculating Pokémon stats, EXP, and levels.
 * Zero browser, Vue, Pinia, or Supabase dependencies.
 *
 * @module statsMath
 */

import { MAX_POKEMON_LEVEL } from '../../data/system/constants.ts';
import {
  ROCKET_SELL_LEVEL_MULTIPLIER,
  MAX_TOTAL_IVS_STAT_SUM,
  ROCKET_SELL_IV_BONUS_CAP,
  ROCKET_SELL_CUT_MULTIPLIER,
} from '../constants/gameplay.ts';
import { POKEMON_STAT_KEYS, type PokemonStatKey } from '@/types/pokemon/pokemon.ts';

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

export type StatIDExceptHP = Exclude<PokemonStatKey, 'hp'>;
export const COMBAT_STAT_IDS = POKEMON_STAT_KEYS.filter((s): s is StatIDExceptHP => s !== 'hp');
export const COMBAT_STAT_IDS_SET: ReadonlySet<string> = new Set(COMBAT_STAT_IDS); // runtime-set: Fast O(1) membership lookup set

export const POKEMON_STAT_KEYS_SET: ReadonlySet<string> = new Set(POKEMON_STAT_KEYS); // runtime-set: Fast O(1) membership lookup set

export const STAT_NAMES_ES: Record<PokemonStatKey, string> = {
  hp: 'PS',
  atk: 'Ataque',
  def: 'Defensa',
  spa: 'At. Especial',
  spd: 'Def. Especial',
  spe: 'Velocidad',
};

export const STAT_SHORT_NAMES_ES: Record<PokemonStatKey, string> = {
  hp: 'PS',
  atk: 'Ataque',
  def: 'Defensa',
  spa: 'At. Esp',
  spd: 'Def. Esp',
  spe: 'Velocidad',
};

export interface NatureData {
  up: PokemonStatKey | null;
  down: PokemonStatKey | null;
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
  const getStat = (baseVal: number, iv: number, ev: number, lvl: number, statId: PokemonStatKey) => {
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

export function isStatId(stat: string): stat is PokemonStatKey {
  return POKEMON_STAT_KEYS_SET.has(stat);
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

export function calculateTotalIVs(ivs?: Partial<Record<PokemonStatKey, number>> | null): number {
  if (!ivs) return 0;
  return (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0);
}

export const MAX_IV_VALUE = 31 as const;

export function hasMaxIV(ivs?: Partial<Record<PokemonStatKey, number>> | null): boolean {
  if (!ivs) return false;
  return (
    ivs.hp === MAX_IV_VALUE ||
    ivs.atk === MAX_IV_VALUE ||
    ivs.def === MAX_IV_VALUE ||
    ivs.spa === MAX_IV_VALUE ||
    ivs.spd === MAX_IV_VALUE ||
    ivs.spe === MAX_IV_VALUE
  );
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

/**
 * Pure mathematical formula for selling a Pokémon to Team Rocket (Black Market).
 * Formula: floor((Level * 50 + (Total IVs / 186) * 500) * 0.8)
 */
export function calculateRocketSellPriceRaw(level: number, totalIvs: number): number {
  return Math.floor((level * ROCKET_SELL_LEVEL_MULTIPLIER + (totalIvs / MAX_TOTAL_IVS_STAT_SUM) * ROCKET_SELL_IV_BONUS_CAP) * ROCKET_SELL_CUT_MULTIPLIER);
}




