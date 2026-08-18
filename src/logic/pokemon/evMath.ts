/**
 * src/logic/pokemon/evMath.ts
 *
 * Pure math and limit logic for Pokemon Effort Values (EVs).
 * Zero browser, Vue, Pinia, or database dependencies.
 */

import { POKEMON_STAT_KEYS, type PokemonEVs, type PokemonStatKey } from '@/types/pokemon/pokemon';
import type { EvYield } from '@/data/pokemon/evYields';

export const MAX_TOTAL_EVS = 510;
export const MAX_STAT_EVS = 252;
export const MIN_STAT_EVS = 0;
export const MAX_FRIENDSHIP = 255;

export const VITAMIN_EV_GAIN = 10;
export const MOCHI_EV_GAIN = 10;
export const FEATHER_EV_GAIN = 1;
export const BERRY_EV_REDUCTION = 10;
export const POWER_ITEM_EV_BONUS = 8;
export const MACHO_BRACE_EV_MULTIPLIER = 2;
export const POKERUS_EV_MULTIPLIER = 2;

export const POWER_ITEMS: Record<string, PokemonStatKey> = {
  powerweight: 'hp',
  powerbracer: 'atk',
  powerbelt: 'def',
  powerlens: 'spa',
  powerband: 'spd',
  poweranklet: 'spe',
};

export const MOCHIS: Record<string, PokemonStatKey> = {
  healthmochi: 'hp',
  musclemochi: 'atk',
  resistmochi: 'def',
  geniusmochi: 'spa',
  clevermochi: 'spd',
  swiftmochi: 'spe',
};

export const EV_BERRIES: Record<string, PokemonStatKey> = {
  pomegberry: 'hp',
  kelpsyberry: 'atk',
  qualotberry: 'def',
  hondewberry: 'spa',
  grepaberry: 'spd',
  tamatoberry: 'spe',
};

export const VITAMINS: Record<string, PokemonStatKey> = {
  hpup: 'hp',
  protein: 'atk',
  iron: 'def',
  calcium: 'spa',
  zinc: 'spd',
  carbos: 'spe',
};

export const FEATHERS: Record<string, PokemonStatKey> = {
  healthfeather: 'hp',
  musclefeather: 'atk',
  resistfeather: 'def',
  geniusfeather: 'spa',
  cleverfeather: 'spd',
  swiftfeather: 'spe',
  healthwing: 'hp',
  musclewing: 'atk',
  resistwing: 'def',
  geniuswing: 'spa',
  cleverwing: 'spd',
  swiftwing: 'spe',
};

export function createDefaultEvs(): PokemonEVs {
  return {
    hp: MIN_STAT_EVS,
    atk: MIN_STAT_EVS,
    def: MIN_STAT_EVS,
    spa: MIN_STAT_EVS,
    spd: MIN_STAT_EVS,
    spe: MIN_STAT_EVS,
  };
}

export function calculateTotalEvs(evs?: Partial<PokemonEVs> | null): number {
  if (!evs) return MIN_STAT_EVS;
  return (
    (evs.hp || MIN_STAT_EVS) +
    (evs.atk || MIN_STAT_EVS) +
    (evs.def || MIN_STAT_EVS) +
    (evs.spa || MIN_STAT_EVS) +
    (evs.spd || MIN_STAT_EVS) +
    (evs.spe || MIN_STAT_EVS)
  );
}

export interface EvGainResult {
  updatedEvs: PokemonEVs;
  totalGained: number;
  reachedMax: boolean;
  statGains: Partial<Record<PokemonStatKey, number>>;
}

export function applyEvGains(
  currentEvs: PokemonEVs | undefined | null,
  baseYield: EvYield,
  heldItem?: string | null,
  hasPokerus?: boolean
): EvGainResult {
  const current: PokemonEVs = currentEvs ? { ...currentEvs } : createDefaultEvs();
  let currentTotal = calculateTotalEvs(current);
  const remainingTotal = Math.max(0, MAX_TOTAL_EVS - currentTotal);

  if (remainingTotal <= 0) {
    return {
      updatedEvs: current,
      totalGained: 0,
      reachedMax: true,
      statGains: {},
    };
  }

  const statGains: Partial<Record<PokemonStatKey, number>> = {};
  let totalGained = 0;

  const isMachoBrace = heldItem === 'machobrace';
  const powerItemStat = heldItem ? POWER_ITEMS[heldItem] : null;

  for (const stat of POKEMON_STAT_KEYS) {
    let rawGain = baseYield[stat] || 0;
    if (isMachoBrace) {
      rawGain *= MACHO_BRACE_EV_MULTIPLIER;
    }
    if (powerItemStat === stat) {
      rawGain += POWER_ITEM_EV_BONUS;
    }
    if (hasPokerus) {
      rawGain *= POKERUS_EV_MULTIPLIER;
    }

    if (rawGain > 0) {
      const currentStatEv = current[stat];
      const maxStatCanGain = Math.max(0, MAX_STAT_EVS - currentStatEv);
      const allowedGain = Math.min(rawGain, maxStatCanGain, MAX_TOTAL_EVS - (currentTotal + totalGained));

      if (allowedGain > 0) {
        current[stat] = currentStatEv + allowedGain;
        totalGained += allowedGain;
        statGains[stat] = allowedGain;
      }
    }
  }

  currentTotal += totalGained;

  return {
    updatedEvs: current,
    totalGained,
    reachedMax: currentTotal >= MAX_TOTAL_EVS,
    statGains,
  };
}

