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

export interface NatureData {
  up: string | null;
  down: string | null;
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
 * Deterministically calculates a Pokémon's stats from its base values, IVs, level, and nature.
 *
 * @param level - The Pokémon's level.
 * @param ivs - The individual values (0-31).
 * @param base - The species base stats.
 * @param natureData - Which stat goes up (+10%) and down (-10%).
 * @param isDittoMetalPowder - Special case: Ditto with Metal Powder gets 1.5x Defense.
 * @param evs - The effort values (0-252).
 */
export function calcStatsPure(
  level: number,
  ivs: IVs,
  base: BaseStats,
  natureData: NatureData,
  isDittoMetalPowder: boolean = false,
  evs?: { hp?: number; atk?: number; def?: number; spa?: number; spd?: number; spe?: number } | null
): CalculatedStats {
  const getStat = (baseVal: number, iv: number, ev: number, lvl: number, statName: string) => {
    let val = Math.floor(((baseVal * 2) + iv + Math.floor(ev / 4)) * lvl / 100 + 5);
    if (natureData.up === statName) val = Math.floor(val * 1.1);
    if (natureData.down === statName) val = Math.floor(val * 0.9);
    return val;
  };

  const hpEv = evs?.hp ?? 0;
  const atkEv = evs?.atk ?? 0;
  const defEv = evs?.def ?? 0;
  const spaEv = evs?.spa ?? 0;
  const spdEv = evs?.spd ?? 0;
  const speEv = evs?.spe ?? 0;

  const maxHp = Math.floor(((base.hp * 2) + ivs.hp + Math.floor(hpEv / 4)) * level / 100 + level + 10);
  const atk = getStat(base.atk, ivs.atk, atkEv, level, 'Ataque');
  let def = getStat(base.def, ivs.def, defEv, level, 'Defensa');
  
  if (isDittoMetalPowder) {
    def = Math.floor(def * 1.5);
  }

  const spa = getStat(base.spa ?? base.atk, ivs.spa, spaEv, level, 'At. Esp');
  const spd = getStat(base.spd ?? base.def, ivs.spd, spdEv, level, 'Def. Esp');
  const spe = getStat(base.spe ?? 45, ivs.spe, speEv, level, 'Velocidad');

  return { maxHp, atk, def, spa, spd, spe };
}
