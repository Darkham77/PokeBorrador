import type { DisplayText } from '@francogp/auditor';
import { isMainModule } from '@francogp/auditor';
/**
 * @file run_tests.ts
 * @description Testing orchestrator script with multi-platform Docker auto-discovery,
 * daemon auto-start, ephemeral PostgreSQL container lifecycle, and dual-engine Vite+ / Vitest execution.
 */

import { styleText } from 'node:util';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { defineCommand, runMain } from 'citty';
import {
  inspectDocker,
  ensurePostgresTestContainerReady,
  stopPostgresTestContainer,
  POSTGRES_URL,
  type DockerDiscovery
} from './postgres_test_container.ts';

/**
 * Ensures public/version.json is in 100% sync with package.json (SSoT) before executing tests.
 */
function syncPublicVersionJson(): void {
  try {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    if (!fs.existsSync(pkgPath)) return;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { version?: string };
    if (!pkg.version) return;

    const normalizedVersion = pkg.version.startsWith('v') ? pkg.version : `v${pkg.version}`;
    const publicVerPath = path.resolve(process.cwd(), 'public/version.json');
    const expectedContent = JSON.stringify({ version: normalizedVersion }, null, 2) + '\n';

    if (
      !fs.existsSync(publicVerPath) ||
      fs.readFileSync(publicVerPath, 'utf-8') !== expectedContent
    ) {
      fs.mkdirSync(path.dirname(publicVerPath), { recursive: true });
      fs.writeFileSync(publicVerPath, expectedContent, 'utf-8');
    }
  } catch (err) {
    console.warn(
      styleText(
        'yellow',
        `⚠️ [syncPublicVersionJson] Falló sincronización de version.json: ${(err as Error).message}`
      )
    );
  }
}

/**
 * Main execution routine.
 */
async function setupTestEnvironment(dockerInfo: DockerDiscovery): Promise<{
  postgresReady: boolean;
  cleanupContainer: () => void;
}> {
  let containerStarted = false;
  let postgresReady = false;
  const dockerBin = dockerInfo.dockerBin;

  const cleanupContainer = () => {
    if (containerStarted && dockerBin) {
      stopPostgresTestContainer(dockerBin);
    }
  };

  if (dockerInfo.isRunning && dockerBin) {
    const containerStatus = await ensurePostgresTestContainerReady();
    if (containerStatus.isReady) {
      containerStarted = true;
      postgresReady = true;
    } else {
      console.log(
        styleText('yellow', '⚠️  PostgreSQL no pudo completarse. Se continuará con SQLite en RAM.')
      );
    }
  } else {
    console.log(
      styleText(
        'cyan',
        'ℹ️  Docker no detectado o no disponible. Ejecutando tests exclusivamente en SQLite (RAM)...'
      )
    );
  }

  return { postgresReady, cleanupContainer };
}

const EXIT_CODE_SIGINT = 130 as const;
const EXIT_CODE_SIGTERM = 143 as const;

function registerCleanupSignals(cleanupContainer: () => void): void {
  process.on('SIGINT', () => {
    cleanupContainer();
    process.exit(EXIT_CODE_SIGINT);
  });
  process.on('SIGTERM', () => {
    cleanupContainer();
    process.exit(EXIT_CODE_SIGTERM);
  });
  process.on('exit', () => {
    cleanupContainer();
  });
}

interface VitestCliOptions {
  project?: string;
  coverage?: boolean;
  filter?: string;
}

function executeVitestSuite(options: VitestCliOptions, childEnv: Record<DisplayText, string>): number {
  if (!options.project && !options.coverage && !options.filter) {
    console.log(
      styleText(
        'bold',
        styleText('cyan', '📦 [1/2] Ejecutando suite de tests unitarios y componentes (unit)...')
      )
    );
    const unitProcess = spawnSync(
      'node',
      [
        '--no-experimental-webstorage',
        './node_modules/vitest/vitest.mjs',
        'run',
        '--project',
        'unit'
      ],
      { stdio: 'inherit', env: childEnv }
    );
    if (unitProcess.status !== 0) {
      return unitProcess.status ?? 1;
    }

    console.log(
      styleText(
        'bold',
        styleText('cyan', '\n📦 [2/2] Ejecutando suite de tests de lógica y persistencia (node)...')
      )
    );
    const nodeProcess = spawnSync(
      'node',
      [
        '--no-experimental-webstorage',
        './node_modules/vitest/vitest.mjs',
        'run',
        '--project',
        'node'
      ],
      { stdio: 'inherit', env: childEnv }
    );
    return nodeProcess.status ?? 0;
  }

  const isCoverage = Boolean(options.coverage);
  const BASE_NODE_RUN_ARGS = ['--no-experimental-webstorage'] as const;
  const nodeArgs = isCoverage
    ? ['--allow-inspector', ...BASE_NODE_RUN_ARGS]
    : [...BASE_NODE_RUN_ARGS];

  const vitestArgs = ['run'];
  if (options.project) {
    vitestArgs.push('--project', options.project);
  }
  if (options.coverage) {
    vitestArgs.push('--coverage');
  }
  if (options.filter) {
    vitestArgs.push(options.filter);
  }

  const vitestProcess = spawnSync(
    'node',
    [...nodeArgs, './node_modules/vitest/vitest.mjs', ...vitestArgs],
    { stdio: 'inherit', env: childEnv }
  );
  return vitestProcess.status ?? 0;
}

