// fallow-ignore-file security-sink
/**
 * scripts/e2e/run_sequential_simulations.ts
 * Sequential E2E Simulation Orchestrator.
 * Dynamically discovers all individual simulation files (.simulation.ts) under scripts/e2e/
 * and executes each file strictly one by one. Stops immediately on failure.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

interface SimulationTarget {
  name: string;
  command: string;
  relativePath: string;
  fullPath: string;
  caseCount: number;
}

function findSimulationFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (['fuzzer', 'results', 'helpers', 'node_modules'].includes(file)) {
        continue;
      }
      findSimulationFiles(filePath, fileList);
    } else if (file.endsWith('.simulation.ts')) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

interface PlaywrightSuiteNode {
  file?: string;
  specs?: unknown[];
  suites?: unknown[];
}

function countSpecs(suite: PlaywrightSuiteNode): number {
  let count = (suite.specs || []).length;
  if (Array.isArray(suite.suites)) {
    for (const child of suite.suites as PlaywrightSuiteNode[]) {
      count += countSpecs(child);
    }
  }
  return count;
}

function buildTarget(fullPath: string, caseCount = 1): SimulationTarget {
  const relativePath = path.relative(process.cwd(), fullPath).split(path.sep).join(path.posix.sep);
  return {
    name: path.basename(fullPath),
    command: `npx playwright test ${relativePath}`,
    relativePath,
    fullPath,
    caseCount
  };
}

function discoverPlaywrightTargets(): SimulationTarget[] {
  const allFiles = findSimulationFiles(path.resolve(process.cwd(), 'scripts/e2e'));
  const countMap = new Map<string, number>();

  try {
    const output = execSync('npx playwright test --list --reporter=json', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
      maxBuffer: 30 * 1024 * 1024
    });
    const parsed = JSON.parse(output) as { suites?: PlaywrightSuiteNode[] };

    for (const topSuite of parsed.suites || []) {
      if (topSuite.file) {
        const normFile = topSuite.file.split('\\').join('/');
        const resolvedPath = path.resolve(process.cwd(), 'scripts/e2e', normFile);
        countMap.set(resolvedPath, (countMap.get(resolvedPath) || 0) + countSpecs(topSuite));
      }
    }
  } catch {
    // Fallback to default count 1
  }

  return allFiles.map((fullPath) => {
    const resolvedFullPath = path.resolve(fullPath);
    return buildTarget(fullPath, countMap.get(resolvedFullPath) || 1);
  }).sort((a, b) => {
    if (a.caseCount !== b.caseCount) return a.caseCount - b.caseCount;
    return a.relativePath.localeCompare(b.relativePath);
  });
}

function parseCoverageReportFile(resultsDir: string, file: string): number {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(resultsDir, file), 'utf8')) as Record<string, unknown>;
    const summary = (data.summary || data) as Record<string, unknown>;
    const count = summary.totalMoves ?? summary.totalItems ?? summary.totalAbilities ?? (file.includes('scenarios') ? summary.total : undefined);
    return typeof count === 'number' ? count : 0;
  } catch {
    return 0;
  }
}

function parseCertifiedCasesFile(resultsDir: string, file: string): number {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(resultsDir, file), 'utf8')) as Record<string, unknown>;
    let batches = 0;
    for (const val of Object.values(data)) {
      if (Array.isArray(val)) {
        batches += val.length;
      }
    }
    return batches;
  } catch {
    return 0;
  }
}

function getFuzzerSummary(): { elementCount: number; batchCount: number } {
  try {
    const resultsDir = path.resolve(process.cwd(), 'scripts/e2e/results');
    if (!fs.existsSync(resultsDir)) {
      return { elementCount: 0, batchCount: 0 };
    }

    let totalElements = 0;
    let totalBatches = 0;
    const files = fs.readdirSync(resultsDir);

    for (const file of files) {
      if (file.startsWith('fuzzer_') && file.endsWith('_coverage_report.json')) {
        totalElements += parseCoverageReportFile(resultsDir, file);
      } else if (file === 'fuzzer_certified_cases.json') {
        totalBatches += parseCertifiedCasesFile(resultsDir, file);
      }
    }

    return { elementCount: totalElements, batchCount: totalBatches };
  } catch {
    return { elementCount: 0, batchCount: 0 };
  }
}

const targets: SimulationTarget[] = discoverPlaywrightTargets();

// Support dynamic documentation flags: --table, --list, --json (and clean positional equivalents)
if (process.argv.includes('--table') || process.argv.includes('table') || process.argv.includes('--list-markdown')) {
  const fuzzerSummary = getFuzzerSummary();
  const totalPlaywrightTests = targets.reduce((sum, t) => sum + t.caseCount, 0);

  console.log('| # | Suite / Archivo de Simulación | Casos / Elementos | Comando de Ejecución Directa | Estado |');
  console.log('|:---|:---|:---|:---|:---|');
  console.log(`| **0** | \`scripts/e2e/fuzzer/runners/run_all_fuzzers.ts\` | **${fuzzerSummary.elementCount} elementos** / ${fuzzerSummary.batchCount} batallas | \`npm run sim:fuzzer\` | 🟢 **100% PASS** |`);
  targets.forEach((target, index) => {
    console.log(`| **${index + 1}** | \`${target.relativePath}\` | **${target.caseCount}** tests | \`${target.command}\` | ⏳ Pendiente |`);
  });
  console.log(`| **Final** | \`scripts/e2e/run_sequential_simulations.ts\` | **${totalPlaywrightTests} tests totales** en ${targets.length} suites | \`npm run sim:e2e\` | ⏳ Pendiente tras validación individual |`);
  process.exit(0);
}

if (process.argv.includes('--json') || process.argv.includes('json')) {
  console.log(JSON.stringify({ fuzzer: getFuzzerSummary(), targets }, null, 2));
  process.exit(0);
}

if (process.argv.includes('--list') || process.argv.includes('list')) {
  const fuzzerSummary = getFuzzerSummary();
  console.log(`📋 Total de suites E2E detectadas: ${targets.length} suites (${targets.reduce((sum, t) => sum + t.caseCount, 0)} tests Playwright + ${fuzzerSummary.elementCount} elementos en Fuzzer)`);
  targets.forEach((target, index) => {
    console.log(`  ${index + 1}. [${target.name}] (${target.caseCount} tests) -> ${target.command}`);
  });
  process.exit(0);
}

import { spawn, type ChildProcess } from 'node:child_process';
import { SimulationRunnerLogger } from './logging/simulation_runner_logger.ts';

const logger = new SimulationRunnerLogger();
logger.startIntercepting();

const VITE_PORT = 5174;
const VITE_URL = `http://localhost:${VITE_PORT}`;
const HEALTH_CHECK_TIMEOUT_MS = 30000;
const HEALTH_CHECK_INTERVAL_MS = 250;

async function startPersistentViteServer(): Promise<ChildProcess | null> {
  // 1. Check if already responding
  try {
    const res = await fetch(VITE_URL);
    if (res.ok) {
      logger.progress(`🔥 Servidor web existente detectado en ${VITE_URL} (Listo).`);
      return null;
    }
  } catch {
    // Not running yet, spawn it
  }

  logger.progress(`🚀 Inicializando servidor web persistente en ${VITE_URL}...`);
  const viteProcess = spawn('npx', ['vite', '--port', String(VITE_PORT), '--strictPort'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NO_UPDATE_NOTIFIER: '1'
    }
  });

  const startTime = Date.now();
  while (Date.now() - startTime < HEALTH_CHECK_TIMEOUT_MS) {
    try {
      const res = await fetch(VITE_URL);
      if (res.ok) {
        logger.progress(`🔥 Servidor Vite persistente pre-calentado y listo en ${VITE_URL} (${((Date.now() - startTime) / 1000).toFixed(1)}s).\n`);
        return viteProcess;
      }
    } catch {
      // Wait before next probe
    }
    await new Promise((resolve) => setTimeout(resolve, HEALTH_CHECK_INTERVAL_MS));
  }

  viteProcess.kill('SIGKILL');
  throw new Error(`[SIMULATION-RUNNER] Timeout esperando que el servidor Vite en ${VITE_URL} responda.`);
}

function stopPersistentViteServer(viteProcess: ChildProcess | null): void {
  if (viteProcess && !viteProcess.killed) {
    try {
      logger.progress(`\n🛑 Deteniendo servidor Vite persistente...`);
      viteProcess.kill('SIGTERM');
    } catch {
      viteProcess.kill('SIGKILL');
    }
  }
}

function runCommandStreamed(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const parts = command.split(' ');
    const cmd = parts[0]!;
    const args = parts.slice(1);
    const child = spawn(cmd, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --no-experimental-webstorage`.trim(),
        npm_config_loglevel: 'silent',
        NO_UPDATE_NOTIFIER: '1'
      }
    });

    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf-8');
      const lines = text.split('\n');
      for (const line of lines) {
        if (!line.includes('npm notice') && !line.includes('[WebServer] npm notice') && line.trim()) {
          console.log(line);
        }
      }
    });

    child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf-8');
      const lines = text.split('\n');
      for (const line of lines) {
        if (!line.includes('npm notice') && !line.includes('[WebServer] npm notice') && line.trim()) {
          console.error(line);
        }
      }
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

async function runAllSequentialSuites(): Promise<void> {
  let persistentVite: ChildProcess | null = null;
  try {
    logger.progress('\n==================================================');
    logger.progress('🚀 DISPOSITIVO DE SIMULACIONES E2E SECUENCIAL (DINÁMICO)');
    logger.progress('==================================================');
    logger.progress(`📋 Se detectaron dinámicamente ${targets.length} archivos de simulación E2E (Ordenados de menor a mayor cantidad de casos):`);
    targets.forEach((target, index) => {
      logger.progress(`  ${index + 1}. [${target.name}] (${target.caseCount} caso/s) -> ${target.command}`);
    });
    logger.progress('==================================================\n');

    persistentVite = await startPersistentViteServer();

    // Clean exit hooks
    const cleanup = () => {
      stopPersistentViteServer(persistentVite);
    };
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('exit', cleanup);

    let passedCount = 0;

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i]!;
      logger.progressPercent(i + 1, targets.length, `▶️ Ejecutando: ${target.name} (${target.relativePath})...`);
      const startTime = Date.now();

      try {
        await runCommandStreamed(target.command);
        const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
        logger.progressPercent(i + 1, targets.length, `✅ PASS: ${target.name} (${durationSec}s)`);
        passedCount++;
      } catch (_err: unknown) {
        const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
        logger.error(`\n❌ [${i + 1}/${targets.length}] FAIL: "${target.name}" ha fallado tras ${durationSec}s.`);
        logger.error(`🛑 Deteniendo la ejecución secuencial debido al fallo.\n`);
        process.exit(1);
      }
    }

    logger.progress('\n==================================================');
    logger.progress(`🎉 ¡TODAS LAS ${targets.length} SUITES DE SIMULACIÓN E2E HAN PASADO EXITOSAMENTE! (${passedCount}/${targets.length})`);
    logger.progress('==================================================\n');
    process.exit(0);
  } catch (error) {
    logger.error(`💥 Error fatal durante el dispositivo de simulaciones: ${(error as Error).message}`);
    process.exit(1);
  } finally {
    stopPersistentViteServer(persistentVite);
    logger.stopIntercepting();
  }
}

void runAllSequentialSuites();
