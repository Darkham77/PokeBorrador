/**
 * test_aventura/logic/map/adventureProjectFactory.ts
 *
 * ADVENTURE PROJECT FACTORY (SSoT)
 * Instantiates canonical adventure projects (Kanto, Johto, blank)
 * with authentic topological nodes, connections, and procedural configurations.
 */

import type {
  AdventureProject,
  AdventureProjectNode
} from '../../types/map/adventureWorldTypes.ts';
import { rawNodes } from '../adventure/mapData.ts';
import { rawJohtoNodes, rawJohtoConnections } from '../../data/map/johtoAdventureMapData.ts';
import { DEFAULT_ROAD_WIDTH } from '../../config/kantoRegionalConfig.ts';

const KANTO_CANONICAL_SEED = 42 as const;
const JOHTO_CANONICAL_SEED = 108 as const;
const BLANK_PROJECT_SEED = 777 as const;

const KANTO_TREE_DENSITY = 0.7 as const;
const JOHTO_TREE_DENSITY = 0.75 as const;
const BLANK_TREE_DENSITY = 0.5 as const;

const KANTO_CANONICAL_CONNECTIONS: readonly (readonly [string, string])[] = [
  ['indigo', 'victoryroad'],
  ['victoryroad', 'route23'],
  ['route23', 'viridian'],
  ['route24', 'route25'],
  ['route25', 'billshouse'],
  ['cerulean', 'route24'],
  ['pewter', 'route3'],
  ['route3', 'mtmoon'],
  ['mtmoon', 'route4'],
  ['route4', 'cerulean'],
  ['cerulean', 'route9'],
  ['route9', 'route10'],
  ['route10', 'rocktunnel'],
  ['route10', 'powerplant'],
  ['pewter', 'route2_n'],
  ['route2_n', 'viridianforest'],
  ['viridianforest', 'route2_s'],
  ['route2_s', 'viridian'],
  ['viridian', 'pallet'],
  ['pallet', 'route21'],
  ['route21', 'cinnabar'],
  ['cinnabar', 'route20'],
  ['route20', 'seafoam'],
  ['seafoam', 'route19'],
  ['route19', 'fuchsia'],
  ['fuchsia', 'route15'],
  ['route15', 'route14'],
  ['route14', 'route13'],
  ['route13', 'route12'],
  ['route12', 'lavender'],
  ['lavender', 'pokemontower'],
  ['rocktunnel', 'lavender'],
  ['lavender', 'route8'],
  ['route8', 'saffron'],
  ['saffron', 'route7'],
  ['route7', 'celadon'],
  ['celadon', 'route16'],
  ['route16', 'route17'],
  ['route17', 'route18'],
  ['route18', 'fuchsia'],
  ['saffron', 'route5'],
  ['route5', 'cerulean'],
  ['saffron', 'route6'],
  ['route6', 'vermilion'],
  ['vermilion', 'diglettcave'],
  ['diglettcave', 'viridian'],
  ['vermilion', 'route11'],
  ['route11', 'route12'],
  ['fuchsia', 'safarizone'],
  ['cinnabar', 'mansionpkm'],
  ['viridian', 'route22'],
  ['route22', 'victoryroad']
];

export function getKantoDefaultProject(): AdventureProject {
  const nodes: Record<string, AdventureProjectNode> = {}; // open-record: Dynamic adventure project map
  for (const [id, n] of Object.entries(rawNodes)) {
    nodes[id] = {
      id,
      name: n.name,
      type: n.type,
      x: n.x,
      y: n.y,
      hasCenter: n.hasCenter,
      farm: n.farm,
      requiresMO: n.requiresMO,
      blockMsg: n.blockMsg,
      hasEvent: n.hasEvent,
      weather: n.weather
    };
  }

  return {
    id: 'kanto_canonical',
    name: 'Kanto Canónico (Oficial)',
    archetype: 'kanto',
    seed: KANTO_CANONICAL_SEED,
    config: {
      treeDensity: KANTO_TREE_DENSITY,
      roadWidth: DEFAULT_ROAD_WIDTH,
      autoOcean: true,
      autoBuildings: true
    },
    nodes,
    connections: [...KANTO_CANONICAL_CONNECTIONS],
    updatedAt: Temporal.Now.instant().toString()
  };
}

export function getJohtoDefaultProject(): AdventureProject {
  return {
    id: 'johto_canonical',
    name: 'Johto Canónico (Oficial)',
    archetype: 'johto',
    seed: JOHTO_CANONICAL_SEED,
    config: {
      treeDensity: JOHTO_TREE_DENSITY,
      roadWidth: DEFAULT_ROAD_WIDTH,
      autoOcean: true,
      autoBuildings: true
    },
    nodes: { ...rawJohtoNodes },
    connections: [...rawJohtoConnections],
    updatedAt: Temporal.Now.instant().toString()
  };
}

export function getBlankDefaultProject(name = 'Nueva Región'): AdventureProject {
  const id = `project_${Temporal.Now.instant().epochMilliseconds}`;
  return {
    id,
    name,
    archetype: 'blank',
    seed: BLANK_PROJECT_SEED,
    config: {
      treeDensity: BLANK_TREE_DENSITY,
      roadWidth: DEFAULT_ROAD_WIDTH,
      autoOcean: false,
      autoBuildings: false
    },
    nodes: {},
    connections: [],
    updatedAt: Temporal.Now.instant().toString()
  };
}
