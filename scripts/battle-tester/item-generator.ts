// scripts/battle-tester/item-generator.ts
import { Dex } from '@pkmn/sim';
import type { PokemonSet } from '@pkmn/sim';
import { SHOP_ITEMS } from '../../src/data/inventory/items.ts';

export interface ItemTestBatch {
  playerTeam: PokemonSet[];
  enemyTeam: PokemonSet[];
  itemsToTest: string[];
}

export function generateItemTestBatches(batchSize: number = 6): ItemTestBatch[] {
  const dexItems = Dex.items;

  // Filtrar todos los items del juego (SHOP_ITEMS) que existen en Showdown y son usables en combate
  const combatItems = SHOP_ITEMS.filter(i => {
    if (!i.id) return false;
    const dexItem = dexItems.get(i.id);
    // Verificar si existe en el dex y es un item real de batalla
    // (excluyendo cartas, repelentes, y otros items de aventura)
    return dexItem && dexItem.exists && !dexItem.isNonstandard;
  });

  const itemPool = combatItems.map(i => i.id);
  const batches: ItemTestBatch[] = [];

  let itemIdx = 0;

  while (itemIdx < itemPool.length) {
    const playerTeam: PokemonSet[] = [];
    const enemyTeam: PokemonSet[] = [];
    const batchItems: string[] = [];

    // Llenar equipo del jugador con Mew, equipándole los diferentes items a testear
    for (let p = 0; p < batchSize; p++) {
      if (itemIdx >= itemPool.length) break;

      const itemId = itemPool[itemIdx]!;
      const dexItem = dexItems.get(itemId);
      const itemName = dexItem.name;

      batchItems.push(itemId);

      // Le damos un set estándar para ver el efecto del item (ej. Vidasfera daña, Restos cura)
      playerTeam.push({
        name: `P-Poke${p + 1}`,
        species: 'Mew',
        level: 100,
        gender: '',
        item: itemName,
        ability: 'No Ability',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle', 'Substitute', 'Recover', 'Nasty Plot']
      });

      itemIdx++;
    }

    // El equipo enemigo simplemente es un Blissey
    for (let e = 0; e < batchSize; e++) {
      enemyTeam.push({
        name: `E-Poke${e + 1}`,
        species: 'Blissey',
        level: 100,
        gender: '',
        item: '',
        ability: 'Natural Cure',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Soft-Boiled', 'Seismic Toss', 'Tackle', 'Substitute']
      });
    }

    if (playerTeam.length > 0) {
      batches.push({
        playerTeam,
        enemyTeam,
        itemsToTest: batchItems
      });
    }
  }

  return batches;
}
