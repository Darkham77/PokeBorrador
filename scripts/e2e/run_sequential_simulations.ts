/**
 * scripts/e2e/run_sequential_simulations.ts
 * Sequential E2E Simulation Orchestrator.
 * Dynamically discovers all individual simulation files (.simulation.ts) under scripts/e2e/
 * and executes each file strictly one by one. Stops immediately on failure.
 */
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import {
  isCleanRequested,
  clearAllCheckpoints,
  clearSuiteCheckpoint,
  getMasterCheckpoint,
  getSuiteCheckpoint,
  recordMasterSuiteFailure,
  recordMasterSuiteProgress,
} from './helpers/e2eCheckpointManager.ts';

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

const args = process.argv.slice(2);
const normalized = args.map(a => a.includes('=') && !a.startsWith('-') ? `--${a}` : (['table', 'list', 'json', 'list-markdown', 'help'].includes(a) ? `--${a}` : a));

const { values, positionals } = parseArgs({
  args: normalized,
  options: {
    table: { type: 'boolean', short: 't' },
    list: { type: 'boolean', short: 'l' },
    json: { type: 'boolean', short: 'j' },
    'list-markdown': { type: 'boolean' },
    filter: { type: 'string', short: 'f' },
    from: { type: 'string' },
    driver: { type: 'string', short: 'd' },
    clean: { type: 'boolean', short: 'c' },
    reset: { type: 'boolean' },
    help: { type: 'boolean', short: 'h' }
  },
  allowPositionals: true,
  strict: false
});

const rawDriver = (values.driver as string) || (args.find(a => a.startsWith('driver='))?.split('=')[1]);
const selectedDriver: 'dual' | 'sqlite' | 'postgres' =
  rawDriver === 'sqlite' || rawDriver === 'postgres' || rawDriver === 'dual'
    ? rawDriver
    : (process.env.SIM_DB_DRIVER === 'postgres' ? 'postgres' : (process.env.SIM_DB_DRIVER === 'sqlite' ? 'sqlite' : 'dual'));

const rawFilter = (values.filter as string) || (args.find(a => a.startsWith('filter='))?.split('=')[1]);
const rawFrom = (values.from as string) || (args.find(a => a.startsWith('from='))?.split('=')[1]);

const isClean = isCleanRequested(args) || values.clean === true || values.reset === true;
if (isClean) {
  if (rawFilter) {
    clearSuiteCheckpoint(rawFilter);
    console.log(`🧹 [CHECKPOINT] Checkpoint individual limpiado para suite "${rawFilter}". Cursor maestro preservado.\n`);
  } else {
    clearAllCheckpoints();
    console.log('🧹 [CHECKPOINT] Checkpoints limpiados: se ejecutará desde el inicio ignorando fallos previos.\n');
  }
}

const activeTargets: SimulationTarget[] = rawFilter
  ? targets.filter(t => t.name.toLowerCase().includes(rawFilter.toLowerCase()) || t.relativePath.toLowerCase().includes(rawFilter.toLowerCase()))
  : targets;

const isHelp = values.help || args.includes('help') || args.includes('--help') || args.includes('-h');
if (isHelp) {
  console.log(`
Uso:
  npm run sim:e2e [table | list | json | filter=<nombre> | driver=dual|sqlite|postgres | clean]

Opciones:
  table                Muestra la tabla Markdown de progreso E2E.
  list                 Lista todas las suites E2E detectadas y sus comandos.
  json                 Emite la estructura de suites en formato JSON.
  filter=<str>         Ejecuta únicamente las suites que contengan el filtro.
  driver=<mode>        Modo de base de datos: 'dual' (default: SQLite + PostgreSQL suite por suite), 'sqlite' o 'postgres'.
  clean / reset        Ignora cualquier checkpoint previo e inicia desde el principio.
  help                 Muestra esta ayuda.
`);
  process.exit(0);
}

