import { POKEMON_DB } from '../src/data/pokemonDB.ts';
import { FIRE_RED_MAPS } from '../src/data/maps.ts';

const allDbIds = Object.keys(POKEMON_DB);
const spawnedIds = new Set<string>();

FIRE_RED_MAPS.forEach((map: any) => {
  // 1. Wild spawns
  if (map.wild) {
    Object.keys(map.wild).forEach(time => {
      const list = map.wild[time];
      if (Array.isArray(list)) {
        list.forEach((id: string) => spawnedIds.add(id.toLowerCase().trim()));
      }
    });
  }

  // 2. Fishing spawns
  if (map.fishing?.pool) {
    map.fishing.pool.forEach((id: string) => spawnedIds.add(id.toLowerCase().trim()));
  }

  // 3. Archaeology spawns
  if (map.archaeology?.pool) {
    map.archaeology.pool.forEach((id: string) => spawnedIds.add(id.toLowerCase().trim()));
  }

  // 4. Weather spawns
  if (map.weather) {
    Object.keys(map.weather).forEach(wKey => {
      const wCfg = map.weather[wKey];
      if (!wCfg) return;

      const keys: ('visitors' | 'exclusive' | 'fishingExclusive' | 'fishingVisitors')[] = [
        'visitors',
        'exclusive',
        'fishingExclusive',
        'fishingVisitors'
      ];

      keys.forEach(k => {
        const val = wCfg[k];
        if (!val) return;
        const list = Array.isArray(val) ? val : Object.keys(val);
        list.forEach((id: string) => spawnedIds.add(id.toLowerCase().trim()));
      });
    });
  }
});

const unspawned = allDbIds.filter(id => !spawnedIds.has(id.toLowerCase().trim()));

console.log('=== ESTUDIO: POKÉMON SIN SPAWN EN LOS MAPAS ===');
console.log(`Total en DB: ${allDbIds.length}`);
console.log(`Total Spawned: ${spawnedIds.size}`);
console.log(`Total Unspawned: ${unspawned.length}`);
console.log('\nLista de Pokémon sin spawn:');
console.log(JSON.stringify(unspawned.map(id => POKEMON_DB[id as keyof typeof POKEMON_DB]?.name || id), null, 2));
