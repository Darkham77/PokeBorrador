/**
 * scripts/tools/normalize_random_sets.ts
 *
 * Normalizes all item names in src/data/ai/random-sets.json to strict canonical ItemIds.
 */

import fs from 'node:fs';
import path from 'node:path';
import { toID } from '@pkmn/sim';
import randomSets from '../../src/data/ai/random-sets.json';
import { requireItemId } from '../../src/data/inventory/items.ts';

for (const entry of randomSets as Array<{ pokemon: string; sets: Array<{ item?: string }> }>) {
  for (const s of entry.sets) {
    if (s.item) {
      const canonicalId = toID(s.item);
      s.item = requireItemId(canonicalId);
    }
  }
}

const targetPath = path.resolve(process.cwd(), 'src/data/ai/random-sets.json');
fs.writeFileSync(targetPath, JSON.stringify(randomSets, null, 2) + '\n', 'utf8');
console.log('Successfully normalized all items in random-sets.json to canonical ItemIds!');
