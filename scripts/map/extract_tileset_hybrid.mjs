/**
 * scripts/map/extract_tileset_hybrid.mjs
 *
 * Hybrid Tileset Slicer: Slices tilesets into atomic 32x32 tiles and prefabs,
 * computing color heuristics and placing them into scratch/map_lab/tilesets/staged/.
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { parseArgs, styleText } from 'node:util';

const DEFAULT_INBOX = path.resolve('scratch/map_lab/tilesets/inbox');
const DEFAULT_STAGED = path.resolve('scratch/map_lab/tilesets/staged');

function printHelp() {
  console.log(`
${styleText('bold', '✂️ POKÉ VICIO - HYBRID TILESET EXTRACTOR')}

Uso:
  npm run map:tiles:extract [opciones]
  node ./scripts/map/extract_tileset_hybrid.mjs [opciones]

Opciones:
  --help, -h          Muestra este mensaje de ayuda
  --tileSize=<16|32>  Tamaño de celda en píxeles (por defecto: 32)
  --inbox=<dir>       Carpeta de entrada con hojas raw (por defecto: scratch/map_lab/tilesets/inbox)
  --out=<dir>         Carpeta de salida para tiles staged (por defecto: scratch/map_lab/tilesets/staged)

Ejemplos:
  npm run map:tiles:extract
  npm run map:tiles:extract tileSize=16
`);
}

/**
 * Computes the average RGB and transparency stats of an image buffer.
 */
async function analyzeCell(imageSharp) {
  const { data, info } = await imageSharp
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let visiblePixels = 0;

  for (let i = 0; i < data.length; i += channels) {
    const a = channels === 4 ? data[i + 3] : 255;
    if (a > 10) {
      totalR += data[i];
      totalG += data[i + 1];
      totalB += data[i + 2];
      visiblePixels++;
    }
  }

  const isBlank = visiblePixels < 16; // less than 16 non-transparent pixels is blank noise
  if (isBlank) {
    return { isBlank: true };
  }

  const avgR = Math.round(totalR / visiblePixels);
  const avgG = Math.round(totalG / visiblePixels);
  const avgB = Math.round(totalB / visiblePixels);

  // Simple color heuristic for suggested categorization
  let suggested = 'decorations';
  if (avgB > avgR + 25 && avgB > avgG) {
    suggested = 'water_shores';
  } else if (avgG > avgR + 15 && avgG > avgB + 15) {
    suggested = 'grass_edges';
  } else if (avgR > 130 && avgG > 100 && avgB < 90) {
    suggested = 'paths';
  } else if (avgR > 100 && avgG > 70 && avgB < 70 && avgR > avgB + 20) {
    suggested = 'mountains';
  } else if (avgR > 140 && avgG < 80 && avgB < 80) {
    suggested = 'buildings';
  }

  return {
    isBlank: false,
    visiblePixels,
    avgR,
    avgG,
    avgB,
    suggested
  };
}

async function main() {
  const { values, positionals } = parseArgs({
    options: {
      help: { type: 'boolean', short: 'h' },
      tileSize: { type: 'string' },
      inbox: { type: 'string' },
      out: { type: 'string' }
    },
    allowPositionals: true,
    strict: false
  });

  if (values.help || positionals.includes('help')) {
    printHelp();
    process.exit(0);
  }

  for (const pos of positionals) {
    if (pos.includes('=')) {
      const [k, v] = pos.split('=');
      if (k === 'tileSize') values.tileSize = v;
      if (k === 'inbox') values.inbox = v;
      if (k === 'out') values.out = v;
    }
  }

  const tileSize = values.tileSize ? parseInt(values.tileSize, 10) : 32;
  const inboxDir = path.resolve(values.inbox || DEFAULT_INBOX);
  const outDir = path.resolve(values.out || DEFAULT_STAGED);

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log(styleText('bold', '\n======================================================================'));
  console.log(styleText('bold', '✂️ POKÉ VICIO: EXTRACTOR HÍBRIDO DE TILESETS'));
  console.log(styleText('dim', `📁 Inbox:     ${inboxDir}`));
  console.log(styleText('dim', `📦 Staged:    ${outDir}`));
  console.log(styleText('dim', `📐 Tile Size: ${tileSize}x${tileSize} px`));
  console.log(styleText('bold', '======================================================================\n'));

  if (!fs.existsSync(inboxDir)) {
    console.log(styleText('yellow', `No existe el directorio inbox: ${inboxDir}`));
    return;
  }

  const rawFiles = fs.readdirSync(inboxDir).filter(f => /\.(png|jpe?g|webp)$/i.test(f));
  if (rawFiles.length === 0) {
    console.log(styleText('yellow', `No se encontraron imágenes en ${inboxDir}. Ejecuta 'npm run map:tiles:download' primero.`));
    return;
  }

  const stagedManifest = [];
  let totalExtracted = 0;

  for (let fileIdx = 0; fileIdx < rawFiles.length; fileIdx++) {
    const rawFile = rawFiles[fileIdx];
    const rawPath = path.join(inboxDir, rawFile);
    const baseName = path.parse(rawFile).name;

    console.log(`[${fileIdx + 1}/${rawFiles.length}] Procesando lámina: ${styleText('cyan', rawFile)}...`);

    const imageSharp = sharp(rawPath);
    const meta = await imageSharp.metadata();

    if (!meta.width || !meta.height) {
      console.warn(`    ${styleText('red', 'Ignorando imagen con dimensiones inválidas')}`);
      continue;
    }

    const cols = Math.floor(meta.width / tileSize);
    const rows = Math.floor(meta.height / tileSize);
    console.log(`    Dimensiones: ${meta.width}x${meta.height} px (${cols} columnas x ${rows} filas = ${cols * rows} celdas)`);

    let extractedFromSheet = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const left = c * tileSize;
        const top = r * tileSize;

        const cellSharp = sharp(rawPath).extract({
          left,
          top,
          width: tileSize,
          height: tileSize
        });

        const analysis = await analyzeCell(cellSharp);
        if (analysis.isBlank) {
          continue; // skip blank / invisible cell
        }

        const outFileName = `${baseName}_r${r}_c${c}.png`;
        const outFilePath = path.join(outDir, outFileName);

        await cellSharp.png().toFile(outFilePath);

        stagedManifest.push({
          file: outFileName,
          sourceSheet: rawFile,
          row: r,
          col: c,
          tileSize,
          width: tileSize,
          height: tileSize,
          suggestedSubcategory: analysis.suggested,
          dominantColor: { r: analysis.avgR, g: analysis.avgG, b: analysis.avgB }
        });

        extractedFromSheet++;
      }
    }

    console.log(`    ${styleText('green', `✓ Extraídos ${extractedFromSheet} tiles válidos`)} (descartadas celdas vacías).\n`);
    totalExtracted += extractedFromSheet;
  }

  const manifestPath = path.join(outDir, 'staged_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(stagedManifest, null, 2), 'utf8');

  console.log(styleText('bold', `🎉 Segmentación completada: ${totalExtracted} tiles listos en 'staged/'.`));
  console.log(styleText('dim', `Manifiesto generado en: ${manifestPath}`));
  console.log(styleText('dim', `Siguiente paso: Inicia el visor web con 'npm run map:tiles:studio' para clasificar.\n`));
}

main().catch(err => {
  console.error(styleText('red', `Error: ${err.message}`));
  process.exit(1);
});
