// scripts/e2e/fuzzer/runners/run_all_fuzzers.ts
(globalThis as unknown as Record<string, unknown>).__E2E__ = true;
process.env.VITE_E2E = 'true';

import { runMovesFuzzer, runAbilitiesFuzzer, runItemsFuzzer, runScenariosFuzzer, flushFuzzerMemoryStoreToDisk } from '../core/fuzzer_engine.ts';
import { runFuzzerSuite } from '../core/fuzzer_runner.ts';

async function main() {
  console.log('🚀 [FUZZER] Iniciando Suite Completa Unificada en Memoria...');
  
  await runFuzzerSuite({ suiteName: 'Movimientos', run: runMovesFuzzer });
  await runFuzzerSuite({ suiteName: 'Habilidades', run: runAbilitiesFuzzer });
  await runFuzzerSuite({ suiteName: 'Objetos en Batalla', run: runItemsFuzzer });
  await runFuzzerSuite({ suiteName: 'Escenarios Mecánicos Específicos', run: runScenariosFuzzer });
  
  // Guardar a disco los casos certificados de combate acumulados en memoria
  await flushFuzzerMemoryStoreToDisk();
  console.log('✨ [FUZZER] Suite completa finalizada con éxito.');
}

void main();
