// ============================================================
// Sets Database — offline static database for AI inference
// Loads random-sets.json locally from the project's src/data/ directory.
// Zero runtime dependency on external/ reference folder.
// ============================================================

import { toID } from '@/logic/utils/strings.ts';
import type { RandomBattleSetEntry } from './types.ts';

interface RawEntry {
  pokemon: string;
  sets: RandomBattleSetEntry[];
}

const DB = new Map<string, RandomBattleSetEntry[]>();

// Synchronous local loading from src/data/ai via static import.
// This avoids asynchronous loading and ensures availability in Node tests.
import { RANDOM_SETS_DATA } from '../../../../data/ai/randomSetsData.ts';

// Populate static database when the module loads
const entries = RANDOM_SETS_DATA as RawEntry[];
for (const entry of entries) {
  DB.set(toID(entry.pokemon), entry.sets);
}

export class SetsDatabase {
  getSets(species: string): RandomBattleSetEntry[] {
    return DB.get(toID(species)) ?? [];
  }

  hasData(species: string): boolean {
    return DB.has(toID(species));
  }
}
