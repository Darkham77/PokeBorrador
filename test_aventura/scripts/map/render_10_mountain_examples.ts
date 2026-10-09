/**
 * scripts/map/render_10_mountain_examples.ts
 *
 * Generates and renders 10 large multi-tier mountain massifs to visually verify:
 *   1. Strict prohibition of 1-tile thick mountain formations (width >= 2 and height >= 2 everywhere).
 *   2. Strict prohibition of unrounded border tiles (enforcing canonical rounded corner tiles poke_cliff_..._corner_tl/tr/bl/br.png).
 *   3. Organic multi-tier plateaus (Piso 1 and Piso 2) with functional stairs.
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  generateOrganicMountainMap
} from '../../src/logic/map/organicMountainGenerator.ts';
import type { MountainPalette } from '../../src/logic/map/mountainAutotileEngine.ts';

const ROOT_DIR = process.cwd();
const TILE_SIZE = 32;
const MAP_DIM = 32;
const SCRATCH_DIR = path.resolve(ROOT_DIR, 'scratch/mountains');
const ARTIFACT_DIR = path.resolve(process.cwd(), 'scratch/maps');

if (!fs.existsSync(SCRATCH_DIR)) {
  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
}

interface MountainSpec {
  readonly id: string;
  readonly filename: string;
  readonly name: string;
  readonly seed: number;
  readonly palette: MountainPalette;
  readonly tier1Threshold: number;
  readonly tier2Threshold: number;
}

const SPECS: readonly MountainSpec[] = [
  {
    id: 'm01',
    filename: 'mountain_01_seed42.png',
    name: '01. Macizo de Kanto Norte',
    seed: 42,
    palette: 'brown',
    tier1Threshold: 0.36,
    tier2Threshold: 0.52
  },
  {
    id: 'm02',
    filename: 'mountain_02_seed108.png',
    name: '02. Cumbre Rocosa de Cerulean',
    seed: 108,
    palette: 'gray',
    tier1Threshold: 0.35,
    tier2Threshold: 0.50
  },
  {
    id: 'm03',
    filename: 'mountain_03_seed777.png',
    name: '03. Cordillera Volcánica de Cinnabar',
    seed: 777,
    palette: 'brown',
    tier1Threshold: 0.34,
    tier2Threshold: 0.49
  },
  {
    id: 'm04',
    filename: 'mountain_04_seed1337.png',
    name: '04. Meseta Escarpada de la Victoria',
    seed: 1337,
    palette: 'gray',
    tier1Threshold: 0.37,
    tier2Threshold: 0.53
  },
  {
    id: 'm05',
    filename: 'mountain_05_seed777480.png',
    name: '05. Macizo Cueva Celeste',
    seed: 777480,
    palette: 'gray',
    tier1Threshold: 0.35,
    tier2Threshold: 0.51
  },
  {
    id: 'm06',
    filename: 'mountain_06_seed12345.png',
    name: '06. Picos Gemelos de Azafrán',
    seed: 12345,
    palette: 'brown',
    tier1Threshold: 0.36,
    tier2Threshold: 0.52
  },
  {
    id: 'm07',
    filename: 'mountain_07_seed99999.png',
    name: '07. Cordón de Roca Plateada',
    seed: 99999,
    palette: 'gray',
    tier1Threshold: 0.34,
    tier2Threshold: 0.48
  },
  {
    id: 'm08',
    filename: 'mountain_08_seed54321.png',
    name: '08. Altiplano Silvestre de Fucsia',
    seed: 54321,
    palette: 'brown',
    tier1Threshold: 0.35,
    tier2Threshold: 0.50
  },
  {
    id: 'm09',
    filename: 'mountain_09_seed88888.png',
    name: '09. Macizo Granítico Septentrional',
    seed: 88888,
    palette: 'gray',
    tier1Threshold: 0.36,
    tier2Threshold: 0.51
  },
  {
    id: 'm10',
    filename: 'mountain_10_seed31415.png',
    name: '10. Sierra Escarpada del Este',
    seed: 31415,
    palette: 'brown',
    tier1Threshold: 0.35,
    tier2Threshold: 0.50
  }
];

interface RawImage {
  readonly width: number;
  readonly height: number;
  readonly data: Buffer;
}
const tileCache = new Map<string, RawImage | null>();

function findTilePath(filename: string): string | null {
  const dirs = [
    'public/assets/tiles',
    'public/assets/tiles/elevation',
    'public/assets/tiles/elevation/brown',
    'public/assets/tiles/elevation/gray',
    'public/assets/prefabs/elevation',
    'public/assets/studio/kanto/lpc'
  ] as const;
  for (const d of dirs) {
    const p = path.resolve(ROOT_DIR, d, filename);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function getRawTile(filename: string): Promise<RawImage | null> {
  if (tileCache.has(filename)) return tileCache.get(filename)!;
  const p = findTilePath(filename);
  if (!p) {
    tileCache.set(filename, null);
    return null;
  }
  try {
    const { data, info } = await sharp(p)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const img: RawImage = { width: info.width, height: info.height, data };
    tileCache.set(filename, img);
    return img;
  } catch {
    tileCache.set(filename, null);
    return null;
  }
}

async function renderMountain(spec: MountainSpec): Promise<{
  readonly buffer: Buffer;
  readonly z1Count: number;
  readonly z2Count: number;
  readonly stairCount: number;
}> {
  console.log(`\n=== Generando ${spec.name} (Seed: ${spec.seed}, Paleta: ${spec.palette}) ===`);

  const mountain = generateOrganicMountainMap({
    width: MAP_DIM,
    height: MAP_DIM,
    seed: spec.seed,
    palette: spec.palette,
    tier1Threshold: spec.tier1Threshold,
    tier2Threshold: spec.tier2Threshold,
    withStairs: true,
    maxStairsPerTier: 3
  });

  const matrix = mountain.sanitizedHeightmap;
  let z1Count = 0;
  let z2Count = 0;
  for (let y = 0; y < MAP_DIM; y++) {
    for (let x = 0; x < MAP_DIM; x++) {
      if (matrix[y]![x] === 1) z1Count++;
      if (matrix[y]![x] === 2) z2Count++;
    }
  }

  // Verify 0 1-tile pinches
  let thinPinchCount = 0;
  for (let z = 1; z <= 2; z++) {
    for (let y = 0; y < MAP_DIM; y++) {
      for (let x = 0; x < MAP_DIM; x++) {
        if (matrix[y]![x]! >= z) {
          const hasN = y > 0 && matrix[y - 1]![x]! >= z;
          const hasS = y < MAP_DIM - 1 && matrix[y + 1]![x]! >= z;
          const hasW = x > 0 && matrix[y]![x - 1]! >= z;
          const hasE = x < MAP_DIM - 1 && matrix[y]![x + 1]! >= z;
          if ((!hasW && !hasE) || (!hasN && !hasS)) {
            thinPinchCount++;
          }
        }
      }
    }
  }

  console.log(`Estadísticas: Piso 1 = ${z1Count} tiles, Piso 2 = ${z2Count} tiles, Escaleras = ${mountain.placedStairs.length}, 1-Tile Pinches = ${thinPinchCount}`);

  const canvasWidth = MAP_DIM * TILE_SIZE;
  const canvasHeight = MAP_DIM * TILE_SIZE;
  const canvasBuffer = Buffer.alloc(canvasWidth * canvasHeight * 4);

  // Background dark green
  for (let i = 0; i < canvasBuffer.length; i += 4) {
    canvasBuffer[i] = 72;
    canvasBuffer[i + 1] = 136;
    canvasBuffer[i + 2] = 72;
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

  const grassImg = await getRawTile('poke_grass_plain.png');

  // Layer 0: Grass base across the world
  if (grassImg) {
    for (let y = 0; y < MAP_DIM; y++) {
      for (let x = 0; x < MAP_DIM; x++) {
        blitTile(grassImg, x * TILE_SIZE, y * TILE_SIZE);
      }
    }
  }

  // Layer 0.5: Underlying plateau rock floor for elevated tiers (z >= 2)
  // When an upper tier (Piso 2) has rounded corners, the lower floor (Piso 1 rock plateau)
  // must cover the space underneath so no green grass bleeds onto the mountain!
  const plateauBaseName = spec.palette === 'gray'
    ? 'poke_cliff_gray_plateau_rock.png'
    : 'poke_cliff_brown_plateau_rock.png';
  const plateauBaseImg = await getRawTile(plateauBaseName);

  if (plateauBaseImg) {
    for (let y = 0; y < MAP_DIM; y++) {
      for (let x = 0; x < MAP_DIM; x++) {
        if (matrix[y]![x]! >= 2) {
          blitTile(plateauBaseImg, x * TILE_SIZE, y * TILE_SIZE);
        }
      }
    }
  }

  // Layer 1: Mountain Primary Tiles
  const autotile = mountain.autotileResult;
  for (let y = 0; y < MAP_DIM; y++) {
    for (let x = 0; x < MAP_DIM; x++) {
      const tileName = autotile.primaryTiles[y]?.[x];
      if (tileName && tileName.length > 0) {
        const img = await getRawTile(tileName);
        if (img) {
          blitTile(img, x * TILE_SIZE, y * TILE_SIZE);
        }
      }
    }
  }

  // Layer 2: Cliff Foot Overlays
  for (const foot of autotile.cliffFootOverlays) {
    const img = await getRawTile(foot.tile);
    if (img) {
      blitTile(img, foot.targetX * TILE_SIZE, foot.targetY * TILE_SIZE);
    }
  }

  const pngBuffer = await sharp(canvasBuffer, {
    raw: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4
    }
  })
    .png()
    .toBuffer();

  const scratchFile = path.join(SCRATCH_DIR, spec.filename);
  await sharp(pngBuffer).toFile(scratchFile);

  if (fs.existsSync(ARTIFACT_DIR)) {
    const artifactFile = path.join(ARTIFACT_DIR, spec.filename);
    fs.copyFileSync(scratchFile, artifactFile);
  }

  return {
    buffer: pngBuffer,
    z1Count,
    z2Count,
    stairCount: mountain.placedStairs.length
  };
}

async function main(): Promise<void> {
  console.log('Iniciando generador de 10 ejemplos de montañas grandes...');

  const renderedImages: Buffer[] = [];

  for (const spec of SPECS) {
    const res = await renderMountain(spec);
    renderedImages.push(res.buffer);
  }

  // Create 5x2 collage
  const collageCols = 5;
  const collageRows = 2;
  const thumbDim = 256;
  const collageWidth = collageCols * thumbDim;
  const collageHeight = collageRows * thumbDim;

  const composites: sharp.OverlayOptions[] = [];
  for (let i = 0; i < renderedImages.length; i++) {
    const col = i % collageCols;
    const row = Math.floor(i / collageCols);
    const resized = await sharp(renderedImages[i]!)
      .resize(thumbDim, thumbDim, { kernel: sharp.kernel.nearest })
      .png()
      .toBuffer();

    composites.push({
      input: resized,
      left: col * thumbDim,
      top: row * thumbDim
    });
  }

  const collageBuffer = await sharp({
    create: {
      width: collageWidth,
      height: collageHeight,
      channels: 4,
      background: { r: 16, g: 16, b: 24, alpha: 1 }
    }
  })
    .composite(composites)
    .png()
    .toBuffer();

  const collageScratch = path.join(SCRATCH_DIR, 'montanas_comparativa_10x.png');
  await sharp(collageBuffer).toFile(collageScratch);

  if (fs.existsSync(ARTIFACT_DIR)) {
    const collageArtifact = path.join(ARTIFACT_DIR, 'montanas_comparativa_10x.png');
    fs.copyFileSync(collageScratch, collageArtifact);
  }

  console.log('\n✅ 10 ejemplos de montañas generados y guardados con éxito!');
}

main().catch((err) => {
  console.error('Error generando ejemplos:', err);
  process.exit(1);
});
