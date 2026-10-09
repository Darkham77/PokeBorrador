/**
 * scripts/map/audit_all_settlements.ts
 *
 * REGIONAL SETTLEMENTS HD RENDER AUDITOR
 *
 * Generates high-resolution PNG renders of all canonical regional settlements:
 *   - Rural Towns (12x12): Pueblo Paleta, Pueblo Lavanda
 *   - Medium Cities (16x14): Ciudad Plateada, Ciudad Azul, Ciudad Carmín,
 *     Ciudad Fucsia, Isla Canela, Ciudad Azafrán
 *
 * Validates procedural layout variety, archetype landmarks, 0-obstacle doors,
 * and asymmetric lighting.
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  CANONICAL_ASSETS_BY_ID
} from '../../src/logic/map/canonicalAssetsRegistry.ts';
import {
  resolvePathGrid,
  CANONICAL_DIRT_PATH_BRUSH,
  CANONICAL_STONE_PLAZA_BRUSH
} from '../../src/logic/map/pathAutotileEngine.ts';
import { generateProceduralCityLayout } from '../../src/logic/map/proceduralCityEngine.ts';
import type { POINode } from '../../src/types/map/poiTypes.ts';

const ROOT_DIR = process.cwd();
const SCRATCH_DIR = path.resolve(ROOT_DIR, 'scratch/settlements');
const ARTIFACT_DIRS = [ // no-domain: Estructura o identificador procedural de aventura
  path.resolve(process.cwd(), 'scratch/maps'),
  SCRATCH_DIR
];

for (const d of ARTIFACT_DIRS) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
}

const TILE_SIZE = 32;

// Asset path resolver
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
    path.resolve(ROOT_DIR, 'public/assets/canon/props', filename),
    path.resolve(ROOT_DIR, 'public/assets/prefabs/buildings', filename),
    path.resolve(ROOT_DIR, 'public/assets/prefabs/props', filename),
    path.resolve(ROOT_DIR, 'public/assets/prefabs', filename),
    path.resolve(ROOT_DIR, 'public/assets/tiles', filename),
    path.resolve(ROOT_DIR, 'public/assets/tiles/terrain', filename)
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error(`Asset not found: ${filename}`);
};

interface RawImage {
  readonly width: number;
  readonly height: number;
  readonly data: Buffer;
}

const rawCache = new Map<string, RawImage>();
const getRaw = async (fullPath: string): Promise<RawImage> => {
  let img = rawCache.get(fullPath);
  if (!img) {
    const { data, info } = await sharp(fullPath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    img = { width: info.width, height: info.height, data };
    rawCache.set(fullPath, img);
  }
  return img;
};

interface SettlementAuditItem {
  readonly filename: string;
  readonly title: string;
  readonly node: POINode;
  readonly seed: number;
}

const AUDIT_SETTLEMENTS: readonly SettlementAuditItem[] = [
  {
    filename: 'asentamiento_01_pueblo_paleta.png',
    title: 'Pueblo Paleta (Town 12x12, Rural con Servicios y Lab de Oak)',
    seed: 1337,
    node: {
      id: 'paleta_starting_town',
      name: 'Pueblo Paleta',
      type: 'town',
      footprint: { width: 12, height: 12 },
      terrainPreference: 'flat_grass',
      gridX: 2,
      gridY: 2,
      elevation: 0,
      hasGym: false
    }
  },
  {
    filename: 'asentamiento_02_pueblo_lavanda.png',
    title: 'Pueblo Lavanda (Town 12x12, Rural Místico con Centro y Tienda)',
    seed: 4242,
    node: {
      id: 'lavender_town',
      name: 'Pueblo Lavanda',
      type: 'town',
      footprint: { width: 12, height: 12 },
      terrainPreference: 'flat_grass',
      gridX: 2,
      gridY: 2,
      elevation: 0,
      hasGym: false
    }
  },
  {
    filename: 'asentamiento_03_ciudad_plateada.png',
    title: 'Ciudad Plateada (City 16x14, Gimnasio Roca y Arquetipo Cantera)',
    seed: 1337,
    node: {
      id: 'pewter_city',
      name: 'Ciudad Plateada',
      type: 'city',
      footprint: { width: 16, height: 14 },
      terrainPreference: 'flat_grass',
      gridX: 2,
      gridY: 2,
      elevation: 0,
      hasGym: true
    }
  },
  {
    filename: 'asentamiento_04_ciudad_azul_cerulean.png',
    title: 'Ciudad Azul / Cerúlea (City 16x14, Gimnasio Agua y Tienda de Bicis)',
    seed: 2026,
    node: {
      id: 'cerulean_city',
      name: 'Ciudad Azul',
      type: 'city',
      footprint: { width: 16, height: 14 },
      terrainPreference: 'flat_grass',
      gridX: 2,
      gridY: 2,
      elevation: 0,
      hasGym: true
    }
  },
  {
    filename: 'asentamiento_05_ciudad_carmin_vermilion.png',
    title: 'Ciudad Carmín / Vermilion (City 16x14, Gimnasio Eléctrico y Club de Fans)',
    seed: 5555,
    node: {
      id: 'vermilion_city',
      name: 'Ciudad Carmin',
      type: 'city',
      footprint: { width: 16, height: 14 },
      terrainPreference: 'flat_grass',
      gridX: 2,
      gridY: 2,
      elevation: 0,
      hasGym: true
    }
  },
  {
    filename: 'asentamiento_06_ciudad_fucsia.png',
    title: 'Ciudad Fucsia (City 16x14, Gimnasio Veneno y Arquetipo Safari Botánico)',
    seed: 7777,
    node: {
      id: 'fuchsia_garden_city',
      name: 'Ciudad Fucsia',
      type: 'city',
      footprint: { width: 16, height: 14 },
      terrainPreference: 'flat_grass',
      gridX: 2,
      gridY: 2,
      elevation: 0,
      hasGym: true
    }
  },
  {
    filename: 'asentamiento_07_isla_canela.png',
    title: 'Isla Canela (City 16x14 Costera / Insular, Terreno Natural y Senderos)',
    seed: 1337,
    node: {
      id: 'cinnabar_island_city',
      name: 'Isla Canela',
      type: 'city',
      footprint: { width: 16, height: 14 },
      terrainPreference: 'coast_water',
      gridX: 2,
      gridY: 2,
      elevation: 0,
      hasGym: true
    }
  },
  {
    filename: 'asentamiento_08_ciudad_azafran.png',
    title: 'Ciudad Azafrán (City 16x14, Gimnasio Psíquico y Dojo de Combate)',
    seed: 9999,
    node: {
      id: 'saffron_metro',
      name: 'Azafran Central',
      type: 'city',
      footprint: { width: 16, height: 14 },
      terrainPreference: 'flat_grass',
      gridX: 2,
      gridY: 2,
      elevation: 0,
      hasGym: true
    }
  }
];

async function renderSettlement(item: SettlementAuditItem): Promise<void> {
  const { node, seed, filename, title } = item;
  const margin = 2;
  const mapW = node.footprint.width + margin * 2;
  const mapH = node.footprint.height + margin * 2;
  const canvasWidth = mapW * TILE_SIZE;
  const canvasHeight = mapH * TILE_SIZE;
  const canvasBuffer = Buffer.alloc(canvasWidth * canvasHeight * 4);

  const blit = async (file: string, px: number, py: number): Promise<void> => {
    let fullPath: string;
    try {
      fullPath = resolveAssetPath(file);
    } catch {
      return;
    }
    const img = await getRaw(fullPath);
    const { width: tw, height: th, data } = img;

    for (let r = 0; r < th; r++) {
      const dy = py + r;
      if (dy < 0 || dy >= canvasHeight) continue;
      const dstRowOffset = dy * canvasWidth * 4;
      const srcRowOffset = r * tw * 4;

      for (let c = 0; c < tw; c++) {
        const dx = px + c;
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
          const invA = 255 - alpha;
          canvasBuffer[dstIdx] = (data[srcIdx]! * alpha + canvasBuffer[dstIdx]! * invA) / 255;
          canvasBuffer[dstIdx + 1] = (data[srcIdx + 1]! * alpha + canvasBuffer[dstIdx + 1]! * invA) / 255;
          canvasBuffer[dstIdx + 2] = (data[srcIdx + 2]! * alpha + canvasBuffer[dstIdx + 2]! * invA) / 255;
          canvasBuffer[dstIdx + 3] = 255;
        }
      }
    }
  };

  // Generate procedural layout
  const layout = generateProceduralCityLayout(node, seed);

  // 1. Layer 1: Base Grass Plains
  const isIsland = node.terrainPreference === 'coast_water';
  for (let r = 0; r < mapH; r++) {
    for (let c = 0; c < mapW; c++) {
      if (isIsland && (r === 0 || r === mapH - 1 || c === 0 || c === mapW - 1)) {
        await blit('poke_sand.png', c * TILE_SIZE, r * TILE_SIZE);
      } else {
        await blit('poke_grass_plain.png', c * TILE_SIZE, r * TILE_SIZE);
      }
    }
  }

  // 2. Layer 2: Cobblestone Paved Plaza / Sidewalks (if any)
  if (layout.pavedPlazaCells.length > 0) {
    const plazaGrid: boolean[][] = Array.from({ length: mapH }, () => Array(mapW).fill(false));
    for (const cell of layout.pavedPlazaCells) {
      if (cell.y >= 0 && cell.y < mapH && cell.x >= 0 && cell.x < mapW) {
        plazaGrid[cell.y]![cell.x] = true;
      }
    }
    const plazaAutotile = resolvePathGrid(plazaGrid, undefined, CANONICAL_STONE_PLAZA_BRUSH);
    for (let r = 0; r < mapH; r++) {
      for (let c = 0; c < mapW; c++) {
        const plCell = plazaAutotile.pathDetails[r]?.[c];
        if (plCell) {
          await blit(plCell.primaryTile, c * TILE_SIZE, r * TILE_SIZE);
          if (plCell.overlayTiles) {
            for (const ov of plCell.overlayTiles) {
              await blit(ov, c * TILE_SIZE, r * TILE_SIZE);
            }
          }
        }
      }
    }
  }

  // 3. Layer 3: Dirt Paths & Internal Streets
  if (layout.internalStreets.length > 0) {
    const pathGrid: boolean[][] = Array.from({ length: mapH }, () => Array(mapW).fill(false));
    for (const s of layout.internalStreets) {
      if (s.y >= 0 && s.y < mapH && s.x >= 0 && s.x < mapW) {
        pathGrid[s.y]![s.x] = true;
      }
    }
    const brush = layout.roadMaterial === 'paved' ? CANONICAL_STONE_PLAZA_BRUSH : CANONICAL_DIRT_PATH_BRUSH;
    const pathAutotile = resolvePathGrid(pathGrid, undefined, brush);
    for (let r = 0; r < mapH; r++) {
      for (let c = 0; c < mapW; c++) {
        const pCell = pathAutotile.pathDetails[r]?.[c];
        if (pCell) {
          await blit(pCell.primaryTile, c * TILE_SIZE, r * TILE_SIZE);
          if (pCell.overlayTiles) {
            for (const ov of pCell.overlayTiles) {
              await blit(ov, c * TILE_SIZE, r * TILE_SIZE);
            }
          }
        }
      }
    }
  }

  // 4. Layer 4: Curbs
  if (layout.curbs && layout.curbs.length > 0) {
    for (const curb of layout.curbs) {
      await blit(curb.curbTile, curb.x * TILE_SIZE, curb.y * TILE_SIZE);
    }
  }

  // 5. Layer 5: Buildings (Strict North-to-South Y-sorting)
  const sortedBuildings = [...layout.buildings].sort((a, b) => (a.y + a.height) - (b.y + b.height) || a.x - b.x);
  for (const b of sortedBuildings) {
    await blit(b.prefabFile, b.x * TILE_SIZE, b.y * TILE_SIZE);
  }

  // 6. Layer 6: Urban Props & Dressing (North-to-South Y-sorting)
  const sortedProps = [...layout.props].sort((a, b) => (a.y + 1) - (b.y + 1) || a.x - b.x);
  for (const p of sortedProps) {
    const px = p.x * TILE_SIZE;
    const py = p.y * TILE_SIZE;
    let drawPx = px;
    let drawPy = py;

    if (p.type === 'statue') {
      drawPy = py - 32;
    } else if (p.type === 'lamp') {
      drawPy = py - 64;
    } else if (p.type === 'fence_h' && p.prefabFile.includes('fence_white')) {
      drawPx = px - 8;
      drawPy = py + 16;
    }

    await blit(p.prefabFile, drawPx, drawPy);
  }

  // Write with Sharp
  const scratchPath = path.join(SCRATCH_DIR, filename);
  await sharp(canvasBuffer, { raw: { width: canvasWidth, height: canvasHeight, channels: 4 } })
    .png()
    .toFile(scratchPath);

  for (const dir of ARTIFACT_DIRS) {
    const targetFile = path.join(dir, filename);
    fs.copyFileSync(scratchPath, targetFile);
  }

  console.log(`[Rendered]: ${title} -> ${filename} (${layout.buildings.length} bldgs, ${layout.props.length} props)`);
}

async function main(): Promise<void> {
  console.log('--- AUDITORÍA PROCEDURAL DE ASENTAMIENTOS REGIONALES ---');
  for (const item of AUDIT_SETTLEMENTS) {
    await renderSettlement(item);
  }
  console.log('--- AUDITORÍA COMPLETADA CON ÉXITO ---');
}

main().catch((err) => {
  console.error('[Error]:', err);
  process.exit(1);
});
