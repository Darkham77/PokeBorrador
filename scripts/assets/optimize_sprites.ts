// fallow-ignore-file security-sink
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { safeResolve, safeJoin } from '../lib/safePath.ts';

const __filename = fileURLToPath(import.meta.url);

const RAW_ASSETS_DIR = safeResolve(process.cwd(), '_raw-assets');
const FRONT_DIR = safeJoin(RAW_ASSETS_DIR, 'public', 'assets', 'sprites', 'pokemon', 'animated', 'Front');
const SCRATCH_DIR = safeResolve(process.cwd(), 'scratch');
const DB_SYNC_BATCH_CHUNK_SIZE = 32;

import { analyzeVariantImage } from './variantImageAnalyzer.ts';

// -----------------------------------------------------------------------------
// CÓDIGO DEL WORKER (HILO SECUNDARIO DE PROCESAMIENTO INDEPENDIENTE)
// -----------------------------------------------------------------------------
if (!isMainThread) {
  const { fileName } = workerData as { fileName: string };

  const runWorker = async () => {
    const name = path.parse(fileName).name;
    const match = name.match(/^(\d+)(.*)$/);
    if (!match) {
      parentPort?.postMessage({ success: true });
      return;
    }

    const pokemonId = match[1]!;
    const suffix = match[2]!;

    // Guard: skip files that are already processed outputs.
    // Output files have suffix starting with i, v, or a (idle/variation/attack).
    // Raw inputs may have: empty suffix, or suffixes starting with _ (e.g. _f, _m, _1, _1_f, _2_m)
    // or directly f/m for gender forms without underscore (e.g. 14f.png, 14m.png).
    if (/^[iva]/.test(suffix)) {
      parentPort?.postMessage({ success: true });
      return;
    }

    // 1. Analizar el Front principal para el reporte y coherencia
    const frontPath = path.join(FRONT_DIR, fileName);
    const frontAnalysis = await analyzeVariantImage(frontPath, pokemonId, suffix);

    // 2. Procesar variantes
    const folders = ['Front', 'Back', 'Front shiny', 'Back shiny'] as const; // no-domain

    const processVariant = async (folder: string): Promise<void> => {
      const varSourcePath = path.join(RAW_ASSETS_DIR, 'public', 'assets', 'sprites', 'pokemon', 'animated', folder, fileName);
      try {
        await fs.access(varSourcePath);
      } catch {
        return;
      }

      // Analizar esta variante de forma independiente
      const varAnalysis = await analyzeVariantImage(varSourcePath, pokemonId, suffix);

      const varImage = sharp(varSourcePath);
      const varMetadata = await varImage.metadata();
      const varWidth = varMetadata.width || 0;
      const varHeight = varMetadata.height || 0;
      if (varWidth === 0 || varHeight === 0) return;

      const varSize = varHeight;
      const varTotalFrames = Math.floor(varWidth / varSize);

      // Extraer los frames
      const varFrames: Buffer[] = [];
      for (let i = 0; i < varTotalFrames; i++) {
        const frameImg = varImage
          .clone()
          .extract({ left: i * varSize, top: 0, width: varSize, height: varSize });
        const frameBuffer = await frameImg.raw().toBuffer();
        varFrames.push(frameBuffer);
      }

      const processAndPadVarFrames = async (indices: number[]): Promise<Buffer[]> => {
        const paddedList: Buffer[] = [];
        for (const idx of indices) {
          const safeIdx = Math.min(idx, varFrames.length - 1);
          const padded = await sharp(varFrames[safeIdx], {
            raw: {
              width: varSize,
              height: varSize,
              channels: 4
            }
          })
          .extend({
            top: 1,
            bottom: 1,
            left: 1,
            right: 1,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toBuffer();
          paddedList.push(padded);
        }
        return paddedList;
      };

      const varNewSize = varSize + 2;
      const saveVarSpritesheet = async (paddedFrames: Buffer[], outputPath: string) => {
        const compositeInputs = paddedFrames.map((buf, index) => ({
          input: buf,
          left: index * varNewSize,
          top: 0
        }));

        await sharp({
          create: {
            width: varNewSize * paddedFrames.length,
            height: varNewSize,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          }
        })
        .composite(compositeInputs)
        .png()
        .toFile(outputPath);
      };

      // Guardar Idle para esta variante
      if (varAnalysis.hasIdle && varAnalysis.idleRange) {
        const [idleStart, idleEndIdx] = varAnalysis.idleRange;
        const idleIndices = Array.from({ length: idleEndIdx - idleStart + 1 }, (_, i) => idleStart + i);
        const paddedIdle = await processAndPadVarFrames(idleIndices);
        const idleOutPath = path.join(RAW_ASSETS_DIR, 'public', 'assets', 'sprites', 'pokemon', 'animated', folder, `${pokemonId}i${suffix}.png`);
        await saveVarSpritesheet(paddedIdle, idleOutPath);
      }

      // Guardar Variación única de la variante si tiene una propia detectada
      if (varAnalysis.attackRange !== null) {
        const varAtk = varAnalysis.attackRange;
        const attackIndices = Array.from({ length: varAtk[1] - varAtk[0] + 1 }, (_, i) => varAtk[0] + i);
        const paddedAttack = await processAndPadVarFrames(attackIndices);
        const attackOutPath = path.join(RAW_ASSETS_DIR, 'public', 'assets', 'sprites', 'pokemon', 'animated', folder, `${pokemonId}v${suffix}.png`);
        await saveVarSpritesheet(paddedAttack, attackOutPath);
      }

      // Always remove the original bare spritesheet after splitting into i/v files.
      // Leaving it in place (e.g. 14.png) would cause convert_assets to generate
      // 14.webp without suffix, which breaks the animated sprite database lookup.
      await fs.unlink(varSourcePath);
    };

    for (const f of folders) {
      await processVariant(f);
    }

    let extraDetails = '';
    if (frontAnalysis.attackRange !== null) {
      extraDetails = `Idle: frames ${frontAnalysis.idleRange[0]} a ${frontAnalysis.idleRange[1]}. Ataque: frames ${frontAnalysis.attackRange[0]} a ${frontAnalysis.attackRange[1]}`;
    } else {
      extraDetails = `Idle: frames ${frontAnalysis.idleRange[0]} a ${frontAnalysis.idleRange[1]}. Sin ataque.`;
    }

    parentPort?.postMessage({
      success: true,
      pokemonId,
      suffix,
      animationsFound: frontAnalysis.attackRange !== null ? 1 : 0,
      details: extraDetails,
      warning: frontAnalysis.warning
    });
  };

  runWorker().catch(err => {
    const msg = err instanceof Error ? (err as Error).message : String(err);
    parentPort?.postMessage({ success: false, error: msg });
  });
}

// -----------------------------------------------------------------------------
// CÓDIGO PRINCIPAL (ORQUESTADOR DE HILOS CON WORKER POOL)
// -----------------------------------------------------------------------------
if (isMainThread) {
  const extraAnimationsReport: { pokemonId: string; suffix: string; animationsFound: number; details: string }[] = [];
  const warningsReport: { pokemonId: string; suffix: string; warning: string }[] = [];

  const writeFinalReport = async (): Promise<void> => {
    const reportPath = path.join(SCRATCH_DIR, 'sprite_optimization_report.md');
    let mdContent = `# Reporte de Optimización de Animaciones\n\n`;
    mdContent += `Este reporte resume el procesamiento de spritesheets optimizados y detalla los Pokémon donde se detectaron 2 o más sub-animaciones de ataque o idles adicionales, o ataques sospechosos muy cortos.\n\n`;

    if (extraAnimationsReport.length === 0) {
      mdContent += `### ✅ No se encontraron animaciones adicionales complejas.\n`;
      mdContent += `Todos los spritesheets se dividieron correctamente en 1 Idle (\`i\`) y 1 Ataque (\`v\`).\n\n`;
    } else {
      mdContent += `## ⚠️ Pokémon con 2 o más animaciones detectadas:\n\n`;
      mdContent += `| Pokémon ID | Sufijo | Animaciones Totales | Detalles de Segmentación |\n`;
      mdContent += `| ---------- | ------ | ------------------- | ------------------------- |\n`;
      for (const item of extraAnimationsReport) {
        mdContent += `| **${item.pokemonId}** | \`${item.suffix || 'Ninguno'}\` | ${item.animationsFound} | ${item.details} |\n`;
      }
      mdContent += `\n`;
    }

    if (warningsReport.length > 0) {
      mdContent += `## 🔍 Alertas de ataques cortos (exactamente 3 frames):\n\n`;
      mdContent += `| Pokémon ID | Sufijo | Advertencia |\n`;
      mdContent += `| ---------- | ------ | ----------- |\n`;
      for (const item of warningsReport) {
        mdContent += `| **${item.pokemonId}** | \`${item.suffix || 'Ninguno'}\` | ${item.warning} |\n`;
      }
      mdContent += `\n`;
    }

    await fs.writeFile(reportPath, mdContent, 'utf-8');

    const files = await fs.readdir(FRONT_DIR);
    interface PokemonAnimData {
      id: string;
      suffix: string;
      idle: string | null;
      variation: string | null;
    }
    const manifestMap = new Map<string, PokemonAnimData>();

    for (const file of files) {
      if (!file.endsWith('.png')) continue;
      const name = path.parse(file).name;
      const idleMatch = name.match(/^(\d+)i(.*)$/);
      if (idleMatch) {
        const id = idleMatch[1]!;
        const suffix = idleMatch[2]!;
        const key = `${id}_${suffix}`;
        if (!manifestMap.has(key)) {
          manifestMap.set(key, { id, suffix, idle: null, variation: null });
        }
        manifestMap.get(key)!.idle = file;
        continue;
      }

      const varMatch = name.match(/^(\d+)v(.*)$/);
      if (varMatch) {
        const id = varMatch[1]!;
        const suffix = varMatch[2]!;
        const key = `${id}_${suffix}`;
        if (!manifestMap.has(key)) {
          manifestMap.set(key, { id, suffix, idle: null, variation: null });
        }
        manifestMap.get(key)!.variation = file;
      }
    }

    const sortedManifest = Array.from(manifestMap.values()).sort((a, b) => {
      const numA = parseInt(a.id, 10);
      const numB = parseInt(b.id, 10);
      if (numA !== numB) return numA - numB;
      return a.suffix.localeCompare(b.suffix);
    });

    const manifestPath = path.join(SCRATCH_DIR, 'sprites_manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(sortedManifest, null, 2), 'utf-8');

    const jsDataPath = path.join(SCRATCH_DIR, 'sprites_data.js');
    const jsContent = `var pokemonList = ${JSON.stringify(sortedManifest, null, 2)};`;
    await fs.writeFile(jsDataPath, jsContent, 'utf-8');
  };

  const main = async () => {
    const { values, positionals } = parseArgs({
      options: {
        all: { type: 'boolean', default: false },
        id: { type: 'string' },
        file: { type: 'string' },
        dir: { type: 'string' },
        range: { type: 'string' },
        // NOTE: always true — leaving bare files (e.g. 14.png) without i/v suffix
        // corrupts the convert_assets pipeline which would generate 14.webp instead of 14i.webp
        'remove-original': { type: 'boolean', default: true }
      },
      allowPositionals: true,
      strict: false
    });

    try {
      const targetDir = typeof values.dir === 'string' ? safeResolve(process.cwd(), values.dir) : FRONT_DIR;
      const files = await fs.readdir(targetDir);
      const targetFiles = files.filter(file => {
        if (!file.endsWith('.png')) return false;
        const name = path.parse(file).name;
        const match = name.match(/^(\d+)(.*)$/);
        if (!match) return false;
        const id = match[1]!;
        if (id === '0') return false;
        return true;
      });

      let filteredFiles = targetFiles;
      const fileFilter = typeof values.file === 'string' ? values.file : (positionals[0]?.endsWith('.png') ? positionals[0] : undefined);
      const idFilter = typeof values.id === 'string' ? values.id : (positionals[0] && !positionals[0].includes('-') && !positionals[0].endsWith('.png') && positionals[0] !== 'all' ? positionals[0] : undefined);
      const rangeFilter = typeof values.range === 'string' ? values.range : (positionals[0]?.includes('-') ? positionals[0] : undefined);

      if (fileFilter) {
        filteredFiles = targetFiles.filter(file => {
          return file === fileFilter || path.parse(file).name === path.parse(fileFilter).name;
        });
        console.log(`🎯 Filtrado por Archivo "${fileFilter}": ${filteredFiles.length} archivo(s) encontrado(s).`);
      } else if (idFilter) {
        filteredFiles = targetFiles.filter(file => {
          const name = path.parse(file).name;
          const match = name.match(/^(\d+)(.*)$/);
          if (!match) return false;
          const pid = match[1]!;
          const suffix = match[2]!;
          return pid === idFilter || `${pid}${suffix}` === idFilter;
        });
        console.log(`🎯 Filtrado por ID "${idFilter}": ${filteredFiles.length} archivo(s) encontrado(s).`);
      } else if (rangeFilter) {
        const [startStr, endStr] = rangeFilter.split('-');
        const start = parseInt(startStr || '0', 10);
        const end = parseInt(endStr || '9999', 10);
        filteredFiles = targetFiles.filter(file => {
          const name = path.parse(file).name;
          const match = name.match(/^(\d+)(.*)$/);
          if (!match) return false;
          const pid = parseInt(match[1]!, 10);
          return pid >= start && pid <= end;
        });
        console.log(`🎯 Filtrado por Rango "${values.range}": ${filteredFiles.length} archivo(s) encontrado(s).`);
      }

      if (filteredFiles.length === 0) {
        console.log(`❌ No se encontraron archivos para procesar.`);
        process.exit(0);
      }

      if (!values.all && !values.id && !values.range && !values.file) {
        console.log('Debes ejecutar con --all para procesamiento masivo, --file <nombre.png> para uno específico, --id <id>, o --range <inicio>-<fin>.');
        process.exit(0);
      }

      // Configuración de Hilos lógicos
      const numCPUs = os.cpus().length || 4;
      const workerPoolLimit = values.id ? 1 : numCPUs; 
      console.log(`🚀 Iniciando Worker Pool con límites de concurrencia: ${workerPoolLimit} hilo(s).`);

      let activeWorkers = 0;
      let completedCount = 0;
      let failedCount = 0;
      let hasErrors = false;
      let fileIndex = 0;

      const runNextWorker = () => {
        if (fileIndex >= filteredFiles.length) {
          if (activeWorkers === 0) {
            writeFinalReport().then(() => {
              if (hasErrors) {
                console.error(`\n❌ Proceso finalizado con ${failedCount} error(es) en hilos.`);
                process.exit(1);
              } else {
                console.log('\n🎉 ¡Procesamiento completado con éxito!');
                process.exit(0);
              }
            });
          }
          return;
        }

        const file = filteredFiles[fileIndex]!;
        fileIndex++;
        activeWorkers++;

        const worker = new Worker(__filename, {
          workerData: { fileName: file, removeOriginal: values['remove-original'] }
        });

        worker.on('message', (msg: unknown) => {
          const payload = msg as { success: boolean; details?: string; pokemonId: string; suffix: string; animationsFound: number; warning?: string; error?: string };
          if (payload.success) {
            completedCount++;
            if (payload.details) {
              extraAnimationsReport.push({
                pokemonId: payload.pokemonId,
                suffix: payload.suffix,
                animationsFound: payload.animationsFound,
                details: payload.details
              });
            }
            if (payload.warning) {
              warningsReport.push({
                pokemonId: payload.pokemonId,
                suffix: payload.suffix,
                warning: payload.warning
              });
            }
            console.log(`   [OK - HILO] Procesado con éxito: ${file} (${completedCount + failedCount}/${filteredFiles.length})`);
            
            // Actualizar DB en tiempo real al superar bloques de 32, o al final de listas cortas
            if (completedCount % DB_SYNC_BATCH_CHUNK_SIZE === 0 || filteredFiles.length < DB_SYNC_BATCH_CHUNK_SIZE) {
              writeFinalReport().catch(() => {});
            }
          } else {
            hasErrors = true;
            failedCount++;
            console.error(`❌ Error en hilo procesando ${file}:`, payload.error);
          }
        });

        worker.on('error', (err) => {
          hasErrors = true;
          failedCount++;
          console.error(`❌ Error general de Worker para ${file}:`, err);
        });

        worker.on('exit', () => {
          activeWorkers--;
          runNextWorker();
        });
      };

      // Inundar la piscina de workers hasta el número total de CPUs/hilos lógicos del sistema (32 concurrentes)
      for (let w = 0; w < workerPoolLimit; w++) {
        runNextWorker();
      }

    } catch (err) {
      console.error('❌ Error general durante el procesamiento masivo:', err);
      process.exit(1);
    }
  };

  main().catch(err => {
    console.error('❌ Error crítico en main:', err);
    process.exit(1);
  });
}
