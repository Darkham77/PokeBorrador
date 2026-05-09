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

import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';
import { splitSQLStatements, translatePostgresToSqlite } from '../src/logic/db/sqlTranslator.ts';

// Speed up execution on subsequent runs
enableCompileCache();

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'database/migrations');

async function validateMigrations() {
  console.log(styleText('bold', '\n--- 🛡️  SQL MIGRATION VALIDATOR (Node.js 26) ---'));
  
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(styleText('red', '❌ Error: Directorio de migraciones no encontrado.'));
    process.exit(1);
  }

  // 1. Crear DB en memoria para validación (Explicit Resource Management)
  using db = new DatabaseSync(':memory:');
  db.exec("CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT DEFAULT (datetime('now')))");
  console.log(styleText('green', '✅ Base de datos temporal creada con tabla de migraciones.'));

  // 2. Obtener y ordenar archivos
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  const translationCache = new Map<string, string>();

  console.log(styleText('cyan', `📦 Procesando ${files.length} archivos de migración...\n`));

  let errorCount = 0;

  for (const filename of files) {
    const filePath = path.join(MIGRATIONS_DIR, filename);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    process.stdout.write(`🔹 [Validando] ${filename}... `);

    try {
      const statements = splitSQLStatements(content);
      
      for (const stmt of statements) {
        let translated = translationCache.get(stmt);
        if (!translated) {
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
      console.log(styleText('green', 'OK'));
    } catch (e: unknown) {
      errorCount++;
      console.log(styleText('red', 'FALLÓ'));
      console.error(`\n   ${styleText(['bgRed', 'white'], ` [ERROR en ${filename}]: `)}`);
      console.error(`   > ${styleText('yellow', (e as Error).message)}`);
      console.error('   --------------------------------------------------\n');
    }
  }

  // db.close() is handled by 'using' keyword automatically

  if (errorCount > 0) {
    console.error(styleText('red', `\n❌ VALIDACIÓN FALLIDA: Se encontraron ${errorCount} errores.`));
    process.exit(1);
  } else {
    console.log(styleText('green', '\n✨ TODAS LAS MIGRACIONES SON VÁLIDAS PARA SQLITE.'));
    process.exit(0);
  }
}

validateMigrations();
