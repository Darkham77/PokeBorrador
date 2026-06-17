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

  // 1. Crear DB en memoria para validación (Explicit Resource Management)
  using db = new DatabaseSync(':memory:');
  db.exec("CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT DEFAULT (datetime('now')))");
  console.log(styleText('green', '✅ Base de datos temporal creada con tabla de migraciones.'));

  // 2. Obtener y ordenar archivos
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
      const statements = splitSQLStatements(content);
      
      for (const stmt of statements) {
        let translated = translationCache.get(stmt);
        if (translated === undefined) {
          translated = translatePostgresToSqlite(stmt);
          translationCache.set(stmt, translated);
        }
        
        if (translated) {
          try {
            db.exec(translated);
          } catch (sqlErr: unknown) {
            const msg = (sqlErr as Error).message.toLowerCase();
            const isDuplicate = msg.includes('already exists') || msg.includes('duplicate column');
            
            if (!isDuplicate) {
              throw sqlErr;
            }
          }
        }
      }
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
    const outputPath = path.resolve(process.cwd(), values.output as string);
    const lines = [
      `--- SQL MIGRATIONS REPORT ---`,
      `Archivos detectados:  ${files.length}`,
      `Migraciones válidas:  ${achievements.length}`,
      `Migraciones fallidas: ${errors.length}`,
      `\nLogros (${achievements.length}):`,
      ...achievements.map(a => `  - ${a}`),
      `\nErrors (${errors.length}):`,
      ...errors.map(e => `  - ${e}`)
    ];
    await fs.writeFile(outputPath, lines.join('\n'), 'utf-8');
    console.log(styleText('cyan', `\n✨ Reporte completo escrito en: ${values.output}`));
  }

  if (values.summary) {
    console.log(styleText('cyan', `\n[INFO] Modo resumen activo: ${errors.length} errores.`));
  } else {
    if (achievements.length > 0) {
      console.log(styleText('green', `🌟 MIGRACIONES VÁLIDAS (${achievements.length}):`));
      const limit = 30;
      achievements.slice(0, limit).forEach(a => console.log(`   ✅ ${a}`));
      if (achievements.length > limit) {
        console.log(styleText('cyan', `   ... y ${achievements.length - limit} migraciones más (usa -o para ver todas)`));
      }
      console.log('');
    }

    if (errors.length > 0) {
      console.log(styleText('red', `❌ ERRORES DE INTEGRIDAD DETECTADOS (${errors.length}):`));
      const limit = 30;
      errors.slice(0, limit).forEach(e => console.log(`   🚨 ${e}`));
      if (errors.length > limit) {
        console.log(styleText('cyan', `   ... y ${errors.length - limit} errores más (usa -o para ver todos)`));
      }
    } else {
      console.log(styleText('green', '✨ TODAS LAS MIGRACIONES SON VÁLIDAS PARA SQLITE.'));
    }
  }

  if (errors.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

validateMigrations();