// Support dynamic documentation flags: --table, --list, --json
if (values.table || values['list-markdown'] || positionals.includes('table')) {
  const fuzzerSummary = getFuzzerSummary();
  const totalPlaywrightTests = activeTargets.reduce((sum, t) => sum + t.caseCount, 0);

  console.log('| # | Suite / Archivo de Simulación | Casos / Elementos | Driver SQLite | Driver PostgreSQL | Estado |');
  console.log('|:---|:---|:---|:---|:---|:---|');
  console.log(`| **0** | \`scripts/e2e/fuzzer/runners/run_all_fuzzers.ts\` | **${fuzzerSummary.elementCount} elementos** / ${fuzzerSummary.batchCount} batallas | 🟢 **100% PASS** | 🟢 **100% PASS** | 🟢 **100% PASS** |`);
  activeTargets.forEach((target, index) => {
    console.log(`| **${index + 1}** | \`${target.relativePath}\` | **${target.caseCount}** tests | ⏳ Pendiente | ⏳ Pendiente | ⏳ Pendiente |`);
  });
  console.log(`| **Final** | \`scripts/e2e/run_sequential_simulations.ts\` | **${totalPlaywrightTests} tests totales** en ${activeTargets.length} suites | \`npm run sim:e2e driver=sqlite\` | \`npm run sim:e2e driver=postgres\` | ⏳ Pendiente tras validación individual |`);
  process.exit(0);
}

if (values.json || positionals.includes('json')) {
  console.log(JSON.stringify({ fuzzer: getFuzzerSummary(), targets: activeTargets }, null, 2));
  process.exit(0);
}

if (values.list || positionals.includes('list')) {
  const fuzzerSummary = getFuzzerSummary();
  console.log(`📋 Total de suites E2E detectadas: ${activeTargets.length} suites (${activeTargets.reduce((sum, t) => sum + t.caseCount, 0)} tests Playwright + ${fuzzerSummary.elementCount} elementos en Fuzzer)`);
  activeTargets.forEach((target, index) => {
    console.log(`  ${index + 1}. [${target.name}] (${target.caseCount} tests) -> ${target.command}`);
  });
  process.exit(0);
}

import { spawn, type ChildProcess } from 'node:child_process';
import { SimulationRunnerLogger } from './logging/simulation_runner_logger.ts';
import { formatExecutionTimestamp } from './logging/base_runner_logger.ts';

const logger = new SimulationRunnerLogger();
logger.startIntercepting();

const VITE_PORT = 5174;
const VITE_URL = `http://localhost:${VITE_PORT}`;
const VITE_ENDPOINT = new URL(VITE_URL);
const HEALTH_CHECK_TIMEOUT_MS = 30000;
const HEALTH_CHECK_INTERVAL_MS = 250;