export function canUseVitamin(currentEvs: PokemonEVs | undefined | null, stat: PokemonStatKey): boolean {
  const evs = currentEvs || createDefaultEvs();
  const total = calculateTotalEvs(evs);
  if (total >= MAX_TOTAL_EVS) return false;
  return (evs[stat] || 0) < MAX_STAT_EVS;
}

function applyStatEvIncrement(
  currentEvs: PokemonEVs | undefined | null,
  stat: PokemonStatKey,
  gainAmount: number
): { updatedEvs: PokemonEVs; success: boolean; gained: number } {
  const evs: PokemonEVs = currentEvs ? { ...currentEvs } : createDefaultEvs();
  if (!canUseVitamin(evs, stat)) {
    return { updatedEvs: evs, success: false, gained: 0 };
  }

  const currentTotal = calculateTotalEvs(evs);
  const currentStat = evs[stat];
  const maxCanGain = Math.min(gainAmount, MAX_STAT_EVS - currentStat, MAX_TOTAL_EVS - currentTotal);

  if (maxCanGain <= 0) {
    return { updatedEvs: evs, success: false, gained: 0 };
  }

  evs[stat] = currentStat + maxCanGain;
  return { updatedEvs: evs, success: true, gained: maxCanGain };
}

export function applyVitamin(
  currentEvs: PokemonEVs | undefined | null,
  stat: PokemonStatKey
): { updatedEvs: PokemonEVs; success: boolean; gained: number } {
  return applyStatEvIncrement(currentEvs, stat, VITAMIN_EV_GAIN);
}

export function applyFeather(
  currentEvs: PokemonEVs | undefined | null,
  stat: PokemonStatKey
): { updatedEvs: PokemonEVs; success: boolean; gained: number } {
  return applyStatEvIncrement(currentEvs, stat, FEATHER_EV_GAIN);
}

export function canUseEvBerry(
  currentEvs: PokemonEVs | undefined | null,
  stat: PokemonStatKey,
  friendship: number = 0,
  maxFriendship: number = MAX_FRIENDSHIP
): boolean {
  const evs = currentEvs || createDefaultEvs();
  const hasEvsToReduce = (evs[stat] || 0) > MIN_STAT_EVS;
  const canGainFriendship = friendship < maxFriendship;
  return hasEvsToReduce || canGainFriendship;
}

export function applyEvBerry(
  currentEvs: PokemonEVs | undefined | null,
  stat: PokemonStatKey
): { updatedEvs: PokemonEVs; success: boolean; reducedAmount: number } {
  const evs: PokemonEVs = currentEvs ? { ...currentEvs } : createDefaultEvs();
  const currentStat = evs[stat] || 0;

  if (currentStat <= MIN_STAT_EVS) {
    return { updatedEvs: evs, success: false, reducedAmount: 0 };
  }

  const reducedAmount = Math.min(BERRY_EV_REDUCTION, currentStat);
  evs[stat] = Math.max(MIN_STAT_EVS, currentStat - reducedAmount);

  return { updatedEvs: evs, success: true, reducedAmount };
}

export function applyMochi(
  currentEvs: PokemonEVs | undefined | null,
  stat: PokemonStatKey
): { updatedEvs: PokemonEVs; success: boolean; gained: number } {
  return applyStatEvIncrement(currentEvs, stat, MOCHI_EV_GAIN);
}

export function resetAllEvs(
  currentEvs: PokemonEVs | undefined | null
): { updatedEvs: PokemonEVs; success: boolean; totalCleared: number } {
  const total = calculateTotalEvs(currentEvs);
  if (total <= 0) {
    return {
      updatedEvs: currentEvs ? { ...currentEvs } : createDefaultEvs(),
      success: false,
      totalCleared: 0,
    };
  }

  return {
    updatedEvs: createDefaultEvs(),
    success: true,
    totalCleared: total,
  };
}

