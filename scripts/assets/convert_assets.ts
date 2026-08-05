// fallow-ignore-file security-sink
/**
 * scripts/convert_assets.ts
 * 
 * ZERO-CONFIG ASSET PIPELINE (Node.js 26+) - MULTICORE OPTIMIZED
 * 
 * Escanea _raw-assets, convierte a WebP en paralelo y genera catálogos y bases de datos.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { isMainThread, parentPort, Worker } from 'node:worker_threads';
import sharp from 'sharp';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';
import { MAP_ROUTE_MAPPING } from '../../src/data/world/map-assets.ts';
import { TRAINER_TYPES } from '../../src/data/player/trainerTypes.ts';
import { Dex, toID } from '@pkmn/sim';
import { safeResolve, safeJoin } from '../lib/safePath.ts';

// Speed up execution
enableCompileCache();

const SOURCE_DIR = safeResolve(process.cwd(), '_raw-assets');
const PUBLIC_ASSETS_DIR = safeResolve(process.cwd(), 'public', 'assets');

export interface AnimatedSpriteData {
  readonly frames: number;
  readonly size: number;
  readonly feetY: number;
  readonly feetX: number;
  readonly bodyH: number;
  readonly bodyW: number;
  readonly bodyRadius: number;
}

// Interfaces para comunicación de Workers
interface ProcessTask {
  type: 'processFile';
  filePath: string;
}

interface AnalyzeTask {
  type: 'analyzeAnimated';
  filePath: string;
}

type WorkerTask = ProcessTask | AnalyzeTask;

interface ProcessResult {
  type: 'processFile';
  filePath: string;
  success: boolean;
  environmentFile?: string;
  feetPoints?: { feetY: number; feetX: number };
  isMap?: boolean;
  destFiles: string[];
  error?: string;
}

interface AnalyzeResult {
  type: 'analyzeAnimated';
  filePath: string;
  success: boolean;
  spriteKey: string;
  animatedData?: AnimatedSpriteData;
  error?: string;
}

type WorkerResult = ProcessResult | AnalyzeResult;

// ============================================================================
// LÓGICA DEL WORKER (HILO SECUNDARIO)
// ============================================================================

if (!isMainThread) {
  parentPort?.on('message', async (task: WorkerTask) => {
    try {
      if (task.type === 'processFile') {
        const result = await handleProcessFile(task.filePath);
        parentPort?.postMessage({ type: 'processFile', filePath: task.filePath, ...result });
      } else if (task.type === 'analyzeAnimated') {
        const result = await handleAnalyzeAnimated(task.filePath);
        parentPort?.postMessage({ type: 'analyzeAnimated', filePath: task.filePath, ...result });
      }
    } catch (err: unknown) {
      parentPort?.postMessage({
        type: task.type,
        filePath: task.filePath,
        success: false,
        error: (err as Error).message,
        destFiles: []
      });
    }
  });
}

async function handleProcessFile(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
    return { success: false, destFiles: [], error: 'Unsupported extension' };
  }

  const relPath = path.relative(SOURCE_DIR, filePath);
  const destPath = safeJoin(process.cwd(), relPath);
  const destDir = path.dirname(destPath);
  const destFile = safeJoin(destDir, `${path.parse(destPath).name}.webp`);

  await fs.mkdir(destDir, { recursive: true });

  const isLossless = ['sprites', 'icons', 'badges', 'items', 'pixel'].some(p => 
    filePath.toLowerCase().includes(p)
  );

  let image = sharp(filePath);
  const metadata = await image.metadata();

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
  const destFiles: string[] = [destFile];

  if (isMap) {
    image = image.resize({ width: 600, kernel: 'nearest' });
  }

  await image.webp(webpOptions).toFile(destFile);

  if (isMap) {
    const destMobileFile = safeJoin(destDir, `${path.parse(destPath).name}_mobile.webp`);
    await sharp(filePath)
      .resize({ width: 400, kernel: 'nearest' })
      .webp(webpOptions)
      .toFile(destMobileFile);
    destFiles.push(destMobileFile);
  }

  let environmentFile: string | undefined;
  if (destDir.includes('environment')) {
    environmentFile = path.parse(destPath).name;
  }

  const posixRelPath = relPath.split(path.sep).join(path.posix.sep);
  let feetPoints: { feetY: number; feetX: number } | undefined;

  const isSpriteWithFeet = (posixRelPath.toLowerCase().includes('sprites/pokemon') || 
                            posixRelPath.toLowerCase().includes('sprites/trainers') ||
                            posixRelPath.toLowerCase().includes('sprites/npc')) && 
                           !posixRelPath.toLowerCase().includes('sprites/pokemon/egg');

  if (isSpriteWithFeet) {
    feetPoints = await calculateFeetPointsWorker(filePath);
  }

  return {
    success: true,
    destFiles,
    environmentFile,
    feetPoints,
    isMap
  };
}

async function calculateFeetPointsWorker(filePath: string): Promise<{ feetY: number; feetX: number }> {
  try {
    const { data, info } = await sharp(filePath).raw().toBuffer({ resolveWithObject: true });
    const width = info.width;
    const height = info.height;
    const channels = info.channels;

    if (channels < 4) {
      return { feetY: 0.9, feetX: 0.5 };
    }

    const size = Math.min(width, height);
    let minX = size;
    let maxX = 0;
    let lowestY = -1;

    // Scan the first frame to find bounding box in X
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < size; x++) {
        const index = (y * width + x) * channels;
        const alpha = data[index + 3] ?? 0;
        if (alpha > 50) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    }

    // Scan from bottom to top in the first frame to find the lowest non-empty pixel row (feetY)
    for (let y = height - 1; y >= 0; y--) {
      let rowHasOpaque = false;
      for (let x = 0; x < size; x++) {
        const index = (y * width + x) * channels;
        const alpha = data[index + 3] ?? 0;
        if (alpha > 50) {
          rowHasOpaque = true;
          break;
        }
      }
      if (rowHasOpaque) {
        lowestY = y;
        break;
      }
    }

    if (lowestY !== -1) {
      const centerX = (minX + maxX) / 2;
      return {
        feetY: Number((lowestY / height).toFixed(4)),
        feetX: Number((centerX / size).toFixed(4))
      };
    }
  } catch {
    // Silently fall back
  }
  return { feetY: 0.9, feetX: 0.5 };
}

function analyzeImageBufferBounds(data: Buffer | Uint8Array, size: number, channels: number) {
  let minX = size, maxX = 0, minY = size, maxY = 0, lowestY = -1, hasOpaque = false
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * channels
      const alpha = channels >= 4 ? (data[idx + 3] ?? 0) : 255
      if (alpha > 50) {
        hasOpaque = true
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (hasOpaque) {
    for (let y = size - 1; y >= 0; y--) {
      let rowHasOpaque = false
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * channels
        const alpha = channels >= 4 ? (data[idx + 3] ?? 0) : 255
        if (alpha > 50) { rowHasOpaque = true; break }
      }
      if (rowHasOpaque) { lowestY = y; break }
    }
  }

  let feetY = 0.9, feetX = 0.5, bodyH = 0.8, bodyW = 0.8
  if (hasOpaque && lowestY !== -1) {
    const centerX = (minX + maxX) / 2
    feetY = Number((lowestY / size).toFixed(4))
    feetX = Number((centerX / size).toFixed(4))
    bodyH = Number(((maxY - minY + 1) / size).toFixed(4))
    bodyW = Number(((maxX - minX + 1) / size).toFixed(4))
  }
  const bodyRadius = Number((bodyH / 2).toFixed(4))

  return { feetY, feetX, bodyH, bodyW, bodyRadius }
}

async function handleAnalyzeAnimated(filePath: string) {
  try {
    const spriteKey = path.parse(filePath).name;
    const image = sharp(filePath);
    const metadata = await image.metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    const frames = Math.round(width / height) || 1;
    const size = height;

    const firstFrameBuffer = await image
      .clone()
      .extract({ left: 0, top: 0, width: size, height: size })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { feetX, feetY, bodyH, bodyW, bodyRadius } = analyzeImageBufferBounds(firstFrameBuffer.data, size, firstFrameBuffer.info.channels)

    return {
      success: true,
      spriteKey,
      animatedData: {
        frames,
        size,
        feetY,
        feetX,
        bodyH,
        bodyW,
        bodyRadius
      }
    };
  } catch (err: unknown) {
    return { success: false, spriteKey: path.parse(filePath).name, error: (err as Error).message };
  }
}

// ============================================================================
// LÓGICA DEL HILO PRINCIPAL
// ============================================================================

async function getFilesToConvert(dir: string): Promise<string[]> {
  const files: string[] = [];
  const pattern = '**/*.{png,jpg,jpeg,webp}';
  
  for await (const entry of fs.glob(pattern, { cwd: dir })) {
    files.push(path.resolve(dir, entry));
  }
  return files;
}

