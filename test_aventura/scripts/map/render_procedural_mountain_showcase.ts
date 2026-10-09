/**
 * scripts/map/render_procedural_mountain_showcase.ts
 *
 * Visual verification and showcase for the Procedural Multi-Tier Continental Mountain System:
 *   1. Tier 4 Expansive Cordillera (Seed 777): 4 stacked floors (Apex Z=4, Crest Z=3, Terrace Z=2, Base Z=1) with stairs.
 *   2. Tier 3 Continental Massif (Seed 42): 3 stacked floors (Z=3, Z=2, Z=1) with zero drops > 1.
 *   3. Tier 1-2 Moderate Massif (Seed 42): Scaled down to 1-2 floors for smaller land mass.
 *   4. Combined Triptych Comparison (showcase_multitier_triptych.png).
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  generateContinentMap,
  type ContinentMapResult
} from '../../src/logic/map/continentGenerator.ts';

const ROOT_DIR = process.cwd();
const TILE_SIZE = 32;
const SCRATCH_DIR = path.resolve(ROOT_DIR, 'scratch/mountains_showcase');
const ARTIFACT_DIR = path.resolve(process.cwd(), 'scratch/maps');

if (!fs.existsSync(SCRATCH_DIR)) {
  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
}

const TILE_SEARCH_DIRS = [
  'public/assets/tiles',
  'public/assets/tiles/terrain',
  'public/assets/tiles/water',
  'public/assets/tiles/elevation',
  'public/assets/tiles/elevation/brown',
  'public/assets/tiles/elevation/gray',
  'public/assets/tiles/elevation/rock_tier',
  'public/assets/tiles/vegetation',
  'public/assets/tiles/objects_props',
  'public/assets/prefabs/elevation',
  'public/assets/essentials/prefabs/elevation',
  'public/assets/studio/kanto/lpc'
] as const;

interface RawImage {
  readonly width: number;
  readonly height: number;
  readonly data: Buffer;
}
const tileCache = new Map<string, RawImage | null>();

function findTilePath(filename: string): string | null {
  for (const d of TILE_SEARCH_DIRS) {
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

interface CropSpec {
  readonly id: string;
  readonly title: string;
  readonly continent: ContinentMapResult;
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

async function renderCrop(spec: CropSpec): Promise<Buffer> {
  const { continent, minX, maxX, minY, maxY } = spec;
  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const canvasW = cropW * TILE_SIZE;
  const canvasH = cropH * TILE_SIZE;
  const canvasBuffer = Buffer.alloc(canvasW * canvasH * 4);

  // Background: Grass green (r: 72, g: 136, b: 72)
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
      if (dy < 0 || dy >= canvasH) continue;
      const dstRowOffset = dy * canvasW * 4;
      const srcRowOffset = r * tw * 4;

      for (let c = 0; c < tw; c++) {
        const dx = destX + c;
        if (dx < 0 || dx >= canvasW) continue;

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

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const cell = continent.cells[y]?.[x];
      if (!cell) continue;

      const px = (x - minX) * TILE_SIZE;
      const py = (y - minY) * TILE_SIZE;

      for (const tileFile of cell.layerStack) {
        const img = await getRawTile(tileFile);
        if (img) {
          blitTile(img, px, py);
        }
      }
    }
  }

  const pngBuf = await sharp(canvasBuffer, {
    raw: {
      width: canvasW,
      height: canvasH,
      channels: 4
    }
  })
    .png()
    .toBuffer();

  const scratchPath = path.join(SCRATCH_DIR, `${spec.id}.png`);
  await sharp(pngBuf).toFile(scratchPath);
  console.log(`Guardado en scratch: ${scratchPath}`);

  if (fs.existsSync(ARTIFACT_DIR)) {
    const artPath = path.join(ARTIFACT_DIR, `${spec.id}.png`);
    fs.copyFileSync(scratchPath, artPath);
    console.log(`Copiado a artefacto: ${artPath}`);
  }

  return pngBuf;
}

async function main(): Promise<void> {
  console.log('--- Iniciando Generación de Showcase de Montañas Procedurales ---');

  // 1. Generar mapa Seed 777 (Cordillera Expansiva con 4 Pisos)
  console.log('\n[1/3] Generando continente Seed 777 (Cordillera Expansiva)...');
  const continent777 = generateContinentMap({
    width: 128,
    height: 128,
    seed: 777,
    mountainPercentage: 0.24,
    withStairs: true
  });

  const tier4Buf = await renderCrop({
    id: 'showcase_tier4_cordillera_seed777',
    title: 'Cordillera Expansiva (4 Pisos / Z=4) - Seed 777',
    continent: continent777,
    minX: 74,
    maxX: 106,
    minY: 85,
    maxY: 107
  });

  // 2. Generar mapa Seed 42 (Macizo Continental con 3 Pisos)
  console.log('\n[2/3] Generando continente Seed 42 (Macizo de 3 Pisos)...');
  const continent42 = generateContinentMap({
    width: 128,
    height: 128,
    seed: 42,
    mountainPercentage: 0.22,
    withStairs: true
  });

  const tier3Buf = await renderCrop({
    id: 'showcase_tier3_massif_seed42',
    title: 'Gran Macizo Continental (3 Pisos / Z=3) - Seed 42',
    continent: continent42,
    minX: 48,
    maxX: 76,
    minY: 14,
    maxY: 33
  });

  // 3. Extraer Colina Menor de 1 Piso (Massif 3 en Seed 42)
  console.log('\n[3/3] Extrayendo Colina Menor (1 Piso / Z=1) en Seed 42...');
  const tier1Buf = await renderCrop({
    id: 'showcase_tier1_hill_seed42',
    title: 'Colina Menor (1 Piso / Z=1) - Seed 42',
    continent: continent42,
    minX: 85,
    maxX: 107,
    minY: 92,
    maxY: 106
  });

  // 4. Crear Tríptico Comparativo (Triptych Showcase)
  console.log('\n[4/4] Ensamblando Tríptico Comparativo (showcase_multitier_triptych.png)...');
  const panelW = 480;
  const panelH = 480;
  const gap = 16;
  const bannerH = 40;
  const totalW = panelW * 3 + gap * 4;
  const totalH = panelH + bannerH + gap * 2;

  const r1 = await sharp(tier1Buf).resize(panelW, panelH, { fit: 'contain', background: { r: 16, g: 16, b: 24, alpha: 1 } }).toBuffer();
  const r3 = await sharp(tier3Buf).resize(panelW, panelH, { fit: 'contain', background: { r: 16, g: 16, b: 24, alpha: 1 } }).toBuffer();
  const r4 = await sharp(tier4Buf).resize(panelW, panelH, { fit: 'contain', background: { r: 16, g: 16, b: 24, alpha: 1 } }).toBuffer();

  const overlays: sharp.OverlayOptions[] = [
    { input: r1, left: gap, top: bannerH + gap },
    { input: r3, left: gap * 2 + panelW, top: bannerH + gap },
    { input: r4, left: gap * 3 + panelW * 2, top: bannerH + gap }
  ];

  // SVG Header Banner
  const svgHeader = `
    <svg width="${totalW}" height="${bannerH + gap}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${totalW}" height="${bannerH + gap}" fill="#0e0f14"/>
      <text x="${gap + panelW / 2}" y="28" font-family="monospace" font-size="14" font-weight="bold" fill="#70d6ff" text-anchor="middle">NIVEL 1-2: COLINA MENOR (Z=1)</text>
      <text x="${gap * 2 + panelW + panelW / 2}" y="28" font-family="monospace" font-size="14" font-weight="bold" fill="#ffd166" text-anchor="middle">NIVEL 3: GRAN MACIZO (Z=3)</text>
      <text x="${gap * 3 + panelW * 2 + panelW / 2}" y="28" font-family="monospace" font-size="14" font-weight="bold" fill="#ef476f" text-anchor="middle">NIVEL 4: CORDILLERA EXPANSIVA (Z=4)</text>
    </svg>
  `;
  overlays.unshift({ input: Buffer.from(svgHeader), left: 0, top: 0 });

  const triptychBase = sharp({
    create: {
      width: totalW,
      height: totalH,
      channels: 4,
      background: { r: 14, g: 15, b: 20, alpha: 1 }
    }
  });

  const triptychScratch = path.join(SCRATCH_DIR, 'showcase_multitier_triptych.png');
  await triptychBase.composite(overlays).png().toFile(triptychScratch);
  console.log(`Tríptico guardado en: ${triptychScratch}`);

  if (fs.existsSync(ARTIFACT_DIR)) {
    const triptychArtifact = path.join(ARTIFACT_DIR, 'showcase_multitier_triptych.png');
    fs.copyFileSync(triptychScratch, triptychArtifact);
    console.log(`Tríptico copiado a artefacto: ${triptychArtifact}`);
  }

  console.log('\n✨ Showcase de montañas completado exitosamente!');
}

main().catch((err) => {
  console.error('Error generando showcase de montañas:', err);
  process.exit(1);
});
