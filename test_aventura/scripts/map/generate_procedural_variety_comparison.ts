/**
 * scripts/map/generate_procedural_variety_comparison.ts
 *
 * PROCEDURAL VARIETY SHOWCASE: MULTI-SEED COMPARISON
 *
 * Demonstrates 100% procedural variability across 3 distinct random seeds:
 *   - Seed 1337: Región Eterna (Valle y Bahía)
 *   - Seed 7741: Región Austral (Cordillera y Archipiélago)
 *   - Seed 9021: Región Índigo (Delta Fluvial y Península)
 *
 * Generates:
 *   1. High-resolution full maps for each seed (2048x2048 px).
 *   2. Horizontal 3-way continent comparison composite.
 *   3. 1:1 inspection crops of key settlements (Metropolis, Port, Starter Town).
 *   4. Side-by-side city comparison mosaics showing zero clone layouts.
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  generatePokemonContinentalWorld,
  type PokemonContinentalWorldResult
} from '../../src/logic/map/continent/continentalEngine.ts';
import {
  buildMapBlitInstructions,
  resolveTileUrl
} from '../../src/logic/map/canvasTileRenderer.ts';

const ROOT_DIR = process.cwd();
const TILE_SIZE = 32;
const MAP_SIZE = 256; // Canonical macro-regional scale (256x256 tiles = 8192x8192 px canvas)

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
const SCRATCH_DIR = path.resolve(ROOT_DIR, 'scratch/comparisons');
const ARTIFACT_DIR = path.resolve(process.cwd(), 'scratch/maps');

interface RawImage {
  readonly width: number;
  readonly height: number;
  readonly data: Buffer;
  readonly dataU32: Uint32Array;
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
  try {
    const { data, info } = await sharp(filePath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const dataU32 = new Uint32Array(data.buffer, data.byteOffset, data.byteLength / 4);
    const img: RawImage = { width: info.width, height: info.height, data, dataU32 };
    rawCache.set(filePath, img);
    return img;
  } catch {
    rawCache.set(filePath, null);
    return null;
  }
}

interface SeedConfig {
  readonly seed: number;
  readonly name: string;
  readonly tag: string;
}

const SEEDS: readonly SeedConfig[] = [
  { seed: 1337, name: 'Región Eterna (Valle y Bahía Central)', tag: 'seed_1337' },
  { seed: 7741, name: 'Región Austral (Cordillera y Archipiélago)', tag: 'seed_7741' },
  { seed: 9021, name: 'Región Índigo (Delta Fluvial y Península)', tag: 'seed_9021' }
];

async function renderSeedWorld(config: SeedConfig): Promise<{
  readonly fullBuffer: Buffer;
  readonly overviewBuffer: Buffer;
  readonly result: PokemonContinentalWorldResult;
  readonly metropolisCrop: Buffer | null;
  readonly portCrop: Buffer | null;
  readonly starterCrop: Buffer | null;
}> {
  console.log(`\n======================================================`);
  console.log(`Generando ${config.name} (Seed ${config.seed})...`);
  const t0 = performance.now();

  const result = generatePokemonContinentalWorld({
    seed: config.seed,
    width: MAP_SIZE,
    height: MAP_SIZE,
    tileScale: TILE_SIZE
  });

  const { continent, pois, pathGrid, bridgeGrid, wilderness } = result;
  const canvasWidth = continent.width * TILE_SIZE; // 8192 px
  const canvasHeight = continent.height * TILE_SIZE; // 8192 px

  const canvasBuffer = Buffer.alloc(canvasWidth * canvasHeight * 4);
  const canvasU32 = new Uint32Array(canvasBuffer.buffer, canvasBuffer.byteOffset, canvasBuffer.byteLength / 4);

  // Background deep ocean
  canvasU32.fill(0xff402010);

  const blitTile = (img: RawImage, destX: number, destY: number): void => {
    const { width: tw, height: th, dataU32 } = img;
    for (let r = 0; r < th; r++) {
      const dy = destY + r;
      if (dy < 0 || dy >= canvasHeight) continue;

      const srcRowOffset = r * tw;
      const dstRowOffset = dy * canvasWidth;

      for (let c = 0; c < tw; c++) {
        const dx = destX + c;
        if (dx < 0 || dx >= canvasWidth) continue;

        const pixel = dataU32[srcRowOffset + c]!;
        const alpha = pixel >>> 24;
        if (alpha === 0) continue;

        const dstIdx = dstRowOffset + dx;
        if (alpha === 255) {
          canvasU32[dstIdx] = pixel;
        } else {
          const a = alpha / 255;
          const invA = 1 - a;
          const bg = canvasU32[dstIdx]!;
          const rD = (((pixel & 0xff) * a) + ((bg & 0xff) * invA)) | 0;
          const gD = ((((pixel >> 8) & 0xff) * a) + (((bg >> 8) & 0xff) * invA)) | 0;
          const bD = ((((pixel >> 16) & 0xff) * a) + (((bg >> 16) & 0xff) * invA)) | 0;
          canvasU32[dstIdx] = (255 << 24) | (bD << 16) | (gD << 8) | rD;
        }
      }
    }
  };

  const { instructions } = buildMapBlitInstructions(
    continent,
    pois,
    pathGrid,
    bridgeGrid,
    wilderness,
    {
      ledges: result.ledges,
      progressionObstacles: result.progressionObstacles,
      microVignettes: result.microVignettes
    }
  );

  console.log(`[Seed ${config.seed}] Instrucciones de blit: ${instructions.length}`);
  for (const inst of instructions) {
    const img = await getRawTile(inst.filename);
    if (img) {
      blitTile(img, inst.px, inst.py);
    }
  }

  const tBlit = performance.now();
  console.log(`[Seed ${config.seed}] Renderizado en ${(tBlit - t0).toFixed(0)}ms!`);

  // 1. Overview 2048x2048 (sharp nearest neighbor for pixel art purity)
  const overviewBuffer = await sharp(canvasBuffer, {
    raw: { width: canvasWidth, height: canvasHeight, channels: 4 }
  })
    .resize(2048, 2048, { kernel: sharp.kernel.nearest })
    .png({ compressionLevel: 6 })
    .toBuffer();

  const overviewFile = path.join(SCRATCH_DIR, `continente_${config.tag}.png`);
  const overviewArtifact = path.join(ARTIFACT_DIR, `continente_${config.tag}.png`);
  fs.writeFileSync(overviewFile, overviewBuffer);
  if (fs.existsSync(ARTIFACT_DIR)) fs.writeFileSync(overviewArtifact, overviewBuffer);
  console.log(`[Seed ${config.seed}] Vista general guardada: ${overviewArtifact}`);

  // Helper for 1:1 crops
  const extractCrop = async (gridX: number, gridY: number, sizeTiles: number): Promise<Buffer> => {
    const sizePx = sizeTiles * TILE_SIZE;
    const left = Math.max(0, Math.min(canvasWidth - sizePx, (gridX - 2) * TILE_SIZE));
    const top = Math.max(0, Math.min(canvasHeight - sizePx, (gridY - 2) * TILE_SIZE));

    return sharp(canvasBuffer, {
      raw: { width: canvasWidth, height: canvasHeight, channels: 4 }
    })
      .extract({ left: Math.round(left), top: Math.round(top), width: sizePx, height: sizePx })
      .png({ compressionLevel: 6 })
      .toBuffer();
  };

  // Find Metropolis (major city with largest footprint or commercial center)
  const metropolisPOI = pois.find(
    (p) => p.type === 'city' && (p.name.includes('Azulona') || p.name.includes('Azafrán') || p.name.includes('Celadón') || p.urbanLayout?.buildings.some(b => b.type === 'dept_store' || b.type === 'corp_tower'))
  ) ?? pois.find((p) => p.type === 'city');

  let metropolisCrop: Buffer | null = null;
  if (metropolisPOI) {
    metropolisCrop = await extractCrop(metropolisPOI.gridX, metropolisPOI.gridY, 26);
    const mArtifact = path.join(ARTIFACT_DIR, `ciudad_metropolis_${config.tag}.png`);
    fs.writeFileSync(mArtifact, metropolisCrop);
    console.log(`[Seed ${config.seed}] Crop Metrópolis guardado: ${mArtifact}`);
  }

  // Find Port
  const portPOI = pois.find((p) => p.type === 'port_dock');
  let portCrop: Buffer | null = null;
  if (portPOI) {
    portCrop = await extractCrop(portPOI.gridX, portPOI.gridY, 26);
    const pArtifact = path.join(ARTIFACT_DIR, `puerto_maritimo_${config.tag}.png`);
    fs.writeFileSync(pArtifact, portCrop);
    console.log(`[Seed ${config.seed}] Crop Puerto guardado: ${pArtifact}`);
  }

  // Find Starter Town (e.g. Pallet town or first town)
  const starterPOI = pois.find((p) => p.type === 'town' && (p.name.includes('Paleta') || p.name.includes('Primavera') || p.urbanLayout?.buildings.some(b => b.type === 'lab'))) ?? pois.find((p) => p.type === 'town');
  let starterCrop: Buffer | null = null;
  if (starterPOI) {
    starterCrop = await extractCrop(starterPOI.gridX, starterPOI.gridY, 22);
    const sArtifact = path.join(ARTIFACT_DIR, `pueblo_inicial_${config.tag}.png`);
    fs.writeFileSync(sArtifact, starterCrop);
    console.log(`[Seed ${config.seed}] Crop Pueblo Inicial guardado: ${sArtifact}`);
  }

  return {
    fullBuffer: canvasBuffer,
    overviewBuffer,
    result,
    metropolisCrop,
    portCrop,
    starterCrop
  };
}

async function run(): Promise<void> {
  console.log('Iniciando generador de Comparativa Procedural Multi-Semilla...');
  if (!fs.existsSync(SCRATCH_DIR)) fs.mkdirSync(SCRATCH_DIR, { recursive: true });

  const renderedWorlds: Awaited<ReturnType<typeof renderSeedWorld>>[] = [];
  for (const config of SEEDS) {
    const world = await renderSeedWorld(config);
    renderedWorlds.push(world);
  }

  // =========================================================================
  // 1. COMPOSITE: 3-WAY CONTINENT COMPARISON (Side-by-Side: 6144 x 2048 px)
  // =========================================================================
  console.log('\nEnsamblando mosaico comparativo de 3 Continentes...');
  const continentCompositeWidth = 2048 * 3 + 32 * 2; // with 32px borders between panels
  const continentCompositeHeight = 2048;

  const continentComposite = sharp({
    create: {
      width: continentCompositeWidth,
      height: continentCompositeHeight,
      channels: 4,
      background: { r: 10, g: 18, b: 35, alpha: 1 }
    }
  }).composite([
    { input: renderedWorlds[0]!.overviewBuffer, left: 0, top: 0 },
    { input: renderedWorlds[1]!.overviewBuffer, left: 2048 + 32, top: 0 },
    { input: renderedWorlds[2]!.overviewBuffer, left: (2048 + 32) * 2, top: 0 }
  ]);

  const continentComparisonPath = path.join(ARTIFACT_DIR, 'comparativa_continentes_3_semillas.png');
  await continentComposite.png({ compressionLevel: 6 }).toFile(continentComparisonPath);
  console.log(`Mosaico 3 Continentes guardado en: ${continentComparisonPath}`);

  // =========================================================================
  // 2. COMPOSITE: METROPOLIS VARIATION ACROSS SEEDS (3x 832x832 px)
  // =========================================================================
  const validMetropolis = renderedWorlds.filter((w) => w.metropolisCrop !== null);
  if (validMetropolis.length === 3) {
    console.log('Ensamblando comparativa de Metrópolis entre semillas...');
    const metaCompositeWidth = 832 * 3 + 24 * 2;
    const metaCompositeHeight = 832;

    const metaComposite = sharp({
      create: {
        width: metaCompositeWidth,
        height: metaCompositeHeight,
        channels: 4,
        background: { r: 24, g: 24, b: 32, alpha: 1 }
      }
    }).composite([
      { input: validMetropolis[0]!.metropolisCrop!, left: 0, top: 0 },
      { input: validMetropolis[1]!.metropolisCrop!, left: 832 + 24, top: 0 },
      { input: validMetropolis[2]!.metropolisCrop!, left: (832 + 24) * 2, top: 0 }
    ]);

    const metaCompPath = path.join(ARTIFACT_DIR, 'comparativa_metropolis_3_semillas.png');
    await metaComposite.png({ compressionLevel: 6 }).toFile(metaCompPath);
    console.log(`Mosaico Metrópolis guardado en: ${metaCompPath}`);
  }

  // =========================================================================
  // 3. COMPOSITE: PORT TERMINAL VARIATION ACROSS SEEDS (3x 832x832 px)
  // =========================================================================
  const validPorts = renderedWorlds.filter((w) => w.portCrop !== null);
  if (validPorts.length === 3) {
    console.log('Ensamblando comparativa de Puertos y Muelles entre semillas...');
    const portCompositeWidth = 832 * 3 + 24 * 2;
    const portCompositeHeight = 832;

    const portComposite = sharp({
      create: {
        width: portCompositeWidth,
        height: portCompositeHeight,
        channels: 4,
        background: { r: 16, g: 32, b: 48, alpha: 1 }
      }
    }).composite([
      { input: validPorts[0]!.portCrop!, left: 0, top: 0 },
      { input: validPorts[1]!.portCrop!, left: 832 + 24, top: 0 },
      { input: validPorts[2]!.portCrop!, left: (832 + 24) * 2, top: 0 }
    ]);

    const portCompPath = path.join(ARTIFACT_DIR, 'comparativa_puertos_3_semillas.png');
    await portComposite.png({ compressionLevel: 6 }).toFile(portCompPath);
    console.log(`Mosaico Puertos guardado en: ${portCompPath}`);
  }

  // =========================================================================
  // 4. COMPOSITE: STARTER TOWN VARIATION ACROSS SEEDS (3x 704x704 px)
  // =========================================================================
  const validStarters = renderedWorlds.filter((w) => w.starterCrop !== null);
  if (validStarters.length === 3) {
    console.log('Ensamblando comparativa de Pueblos Iniciales entre semillas...');
    const starterCompositeWidth = 704 * 3 + 24 * 2;
    const starterCompositeHeight = 704;

    const starterComposite = sharp({
      create: {
        width: starterCompositeWidth,
        height: starterCompositeHeight,
        channels: 4,
        background: { r: 34, g: 49, b: 34, alpha: 1 }
      }
    }).composite([
      { input: validStarters[0]!.starterCrop!, left: 0, top: 0 },
      { input: validStarters[1]!.starterCrop!, left: 704 + 24, top: 0 },
      { input: validStarters[2]!.starterCrop!, left: (704 + 24) * 2, top: 0 }
    ]);

    const starterCompPath = path.join(ARTIFACT_DIR, 'comparativa_pueblos_iniciales_3_semillas.png');
    await starterComposite.png({ compressionLevel: 6 }).toFile(starterCompPath);
    console.log(`Mosaico Pueblos Iniciales guardado en: ${starterCompPath}`);
  }

  console.log('\n🎉 ¡Comparativa multi-semilla completada con éxito!');
}

run().catch(console.error);
