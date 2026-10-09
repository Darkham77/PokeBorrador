/**
 * scripts/map/generate_region_preview.ts
 *
 * FULL 128x128 REGIONAL CONTINENT, POIS & ROUTE NETWORK PREVIEW GENERATOR
 *
 * Renders:
 *   1. 128x128 procedural continental landmass (ocean, beach, plains, lakes, 2.5D mountains).
 *   2. 15 to 20+ Heterogeneous POIs (Metropolis, Gym Cities, Towns, Dungeon Forests,
 *      Cave Entrances on cliffs, Port Docks on coast, Gates, and Water Landmarks).
 *   3. 2-Cell Wide A* Dirt Route Network seamlessly traversing plains and mountain stairs.
 *   4. Canonical 8-neighbor dirt path autotiling.
 *   5. Semantic SVG overlay with settlement names, badges, and route vectors.
 *
 * Outputs:
 *   - scratch/verificacion_region_completa.png (4096x4096px)
 *   - scratch/verificacion_region_completa_2k.png (2048x2048px)
 *   - Copies to artifact directory for multimodal inspection.
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  generateContinentMap,
  computeTransitableGrid,
  type ContinentMapResult
} from '../../src/logic/map/continentGenerator.ts';
import { placeRegionalPOIs } from '../../src/logic/map/poiPlacementEngine.ts';
import { generateRouteNetwork } from '../../src/logic/map/routeNetworkEngine.ts';
import { generateWildernessLayer } from '../../src/logic/map/wildernessVegetationEngine.ts';
import { buildMapBlitInstructions } from '../../src/logic/map/canvasTileRenderer.ts';
import { CANONICAL_ASSETS_BY_ID } from '../../src/logic/map/canonicalAssetsRegistry.ts';
import type { POINode } from '../../src/types/map/poiTypes.ts';

const ROOT_DIR = process.cwd();
const TILE_SIZE = 32;
const sizeArg = process.argv.find((a) => a.startsWith('size='));
const MAP_SIZE = sizeArg ? parseInt(sizeArg.split('=')[1]!, 10) : 256;

const LPC_DIR = path.resolve(ROOT_DIR, 'public/assets/studio/kanto/lpc');
const PREFABS_DIR = path.resolve(ROOT_DIR, 'public/assets/studio/kanto/prefabs');
const SCRATCH_DIR = path.resolve(ROOT_DIR, 'scratch');
const ARTIFACT_DIR = path.resolve(process.cwd(), 'scratch/maps');

const OUT_FULL = path.join(SCRATCH_DIR, 'verificacion_region_viva.png');
const OUT_2K = path.join(SCRATCH_DIR, 'verificacion_region_viva_2k.png');
const OUT_LEGACY_FULL = path.join(SCRATCH_DIR, 'verificacion_region_completa.png');
const OUT_LEGACY_2K = path.join(SCRATCH_DIR, 'verificacion_region_completa_2k.png');

async function main(): Promise<void> {
  console.log(`Generating Full ${MAP_SIZE}x${MAP_SIZE} Regional Continent with Living Wilderness, 8 Gyms, and Pokémon League...`);

  // 1. Generate Regional Continent with Archipelago and Pokémon League Massif
  const continent: ContinentMapResult = generateContinentMap({
    width: MAP_SIZE,
    height: MAP_SIZE,
    seed: 42,
    oceanWaterPercentage: 0.38,
    beachWidth: 3,
    lakeCount: 3,
    mountainPercentage: 0.22,
    mountainPalette: 'brown',
    withStairs: true,
    withArchipelago: true,
    islandCount: 4
  });

  console.log(`Continent generated: ${continent.width}x${continent.height}`);
  console.log(`Placed mountain stairs: ${continent.placedStairs.length}`);

  // 2. Place Heterogeneous Regional POIs with Architectural Layouts
  const pois: readonly POINode[] = placeRegionalPOIs(continent, { targetCount: 18 });
  console.log(`Placed POIs: ${pois.length} settlements and landmarks`);
  for (const poi of pois) {
    const layoutInfo = poi.urbanLayout
      ? `buildings=${poi.urbanLayout.buildings.length}, props=${poi.urbanLayout.props.length}, gateways=${poi.gateways?.length ?? 0}`
      : 'no-urban-layout';
    console.log(`  - [${poi.type}] ${poi.name} at (${poi.gridX}, ${poi.gridY}) elev=${poi.elevation} [${layoutInfo}]`);
  }

  // 3. Generate 2-Cell Wide A* Route Network connecting Gateways & Internal Streets
  const routeResult = generateRouteNetwork(continent, pois, { allowBridges: true });
  console.log(`Generated Route Network: ${routeResult.edges.length} connected routes`);

  // 4. Compute Nature-First Transitable Grid (Routes & Settlements Carve)
  const transitableGrid = computeTransitableGrid(continent, routeResult.pathGrid, routeResult.bridgeGrid, pois);
  (continent as { transitableGrid?: readonly (readonly boolean[])[] }).transitableGrid = transitableGrid;

  // 5. Generate Wilderness Vegetation, Tall Grass Fields & Roadside Enframing
  const wilderness = generateWildernessLayer(continent, pois, routeResult.pathGrid, { transitableGrid });
  console.log(`Wilderness generated: ${wilderness.trees.length} trees, ${wilderness.tallGrassPatches.length} tall grass fields, ${wilderness.props.length} roadside props`);

  // 6. Build Layer Placements
  interface TilePlacement {
    readonly fullPath: string;
    readonly px: number;
    readonly py: number;
  }
  const placements: TilePlacement[] = [];

  const resolveAssetPath = (filename: string): string => {
    const baseId = filename.replace(/\.png$/, '');
    const canonAsset = CANONICAL_ASSETS_BY_ID[baseId];
    if (canonAsset) {
      const canonPath = path.resolve(ROOT_DIR, 'public/assets', canonAsset.runtimePath);
      if (fs.existsSync(canonPath)) return canonPath;
    }

    const candidates = [
      path.resolve(ROOT_DIR, 'public/assets/canon/infrastructure', filename),
      path.resolve(ROOT_DIR, 'public/assets/canon/buildings', filename),
      path.resolve(ROOT_DIR, 'public/assets/prefabs', filename),
      path.join(PREFABS_DIR, filename),
      path.join(LPC_DIR, filename),
      path.resolve(ROOT_DIR, 'public/assets/prefabs/vegetation', filename),
      path.resolve(ROOT_DIR, 'public/assets/prefabs/buildings', filename),
      path.resolve(ROOT_DIR, 'public/assets/prefabs/props', filename),
      path.resolve(ROOT_DIR, 'public/assets/studio/kanto/pokegba/clean', filename),
      path.resolve(ROOT_DIR, 'public/assets/prefabs/elevation', filename),
      path.resolve(ROOT_DIR, 'public/assets/tiles/elevation/brown', filename),
      path.resolve(ROOT_DIR, 'public/assets/tiles/elevation/gray', filename),
      path.resolve(ROOT_DIR, 'public/assets/tiles/elevation', filename),
      path.resolve(ROOT_DIR, 'public/assets/tiles/terrain', filename),
      path.resolve(ROOT_DIR, 'public/assets/tiles', filename)
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return candidates[0]!;
  };

  const addTile = (fullPath: string, px: number, py: number): void => {
    placements.push({ fullPath, px, py });
  };

  // 6. Compile Full 8-Layer Blit Plan via Canonical Canvas Tile Renderer
  const blitPlan = buildMapBlitInstructions(
    continent,
    pois,
    routeResult.pathGrid,
    routeResult.bridgeGrid,
    wilderness,
    { portDockBridgeKeys: routeResult.portDockBridgeKeys }
  );

  for (const inst of blitPlan.instructions) {
    addTile(resolveAssetPath(inst.filename), inst.px, inst.py);
  }

  // 6. Semantic SVG Badge & Label Overlay
  let svgMarkup = `<svg width="${MAP_SIZE * TILE_SIZE}" height="${MAP_SIZE * TILE_SIZE}" xmlns="http://www.w3.org/2000/svg">\n`;
  svgMarkup += `  <style>\n`;
  svgMarkup += `    .poi-label { font-family: 'Segoe UI', Arial, sans-serif; font-size: 22px; font-weight: bold; fill: #ffffff; text-anchor: middle; }\n`;
  svgMarkup += `    .poi-sub { font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; fill: #facc15; text-anchor: middle; text-transform: uppercase; font-weight: 600; }\n`;
  svgMarkup += `  </style>\n`;

  for (const poi of pois) {
    const cx = (poi.gridX + poi.footprint.width / 2) * TILE_SIZE;
    const cy = (poi.gridY + poi.footprint.height / 2) * TILE_SIZE;

    const color =
      poi.type === 'metropolis' ? '#f59e0b' :
      poi.type === 'city' ? '#ef4444' :
      poi.type === 'town' ? '#3b82f6' :
      poi.type === 'dungeon_forest' ? '#10b981' :
      poi.type === 'cave_entrance' ? '#8b5cf6' :
      poi.type === 'port_dock' ? '#06b6d4' : '#64748b';

    const r = poi.type === 'metropolis' ? 18 : poi.type === 'city' ? 14 : 10;

    // Glowing badge pin
    svgMarkup += `  <g id="poi_${poi.id}">\n`;
    svgMarkup += `    <circle cx="${cx}" cy="${cy}" r="${r + 4}" fill="${color}" fill-opacity="0.3" />\n`;
    svgMarkup += `    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" stroke="#ffffff" stroke-width="3" />\n`;
    svgMarkup += `    <rect x="${cx - 100}" y="${cy - r - 32}" width="200" height="26" rx="6" fill="#0f172a" fill-opacity="0.8" />\n`;
    svgMarkup += `    <text x="${cx}" y="${cy - r - 13}" class="poi-label">${poi.name}</text>\n`;
    svgMarkup += `    <text x="${cx}" y="${cy + r + 16}" class="poi-sub">${poi.type}</text>\n`;
    svgMarkup += `  </g>\n`;
  }

  // Draw route labels on middle waypoint of each route
  for (const edge of routeResult.edges) {
    if (edge.routeNumber && edge.waypoints.length > 0) {
      const midWp = edge.waypoints[Math.floor(edge.waypoints.length / 2)]!;
      const rx = midWp.x * TILE_SIZE + 16;
      const ry = midWp.y * TILE_SIZE + 16;
      svgMarkup += `  <g id="route_${edge.routeNumber}">\n`;
      svgMarkup += `    <rect x="${rx - 55}" y="${ry - 14}" width="110" height="26" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="2" fill-opacity="0.9" />\n`;
      svgMarkup += `    <text x="${rx}" y="${ry + 4}" font-family="'Segoe UI', Arial, sans-serif" font-size="14px" font-weight="bold" fill="#38bdf8" text-anchor="middle">Ruta ${edge.routeNumber}</text>\n`;
      svgMarkup += `  </g>\n`;
    }
  }

  svgMarkup += `</svg>`;

  // 7. High-Performance In-Memory Raw Buffer Blitting
  interface RawImage {
    readonly width: number;
    readonly height: number;
    readonly data: Buffer;
  }
  const rawCache = new Map<string, RawImage | null>();

  // Preload distinct tiles into memory
  const uniquePaths = Array.from(new Set(placements.map((p) => p.fullPath)));
  await Promise.all(
    uniquePaths.map(async (filePath) => {
      if (!fs.existsSync(filePath)) {
        rawCache.set(filePath, null);
        return;
      }
      try {
        const { data, info } = await sharp(filePath)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        rawCache.set(filePath, { width: info.width, height: info.height, data });
      } catch {
        rawCache.set(filePath, null);
      }
    })
  );

  console.log(`Preloaded ${uniquePaths.length} unique tiles/prefabs into RAM cache.`);

  const canvasWidth = MAP_SIZE * TILE_SIZE;
  const canvasHeight = MAP_SIZE * TILE_SIZE;
  const canvasBuffer = Buffer.alloc(canvasWidth * canvasHeight * 4);

  // Background: r: 16, g: 16, b: 20, a: 255
  for (let i = 0; i < canvasBuffer.length; i += 4) {
    canvasBuffer[i] = 16;
    canvasBuffer[i + 1] = 16;
    canvasBuffer[i + 2] = 20;
    canvasBuffer[i + 3] = 255;
  }

  const blitTile = (img: RawImage, destX: number, destY: number): void => {
    const { width: tw, height: th, data } = img;
    for (let r = 0; r < th; r++) {
      const dy = destY + r;
      if (dy < 0 || dy >= canvasHeight) continue;
      const dstRowOffset = dy * canvasWidth * 4;
      const srcRowOffset = r * tw * 4;

      for (let c = 0; c < tw; c++) {
        const dx = destX + c;
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
  };

  console.log(`Blitting ${placements.length} tile & vector layers onto ${canvasWidth}x${canvasHeight} canvas...`);
  const t0 = performance.now();
  for (const p of placements) {
    const img = rawCache.get(p.fullPath);
    if (img) {
      blitTile(img, p.px, p.py);
    }
  }
  const t1 = performance.now();
  console.log(`Blit completed in ${(t1 - t0).toFixed(1)}ms!`);

  console.log(`Encoding 4K PNG with Sharp and applying SVG badge overlay...`);
  const cleanBuffer = await sharp(canvasBuffer, {
    raw: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4
    },
    limitInputPixels: false
  })
    .png()
    .toBuffer();

  const fullBuffer = await sharp(canvasBuffer, {
    raw: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4
    },
    limitInputPixels: false
  })
    .composite([{ input: Buffer.from(svgMarkup), left: 0, top: 0 }])
    .png()
    .toBuffer();

  await sharp(fullBuffer, { limitInputPixels: false }).toFile(OUT_FULL);
  await sharp(fullBuffer, { limitInputPixels: false }).toFile(OUT_LEGACY_FULL);
  console.log(`Saved high-res region map: ${OUT_FULL}`);

  // Downscaled 2048x2048 preview for fast inspection
  const buffer2K = await sharp(fullBuffer, { limitInputPixels: false })
    .resize(2048, 2048, { kernel: sharp.kernel.lanczos3 })
    .toBuffer();
  await sharp(buffer2K, { limitInputPixels: false }).toFile(OUT_2K);
  await sharp(buffer2K, { limitInputPixels: false }).toFile(OUT_LEGACY_2K);
  console.log(`Saved 2K region preview: ${OUT_2K}`);

  const TARGET_DIRS = [ // no-domain: Estructura o identificador procedural de aventura
    path.resolve(process.cwd(), 'scratch/maps'),
    ARTIFACT_DIR,
    path.resolve(process.cwd(), 'scratch/maps'),
    path.resolve(process.cwd(), 'scratch/maps'),
    path.resolve(process.cwd(), 'scratch/maps'),
    path.resolve(process.cwd(), 'scratch/maps')
  ];
  for (const dir of TARGET_DIRS) {
    if (fs.existsSync(dir)) {
      fs.copyFileSync(OUT_FULL, path.join(dir, 'verificacion_region_viva.png'));
      fs.copyFileSync(OUT_2K, path.join(dir, 'verificacion_region_viva_2k.png'));
      fs.copyFileSync(OUT_FULL, path.join(dir, 'verificacion_region_completa.png'));
      fs.copyFileSync(OUT_2K, path.join(dir, 'verificacion_region_completa_2k.png'));
    }
  }
  console.log(`Copied outputs to artifact directories for inspection.`);

  // 8. Generate Detailed HD Zoom Crops for Multimodal Inspection
  console.log(`Generating HD landmark zoom crops...`);
  const generateCrop = async (name: string, cx: number, cy: number, cropW: number, cropH: number): Promise<void> => {
    const left = Math.max(0, Math.min(canvasWidth - cropW, Math.round(cx - cropW / 2)));
    const top = Math.max(0, Math.min(canvasHeight - cropH, Math.round(cy - cropH / 2)));
    const cropFile = path.join(SCRATCH_DIR, `${name}.png`);
    await sharp(cleanBuffer, { limitInputPixels: false })
      .extract({ left, top, width: cropW, height: cropH })
      .toFile(cropFile);
    console.log(`  - Saved zoom crop ${name}: (${left},${top} ${cropW}x${cropH})`);
    for (const dir of TARGET_DIRS) {
      if (fs.existsSync(dir)) {
        fs.copyFileSync(cropFile, path.join(dir, `${name}.png`));
      }
    }
  };

  // 1. Northern Mountain Pokémon League Palace (Meseta Añil)
  const leaguePOI = pois.find((p) => p.type === 'pokemon_league');
  if (leaguePOI) {
    const cx = (leaguePOI.gridX + leaguePOI.footprint.width / 2) * TILE_SIZE;
    const cy = (leaguePOI.gridY + leaguePOI.footprint.height / 2) * TILE_SIZE;
    await generateCrop('zoom_01_pokemon_league_meseta_anil', cx, cy, 768, 768);
  }

  // 2. Celadon Metropolis Multi-Block Capital
  const celadonPOI = pois.find((p) => p.id === 'celadon_capital' || p.type === 'metropolis');
  if (celadonPOI) {
    const cx = (celadonPOI.gridX + celadonPOI.footprint.width / 2) * TILE_SIZE;
    const cy = (celadonPOI.gridY + celadonPOI.footprint.height / 2) * TILE_SIZE;
    const cropW = Math.max(896, (celadonPOI.footprint.width + 4) * TILE_SIZE);
    const cropH = Math.max(896, (celadonPOI.footprint.height + 4) * TILE_SIZE);
    await generateCrop('zoom_02_celadon_metropolis_capital', cx, cy, cropW, cropH);
  }

  // 3. Archipelago Isla Canela (Cinnabar Island) & Ports
  const cinnabarPOI = pois.find((p) => p.id === 'cinnabar_island_city');
  if (cinnabarPOI) {
    const cx = (cinnabarPOI.gridX + cinnabarPOI.footprint.width / 2) * TILE_SIZE;
    const cy = (cinnabarPOI.gridY + cinnabarPOI.footprint.height / 2) * TILE_SIZE;
    const cropW = Math.max(768, (cinnabarPOI.footprint.width + 4) * TILE_SIZE);
    const cropH = Math.max(768, (cinnabarPOI.footprint.height + 4) * TILE_SIZE);
    await generateCrop('zoom_03_archipielago_isla_canela', cx, cy, cropW, cropH);
  }

  // 4. Viridian Forest Labyrinth Dungeon
  const forestPOI = pois.find((p) => p.id === 'viridian_forest' || p.type === 'dungeon_forest');
  if (forestPOI) {
    const cx = (forestPOI.gridX + forestPOI.footprint.width / 2) * TILE_SIZE;
    const cy = (forestPOI.gridY + forestPOI.footprint.height / 2) * TILE_SIZE;
    const cropW = Math.max(896, (forestPOI.footprint.width + 4) * TILE_SIZE);
    const cropH = Math.max(1152, (forestPOI.footprint.height + 4) * TILE_SIZE);
    await generateCrop('zoom_04_viridian_forest_dungeon', cx, cy, cropW, cropH);
  }

  // 5. Vermilion Port & Pier
  const portPOI = pois.find((p) => p.type === 'port_dock');
  if (portPOI) {
    const facing = portPOI.facing ?? 'south';
    const offsetX = facing === 'west' ? -3 : facing === 'east' ? 3 : 0;
    const offsetY = facing === 'north' ? -3 : facing === 'south' ? 3 : 0;
    const cx = (portPOI.gridX + portPOI.footprint.width / 2 + offsetX) * TILE_SIZE;
    const cy = (portPOI.gridY + portPOI.footprint.height / 2 + offsetY) * TILE_SIZE;
    const cropW = Math.max(1024, (portPOI.footprint.width + 12) * TILE_SIZE);
    const cropH = Math.max(1024, (portPOI.footprint.height + 12) * TILE_SIZE);
    await generateCrop('zoom_05_vermilion_port_ferry', cx, cy, cropW, cropH);
  }

  // 6. Route Gate Checkpoint (Aduana Paso Norte / Garita with hermetic fences and trees)
  const gatePOI = pois.find((p) => p.type === 'route_gate');
  if (gatePOI) {
    const cx = (gatePOI.gridX + gatePOI.footprint.width / 2) * TILE_SIZE;
    const cy = (gatePOI.gridY + gatePOI.footprint.height / 2) * TILE_SIZE;
    const cropW = Math.max(768, (gatePOI.footprint.width + 8) * TILE_SIZE);
    const cropH = Math.max(768, (gatePOI.footprint.height + 8) * TILE_SIZE);
    await generateCrop('zoom_06_route_gate_checkpoint', cx, cy, cropW, cropH);
  }

  // 7. Silva Labyrinth Dungeon Forest (Selva Silvestre with Tall Grass Clearings)
  const silvaPOI = pois.find((p) => p.id === 'silva_labyrinth') ?? pois.filter((p) => p.type === 'dungeon_forest')[1];
  if (silvaPOI) {
    const cx = (silvaPOI.gridX + silvaPOI.footprint.width / 2) * TILE_SIZE;
    const cy = (silvaPOI.gridY + silvaPOI.footprint.height / 2) * TILE_SIZE;
    const cropW = Math.max(896, (silvaPOI.footprint.width + 4) * TILE_SIZE);
    const cropH = Math.max(1152, (silvaPOI.footprint.height + 4) * TILE_SIZE);
    await generateCrop('zoom_07_silva_labyrinth_forest', cx, cy, cropW, cropH);
  }

  // 8. Mt. Moon Mountain Pass (Entrada Mt. Moon & Access Stairs)
  const mtMoonPOI = pois.find((p) => p.id === 'mt_moon_cave') ?? pois.find((p) => p.id.includes('moon'));
  if (mtMoonPOI) {
    const cx = (mtMoonPOI.gridX + mtMoonPOI.footprint.width / 2) * TILE_SIZE;
    const cy = (mtMoonPOI.gridY + mtMoonPOI.footprint.height / 2) * TILE_SIZE;
    await generateCrop('zoom_08_mountain_pass_routes', cx, cy, 896, 896);
  }

  console.log(`Regional preview generation completed successfully!`);
}

main().catch((err) => {
  console.error('Failed to generate regional preview:', err);
  process.exit(1);
});
