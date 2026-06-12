import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);

const RAW_ASSETS_DIR = path.resolve(process.cwd(), '_raw-assets');
const FRONT_DIR = path.join(RAW_ASSETS_DIR, 'public', 'assets', 'sprites', 'pokemon', 'animated', 'Front');
const SCRATCH_DIR = path.resolve(process.cwd(), 'scratch');

interface AnimationAnalysisResult {
  pokemonId: string;
  suffix: string;
  hasIdle: boolean;
  idleRange: [number, number];
  attackRange: [number, number] | null;
  warning?: string;
}

// -----------------------------------------------------------------------------
// CÓDIGO DEL WORKER (HILO SECUNDARIO DE PROCESAMIENTO INDEPENDIENTE)
// -----------------------------------------------------------------------------
if (!isMainThread) {
  const { fileName } = workerData;

  const analyzeVariantImage = async (
    varSourcePath: string,
    pokemonId: string,
    suffix: string
  ): Promise<AnimationAnalysisResult> => {
    const image = sharp(varSourcePath);
    const metadata = await image.metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    if (width === 0 || height === 0) {
      throw new Error(`Dimensiones inválidas para ${varSourcePath}`);
    }

    const size = height;
    const totalFrames = Math.floor(width / size);

    // Extraer frames raw
    const frames: Buffer[] = [];
    for (let i = 0; i < totalFrames; i++) {
      const frameImg = image
        .clone()
        .extract({ left: i * size, top: 0, width: size, height: size });
      const frameBuffer = await frameImg.raw().toBuffer();
      frames.push(frameBuffer);
    }

    const areBuffersSimilar = (buf1: Buffer, buf2: Buffer, maxDiffPerPixel = 12, maxMismatchedPixelsPercent = 0.04): boolean => {
      if (buf1.length !== buf2.length) return false;
      let mismatches = 0;
      const numPixels = buf1.length / 4;
      const maxAllowedMismatches = numPixels * maxMismatchedPixelsPercent;

      for (let i = 0; i < buf1.length; i += 4) {
        const dr = Math.abs(buf1[i]! - buf2[i]!);
        const dg = Math.abs(buf1[i + 1]! - buf2[i + 1]!);
        const db = Math.abs(buf1[i + 2]! - buf2[i + 2]!);
        const da = Math.abs(buf1[i + 3]! - buf2[i + 3]!);

        if (dr > maxDiffPerPixel || dg > maxDiffPerPixel || db > maxDiffPerPixel || da > maxDiffPerPixel) {
          mismatches++;
          if (mismatches > maxAllowedMismatches) {
            return false;
          }
        }
      }
      return true;
    };

    // Calcular IDs únicos de frames
    const uniqueFrames: Buffer[] = [];
    const frameToUniqueId: number[] = [];

    for (let i = 0; i < totalFrames; i++) {
      const currentFrame = frames[i]!;
      let uniqueId = uniqueFrames.findIndex(uf => areBuffersSimilar(uf, currentFrame));
      if (uniqueId === -1) {
        uniqueId = uniqueFrames.length;
        uniqueFrames.push(currentFrame);
      }
      frameToUniqueId.push(uniqueId);
    }

    // Analizar secuencia de frames
    const total = frameToUniqueId.length;
    interface TransitionInfo {
      frameId: number;
      originalIndices: number[];
    }
    const transitions: TransitionInfo[] = [];
    for (let i = 0; i < total; i++) {
      const fId = frameToUniqueId[i]!;
      if (transitions.length === 0 || transitions[transitions.length - 1]!.frameId !== fId) {
        transitions.push({ frameId: fId, originalIndices: [i] });
      } else {
        transitions[transitions.length - 1]!.originalIndices.push(i);
      }
    }

    const transTotal = transitions.length;
    interface CandidateCycle {
      length: number;
      repeats: number;
      firstOccurrenceIndex: number;
      score?: number;
    }
    const candidates: CandidateCycle[] = [];

    for (let T = 2; T <= Math.floor(transTotal / 2); T++) {
      for (let startIdx = 0; startIdx <= transTotal - T * 2; startIdx++) {
        let isCycle = true;
        for (let i = 0; i < T; i++) {
          if (transitions[startIdx + i]!.frameId !== transitions[startIdx + i + T]!.frameId) {
            isCycle = false;
            break;
          }
        }
        if (isCycle) {
          let repeats = 2;
          while (startIdx + (repeats + 1) * T <= transTotal) {
            let match = true;
            for (let j = 0; j < T; j++) {
              if (transitions[startIdx + repeats * T + j]!.frameId !== transitions[startIdx + j]!.frameId) {
                match = false;
                break;
              }
            }
            if (match) {
              repeats++;
            } else {
              break;
            }
          }
          candidates.push({ length: T, repeats, firstOccurrenceIndex: startIdx });
        }
      }
    }

    if (candidates.length === 0) {
      let hasNonAdjacentDuplicates = false;
      for (let i = 0; i < totalFrames; i++) {
        for (let j = i + 2; j < totalFrames; j++) {
          if (areBuffersSimilar(frames[i]!, frames[j]!)) {
            hasNonAdjacentDuplicates = true;
            break;
          }
        }
        if (hasNonAdjacentDuplicates) break;
      }

      if (hasNonAdjacentDuplicates) {
        return {
          pokemonId,
          suffix,
          hasIdle: true,
          idleRange: [0, totalFrames - 1],
          attackRange: null,
          warning: `No se pudo detectar el ciclo de animación en ${varSourcePath}, pero existen frames no adyacentes duplicados. Se asume Idle completo.`
        };
      }

      return {
        pokemonId,
        suffix,
        hasIdle: true,
        idleRange: [0, totalFrames - 1],
        attackRange: null
      };
    }

    candidates.forEach(c => {
      let totalFramesInCycle = 0;
      for (let i = 0; i < c.length * c.repeats; i++) {
        const trans = transitions[c.firstOccurrenceIndex + i];
        if (trans) {
          totalFramesInCycle += trans.originalIndices.length;
        }
      }
      c.score = totalFramesInCycle;
    });

    candidates.sort((a, b) => ((b.score ?? 0) - (a.score ?? 0)) || b.repeats - a.repeats || b.length - a.length);
    const idleCandidate = candidates[0]!;

    const idleStart = 0;
    // const lastTransIdx = idleCandidate.firstOccurrenceIndex + (idleCandidate.length * idleCandidate.repeats) - 1;
    // const idleEnd = transitions[lastTransIdx]!.originalIndices[transitions[lastTransIdx]!.originalIndices.length - 1]!;

    const firstCycleEndTransIdx = idleCandidate.firstOccurrenceIndex + idleCandidate.length - 1;
    const firstCycleEnd = transitions[firstCycleEndTransIdx]!.originalIndices[transitions[firstCycleEndTransIdx]!.originalIndices.length - 1]!;

    const idleFramesSet = new Set<number>();
    for (let i = 0; i < idleCandidate.length; i++) {
      idleFramesSet.add(transitions[idleCandidate.firstOccurrenceIndex + i]!.frameId);
    }

    // El ataque comienza buscando desde el inicio (frame 0) para hacer trim de los idles iniciales y finales
    let s = 0;
    let e = total - 1;
    while (s <= e && idleFramesSet.has(frameToUniqueId[s]!)) {
      s++;
    }
    while (e >= s && idleFramesSet.has(frameToUniqueId[e]!)) {
      e--;
    }

    let attackRange: [number, number] | null = null;
    let warning: string | undefined;

    if (e >= s) {
      const attackLength = e - s + 1;
      if (attackLength <= 2) {
        // Descartar ataque de <= 2 frames y tratar como idle puro
        return {
          pokemonId,
          suffix,
          hasIdle: true,
          idleRange: [0, totalFrames - 1],
          attackRange: null
        };
      } else if (attackLength === 3) {
        warning = `Posible ataque falso corto de 3 frames (rango: ${s} a ${e})`;
        attackRange = [s, e];
      } else {
        attackRange = [s, e];
      }
    }

    return {
      pokemonId,
      suffix,
      hasIdle: true,
      idleRange: [idleStart, firstCycleEnd],
      attackRange,
      warning
    };
  };

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
    const folders = ['Front', 'Back', 'Front shiny', 'Back shiny'];

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
    parentPort?.postMessage({ success: false, error: err.message });
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
    const { values } = parseArgs({
      options: {
        all: { type: 'boolean', default: false },
        id: { type: 'string' },
        range: { type: 'string' },
        // NOTE: always true — leaving bare files (e.g. 14.png) without i/v suffix
        // corrupts the convert_assets pipeline which would generate 14.webp instead of 14i.webp
        'remove-original': { type: 'boolean', default: true }
      }
    });

    try {
      const files = await fs.readdir(FRONT_DIR);
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
      if (values.id) {
        filteredFiles = targetFiles.filter(file => {
          const name = path.parse(file).name;
          const match = name.match(/^(\d+)(.*)$/);
          if (!match) return false;
          const pid = match[1]!;
          const suffix = match[2]!;
          return pid === values.id || `${pid}${suffix}` === values.id;
        });
        console.log(`🎯 Filtrado por ID "${values.id}": ${filteredFiles.length} archivo(s) encontrado(s).`);
      } else if (values.range) {
        const [startStr, endStr] = values.range.split('-');
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

      if (!values.all && !values.id && !values.range) {
        console.log('Debes ejecutar con --all para procesamiento masivo, --id <id> para uno específico, o --range <inicio>-<fin> para un rango.');
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

        worker.on('message', (msg) => {
          if (msg.success) {
            completedCount++;
            if (msg.details) {
              extraAnimationsReport.push({
                pokemonId: msg.pokemonId,
                suffix: msg.suffix,
                animationsFound: msg.animationsFound,
                details: msg.details
              });
            }
            if (msg.warning) {
              warningsReport.push({
                pokemonId: msg.pokemonId,
                suffix: msg.suffix,
                warning: msg.warning
              });
            }
            console.log(`   [OK - HILO] Procesado con éxito: ${file} (${completedCount + failedCount}/${filteredFiles.length})`);
            
            // Actualizar DB en tiempo real al superar bloques de 32, o al final de listas cortas
            if (completedCount % 32 === 0 || filteredFiles.length < 32) {
              writeFinalReport().catch(() => {});
            }
          } else {
            hasErrors = true;
            failedCount++;
            console.error(`❌ Error en hilo procesando ${file}:`, msg.error);
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
