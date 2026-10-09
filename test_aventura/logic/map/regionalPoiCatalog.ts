/**
 * src/logic/map/regionalPoiCatalog.ts
 *
 * REGIONAL POI CATALOG & PROCEDURAL POI GENERATOR
 *
 * Modularized from poiPlacementEngine.ts to satisfy the 1000-line SRP architecture limit.
 *
 * Features:
 *   1. Canonical Kanto preset POI templates (League, Cities, Towns, Dungeons, Caves, Port, Gates, Landmarks).
 *   2. Procedural POI catalog generator for arbitrary target counts (parametric generation mode).
 */

import type { POITerrainPreference, POIType } from '../../types/map/poiTypes.ts';

export interface POITemplate {
  readonly id: string; // domain-ok: Identificador o estructura procedural de aventura
  readonly name: string; // domain-ok: Identificador o estructura procedural de aventura
  readonly type: POIType;
  readonly width: number;
  readonly height: number;
  readonly preference: POITerrainPreference;
  readonly hasGym?: boolean;
  readonly tier?: number;
  readonly progressionIndex?: number;
}

export const REGIONAL_POI_CATALOG: readonly POITemplate[] = [
  // 0. Regional Pokémon League Palace (Meseta Añil)
  {
    id: 'pokemon_league_plateau',
    name: 'Palacio de la Liga Pokémon (Meseta Añil)',
    type: 'pokemon_league',
    width: 22,
    height: 26,
    preference: 'mountain_plateau',
    hasGym: false
  },
  // 1. Metropolis (Gym 1)
  {
    id: 'celadon_capital',
    name: 'Ciudad Celeste',
    type: 'metropolis',
    width: 30,
    height: 24,
    preference: 'flat_grass',
    hasGym: true
  },
  // 2. Official Regional Gym Cities (Gyms 2 to 8)
  {
    id: 'saffron_metro',
    name: 'Azafran Central',
    type: 'city',
    width: 16,
    height: 14,
    preference: 'flat_grass',
    hasGym: true
  },
  {
    id: 'vermilion_city',
    name: 'Ciudad Carmin',
    type: 'city',
    width: 16,
    height: 14,
    preference: 'flat_grass',
    hasGym: true
  },
  {
    id: 'fuchsia_garden_city',
    name: 'Ciudad Fucsia',
    type: 'city',
    width: 16,
    height: 14,
    preference: 'flat_grass',
    hasGym: true
  },
  {
    id: 'cerulean_city',
    name: 'Ciudad Azul',
    type: 'city',
    width: 16,
    height: 14,
    preference: 'flat_grass',
    hasGym: true
  },
  {
    id: 'pewter_city',
    name: 'Ciudad Plateada',
    type: 'city',
    width: 16,
    height: 14,
    preference: 'flat_grass',
    hasGym: true
  },
  {
    id: 'viridian_city',
    name: 'Ciudad Verde',
    type: 'city',
    width: 16,
    height: 14,
    preference: 'flat_grass',
    hasGym: true
  },
  {
    id: 'cinnabar_island_city',
    name: 'Isla Canela',
    type: 'city',
    width: 16,
    height: 14,
    preference: 'flat_grass',
    hasGym: true
  },
  // 3. Towns (Without Gyms)
  {
    id: 'paleta_starting_town',
    name: 'Pueblo Paleta',
    type: 'town',
    width: 12,
    height: 12,
    preference: 'flat_grass',
    hasGym: false
  },
  {
    id: 'lavender_town',
    name: 'Pueblo Lavanda',
    type: 'town',
    width: 12,
    height: 12,
    preference: 'flat_grass',
    hasGym: false
  },
  // 4. Dungeon Forests
  {
    id: 'viridian_forest',
    name: 'Bosque Verde',
    type: 'dungeon_forest',
    width: 8,
    height: 8,
    preference: 'forest_clearing'
  },
  {
    id: 'silva_labyrinth',
    name: 'Selva Silvestre',
    type: 'dungeon_forest',
    width: 8,
    height: 6,
    preference: 'forest_clearing'
  },
  // 5. Cave Entrances
  {
    id: 'mt_moon_cave',
    name: 'Entrada Mt. Moon',
    type: 'cave_entrance',
    width: 1,
    height: 2,
    preference: 'mountain_wall'
  },
  {
    id: 'diglett_cave',
    name: 'Cueva Diglett',
    type: 'cave_entrance',
    width: 1,
    height: 2,
    preference: 'mountain_wall'
  },
  {
    id: 'rock_tunnel',
    name: 'Tunel Roca',
    type: 'cave_entrance',
    width: 1,
    height: 2,
    preference: 'mountain_wall'
  },
  // 6. Vermilion Port (Authentic Kanto coastal seaport with entrance gate, pier, and docked ferry)
  {
    id: 'vermilion_port',
    name: 'Puerto Carmín',
    type: 'port_dock',
    width: 7,
    height: 6,
    preference: 'coast_water'
  },
  // 7. Route Gates / Checkpoint Garitas
  {
    id: 'gate_north_pass',
    name: 'Aduana Paso Norte',
    type: 'route_gate',
    width: 10,
    height: 10,
    preference: 'flat_grass'
  },
  {
    id: 'gate_coastal_checkpoint',
    name: 'Garita de la Metrópolis',
    type: 'route_gate',
    width: 10,
    height: 10,
    preference: 'flat_grass'
  },
  // 8. Water Landmarks
  {
    id: 'lake_shrine',
    name: 'Santuario del Lago',
    type: 'water_landmark',
    width: 6,
    height: 4,
    preference: 'coast_water'
  },
  {
    id: 'ocean_lighthouse',
    name: 'Faro Marino',
    type: 'water_landmark',
    width: 6,
    height: 7,
    preference: 'coast_water'
  }
];

