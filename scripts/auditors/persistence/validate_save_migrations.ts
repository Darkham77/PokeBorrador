// fallow-ignore-file security-sink
import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { enableCompileCache } from 'node:module';
import { Dex } from '@pkmn/sim';
import { splitSQLStatements } from '../../../src/logic/db/sqlTranslator.ts';
import { initTestDatabaseSchema } from './_testDbHelper.ts';
import { setupValidation } from '../../lib/validationBase.ts';

enableCompileCache();

interface SavePokemon {
  heldItem?: string;
}

interface SaveData {
  inventory?: Record<string, number>;
  team?: Array<SavePokemon | null>;
  box?: Array<SavePokemon | null>;
}

interface GameSaveRow {
  user_id: string;
  save_data: string;
}

interface ItemsCatalog {
  SHOP_ITEMS: Array<{ id: string }>;
}

async function main() {
  const backupRelPath = 'tests/node/fixtures/server_franco_backup_fixture.json';
  const backupPath = path.resolve(backupRelPath);
  const validator = setupValidation({
    title: 'SAVE MIGRATION VALIDATOR',
    family: 'persistence',
    requiredFiles: [backupPath]
  });

  await validator.checkFiles();

  const backupContent = fs.readFileSync(backupPath, 'utf8');
  const backupData = JSON.parse(backupContent) as { data: { game_saves?: GameSaveRow[] } };
  const gameSaves: GameSaveRow[] = backupData.data.game_saves ?? [];

  console.log(`🔍 [1/3] Cargando catálogo de ítems y ${gameSaves.length} saves de backup...`);
  const itemsDict = JSON.parse(fs.readFileSync(path.resolve('src/data/inventory/items.json'), 'utf8')) as ItemsCatalog;
  const validItemIds = new Set(itemsDict.SHOP_ITEMS.map((item) => item.id));

  // Collect all unique item IDs present in the backup BEFORE migrations
  const originalItems = new Set<string>();
  for (const row of gameSaves) {
    const saveData = (typeof row.save_data === 'string' ? JSON.parse(row.save_data) : row.save_data) as SaveData | null;
    if (!saveData) continue;

    // Inventory keys
    if (saveData.inventory) {
      for (const key of Object.keys(saveData.inventory)) {
        originalItems.add(key);
      }
    }

    // Held items
    const team: Array<SavePokemon | null> = saveData.team ?? [];
    const box: Array<SavePokemon | null> = saveData.box ?? [];
    for (const poke of [...team, ...box]) {
      if (poke?.heldItem) {
        originalItems.add(poke.heldItem);
      }
    }
  }

  // Initialize SQLite in-memory DB and populate it
  using db = new DatabaseSync(':memory:');
  initTestDatabaseSchema(db);

  const insertStmt = db.prepare(`
    INSERT INTO game_saves (user_id, save_data)
    VALUES (?, ?)
  `);

  for (const row of gameSaves) {
    const saveDataStr = typeof row.save_data === 'string' ? row.save_data : JSON.stringify(row.save_data);
    insertStmt.run(row.user_id || 'test_user', saveDataStr);
  }

  // Load migrations
  const { DATABASE_MIGRATIONS } = await import('../../../src/logic/db/migrations_data.ts');
  const { translatePostgresToSqlite } = await import('../../../src/logic/db/sqlTranslator.ts');
  console.log(`💾 [2/3] Ejecutando ${DATABASE_MIGRATIONS.length} migraciones sobre ${gameSaves.length} saves en memoria...`);

  for (const migration of DATABASE_MIGRATIONS) {
    const sqlSource = migration.sqlite_sql !== undefined ? migration.sqlite_sql : migration.sql;
    const isSqliteSpec = migration.sqlite_sql !== undefined;
    const statements = splitSQLStatements(sqlSource);
    for (const stmt of statements) {
      if (stmt.trim()) {
        const sql = isSqliteSpec ? stmt : translatePostgresToSqlite(stmt);
        if (sql) {
          try {
            db.exec(sql);
          } catch (stmtErr: unknown) {
            const msg = (stmtErr as Error).message.toLowerCase(); // string-ok
            const isDuplicate = msg.includes('duplicate column name') || msg.includes('already exists');
            const isMissing = msg.includes('no such column');
            if (!isDuplicate && !isMissing) {
              console.error(`Migration error in ${migration.id}:`, stmtErr);
              throw stmtErr;
            }
          }
        }
      }
    }
  }

  // Audit database saves after migration
  console.log(`🔍 [3/3] Auditando integridad de partidas y compatibilidad de ítems post-migración...`);
  const selectStmt = db.prepare('SELECT save_data FROM game_saves');
  const rows = selectStmt.all() as { save_data: string }[];

  const checkItemValidity = (key: string): boolean => {
    const isTM = key.startsWith('tm') || key.startsWith('hm');
    if (isTM) return true;
    if (validItemIds.has(key)) return true;
    if (Dex.items.get(key).exists) return true;
    return false;
  };

  const unmigratedItems = new Set<string>();
  for (const row of rows) {
    const saveData = JSON.parse(row.save_data) as SaveData | null;
    if (!saveData) continue;

    // Check inventory
    if (saveData.inventory) {
      for (const key of Object.keys(saveData.inventory)) {
        if (!checkItemValidity(key)) {
          unmigratedItems.add(key);
        }
      }
    }

    // Check held items
    const team: Array<SavePokemon | null> = saveData.team ?? [];
    const box: Array<SavePokemon | null> = saveData.box ?? [];
    for (const poke of [...team, ...box]) {
      if (poke?.heldItem) {
        if (!checkItemValidity(poke.heldItem)) {
          unmigratedItems.add(poke.heldItem);
        }
      }
    }
  }

  const errors: string[] = []; // no-domain
  const warnings: string[] = []; // no-domain

  if (unmigratedItems.size > 0) {
    for (const item of unmigratedItems) {
      errors.push(`Item ID '${item}' after migration does not exist in the official items catalog.`);
    }
  }

  await validator.finish(
    {
      'Total saves': gameSaves.length,
      'Original items': originalItems.size,
      'Unmigrated items': unmigratedItems.size
    },
    errors,
    warnings
  );
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
