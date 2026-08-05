// fallow-ignore-file security-sink
// scripts/battle-tester/fuzzer-item-generator.ts
import { Dex } from '@pkmn/sim';
import type { PokemonSet } from '@pkmn/sim';
import { SHOP_ITEMS } from '../../../../src/data/inventory/items.ts';
import { getShowdownNickname } from '../../../../src/logic/battle/showdownUidMapper.ts';

import crypto from 'node:crypto';

import type { PersistedPokemonGender } from '../../../../src/logic/auth/saveService.ts';
import type { PokemonSpeciesId } from '../../../../src/data/pokemon/pokedex.ts';
import type { ItemId } from '../../../../src/data/inventory/items.ts';
import type { AbilityId } from '../../../../src/data/battle/abilities.ts';
import type { NatureId } from '../../../../src/data/battle/natures.ts';
import type { PokemonMoveId } from '../../../../src/types/pokemon/pokemon.ts';

export interface FuzzerPokemonSet extends Omit<PokemonSet, 'gender' | 'species' | 'item' | 'ability' | 'nature' | 'moves'> {
  species: PokemonSpeciesId;
  gender: PersistedPokemonGender;
  item: ItemId;
  ability: AbilityId;
  nature: NatureId;
  moves: PokemonMoveId[];
  uid?: string;
}

export interface ItemTestBatch {
  playerTeam: FuzzerPokemonSet[];
  enemyTeam: FuzzerPokemonSet[];
  itemsToTest: ItemId[];
}

export function generateItemTestBatches(batchSize: number = 6): ItemTestBatch[] {
  const dexItems = Dex.items;

  // Filtrar objetos usables en combate: combat_held, potions, pokeballs
  const combatItems = SHOP_ITEMS.filter(i => {
    if (!i.id) return false;
    const dexItem = dexItems.get(i.id);
    
    // Categorías válidas en combate
    const isCombatCategory = ['combat_held', 'potions', 'pokeballs'].includes(i.cat || '');
    
    return isCombatCategory && dexItem && dexItem.exists && !dexItem.isNonstandard;
  });

  const itemPool = combatItems.map(i => i.id);
  return generateItemBatches(itemPool, batchSize);
}

export function generateItemBatches(itemPool: ItemId[], batchSize = 6): ItemTestBatch[] {
  const batches: ItemTestBatch[] = [];
  let itemIdx = 0;

  while (itemIdx < itemPool.length) {
    const playerTeam: FuzzerPokemonSet[] = [];
    const enemyTeam: FuzzerPokemonSet[] = [];
    const batchItems: ItemId[] = [];

    // Llenar equipo del jugador con Mew, equipándole los diferentes items a testear
    for (let p = 0; p < batchSize; p++) {
      if (itemIdx >= itemPool.length) break;

      const itemId = itemPool[itemIdx]!;

      batchItems.push(itemId);

      const pUid = crypto.randomUUID();
      const pNickname = getShowdownNickname(pUid);

      // Le damos un set estándar para ver el efecto del item (ej. Vidasfera daña, Restos cura)
      playerTeam.push({
        name: pNickname,
        species: 'mew',
        level: 100,
        gender: 'N',
        item: itemId,
        ability: 'noability',
        nature: 'serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['tackle', 'substitute', 'recover', 'nastyplot'],
        uid: pUid,
      });

      itemIdx++;
    }

    // El equipo enemigo simplemente es un Blissey
    for (let e = 0; e < batchSize; e++) {
      const eUid = crypto.randomUUID();
      const eNickname = getShowdownNickname(eUid);

      enemyTeam.push({
        name: eNickname,
        species: 'blissey',
        level: 100,
        gender: 'F',
        item: '',
        ability: 'naturalcure',
        nature: 'serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['seismictoss', 'tackle', 'softboiled', 'substitute'],
        uid: eUid,
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
