import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MOVE_DATA } from '../src/data/moves.ts';
import { ABILITY_DATA } from '../src/data/abilities.ts';
import { SHOP_ITEMS } from '../src/data/items.ts';

const backupPath = 'c:/Users/franc/Trabajo/Juegos/Pokemon-Online/database/backups/nas_franco/nas_franco_backup_2026-05-31T01-57-05-676918945Z.json';

console.log("Loading backup database...");
const raw = readFileSync(backupPath, 'utf-8');
const data = JSON.parse(raw);

console.log("Analyzing Pokémon moves, abilities, and items in the backup JSON...");

const invalidMoveIds = new Set<string>();
const invalidAbilities = new Set<string>();
const invalidItems = new Set<string>();

const validItemIds = new Set(SHOP_ITEMS.map(i => i.id));

function scanObject(obj: any) {
  if (!obj || typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    obj.forEach(item => scanObject(item));
    return;
  }

  // Check Pokemon properties
  if (obj.moves && Array.isArray(obj.moves)) {
    obj.moves.forEach((moveObj: any) => {
      if (moveObj && typeof moveObj === 'object') {
        const id = moveObj.id;
        if (id && !MOVE_DATA[id]) {
          invalidMoveIds.add(id);
        }
      } else if (typeof moveObj === 'string') {
        if (!MOVE_DATA[moveObj]) {
          invalidMoveIds.add(moveObj);
        }
      }
    });
  }

  if (obj.ability && typeof obj.ability === 'string') {
    if (!ABILITY_DATA[obj.ability]) {
      invalidAbilities.add(obj.ability);
    }
  }

  if (obj.heldItem && typeof obj.heldItem === 'string') {
    if (!validItemIds.has(obj.heldItem)) {
      invalidItems.add(obj.heldItem);
    }
  }

  // Recurse into all properties
  for (const key of Object.keys(obj)) {
    scanObject(obj[key]);
  }
}

scanObject(data);

console.log("\nFound invalid/legacy move IDs:");
console.log(Array.from(invalidMoveIds));

console.log("\nFound invalid/legacy abilities:");
console.log(Array.from(invalidAbilities));

console.log("\nFound invalid/legacy held items:");
console.log(Array.from(invalidItems));
