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

const baseE2EDir = path.resolve(process.cwd(), 'scripts/e2e');
const allSimFiles = findSimulationFiles(baseE2EDir);

const targets: SimulationTarget[] = allSimFiles
  .map((fullPath) => {
    const relativePath = path.relative(process.cwd(), fullPath);
    const basename = path.basename(fullPath);
    return {
      name: basename,
      command: `npx playwright test ${relativePath}`,
      relativePath
    };
  })
  .sort((a, b) => a.relativePath.localeCompare(b.relativePath));

console.log('\n==================================================');
console.log('🚀 DISPOSITIVO DE SIMULACIONES E2E SECUENCIAL (DINÁMICO)');
console.log('==================================================');
console.log(`📋 Se detectaron dinámicamente ${targets.length} archivos de simulación E2E:`);
targets.forEach((target, index) => {
  console.log(`  ${index + 1}. [${target.name}] -> ${target.command}`);
});
console.log('==================================================\n');

let passedCount = 0;

for (let i = 0; i < targets.length; i++) {
  const target = targets[i]!;
  console.log(`\n▶️ [${i + 1}/${targets.length}] Ejecutando: ${target.name} (${target.relativePath})...`);
  const startTime = Date.now();

  try {
    execSync(target.command, { stdio: 'inherit', env: { ...process.env } });
    const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ [${i + 1}/${targets.length}] PASS: ${target.name} (${durationSec}s)`);
    passedCount++;
  } catch (_err) {
    const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`\n❌ [${i + 1}/${targets.length}] FAIL: "${target.name}" ha fallado tras ${durationSec}s.`);
    console.error(`🛑 Deteniendo la ejecución secuencial debido al fallo.`);
    process.exit(1);
  }
}

console.log('\n==================================================');
console.log(`🎉 TODAS LAS SIMULACIONES E2E PASARON CON ÉXITO (${passedCount}/${targets.length})`);
console.log('==================================================\n');
