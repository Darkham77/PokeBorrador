// ============================================================
// Sets Database — loads random-sets.json for inference
// Adapted from external/pokemon-showdown-ai/src/inference/sets-database.ts
// external/ is excluded from TS scope by design; dynamic import avoids
// a compile-time path dependency on a non-src directory.
// ============================================================

import type { RandomBattleSetEntry } from './types';

interface RawEntry {
  pokemon: string;
  sets: RandomBattleSetEntry[];
}

function toId(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const DB = new Map<string, RandomBattleSetEntry[]>();

// Dynamic import keeps external/ out of the TS compilation graph.
// The path is a static literal — Vite resolves it at build time.
 
(async () => {
  try {
    const mod = await import('../../../../../external/pokemon-showdown-ai/data/random-sets.json');
    const entries = (mod as { default: RawEntry[] }).default as RawEntry[];
    for (const entry of entries) DB.set(toId(entry.pokemon), entry.sets);
  } catch {
    console.debug('[HeuristicAI] random-sets.json unavailable — inference uses revealed moves only');
  }
})();

export class SetsDatabase {
  getSets(species: string): RandomBattleSetEntry[] {
    return DB.get(toId(species)) ?? [];
  }

  hasData(species: string): boolean {
    return DB.has(toId(species));
  }
}