function printTestSummaryReport(vitestExitCode: number, postgresReady: boolean): void {
  console.log();
  if (vitestExitCode === 0) {
    if (postgresReady) {
      console.log(
        styleText('green', '======================================================================')
      );
      console.log(
        styleText(
          'bold',
          styleText(
            'green',
            '✨ REPORTE DE BASE DE DATOS: Validación DUAL completada exitosamente.'
          )
        )
      );
      console.log(styleText('green', '   - SQLite (en memoria): PASS'));
      console.log(styleText('green', '   - PostgreSQL (Docker efímero): PASS'));
      console.log(
        styleText('green', '======================================================================')
      );
    } else {
      console.log(
        styleText(
          'yellow',
          '======================================================================'
        )
      );
      console.log(styleText('bold', styleText('yellow', '⚠️  ADVERTENCIA DE ENTORNO DE PRUEBAS:')));
      console.log(
        styleText('yellow', '   Docker no fue detectado o no está en ejecución en este sistema.')
      );
      console.log(
        styleText('yellow', '   Los tests se ejecutaron exclusivamente en emulación SQLite (RAM).')
      );
      console.log(
        styleText(
          'yellow',
          '   👉 Se recomienda instalar o iniciar Docker Desktop (o Docker Engine en Linux)'
        )
      );
      console.log(
        styleText('yellow', '      para habilitar la validación dual con PostgreSQL real.')
      );
      console.log(
        styleText(
          'yellow',
          '======================================================================'
        )
      );
    }
  } else {
    console.log(
      styleText('red', '======================================================================')
    );
    console.log(
      styleText(
        'bold',
        styleText(
          'red',
          `❌ REPORTE DE TESTS: Se detectaron fallas en la ejecución (Exit Code: ${vitestExitCode}).`
        )
      )
    );
    if (!postgresReady) {
      console.log(
        styleText(
          'yellow',
          '   ℹ️  Nota: Docker no estuvo activo; las fallas ocurrieron en SQLite (RAM).'
        )
      );
    }
    console.log(
      styleText('red', '======================================================================')
    );
  }
}

async function runTestRunner(options: VitestCliOptions): Promise<void> {
  syncPublicVersionJson();
  const dockerInfo = await inspectDocker();
  const { postgresReady, cleanupContainer } = await setupTestEnvironment(dockerInfo);
  registerCleanupSignals(cleanupContainer);

  const childEnv: Record<DisplayText, string> = {
    // open-record: Generic key-value data dictionary container
    ...(process.env as Record<DisplayText, string>) // open-record: Generic key-value data dictionary container
  };

  if (postgresReady) {
    childEnv.TEST_POSTGRES_URL = POSTGRES_URL;
  } else {
    delete childEnv.TEST_POSTGRES_URL;
  }

  let vitestExitCode: number;

  try {
    console.log(
      styleText(
        'bold',
        styleText('blue', '\n------------------------------------------------------------')
      )
    );
    console.log(
      styleText(
        'bold',
        styleText(
          'cyan',
          `🧪 INICIANDO EJECUCIÓN DE TESTS (${postgresReady ? 'DUAL: PostgreSQL + SQLite' : 'SQLite RAM'})`
        )
      )
    );
    console.log(
      styleText(
        'bold',
        styleText('blue', '------------------------------------------------------------\n')
      )
    );

    vitestExitCode = executeVitestSuite(options, childEnv);
  } finally {
    cleanupContainer();
  }

  printTestSummaryReport(vitestExitCode, postgresReady);
  process.exit(vitestExitCode);
}

export const command = defineCommand({
  meta: {
    name: 'run-tests',
    description: 'Orquestador centralizado de pruebas unitarias y de integración'
  },
  args: {
    project: {
      type: 'string',
      description: 'Proyecto de Vitest a ejecutar (unit, node, migrations)'
    },
    coverage: {
      type: 'boolean',
      description: 'Generar reporte de cobertura'
    },
    filter: {
      type: 'positional',
      description: 'Filtro o archivo específico de pruebas a ejecutar',
      required: false
    }
  },
  async run({ args }) {
    await runTestRunner({
      project: args.project,
      coverage: args.coverage,
      filter: args.filter
    });
  }
});
if (isMainModule(import.meta.url)) {
  runMain(command);
}
