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

function countSimulationCases(fullPath: string): number {
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    
    // Detectar si el test lee un JSON de casos/lotes (ej. fuzzer_certified_cases.json)
    const jsonMatches = content.matchAll(/['"]([^'"]+\.json)['"]/g);
    for (const match of jsonMatches) {
      if (match[1] && !match[1].includes('package.json') && !match[1].includes('tsconfig')) {
        const candidatePath = match[1].startsWith('/')
          ? match[1]
          : path.resolve(process.cwd(), match[1]);
        if (fs.existsSync(candidatePath)) {
          const parsed = JSON.parse(fs.readFileSync(candidatePath, 'utf-8'));
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.length;
          } else if (typeof parsed === 'object' && parsed !== null) {
            const list = (parsed.battle || parsed.cases || parsed.batches || parsed.tests || Object.values(parsed).find(Array.isArray)) as unknown[];
            if (Array.isArray(list) && list.length > 0) {
              return list.length;
            }
          }
        }
      }
    }
    
    const matches = content.match(/\btest\s*\(/g);
    return matches ? matches.length : 1;
  } catch {
    return 1;
  }
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
    const caseCount = countSimulationCases(fullPath);
    return {
      name: basename,
      command: `npx playwright test ${relativePath}`,
      relativePath,
      fullPath,
      caseCount
    };
  })
  .sort((a, b) => {
    if (a.caseCount !== b.caseCount) {
      return a.caseCount - b.caseCount;
    }
    return a.relativePath.localeCompare(b.relativePath);
  });

console.log('\n==================================================');
console.log('🚀 DISPOSITIVO DE SIMULACIONES E2E SECUENCIAL (DINÁMICO)');
console.log('==================================================');
console.log(`📋 Se detectaron dinámicamente ${targets.length} archivos de simulación E2E (Ordenados de menor a mayor cantidad de casos):`);
targets.forEach((target, index) => {
  console.log(`  ${index + 1}. [${target.name}] (${target.caseCount} caso/s) -> ${target.command}`);
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