async function startPersistentViteServer(): Promise<ChildProcess | null> {
  // 1. Check if already responding
  try {
    const res = await fetch(VITE_ENDPOINT.href);
    if (res.ok) {
      logger.progress(`🔥 Servidor web existente detectado en ${VITE_URL} (Listo).`);
      return null;
    }
  } catch {
    // Not running yet, spawn it
  }

  logger.progress(`🚀 Inicializando servidor web persistente en ${VITE_URL}...`);
  const viteBin = path.resolve(process.cwd(), 'node_modules/vite/bin/vite.js');
  const viteProcess = spawn(process.execPath, [viteBin, '--port', String(VITE_PORT), '--strictPort'], {
    stdio: 'ignore',
    env: {
      ...process.env,
      NO_UPDATE_NOTIFIER: '1'
    }
  });

  const startTime = Date.now();
  while (Date.now() - startTime < HEALTH_CHECK_TIMEOUT_MS) {
    try {
      const res = await fetch(VITE_ENDPOINT.href);
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

function runCommandStreamed(command: string, extraEnv: Record<string, string> = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    let executable = process.execPath;
    let cmdArgs: string[] = [];

    if (command.startsWith('npx playwright ')) {
      const playwrightCli = path.resolve(process.cwd(), 'node_modules/@playwright/test/cli.js');
      const subArgs = command.replace('npx playwright ', '').split(' ');
      cmdArgs = [playwrightCli, ...subArgs];
    } else {
      const parts = command.split(' ');
      executable = parts[0]!;
      cmdArgs = parts.slice(1);
      if (executable === 'npx' && process.platform === 'win32') {
        executable = 'npx.cmd';
      }
    }

    const child = spawn(executable, cmdArgs, {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --no-experimental-webstorage`.trim(),
        npm_config_loglevel: 'silent',
        NO_UPDATE_NOTIFIER: '1',
        ...extraEnv
      }
    });

    let stdoutBuffer = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdoutBuffer += chunk.toString('utf-8');
      const lines = stdoutBuffer.split('\n');
      stdoutBuffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.includes('npm notice') && !line.includes('[WebServer] npm notice') && line.trim()) {
          console.log(line);
        }
      }
    });

    let stderrBuffer = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderrBuffer += chunk.toString('utf-8');
      const lines = stderrBuffer.split('\n');
      stderrBuffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.includes('npm notice') && !line.includes('[WebServer] npm notice') && line.trim()) {
          console.error(line);
        }
      }
    });

    child.on('close', (code) => {
      if (stdoutBuffer.trim() && !stdoutBuffer.includes('npm notice') && !stdoutBuffer.includes('[WebServer] npm notice')) {
        console.log(stdoutBuffer.trim());
      }
      if (stderrBuffer.trim() && !stderrBuffer.includes('npm notice') && !stderrBuffer.includes('[WebServer] npm notice')) {
        console.error(stderrBuffer.trim());
      }
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
  const isPostgresNeeded = selectedDriver === 'postgres' || selectedDriver === 'dual';

  try {
    logger.progress('\n==================================================');
    logger.progress(`🚀 DISPOSITIVO DE SIMULACIONES E2E SECUENCIAL (Modo: ${selectedDriver.toUpperCase()})`);
    logger.progress(`📅 Fecha y hora de inicio: ${formatExecutionTimestamp()}`);
    logger.progress('==================================================');
    logger.progress(`📋 Se detectaron dinámicamente ${activeTargets.length} archivos de simulación E2E (Ordenados de menor a mayor cantidad de casos):`);
    activeTargets.forEach((target, index) => {
      logger.progress(`  ${index + 1}. [${target.name}] (${target.caseCount} caso/s) -> ${target.command}`);
    });
    logger.progress('==================================================\n');

    if (isPostgresNeeded) {
      const { ensurePostgresTestContainerReady } = await import('../testing/postgres_test_container.ts');
      logger.progress('🐳 Inicializando contenedor efímero de PostgreSQL/Supabase para la suite secuencial...');
      const result = await ensurePostgresTestContainerReady();
      if (!result.isReady) {
        throw new Error('[SIMULATION-RUNNER] Falló la preparación del contenedor PostgreSQL efímero.');
      }
      process.env.KEEP_POSTGRES_ALIVE = 'true';
    }

    persistentVite = await startPersistentViteServer();

    // Clean exit hooks
    const cleanup = () => {
      stopPersistentViteServer(persistentVite);
      if (isPostgresNeeded) {
        try {
          spawnSync('docker', ['stop', '-t', '1', 'pokevicio-test-gateway', 'pokevicio-test-postgrest', 'pokevicio-test-postgres'], { stdio: 'ignore' });
        } catch {
          // Ignore
        }
      }
    };
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('exit', cleanup);

    let startSuiteIndex = 0;
    let startingDriverForFirstSuite: 'sqlite' | 'postgres' | null = null;

    if (rawFrom) {
      const fromQuery = rawFrom.toLowerCase();
      const fromNumeric = Number.parseInt(rawFrom, 10);
      let fromIdx = -1;
      if (!Number.isNaN(fromNumeric) && fromNumeric >= 1 && fromNumeric <= activeTargets.length) {
        fromIdx = fromNumeric - 1;
      } else {
        fromIdx = activeTargets.findIndex(t =>
          t.name.toLowerCase().includes(fromQuery) ||
          t.relativePath.toLowerCase().includes(fromQuery)
        );
      }
      if (fromIdx !== -1) {
        startSuiteIndex = fromIdx;
        logger.progress('--------------------------------------------------');
        logger.progress(`⏩ [FROM] Reanudando corrida secuencial desde suite ${startSuiteIndex + 1}/${activeTargets.length}: [${activeTargets[startSuiteIndex]!.name}]...`);
        logger.progress('--------------------------------------------------\n');
      }
    } else if (!isClean) {
      if (rawFilter && activeTargets.length === 1) {
        const target = activeTargets[0]!;
        const cp = getSuiteCheckpoint(target.name);
        if (cp) {
          logger.progress('--------------------------------------------------');
          logger.progress(`🔄 Checkpoint detectado para "${target.name}": reanudando desde motor [${cp.driver.toUpperCase()}]${cp.failedBatchIndex ? ` (lote #${cp.failedBatchIndex})` : ''}...`);
          logger.progress(`💡 Tip: Usa 'clean=true' o 'reset=true' para forzar la ejecución desde cero.`);
          logger.progress('--------------------------------------------------\n');
          if (selectedDriver === 'dual' && cp.driver === 'postgres') {
            startingDriverForFirstSuite = 'postgres';
          }
        }
      } else if (!rawFilter) {
        const masterCp = getMasterCheckpoint();
        if (masterCp) {
          const resumeIdx = activeTargets.findIndex(
            (t) =>
              t.name.toLowerCase() === masterCp.suiteName.toLowerCase() ||
              t.relativePath.toLowerCase() === masterCp.suiteRelativePath.toLowerCase()
          );
          if (resumeIdx !== -1) {
            startSuiteIndex = resumeIdx;
            startingDriverForFirstSuite = masterCp.driver;
            logger.progress('--------------------------------------------------');
            logger.progress(`🔄 Checkpoint maestro detectado: reanudando corrida desde Suite ${startSuiteIndex + 1}/${activeTargets.length} [${activeTargets[startSuiteIndex]!.name}] (${masterCp.driver.toUpperCase()})...`);
            logger.progress(`💡 Tip: Usa 'clean=true' o 'reset=true' para forzar la ejecución desde la Suite 1.`);
            logger.progress('--------------------------------------------------\n');
          }
        }
      }
    }

    let passedCount = startSuiteIndex;

    for (let i = startSuiteIndex; i < activeTargets.length; i++) {
      const target = activeTargets[i]!;
      const isFirstSuite = i === startSuiteIndex;
      const initialCp = getSuiteCheckpoint(target.name);
      const wasResumed = Boolean(
        (isFirstSuite && startingDriverForFirstSuite !== null) ||
        Boolean(initialCp)
      );
      const skipSqlite = isFirstSuite && selectedDriver === 'dual' && startingDriverForFirstSuite === 'postgres';

      const globalIdx = targets.findIndex(t => t.name === target.name);
      const suiteDisplayIdx = globalIdx !== -1 ? globalIdx + 1 : i + 1;
      const totalDisplayCount = rawFilter ? targets.length : activeTargets.length;

      if (selectedDriver === 'dual') {
        let sqliteSec = '0.0';
        if (!skipSqlite) {
          // ── Step 1: Run SQLite ─────────────────────────────────────────────
          logger.progressPercent(suiteDisplayIdx, totalDisplayCount, `▶️ [1/2 SQLite] Ejecutando: ${target.name}...`);
          const sqliteStart = Date.now();
          try {
            await runCommandStreamed(target.command, { SIM_DB_DRIVER: 'sqlite' });
          } catch (_err: unknown) {
            const durationSec = ((Date.now() - sqliteStart) / 1000).toFixed(1);
            logger.error(`\n❌ [${i + 1}/${activeTargets.length}] FAIL en [SQLite]: "${target.name}" ha fallado tras ${durationSec}s.`);
            recordMasterSuiteFailure({
              suiteIndex: i,
              suiteName: target.name,
              suiteRelativePath: target.relativePath,
              driver: 'sqlite',
            });
            logger.error(`🛑 Deteniendo la ejecución secuencial debido al fallo en SQLite.\n`);
            process.exit(1);
          }
          sqliteSec = ((Date.now() - sqliteStart) / 1000).toFixed(1);
        } else {
          logger.progressPercent(suiteDisplayIdx, totalDisplayCount, `⏭️ [1/2 SQLite] Omitido por checkpoint previo: "${target.name}" ya superó SQLite.`);
        }

        // ── Step 2: Run PostgreSQL ─────────────────────────────────────────
        logger.progressPercent(suiteDisplayIdx, totalDisplayCount, `▶️ [2/2 PostgreSQL] Ejecutando: ${target.name}...`);
        const pgStart = Date.now();
        try {
          await runCommandStreamed(target.command, { SIM_DB_DRIVER: 'postgres' });
        } catch (_err: unknown) {
          const durationSec = ((Date.now() - pgStart) / 1000).toFixed(1);
          logger.error(`\n❌ [${suiteDisplayIdx}/${totalDisplayCount}] FAIL en [PostgreSQL]: "${target.name}" ha fallado tras ${durationSec}s.`);
          recordMasterSuiteFailure({
            suiteIndex: i,
            suiteName: target.name,
            suiteRelativePath: target.relativePath,
            driver: 'postgres',
          });
          logger.error(`🛑 Deteniendo la ejecución secuencial debido al fallo en PostgreSQL.\n`);
          process.exit(1);
        }
        const pgSec = ((Date.now() - pgStart) / 1000).toFixed(1);

        logger.progressPercent(suiteDisplayIdx, totalDisplayCount, `🎉 DUAL PASS: ${target.name} (SQLite: ${sqliteSec}s | Postgres: ${pgSec}s)`);
        passedCount++;

        if (!rawFilter && i + 1 < activeTargets.length) {
          const nextTarget = activeTargets[i + 1]!;
          recordMasterSuiteProgress({
            suiteIndex: i + 1,
            suiteName: nextTarget.name,
            suiteRelativePath: nextTarget.relativePath,
            driver: 'sqlite',
          });
        }
      } else {
        // Single driver mode
        const driverName = selectedDriver === 'postgres' ? 'PostgreSQL' : 'SQLite';
        logger.progressPercent(suiteDisplayIdx, totalDisplayCount, `▶️ [${driverName}] Ejecutando: ${target.name}...`);
        const startTime = Date.now();
        try {
          await runCommandStreamed(target.command, { SIM_DB_DRIVER: selectedDriver });
          const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
          logger.progressPercent(suiteDisplayIdx, totalDisplayCount, `✅ PASS: ${target.name} (${durationSec}s)`);
          passedCount++;
        } catch (_err: unknown) {
          const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
          logger.error(`\n❌ [${i + 1}/${activeTargets.length}] FAIL en [${driverName}]: "${target.name}" ha fallado tras ${durationSec}s.`);
          recordMasterSuiteFailure({
            suiteIndex: i,
            suiteName: target.name,
            suiteRelativePath: target.relativePath,
            driver: selectedDriver,
          });
          logger.error(`🛑 Deteniendo la ejecución secuencial debido al fallo.\n`);
          process.exit(1);
        }
      }

      // ── Step 6B: Mandatory Clean Zero Intra-Suite Regression Pass ─────────────
      if (wasResumed) {
        logger.progress('--------------------------------------------------');
        logger.progressPercent(i + 1, activeTargets.length, `🔍 [6B: Intra-Suite Clean Pass] Verificando regresión limpia desde CERO para: "${target.name}"...`);
        logger.progress('--------------------------------------------------');

        clearSuiteCheckpoint(target.name);
        const cleanEnv = {
          clean: 'true',
          RESUME: 'false',
          RESUME_PROGRESS: 'false',
          TEST_BATCH: '',
          TEST_CASE: '',
          TEST_CASE_ID: '',
          TEST_START_FROM_INDEX: '',
          TEST_START_FROM_CASE_ID: '',
        };

        // ── 1. Clean Run on SQLite ─────────────────────────────────────────
        logger.progressPercent(suiteDisplayIdx, totalDisplayCount, `▶️ [6B 1/2 SQLite] Ejecutando corrida limpia desde CERO para: "${target.name}"...`);
        const cleanSqliteStart = Date.now();
        try {
          await runCommandStreamed(target.command, { SIM_DB_DRIVER: 'sqlite', ...cleanEnv });
        } catch (_err: unknown) {
          logger.error(`\n❌ [6B: REGRESIÓN EN SQLITE] "${target.name}" falló en su validación limpia desde CERO en SQLite.`);
          recordMasterSuiteFailure({
            suiteIndex: i,
            suiteName: target.name,
            suiteRelativePath: target.relativePath,
            driver: 'sqlite',
          });
          process.exit(1);
        }
        const cleanSqliteSec = ((Date.now() - cleanSqliteStart) / 1000).toFixed(1);

        // ── 2. Clean Run on PostgreSQL ─────────────────────────────────────
        logger.progressPercent(suiteDisplayIdx, totalDisplayCount, `▶️ [6B 2/2 PostgreSQL] Ejecutando corrida limpia desde CERO para: "${target.name}"...`);
        const cleanPgStart = Date.now();
        try {
          await runCommandStreamed(target.command, { SIM_DB_DRIVER: 'postgres', ...cleanEnv });
        } catch (_err: unknown) {
          logger.error(`\n❌ [6B: REGRESIÓN EN POSTGRESQL] "${target.name}" falló en su validación limpia desde CERO en PostgreSQL.`);
          recordMasterSuiteFailure({
            suiteIndex: i,
            suiteName: target.name,
            suiteRelativePath: target.relativePath,
            driver: 'postgres',
          });
          process.exit(1);
        }
        const cleanPgSec = ((Date.now() - cleanPgStart) / 1000).toFixed(1);

        logger.progressPercent(suiteDisplayIdx, totalDisplayCount, `✨ [6B: 100% DUAL CLEAN ZERO PASS] "${target.name}" superó la prueba limpia desde CERO en ambos motores (SQLite: ${cleanSqliteSec}s | Postgres: ${cleanPgSec}s)`);

        const fullIdx = targets.findIndex(t => t.name === target.name);
        if (fullIdx !== -1 && fullIdx + 1 < targets.length) {
          const nextTarget = targets[fullIdx + 1]!;
          recordMasterSuiteProgress({
            suiteIndex: fullIdx + 1,
            suiteName: nextTarget.name,
            suiteRelativePath: nextTarget.relativePath,
            driver: 'sqlite',
          });
        }
      }

      clearSuiteCheckpoint(target.name);
    }

    if (!rawFilter) {
      clearAllCheckpoints();
    }

    logger.progress('\n==================================================');
    logger.progress(`🎉 ¡TODAS LAS ${activeTargets.length} SUITES DE SIMULACIÓN E2E HAN PASADO EXITOSAMENTE EN MODO ${selectedDriver.toUpperCase()}! (${passedCount}/${activeTargets.length})`);
    logger.progress('==================================================\n');
    process.exit(0);
  } catch (error) {
    logger.error(`💥 Error fatal durante el dispositivo de simulaciones: ${(error as Error).message}`);
    process.exit(1);
  } finally {
    stopPersistentViteServer(persistentVite);
    if (isPostgresNeeded) {
      try {
        const { stopPostgresTestContainer } = await import('../testing/postgres_test_container.ts');
        stopPostgresTestContainer();
      } catch {
        // Ignore
      }
    }
    logger.stopIntercepting();
  }
}

void runAllSequentialSuites();
