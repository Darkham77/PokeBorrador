import { SHOP_ITEMS } from '../src/data/items.ts';

console.log("Analyzing SHOP_ITEMS ids for Spanish keys:");
const spanishItems: string[] = [];

for (const item of SHOP_ITEMS) {
  const id = item.id;
  // Heuristic: contains Spanish words or patterns like "piedra_", "caramelo_", "pocion"
  if (id.includes('piedra') || id.includes('caramelo') || id.includes('pocion') || id === 'repelente') {
    spanishItems.push(id);
  }
}

console.log("Found Spanish item IDs:", spanishItems);
