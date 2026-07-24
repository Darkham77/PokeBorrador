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
  if (level >= MAX_POKEMON_LEVEL) return Infinity;
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

export type StatId = 'atk' | 'def' | 'spa' | 'spd' | 'spe';

export interface NatureData {
  up: StatId | string | null;
  down: StatId | string | null;
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
  const getStat = (baseVal: number, iv: number, ev: number, lvl: number, statId: StatId | string) => {
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

  let spe = getStat(base.spe ?? 45, ivs.spe, speEv, level, 'spe');
  if (isDittoQuickPowder) {
    spe = Math.floor(spe * 2);
  }

  return { maxHp, atk, def, spa, spd, spe };
}
