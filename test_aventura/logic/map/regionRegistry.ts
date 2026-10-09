// Regional Registry & Multi-Region Procedural Dispatcher

import type {
  AdventureProject,
  AdventureProjectNode,
  ProceduralGenerationConfig,
  StampingPrefabDefinition
} from '../../types/map/adventureWorldTypes';
import { rawNodes } from '../adventure/mapData';
import { rawJohtoNodes, rawJohtoConnections } from '../../data/map/johtoAdventureMapData';
import {
  KANTO_GRID_W,
  KANTO_GRID_H,
  CELL_BIOME,
  OCCUPANCY_FLAGS,
  OccupancyGrid,
  KantoRegionalWorldGenerator,
  type KantoNodeCoordinate
} from './kantoRegionalGenerator.ts';

export const STAMPING_PREFABS_CATALOG: readonly StampingPrefabDefinition[] = [
  // Buildings (Canonical 32px standard: KANTO_TILE_SIZE = 32)
  { id: 'pokecenter', name: 'Centro Pokémon', category: 'buildings', style: 'pokecenter', width: 160, height: 160 },
  { id: 'pokemart', name: 'Tienda PokéMart', category: 'buildings', style: 'pokemart', width: 128, height: 128 },
  { id: 'gym', name: 'Gimnasio Oficial', category: 'buildings', style: 'gym', width: 192, height: 160 },
  { id: 'gym_gold', name: 'Gimnasio Dorado', category: 'buildings', style: 'gym_gold', width: 192, height: 160 },
  { id: 'lab_oak', name: 'Laboratorio de Oak', category: 'buildings', style: 'lab_oak', width: 224, height: 192 },
  { id: 'house_red', name: 'Casa Tejado Rojo', category: 'buildings', style: 'house_red', width: 160, height: 160 },
  { id: 'house_blue', name: 'Casa Tejado Azul', category: 'buildings', style: 'house_blue', width: 160, height: 160 },
  { id: 'house_green', name: 'Casa Tejado Verde', category: 'buildings', style: 'house_green', width: 160, height: 160 },
  { id: 'house_orange', name: 'Casa Tejado Naranja', category: 'buildings', style: 'house_orange', width: 160, height: 160 },
  { id: 'silph_tower', name: 'Torre Silph / Radio', category: 'buildings', style: 'silph_tower', width: 288, height: 320 },
  { id: 'pokemon_league', name: 'Liga Pokémon', category: 'buildings', style: 'pokemon_league', width: 352, height: 256 },
  { id: 'power_plant', name: 'Central de Energía', category: 'buildings', style: 'power_plant', width: 320, height: 208 },
  { id: 'game_corner', name: 'Casino de Juego', category: 'buildings', style: 'game_corner', width: 224, height: 160 },
  { id: 'mansion_school', name: 'Mansión / Escuela', category: 'buildings', style: 'mansion_school', width: 224, height: 192 },

  // Props & Obstacles
  { id: 'poke_snorlax', name: 'Snorlax Dormido', category: 'props', style: 'poke_snorlax', width: 48, height: 48 },
  { id: 'tree_cuttable', name: 'Árbol Cortable (MO)', category: 'props', style: 'tree_cuttable', width: 32, height: 32 },
  { id: 'street_lamp', name: 'Farola Urbana', category: 'props', style: 'street_lamp', width: 16, height: 32 },
  { id: 'fence_picket', name: 'Valla de Madera', category: 'props', style: 'fence_picket', width: 32, height: 32 },
  { id: 'flowers_red', name: 'Flores Rojas', category: 'props', style: 'flowers_red', width: 32, height: 32 },
  { id: 'mailbox', name: 'Buzón Canónico', category: 'props', style: 'mailbox', width: 16, height: 16 },
  { id: 'diglett', name: 'Diglett Asomado', category: 'props', style: 'diglett', width: 32, height: 32 },
  { id: 'pier', name: 'Muelle de Madera', category: 'props', style: 'pier', width: 64, height: 96 }
];

