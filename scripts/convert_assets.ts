/**
 * scripts/convert_assets.ts
 * 
 * ZERO-CONFIG ASSET PIPELINE (Node.js 26+)
 * 
 * Escanea _raw-assets, convierte a WebP y espeja la estructura en el proyecto.
 * Soporta modo Lossless para Pixel Art y Lossy para el resto.
 * Limpia la carpeta de destino antes de iniciar para evitar basura de archivos movidos.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';
import { MAP_ROUTE_MAPPING } from '../src/data/map-assets.ts';

// Speed up execution
enableCompileCache();

const SOURCE_DIR = path.resolve(process.cwd(), '_raw-assets');
const PUBLIC_ASSETS_DIR = path.resolve(process.cwd(), 'public', 'assets');

const environmentFiles: string[] = [];

const pokemonFeetDatabase: Record<string, { feetY: number; feetX: number }> = {};

async function calculateFeetPoints(filePath: string): Promise<{ feetY: number; feetX: number }> {
  try {
    const { data, info } = await sharp(filePath).raw().toBuffer({ resolveWithObject: true });
    const width = info.width;
    const height = info.height;
    const channels = info.channels;

    if (channels < 4) {
      return { feetY: 0.9, feetX: 0.5 };
    }

    let minX = width;
    let maxX = 0;
    let lowestY = -1;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * channels;
        const alpha = data[index + 3] ?? 0;
        if (alpha > 50) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y > lowestY) lowestY = y;
        }
      }
    }

    if (lowestY !== -1) {
      const centerX = (minX + maxX) / 2;
      return {
        feetY: Number((lowestY / height).toFixed(4)),
        feetX: Number((centerX / width).toFixed(4))
      };
    }
  } catch (err) {
    console.error(`Error calculating feet for ${filePath}:`, err);
  }
  return { feetY: 0.9, feetX: 0.5 };
}


async function getFilesToConvert(dir: string): Promise<string[]> {
  const files: string[] = [];
  const pattern = '**/*.{png,jpg,jpeg,webp}';
  
  for await (const entry of fs.glob(pattern, { cwd: dir })) {
    files.push(path.resolve(dir, entry));
  }
  return files;
}

async function processFile(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) return;

  try {
    const relPath = path.relative(SOURCE_DIR, filePath);
    const destPath = path.join(process.cwd(), relPath);
    const destDir = path.dirname(destPath);
    const destFile = path.join(destDir, `${path.parse(destPath).name}.webp`);

    await fs.mkdir(destDir, { recursive: true });

    // Determinamos si es Pixel Art para usar Lossless
    const isLossless = ['sprites', 'icons', 'badges', 'items', 'pixel'].some(p => 
      filePath.toLowerCase().includes(p)
    );

    let image = sharp(filePath);
    const metadata = await image.metadata();

    // Configuración de WebP adaptativa según dimensiones
    const webpOptions: sharp.WebpOptions = { effort: 6 };
    if (isLossless) {
      webpOptions.lossless = true;
    } else {
      const maxDim = Math.max(metadata.width || 0, metadata.height || 0);
      if (maxDim < 400) {
        webpOptions.quality = 100;
      } else if (maxDim < 1000) {
        webpOptions.quality = 95;
      } else {
        webpOptions.quality = 80;
      }
    }

    const pathSegments = relPath.split(path.sep);
    const isMap = pathSegments.includes('maps');

    if (isMap) {
      image = image.resize({ width: 600, kernel: 'nearest' });
    }

    await image.webp(webpOptions).toFile(destFile);
    console.log(styleText('green', `   [OK] ${path.relative(process.cwd(), destFile)} (${isLossless ? 'Lossless' : 'Lossy'})`));

    // Generar versión móvil optimizada para mapas
    if (isMap) {
      const destMobileFile = path.join(destDir, `${path.parse(destPath).name}_mobile.webp`);
      await sharp(filePath)
        .resize({ width: 400, kernel: 'nearest' })
        .webp(webpOptions)
        .toFile(destMobileFile);
      console.log(styleText('green', `   [OK] ${path.relative(process.cwd(), destMobileFile)} (Mobile 400px Nearest)`));
    }

    // Guardar nombre del archivo de environment para catalogación dinámica posterior
    if (destDir.includes('environment')) {
      const name = path.parse(destPath).name;
      environmentFiles.push(name);
    }

    // Convertir relPath a POSIX nativamente para consistencia en base de datos y URLs
    const posixRelPath = relPath.split(path.sep).join(path.posix.sep);

    // Calcular coordenadas de anclaje de Pokémon
    const isPokemonSprite = posixRelPath.toLowerCase().includes('sprites/pokemon') && 
                            !posixRelPath.toLowerCase().includes('sprites/pokemon/egg');
    if (isPokemonSprite) {
      const normalizedPath = '/' + posixRelPath.replace(/^public\//, '').replace(/\.(png|jpg|jpeg|webp)$/i, '.webp');
      const points = await calculateFeetPoints(filePath);
      pokemonFeetDatabase[normalizedPath] = points;
    }


  } catch (err: unknown) {
    console.error(styleText('red', `   [ERROR] No se pudo procesar ${filePath}: ${(err as Error).message}`));
  }
}

