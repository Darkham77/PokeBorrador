/**
 * scripts/migrate_temporal.ts
 * 
 * Script de migración masiva: Date -> Temporal API
 * 
 * Basado en los estándares del proyecto (Regla 7).
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', '_raw-assets', 'scripts']); // runtime-set

async function getFilesToMigrate(dir: string): Promise<string[]> {
  const files: string[] = []; // no-domain
  const pattern = '**/*.{ts,js,vue}';
  
  for await (const entry of fs.glob(pattern, { cwd: dir, exclude: (p) => Array.from(IGNORE_DIRS).some(d => p.includes(d)) })) {
    files.push(path.resolve(dir, entry));
  }
  return files;
}

async function migrate(filePath: string) {
  if (filePath.includes('migrate_temporal.ts')) {
    return;
  }
  let content = await fs.readFile(filePath, 'utf-8');
  const original = content;

  // 1. Date.now() -> Temporal.Now.instant().epochMilliseconds
  content = content.replace(/Date\.now\(\)/g, 'Temporal.Now.instant().epochMilliseconds');

  // 2. new Date() -> Temporal.Now.instant() (Sin argumentos)
  content = content.replace(/new Date\(\)/g, 'Temporal.Now.instant()');

  // 3. new Date(valor) -> Temporal.Instant.fromEpochMilliseconds(valor)
  content = content.replace(/new Date\(([^)]+)\)/g, (match: string, p1: string) => {
    if (p1.trim() === '') return match;
    return `Temporal.Instant.fromEpochMilliseconds(${p1})`;
  });

  // 4. .getTime() -> .epochMilliseconds
  content = content.replace(/\.getTime\(\)/g, '.epochMilliseconds');

  // 5. .toISOString() -> .toString() (Temporal usa toString() para ISO por defecto)
  content = content.replace(/\.toISOString\(\)/g, '.toString()');

  // 6. .toDateString() -> .toString().split('T')[0]
  content = content.replace(/\.toDateString\(\)/g, ".toString().split('T')[0]");

  // 7. date.toTemporalInstant() -> Temporal.Instant.fromEpochMilliseconds(date.epochMilliseconds || date.getTime())
  content = content.replace(/(\w+)\.toTemporalInstant\(\)/g, 'Temporal.Instant.fromEpochMilliseconds($1.epochMilliseconds || $1.getTime())');

  // 7. Inyectar import si se usa Temporal y no está presente
  if (content.includes('Temporal') && !content.includes("'@js-temporal/polyfill'")) {
    const importStmt = "\n";
    if (content.includes('<script')) {
      // Para archivos .vue
      content = content.replace(/(<script[^>]*>)/, `$1\n${importStmt}`);
    } else {
      // Para archivos .ts/.js
      content = importStmt + content;
    }
  }

  if (content !== original) {
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`[TEMPORAL] Migrado: ${filePath}`);
  }
}

async function main() {
  const targets = ['src', 'tests']; // no-domain
  for (const t of targets) {
    const files = await getFilesToMigrate(path.join(process.cwd(), t));
    for (const file of files) {
      await migrate(file);
    }
  }
  console.log('\n✨ Migración a Temporal finalizada.');
}

main();
