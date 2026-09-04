// scripts/e2e/fuzzer/runners/run_all_fuzzers.ts
Reflect.set(globalThis, '__E2E__', true);
process.env.VITE_E2E = 'true';

import { runMovesFuzzer, runAbilitiesFuzzer, runItemsFuzzer, runScenariosFuzzer, flushFuzzerMemoryStoreToDisk } from '../core/fuzzer_engine.ts';
import { runMedicineFuzzer } from '../core/fuzzer_medicine_cases.ts';
import { runFuzzerSuite } from '../core/fuzzer_runner.ts';
import { FuzzerRunnerLogger } from '../../logging/fuzzer_runner_logger.ts';
import { formatExecutionTimestamp } from '../../logging/base_runner_logger.ts';

async function main() {
  const logger = new FuzzerRunnerLogger();
  logger.startIntercepting();

  try {
    logger.progress('==================================================');
    logger.progress('🚀 [FUZZER] Iniciando Suite Completa Unificada en Memoria...');
    logger.progress(`📅 Fecha y hora de inicio: ${formatExecutionTimestamp()}`);
    logger.progress('==================================================');
    const suites = [
      { name: 'Movimientos', run: runMovesFuzzer },
      { name: 'Habilidades', run: runAbilitiesFuzzer },
      { name: 'Objetos en Batalla', run: runItemsFuzzer },
      { name: 'Medicinas de Bolsa', run: runMedicineFuzzer },
      { name: 'Escenarios Mecánicos Específicos', run: runScenariosFuzzer },
    ];
    
    for (let i = 0; i < suites.length; i++) {
      const suite = suites[i]!;
      logger.progressPercent(i + 1, suites.length, `Ejecutando Suite ${suite.name}...`);
      await runFuzzerSuite({ suiteName: suite.name, run: suite.run });
    }

    // Guardar a disco los casos certificados de combate acumulados en memoria
    await flushFuzzerMemoryStoreToDisk();
    logger.progressPercent(suites.length, suites.length, '✨ [FUZZER] Suite completa finalizada con éxito.');
    logger.progress(`📄 [FUZZER] Logs detallados de depuración guardados en: ${logger.getDebugFilePath()}`);
  } finally {
    logger.close();
  }
}

await main();
