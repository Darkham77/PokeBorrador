import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const consolidatorPath = path.resolve(process.cwd(), 'scripts/e2e/results/fuzzer_certified_cases.json');

function checkAndRunFuzzers() {
  console.log(`\n======================================================`);
  console.log(`🔍 [PRE-CHECK E2E] Comprobando casos de fuzzer certificados...`);

  let needsRun = process.env.FORCE_FUZZER === 'true';
  if (needsRun) {
    console.log(`🔄 FORCE_FUZZER es true. Forzando regeneración de casos...`);
  } else if (!fs.existsSync(consolidatorPath)) {
    console.log(`⚠️  No se encontró fuzzer_certified_cases.json.`);
    needsRun = true;
  } else {
    try {
      const content = JSON.parse(fs.readFileSync(consolidatorPath, 'utf8')) as {
        battle?: unknown;
        items_consumption?: unknown;
      };
      if (!content.battle || !content.items_consumption) {
        console.log(`⚠️  fuzzer_certified_cases.json está incompleto.`);
        needsRun = true;
      }
    } catch (_e) {
      console.log(`⚠️  Error al leer fuzzer_certified_cases.json.`);
      needsRun = true;
    }
  }

  if (needsRun) {
    console.log(`🚀 Ejecutando fuzzers lógicos de combate para generar casos de prueba...`);
    try {
      // Ejecutar la suite unificada de fuzzers
      execSync('npm run sim:fuzzer', { stdio: 'inherit' });
      console.log(`✅ Casos certificados generados con éxito en fuzzer_certified_cases.json.`);
    } catch (err) {
      console.error(`❌ Error al ejecutar los fuzzers:`, err);
      process.exit(1);
    }
  } else {
    console.log(`✅ fuzzer_certified_cases.json existe y está completo.`);
  }
  console.log(`======================================================\n`);
}

checkAndRunFuzzers();
