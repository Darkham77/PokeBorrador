/**
 * @file run_tests.ts
 * @description Testing orchestrator script with multi-platform Docker auto-discovery,
 * daemon auto-start, ephemeral PostgreSQL container lifecycle, and dual-engine Vitest execution.
 */

import { styleText } from 'node:util';
import { spawnSync } from 'node:child_process';
import {
  inspectDocker,
  ensurePostgresTestContainerReady,
  stopPostgresTestContainer,
  POSTGRES_URL
} from './postgres_test_container.ts';

/**
 * Main execution routine.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dockerInfo = await inspectDocker();

  let containerStarted = false;
  let postgresReady = false;
  const dockerBin = dockerInfo.dockerBin;

  const cleanupContainer = () => {
    if (containerStarted) {
      stopPostgresTestContainer(dockerBin);
    }
  };

  // Register signal listeners for guaranteed teardown
  process.on('SIGINT', () => {
    cleanupContainer();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    cleanupContainer();
    process.exit(143);
  });
  process.on('exit', () => {
    cleanupContainer();
  });

  if (dockerInfo.isRunning && dockerBin) {
    const containerStatus = await ensurePostgresTestContainerReady();
    if (containerStatus.isReady) {
      containerStarted = true;
      postgresReady = true;
    } else {
      console.log(styleText('yellow', '⚠️  PostgreSQL no pudo completarse. Se continuará con SQLite en RAM.'));
    }
  } else {
    console.log(styleText('cyan', 'ℹ️  Docker no detectado o no disponible. Ejecutando tests exclusivamente en SQLite (RAM)...'));
  }

  // Setup environment variables for Vitest child process
  const childEnv: Record<string, string> = { // open-record: Generic key-value data dictionary container
    ...(process.env as Record<string, string>) // open-record: Generic key-value data dictionary container
  };

  if (postgresReady) {
    childEnv.TEST_POSTGRES_URL = POSTGRES_URL;
  } else {
    delete childEnv.TEST_POSTGRES_URL;
  }

  let vitestExitCode = 0;

  try {
    console.log(styleText('bold', styleText('blue', '\n------------------------------------------------------------')));
    console.log(styleText('bold', styleText('cyan', `🧪 INICIANDO EJECUCIÓN DE TESTS (${postgresReady ? 'DUAL: PostgreSQL + SQLite' : 'SQLite RAM'})`)));
    console.log(styleText('bold', styleText('blue', '------------------------------------------------------------\n')));

    const vitestProcess = spawnSync(
      'node',
      ['--no-experimental-webstorage', './node_modules/vitest/vitest.mjs', 'run', ...args],
      {
        stdio: 'inherit',
        env: childEnv
      }
    );

    vitestExitCode = vitestProcess.status ?? 0;
  } finally {
    cleanupContainer();
  }

  // Print final summary report
  console.log();
  if (vitestExitCode === 0) {
    if (postgresReady) {
      console.log(styleText('green', '======================================================================'));
      console.log(styleText('bold', styleText('green', '✨ REPORTE DE BASE DE DATOS: Validación DUAL completada exitosamente.')));
      console.log(styleText('green', '   - SQLite (en memoria): PASS'));
      console.log(styleText('green', '   - PostgreSQL (Docker efímero): PASS'));
      console.log(styleText('green', '======================================================================'));
    } else {
      console.log(styleText('yellow', '======================================================================'));
      console.log(styleText('bold', styleText('yellow', '⚠️  ADVERTENCIA DE ENTORNO DE PRUEBAS:')));
      console.log(styleText('yellow', '   Docker no fue detectado o no está en ejecución en este sistema.'));
      console.log(styleText('yellow', '   Los tests se ejecutaron exclusivamente en emulación SQLite (RAM).'));
      console.log(styleText('yellow', '   👉 Se recomienda instalar o iniciar Docker Desktop (o Docker Engine en Linux)'));
      console.log(styleText('yellow', '      para habilitar la validación dual con PostgreSQL real.'));
      console.log(styleText('yellow', '======================================================================'));
    }
  } else {
    console.log(styleText('red', '======================================================================'));
    console.log(styleText('bold', styleText('red', `❌ REPORTE DE TESTS: Se detectaron fallas en la ejecución (Exit Code: ${vitestExitCode}).`)));
    if (!postgresReady) {
      console.log(styleText('yellow', '   ℹ️  Nota: Docker no estuvo activo; las fallas ocurrieron en SQLite (RAM).'));
    }
    console.log(styleText('red', '======================================================================'));
  }

  process.exit(vitestExitCode);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(styleText('red', `❌ Error fatal en orquestador de pruebas: ${msg}`));
  process.exit(1);
});