const CITY_DESIGNATIONS = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa'] as const; // no-domain: Estructura o identificador procedural de aventura
const REMAINING_SECONDARY_TYPES = ['route_gate', 'water_landmark', 'port_dock'] as const satisfies readonly POIType[];

export function generateProceduralPOICatalog(
  targetCount: number,
  _options?: { readonly targetUrbanSettlements?: number }
): readonly POITemplate[] {
  const catalog: POITemplate[] = [
    {
      id: 'pokemon_league_plateau',
      name: 'Palacio de la Liga Pokémon (Meseta Añil)',
      type: 'pokemon_league',
      width: 22,
      height: 20,
      preference: 'mountain_plateau',
      hasGym: false
    }
  ];

  let idCounter = 1;
  const numMetropolis = targetCount >= 5 ? 1 : 0;
  const numCities = Math.min(8, Math.floor(targetCount * 0.4));
  const numTowns = Math.ceil(targetCount * 0.15);
  const numForests = Math.floor(targetCount * 0.15);
  const numCaves = Math.floor(targetCount * 0.1);

  if (numMetropolis > 0) {
    catalog.push({
      id: `metropolis_${idCounter}`,
      name: `Metropolis Prime`,
      type: 'metropolis',
      width: 30,
      height: 24,
      preference: 'flat_grass',
      hasGym: true
    });
    idCounter++;
  }

  for (let i = 0; i < numCities; i++) {
    catalog.push({
      id: `city_${idCounter}`,
      name: `City ${CITY_DESIGNATIONS[i] ?? i + 1}`,
      type: 'city',
      width: 16,
      height: 14,
      preference: 'flat_grass',
      hasGym: true
    });
    idCounter++;
  }

  for (let i = 0; i < numTowns; i++) {
    catalog.push({
      id: `town_${idCounter}`,
      name: `Town ${i + 1}`,
      type: 'town',
      width: 12,
      height: 12,
      preference: 'flat_grass',
      hasGym: false
    });
    idCounter++;
  }

  for (let i = 0; i < numForests; i++) {
    catalog.push({
      id: `forest_${idCounter}`,
      name: `Forest Dungeon ${i + 1}`,
      type: 'dungeon_forest',
      width: 8,
      height: 8,
      preference: 'forest_clearing'
    });
    idCounter++;
  }

  for (let i = 0; i < numCaves; i++) {
    catalog.push({
      id: `cave_${idCounter}`,
      name: `Cave Entrance ${i + 1}`,
      type: 'cave_entrance',
      width: 1,
      height: 2,
      preference: 'mountain_wall'
    });
    idCounter++;
  }

  const placedCount = numMetropolis + numCities + numTowns + numForests + numCaves;
  let remaining = Math.max(0, targetCount - placedCount);

  let typeIdx = 0;
  let gateIdx = 1;
  let waterIdx = 1;
  let portIdx = 1;

  while (remaining > 0) {
    const t = REMAINING_SECONDARY_TYPES[typeIdx % REMAINING_SECONDARY_TYPES.length]!;
    if (t === 'route_gate') {
      catalog.push({
        id: `gate_${idCounter}`,
        name: `Route Gate ${gateIdx++}`,
        type: 'route_gate',
        width: 10,
        height: 10,
        preference: 'flat_grass'
      });
    } else if (t === 'water_landmark') {
      catalog.push({
        id: `water_${idCounter}`,
        name: `Water Landmark ${waterIdx++}`,
        type: 'water_landmark',
        width: 6,
        height: 4,
        preference: 'coast_water'
      });
    } else if (t === 'port_dock') {
      catalog.push({
        id: `port_${idCounter}`,
        name: `Port Dock ${portIdx++}`,
        type: 'port_dock',
        width: 7,
        height: 6,
        preference: 'coast_water'
      });
    }
    idCounter++;
    typeIdx++;
    remaining--;
  }

  return catalog;
}
