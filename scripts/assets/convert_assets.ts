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

import { safeResolve, safeJoin } from '../lib/safePath.ts';
import {
  findFeetPointsFromBuffer,
  analyzeImageBufferBounds
} from './helpers/assetBoundAnalyzer.ts';
import {
  generateBushCatalog,
  generateBattleMapCatalog,
  generateFeetAndCriesDatabase,
  generateNpcSpriteCatalog,
  generateAnimatedSpriteDatabase,
  type AnimatedSpriteData
} from './helpers/catalogGenerators.ts';

// Speed up execution
enableCompileCache();

const SOURCE_DIR = safeResolve(process.cwd(), '_raw-assets');
const PUBLIC_ASSETS_DIR = safeResolve(process.cwd(), 'public', 'assets');
const MAP_DESKTOP_RESIZE_WIDTH_PX = 600;
const MAP_MOBILE_RESIZE_WIDTH_PX = 400;
const REPORT_SEPARATOR_LENGTH = 80;
const MAX_WARNINGS_DISPLAYED = 15;
const WEBP_QUALITY_MAX_DIM_THRESHOLD_LOW = 400;
const WEBP_QUALITY_MAX_DIM_THRESHOLD_MID = 1000;
const WEBP_QUALITY_HIGH = 95;
const WEBP_QUALITY_NORMAL = 80;
const WEBP_EFFORT_LEVEL = 6;

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

  const LOSSLESS_SEGMENTS = ['sprites', 'icons', 'badges', 'items', 'pixel'] as const;
  const isLossless = LOSSLESS_SEGMENTS.some(seg => relPath.includes(seg));

  let image = sharp(filePath);
  const metadata = await image.metadata();

  const webpOptions: sharp.WebpOptions = { effort: WEBP_EFFORT_LEVEL };
  if (isLossless) {
    webpOptions.lossless = true;
  } else {
    const maxDim = Math.max(metadata.width || 0, metadata.height || 0);
    if (maxDim < WEBP_QUALITY_MAX_DIM_THRESHOLD_LOW) {
      webpOptions.quality = 100;
    } else if (maxDim < WEBP_QUALITY_MAX_DIM_THRESHOLD_MID) {
      webpOptions.quality = WEBP_QUALITY_HIGH;
    } else {
      webpOptions.quality = WEBP_QUALITY_NORMAL;
    }
  }

  const pathSegments = relPath.split(path.sep);
  const isMap = pathSegments.includes('maps');
  const destFiles: string[] = [destFile]; // no-domain

  if (isMap) {
    image = image.resize({ width: MAP_DESKTOP_RESIZE_WIDTH_PX, kernel: 'nearest' });
  }

  await image.webp(webpOptions).toFile(destFile);

  if (isMap) {
    const destMobileFile = safeJoin(destDir, `${path.parse(destPath).name}_mobile.webp`);
    await sharp(filePath)
      .resize({ width: MAP_MOBILE_RESIZE_WIDTH_PX, kernel: 'nearest' })
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
    return findFeetPointsFromBuffer(data, info.width, info.height, info.channels);
  } catch {
    return { feetY: 0.9, feetX: 0.5 };
  }
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

    const { feetX, feetY, bodyH, bodyW, bodyRadius } = analyzeImageBufferBounds(
      firstFrameBuffer.data,
      size,
      firstFrameBuffer.info.channels
    );

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
    files.push(safeResolve(dir, entry));
  }
  return files;
}

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

      worker.on('message', (msg: WorkerResult) => {
        results.push(msg);
        if (taskIndex < tasks.length) {
          const nextTask = tasks[taskIndex++];
          if (nextTask) worker.postMessage(nextTask);
        } else {
          worker.terminate();
          activeWorkers--;
          if (activeWorkers === 0) {
            resolve(results);
          }
        }
      });

      worker.on('error', (err: Error) => {
        console.error(styleText('red', `Worker Error: ${err.message}`));
        worker.terminate();
        activeWorkers--;
        if (activeWorkers === 0) {
          resolve(results);
        }
      });

      activeWorkers++;
      const initialTask = tasks[taskIndex++];
      if (initialTask) worker.postMessage(initialTask);
      workers.push(worker);
    };

    const numWorkersToSpawn = Math.min(maxWorkers, tasks.length);
    for (let i = 0; i < numWorkersToSpawn; i++) {
      startWorker();
    }
  });
}