// Orquestador de Tareas en Pool de Workers
function runTasksInParallel(tasks: WorkerTask[], maxWorkers: number): Promise<WorkerResult[]> {
  return new Promise((resolve) => {
    const results: WorkerResult[] = [];
    let activeWorkers = 0;
    let taskIndex = 0;
    const workers: Worker[] = [];

    if (tasks.length === 0) {
      resolve([]);
      return;
    }

    const startWorker = () => {
      const worker = new Worker(import.meta.filename, {
        execArgv: [...process.execArgv, '--no-warnings']
      });
      workers.push(worker);

      const sendNextTask = () => {
        if (taskIndex >= tasks.length) {
          worker.terminate();
          activeWorkers--;
          if (activeWorkers === 0) {
            resolve(results);
          }
          return;
        }

        const currentTask = tasks[taskIndex++];
        worker.postMessage(currentTask);
      };

      worker.on('message', (result: WorkerResult) => {
        results.push(result);
        sendNextTask();
      });

      worker.on('error', (err) => {
        console.error(`Worker error:`, err);
        sendNextTask();
      });

      activeWorkers++;
      sendNextTask();
    };

    const numWorkers = Math.min(maxWorkers, tasks.length);
    for (let i = 0; i < numWorkers; i++) {
      startWorker();
    }
  });
}

