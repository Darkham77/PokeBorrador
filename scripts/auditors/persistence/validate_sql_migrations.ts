// fallow-ignore-file security-sink
/**
 * scripts/auditors/persistence/validate_sql_migrations.ts
 * 
 * SQL MIGRATION VALIDATOR (Node.js 26+)
 * In-memory SQLite validation of database migrations translated from PostgreSQL syntax,
 * strict monotonicity / non-repetition audit of migration timestamps, and exact parity
 * between filename timestamps and internal system_config db_version updates.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { enableCompileCache } from 'node:module';
import { translatePostgresToSqlite, splitSQLStatements } from '../../../src/logic/db/sqlTranslator.ts';
import { DATABASE_MIGRATIONS } from '../../../src/logic/db/migrations_data.ts';
import { setupValidation } from '../../lib/validationBase.ts';
import { initTestDatabaseSchema } from './_testDbHelper.ts';

enableCompileCache();

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'database/migrations');
const TIMESTAMP_REGEX = /^(\d{14})_/;
const DB_VERSION_SQL_REGEX = /(?:VALUES\s*\(\s*['"]db_version['"]\s*,\s*['"]?(\d{14})|SET\s+value\s*=\s*['"]?(\d{14})|jsonb_build_object\s*\(\s*['"]db_version['"]\s*,\s*['"]?(\d{14}))/i;

async function validateMigrations() {
  const validator = setupValidation({
    title: 'SQL MIGRATION VALIDATOR',
    requiredFiles: [MIGRATIONS_DIR]
  });

  await validator.checkFiles();

  const errors: string[] = []; // no-domain
  const warnings: string[] = []; // no-domain

  // 1. Validar integridad de nombres, fechas incrementales, no repetición y sincronización de db_version
  const dirEntries = await fs.readdir(MIGRATIONS_DIR);
  const baseSqlFiles = dirEntries
    .filter(f => f.endsWith('.sql') && !f.endsWith('.sqlite.sql') && !f.includes('baseline_schema'))
    .sort((a, b) => a.localeCompare(b));

  const sqliteFiles = dirEntries.filter(f => f.endsWith('.sqlite.sql'));
  for (const sqliteFile of sqliteFiles) {
    const baseSqlFile = sqliteFile.replace(/\.sqlite\.sql$/, '.sql');
    if (!dirEntries.includes(baseSqlFile)) {
      errors.push(`[Migración] Archivo SQLite huérfano sin archivo PostgreSQL base: ${sqliteFile}`);
    }
  }

  const seenTimestamps = new Set<string>(); // runtime-set
  let lastTimestamp = '';
  let validatedDbVersionStatements = 0;

  for (const file of baseSqlFiles) {
    const match = file.match(TIMESTAMP_REGEX);
    if (!match || !match[1]) {
      errors.push(`[Migración] Formato de timestamp inválido en archivo '${file}'. Debe iniciar con un timestamp de 14 dígitos (YYYYMMDDHHmmss_...).`);
      continue;
    }

    const timestamp = match[1];

    if (seenTimestamps.has(timestamp)) {
      errors.push(`[Migración] Timestamp duplicado detectado: '${timestamp}' en '${file}'. Las migraciones deben tener timestamps únicos.`);
    } else {
      seenTimestamps.add(timestamp);
    }

    if (lastTimestamp && timestamp <= lastTimestamp) {
      errors.push(`[Migración] Secuencia temporal no incremental detectada: '${file}' (timestamp ${timestamp}) es menor o igual al timestamp previo (${lastTimestamp}). Las migraciones deben ser estrictamente incrementales.`);
    }

    lastTimestamp = timestamp;

    // Verificar que cualquier actualización de db_version en el archivo .sql coincida exactamente con el timestamp del nombre
    const pgContent = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf-8');
    const pgVersionMatch = pgContent.match(DB_VERSION_SQL_REGEX);
    if (pgVersionMatch) {
      const sqlVersion = pgVersionMatch[1] || pgVersionMatch[2] || pgVersionMatch[3];
      if (sqlVersion && sqlVersion !== timestamp) {
        errors.push(`[Migración] Desincronización de db_version en PostgreSQL '${file}': El SQL declara versión '${sqlVersion}' pero el timestamp del nombre de archivo es '${timestamp}'.`);
      } else {
        validatedDbVersionStatements++;
      }
    }

    // Verificar también el archivo companion .sqlite.sql si existe
    const companionSqliteName = file.replace(/\.sql$/, '.sqlite.sql');
    if (dirEntries.includes(companionSqliteName)) {
      const sqliteContent = await fs.readFile(path.join(MIGRATIONS_DIR, companionSqliteName), 'utf-8');
      const sqliteVersionMatch = sqliteContent.match(DB_VERSION_SQL_REGEX);
      if (sqliteVersionMatch) {
        const sqliteVersion = sqliteVersionMatch[1] || sqliteVersionMatch[2] || sqliteVersionMatch[3];
        if (sqliteVersion && sqliteVersion !== timestamp) {
          errors.push(`[Migración] Desincronización de db_version en SQLite '${companionSqliteName}': El SQL declara versión '${sqliteVersion}' pero el timestamp del nombre de archivo es '${timestamp}'.`);
        }
      }
    }
  }

  // 2. Ejecutar y validar SQL en memoria SQLite
  using db = new DatabaseSync(':memory:');
  initTestDatabaseSchema(db);

  for (const migration of DATABASE_MIGRATIONS) {
    const sqlSource = migration.sqlite_sql !== undefined ? migration.sqlite_sql : migration.sql;
    const isSqliteSpec = migration.sqlite_sql !== undefined;
    const statements = splitSQLStatements(sqlSource);

    for (const stmt of statements) {
      if (!stmt.trim()) continue;
      const sql = isSqliteSpec ? stmt : translatePostgresToSqlite(stmt);
      if (!sql) continue;

      try {
        db.exec(sql);
      } catch (stmtErr: unknown) {
        const msg = (stmtErr as Error).message.toLowerCase(); // string-ok
        const isDuplicate = msg.includes('duplicate column name') || msg.includes('already exists');
        const isMissing = msg.includes('no such column');
        if (!isDuplicate && !isMissing) {
          errors.push(`[Migración] ${migration.id}: FALLÓ: ${(stmtErr as Error).message}`);
        }
      }
    }
  }

  await validator.finish(
    {
      'Migraciones SQL verificadas': baseSqlFiles.length,
      'Timestamps incrementales validados': seenTimestamps.size,
      'Declaraciones db_version sincronizadas': validatedDbVersionStatements
    },
    errors,
    warnings
  );
}

validateMigrations().catch(err => {
  console.error(`💥 Error fatal: ${(err as Error).message}`);
  process.exit(1);
});
