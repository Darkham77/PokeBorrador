// ============================================================
// Sets Database — offline static database for AI inference
// Loads random-sets.json locally from the project's src/data/ directory.
// Zero runtime dependency on external/ reference folder.
// ============================================================

import { toID } from '@pkmn/sim';
import type { RandomBattleSetEntry } from './types.ts';

interface RawEntry {
  pokemon: string;
  sets: RandomBattleSetEntry[];
}

const DB = new Map<string, RandomBattleSetEntry[]>();

// Carga síncrona local del JSON desde src/data/ai mediante import estático
// Esto evita la asincronía y asegura disponibilidad en los tests de Node.
import { RANDOM_SETS_DATA } from '../../../../data/ai/randomSetsData.ts';

// Poblar la base de datos estática al cargar el módulo
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
