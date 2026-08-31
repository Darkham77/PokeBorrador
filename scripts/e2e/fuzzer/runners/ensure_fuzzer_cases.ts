import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const resultsDir = path.resolve(process.cwd(), 'scripts/e2e/results');

function cleanFuzzerGeneratedFiles() {
  if (!fs.existsSync(resultsDir)) return;
  const files = fs.readdirSync(resultsDir);
  for (const file of files) {
    // Preservar AGENTS.md y logs de progreso
    if (file === 'AGENTS.md' || file.startsWith('simulation_progress_log_')) continue;
    // Eliminar todo archivo fuzzer_*, *.json y *.txt generado por el fuzzer
    if (file.startsWith('fuzzer_') || file.endsWith('.json') || file.endsWith('.txt')) {
      try {
        fs.unlinkSync(path.join(resultsDir, file));
        console.log(`🗑️ Eliminado artefacto generado previo: ${file}`);
      } catch (_e) {
        /* ignore */
      }
    }
  }
}

function checkAndRunFuzzers() {
  console.log(`\n======================================================`);
  console.log(`🔍 [PRE-CHECK E2E] Limpiando artefactos y regenerando fuzzers desde CERO...`);

  cleanFuzzerGeneratedFiles();

  // Anular filtros de TEST_CASE para forzar una simulación completa
  if (process.env.TEST_CASE || process.env.TEST_CASE_ID || process.env.TEST_START_FROM_CASE_ID) {
    console.log(`⚠️  Anulando filtros de TEST_CASE/TEST_CASE_ID/TEST_START_FROM_CASE_ID para forzar una simulación limpia.`);
    delete process.env.TEST_CASE;
    delete process.env.TEST_CASE_ID;
    delete process.env.TEST_START_FROM_CASE_ID;
  }

  console.log(`🚀 Ejecutando suite completa de fuzzers desde cero...`);
  try {
    execSync('npm run sim:fuzzer', { stdio: 'inherit' });
    console.log(`✅ Casos certificados y reportes de cobertura generados desde cero con éxito en scripts/e2e/results/.`);
  } catch (err) {
    console.error(`❌ Error al ejecutar los fuzzers:`, err);
    process.exit(1);
  }
  console.log(`======================================================\n`);
}

checkAndRunFuzzers();
