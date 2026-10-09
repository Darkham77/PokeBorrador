/**
 * scripts/map/generate_pokemon_region_preview.ts
 *
 * Visual verification generator for the 5-Phase Pokémon Graph-First Continental Engine.
 *
 * Renders:
 *   - 3 distinct procedural Pokémon regions using authentic GBA/LPC pixel-art tiles.
 *   - Overlays the semantic vector graph (cities, orthogonal routes, surf, wormhole caves, barriers, gatehouses).
 *   - Saves individual high-resolution PNGs and an assembled comparative showcase.
 *   - Copies all outputs to the current conversation artifact directory for inspection.
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
const MAP_SIZE = 400;
const PREVIEW_OUTPUT_SIZE = 3200; // Crisp 8px/tile high-resolution preview

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
const SCRATCH_DIR = path.resolve(ROOT_DIR, 'scratch');
const ARTIFACT_DIR = path.resolve(process.cwd(), 'scratch/maps');

interface RegionConfig {
  readonly id: string;
  readonly name: string;
  readonly seed: number;
  readonly mountainPalette: 'brown' | 'gray';
}

const REGIONS: readonly RegionConfig[] = [
  {
    id: 'region_1_archipielago_austral',
    name: 'Region 1: Archipiélago Austral (Seed 7741 - Bahía Sur & Surf)',
    seed: 7741,
    mountainPalette: 'brown'
  },
  {
    id: 'region_2_cordillera_central',
    name: 'Region 2: Cordillera Central (Seed 2305 - Herradura & Túnel)',
    seed: 2305,
    mountainPalette: 'gray'
  },
  {
    id: 'region_3_delta_fluvial',
    name: 'Region 3: Delta Fluvial (Seed 5589 - Rutas de Llanura & Costa)',
    seed: 5589,
    mountainPalette: 'brown'
  }
];

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

async function renderRegion(config: RegionConfig): Promise<Buffer> {
  console.log(`\n========================================`);
  console.log(`Generando a escala 400x400: ${config.name}`);
  console.log(`========================================`);

  const result: PokemonContinentalWorldResult = generatePokemonContinentalWorld({
    seed: config.seed,
    width: MAP_SIZE,
    height: MAP_SIZE,
    mountainPalette: config.mountainPalette,
    tileScale: TILE_SIZE
  });

  const { continent, graph, embedded, progression, svgMarkup, pois, pathGrid, bridgeGrid, wilderness } = result;

  console.log(`Nodos en grafo: ${graph.nodes.length} (8 gimnasios + starter + liga)`);
  console.log(`Corredores ortogonales: ${embedded.corridors.length}`);
  console.log(`Solvabilidad anti-softlock: ${progression.isSolvable ? '100% GARANTIZADA' : 'FALLO'}`);
  console.log(`Asentamientos urbanos generados: ${pois.length}`);

  const canvasWidth = continent.width * TILE_SIZE;
  const canvasHeight = continent.height * TILE_SIZE;
  const canvasBuffer = Buffer.alloc(canvasWidth * canvasHeight * 4);
  const canvasU32 = new Uint32Array(canvasBuffer.buffer, canvasBuffer.byteOffset, canvasBuffer.byteLength / 4);

  // Background ocean deep: #102040 (r: 16, g: 32, b: 64, a: 255) -> little-endian 0xFF402010
  canvasU32.fill(0xFF402010);

  const blitTile = (img: RawImage, destX: number, destY: number): void => {
    const { width: tw, height: th, dataU32 } = img;
    for (let r = 0; r < th; r++) {
      const dy = destY + r;
      if (dy < 0 || dy >= canvasHeight) continue;
      const dstRowOffset = dy * canvasWidth;
      const srcRowOffset = r * tw;

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
          const rD = (((pixel & 0xFF) * a) + ((bg & 0xFF) * invA)) | 0;
          const gD = ((((pixel >> 8) & 0xFF) * a) + (((bg >> 8) & 0xFF) * invA)) | 0;
          const bD = ((((pixel >> 16) & 0xFF) * a) + (((bg >> 16) & 0xFF) * invA)) | 0;
          canvasU32[dstIdx] = (255 << 24) | (bD << 16) | (gD << 8) | rD;
        }
      }
    }
  };

  // Compile instructions across all 8 layers (base ground, water, paths, bridges, cliffs, tall grass, Y-depth standing entities)
  const { instructions } = buildMapBlitInstructions(
    continent,
    pois,
    pathGrid,
    bridgeGrid,
    wilderness
  );
  console.log(`Instrucciones de blit compiladas: ${instructions.length} tiles/prefabs`);

  const t0 = performance.now();
  for (const inst of instructions) {
    const img = await getRawTile(inst.filename);
    if (img) {
      blitTile(img, inst.px, inst.py);
    }
  }
  const t1 = performance.now();
  console.log(`Renderizado pixel-art 400x400 completado en ${(t1 - t0).toFixed(1)}ms!`);

  // Composite Terrain Base Image resized cleanly to PREVIEW_OUTPUT_SIZE
  const terrainImage = sharp(canvasBuffer, {
    raw: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4
    }
  }).resize(PREVIEW_OUTPUT_SIZE, PREVIEW_OUTPUT_SIZE, { kernel: sharp.kernel.nearest });

  // Save standalone pure pixel-art image
  if (!fs.existsSync(SCRATCH_DIR)) fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  const pixelArtScratch = path.join(SCRATCH_DIR, `${config.id}_pixelart.png`);
  await terrainImage.clone().png({ compressionLevel: 6 }).toFile(pixelArtScratch);

  // Render SVG overlay on top of terrain
  const svgScratch = path.join(SCRATCH_DIR, `${config.id}_routes.svg`);
  fs.writeFileSync(svgScratch, svgMarkup, 'utf8');

  // Scale SVG markup viewBox to PREVIEW_OUTPUT_SIZE
  const scaledSvg = svgMarkup.replace(
    /width="(\d+)"\s+height="(\d+)"/,
    `width="${PREVIEW_OUTPUT_SIZE}" height="${PREVIEW_OUTPUT_SIZE}"`
  );
  const svgBuffer = Buffer.from(scaledSvg);

  const finalImageBuffer = await terrainImage
    .composite([
      {
        input: svgBuffer,
        top: 0,
        left: 0
      }
    ])
    .png({ compressionLevel: 6 })
    .toBuffer();

  const outScratch = path.join(SCRATCH_DIR, `${config.id}.png`);
  await sharp(finalImageBuffer).toFile(outScratch);
  console.log(`Imagen generada: ${outScratch}`);

  if (fs.existsSync(ARTIFACT_DIR)) {
    const outArtifact = path.join(ARTIFACT_DIR, `${config.id}.png`);
    fs.copyFileSync(outScratch, outArtifact);
    const pixelArtArtifact = path.join(ARTIFACT_DIR, `${config.id}_pixelart.png`);
    fs.copyFileSync(pixelArtScratch, pixelArtArtifact);
    const svgArtifact = path.join(ARTIFACT_DIR, `${config.id}_routes.svg`);
    fs.copyFileSync(svgScratch, svgArtifact);
    console.log(`Copiado a artefacto: ${outArtifact} y ${pixelArtArtifact}`);
  }

  return finalImageBuffer;
}

async function main(): Promise<void> {
  console.log(`\n======================================================`);
  console.log(`Iniciando generador de regiones Pokémon reales`);
  console.log(`======================================================`);

  const renderedBuffers: Buffer[] = [];
  for (const reg of REGIONS) {
    const buf = await renderRegion(reg);
    renderedBuffers.push(buf);
  }

  // 4. Create 3x1 comparison banner
  console.log(`\nEnsamblando comparativa de 3 regiones...`);
  const bannerWidth = 1024;
  const bannerHeight = 1024;

  const overlays: sharp.OverlayOptions[] = [];
  for (let i = 0; i < renderedBuffers.length; i++) {
    const resized = await sharp(renderedBuffers[i]!)
      .resize(bannerWidth, bannerHeight, { kernel: sharp.kernel.nearest })
      .toBuffer();

    overlays.push({
      input: resized,
      left: i * bannerWidth,
      top: 0
    });
  }

  const collageBase = sharp({
    create: {
      width: bannerWidth * 3,
      height: bannerHeight,
      channels: 4,
      background: { r: 10, g: 15, b: 25, alpha: 1 }
    }
  });

  const collageScratch = path.join(SCRATCH_DIR, 'regiones_pokemon_comparativa_3x.png');
  await collageBase.composite(overlays).png().toFile(collageScratch);
  console.log(`Comparativa guardada en: ${collageScratch}`);

  if (fs.existsSync(ARTIFACT_DIR)) {
    const collageArtifact = path.join(ARTIFACT_DIR, 'regiones_pokemon_comparativa_3x.png');
    fs.copyFileSync(collageScratch, collageArtifact);
    console.log(`Comparativa copiada a artefacto: ${collageArtifact}`);
  }

  console.log(`\nProceso completado exitosamente: 3 mapas reales + SVGs + 1 comparativa.`);
}

main().catch((err) => {
  console.error('Error generando previsualizaciones de regiones Pokémon:', err);
  process.exit(1);
});
