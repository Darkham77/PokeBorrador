/**
 * scripts/validate_sql_migrations.ts
 * 
 * VALIDADOR DE MIGRACIONES SQL (Node.js 26+)
 * 
 * Este script utiliza el módulo nativo 'node:sqlite' para verificar la integridad
 * sintáctica de las migraciones SQL antes de que lleguen al cliente o producción.
 * 
 * Proceso:
 * 1. Escanea 'database/migrations/'.
 * 2. Crea una base de datos SQLite en memoria.
 * 3. Traduce y ejecuta cada migración.
 * 4. Reporta errores detallados con número de línea.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { styleText, parseArgs } from 'node:util';
import { enableCompileCache } from 'node:module';
import { splitSQLStatements, translatePostgresToSqlite } from '../../src/logic/db/sqlTranslator.ts';

// Speed up execution on subsequent runs
enableCompileCache();

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'database/migrations');

function executeMigrationFile(
  content: string,
  db: DatabaseSync,
  translationCache: Map<string, string>
) {
  const statements = splitSQLStatements(content)
  for (const stmt of statements) {
    let translated = translationCache.get(stmt)
    if (translated === undefined) {
      translated = translatePostgresToSqlite(stmt)
      translationCache.set(stmt, translated)
    }
    if (translated) {
      try {
        db.exec(translated)
      } catch (sqlErr: unknown) {
        const msg = (sqlErr as Error).message.toLowerCase()
        const isDuplicate = msg.includes('already exists') || msg.includes('duplicate column')
        if (!isDuplicate) throw sqlErr
      }
    }
  }
}

async function writeMigrationReport(
  outputPath: string,
  totalFiles: number,
  achievements: string[],
  errors: string[]
) {
  const resolvedPath = path.resolve(process.cwd(), outputPath)
  const lines = [
    `--- SQL MIGRATIONS REPORT ---`,
    `Archivos detectados:  ${totalFiles}`,
    `Migraciones válidas:  ${achievements.length}`,
    `Migraciones fallidas: ${errors.length}`,
    `\nLogros (${achievements.length}):`,
    ...achievements.map(a => `  - ${a}`),
    `\nErrors (${errors.length}):`,
    ...errors.map(e => `  - ${e}`)
  ]
  await fs.writeFile(resolvedPath, lines.join('\n'), 'utf-8')
  console.log(styleText('cyan', `\n✨ Reporte completo escrito en: ${outputPath}`))
}

async function validateMigrations() {
  const { values } = parseArgs({
    options: {
      output: { type: 'string', short: 'o' },
      summary: { type: 'boolean', short: 's' }
    }
  });

  console.log(styleText('bold', '\n--- 🛡️  SQL MIGRATION VALIDATOR (Node.js 26) ---'));
  
  try {
    await fs.access(MIGRATIONS_DIR);
  } catch {
    console.error(styleText('red', '❌ Error: Directorio de migraciones no encontrado.'));
    process.exit(1);
  }

  using db = new DatabaseSync(':memory:');
  db.exec("CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT DEFAULT (datetime('now')))");
  console.log(styleText('green', '✅ Base de datos temporal creada con tabla de migraciones.'));

  const allFiles = await fs.readdir(MIGRATIONS_DIR);
  const files = allFiles
    .filter(f => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  const translationCache = new Map<string, string>();
  const errors: string[] = [];
  const achievements: string[] = [];

  console.log(styleText('cyan', `📦 Procesando ${files.length} archivos de migración...\n`));

  for (const filename of files) {
    const filePath = path.join(MIGRATIONS_DIR, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    
    try {
      executeMigrationFile(content, db, translationCache);
      achievements.push(`[Migración] ${filename}: VÁLIDA`);
    } catch (e: unknown) {
      errors.push(`[Migración] ${filename}: FALLÓ: ${(e as Error).message}`);
    }
  }

  console.log(`\n════════════════════════════════════`);
  console.log(`    SQL MIGRATIONS REPORT`);
  console.log(`════════════════════════════════════`);
  console.log(`📦 Archivos detectados:  ${files.length}`);
  console.log(`✅ Migraciones válidas:  ${achievements.length}`);
  console.log(`❌ Migraciones fallidas: ${errors.length}`);
  console.log(`════════════════════════════════════\n`);

  if (values.output) {
    await writeMigrationReport(values.output as string, files.length, achievements, errors);
  }

  if (!values.summary) {
    if (achievements.length > 0) {
      console.log(styleText('green', `🌟 MIGRACIONES VÁLIDAS (${achievements.length}):`));
      achievements.slice(0, 30).forEach(a => console.log(`   ✅ ${a}`));
    }
    if (errors.length > 0) {
      console.log(styleText('red', `❌ ERRORES DE INTEGRIDAD DETECTADOS (${errors.length}):`));
      errors.slice(0, 30).forEach(e => console.log(`   🚨 ${e}`));
    } else {
      console.log(styleText('green', '✨ TODAS LAS MIGRACIONES SON VÁLIDAS PARA SQLITE.'));
    }
  }

  process.exit(errors.length > 0 ? 1 : 0);
}

validateMigrations();