async function main() {
  console.log(styleText('bold', '\n--- 🖼️  ASSET PIPELINE ---'));
  
  try {
    await fs.access(SOURCE_DIR);
  } catch {
    console.error(styleText('red', `Error: Directorio fuente '${SOURCE_DIR}' no encontrado.`));
    process.exit(1);
  }

  // Limpieza determinista: borrar public/assets antes de reconstruir
  console.log(styleText('yellow', `   🧹 Limpiando ${path.relative(process.cwd(), PUBLIC_ASSETS_DIR)}...`));
  await fs.rm(PUBLIC_ASSETS_DIR, { recursive: true, force: true });
  await fs.mkdir(PUBLIC_ASSETS_DIR, { recursive: true });

  const files = await getFilesToConvert(SOURCE_DIR);
  console.log(styleText('yellow', `   Encontrados ${files.length} archivos en _raw-assets.\n`));

  for (const file of files) {
    await processFile(file);
  }

  // Ordenar y autogenerar el catálogo de ex-arbustos en TypeScript
  console.log(styleText('yellow', `\n   📦 Generando catálogo de coberturas ambientales en src/logic/environment/bushCatalog.ts...`));
  
  // Agrupar y catalogar archivos de environment de forma dinámica
  const repeatedPrefixes = new Set<string>();
  const prefixCounts = new Map<string, number>();
  const filePrefixes = new Map<string, string>();

  for (const filename of environmentFiles) {
    const match = filename.match(/^([a-zA-Z]+)-(\d+)$/);
    if (match && match[1]) {
      const prefix = match[1];
      filePrefixes.set(filename, prefix);
      prefixCounts.set(prefix, (prefixCounts.get(prefix) || 0) + 1);
    }
  }

  for (const [prefix, count] of prefixCounts.entries()) {
    if (count >= 1) {
      repeatedPrefixes.add(prefix);
    }
  }

  const dynamicCatalog: Record<string, string[]> = {};
  
  for (const prefix of repeatedPrefixes) {
    dynamicCatalog[prefix] = [];
  }

  for (const filename of environmentFiles) {
    const prefix = filePrefixes.get(filename);
    if (prefix && repeatedPrefixes.has(prefix)) {
      const catalogArr = dynamicCatalog[prefix];
      if (catalogArr) {
        catalogArr.push(filename);
      }
    }
  }

  // Ordenar cada categoría alfabéticamente/numéricamente
  for (const key of Object.keys(dynamicCatalog)) {
    const catalogArr = dynamicCatalog[key];
    if (catalogArr) {
      catalogArr.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }
  }

  const catalogDir = path.resolve(process.cwd(), 'src', 'logic', 'environment');
  await fs.mkdir(catalogDir, { recursive: true });
  const catalogPath = path.join(catalogDir, 'bushCatalog.ts');

  // Contar los elementos para el log
  const logDetails = Object.keys(dynamicCatalog).map(k => `${dynamicCatalog[k]?.length ?? 0} ${k}`).join(', ');

  const catalogContent = `/**
 * src/logic/environment/bushCatalog.ts
 * 
 * ARCHIVO AUTOGENERADO POR scripts/convert_assets.ts - NO EDITAR MANUALMENTE
 * 
 * Contiene el inventario descubierto de assets ambientales para coberturas de combate.
 */

export const BUSH_FAMILIES = ${JSON.stringify(dynamicCatalog, null, 2)} as const;

export type BushFamily = keyof typeof BUSH_FAMILIES;
`;

  await fs.writeFile(catalogPath, catalogContent, 'utf-8');
  console.log(styleText('green', `   [OK] Catálogo generado con éxito: ${logDetails || 'Ninguno'}.`));

  // Escanear y autogenerar catálogo de mapas de combate en src/data/map-assets.ts
  console.log(styleText('yellow', `\n   📦 Generando catálogo de mapas de combate en src/data/map-assets.ts...`));
  const battleMapsSourceDir = path.resolve(SOURCE_DIR, 'public', 'assets', 'maps_battle');
  const battleMaps: string[] = [];
  try {
    const entries = await fs.readdir(battleMapsSourceDir);
    for (const entry of entries) {
      const ext = path.extname(entry).toLowerCase();
      if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
        battleMaps.push(path.parse(entry).name);
      }
    }
  } catch (err) {
    console.log(styleText('yellow', `   ⚠️ Warning: No se pudo leer maps_battle para el catálogo: ${(err as Error).message}`));
  }
  battleMaps.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  // Validación: asegurar que cada mapa en MAP_ROUTE_MAPPING tenga al menos una versión de combate
  console.log(styleText('yellow', `   🔍 Validando correspondencia de mapas de combate...`));
  const missingMaps: string[] = [];
  const suffixes = ['_dia', '_noche', '_atardecer', '_amanecer'];

  for (const [routeId, baseName] of Object.entries(MAP_ROUTE_MAPPING)) {
    const hasBase = battleMaps.includes(baseName);
    const hasAnySuffix = suffixes.some(suffix => battleMaps.includes(`${baseName}${suffix}`));
    if (!hasBase && !hasAnySuffix) {
      missingMaps.push(`${routeId} (${baseName})`);
    }
  }

  if (missingMaps.length > 0) {
    console.error(styleText('red', `\n   ❌ ERROR: No se encontró ningún fondo de combate para las siguientes rutas:`));
    for (const missing of missingMaps) {
      console.error(styleText('red', `      - ${missing}`));
    }
    console.error(styleText('red', `   Por favor, añade al menos la versión base o una con ciclo (_dia, _noche, etc.) en _raw-assets/public/assets/maps_battle/\n`));
    process.exit(1);
  }
  console.log(styleText('green', `   [OK] Todos los mapas tienen su correspondiente fondo de combate.`));

  const mapAssetsPath = path.resolve(process.cwd(), 'src', 'data', 'map-assets.ts');
  let mapAssetsContent = await fs.readFile(mapAssetsPath, 'utf-8');
  
  const marker = 'export const AVAILABLE_BATTLE_MAPS';
  const markerIndex = mapAssetsContent.indexOf(marker);
  if (markerIndex !== -1) {
    mapAssetsContent = mapAssetsContent.substring(0, markerIndex).trimEnd() + '\n';
  } else {
    mapAssetsContent = mapAssetsContent.trimEnd() + '\n';
  }

  const generatedContent = `${mapAssetsContent}
export const AVAILABLE_BATTLE_MAPS = ${JSON.stringify(battleMaps, null, 2)} as const;
`;

  await fs.writeFile(mapAssetsPath, generatedContent, 'utf-8');
  console.log(styleText('green', `   [OK] Catálogo de mapas de combate integrado en src/data/map-assets.ts (${battleMaps.length} mapas)`));

  // Generar base de datos inmutable de anclaje de pies de Pokémon
  console.log(styleText('yellow', `\n   📦 Generando base de datos estática de anclajes en src/data/pokemonFeetDatabase.ts...`));
  const databaseDir = path.resolve(process.cwd(), 'src', 'data');
  await fs.mkdir(databaseDir, { recursive: true });
  const databasePath = path.join(databaseDir, 'pokemonFeetDatabase.ts');

  // Ordenar las claves alfabéticamente para limpieza
  const sortedDatabase: Record<string, { feetY: number; feetX: number }> = {};
  for (const key of Object.keys(pokemonFeetDatabase).sort()) {
    sortedDatabase[key] = pokemonFeetDatabase[key]!;
  }

  const databaseContent = `/**
 * src/data/pokemonFeetDatabase.ts
 * 
 * ARCHIVO INMUTABLE Y AUTOGENERADO POR scripts/convert_assets.ts - NO MODIFICAR MANUALMENTE
 * 
 * Contiene las coordenadas de anclaje de pies (feetX y feetY) precalculadas para cada sprite.
 */

export interface FeetPoints {
  readonly feetY: number;
  readonly feetX: number;
}

export const POKEMON_FEET_DATABASE: Readonly<Record<string, FeetPoints>> = ${JSON.stringify(sortedDatabase, null, 2)} as const;
`;

  await fs.writeFile(databasePath, databaseContent, 'utf-8');
  console.log(styleText('green', `   [OK] Base de datos de anclaje generada con éxito (${Object.keys(sortedDatabase).length} sprites precalculados).`));

  console.log(styleText('bold', '\n✨ Proceso de assets finalizado.\n'));
}

main();

