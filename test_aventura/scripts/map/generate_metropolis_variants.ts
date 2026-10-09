/**
 * scripts/map/generate_metropolis_variants.ts
 *
 * GENERADOR DE VARIANTES VISUALES DE METRÓPOLIS (CIUDAD CELESTE)
 *
 * Genera 3 opciones contrastadas de densidad y ambientación urbana:
 *   1. Opción 1: Jardines y Setos Verdes (estilo floral aristocrático con parterres y vallas)
 *   2. Opción 2: Distritos Urbanos de Forja y Farolas (alta infraestructura moderna y mobiliario)
 *   3. Opción 3: Híbrido con Patios Privados (manzanas delimitadas con jardines residenciales)
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  CANONICAL_ASSETS_BY_ID,
  getBuildingPrefabMeta,
  getAssetFilename
} from '../../src/logic/map/canonicalAssetsRegistry.ts';
import {
  resolvePathGrid,
  CANONICAL_STONE_PLAZA_BRUSH
} from '../../src/logic/map/pathAutotileEngine.ts';
import { generateSettlementLayout } from '../../src/logic/map/cityLayoutEngine.ts';
import type { POINode } from '../../src/types/map/poiTypes.ts';

const ROOT_DIR = process.cwd();
const SCRATCH_DIR = path.resolve(ROOT_DIR, 'scratch');
const ARTIFACT_DIRS = [ // no-domain: Estructura o identificador procedural de aventura
  path.resolve(process.cwd(), 'scratch/maps'),
  path.resolve(SCRATCH_DIR, 'metropolis_variants')
];

for (const d of ARTIFACT_DIRS) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
}

const TILE_SIZE = 32;
const MAP_W = 34; // 30 city + 2 margin each side
const MAP_H = 28; // 24 city + 2 margin each side
const bx = 2;
const by = 2;
const W = 30;
const H = 24;

interface BuildingPlacement {
  readonly id: string;
  readonly type: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly prefabFile: string;
}

interface PropPlacement {
  readonly type: string;
  readonly x: number;
  readonly y: number;
  readonly prefabFile: string;
}

interface VariantDefinition {
  readonly id: string;
  readonly title: string;
  readonly filename: string;
  readonly buildings?: readonly BuildingPlacement[];
  readonly props: readonly PropPlacement[];
}

// 1. Core Buildings (identical across all 3 variants for fair aesthetic comparison)
const BASE_BUILDINGS: readonly BuildingPlacement[] = [
  // District 1 (NW): Celadon Department Store (9x10)
  { id: 'dept_store', type: 'dept_store', x: bx + 1, y: by + 1, width: 9, height: 10, prefabFile: getBuildingPrefabMeta('poke_dept_store').prefabFile },
  // District 1 (Center-North): Silph Corporate Tower (9x7 canonical)
  { id: 'corp_tower', type: 'corp_tower', x: bx + 11, y: by + 1, width: 9, height: 7, prefabFile: getBuildingPrefabMeta('poke_corp_tower').prefabFile },
  // District 1 (NE): Gold Gym (6x5) & Game Corner (7x5)
  { id: 'gym', type: 'gym', x: bx + 21, y: by + 1, width: 6, height: 5, prefabFile: getBuildingPrefabMeta('gym_gold').prefabFile },
  { id: 'game_corner', type: 'game_corner', x: bx + 21, y: by + 7, width: 7, height: 5, prefabFile: getBuildingPrefabMeta('poke_game_corner').prefabFile },
  // District 3 (SW): Commercial Services & 3 Residences
  { id: 'pokemart', type: 'pokemart', x: bx + 1, y: by + 14, width: 4, height: 4, prefabFile: getBuildingPrefabMeta('pokemart').prefabFile },
  { id: 'house_a', type: 'house', x: bx + 6, y: by + 14, width: 4, height: 4, prefabFile: getBuildingPrefabMeta('house_pallet_red').prefabFile },
  { id: 'house_c', type: 'house', x: bx + 1, y: by + 19, width: 4, height: 4, prefabFile: getBuildingPrefabMeta('house_pallet_blue').prefabFile },
  { id: 'house_b', type: 'house', x: bx + 6, y: by + 19, width: 4, height: 4, prefabFile: getBuildingPrefabMeta('house_cerulean_orange').prefabFile },
  // District 4 (SE): Condo Block (7x8) & PokéCenter (5x5)
  { id: 'condo', type: 'condo', x: bx + 13, y: by + 15, width: 7, height: 8, prefabFile: getBuildingPrefabMeta('poke_condo_block').prefabFile },
  { id: 'pokecenter', type: 'pokecenter', x: bx + 22, y: by + 15, width: 5, height: 5, prefabFile: getBuildingPrefabMeta('pokecenter').prefabFile }
];

const fX = bx + 14; // centered under Silph entrance at bx + 15
const fY = by + 9;

// Common civic center props (asymmetrical civic lighting & centered fountain)
const COMMON_CIVIC_PROPS: readonly PropPlacement[] = [
  { type: 'fountain', x: fX, y: fY, prefabFile: getAssetFilename('poke_fountain') },
  { type: 'bench', x: fX + 4, y: fY + 1, prefabFile: getAssetFilename('poke_bench') },
  { type: 'lamp', x: fX + 4, y: fY - 1, prefabFile: getAssetFilename('poke_street_lamp_left') }
];

// ----------------------------------------------------------------------------
// VARIANTE 1: Jardines y Setos Verdes
// ----------------------------------------------------------------------------
const VARIANT_1_PROPS: readonly PropPlacement[] = [
  ...COMMON_CIVIC_PROPS,
  // Plaza Central Ajardinada: Setos redondos y canteros circulares
  { type: 'flower', x: fX - 1, y: fY + 1, prefabFile: getAssetFilename('poke_bush_round') },
  { type: 'flower', x: fX + 3, y: fY + 1, prefabFile: getAssetFilename('poke_bush_round') },
  { type: 'flower', x: fX - 1, y: fY, prefabFile: getAssetFilename('poke_flower_pot_circular') },
  { type: 'flower', x: fX + 3, y: fY, prefabFile: getAssetFilename('poke_flower_pot_circular') },
  // Paseo Este Cívico: Parterre enmarcado con vallas blancas y banco de descanso
  { type: 'fence_h', x: fX + 4, y: fY, prefabFile: getAssetFilename('poke_fence_white_h_mid') },
  { type: 'flower', x: fX + 4, y: fY + 1, prefabFile: getAssetFilename('poke_flowers_red') },
  { type: 'bench', x: fX + 4, y: fY + 2, prefabFile: getAssetFilename('poke_bench') },
  // Distrito Residencial SW: Patios con vallas blancas decorativas y flores
  { type: 'fence_h', x: bx + 5, y: by + 16, prefabFile: getAssetFilename('poke_fence_white_h_mid') },
  { type: 'flower', x: bx + 5, y: by + 15, prefabFile: getAssetFilename('poke_flowers_red') },
  { type: 'fence_h', x: bx + 6, y: by + 18, prefabFile: getAssetFilename('poke_fence_white_h_mid') },
  { type: 'fence_h', x: bx + 9, y: by + 18, prefabFile: getAssetFilename('poke_fence_white_h_mid') },
  { type: 'flower', x: bx + 10, y: by + 18, prefabFile: getAssetFilename('poke_flower_pot_circular') },
  { type: 'flower', x: bx + 10, y: by + 14, prefabFile: getAssetFilename('poke_bush_round') },
  { type: 'flower', x: bx + 1, y: by + 23, prefabFile: getAssetFilename('poke_bush_round') },
  { type: 'flower', x: bx + 4, y: by + 23, prefabFile: getAssetFilename('poke_bush_round') },
  // Distrito Comercial y Batalla (Este): Maceteros dobles y cartel oficial
  { type: 'flower', x: bx + 22, y: by + 6, prefabFile: getAssetFilename('poke_flower_pot_circular') },
  { type: 'flower', x: bx + 25, y: by + 6, prefabFile: getAssetFilename('poke_flower_pot_circular') },
  { type: 'signpost', x: bx + 20, y: by + 6, prefabFile: getAssetFilename('poke_gym_sign') },
  { type: 'flower', x: bx + 20, y: by + 3, prefabFile: getAssetFilename('poke_bush_round') },
  // Distrito Servicios SE: Cantero entre Condo y Centro Pokémon
  { type: 'fence_h', x: bx + 21, y: by + 16, prefabFile: getAssetFilename('poke_fence_white_h_mid') },
  { type: 'flower', x: bx + 21, y: by + 17, prefabFile: getAssetFilename('poke_flowers_red') },
  { type: 'flower', x: bx + 21, y: by + 18, prefabFile: getAssetFilename('poke_flowers_red') },
  { type: 'bench', x: bx + 22, y: by + 14, prefabFile: getAssetFilename('poke_bench') }
];

// ----------------------------------------------------------------------------
// VARIANTE 2: Distritos Urbanos de Forja y Farolas
// ----------------------------------------------------------------------------
const VARIANT_2_PROPS: readonly PropPlacement[] = [
  ...COMMON_CIVIC_PROPS,
  // Plaza Central: Explanada cívica con maceteros y banco
  { type: 'flower', x: fX - 1, y: fY + 1, prefabFile: getAssetFilename('poke_flower_pot_circular') },
  { type: 'flower', x: fX + 3, y: fY + 1, prefabFile: getAssetFilename('poke_flower_pot_circular') },
  { type: 'bench', x: fX + 4, y: fY + 1, prefabFile: getAssetFilename('poke_bench') },
  // Rítmica de Farolas Urbanas en los cuatro cuadrantes
  { type: 'lamp', x: bx + 9, y: by + 8, prefabFile: getAssetFilename('poke_street_lamp') },
  { type: 'lamp', x: bx + 20, y: by + 8, prefabFile: getAssetFilename('poke_street_lamp_left') },
  { type: 'lamp', x: bx + 9, y: by + 13, prefabFile: getAssetFilename('poke_street_lamp') },
  { type: 'lamp', x: bx + 12, y: by + 13, prefabFile: getAssetFilename('poke_street_lamp_left') },
  { type: 'lamp', x: bx + 21, y: by + 14, prefabFile: getAssetFilename('poke_street_lamp') },
  // Barandillas de forja delimitando la acera frente al Dept Store y Paseo Sur
  { type: 'fence_h', x: bx + 1, y: by + 11, prefabFile: getAssetFilename('poke_fence_white_h_mid') },
  { type: 'fence_h', x: bx + 4, y: by + 11, prefabFile: getAssetFilename('poke_fence_white_h_mid') },
  { type: 'fence_h', x: bx + 7, y: by + 11, prefabFile: getAssetFilename('poke_fence_white_h_mid') },
  { type: 'fence_h', x: bx + 13, y: by + 23, prefabFile: getAssetFilename('poke_fence_white_h_mid') },
  { type: 'fence_h', x: bx + 16, y: by + 23, prefabFile: getAssetFilename('poke_fence_white_h_mid') },
  { type: 'fence_h', x: bx + 19, y: by + 23, prefabFile: getAssetFilename('poke_fence_white_h_mid') },
  // Mobiliario Cívico e Información
  { type: 'mailbox', x: bx + 5, y: by + 14, prefabFile: getAssetFilename('poke_mailbox') },
  { type: 'mailbox', x: bx + 21, y: by + 15, prefabFile: getAssetFilename('poke_mailbox') },
  { type: 'signpost', x: bx + 10, y: by + 13, prefabFile: getAssetFilename('poke_trainer_tips_sign') },
  { type: 'signpost', x: bx + 20, y: by + 6, prefabFile: getAssetFilename('poke_gym_sign') },
  { type: 'bench', x: bx + 14, y: by + 14, prefabFile: getAssetFilename('poke_bench') },
  { type: 'flower', x: bx + 18, y: by + 14, prefabFile: getAssetFilename('poke_flower_pot_circular') }
];

// ----------------------------------------------------------------------------
// VARIANTE 3: Enfoque Híbrido con Patios Privados y Manzanas Delimitadas
// ----------------------------------------------------------------------------
const VARIANT_3_PROPS: readonly PropPlacement[] = [
  ...COMMON_CIVIC_PROPS,
  // Plaza Central: Centro cívico equilibrado con setos y banco
  { type: 'flower', x: fX - 1, y: fY + 1, prefabFile: getAssetFilename('poke_flower_pot_circular') },
  { type: 'flower', x: fX + 3, y: fY + 1, prefabFile: getAssetFilename('poke_flower_pot_circular') },
  { type: 'flower', x: fX - 1, y: fY, prefabFile: getAssetFilename('poke_bush_round') },
  { type: 'flower', x: fX + 3, y: fY, prefabFile: getAssetFilename('poke_bush_round') },
  { type: 'bench', x: fX + 4, y: fY + 1, prefabFile: getAssetFilename('poke_bench') },
  // Manzana Residencial SW: Patios privados completos cercados
  { type: 'fence_h', x: bx + 5, y: by + 15, prefabFile: getAssetFilename('poke_fence_white_h_mid') },
  { type: 'fence_h', x: bx + 5, y: by + 16, prefabFile: getAssetFilename('poke_fence_white_h_mid') },
  { type: 'mailbox', x: bx + 5, y: by + 14, prefabFile: getAssetFilename('poke_mailbox') },
  { type: 'fence_h', x: bx + 6, y: by + 18, prefabFile: getAssetFilename('poke_fence_white_h_mid') },
  { type: 'fence_h', x: bx + 9, y: by + 18, prefabFile: getAssetFilename('poke_fence_white_h_mid') },
  { type: 'flower', x: bx + 8, y: by + 18, prefabFile: getAssetFilename('poke_flowers_red') },
  { type: 'flower', x: bx + 10, y: by + 17, prefabFile: getAssetFilename('poke_flowers_red') },
  { type: 'bench', x: bx + 1, y: by + 18, prefabFile: getAssetFilename('poke_bench') },
  // Manzana de Batalla NE: Entrada enmarcada con farolas y cartel oficial
  { type: 'signpost', x: bx + 20, y: by + 6, prefabFile: getAssetFilename('poke_gym_sign') },
  { type: 'lamp', x: bx + 21, y: by + 6, prefabFile: getAssetFilename('poke_street_lamp') },
  { type: 'lamp', x: bx + 28, y: by + 6, prefabFile: getAssetFilename('poke_street_lamp_left') },
  { type: 'bench', x: bx + 25, y: by + 12, prefabFile: getAssetFilename('poke_bench') },
  // Manzana de Servicios SE: Plazuela de descanso con farola, valla y flores
  { type: 'fence_h', x: bx + 21, y: by + 16, prefabFile: getAssetFilename('poke_fence_white_h_mid') },
  { type: 'flower', x: bx + 21, y: by + 17, prefabFile: getAssetFilename('poke_flowers_red') },
  { type: 'lamp', x: bx + 21, y: by + 14, prefabFile: getAssetFilename('poke_street_lamp') },
  { type: 'bench', x: bx + 22, y: by + 14, prefabFile: getAssetFilename('poke_bench') }
];

const VARIANTS: readonly VariantDefinition[] = [
  {
    id: 'opcion_1_jardines',
    title: 'Opción 1: Jardines y Setos Verdes (Estilo Ciudad Celeste)',
    filename: 'metropolis_opcion_1_jardines_verdes.png',
    props: VARIANT_1_PROPS
  },
  {
    id: 'opcion_2_forja',
    title: 'Opción 2: Distritos Urbanos de Forja y Farolas (Estilo Metrópolis Moderna)',
    filename: 'metropolis_opcion_2_distritos_forja.png',
    props: VARIANT_2_PROPS
  },
  {
    id: 'opcion_3_hibrido',
    title: 'Opción 3: Híbrido con Patios Privados y Manzanas Delimitadas',
    filename: 'metropolis_opcion_3_hibrido_manzanas.png',
    props: VARIANT_3_PROPS
  }
];

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

async function renderVariant(variant: VariantDefinition): Promise<void> {
  const canvasWidth = MAP_W * TILE_SIZE;
  const canvasHeight = MAP_H * TILE_SIZE;
  const canvasBuffer = Buffer.alloc(canvasWidth * canvasHeight * 4);

  // Raw Image Cache
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

  const blit = async (filename: string, px: number, py: number): Promise<void> => {
    const fullPath = resolveAssetPath(filename);
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

  // 1. Layer 1: Base Grass Plains across all 34x28 tiles
  for (let r = 0; r < MAP_H; r++) {
    for (let c = 0; c < MAP_W; c++) {
      await blit('poke_grass_plain.png', c * TILE_SIZE, r * TILE_SIZE);
    }
  }

  // 2. Layer 2: Cobblestone Plaza Concourse (30x24 inside city)
  const plazaGrid: boolean[][] = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(false));
  for (let y = by; y < by + H; y++) {
    for (let x = bx; x < bx + W; x++) {
      plazaGrid[y]![x] = true;
    }
  }
  const plazaAutotile = resolvePathGrid(plazaGrid, undefined, CANONICAL_STONE_PLAZA_BRUSH);
  for (let r = 0; r < MAP_H; r++) {
    for (let c = 0; c < MAP_W; c++) {
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

  // 3. Layer 3: Buildings (North-to-South Y-sorted)
  const buildingsToRender = variant.buildings ?? BASE_BUILDINGS;
  const sortedBuildings = [...buildingsToRender].sort((a, b) => (a.y + a.height) - (b.y + b.height) || a.x - b.x);
  for (const b of sortedBuildings) {
    await blit(b.prefabFile, b.x * TILE_SIZE, b.y * TILE_SIZE);
  }

  // 4. Layer 4: Urban Props & Architectural Dressing (North-to-South Y-sorted)
  const sortedProps = [...variant.props].sort((a, b) => (a.y + 1) - (b.y + 1) || a.x - b.x);
  for (const p of sortedProps) {
    const px = p.x * TILE_SIZE;
    const py = p.y * TILE_SIZE;
    let drawPx = px;
    let drawPy = py;

    if (p.type === 'statue') {
      drawPy = py - 32;
    } else if (p.type === 'lamp') {
      drawPy = py - 64;
    } else if (p.type === 'fence_h') {
      drawPx = px - 8;
      drawPy = py + 16;
    }

    await blit(p.prefabFile, drawPx, drawPy);
  }

  // Save outputs with Sharp
  const scratchFile = path.join(SCRATCH_DIR, variant.filename);
  await sharp(canvasBuffer, { raw: { width: canvasWidth, height: canvasHeight, channels: 4 } })
    .png()
    .toFile(scratchFile);

  for (const dir of ARTIFACT_DIRS) {
    const targetFile = path.join(dir, variant.filename);
    fs.copyFileSync(scratchFile, targetFile);
  }

  console.log(`[Variant Generated]: ${variant.title} -> ${variant.filename}`);
}

async function renderLiveMetropolis(): Promise<void> {
  const celadonNode: POINode = {
    id: 'celadon_capital',
    name: 'Ciudad Celeste',
    type: 'metropolis',
    footprint: { width: 30, height: 24 },
    terrainPreference: 'flat_grass',
    gridX: bx,
    gridY: by,
    elevation: 0
  };
  const liveLayout = generateSettlementLayout(celadonNode);
  await renderVariant({
    id: 'opcion_3_live',
    title: 'Metrópolis Procedural Canónica (Opción 3 Implementada)',
    filename: 'metropolis_opcion_3_implementada.png',
    buildings: liveLayout.buildings.map((b) => ({
      id: b.id,
      type: b.type,
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
      prefabFile: b.prefabFile
    })),
    props: liveLayout.props.map((p) => ({
      type: p.type,
      x: p.x,
      y: p.y,
      prefabFile: p.prefabFile
    }))
  });
}

async function main(): Promise<void> {
  console.log('Generating 3 High-Fidelity Metropolis Variants for visual selection...');
  for (const v of VARIANTS) {
    await renderVariant(v);
  }
  console.log('Rendering live engine settlement for Opción 3...');
  await renderLiveMetropolis();
  console.log('All variants and live engine outputs generated successfully!');
}

main().catch((err) => {
  console.error('[Error generating metropolis variants]:', err);
  process.exit(1);
});
