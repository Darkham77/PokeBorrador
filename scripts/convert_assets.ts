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
import { MAP_ROUTE_MAPPING } from '../src/data/map-assets.ts';
import { TRAINER_TYPES } from '../src/data/trainerTypes.ts';

// Speed up execution
enableCompileCache();

const SOURCE_DIR = path.resolve(process.cwd(), '_raw-assets');
const PUBLIC_ASSETS_DIR = path.resolve(process.cwd(), 'public', 'assets');

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
  const destPath = path.join(process.cwd(), relPath);
  const destDir = path.dirname(destPath);
  const destFile = path.join(destDir, `${path.parse(destPath).name}.webp`);

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
    const destMobileFile = path.join(destDir, `${path.parse(destPath).name}_mobile.webp`);
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

    const data = firstFrameBuffer.data;
    const channels = firstFrameBuffer.info.channels;

    let minX = size;
    let maxX = 0;
    let minY = size;
    let maxY = 0;
    let lowestY = -1;
    let hasOpaque = false;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * channels;
        const alpha = channels >= 4 ? (data[idx + 3] ?? 0) : 255;
        if (alpha > 50) {
          hasOpaque = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (hasOpaque) {
      // Scan from bottom to top to find the first non-empty pixel row (lowestY)
      for (let y = size - 1; y >= 0; y--) {
        let rowHasOpaque = false;
        for (let x = 0; x < size; x++) {
          const idx = (y * size + x) * channels;
          const alpha = channels >= 4 ? (data[idx + 3] ?? 0) : 255;
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
    }

    let feetY = 0.9;
    let feetX = 0.5;
    let bodyH = 0.8;
    let bodyW = 0.8;

    if (hasOpaque && lowestY !== -1) {
      const centerX = (minX + maxX) / 2;
      feetY = Number((lowestY / size).toFixed(4));
      feetX = Number((centerX / size).toFixed(4));
      bodyH = Number(((maxY - minY + 1) / size).toFixed(4));
      bodyW = Number(((maxX - minX + 1) / size).toFixed(4));
    }

    const bodyRadius = Number((bodyH / 2).toFixed(4));

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

  // Limpieza determinista: borrar public/assets antes de reconstruir
  console.log(styleText('yellow', `   🧹 Limpiando ${path.relative(process.cwd(), PUBLIC_ASSETS_DIR)}...`));
  await fs.rm(PUBLIC_ASSETS_DIR, { recursive: true, force: true });
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

  const packed: {
    p: Record<string, [number, number]>;
    n: Record<string, [number, number]>;
    t: Record<string, [number, number]>;
  } = {
    p: {},
    n: {},
    t: {}
  };

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

const PACKED_DATA: Record<string, Record<string, readonly [number, number]>> = ${JSON.stringify(packed)};

export const POKEMON_FEET_DATABASE: Record<string, FeetPoints> = {};

for (const [key, prefix] of [
  ['p', '/assets/sprites/pokemon/'],
  ['n', '/assets/sprites/npc/'],
  ['t', '/assets/sprites/trainers/']
] as const) {
  const group = PACKED_DATA[key];
  if (group) {
    for (const [subKey, [y, x]] of Object.entries(group)) {
      POKEMON_FEET_DATABASE[\`\${prefix}\${subKey}.webp\`] = { feetY: y, feetX: x };
    }
  }
}
`;

  await fs.writeFile(databasePath, databaseContent, 'utf-8');
  console.log(styleText('green', `   [OK] Base de datos de anclaje generada con éxito (${Object.keys(pokemonFeetDatabase).length} sprites precalculados).`));

  // Autogenerar catálogo de sprites de NPC/Entrenadores por arquetipo en src/data/npcSpriteCatalog.ts
  console.log(styleText('yellow', `\n   📦 Generando catálogo de sprites de NPCs en src/data/npcSpriteCatalog.ts...`));
  const npcCatalogPath = path.resolve(process.cwd(), 'src', 'data', 'npcSpriteCatalog.ts');
  
  const ARCHETYPE_KEYWORDS_LOCAL = {
    trainers: ['master', 'alder', 'arven', 'ash', 'barry', 'bianca', 'blue', 'brendan', 'calem', 'candela', 'carmine', 'cheren', 'cynthia', 'diantha', 'elaine', 'elio', 'ethan', 'geeta', 'gladion', 'gloria', 'green', 'hau', 'hilbert', 'hilda', 'hop', 'hugh', 'ingo', 'iris', 'kieran', 'kris', 'leaf', 'leon', 'lucas', 'lyra', 'marnie', 'may', 'nate', 'nemona', 'palmer', 'red', 'rei', 'rosa', 'roy', 'selene', 'serena', 'steven', 'trace', 'victor', 'volo', 'wally'],
    caza_bichos: ['bugcatcher', 'bugmaniac', 'bug', 'bichos', 'cazabichos', 'aaron', 'katy', 'bugsy', 'burgh'],
    ornitologo: ['birdkeeper', 'ornitologo', 'pajaro', 'falkner', 'kahili', 'skyla', 'skytrainer', 'winona', 'pilot'],
    cientifico: ['scientist', 'supernerd', 'cientifico', 'nerd', 'doctor', 'blaine', 'briar', 'clemont', 'colress', 'elm', 'juniper', 'kukui', 'laventon', 'magnolia', 'miriam', 'molayne', 'nurse', 'oak', 'raifort', 'rowan', 'sada', 'salvatore', 'samsonoak', 'sonia', 'sophocles', 'sycamore', 'thorton', 'turo'],
    luchador: ['blackbelt', 'battlegirl', 'crushgirl', 'luchador', 'fight', 'crasherwake', 'bea', 'bruno', 'chuck', 'atticus', 'brawly', 'dendra', 'eri', 'greta', 'hala', 'korrina', 'marshal', 'mustard', 'securitycorps', 'theroyal', 'wikstrom', 'zisu'],
    pescador: ['fisherman', 'fisher', 'pescador', 'marlon', 'sailor', 'lana'],
    nadador: ['swimmer', 'nadador', 'diver', 'freediver', 'candice', 'juan', 'lorelei', 'misty', 'nessa', 'surfer', 'wallace'],
    domador: ['tamer', 'domador', 'roughneck', 'tamer-gen3', 'clair', 'drasna', 'drayden', 'drayton', 'hassel', 'lucy', 'ryuki', 'zinnia'],
    medium: ['psychic', 'medium', 'channeler', 'hexmaniac', 'sabrina', 'morty', 'ghost', 'furisodegirl', 'avery', 'bede', 'caitlin', 'liza', 'lucian', 'olympia', 'shauntal', 'tate', 'will'],
    motorista: ['biker', 'cueball', 'delinquent', 'punk', 'motorista', 'hooligan', 'cyclist', 'giacomo', 'mela', 'piers', 'roxie', 'ruffian', 'streetthug'],
    montanero: ['hiker', 'ruinmaniac', 'montanero', 'brock', 'roark', 'clay', 'bertha', 'gordie', 'grant', 'olivia', 'peonia', 'peony', 'roxanne', 'worker', 'rika'],
    rocket: ['rocket', 'grunt', 'giovanni', 'petrel', 'proton', 'ariana', 'archer', 'rainbowrocket', 'archie', 'cliff', 'courtney', 'cyrus', 'faba', 'ghetsis', 'guzma', 'jupiter', 'lusamine', 'lysandre', 'mable', 'malva', 'mars', 'matt', 'maxie', 'oleana', 'plumeria', 'rood', 'saturn', 'shadowtriad', 'shelly', 'sierra', 'tabitha', 'xerosic', 'zinzolin'],
    criador: ['breeder', 'criador', 'nursery', 'nurseryaide', 'caretaker', 'cheryl', 'cilan', 'milo', 'ramos', 'rancher'],
    aristocrata: ['gentleman', 'lady', 'madame', 'richboy', 'butler', 'darach', 'officeworker', 'ortega', 'rose', 'siebold'],
    ranger: ['ranger', 'pokemonranger'],
    pokefan: ['pokefan', 'pokekid'],
    artista: ['beauty', 'artist', 'dancer', 'model', 'elesa', 'lisia', 'mina', 'painter', 'perrin', 'risingstar', 'rollerskater', 'tierno', 'tucker', 'tuli', 'tulip', 'valerie', 'viola'],
    default: ['youngster', 'lass', 'camper', 'picnicker', 'schoolkid', 'entrenador', 'player', 'rival']
  };

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
              catalogLists[archetype]!.push(baseName);
              classified = true;
              break;
            }
          }
          if (classified) break;
        }

        if (!classified) {
          if (['acerola', 'allister', 'fantina'].some(n => normalized.includes(n))) {
            catalogLists.medium!.push(baseName);
          } else if (['adaman', 'irida', 'arezu', 'mai'].some(n => normalized.includes(n))) {
            catalogLists.default!.push(baseName);
          } else if (['lance', 'drake', 'dragontamer'].some(n => normalized.includes(n))) {
            catalogLists.domador!.push(baseName);
          } else if (['koga', 'janine', 'ninja'].some(n => normalized.includes(n))) {
            catalogLists.luchador!.push(baseName);
          } else {
            catalogLists.default!.push(baseName);
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

export const ARCHETYPE_SPRITES = ${JSON.stringify(catalogLists)} as const;
`;

  await fs.writeFile(npcCatalogPath, npcCatalogContent, 'utf-8');
  console.log(styleText('green', `   [OK] Catálogo de sprites de NPCs generado con éxito.`));

  // Generar base de datos de sprites animados (animated/Front y animated/Back)
  console.log(styleText('yellow', `\n   📦 Generando base de datos de sprites animados en src/data/animatedSpriteDatabase.ts...`));
  const ANIMATED_FRONT_DIR = path.resolve(process.cwd(), 'public', 'assets', 'sprites', 'pokemon', 'animated', 'Front');
  const ANIMATED_BACK_DIR = path.resolve(process.cwd(), 'public', 'assets', 'sprites', 'pokemon', 'animated', 'Back');
  const animatedDbData: Record<string, AnimatedSpriteData> = {};
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
    }
  } catch (err) {
    console.log(styleText('yellow', `   ⚠️ Warning: No se pudo generar base de datos animada: ${(err as Error).message}`));
  }

  const animatedSpriteCount = Object.keys(animatedDbData).length;
  const animatedDbPath = path.resolve(process.cwd(), 'src', 'data', 'animatedSpriteDatabase.ts');

  const animatedRawSerialized = JSON.stringify(
    Object.fromEntries(
      Object.entries(animatedDbData)
        .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
        .map(([k, v]) => [k, [v.frames, v.size, v.feetY, v.feetX, v.bodyH, v.bodyW, v.bodyRadius]])
    )
  );

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
    '// Compact storage: [frames, size, feetY, feetX, bodyH, bodyW, bodyRadius]',
    `const RAW: Record<string, readonly [number, number, number, number, number, number, number]> = ${animatedRawSerialized};`,
    '',
    'export const ANIMATED_SPRITE_DATABASE: Record<string, AnimatedSpriteData> = Object.fromEntries(',
    '  Object.entries(RAW).map(([id, [frames, size, feetY, feetX, bodyH, bodyW, bodyRadius]]) => [',
    '    id,',
    '    { frames, size, feetY, feetX, bodyH, bodyW, bodyRadius }',
    '  ])',
    ');',
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


