/**
 * scripts/map/render_10_cities_showcase.ts
 *
 * PROCEDURAL CITY SHOWCASE - 10 HETEROGENEOUS POKEMON SETTLEMENTS
 *
 * Demonstrates the full capabilities of the procedural urban engine:
 *   1. Ciudad Celadón: Commercial Metropolis with 3x3 Fountain Plaza, Dept Store & Silph Tower.
 *   2. Ciudad Carmín: Maritime Harbor & Port with sandy beaches, cargo crates & Fan Club.
 *   3. Pueblo Paleta: 100% natural rural hamlet with Oak's Lab, picket fences & Red/Blue homesteads.
 *   4. Ciudad Plateada: Elevated mountain plateau bastion with Science Museum (16x8) & Rock Gym.
 *   5. Pueblo Lavanda: Somber spiritual village with the 15-story Pokémon Tower & purple roofs.
 *   6. Ciudad Celeste: Venice-style canal city crossed by a river, wooden bridges & Bike Shop.
 *   7. Ciudad Azafrán: Mega-crossroads with twin combat gyms (Psychic Gym & Fighting Dojo).
 *   8. Ciudad Fucsia: Garden settlement with dense hedge mazes, Daycare corral & Poison Gym.
 *   9. Pueblo Azalea: Rural village with natural freshwater pond, 3x3 fountain & berry gardens.
 *  10. Meseta Añil: High-mountain ceremonial sanctuary with Grand League Palace & Checkpoint Gate.
 *
 * Saves 10 individual high-resolution PNGs and a consolidated 10-city comparative mosaic
 * into `scratch/cities/` and the conversation artifacts directory.
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { resolveWaterCoastGrid, type WaterTerrainKind } from '../../src/logic/map/waterAutotileEngine.ts';
import { resolveMountainMapGrid, type MountainPalette } from '../../src/logic/map/mountainAutotileEngine.ts';
import { buildMapBlitInstructions, CANVAS_TILE_SIZE, resolveTileUrl } from '../../src/logic/map/canvasTileRenderer.ts';
import { generateSettlementLayout, type SettlementTerrainContext } from '../../src/logic/map/cityLayoutEngine.ts';
import type { ContinentMapResult } from '../../src/logic/map/continentGenerator.ts';
import type { POINode, SettlementLayoutResult, UrbanBuildingPlacement, UrbanPropPlacement } from '../../src/types/map/poiTypes.ts';
import { getBuildingPrefabMeta } from '../../src/logic/map/canonicalAssetsRegistry.ts';

const ROOT_DIR = process.cwd();
const SCRATCH_DIR = path.resolve(ROOT_DIR, 'scratch/cities');
const ARTIFACT_DIR = path.resolve(process.cwd(), 'scratch/maps');

if (!fs.existsSync(SCRATCH_DIR)) {
  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
}

const SEARCH_DIRS = [
  path.resolve(ROOT_DIR, 'public'),
  path.resolve(ROOT_DIR, 'public/assets'),
  path.resolve(ROOT_DIR, 'public/assets/tiles'),
  path.resolve(ROOT_DIR, 'public/assets/prefabs'),
  path.resolve(ROOT_DIR, 'public/assets/prefabs/buildings'),
  path.resolve(ROOT_DIR, 'public/assets/prefabs/vegetation'),
  path.resolve(ROOT_DIR, 'public/assets/prefabs/infrastructure'),
  path.resolve(ROOT_DIR, 'public/assets/prefabs/elevation'),
  path.resolve(ROOT_DIR, 'public/assets/canon/buildings'),
  path.resolve(ROOT_DIR, 'public/assets/canon/props'),
  path.resolve(ROOT_DIR, 'public/assets/essentials/autotiles'),
  path.resolve(ROOT_DIR, 'public/assets/studio/kanto/lpc')
];

function findDiskTilePath(filename: string): string | null {
  const rel = resolveTileUrl(filename);
  const directPath = path.join(ROOT_DIR, 'public', rel);
  if (fs.existsSync(directPath)) return directPath;

  for (const dir of SEARCH_DIRS) {
    const candidate = path.join(dir, filename);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

// Preload tile images into Sharp raw buffers
async function createTileCache(uniqueFilenames: Iterable<string>) {
  const tileCache = new Map<string, { data: Buffer; width: number; height: number }>();
  for (const fn of uniqueFilenames) {
    const diskPath = findDiskTilePath(fn);
    if (diskPath) {
      try {
        const { data, info } = await sharp(diskPath).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
        tileCache.set(fn, { data, width: info.width, height: info.height });
      } catch (err) {
        console.warn(`[Tile Load Error] ${fn} at ${diskPath}:`, err);
      }
    } else {
      console.warn(`[Tile Not Found] ${fn}`);
    }
  }
  return tileCache;
}

// Blit instructions to Sharp buffer with transparent alpha blending
function renderInstructionsToBuffer(
  instructions: readonly { filename: string; px: number; py: number }[],
  tileCache: Map<string, { data: Buffer; width: number; height: number }>,
  widthTiles: number,
  heightTiles: number
): Buffer {
  const W_px = widthTiles * CANVAS_TILE_SIZE;
  const H_px = heightTiles * CANVAS_TILE_SIZE;
  const buffer = Buffer.alloc(W_px * H_px * 4);

  // Background deep grass #2d6b38
  for (let i = 0; i < W_px * H_px; i++) {
    buffer[i * 4] = 45;
    buffer[i * 4 + 1] = 107;
    buffer[i * 4 + 2] = 56;
    buffer[i * 4 + 3] = 255;
  }

  for (const inst of instructions) {
    const tile = tileCache.get(inst.filename);
    if (!tile) continue;
    const tw = tile.width;
    const th = tile.height;
    for (let ty = 0; ty < th; ty++) {
      const dy = inst.py + ty;
      if (dy < 0 || dy >= H_px) continue;
      for (let tx = 0; tx < tw; tx++) {
        const dx = inst.px + tx;
        if (dx < 0 || dx >= W_px) continue;
        const sIdx = (ty * tw + tx) * 4;
        const a = tile.data[sIdx + 3];
        if (a === undefined || a === 0) continue;
        const dIdx = (dy * W_px + dx) * 4;
        if (a === 255) {
          buffer[dIdx] = tile.data[sIdx]!;
          buffer[dIdx + 1] = tile.data[sIdx + 1]!;
          buffer[dIdx + 2] = tile.data[sIdx + 2]!;
          buffer[dIdx + 3] = 255;
        } else {
          const alpha = a / 255;
          const inv = 1 - alpha;
          buffer[dIdx] = Math.round(tile.data[sIdx]! * alpha + buffer[dIdx]! * inv);
          buffer[dIdx + 1] = Math.round(tile.data[sIdx + 1]! * alpha + buffer[dIdx + 1]! * inv);
          buffer[dIdx + 2] = Math.round(tile.data[sIdx + 2]! * alpha + buffer[dIdx + 2]! * inv);
          buffer[dIdx + 3] = 255;
        }
      }
    }
  }

  return buffer;
}

export interface CitySpec {
  readonly id: string;
  readonly filename: string;
  readonly title: string;
  readonly subtitle: string;
  readonly width: number;
  readonly height: number;
  readonly poiNode: POINode;
  readonly seed: number;
  readonly mountainPalette?: MountainPalette;
  readonly createTerrain: (W: number, H: number) => {
    terrainMatrix: WaterTerrainKind[][];
    heightmap: number[][];
    bridgeGrid?: boolean[][];
    trees?: { prefabFile: string; x: number; y: number; width: number; height: number }[];
    customProps?: UrbanPropPlacement[];
    customBuildings?: UrbanBuildingPlacement[];
  };
}

async function renderCity(spec: CitySpec): Promise<Buffer> {
  const { width: W, height: H, poiNode, seed, mountainPalette = 'brown' } = spec;
  const { terrainMatrix, heightmap, bridgeGrid: customBridgeGrid, trees = [], customProps = [], customBuildings = [] } = spec.createTerrain(W, H);

  const resolvedWater = resolveWaterCoastGrid(terrainMatrix);
  const resolvedMountain = resolveMountainMapGrid(heightmap, { palette: mountainPalette });

  const continent: ContinentMapResult = {
    width: W,
    height: H,
    seed,
    terrainMatrix,
    heightmap,
    resolvedWater,
    resolvedMountain,
    placedStairs: [],
    cells: Array.from({ length: H }, (_, y) =>
      Array.from({ length: W }, (_, x) => ({
        x,
        y,
        terrain: terrainMatrix[y]![x]!,
        elevation: heightmap[y]![x]!,
        isWalkable: true,
        layerStack: ['poke_grass_plain.png']
      }))
    )
  };

  const context: SettlementTerrainContext = {
    heightmap,
    terrainMatrix,
    occupiedFootCells: resolvedMountain.occupiedFootCells,
    width: W,
    height: H
  };

  const initialLayout = generateSettlementLayout(poiNode, context, seed);
  let buildings: readonly UrbanBuildingPlacement[] = initialLayout.buildings;
  let props: readonly UrbanPropPlacement[] = initialLayout.props;

  if (spec.id === 'city_04_pewter_mountain_bastion') {
    // Remove residence_nw and landmark so the 16x8 Museum has the entire northern terrace clean
    buildings = buildings.filter((b) => !b.id.includes('residence_nw') && !b.id.includes('landmark'));
  } else if (spec.id === 'city_07_saffron_dojo_hub') {
    // Replace game_corner with the Fighting Dojo
    buildings = buildings.filter((b) => !b.id.includes('game_corner'));
  }

  if (customBuildings.length > 0) {
    buildings = [...buildings, ...customBuildings];
  }
  if (customProps.length > 0) {
    props = [...props, ...customProps];
  }

  const finalLayout: SettlementLayoutResult = {
    ...initialLayout,
    buildings,
    props
  };

  const finalPoiNode: POINode = {
    ...poiNode,
    urbanLayout: finalLayout
  };

  const pathGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const bridgeGrid: boolean[][] = customBridgeGrid ?? Array.from({ length: H }, () => Array(W).fill(false));

  const wilderness = {
    trees,
    tallGrassGrid: Array.from({ length: H }, () => Array(W).fill(false)),
    tallGrassPatches: [],
    props: []
  };

  const { instructions, uniqueFilenames } = buildMapBlitInstructions(
    continent,
    [finalPoiNode],
    pathGrid,
    bridgeGrid,
    wilderness
  );

  const tileCache = await createTileCache(uniqueFilenames);
  const rawBuffer = renderInstructionsToBuffer(instructions, tileCache, W, H);

  const W_px = W * CANVAS_TILE_SIZE;
  const H_px = H * CANVAS_TILE_SIZE;

  const escapeXml = (str: string): string =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

  // Add Thematic Banner at top
  const bannerSvg = `
    <svg width="${W_px}" height="58">
      <defs>
        <linearGradient id="bannerBg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0a1428" stop-opacity="0.94" />
          <stop offset="100%" stop-color="#1e293b" stop-opacity="0.88" />
        </linearGradient>
      </defs>
      <rect width="${W_px}" height="58" fill="url(#bannerBg)" rx="4" />
      <rect x="0" y="56" width="${W_px}" height="2" fill="#38bdf8" />
      <text x="14" y="24" font-family="monospace, sans-serif" font-weight="bold" font-size="15" fill="#38bdf8" letter-spacing="1">${escapeXml(spec.title.toUpperCase())}</text>
      <text x="14" y="44" font-family="sans-serif" font-size="11" fill="#cbd5e1">${escapeXml(spec.subtitle)}</text>
    </svg>
  `;

  const bannerPng = await sharp(Buffer.from(bannerSvg)).png().toBuffer();

  const finalPng = await sharp(rawBuffer, { raw: { width: W_px, height: H_px, channels: 4 } })
    .composite([{ input: bannerPng, top: 0, left: 0 }])
    .png()
    .toBuffer();

  // Save individual PNG
  const scratchPath = path.join(SCRATCH_DIR, spec.filename);
  await sharp(finalPng).toFile(scratchPath);

  if (fs.existsSync(ARTIFACT_DIR)) {
    const artifactPath = path.join(ARTIFACT_DIR, spec.filename);
    fs.copyFileSync(scratchPath, artifactPath);
  }

  return finalPng;
}

// ----------------------------------------------------------------------------
// SPECIFICATION OF THE 10 DISTINCT POKÉMON CITIES
// ----------------------------------------------------------------------------

export const CITY_SPECS: readonly CitySpec[] = [
  // 1. Ciudad Celadón: Commercial Metropolis
  {
    id: 'city_01_celadon_metropolis',
    filename: 'city_01_celadon_metropolis.png',
    title: '01. CIUDAD CELADÓN - GRAN METRÓPOLIS COMERCIAL',
    subtitle: 'Escala: Metropolis (30x26) | Avenidas de asfalto, Plaza Cívica 3x3, Silph Tower, Dept Store, Casino',
    width: 30,
    height: 26,
    seed: 101,
    poiNode: {
      id: 'celadon_metropolis',
      name: 'Ciudad Celadón',
      type: 'metropolis',
      gridX: 1,
      gridY: 1,
      footprint: { width: 28, height: 23 },
      gateways: [],
      elevation: 0,
      terrainPreference: 'flat_grass',
      facing: 'south'
    },
    createTerrain: (W, H) => ({
      terrainMatrix: Array.from({ length: H }, () => Array(W).fill('grass')),
      heightmap: Array.from({ length: H }, () => Array(W).fill(0)),
      trees: [
        { prefabFile: 'poke_tree_oak_clean.png', x: 0, y: 22, width: 3, height: 4 },
        { prefabFile: 'poke_tree_oak_clean.png', x: 27, y: 22, width: 3, height: 4 }
      ]
    })
  },

  // 2. Ciudad Carmín: Maritime Harbor & Port
  {
    id: 'city_02_vermilion_harbor',
    filename: 'city_02_vermilion_harbor.png',
    title: '02. CIUDAD CARMÍN - PUERTO MARÍTIMO & MUELLE DE CARGA',
    subtitle: 'Escala: City / Port (30x24) | Playa de arena, muelle portuario, grúas, cargamento marítimo, Club de Fans',
    width: 30,
    height: 24,
    seed: 777,
    poiNode: {
      id: 'vermilion_harbor',
      name: 'Ciudad Carmín',
      type: 'city',
      gridX: 3,
      gridY: 3,
      footprint: { width: 22, height: 18 },
      gateways: [],
      elevation: 0,
      terrainPreference: 'coast_water',
      hasGym: true
    },
    createTerrain: (W, H) => {
      const terrainMatrix: WaterTerrainKind[][] = Array.from({ length: H }, () => Array(W).fill('grass'));
      for (let y = 17; y <= 19; y++) {
        for (let x = 0; x < W; x++) terrainMatrix[y]![x] = 'sand';
      }
      for (let y = 20; y < H; y++) {
        for (let x = 0; x < W; x++) terrainMatrix[y]![x] = 'water';
      }
      return {
        terrainMatrix,
        heightmap: Array.from({ length: H }, () => Array(W).fill(0)),
        trees: [
          { prefabFile: 'poke_tree_oak_clean.png', x: 0, y: 13, width: 3, height: 4 },
          { prefabFile: 'poke_tree_oak_clean.png', x: 26, y: 13, width: 3, height: 4 }
        ],
        customProps: [
          { type: 'crates', x: 21, y: 11, prefabFile: 'poke_port_cargo_crates_stack.png' },
          { type: 'crates', x: 22, y: 13, prefabFile: 'poke_port_cargo_crates_double.png' },
          { type: 'bench', x: 19, y: 13, prefabFile: 'poke_bench.png' }
        ]
      };
    }
  },

  // 3. Pueblo Paleta: Rustic Starter Village
  {
    id: 'city_03_pallet_rustic_town',
    filename: 'city_03_pallet_rustic_town.png',
    title: '03. PUEBLO PALETA - ALDEA RURAL & ORIGEN DEL ENTRENADOR',
    subtitle: 'Escala: Town (24x22) | 100% césped natural, senderos de tierra, Laboratorio de Oak, vallas de estacas, flores',
    width: 24,
    height: 22,
    seed: 42,
    poiNode: {
      id: 'pallet_rustic_town',
      name: 'Pueblo Paleta',
      type: 'town',
      gridX: 4,
      gridY: 4,
      footprint: { width: 14, height: 14 },
      gateways: [],
      elevation: 0,
      terrainPreference: 'flat_grass',
      tier: 0
    },
    createTerrain: (W, H) => ({
      terrainMatrix: Array.from({ length: H }, () => Array(W).fill('grass')),
      heightmap: Array.from({ length: H }, () => Array(W).fill(0)),
      trees: [
        { prefabFile: 'poke_tree_oak_clean.png', x: 1, y: 1, width: 3, height: 4 },
        { prefabFile: 'poke_tree_oak_clean.png', x: 20, y: 1, width: 3, height: 4 },
        { prefabFile: 'poke_tree_oak_clean.png', x: 1, y: 17, width: 3, height: 4 },
        { prefabFile: 'poke_tree_oak_clean.png', x: 20, y: 17, width: 3, height: 4 }
      ]
    })
  },

  // 4. Ciudad Plateada: Elevated Mountain Bastion
  {
    id: 'city_04_pewter_mountain_bastion',
    filename: 'city_04_pewter_mountain_bastion.png',
    title: '04. CIUDAD PLATEADA - BASTIÓN DE MONTAÑA & CANTERA ROCOSA',
    subtitle: 'Escala: City (28x24) | Risco de montaña elevado, Museo de la Ciencia (16x8), Gimnasio de Roca, peñascos',
    width: 28,
    height: 24,
    seed: 1999,
    mountainPalette: 'brown',
    poiNode: {
      id: 'pewter_mountain_bastion',
      name: 'Ciudad Plateada',
      type: 'city',
      gridX: 3,
      gridY: 5,
      footprint: { width: 22, height: 17 },
      gateways: [],
      elevation: 0,
      terrainPreference: 'mountain_plateau',
      hasGym: false
    },
    createTerrain: (W, H) => {
      const heightmap: number[][] = Array.from({ length: H }, () => Array(W).fill(0));
      // Northern mountain cliff terrace
      for (let y = 0; y <= 2; y++) {
        for (let x = 0; x < W; x++) heightmap[y]![x] = 1;
      }
      for (let y = 3; y <= 4; y++) {
        for (let x = 0; x < 4; x++) heightmap[y]![x] = 1;
        for (let x = W - 4; x < W; x++) heightmap[y]![x] = 1;
      }

      const museumMeta = getBuildingPrefabMeta('poke_museum');
      const gymMeta = getBuildingPrefabMeta('gym');
      const customBuildings: UrbanBuildingPlacement[] = [
        {
          id: 'pewter_museum',
          type: 'house',
          x: 6,
          y: 4,
          width: museumMeta.width,
          height: museumMeta.height,
          doorX: 6 + Math.floor(museumMeta.width / 2),
          doorY: 4 + museumMeta.height - 1,
          prefabFile: museumMeta.prefabFile
        },
        {
          id: 'pewter_gym',
          type: 'gym',
          x: 21,
          y: 14,
          width: gymMeta.width,
          height: gymMeta.height,
          doorX: 21 + Math.floor(gymMeta.width / 2),
          doorY: 14 + gymMeta.height - 1,
          prefabFile: gymMeta.prefabFile
        }
      ];

      return {
        terrainMatrix: Array.from({ length: H }, () => Array(W).fill('grass')),
        heightmap,
        customBuildings,
        customProps: [
          { type: 'rock', x: 23, y: 15, prefabFile: 'poke_rock_boulder.png' },
          { type: 'rock', x: 4, y: 15, prefabFile: 'poke_rock_boulder.png' },
          { type: 'rock', x: 24, y: 6, prefabFile: 'poke_rock_boulder.png' }
        ],
        trees: [
          { prefabFile: 'poke_tree_pine_small.png', x: 1, y: 18, width: 2, height: 3 },
          { prefabFile: 'poke_tree_pine_small.png', x: 25, y: 18, width: 2, height: 3 }
        ]
      };
    }
  },

  // 5. Pueblo Lavanda: Spiritual Shrine & Pokémon Tower
  {
    id: 'city_05_lavender_spiritual_tower',
    filename: 'city_05_lavender_spiritual_tower.png',
    title: '05. PUEBLO LAVANDA - VILLA SAGRADA & TORRE ESPIRITUAL',
    subtitle: 'Escala: Town (26x24) | Torre Pokémon (7x15 / 480px), tejados púrpuras, estatuas guardianas, misticismo',
    width: 26,
    height: 24,
    seed: 888,
    poiNode: {
      id: 'lavender_spiritual_tower',
      name: 'Pueblo Lavanda',
      type: 'town',
      gridX: 3,
      gridY: 3,
      footprint: { width: 20, height: 18 },
      gateways: [],
      elevation: 0,
      terrainPreference: 'flat_grass'
    },
    createTerrain: (W, H) => {
      const towerMeta = getBuildingPrefabMeta('poke_pokemon_tower');
      const customBuildings: UrbanBuildingPlacement[] = [
        {
          id: 'lavender_tower',
          type: 'house',
          x: 16,
          y: 4,
          width: towerMeta.width,
          height: towerMeta.height,
          doorX: 16 + 3,
          doorY: 4 + towerMeta.height - 1,
          prefabFile: towerMeta.prefabFile
        }
      ];

      return {
        terrainMatrix: Array.from({ length: H }, () => Array(W).fill('grass')),
        heightmap: Array.from({ length: H }, () => Array(W).fill(0)),
        customBuildings,
        customProps: [
          { type: 'statue', x: 14, y: 18, prefabFile: 'poke_statue_gym.png' },
          { type: 'statue', x: 24, y: 18, prefabFile: 'poke_statue_gym.png' },
          { type: 'fence_h', x: 13, y: 19, prefabFile: 'poke_fence_picket.png' },
          { type: 'fence_h', x: 24, y: 19, prefabFile: 'poke_fence_picket.png' }
        ],
        trees: [
          { prefabFile: 'poke_tree_oak_clean.png', x: 1, y: 1, width: 3, height: 4 },
          { prefabFile: 'poke_tree_oak_clean.png', x: 1, y: 18, width: 3, height: 4 }
        ]
      };
    }
  },

  // 6. Ciudad Celeste: Venice-style River Canal City
  {
    id: 'city_06_cerulean_river_canals',
    filename: 'city_06_cerulean_river_canals.png',
    title: '06. CIUDAD CELESTE - VENECIA FLUVIAL & CIUDAD DE LOS CANALES',
    subtitle: 'Escala: City (30x26) | Río central con puentes de madera, Tienda de Bicis, Gimnasio Acuático, paseo fluvial',
    width: 30,
    height: 26,
    seed: 555,
    poiNode: {
      id: 'cerulean_canal_city',
      name: 'Ciudad Celeste',
      type: 'city',
      gridX: 3,
      gridY: 3,
      footprint: { width: 24, height: 20 },
      gateways: [],
      elevation: 0,
      terrainPreference: 'flat_grass',
      hasGym: true
    },
    createTerrain: (W, H) => {
      const terrainMatrix: WaterTerrainKind[][] = Array.from({ length: H }, () => Array(W).fill('grass'));
      const bridgeGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));

      // North-to-South Canal at columns 13 to 15
      for (let y = 0; y < H; y++) {
        terrainMatrix[y]![13] = 'water';
        terrainMatrix[y]![14] = 'water';
        terrainMatrix[y]![15] = 'water';
      }

      // Wooden bridge spans at row 12..13
      bridgeGrid[12]![13] = true;
      bridgeGrid[12]![14] = true;
      bridgeGrid[12]![15] = true;
      bridgeGrid[13]![13] = true;
      bridgeGrid[13]![14] = true;
      bridgeGrid[13]![15] = true;

      const bikeMeta = getBuildingPrefabMeta('poke_bike_shop');
      const customBuildings: UrbanBuildingPlacement[] = [
        {
          id: 'cerulean_bike_shop',
          type: 'house',
          x: 4,
          y: 14,
          width: bikeMeta.width,
          height: bikeMeta.height,
          doorX: 4 + Math.floor(bikeMeta.width / 2),
          doorY: 14 + bikeMeta.height - 1,
          prefabFile: bikeMeta.prefabFile
        }
      ];

      return {
        terrainMatrix,
        heightmap: Array.from({ length: H }, () => Array(W).fill(0)),
        bridgeGrid,
        customBuildings,
        customProps: [
          { type: 'bench', x: 11, y: 15, prefabFile: 'poke_bench_v_left.png' },
          { type: 'bench', x: 17, y: 15, prefabFile: 'poke_bench_v_right.png' }
        ],
        trees: [
          { prefabFile: 'poke_tree_oak_clean.png', x: 0, y: 21, width: 3, height: 4 },
          { prefabFile: 'poke_tree_oak_clean.png', x: 26, y: 21, width: 3, height: 4 }
        ]
      };
    }
  },

  // 7. Ciudad Azafrán: Mega-Crossroads with Twin Combat Gyms
  {
    id: 'city_07_saffron_dojo_hub',
    filename: 'city_07_saffron_dojo_hub.png',
    title: '07. CIUDAD AZAFRÁN - MEGÁPOLIS DE COMBATE & ARTES MARCIALES',
    subtitle: 'Escala: Metropolis (30x26) | Cruce de avenidas, Gimnasio Psíquico junto al Dojo de Lucha, Condos, Silph Tower',
    width: 30,
    height: 26,
    seed: 333,
    poiNode: {
      id: 'saffron_dojo_hub',
      name: 'Ciudad Azafrán',
      type: 'metropolis',
      gridX: 1,
      gridY: 1,
      footprint: { width: 28, height: 23 },
      gateways: [],
      elevation: 0,
      terrainPreference: 'flat_grass',
      facing: 'south'
    },
    createTerrain: (W, H) => {
      const dojoMeta = getBuildingPrefabMeta('poke_dojo');
      const customBuildings: UrbanBuildingPlacement[] = [
        {
          id: 'saffron_fighting_dojo',
          type: 'house',
          x: 22,
          y: 8,
          width: dojoMeta.width,
          height: dojoMeta.height,
          doorX: 22 + Math.floor(dojoMeta.width / 2),
          doorY: 8 + dojoMeta.height - 1,
          prefabFile: dojoMeta.prefabFile
        }
      ];

      return {
        terrainMatrix: Array.from({ length: H }, () => Array(W).fill('grass')),
        heightmap: Array.from({ length: H }, () => Array(W).fill(0)),
        customBuildings,
        customProps: [
          { type: 'statue', x: 21, y: 11, prefabFile: 'poke_statue_gym.png' },
          { type: 'statue', x: 28, y: 11, prefabFile: 'poke_statue_gym.png' }
        ],
        trees: [
          { prefabFile: 'poke_tree_oak_clean.png', x: 0, y: 22, width: 3, height: 4 },
          { prefabFile: 'poke_tree_oak_clean.png', x: 27, y: 22, width: 3, height: 4 }
        ]
      };
    }
  },

  // 8. Ciudad Fucsia: Garden Settlement & Safari Reserve
  {
    id: 'city_08_fuchsia_safari_garden',
    filename: 'city_08_fuchsia_safari_garden.png',
    title: '08. CIUDAD FUCSIA - CIUDAD JARDÍN & RESERVA SAFARI',
    subtitle: 'Escala: City (28x24) | Setos de boj redondeados, Guardería Pokémon, Gimnasio Veneno, jardines y parterres',
    width: 28,
    height: 24,
    seed: 1234,
    poiNode: {
      id: 'fuchsia_safari_garden',
      name: 'Ciudad Fucsia',
      type: 'city',
      gridX: 3,
      gridY: 3,
      footprint: { width: 22, height: 18 },
      gateways: [],
      elevation: 0,
      terrainPreference: 'flat_grass',
      hasGym: true
    },
    createTerrain: (W, H) => {
      const daycareMeta = getBuildingPrefabMeta('poke_daycare');
      const customBuildings: UrbanBuildingPlacement[] = [
        {
          id: 'fuchsia_daycare',
          type: 'house',
          x: 18,
          y: 4,
          width: daycareMeta.width,
          height: daycareMeta.height,
          doorX: 18 + Math.floor(daycareMeta.width / 2),
          doorY: 4 + daycareMeta.height - 1,
          prefabFile: daycareMeta.prefabFile
        }
      ];

      return {
        terrainMatrix: Array.from({ length: H }, () => Array(W).fill('grass')),
        heightmap: Array.from({ length: H }, () => Array(W).fill(0)),
        customBuildings,
        customProps: [
          { type: 'flower', x: 11, y: 10, prefabFile: 'poke_bush_round.png' },
          { type: 'flower', x: 12, y: 10, prefabFile: 'poke_bush_round.png' },
          { type: 'flower', x: 15, y: 10, prefabFile: 'poke_bush_round.png' },
          { type: 'flower', x: 16, y: 10, prefabFile: 'poke_bush_round.png' },
          { type: 'fence_h', x: 18, y: 9, prefabFile: 'poke_fence_wood_h.png' },
          { type: 'fence_h', x: 19, y: 9, prefabFile: 'poke_fence_wood_h.png' },
          { type: 'fence_h', x: 20, y: 9, prefabFile: 'poke_fence_wood_h.png' }
        ],
        trees: [
          { prefabFile: 'poke_tree_oak_clean.png', x: 1, y: 1, width: 3, height: 4 },
          { prefabFile: 'poke_tree_oak_clean.png', x: 24, y: 1, width: 3, height: 4 },
          { prefabFile: 'poke_tree_oak_clean.png', x: 1, y: 19, width: 3, height: 4 },
          { prefabFile: 'poke_tree_oak_clean.png', x: 24, y: 19, width: 3, height: 4 }
        ]
      };
    }
  },

  // 9. Pueblo Azalea: Rural Village with Natural Pond
  {
    id: 'city_09_azalea_pond_village',
    filename: 'city_09_azalea_pond_village.png',
    title: '09. PUEBLO AZALEA - VILLA CON ESTANQUE NATURAL & HUERTOS',
    subtitle: 'Escala: Town (26x24) | Estanque central con fuente monumental 3x3, huerto de bayas, casas campestres',
    width: 26,
    height: 24,
    seed: 2468,
    poiNode: {
      id: 'azalea_pond_village',
      name: 'Pueblo Azalea',
      type: 'town',
      gridX: 3,
      gridY: 3,
      footprint: { width: 20, height: 18 },
      gateways: [],
      elevation: 0,
      terrainPreference: 'flat_grass',
      tier: 1
    },
    createTerrain: (W, H) => {
      const terrainMatrix: WaterTerrainKind[][] = Array.from({ length: H }, () => Array(W).fill('grass'));
      // Central Pond
      for (let y = 14; y <= 17; y++) {
        for (let x = 15; x <= 19; x++) {
          terrainMatrix[y]![x] = 'water';
        }
      }

      return {
        terrainMatrix,
        heightmap: Array.from({ length: H }, () => Array(W).fill(0)),
        customProps: [
          { type: 'bench', x: 16, y: 19, prefabFile: 'poke_bench.png' },
          { type: 'fence_h', x: 15, y: 13, prefabFile: 'poke_fence_picket.png' },
          { type: 'fence_h', x: 16, y: 13, prefabFile: 'poke_fence_picket.png' },
          { type: 'flower', x: 14, y: 15, prefabFile: 'poke_flowers_red.png' },
          { type: 'flower', x: 20, y: 15, prefabFile: 'poke_flowers_red.png' }
        ],
        trees: [
          { prefabFile: 'poke_tree_oak_clean.png', x: 1, y: 1, width: 3, height: 4 },
          { prefabFile: 'poke_tree_oak_clean.png', x: 21, y: 1, width: 3, height: 4 },
          { prefabFile: 'poke_tree_oak_clean.png', x: 1, y: 18, width: 3, height: 4 }
        ]
      };
    }
  },

  // 10. Meseta Añil: High-Mountain Ceremonial League Sanctuary
  {
    id: 'city_10_indigo_plateau_league',
    filename: 'city_10_indigo_plateau_league.png',
    title: '10. MESETA AÑIL - SANTUARIO CEREMONIAL DE LA LIGA POKÉMON',
    subtitle: 'Escala: League (28x26) | Gran Palacio (11x8), Puerta de Control Sur (6x7), calzada ceremonial de honor',
    width: 28,
    height: 26,
    seed: 7777,
    mountainPalette: 'brown',
    poiNode: {
      id: 'indigo_plateau_league',
      name: 'Meseta Añil',
      type: 'pokemon_league',
      gridX: 3,
      gridY: 3,
      footprint: { width: 22, height: 21 },
      gateways: [],
      elevation: 1,
      terrainPreference: 'mountain_plateau'
    },
    createTerrain: (W, H) => {
      const heightmap: number[][] = Array.from({ length: H }, () => Array(W).fill(1));
      // Southern lower valley steps
      for (let y = 23; y < H; y++) {
        for (let x = 0; x < W; x++) heightmap[y]![x] = 0;
      }

      return {
        terrainMatrix: Array.from({ length: H }, () => Array(W).fill('grass')),
        heightmap,
        trees: [
          { prefabFile: 'poke_tree_pine_small.png', x: 1, y: 4, width: 2, height: 3 },
          { prefabFile: 'poke_tree_pine_small.png', x: 25, y: 4, width: 2, height: 3 },
          { prefabFile: 'poke_tree_pine_small.png', x: 1, y: 16, width: 2, height: 3 },
          { prefabFile: 'poke_tree_pine_small.png', x: 25, y: 16, width: 2, height: 3 }
        ]
      };
    }
  }
];

async function main(): Promise<void> {
  console.log('🏛️  Iniciando generador de 10 Ciudades Procedurales Únicas (GBA Standard)...');

  const renderedImages: Buffer[] = [];

  for (let i = 0; i < CITY_SPECS.length; i++) {
    const spec = CITY_SPECS[i]!;
    console.log(`  [${i + 1}/10] Renderizando ${spec.title}...`);
    const pngBuffer = await renderCity(spec);
    renderedImages.push(pngBuffer);
  }

  // Create High-Definition 2-Column x 5-Row Showcase Mosaic
  console.log('\n🎨 Ensamblando Mosaico Comparativo de 10 Ciudades (2 columnas x 5 filas)...');
  const cols = 2;
  const rows = 5;
  const thumbW = 960;
  const thumbH = 800;
  const mosaicW = cols * thumbW;
  const mosaicH = rows * thumbH;

  const composites: sharp.OverlayOptions[] = [];
  for (let i = 0; i < renderedImages.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);

    const resized = await sharp(renderedImages[i]!)
      .resize(thumbW, thumbH, { fit: 'contain', background: { r: 10, g: 20, b: 40, alpha: 1 } })
      .png()
      .toBuffer();

    composites.push({
      input: resized,
      left: col * thumbW,
      top: row * thumbH
    });
  }

  const mosaicBuffer = await sharp({
    create: {
      width: mosaicW,
      height: mosaicH,
      channels: 4,
      background: { r: 10, g: 20, b: 40, alpha: 1 }
    }
  })
    .composite(composites)
    .png()
    .toBuffer();

  const mosaicScratch = path.join(SCRATCH_DIR, 'showcase_10_ciudades_procedurales.png');
  await sharp(mosaicBuffer).toFile(mosaicScratch);

  if (fs.existsSync(ARTIFACT_DIR)) {
    const mosaicArtifact = path.join(ARTIFACT_DIR, 'showcase_10_ciudades_procedurales.png');
    fs.copyFileSync(mosaicScratch, mosaicArtifact);
  }

  console.log('✅ ¡Las 10 ciudades y el mosaico maestro han sido generados con éxito!');
  console.log(`📁 Archivos guardados en: ${SCRATCH_DIR}`);
  console.log(`📁 Artefactos copiados a: ${ARTIFACT_DIR}`);
}

main().catch((err) => {
  console.error('❌ Error generando el showcase de 10 ciudades:', err);
  process.exit(1);
});