async function main() {
  console.log(styleText('bold', '🚀 INICIANDO CONVERSIÓN Y PROCESAMIENTO MULTICORE DE ASSETS (Node.js 26+)'));
  const startTime = Date.now();

  const pipelineWarnings: string[] = []; // no-domain
  const pipelineErrors: string[] = []; // no-domain

  const files = await getFilesToConvert(SOURCE_DIR);
  console.log(`📦 Encontrados ${files.length} archivos para procesar en ${SOURCE_DIR}`);

  const maxWorkers = Math.max(1, os.cpus().length - 1);
  console.log(`⚡ Usando pool de ${maxWorkers} workers en paralelo...`);

  const tasks: ProcessTask[] = files.map(f => ({ type: 'processFile', filePath: f }));
  const results = await runTasksInParallel(tasks, maxWorkers) as ProcessResult[];

  let successfulFiles = 0;
  let generatedWebps = 0;
  const environmentFiles: string[] = []; // no-domain
  const pokemonFeetDatabase: Record<string, { feetY: number; feetX: number }> = {};

  for (const r of results) {
    if (r.success) {
      successfulFiles++;
      generatedWebps += r.destFiles.length;
      if (r.environmentFile) {
        environmentFiles.push(r.environmentFile);
      }
      if (r.feetPoints) {
        const publicRel = path.relative(PUBLIC_ASSETS_DIR, r.destFiles[0] || '').split(path.sep).join('/');
        const normalizedDbKey = `/assets/${publicRel}`;
        pokemonFeetDatabase[normalizedDbKey] = r.feetPoints;
      }
    } else {
      console.error(styleText('red', `❌ Fallo al procesar: ${r.filePath} -> ${r.error}`));
      pipelineErrors.push(`Fallo al procesar ${r.filePath}: ${r.error}`);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(styleText('green', `✅ Conversión inicial completada en ${duration}s.`));
  console.log(`   - Archivos procesados: ${successfulFiles}/${files.length}`);
  console.log(`   - Imágenes WebP generadas: ${generatedWebps}`);

  // Generar catálogos usando helpers especializados
  await generateBushCatalog(environmentFiles);
  const battleMaps = await generateBattleMapCatalog(SOURCE_DIR, MAP_ROUTE_MAPPING);

  const databaseDir = safeResolve(process.cwd(), 'src/data/pokemon');
  const criesDir = safeResolve(process.cwd(), 'public/cries');
  const packedFeetData = await generateFeetAndCriesDatabase(
    pokemonFeetDatabase,
    criesDir,
    databaseDir,
    pipelineWarnings,
    pipelineErrors
  );

  const npcCatalogPath = safeResolve(process.cwd(), 'src/data/pokemon/npcSpriteCatalog.ts');
  const npcCatalogLists = await generateNpcSpriteCatalog(SOURCE_DIR, npcCatalogPath, pipelineWarnings);

  // Analizar sprites animados
  console.log(styleText('yellow', `\n   📦 Generando base de datos de sprites animados en src/data/animatedSpriteDatabase.ts...`));
  const ANIMATED_FRONT_DIR = safeResolve(process.cwd(), 'public/assets/sprites/pokemon/animated/Front');
  const ANIMATED_BACK_DIR = safeResolve(process.cwd(), 'public/assets/sprites/pokemon/animated/Back');
  const animatedDbData: Record<string, AnimatedSpriteData> = {};
  const animatedVariationFrames: Record<string, number> = {};
  let maxAnimatedSizeFront = 0;
  let maxAnimatedSizeBack = 0;

  try {
    const frontFiles = (await fs.readdir(ANIMATED_FRONT_DIR))
      .filter(f => f.endsWith('.webp') || f.endsWith('.png'));
    let backFiles: string[] = []; // no-domain
    try {
      backFiles = (await fs.readdir(ANIMATED_BACK_DIR))
        .filter(f => f.endsWith('.webp') || f.endsWith('.png'));
    } catch {
      // Back opcional
    }

    const analyzeTasks: WorkerTask[] = [
      ...frontFiles.map(file => ({
        type: 'analyzeAnimated' as const,
        filePath: safeJoin(ANIMATED_FRONT_DIR, file)
      })),
      ...backFiles.map(file => ({
        type: 'analyzeAnimated' as const,
        filePath: safeJoin(ANIMATED_BACK_DIR, file)
      }))
    ];

    const analyzeResults = await runTasksInParallel(analyzeTasks, maxWorkers) as AnalyzeResult[];

    for (const res of analyzeResults) {
      if (!res.success || !res.animatedData) {
        console.error(styleText('red', `   [ERROR] No se pudo analizar frame animado ${res.filePath}: ${res.error}`));
        pipelineErrors.push(`Análisis animado falló en ${res.filePath}: ${res.error}`);
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

      if (res.spriteKey.includes('v')) {
        animatedVariationFrames[key] = res.animatedData.frames;
      }
    }

    // Ajustar pies de variaciones copiándolos del idle correspondiente
    for (const key of Object.keys(animatedDbData)) {
      if (key.includes('v')) {
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
          pipelineWarnings.push(`Variación ${key} no encontró idle ${idleKey}`);
          console.log(styleText('yellow', `      [WARN] No se encontró el idle correspondiente (${idleKey}) para la variación ${key}. Se usarán sus propios pies calculados.`));
        }
      }
    }
  } catch (err) {
    console.error(styleText('red', `\n❌ ERROR: No se pudieron procesar los sprites animados: ${(err as Error).message}`));
    pipelineErrors.push(`Procesamiento de sprites animados falló: ${(err as Error).message}`);
  }

  const animatedSpriteCount = await generateAnimatedSpriteDatabase(
    animatedDbData,
    animatedVariationFrames,
    maxAnimatedSizeFront,
    maxAnimatedSizeBack
  );

  // Resumen final
  console.log('\n' + '━'.repeat(REPORT_SEPARATOR_LENGTH));
  console.log(styleText('bold', '📊 RESUMEN FINAL DEL PIPELINE DE ASSETS'));
  console.log('━'.repeat(REPORT_SEPARATOR_LENGTH));
  console.log(`  Sprites animados compilados   : ${animatedSpriteCount}`);
  console.log(`  Mapas de combate indexados    : ${battleMaps.length}`);
  console.log(`  Arquetipos de NPCs generados  : ${Object.keys(npcCatalogLists).length}`);
  console.log(`  Entradas en POKEMON_FEET_DB   : ${Object.keys(packedFeetData.p).length}`);
  console.log(`  Mapeos en POKEMON_CRIES_DB    : ${Object.keys(packedFeetData.c).length}`);
  console.log('─'.repeat(REPORT_SEPARATOR_LENGTH));
  console.log(`  ⚠️  Total Advertencias (Warnings) : ${pipelineWarnings.length}`);
  console.log(`  ❌ Total Errores (Errors)         : ${pipelineErrors.length}`);
  console.log('━'.repeat(REPORT_SEPARATOR_LENGTH));

  if (pipelineWarnings.length > 0) {
    console.log(styleText('yellow', `\n⚠️  El proceso finalizó con ${pipelineWarnings.length} advertencia(s) registradas:`));
    const sampleWarnings = pipelineWarnings.slice(0, MAX_WARNINGS_DISPLAYED);
    sampleWarnings.forEach(w => console.log(styleText('yellow', `   - ${w}`)));
    if (pipelineWarnings.length > MAX_WARNINGS_DISPLAYED) {
      console.log(styleText('yellow', `   ... y ${pipelineWarnings.length - MAX_WARNINGS_DISPLAYED} advertencias más.`));
    }
  }

  if (pipelineErrors.length > 0) {
    console.error(styleText('red', `\n❌ El proceso finalizó con ${pipelineErrors.length} error(es):`));
    pipelineErrors.forEach(e => console.error(styleText('red', `   - ${e}`)));
    process.exit(1);
  }

  if (pipelineWarnings.length === 0 && pipelineErrors.length === 0) {
    console.log(styleText('green', '\n✨ Proceso de assets finalizado 100% limpio (0 errores, 0 advertencias).\n'));
  } else {
    console.log(styleText('yellow', `\n⚠️  Proceso de assets finalizado con advertencias.\n`));
  }
  process.exit(0);
}

if (isMainThread) {
  main();
}
