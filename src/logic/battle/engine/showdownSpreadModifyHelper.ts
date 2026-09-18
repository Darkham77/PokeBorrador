/**
 * src/logic/battle/engine/showdownSpreadModifyHelper.ts
 *
 * Web Worker & Simulation Engine helper for Showdown spread modification.
 * Applies custom stat injections directly to Battle.prototype.spreadModify.
 * Exclusively consumed by Web Worker and Showdown Battle Factory.
 */

import { Battle } from '@pkmn/sim';
import type { PokemonSet, StatsTable } from '@pkmn/sim';

export const statsMap = new Map<string, Record<string, number>>();

const SPREAD_MODIFY_PATCH_MARKER = Symbol.for('pokevicio.showdown.spread-modify-patched');

const MIN_STAT_CLAMP = 1;
const MAX_STAT_CLAMP = 9999;

function normalizeAndClampStats(rawStats: Record<string, number>): StatsTable {
  const clampStat = (val: number) => Math.max(MIN_STAT_CLAMP, Math.min(Math.floor(val), MAX_STAT_CLAMP));
  const mapped: Record<string, number> = { ...rawStats };
  if (mapped.maxHp !== undefined && mapped.hp === undefined) {
    mapped.hp = mapped.maxHp;
  }
  for (const k of Object.keys(mapped)) {
    if (typeof mapped[k] === 'number') {
      mapped[k] = clampStat(mapped[k]);
    }
  }
  return mapped as StatsTable;
}

function resolveCustomSpreadStats(set?: PokemonSet): StatsTable | null {
  if (!set) return null;

  if (set.name) {
    const stats = statsMap.get(set.name);
    if (stats) {
      return normalizeAndClampStats(stats);
    }
  }

  const setStats = Reflect.get(set, 'stats') as Record<string, number> | undefined; // open-record: Custom Showdown stats dictionary
  if (setStats) {
    return normalizeAndClampStats(setStats);
  }

  return null;
}

/**
 * Aplica el monkey-patch spreadModify a Battle de Showdown para inyectar estadísticas custom.
 */
export function patchShowdownSpreadModify(_getIsE2eMode?: () => boolean): void {
  if (Reflect.get(Battle.prototype, SPREAD_MODIFY_PATCH_MARKER) === true) return;
  const originalSpreadModify = Battle.prototype.spreadModify;
  Battle.prototype.spreadModify = function (baseStats, set) {
    const customStats = resolveCustomSpreadStats(set);
    if (customStats) {
      return customStats;
    }
    return originalSpreadModify.call(this, baseStats, set);
  };
  Reflect.set(Battle.prototype, SPREAD_MODIFY_PATCH_MARKER, true);
}
