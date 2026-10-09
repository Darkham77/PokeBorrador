/**
 * scripts/map/generate_multi_map_audit.ts
 *
 * MULTI-MAP PROCEDURAL GENERATION STRESS TEST & AUDITOR
 *
 * Generates 10 diverse continental maps with heterogeneous configurations:
 *   - Sizes: 64x64, 80x80, 96x96, 128x128
 *   - Water ratios: 0.18 (pangaea) to 0.52 (archipelago)
 *   - Mountain ratios: 0.10 (coastal plains) to 0.42 (heavy massif)
 *   - Mountain palettes: 'brown', 'gray', 'volcanic'
 *   - Lakes: 1 to 8 inland lakes
 *   - Seeds: diverse pseudo-random seeds
 *
 * For each map, renders a 2K composite image with SVG annotations,
 * validates topological connectivity and collision invariants, and saves
 * artifacts for visual inspection.
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  generateContinentMap,
  type ContinentMapResult
} from '../../src/logic/map/continentGenerator.ts';
import { placeRegionalPOIs } from '../../src/logic/map/poiPlacementEngine.ts';
import { generateRouteNetwork } from '../../src/logic/map/routeNetworkEngine.ts';
import { generateWildernessLayer } from '../../src/logic/map/wildernessVegetationEngine.ts';
import { buildMapBlitInstructions } from '../../src/logic/map/canvasTileRenderer.ts';
import { CANONICAL_ASSETS_BY_ID } from '../../src/logic/map/canonicalAssetsRegistry.ts';
import type { MountainPalette } from '../../src/logic/map/mountainAutotileEngine.ts';
import type { POINode } from '../../src/types/map/poiTypes.ts';

const ROOT_DIR = process.cwd();
const TILE_SIZE = 32;
const SCRATCH_DIR = path.resolve(ROOT_DIR, 'scratch/multi_map_audit');
const ARTIFACT_DIR = path.resolve(process.cwd(), 'scratch/maps');

const PREFABS_DIR = path.resolve(ROOT_DIR, 'public/assets/studio/kanto/prefabs');

interface MapConfig {
  readonly id: string;
  readonly title: string;
  readonly size: number;
  readonly seed: number;
  readonly oceanWaterPercentage: number;
  readonly beachWidth: number;
  readonly lakeCount: number;
  readonly mountainPercentage: number;
  readonly mountainPalette: MountainPalette;
  readonly poiTargetCount: number;
}

const TEST_CONFIGURATIONS: readonly MapConfig[] = [
  {
    id: 'map_01_archipelago_64x64',
    title: '1. Archipielago de Cayo Menor (64x64, Agua Alta, Brown)',
    size: 64,
    seed: 111,
    oceanWaterPercentage: 0.52,
    beachWidth: 2,
    lakeCount: 1,
    mountainPercentage: 0.12,
    mountainPalette: 'brown',
    poiTargetCount: 8
  },
  {
    id: 'map_02_pangaea_64x64',
    title: '2. Pangea Continental Interior (64x64, Tierra Alta, Gray)',
    size: 64,
    seed: 222,
    oceanWaterPercentage: 0.18,
    beachWidth: 4,
    lakeCount: 3,
    mountainPercentage: 0.28,
    mountainPalette: 'gray',
    poiTargetCount: 10
  },
  {
    id: 'map_03_volcanic_caldera_80x80',
    title: '3. Caldera Volcanica de Cinnabar (80x80, Montana Alta, Volcanic)',
    size: 80,
    seed: 333,
    oceanWaterPercentage: 0.38,
    beachWidth: 3,
    lakeCount: 4,
    mountainPercentage: 0.35,
    mountainPalette: 'volcanic',
    poiTargetCount: 12
  },
  {
    id: 'map_04_alpine_fjords_80x80',
    title: '4. Fiordos Alpinos y Risco Gris (80x80, Agua Moderada, Gray)',
    size: 80,
    seed: 444,
    oceanWaterPercentage: 0.44,
    beachWidth: 2,
    lakeCount: 2,
    mountainPercentage: 0.32,
    mountainPalette: 'gray',
    poiTargetCount: 12
  },
  {
    id: 'map_05_dense_megalopolis_96x96',
    title: '5. Megalopolis y Corredor Central (96x96, Tierra Continental, Brown)',
    size: 96,
    seed: 1010,
    oceanWaterPercentage: 0.22,
    beachWidth: 4,
    lakeCount: 4,
    mountainPercentage: 0.20,
    mountainPalette: 'brown',
    poiTargetCount: 16
  },
  {
    id: 'map_06_islands_plateau_96x96',
    title: '6. Meseta Costera e Islas Escarpadas (96x96, Volcanic, Agua Media)',
    size: 96,
    seed: 555,
    oceanWaterPercentage: 0.36,
    beachWidth: 3,
    lakeCount: 3,
    mountainPercentage: 0.36,
    mountainPalette: 'volcanic',
    poiTargetCount: 14
  },
  {
    id: 'map_07_river_delta_80x80',
    title: '7. Delta Fluvial y Lagos Gemelos (80x80, Brown, Tierra Bajas)',
    size: 80,
    seed: 777,
    oceanWaterPercentage: 0.30,
    beachWidth: 2,
    lakeCount: 6,
    mountainPercentage: 0.16,
    mountainPalette: 'brown',
    poiTargetCount: 11
  },
  {
    id: 'map_08_continental_divide_112x112',
    title: '8. Cordillera Divisoria Continental (112x112, Gray, Montana Masiva)',
    size: 112,
    seed: 888,
    oceanWaterPercentage: 0.22,
    beachWidth: 3,
    lakeCount: 5,
    mountainPercentage: 0.40,
    mountainPalette: 'gray',
    poiTargetCount: 18
  },
  {
    id: 'map_09_highland_valleys_64x64',
    title: '9. Valles de Montana y Estrechos (64x64, Volcanic, Agua Costera)',
    size: 64,
    seed: 999,
    oceanWaterPercentage: 0.42,
    beachWidth: 2,
    lakeCount: 2,
    mountainPercentage: 0.30,
    mountainPalette: 'volcanic',
    poiTargetCount: 8
  },
  {
    id: 'map_10_giant_continent_128x128',
    title: '10. Gran Continente Kanto Extendido (128x128, Brown, Megaregion)',
    size: 128,
    seed: 1234,
    oceanWaterPercentage: 0.25,
    beachWidth: 3,
    lakeCount: 7,
    mountainPercentage: 0.25,
    mountainPalette: 'brown',
    poiTargetCount: 20
  }
];

interface RawImage {
  readonly width: number;
  readonly height: number;
  readonly data: Buffer;
}

const rawCache = new Map<string, RawImage | null>();

function resolveAssetPath(filename: string): string | null {
  const baseId = filename.replace(/\.png$/, '');
  const canonAsset = CANONICAL_ASSETS_BY_ID[baseId];
  if (canonAsset) {
    const canonPath = path.resolve(ROOT_DIR, 'public/assets', canonAsset.runtimePath);
    if (fs.existsSync(canonPath)) return canonPath;
  }

  const candidates = [
    path.join(PREFABS_DIR, filename),
    path.resolve(ROOT_DIR, 'public/assets/essentials/prefabs/buildings', filename),
    path.resolve(ROOT_DIR, 'public/assets/essentials/prefabs/props', filename),
    path.resolve(ROOT_DIR, 'public/assets/essentials/prefabs/infrastructure', filename),
    path.resolve(ROOT_DIR, 'public/assets/essentials/prefabs/elevation', filename),
    path.resolve(ROOT_DIR, 'public/assets/essentials/prefabs/vegetation', filename),
    path.resolve(ROOT_DIR, 'public/assets/canon/buildings', filename),
    path.resolve(ROOT_DIR, 'public/assets/canon/props', filename),
    path.resolve(ROOT_DIR, 'public/assets/canon/infrastructure', filename),
    path.resolve(ROOT_DIR, 'public/assets/canon/curbs', filename),
    path.resolve(ROOT_DIR, 'public/assets/canon/roads', filename),
    path.resolve(ROOT_DIR, 'public/assets/prefabs/buildings', filename),
    path.resolve(ROOT_DIR, 'public/assets/prefabs/props', filename),
    path.resolve(ROOT_DIR, 'public/assets/prefabs/infrastructure', filename),
    path.resolve(ROOT_DIR, 'public/assets/prefabs/elevation', filename),
    path.resolve(ROOT_DIR, 'public/assets/prefabs/vegetation', filename),
    path.resolve(ROOT_DIR, 'public/assets/prefabs/terrain', filename),
    path.resolve(ROOT_DIR, 'public/assets/prefabs/water', filename),
    path.resolve(ROOT_DIR, 'public/assets/prefabs', filename),
    path.resolve(ROOT_DIR, 'public/assets/tiles/elevation/brown', filename),
    path.resolve(ROOT_DIR, 'public/assets/tiles/elevation/gray', filename),
    path.resolve(ROOT_DIR, 'public/assets/tiles/elevation/volcanic', filename),
    path.resolve(ROOT_DIR, 'public/assets/tiles/elevation', filename),
    path.resolve(ROOT_DIR, 'public/assets/tiles/terrain', filename),
    path.resolve(ROOT_DIR, 'public/assets/tiles', filename)
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

async function loadRawImage(filePath: string | null): Promise<RawImage | null> {
  if (!filePath) return null;
  if (rawCache.has(filePath)) return rawCache.get(filePath) ?? null;
  if (!fs.existsSync(filePath)) {
    rawCache.set(filePath, null);
    return null;
  }
  try {
    const { data, info } = await sharp(filePath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const img: RawImage = { width: info.width, height: info.height, data };
    rawCache.set(filePath, img);
    return img;
  } catch {
    rawCache.set(filePath, null);
    return null;
  }
}

interface MapTelemetry {
  readonly config: MapConfig;
  readonly landCells: number;
  readonly waterCells: number;
  readonly mountainCells: number;
  readonly placedStairs: number;
  readonly placedPOIs: number;
  readonly routeCount: number;
  readonly pathCells: number;
  readonly bridgeCells: number;
  readonly treesCount: number;
  readonly grassPatchesCount: number;
  readonly roadsidePropsCount: number;
  readonly totalBlitInstructions: number;
  readonly anomalies: readonly string[];
}

async function generateAndRenderMap(cfg: MapConfig): Promise<MapTelemetry> {
  const anomalies: string[] = []; // no-domain: Estructura o identificador procedural de aventura
  const W = cfg.size;
  const H = cfg.size;

  // 1. Generate Continent Map
  const continent: ContinentMapResult = generateContinentMap({
    width: W,
    height: H,
    seed: cfg.seed,
    oceanWaterPercentage: cfg.oceanWaterPercentage,
    beachWidth: cfg.beachWidth,
    lakeCount: cfg.lakeCount,
    mountainPercentage: cfg.mountainPercentage,
    mountainPalette: cfg.mountainPalette,
    withStairs: true
  });

  // 2. Place POIs
  const pois: readonly POINode[] = placeRegionalPOIs(continent, { targetCount: cfg.poiTargetCount });

  // 3. Generate Route Network
  const routeResult = generateRouteNetwork(continent, pois, { allowBridges: true });

  // 4. Generate Wilderness Layer
  const wilderness = generateWildernessLayer(continent, pois, routeResult.pathGrid);

  // 5. Check Invariants & Anomalies
  // Check for building collisions
  for (const poi of pois) {
    if (poi.urbanLayout) {
      const bList = poi.urbanLayout.buildings;
      for (let i = 0; i < bList.length; i++) {
        for (let j = i + 1; j < bList.length; j++) {
          const a = bList[i]!;
          const b = bList[j]!;
          if (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y) {
            anomalies.push(`Building collision in ${poi.name}: ${a.id} overlaps ${b.id}`);
          }
        }
      }

      // Check buildings for water overlap and height split
      for (const b of bList) {
        let hasWater = false;
        let minElev = 999;
        let maxElev = -999;
        for (let dy = 0; dy < b.height; dy++) {
          for (let dx = 0; dx < b.width; dx++) {
            const bx = b.x + dx;
            const by = b.y + dy;
            const terr = continent.terrainMatrix[by]?.[bx];
            const elev = continent.heightmap[by]?.[bx] ?? 0;
            if (terr === 'water' || terr === 'water_deep') hasWater = true;
            if (elev < minElev) minElev = elev;
            if (elev > maxElev) maxElev = elev;
          }
        }
        if (hasWater) {
          anomalies.push(`Building on water in ${poi.name}: ${b.id} at (${b.x}, ${b.y})`);
        }
        if (maxElev !== minElev && minElev !== 999) {
          anomalies.push(`Building across uneven elevation in ${poi.name}: ${b.id} at (${b.x}, ${b.y}) spans heights [${minElev}, ${maxElev}]`);
        }
      }
    }
  }

  // Check POI road connectivity (must have a path/bridge cell adjacent to footprint, or maritime bridge connection)
  for (const poi of pois) {
    let hasAdjacentPath = false;
    for (let dy = -1; dy <= poi.footprint.height; dy++) {
      for (let dx = -1; dx <= poi.footprint.width; dx++) {
        const cx = poi.gridX + dx;
        const cy = poi.gridY + dy;
        if (
          cx >= 0 && cx < W && cy >= 0 && cy < H &&
          (routeResult.pathGrid[cy]?.[cx] || routeResult.bridgeGrid[cy]?.[cx])
        ) {
          hasAdjacentPath = true;
          break;
        }
      }
      if (hasAdjacentPath) break;
    }

    // Coastal/water landmarks and docks on islets connect to the network via regional bridge crossing edges
    if (!hasAdjacentPath && (poi.type === 'water_landmark' || poi.type === 'port_dock')) {
      const hasConnectingRoute = routeResult.edges.some(
        (e) => e.fromNodeId === poi.id || e.toNodeId === poi.id
      );
      if (hasConnectingRoute) {
        hasAdjacentPath = true;
      }
    }

    if (!hasAdjacentPath) {
      anomalies.push(`Orphan POI without path connection: [${poi.type}] ${poi.name} at (${poi.gridX}, ${poi.gridY})`);
    }
  }

  // Check wilderness elements on water
  for (const tree of wilderness.trees) {
    const terr = continent.terrainMatrix[tree.y]?.[tree.x];
    if (terr === 'water' || terr === 'water_deep') {
      anomalies.push(`Tree placed on water at (${tree.x}, ${tree.y})`);
    }
  }

  for (const prop of wilderness.props) {
    const terr = continent.terrainMatrix[prop.y]?.[prop.x];
    if (terr === 'water' || terr === 'water_deep') {
      anomalies.push(`Roadside prop placed on water at (${prop.x}, ${prop.y})`);
    }
  }

  // Check bridge placement over dry land
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (routeResult.bridgeGrid[y]?.[x]) {
        const terr = continent.terrainMatrix[y]?.[x];
        if (terr !== 'water' && terr !== 'water_deep' && terr !== 'sand') {
          anomalies.push(`Bridge segment on dry land at (${x}, ${y}) - terrain: ${terr}`);
        }
      }
    }
  }

  // Check bridge terminal connectivity (bridges must land on solid ground)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!routeResult.bridgeGrid[y]?.[x]) continue;
      const bNeighbors = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 }
      ].filter((n) => routeResult.bridgeGrid[y + n.dy]?.[x + n.dx]);

      if (bNeighbors.length <= 1) {
        // Distinguish deliberate single-sided fishing balconies attached to a 2-cell bridge corridor
        const isBalcony =
          bNeighbors.length === 1 &&
          (() => {
            const nb = bNeighbors[0]!;
            const nX = x + nb.dx;
            const nY = y + nb.dy;
            const nbBridgeCount = [
              { dx: 0, dy: -1 },
              { dx: 0, dy: 1 },
              { dx: -1, dy: 0 },
              { dx: 1, dy: 0 }
            ].filter((n) => routeResult.bridgeGrid[nY + n.dy]?.[nX + n.dx]).length;
            return nbBridgeCount >= 3;
          })();

        if (isBalcony) continue;

        const hasLandTouch = [
          { dx: 0, dy: -1 },
          { dx: 0, dy: 1 },
          { dx: -1, dy: 0 },
          { dx: 1, dy: 0 }
        ].some((n) => {
          const nx = x + n.dx;
          const ny = y + n.dy;
          const terr = continent.terrainMatrix[ny]?.[nx];
          return terr && terr !== 'water' && terr !== 'water_deep';
        });
        if (!hasLandTouch) {
          anomalies.push(`Floating bridge end without land touchdown at (${x}, ${y})`);
        }
      }
    }
  }

  // Check placed stairs
  for (const stair of continent.placedStairs) {
    const terr = continent.terrainMatrix[stair.y]?.[stair.x];
    if (terr === 'water' || terr === 'water_deep') {
      anomalies.push(`Stair placed on water at (${stair.x}, ${stair.y})`);
    }
    for (const poi of pois) {
      if (poi.urbanLayout) {
        for (const b of poi.urbanLayout.buildings) {
          if (stair.x >= b.x && stair.x < b.x + b.width && stair.y >= b.y && stair.y < b.y + b.height) {
            anomalies.push(`Stair overlaps building ${b.id} at (${stair.x}, ${stair.y})`);
          }
        }
      }
    }
  }

  // Check props overlapping buildings or stairs
  for (const prop of wilderness.props) {
    for (const poi of pois) {
      if (poi.urbanLayout) {
        for (const b of poi.urbanLayout.buildings) {
          if (prop.x >= b.x && prop.x < b.x + b.width && prop.y >= b.y && prop.y < b.y + b.height) {
            anomalies.push(`Prop ${prop.prefabFile} overlaps building ${b.id} at (${prop.x}, ${prop.y})`);
          }
        }
      }
    }
    for (const stair of continent.placedStairs) {
      if (prop.x === stair.x && prop.y === stair.y) {
        anomalies.push(`Prop ${prop.prefabFile} overlaps stair at (${prop.x}, ${prop.y})`);
      }
    }
  }

  // 6. Build Blit Instructions
  const blitPlan = buildMapBlitInstructions(
    continent,
    pois,
    routeResult.pathGrid,
    routeResult.bridgeGrid,
    wilderness
  );

  if (cfg.id === 'map_01_archipelago_64x64') {
    console.log('\n[Map 1 Unique Blit Filenames]:', Array.from(blitPlan.uniqueFilenames).sort());
    for (const inst of blitPlan.instructions) {
      if (inst.px >= 380 && inst.px <= 450 && inst.py >= 700 && inst.py <= 850) {
        console.log(`[Map 1 Blit at (${inst.px}, ${inst.py})]: ${inst.filename}`);
      }
    }
  }

  // Preload missing tiles
  const missingAssetSet = new Set<string>();
  for (const inst of blitPlan.instructions) {
    const fullPath = resolveAssetPath(inst.filename);
    if (!fullPath) {
      missingAssetSet.add(inst.filename);
      continue;
    }
    await loadRawImage(fullPath);
  }

  for (const missing of missingAssetSet) {
    anomalies.push(`Missing texture on disk: "${missing}"`);
  }

  // 7. Compose Canvas Buffer
  const canvasWidth = W * TILE_SIZE;
  const canvasHeight = H * TILE_SIZE;
  const canvasBuffer = Buffer.alloc(canvasWidth * canvasHeight * 4);

  // Deep ocean background
  for (let i = 0; i < canvasBuffer.length; i += 4) {
    canvasBuffer[i] = 16;
    canvasBuffer[i + 1] = 16;
    canvasBuffer[i + 2] = 20;
    canvasBuffer[i + 3] = 255;
  }

  for (const inst of blitPlan.instructions) {
    const fullPath = resolveAssetPath(inst.filename);
    const img = rawCache.get(fullPath ?? '');
    if (!img) continue;

    const { width: tw, height: th, data } = img;
    for (let r = 0; r < th; r++) {
      const dy = inst.py + r;
      if (dy < 0 || dy >= canvasHeight) continue;
      const dstRowOffset = dy * canvasWidth * 4;
      const srcRowOffset = r * tw * 4;

      for (let c = 0; c < tw; c++) {
        const dx = inst.px + c;
        if (dx < 0 || dx >= canvasWidth) continue;

        const srcIdx = srcRowOffset + c * 4;
        const alpha = data[srcIdx + 3]!;
        if (alpha === 0) continue;

        const dstIdx = dstRowOffset + dx * 4;
        if (alpha === 255) {
          canvasBuffer[dstIdx] = data[srcIdx]!;
          canvasBuffer[dstIdx + 1] = data[srcIdx + 1]!;
          canvasBuffer[dstIdx + 2] = data[srcIdx + 2]!;
          canvasBuffer[dstIdx + 3] = 255;
        } else {
          const a = alpha / 255;
          const invA = 1 - a;
          canvasBuffer[dstIdx] = (data[srcIdx]! * a + canvasBuffer[dstIdx]! * invA) | 0;
          canvasBuffer[dstIdx + 1] = (data[srcIdx + 1]! * a + canvasBuffer[dstIdx + 1]! * invA) | 0;
          canvasBuffer[dstIdx + 2] = (data[srcIdx + 2]! * a + canvasBuffer[dstIdx + 2]! * invA) | 0;
          canvasBuffer[dstIdx + 3] = 255;
        }
      }
    }
  }

  // 8. Build SVG annotations
  let svgMarkup = `<svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">\n`;
  svgMarkup += `  <style>\n`;
  svgMarkup += `    .map-title { font-family: sans-serif; font-size: 28px; font-weight: 800; fill: #ffffff; stroke: #000000; stroke-width: 4px; paint-order: stroke fill; }\n`;
  svgMarkup += `    .poi-box { fill: #111827; fill-opacity: 0.88; stroke: #374151; stroke-width: 2px; rx: 6px; }\n`;
  svgMarkup += `    .poi-text { font-family: sans-serif; font-size: 16px; font-weight: 700; fill: #ffffff; text-anchor: middle; }\n`;
  svgMarkup += `    .poi-sub { font-family: sans-serif; font-size: 11px; font-weight: 600; text-anchor: middle; }\n`;
  svgMarkup += `  </style>\n`;

  // Header badge
  svgMarkup += `  <rect x="16" y="16" width="650" height="48" rx="8" fill="#111827" fill-opacity="0.85" stroke="#3b82f6" stroke-width="2"/>\n`;
  svgMarkup += `  <text x="32" y="48" class="map-title">${cfg.title}</text>\n`;

  // POI labels
  for (const poi of pois) {
    const cx = (poi.gridX + Math.floor(poi.footprint.width / 2)) * TILE_SIZE;
    const cy = poi.gridY * TILE_SIZE - 12;
    const boxW = Math.max(140, poi.name.length * 11);
    const boxH = 34;
    const color = poi.type === 'metropolis' ? '#f59e0b' : poi.type === 'city' ? '#3b82f6' : poi.type === 'town' ? '#10b981' : '#a855f7';

    svgMarkup += `  <g transform="translate(${cx}, ${cy})">\n`;
    svgMarkup += `    <rect x="${-boxW / 2}" y="-22" width="${boxW}" height="${boxH}" class="poi-box" stroke="${color}"/>\n`;
    svgMarkup += `    <text x="0" y="-3" class="poi-text">${poi.name}</text>\n`;
    svgMarkup += `    <text x="0" y="9" class="poi-sub" fill="${color}">${poi.type.toUpperCase()}</text>\n`;
    svgMarkup += `  </g>\n`;
  }
  svgMarkup += `</svg>`;

  // 9. Composite & Save Images
  const finalFull = await sharp(canvasBuffer, {
    raw: { width: canvasWidth, height: canvasHeight, channels: 4 }
  })
    .composite([{ input: Buffer.from(svgMarkup), left: 0, top: 0 }])
    .png()
    .toBuffer();

  const outFullFile = path.join(SCRATCH_DIR, `${cfg.id}_full.png`);
  fs.writeFileSync(outFullFile, finalFull);

  // Resize to 2048x2048 (or 1536x1536 for small maps)
  const targetDimension = W <= 80 ? 1536 : 2048;
  const buffer2K = await sharp(finalFull)
    .resize(targetDimension, targetDimension, { kernel: sharp.kernel.lanczos3 })
    .toBuffer();

  const out2KFile = path.join(SCRATCH_DIR, `${cfg.id}.png`);
  fs.writeFileSync(out2KFile, buffer2K);

  // Copy to artifact directory
  const artifactFile = path.join(ARTIFACT_DIR, `${cfg.id}.png`);
  fs.writeFileSync(artifactFile, buffer2K);

  if (cfg.id === 'map_10_giant_continent_128x128') {
    fs.writeFileSync(path.join(SCRATCH_DIR, 'continente_completo_128x128.png'), buffer2K);
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'continente_completo_128x128.png'), buffer2K);
    fs.writeFileSync(path.join(SCRATCH_DIR, 'continente_completo_full.png'), finalFull);
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'continente_completo_full.png'), finalFull);
  }

  // 10. Compute Metrics
  let landCells = 0;
  let waterCells = 0;
  let mountainCells = 0;
  let pathCells = 0;
  let bridgeCells = 0;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const terr = continent.terrainMatrix[y]?.[x];
      const elev = continent.heightmap[y]?.[x] ?? 0;
      if (terr === 'grass' || terr === 'sand') landCells++;
      if (terr === 'water' || terr === 'water_deep') waterCells++;
      if (elev > 0) mountainCells++;
      if (routeResult.pathGrid[y]?.[x]) pathCells++;
      if (routeResult.bridgeGrid[y]?.[x]) bridgeCells++;
    }
  }

  return {
    config: cfg,
    landCells,
    waterCells,
    mountainCells,
    placedStairs: continent.placedStairs.length,
    placedPOIs: pois.length,
    routeCount: routeResult.edges.length,
    pathCells,
    bridgeCells,
    treesCount: wilderness.trees.length,
    grassPatchesCount: wilderness.tallGrassPatches.length,
    roadsidePropsCount: wilderness.props.length,
    totalBlitInstructions: blitPlan.instructions.length,
    anomalies
  };
}

export async function runMultiMapAudit(): Promise<void> {
  const startTime = Date.now();
  const mapArg = process.argv.find((a) => a.startsWith('map='));
  const targetMap = mapArg ? mapArg.split('=')[1] : null;
  const configsToRun = targetMap
    ? TEST_CONFIGURATIONS.filter((c, idx) => c.id.includes(targetMap) || targetMap === String(idx + 1))
    : TEST_CONFIGURATIONS;

  console.log('================================================================');
  console.log(`  PROCEDURAL GENERATION MULTI-MAP STRESS TEST & AUDIT (${configsToRun.length} MAPS)`);
  console.log('================================================================');

  if (!fs.existsSync(SCRATCH_DIR)) {
    fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  }

  const results: MapTelemetry[] = [];

  for (let i = 0; i < configsToRun.length; i++) {
    const cfg = configsToRun[i]!;
    const t0 = Date.now();
    process.stdout.write(`Generating Map ${i + 1}/${configsToRun.length}: ${cfg.id} (${cfg.size}x${cfg.size})... `);
    const tele = await generateAndRenderMap(cfg);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`Done (${elapsed}s) | POIs: ${tele.placedPOIs}, Routes: ${tele.routeCount}, Blits: ${tele.totalBlitInstructions}, Anomalies: ${tele.anomalies.length}`);
    results.push(tele);
  }

  // Save JSON summary
  const summaryFile = path.join(SCRATCH_DIR, 'audit_summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify(results, null, 2), 'utf8');

  // Also save in artifact dir
  const artifactSummaryFile = path.join(ARTIFACT_DIR, 'audit_summary.json');
  fs.writeFileSync(artifactSummaryFile, JSON.stringify(results, null, 2), 'utf8');

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('================================================================');
  console.log(`All ${TEST_CONFIGURATIONS.length} maps generated and exported to artifacts in ${totalTime}s!`);
  console.log(`Artifact directory: ${ARTIFACT_DIR}`);
  console.log('================================================================');
}

runMultiMapAudit().catch((err) => {
  console.error('[Multi-Map Audit Error]', err);
  process.exit(1);
});