async function main() {
  console.log(styleText('bold', '\n--- 🖼️  ASSET PIPELINE (MULTICORE) ---'));
  
  try {
    await fs.access(SOURCE_DIR);
  } catch {
    console.error(styleText('red', `Error: Directorio fuente '${SOURCE_DIR}' no encontrado.`));
    process.exit(1);
  }

  // Limpieza determinista: borrar public/assets antes de reconstruir (no fatal si está bloqueado)
  console.log(styleText('yellow', `   🧹 Limpiando ${path.relative(process.cwd(), PUBLIC_ASSETS_DIR)}...`));
  try {
    await fs.rm(PUBLIC_ASSETS_DIR, { recursive: true, force: true });
  } catch (err) {
    console.log(styleText('yellow', `   ⚠️ Warning: No se pudo limpiar public/assets por completo (${(err as Error).message}). Se continuará con la sobreescritura de archivos.`));
  }
  await fs.mkdir(PUBLIC_ASSETS_DIR, { recursive: true });

  const files = await getFilesToConvert(SOURCE_DIR);
  console.log(styleText('yellow', `   Encontrados ${files.length} archivos en _raw-assets.\n`));

  const maxWorkers = Math.max(1, os.availableParallelism());
  console.log(styleText('blue', `   Iniciando pool con ${maxWorkers} workers en paralelo...`));

  const processTasks: WorkerTask[] = files.map(file => ({ type: 'processFile', filePath: file }));
  const processResults = await runTasksInParallel(processTasks, maxWorkers) as ProcessResult[];

  const environmentFiles: string[] = [];
  const pokemonFeetDatabase: Record<string, { feetY: number; feetX: number }> = {};

  for (const res of processResults) {
    if (!res.success) {
      console.error(styleText('red', `   [ERROR] No se pudo procesar ${res.filePath}: ${res.error}`));
      continue;
    }

    for (const dest of res.destFiles) {
      console.log(styleText('green', `   [OK] ${path.relative(process.cwd(), dest)}`));
    }

    if (res.environmentFile) {
      environmentFiles.push(res.environmentFile);
    }

    if (res.feetPoints) {
      const relPath = path.relative(SOURCE_DIR, res.filePath);
      const posixRelPath = relPath.split(path.sep).join(path.posix.sep);
      const normalizedPath = '/' + posixRelPath.replace(/^public\//, '').replace(/\.(png|jpg|jpeg|webp)$/i, '.webp');
      pokemonFeetDatabase[normalizedPath] = res.feetPoints;
    }
  }

  // Ordenar y autogenerar el catálogo de ex-arbustos en TypeScript
  console.log(styleText('yellow', `\n   📦 Generando catálogo de coberturas ambientales en src/logic/environment/bushCatalog.ts...`));
  
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

  for (const key of Object.keys(dynamicCatalog)) {
    const catalogArr = dynamicCatalog[key];
    if (catalogArr) {
      catalogArr.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }
  }

  const catalogDir = path.resolve(process.cwd(), 'src', 'logic', 'environment');
  await fs.mkdir(catalogDir, { recursive: true });
  const catalogPath = path.join(catalogDir, 'bushCatalog.ts');

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

  console.log(styleText('yellow', `   🔍 Validando correspondencia de mapas de combate...`));
  const missingMaps: string[] = [];
  const suffixes = ['_dia', '_noche', '_atardecer', '_amanecer'];

  for (const [routeId, baseName] of Object.entries(MAP_ROUTE_MAPPING)) {
    if (baseName.includes('/')) continue;
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

  const mapAssetsPath = path.resolve(process.cwd(), 'src', 'data', 'world', 'map-assets.ts');
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
export type BattleMapAssetId = (typeof AVAILABLE_BATTLE_MAPS)[number];
`;

  await fs.writeFile(mapAssetsPath, generatedContent, 'utf-8');
  console.log(styleText('green', `   [OK] Catálogo de mapas de combate integrado en src/data/map-assets.ts (${battleMaps.length} mapas)`));

  // Generar base de datos inmutable de anclaje de pies de Pokémon
  console.log(styleText('yellow', `\n   📦 Generando base de datos estática de anclajes en src/data/pokemonFeetDatabase.ts...`));
  const databaseDir = path.resolve(process.cwd(), 'src', 'data', 'pokemon');
  await fs.mkdir(databaseDir, { recursive: true });
  const databasePath = path.join(databaseDir, 'pokemonFeetDatabase.ts');

  const packed: {
    p: Record<string, [number, number]>;
    n: Record<string, [number, number]>;
    t: Record<string, [number, number]>;
    c: Record<string, string>;
  } = {
    p: {},
    n: {},
    t: {},
    c: {}
  };

  // Copiar pies de variaciones de sus correspondientes idles en pokemonFeetDatabase
  for (const key of Object.keys(pokemonFeetDatabase)) {
    const isVariation = key.includes('v') && (key.includes('/animated/Front') || key.includes('/animated/Back'));
    if (isVariation) {
      const idleKey = key.replace(/v/, 'i');
      const idleVal = pokemonFeetDatabase[idleKey];
      if (idleVal) {
        pokemonFeetDatabase[key] = idleVal;
      }
    }
  }

  for (const key of Object.keys(pokemonFeetDatabase).sort()) {
    const val = pokemonFeetDatabase[key]!;
    if (key.startsWith('/assets/sprites/pokemon/') && key.endsWith('.webp')) {
      const subKey = key.slice('/assets/sprites/pokemon/'.length, -'.webp'.length);
      packed.p[subKey] = [val.feetY, val.feetX];
    } else if (key.startsWith('/assets/sprites/npc/') && key.endsWith('.webp')) {
      const subKey = key.slice('/assets/sprites/npc/'.length, -'.webp'.length);
      packed.n[subKey] = [val.feetY, val.feetX];
    } else if (key.startsWith('/assets/sprites/trainers/') && key.endsWith('.webp')) {
      const subKey = key.slice('/assets/sprites/trainers/'.length, -'.webp'.length);
      packed.t[subKey] = [val.feetY, val.feetX];
    }
  }

  // Pre-procesar cries (gritos de Pokémon) con fallbacks
  console.log(styleText('yellow', `   🔊 Pre-procesando base de datos de gritos (cries)...`));
  const CRIES_DIR = path.resolve(process.cwd(), 'public', 'cries');
  try {
    const cryFiles = await fs.readdir(CRIES_DIR);
    const existingCries = new Set(
      cryFiles
        .filter(f => f.endsWith('.mp3') || f.endsWith('.ogg'))
        .map(f => path.parse(f).name.toLowerCase())
    );

    const missingOfficialCries: string[] = [];

    // Obtener todas las especies de Showdown
    const allSpecies = Dex.species.all();
    for (const spec of allSpecies) {
      const specId = toID(spec.name);

      // 1. Si existe su propio grito, usarlo
      if (existingCries.has(specId)) {
        packed.c[specId] = specId;
        continue;
      }

      // 2. Si no, intentar con baseSpecies (formas, megas, primales)
      const baseId = spec.baseSpecies ? toID(spec.baseSpecies) : '';
      if (baseId && existingCries.has(baseId)) {
        packed.c[specId] = baseId;
        if (spec.num > 0 && spec.isNonstandard !== 'CAP' && spec.isNonstandard !== 'Custom') {
          console.log(styleText('yellow', `      [WARN] Grito para ${spec.name} (${specId}) no encontrado. Usando fallback de especie base: ${baseId}`));
        }
        continue;
      }

      // 3. Si no, recorrer la cadena de pre-evoluciones (prevo)
      let current = spec;
      let resolved = false;
      while (current.prevo) {
        const prevSpecies = Dex.species.get(current.prevo);
        if (prevSpecies && prevSpecies.exists) {
          const prevId = toID(prevSpecies.name);
          if (existingCries.has(prevId)) {
            packed.c[specId] = prevId;
            resolved = true;
            if (spec.num > 0 && spec.isNonstandard !== 'CAP' && spec.isNonstandard !== 'Custom') {
              console.log(styleText('yellow', `      [WARN] Grito para ${spec.name} (${specId}) no encontrado. Usando fallback de pre-evolución: ${prevId}`));
            }
            break;
          }
          current = prevSpecies;
        } else {
          break;
        }
      }

      // 4. Si no se encontró ningún grito real, usar su propio ID
      if (!resolved) {
        packed.c[specId] = specId;
        // Solo lanzar error si es un Pokémon oficial / estándar
        if (spec.num > 0 && spec.isNonstandard !== 'CAP' && spec.isNonstandard !== 'Custom') {
          missingOfficialCries.push(`${spec.name} (${specId})`);
        }
      }
    }

    if (missingOfficialCries.length > 0) {
      console.error(styleText('red', `\n❌ ERROR: No se encontró ningún grito ni fallback válido para los siguientes ${missingOfficialCries.length} Pokémon oficiales:`));
      console.error(styleText('red', `   ${missingOfficialCries.join(', ')}`));
      console.error(styleText('red', `   Por favor descarga o añade los gritos correspondientes en public/cries/`));
      process.exit(1);
    }
  } catch (err) {
    console.error(styleText('red', `\n❌ ERROR: No se pudo procesar la base de datos de gritos: ${(err as Error).message}`));
    process.exit(1);
  }

  const jsonPath = path.join(databaseDir, 'pokemonFeetDatabase.json');
  await fs.writeFile(jsonPath, JSON.stringify(packed, null, 2), 'utf-8');

  const databaseContent = `/**
 * src/data/pokemonFeetDatabase.ts
 * 
 * ARCHIVO INMUTABLE Y AUTOGENERADO POR scripts/convert_assets.ts - NO MODIFICAR MANUALMENTE
 * 
 * Contiene las coordenadas de anclaje de pies (feetX y feetY) precalculadas para cada sprite,
 * así como el catálogo de mapeos de gritos (cries) de Pokémon.
 */
import { FEET_COORDINATES_DATA } from './feetCoordinatesData.ts';

export interface FeetPoints {
  readonly feetY: number;
  readonly feetX: number;
}

const PACKED_DATA = FEET_COORDINATES_DATA;

type FeetSpriteGroupKey = 'p' | 'n' | 't';
type FeetSpritePrefix = '/assets/sprites/pokemon/' | '/assets/sprites/npc/' | '/assets/sprites/trainers/';
export type FeetDatabasePath = \`\${FeetSpritePrefix}\${string}.webp\`;

export const POKEMON_FEET_DATABASE: Partial<Record<FeetDatabasePath, FeetPoints>> = {};

function requireFeetMetric(values: readonly number[], path: FeetDatabasePath, index: number): number {
  const value = values[index];
  if (value !== undefined) return value;
  throw new Error(\`[pokemonFeetDatabase] Invalid feet tuple for path: \${path}\`);
}

for (const [key, prefix] of [
  ['p', '/assets/sprites/pokemon/'],
  ['n', '/assets/sprites/npc/'],
  ['t', '/assets/sprites/trainers/']
] as const satisfies readonly (readonly [FeetSpriteGroupKey, FeetSpritePrefix])[]) {
  const group = PACKED_DATA[key];
  for (const [subKey, tuple] of Object.entries(group)) {
    const dbPath: FeetDatabasePath = \`\${prefix}\${subKey}.webp\`;
    const y = requireFeetMetric(tuple, dbPath, 0);
    const x = requireFeetMetric(tuple, dbPath, 1);
    POKEMON_FEET_DATABASE[dbPath] = { feetY: y, feetX: x };
  }
}

export function hasFeetDatabasePath(value: string): value is FeetDatabasePath {
  return Object.hasOwn(POKEMON_FEET_DATABASE, value);
}

export function requireFeetDatabasePath(value: string): FeetDatabasePath {
  if (hasFeetDatabasePath(value)) return value;
  throw new Error(\`[pokemonFeetDatabase] Unknown feet database path: \${value}\`);
}

export function requireFeetPoints(value: string): FeetPoints {
  const path = requireFeetDatabasePath(value);
  const points = POKEMON_FEET_DATABASE[path];
  if (points) return points;
  throw new Error(\`[pokemonFeetDatabase] Missing feet points for path: \${path}\`);
}

export const POKEMON_CRIES_DATABASE = PACKED_DATA.c;
export type PokemonCryId = keyof typeof POKEMON_CRIES_DATABASE;
`;

  await fs.writeFile(databasePath, databaseContent, 'utf-8');
  console.log(styleText('green', `   [OK] Base de datos de anclaje y gritos integrada generada con éxito.`));

  // Autogenerar catálogo de sprites de NPC/Entrenadores por arquetipo en src/data/npcSpriteCatalog.ts
  console.log(styleText('yellow', `\n   📦 Generando catálogo de sprites de NPCs en src/data/npcSpriteCatalog.ts...`));
  const npcCatalogPath = path.resolve(process.cwd(), 'src', 'data', 'pokemon', 'npcSpriteCatalog.ts');
  
  const { ARCHETYPE_KEYWORDS } = await import('../../src/logic/utils/npcSpriteRouter');
  const ARCHETYPE_KEYWORDS_LOCAL = ARCHETYPE_KEYWORDS;

  // Las claves se derivan de TRAINER_TYPES para mantener sincronía automática
  const catalogLists: Record<string, string[]> = Object.fromEntries(
    Object.keys(TRAINER_TYPES).map(key => [key, []])
  );

  const npcSourceDir = path.resolve(SOURCE_DIR, 'public', 'assets', 'sprites', 'npc');

  try {
    const entries = await fs.readdir(npcSourceDir);
    for (const entry of entries) {
      const ext = path.extname(entry).toLowerCase();
      if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
        if (/_avatar|_back/i.test(entry)) continue;

        const baseName = path.parse(entry).name;
        const normalized = baseName.toLowerCase().replace(/[-_]/g, '');

        let classified = false;
        for (const [archetype, keywords] of Object.entries(ARCHETYPE_KEYWORDS_LOCAL)) {
          for (const keyword of keywords) {
            if (normalized.includes(keyword)) {
              if (keyword === 'bea' && normalized.includes('beauty')) continue;
              if (catalogLists[archetype]) {
                catalogLists[archetype].push(baseName);
                classified = true;
              }
              break;
            }
          }
          if (classified) break;
        }

        if (!classified) {
          if (['acerola', 'allister', 'fantina'].some(n => normalized.includes(n)) && catalogLists.medium) {
            catalogLists.medium.push(baseName);
          } else if (['adaman', 'irida', 'arezu', 'mai'].some(n => normalized.includes(n)) && catalogLists.default) {
            catalogLists.default.push(baseName);
          } else if (['lance', 'drake', 'dragontamer'].some(n => normalized.includes(n)) && catalogLists.domador) {
            catalogLists.domador.push(baseName);
          } else if (['koga', 'janine', 'ninja'].some(n => normalized.includes(n)) && catalogLists.luchador) {
            catalogLists.luchador.push(baseName);
          } else if (catalogLists.default) {
            catalogLists.default.push(baseName);
          }
        }
      }
    }
  } catch (err) {
    console.log(styleText('yellow', `   ⚠️ Warning: No se pudo escanear NPCs: ${(err as Error).message}`));
  }

  for (const key of Object.keys(catalogLists)) {
    catalogLists[key] = Array.from(new Set(catalogLists[key])).sort();
    if (catalogLists[key]!.length === 0) {
      catalogLists[key] = ['entrenador_h_front'];
    }
  }

  const npcCatalogContent = `/**
 * src/data/npcSpriteCatalog.ts
 * 
 * ARCHIVO AUTOGENERADO POR scripts/convert_assets.ts - NO MODIFICAR MANUALMENTE
 */

export const ARCHETYPE_SPRITES = ${JSON.stringify(catalogLists, null, 2)} as const;

export type NpcSpriteId = (typeof ARCHETYPE_SPRITES)[keyof typeof ARCHETYPE_SPRITES][number];

export const VALID_NPC_SPRITES = Object.values(ARCHETYPE_SPRITES).flat();
`;

  await fs.writeFile(npcCatalogPath, npcCatalogContent, 'utf-8');
  console.log(styleText('green', `   [OK] Catálogo de sprites de NPCs generado con éxito.`));

  // Generar base de datos de sprites animados (animated/Front y animated/Back)
  console.log(styleText('yellow', `\n   📦 Generando base de datos de sprites animados en src/data/animatedSpriteDatabase.ts...`));
  const ANIMATED_FRONT_DIR = path.resolve(process.cwd(), 'public', 'assets', 'sprites', 'pokemon', 'animated', 'Front');
  const ANIMATED_BACK_DIR = path.resolve(process.cwd(), 'public', 'assets', 'sprites', 'pokemon', 'animated', 'Back');
  const animatedDbData: Record<string, AnimatedSpriteData> = {};
  const animatedVariationFrames: Record<string, number> = {};
  let maxAnimatedSizeFront = 0;
  let maxAnimatedSizeBack = 0;

  try {
    const frontFiles = (await fs.readdir(ANIMATED_FRONT_DIR))
      .filter(f => f.endsWith('.webp') || f.endsWith('.png'));
    let backFiles: string[] = [];
    try {
      backFiles = (await fs.readdir(ANIMATED_BACK_DIR))
        .filter(f => f.endsWith('.webp') || f.endsWith('.png'));
    } catch {
      // Ignorar si no existe Back
    }

    const analyzeTasks: WorkerTask[] = [
      ...frontFiles.map(file => ({
        type: 'analyzeAnimated' as const,
        filePath: path.join(ANIMATED_FRONT_DIR, file)
      })),
      ...backFiles.map(file => ({
        type: 'analyzeAnimated' as const,
        filePath: path.join(ANIMATED_BACK_DIR, file)
      }))
    ];

    const analyzeResults = await runTasksInParallel(analyzeTasks, maxWorkers) as AnalyzeResult[];

    for (const res of analyzeResults) {
      if (!res.success || !res.animatedData) {
        console.error(styleText('red', `   [ERROR] No se pudo analizar frame animado ${res.filePath}: ${res.error}`));
        continue;
      }
      const isBackFile = res.filePath.split(path.sep).join('/').includes('/animated/Back');
      const key = isBackFile ? `${res.spriteKey}_back` : res.spriteKey;
      
      animatedDbData[key] = res.animatedData;

      if (isBackFile) {
        if (res.animatedData.size > maxAnimatedSizeBack) {
          maxAnimatedSizeBack = res.animatedData.size;
        }
      } else {
        if (res.animatedData.size > maxAnimatedSizeFront) {
          maxAnimatedSizeFront = res.animatedData.size;
        }
      }

      const isVariation = res.spriteKey.includes('v');
      if (isVariation) {
        animatedVariationFrames[key] = res.animatedData.frames;
      }
    }

    // Segunda pasada: ajustar los pies de las variaciones copiándolos del idle correspondiente
    for (const key of Object.keys(animatedDbData)) {
      const isVariation = key.includes('v');
      if (isVariation) {
        const idleKey = key.replace(/v/, 'i');
        const idleData = animatedDbData[idleKey];
        if (idleData) {
          const varData = animatedDbData[key]!;
          animatedDbData[key] = {
            ...varData,
            feetY: idleData.feetY,
            feetX: idleData.feetX
          };
        } else {
          console.log(styleText('yellow', `      [WARN] No se encontró el idle correspondiente (${idleKey}) para la variación ${key}. Se usarán sus propios pies calculados.`));
        }
      }
    }
  } catch (err) {
    console.log(styleText('yellow', `   ⚠️ Warning: No se pudo generar base de datos animada: ${(err as Error).message}`));
  }

  const animatedSpriteCount = Object.keys(animatedDbData).length;
  const animatedDbPath = path.resolve(process.cwd(), 'src', 'data', 'pokemon', 'animatedSpriteDatabase.ts');
  const animatedDbJsonPath = path.resolve(process.cwd(), 'src', 'data', 'pokemon', 'animatedSpriteDatabase.json');
  const animatedJsonData = {
    RAW: Object.fromEntries(
      Object.entries(animatedDbData)
        .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
        .map(([k, v]) => [k, [v.frames, v.size, v.feetY, v.feetX, v.bodyH, v.bodyW, v.bodyRadius]])
    ),
    VARIATIONS: Object.fromEntries(
      Object.entries(animatedVariationFrames)
        .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    )
  };
  await fs.writeFile(animatedDbJsonPath, JSON.stringify(animatedJsonData, null, 2), 'utf-8');

  const animatedDbContent = [
    '/**',
    ' * src/data/animatedSpriteDatabase.ts',
    ' *',
    ' * ARCHIVO INMUTABLE Y AUTOGENERADO POR scripts/convert_assets.ts — NO MODIFICAR MANUALMENTE',
    ' *',
    ' * Métricas precalculadas de cada sprite en animated/Front/ y animated/Back/:',
    ' *   frames     — número de frames en el spritesheet horizontal',
    ' *   size       — tamaño del frame en px (cuadrado: cada frame es size×size)',
    ' *   feetY/X    — punto de anclaje al suelo, normalizado [0-1], calculado en el primer frame',
    ' *   bodyH/W    — alto/ancho del cuerpo visible (bbox sin transparencia) como ratio [0-1]',
    ' *   bodyRadius — max(bodyH, bodyW)/2, radio del cuerpo para colisiones y escala [0-1]',
    ' *',
    ' * MAX_ANIMATED_SPRITE_SIZE_FRONT: tamaño (px) del frame más grande de Front.',
    ' * MAX_ANIMATED_SPRITE_SIZE_BACK: tamaño (px) del frame más grande de Back.',
    ' * Úsalo para calcular tamaños relativos en el mundo virtual de combate.',
    ' */',
    "import dbJson from './animatedSpriteDatabase.json' with { type: 'json' };",
    '',
    'export interface AnimatedSpriteData {',
    '  readonly frames: number;',
    '  readonly size: number;',
    '  readonly feetY: number;',
    '  readonly feetX: number;',
    '  readonly bodyH: number;',
    '  readonly bodyW: number;',
    '  readonly bodyRadius: number;',
    '}',
    '',
    `/** Frame size (px) of the largest sprite in Front/Back. Used for relative combat scaling. */`,
    `export const MAX_ANIMATED_SPRITE_SIZE_FRONT = ${maxAnimatedSizeFront} as const;`,
    `export const MAX_ANIMATED_SPRITE_SIZE_BACK = ${maxAnimatedSizeBack} as const;`,
    `export const MAX_ANIMATED_SPRITE_SIZE = MAX_ANIMATED_SPRITE_SIZE_FRONT;`,
    '',
    'const RAW = dbJson.RAW;',
    'export type AnimatedSpriteId = keyof typeof RAW;',
    '',
    'export function hasAnimatedSpriteId(id: string): id is AnimatedSpriteId {',
    '  return Object.hasOwn(RAW, id);',
    '}',
    '',
    'export function requireAnimatedSpriteId(id: string): AnimatedSpriteId {',
    '  if (hasAnimatedSpriteId(id)) return id;',
    '  throw new Error(`[animatedSpriteDatabase] Unknown animated sprite id: ${id}`);',
    '}',
    '',
    'function requireAnimatedMetric(values: readonly number[], id: AnimatedSpriteId, index: number): number {',
    '  const value = values[index];',
    '  if (value !== undefined) return value;',
    '  throw new Error(`[animatedSpriteDatabase] Invalid metric tuple for sprite id: ${id}`);',
    '}',
    '',
    'export const ANIMATED_SPRITE_DATABASE: Partial<Record<AnimatedSpriteId, AnimatedSpriteData>> = {};',
    '',
    'for (const id in RAW) {',
    '  if (!hasAnimatedSpriteId(id)) continue;',
    '  const tuple = RAW[id];',
    '  const frames = requireAnimatedMetric(tuple, id, 0);',
    '  const size = requireAnimatedMetric(tuple, id, 1);',
    '  const feetY = requireAnimatedMetric(tuple, id, 2);',
    '  const feetX = requireAnimatedMetric(tuple, id, 3);',
    '  const bodyH = requireAnimatedMetric(tuple, id, 4);',
    '  const bodyW = requireAnimatedMetric(tuple, id, 5);',
    '  const bodyRadius = requireAnimatedMetric(tuple, id, 6);',
    '  ANIMATED_SPRITE_DATABASE[id] = { frames, size, feetY, feetX, bodyH, bodyW, bodyRadius };',
    '}',
    '',
    'export function requireAnimatedSpriteData(id: AnimatedSpriteId): AnimatedSpriteData {',
    '  const data = ANIMATED_SPRITE_DATABASE[id];',
    '  if (data) return data;',
    '  throw new Error(`[animatedSpriteDatabase] Missing animated sprite data for id: ${id}`);',
    '}',
    '',
    `/** Variation frame counts to keep variation sprites out of coordinate databases */`,
    `export const ANIMATED_VARIATION_FRAMES: Partial<Record<keyof typeof dbJson.VARIATIONS, number>> = dbJson.VARIATIONS;`,
    `export type AnimatedVariationId = keyof typeof ANIMATED_VARIATION_FRAMES;`,
    '',
    'export function hasAnimatedVariationId(id: string): id is AnimatedVariationId {',
    '  return Object.hasOwn(ANIMATED_VARIATION_FRAMES, id);',
    '}',
    '',
    'export function requireAnimatedVariationFrameCount(id: AnimatedVariationId): number {',
    '  const frames = ANIMATED_VARIATION_FRAMES[id];',
    '  if (frames !== undefined) return frames;',
    '  throw new Error(`[animatedSpriteDatabase] Missing variation frame count for id: ${id}`);',
    '}',
    '',
  ].join('\n');

  await fs.writeFile(animatedDbPath, animatedDbContent, 'utf-8');
  console.log(styleText('green', `   [OK] Base de datos animada generada: ${animatedSpriteCount} sprites, maxSize: ${maxAnimatedSizeFront}px.`));

  console.log(styleText('bold', '\n✨ Proceso de assets finalizado.\n'));
  process.exit(0);
}

if (isMainThread) {
  main();
}
