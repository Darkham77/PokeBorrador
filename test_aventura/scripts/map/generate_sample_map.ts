/**
 * scripts/map/generate_sample_map.ts
 *
 * SAMPLE MAP GENERATOR & VISUAL COMPOSITOR (Node.js 26+)
 *
 * Generates a 30x30 tiles procedural sample map (480x480 px) using the new
 * canonical tile library and composites all layers into a pixel-perfect PNG.
 *
 * Usage:
 *   npm run map:generate-sample
 *   npm run map:generate-sample seed=42 theme=firered
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  TilesRegistryService,
  type TilesRegistryJson
} from '../../src/logic/map/tilesRegistry.ts';
import {
  generateProceduralMap,
  type MapType
} from '../../src/logic/map/proceduralMapGenerator.ts';
import type { CanonicalThemeSource } from '../../src/types/map/adventureWorldTypes.ts';

const REGISTRY_FILE = path.resolve('public/assets/tiles_registry.json');
const OUT_DIR = path.resolve('scratch/map_lab');
const ARTIFACT_DIRS = [ // no-domain: Estructura o identificador procedural de aventura
  path.resolve(process.cwd(), 'scratch/maps'),
  path.resolve(process.cwd(), 'scratch/maps')
] as const;

async function generateSampleMap() {
  console.log('======================================================================');
  console.log('🗺️ POKÉ VICIO: PROCEDURAL SAMPLE MAP COMPOSITOR');
  console.log('======================================================================');
  const startTime = Date.now();

  const args = process.argv.slice(2);
  const seedArg = parseInt(
    args.find(a => a.startsWith('seed='))?.split('=')[1] || '42',
    10
  );
  const themeArg = (args.find(a => a.startsWith('theme='))?.split('=')[1] || 'firered') as CanonicalThemeSource;
  const typeArg = (args.find(a => a.startsWith('type='))?.split('=')[1] || 'route') as MapType;
  const widthArg = parseInt(
    args.find(a => a.startsWith('width='))?.split('=')[1] || '50',
    10
  );
  const heightArg = parseInt(
    args.find(a => a.startsWith('height='))?.split('=')[1] || widthArg.toString(),
    10
  );
  const scaleArg = parseInt(
    args.find(a => a.startsWith('scale='))?.split('=')[1] || '2',
    10
  );

  const outFileName = `sample_generated_${typeArg}_${widthArg}x${heightArg}.png`;
  const OUT_FILE = path.join(OUT_DIR, outFileName);

  if (!fs.existsSync(REGISTRY_FILE)) {
    throw new Error(`Registry file not found: ${REGISTRY_FILE}. Please run npm run tiles:process first.`);
  }

  console.log(`📖 Loading canonical tile registry from: ${REGISTRY_FILE}...`);
  const rawData = fs.readFileSync(REGISTRY_FILE, 'utf-8');
  const registryData = JSON.parse(rawData) as TilesRegistryJson;
  const registryService = new TilesRegistryService(registryData);

  console.log(`✨ Registry loaded: ${registryService.count.toLocaleString()} tiles available.`);
  console.log(`🎲 Generating ${widthArg}x${heightArg} map (Seed: ${seedArg}, Theme: ${themeArg}, Mode: ${typeArg})...`);

  const generatedMap = generateProceduralMap(
    {
      width: widthArg,
      height: heightArg,
      seed: seedArg,
      theme: themeArg,
      type: typeArg,
      withWater: true,
      withHills: true,
      withVegetation: true,
      withTown: typeArg === 'town'
    },
    registryService
  );

  const mapW = generatedMap.width;
  const mapH = generatedMap.height;
  const tSize = generatedMap.tileSize;
  const pixelW = mapW * tSize;
  const pixelH = mapH * tSize;

  console.log(`🚪 Entities detected: ${generatedMap.entities.warps.length} warps, ${generatedMap.entities.spawns.length} spawns.`);

  console.log(`🎨 Compositing ${generatedMap.totalTilesPlaced} placed tiles into ${pixelW}x${pixelH} px canvas...`);

  const compositeOperations: sharp.OverlayOptions[] = [];

  // Helper to push tile image overlay
  const addTileOverlay = (relPath: string, gx: number, gy: number) => {
    const diskPath = path.resolve('public', relPath.replace(/^\//, ''));
    if (fs.existsSync(diskPath)) {
      compositeOperations.push({
        input: diskPath,
        left: gx * tSize,
        top: gy * tSize
      });
    }
  };

  // 1. Base Layer (Ground / Paths)
  for (let y = 0; y < mapH; y++) {
    for (let x = 0; x < mapW; x++) {
      const cell = generatedMap.baseLayer[y]![x];
      if (cell) addTileOverlay(cell.filePath, x, y);
    }
  }

  // 2. Elevation / Water Layer
  for (let y = 0; y < mapH; y++) {
    for (let x = 0; x < mapW; x++) {
      const cell = generatedMap.elevationLayer[y]![x];
      if (cell) addTileOverlay(cell.filePath, x, y);
    }
  }

  // 3. Object / Vegetation Layer
  for (let y = 0; y < mapH; y++) {
    for (let x = 0; x < mapW; x++) {
      const cell = generatedMap.objectLayer[y]![x];
      if (cell) addTileOverlay(cell.filePath, x, y);
    }
  }

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  // Create transparent base canvas and composite all overlays
  const rawPng = await sharp({
    create: {
      width: pixelW,
      height: pixelH,
      channels: 4,
      background: { r: 64, g: 128, b: 40, alpha: 1 } // GBA grass green fallback
    }
  })
    .composite(compositeOperations)
    .png()
    .toBuffer();

  const finalBuffer = scaleArg > 1
    ? await sharp(rawPng).resize(pixelW * scaleArg, pixelH * scaleArg, { kernel: sharp.kernel.nearest }).png().toBuffer()
    : rawPng;

  await sharp(finalBuffer).toFile(OUT_FILE);

  // Copy to brain artifacts directory for easy inspection
  for (const dir of ARTIFACT_DIRS) {
    if (fs.existsSync(dir)) {
      const artifactOut = path.join(dir, outFileName);
      fs.copyFileSync(OUT_FILE, artifactOut);
      console.log(`🖼️ Artifact copied to: ${artifactOut}`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('======================================================================');
  console.log(`✅ VISUAL SAMPLE GENERATED SUCCESSFULLY IN ${elapsed}s!`);
  console.log(`📁 File: ${OUT_FILE}`);
  console.log(`📐 Dimensions: ${pixelW * scaleArg}x${pixelH * scaleArg} px (${widthArg}x${heightArg} tiles, scaled ${scaleArg}x)`);
  console.log('======================================================================\n');
}

generateSampleMap().catch(err => {
  console.error('❌ Sample Map Generator Error:', err);
  process.exit(1);
});
