/**
 * scripts/map/generate_continent_preview.ts
 *
 * Visual verification generator for the Macro Continent Generator (continentGenerator.ts).
 *
 * Renders:
 *   - 4 distinct procedural continental map variations with different seeds and parameters.
 *   - Saves individual high-resolution 2048x2048 PNGs for each variation.
 *   - Assembles a 2x2 comparison collage (continentes_comparativa_4x.png) with pixel-art nearest scaling.
 *   - Copies all outputs to the artifact directory for multimodal inspection.
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  generateContinentMap,
  type ContinentGeneratorOptions,
  type ContinentMapResult
} from '../../src/logic/map/continentGenerator.ts';
import { resolveTileUrl } from '../../src/logic/map/canvasTileRenderer.ts';

const ROOT_DIR = process.cwd();
const TILE_SIZE = 32;
const MAP_SIZE = 64;

const SEARCH_DIRS = [
  path.resolve(ROOT_DIR, 'public'),
  path.resolve(ROOT_DIR, 'public/assets'),
  path.resolve(ROOT_DIR, 'public/assets/tiles'),
  path.resolve(ROOT_DIR, 'public/assets/tiles/terrain'),
  path.resolve(ROOT_DIR, 'public/assets/tiles/elevation'),
  path.resolve(ROOT_DIR, 'public/assets/tiles/elevation/brown'),
  path.resolve(ROOT_DIR, 'public/assets/tiles/elevation/gray'),
  path.resolve(ROOT_DIR, 'public/assets/tiles/water'),
  path.resolve(ROOT_DIR, 'public/assets/tiles/vegetation'),
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
const SCRATCH_DIR = path.resolve(ROOT_DIR, 'scratch');
const ARTIFACT_DIR = path.resolve(process.cwd(), 'scratch/maps');

interface ContinentConfig {
  readonly id: string;
  readonly name: string;
  readonly options: ContinentGeneratorOptions;
}

const CONFIGS: readonly ContinentConfig[] = [
  {
    id: 'continente_1_clasico',
    name: 'Variacion 1: Isla Continental Clasica (Seed 42)',
    options: {
      width: MAP_SIZE,
      height: MAP_SIZE,
      seed: 42,
      oceanWaterPercentage: 0.38,
      beachWidth: 3,
      lakeCount: 2,
      mountainPercentage: 0.20,
      mountainPalette: 'brown',
      withStairs: true
    }
  },
  {
    id: 'continente_2_fluvial',
    name: 'Variacion 2: Region Fluvial y Grandes Lagos (Seed 108)',
    options: {
      width: MAP_SIZE,
      height: MAP_SIZE,
      seed: 108,
      oceanWaterPercentage: 0.36,
      beachWidth: 3,
      lakeCount: 3,
      mountainPercentage: 0.16,
      mountainPalette: 'brown',
      withStairs: true
    }
  },
  {
    id: 'continente_3_macizo_gris',
    name: 'Variacion 3: Macizo Rocoso y Cumbres Grises (Seed 777)',
    options: {
      width: MAP_SIZE,
      height: MAP_SIZE,
      seed: 777,
      oceanWaterPercentage: 0.35,
      beachWidth: 2,
      lakeCount: 1,
      mountainPercentage: 0.28,
      mountainPalette: 'gray',
      withStairs: true
    }
  },
  {
    id: 'continente_4_costero',
    name: 'Variacion 4: Costas Profundas y Playas Amplias (Seed 1337)',
    options: {
      width: MAP_SIZE,
      height: MAP_SIZE,
      seed: 1337,
      oceanWaterPercentage: 0.42,
      beachWidth: 4,
      lakeCount: 2,
      mountainPercentage: 0.22,
      mountainPalette: 'brown',
      withStairs: true
    }
  }
];

interface RawImage {
  readonly width: number;
  readonly height: number;
  readonly data: Buffer;
}
const rawCache = new Map<string, RawImage | null>();

function findTilePath(filename: string): string | null {
  const rel = resolveTileUrl(filename);
  const directPath = path.join(ROOT_DIR, 'public', rel);
  if (fs.existsSync(directPath)) return directPath;

  for (const dir of SEARCH_DIRS) {
    const full = path.join(dir, filename);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

async function getRawTile(filename: string): Promise<RawImage | null> {
  const filePath = findTilePath(filename);
  if (!filePath) return null;
  if (rawCache.has(filePath)) return rawCache.get(filePath)!;
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

async function renderContinent(config: ContinentConfig): Promise<Buffer> {
  console.log(`\n--- Generando ${config.name} ---`);
  const result: ContinentMapResult = generateContinentMap(config.options);

  console.log(`Dimensiones: ${result.width}x${result.height}`);
  console.log(`Escaleras colocadas: ${result.placedStairs.length}`);

  const canvasWidth = result.width * TILE_SIZE;
  const canvasHeight = result.height * TILE_SIZE;
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

  const t0 = performance.now();
  for (let r = 0; r < result.height; r++) {
    for (let c = 0; c < result.width; c++) {
      const cell = result.cells[r]![c]!;
      const px = c * TILE_SIZE;
      const py = r * TILE_SIZE;

      for (const tileFile of cell.layerStack) {
        const img = await getRawTile(tileFile);
        if (img) {
          blitTile(img, px, py);
        }
      }
    }
  }
  const t1 = performance.now();
  console.log(`Blit completado en ${(t1 - t0).toFixed(1)}ms!`);

  const buffer = await sharp(canvasBuffer, {
    raw: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4
    }
  })
    .png()
    .toBuffer();

  const outScratch = path.join(SCRATCH_DIR, `${config.id}.png`);
  await sharp(buffer).toFile(outScratch);
  console.log(`Guardado: ${outScratch}`);

  if (fs.existsSync(ARTIFACT_DIR)) {
    const outArtifact = path.join(ARTIFACT_DIR, `${config.id}.png`);
    fs.copyFileSync(outScratch, outArtifact);
    console.log(`Copiado a artefacto: ${outArtifact}`);
  }

  return buffer;
}

async function main(): Promise<void> {
  console.log(`Iniciando generacion de 4 continentes procedurales (64x64)...`);

  const renderedBuffers: Buffer[] = [];
  for (const config of CONFIGS) {
    const buf = await renderContinent(config);
    renderedBuffers.push(buf);
  }

  // Also save the first one to the baseline verification path for backward compatibility
  const baselineScratch = path.join(SCRATCH_DIR, 'verificacion_continente_base.png');
  fs.copyFileSync(path.join(SCRATCH_DIR, `${CONFIGS[0]!.id}.png`), baselineScratch);
  if (fs.existsSync(ARTIFACT_DIR)) {
    fs.copyFileSync(baselineScratch, path.join(ARTIFACT_DIR, 'verificacion_continente_base.png'));
  }

  // Generate 2x2 comparison collage (2048x2048) with nearest-neighbor scaling
  console.log(`\nEnsamblando comparativa 2x2 (continentes_comparativa_4x.png)...`);
  const thumbSize = 1024;
  const collageOverlays: sharp.OverlayOptions[] = [];

  const positions = [
    { left: 0, top: 0 },
    { left: thumbSize, top: 0 },
    { left: 0, top: thumbSize },
    { left: thumbSize, top: thumbSize }
  ];

  for (let i = 0; i < renderedBuffers.length; i++) {
    const resizedThumb = await sharp(renderedBuffers[i]!)
      .resize(thumbSize, thumbSize, { kernel: sharp.kernel.nearest })
      .toBuffer();

    collageOverlays.push({
      input: resizedThumb,
      left: positions[i]!.left,
      top: positions[i]!.top
    });
  }

  const collageBase = sharp({
    create: {
      width: thumbSize * 2,
      height: thumbSize * 2,
      channels: 4,
      background: { r: 10, g: 10, b: 14, alpha: 1 }
    }
  });

  const collageScratch = path.join(SCRATCH_DIR, 'continentes_comparativa_4x.png');
  await collageBase.composite(collageOverlays).png().toFile(collageScratch);
  console.log(`Comparativa 2x2 guardada en: ${collageScratch}`);

  if (fs.existsSync(ARTIFACT_DIR)) {
    const collageArtifact = path.join(ARTIFACT_DIR, 'continentes_comparativa_4x.png');
    fs.copyFileSync(collageScratch, collageArtifact);
    console.log(`Comparativa copiada a artefacto: ${collageArtifact}`);
  }

  console.log(`\nProceso completado exitosamente: 4 imagenes individuales + 1 comparativa.`);
}

main().catch((err) => {
  console.error('Error al generar las previsualizaciones del continente:', err);
  process.exit(1);
});