export function getKantoDefaultProject(): AdventureProject {
  const nodes: Record<string, AdventureProjectNode> = {}; // open-record: Estructura o identificador procedural de aventura
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

  const connections: [string, string][] = [
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

  return {
    id: 'kanto_canonical',
    name: 'Kanto Canónico (Oficial)',
    archetype: 'kanto',
    seed: 42,
    config: {
      treeDensity: 0.7,
      roadWidth: 2,
      autoOcean: true,
      autoBuildings: true
    },
    nodes,
    connections,
    updatedAt: new Date().toISOString()
  };
}

export function getJohtoDefaultProject(): AdventureProject {
  return {
    id: 'johto_canonical',
    name: 'Johto Canónico (Oficial)',
    archetype: 'johto',
    seed: 108,
    config: {
      treeDensity: 0.75,
      roadWidth: 2,
      autoOcean: true,
      autoBuildings: true
    },
    nodes: { ...rawJohtoNodes },
    connections: [...rawJohtoConnections],
    updatedAt: new Date().toISOString()
  };
}

export function getBlankDefaultProject(name = 'Nueva Región'): AdventureProject {
  const id = `project_${Date.now()}`;
  return {
    id,
    name,
    archetype: 'blank',
    seed: 777,
    config: {
      treeDensity: 0.5,
      roadWidth: 2,
      autoOcean: false,
      autoBuildings: false
    },
    nodes: {},
    connections: [],
    updatedAt: new Date().toISOString()
  };
}

export class JohtoRegionalWorldGenerator extends KantoRegionalWorldGenerator {
  override generate(
    nodes: Record<string, KantoNodeCoordinate>,
    connections: readonly (readonly [string, string])[],
    seed = 108,
    config?: ProceduralGenerationConfig
  ): void {
    this.seed = seed;
    this.grid = Array.from({ length: KANTO_GRID_H }, () => new Uint8Array(KANTO_GRID_W).fill(CELL_BIOME.GRASS));
    this.elevation = Array.from({ length: KANTO_GRID_H }, () => new Uint8Array(KANTO_GRID_W).fill(1));
    this.occupancy = new OccupancyGrid(KANTO_GRID_W, KANTO_GRID_H);
    this.trees = [];
    this.buildings = [];
    this.bridges = [];
    this.props = [];
    this.nature = [];

    const autoOcean = config?.autoOcean ?? true;
    const autoBuildings = config?.autoBuildings ?? true;
    const roadWidth = config?.roadWidth ?? 2;

    // 1. Johto Hydrography:
    if (autoOcean) {
      // A. Lake of Rage in the North-Center (ty 20 to 32, tx 65 to 80)
      for (let y = 16; y <= 28; y++) {
        for (let x = 65; x <= 80; x++) {
          const d = Math.hypot(x - 72.5, y - 22);
          if (d <= 6.5) {
            const row = this.grid[y];
            if (row) {
              row[x] = CELL_BIOME.WATER;
              this.occupancy.set(x, y, OCCUPANCY_FLAGS.WATER);
            }
          }
        }
      }

      // B. Western Ocean & Whirl Islands Bay (Olivine to Cianwood: tx 0 to 30, ty 65 to 125)
      for (let y = 65; y < KANTO_GRID_H; y++) {
        for (let x = 0; x < 28; x++) {
          const wave = Math.sin(y * 0.25) * 1.5;
          if (x < 24 + wave) {
            const row = this.grid[y];
            if (row) {
              row[x] = CELL_BIOME.WATER;
              this.occupancy.set(x, y, OCCUPANCY_FLAGS.WATER);
            }
          }
        }
      }

      // C. Cianwood Island
      for (let y = 84; y <= 98; y++) {
        for (let x = 4; x <= 14; x++) {
          const row = this.grid[y];
          if (row) {
            row[x] = (x === 4 || x === 14 || y === 84 || y === 98) ? CELL_BIOME.DIRT_PATH : CELL_BIOME.GRASS;
            this.occupancy.clear(x, y, OCCUPANCY_FLAGS.WATER);
          }
        }
      }
    }

    // 2. Johto Mountain Chains (Mt. Silver on the East border & Mt. Mortar in North-Center)
    // Mt. Silver East Range
    for (let y = 60; y <= 100; y++) {
      for (let x = 100; x < KANTO_GRID_W; x++) {
        const row = this.grid[y];
        const eRow = this.elevation[y];
        if (row && eRow && row[x] !== CELL_BIOME.WATER) {
          row[x] = CELL_BIOME.MOUNTAIN_DIRT;
          eRow[x] = 3;
          this.occupancy.set(x, y, OCCUPANCY_FLAGS.CLIFF);
        }
      }
    }

    // Mt. Mortar Range
    for (let y = 35; y <= 45; y++) {
      for (let x = 55; x <= 75; x++) {
        const row = this.grid[y];
        const eRow = this.elevation[y];
        if (row && eRow && row[x] !== CELL_BIOME.WATER) {
          row[x] = CELL_BIOME.MOUNTAIN_DIRT;
          eRow[x] = 3;
          this.occupancy.set(x, y, OCCUPANCY_FLAGS.CLIFF);
        }
      }
    }

    // 3. Roads & Trails connecting active nodes
    connections.forEach(([idA, idB]) => {
      const nA = nodes[idA];
      const nB = nodes[idB];
      if (!nA || !nB) return;
      if (nA.type === 'route_water' || nB.type === 'route_water') return;

      const pA = this.nodeToTile(nA.x, nA.y);
      const pB = this.nodeToTile(nB.x, nB.y);
      this.rasterizePathLocal(pA.tx, pA.ty, pB.tx, pB.ty, roadWidth);
    });

    // 4. Place Iconic Johto Architectures
    if (autoBuildings) {
      this.placeJohtoBuildings(nodes);
    }
  }

  private rasterizePathLocal(x0: number, y0: number, x1: number, y1: number, width = 2): void {
    const dx = Math.abs(x1 - x0);
    const sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0);
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let cx = x0;
    let cy = y0;

    while (true) {
      for (let wy = -Math.floor(width / 2); wy <= Math.floor(width / 2); wy++) {
        for (let wx = -Math.floor(width / 2); wx <= Math.floor(width / 2); wx++) {
          const px = cx + wx;
          const py = cy + wy;
          if (px >= 0 && px < KANTO_GRID_W && py >= 0 && py < KANTO_GRID_H) {
            const row = this.grid[py];
            if (row) {
              if (row[px] === CELL_BIOME.WATER) {
                row[px] = CELL_BIOME.BRIDGE;
                this.occupancy.set(px, py, OCCUPANCY_FLAGS.ROAD);
              } else {
                row[px] = CELL_BIOME.DIRT_PATH;
                this.occupancy.set(px, py, OCCUPANCY_FLAGS.ROAD);
              }
            }
          }
        }
      }
      if (cx === x1 && cy === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; cx += sx; }
      if (e2 <= dx) { err += dx; cy += sy; }
    }
  }

  private placeJohtoBuildings(nodes: Record<string, KantoNodeCoordinate>): void {
    const T = 32;
    // Helper to safely place a building
    const addBldg = (style: string, px: number, py: number, w = 80, h = 60) => {
      this.buildings.push({ style, x: px, y: py, w, h });
      const tx = Math.floor(px / T);
      const ty = Math.floor(py / T);
      const bw = Math.ceil(w / T);
      const bh = Math.ceil(h / T);
      this.occupancy.reserveRect(tx, ty, bw, bh, OCCUPANCY_FLAGS.BUILDING);
    };

    // New Bark Town
    const nb = nodes.newbark ? this.nodeToPx(nodes.newbark.x, nodes.newbark.y) : null;
    if (nb) {
      addBldg('lab_oak', nb.px + 20, nb.py - 30, 112, 72);
      addBldg('house_red', nb.px - 90, nb.py - 40, 80, 56);
      addBldg('house_blue', nb.px - 90, nb.py + 40, 80, 56);
    }

    // Goldenrod City (Radio Tower, Gym, PokéCenter, PokéMart)
    const gr = nodes.goldenrod ? this.nodeToPx(nodes.goldenrod.x, nodes.goldenrod.y) : null;
    if (gr) {
      addBldg('silph_tower', gr.px - 90, gr.py - 90, 140, 160);
      addBldg('gym', gr.px + 70, gr.py - 40, 96, 79);
      addBldg('pokecenter', gr.px - 90, gr.py + 50, 80, 70);
      addBldg('pokemart', gr.px + 50, gr.py + 50, 64, 62);
    }

    // Ecruteak City
    const ec = nodes.ecruteak ? this.nodeToPx(nodes.ecruteak.x, nodes.ecruteak.y) : null;
    if (ec) {
      addBldg('gym_gold', ec.px - 100, ec.py - 40, 96, 79);
      addBldg('pokecenter', ec.px + 40, ec.py - 40, 80, 70);
      addBldg('house_green', ec.px - 80, ec.py + 40, 80, 56);
    }

    // Violet City
    const vi = nodes.violet ? this.nodeToPx(nodes.violet.x, nodes.violet.y) : null;
    if (vi) {
      addBldg('gym', vi.px - 90, vi.py - 40, 96, 79);
      addBldg('pokecenter', vi.px + 40, vi.py - 40, 80, 70);
      addBldg('mansion_school', vi.px - 80, vi.py + 40, 112, 86);
    }
  }
}
