import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Dex } from '@pkmn/sim';
import { TABLES_SCHEMA } from '../../../src/logic/db/schema.ts';
import { DATABASE_MIGRATIONS } from '../../../src/logic/db/migrations_data.ts';
import { splitSQLStatements } from '../../../src/logic/db/sqlTranslator.ts';

const BACKUP_FILE = path.resolve(process.cwd(), 'tests/node/fixtures/server_franco_backup_fixture.json');

function initAuditDatabase(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA synchronous = OFF; PRAGMA journal_mode = MEMORY; PRAGMA temp_store = MEMORY;');
  for (const ddl of TABLES_SCHEMA) {
    db.exec(`CREATE TABLE IF NOT EXISTS ${ddl}`);
  }
  return db;
}

function seedRawGameSaves(db: DatabaseSync, gameSaves: Array<Record<string, unknown>>): void {
  db.exec('BEGIN TRANSACTION;');
  const insertSave = db.prepare('INSERT INTO game_saves (user_id, save_data, last_save_id, updated_at) VALUES (?, ?, ?, ?)');
  for (const save of gameSaves) {
    const dataStr = typeof save.save_data === 'string' ? save.save_data : JSON.stringify(save.save_data);
    insertSave.run(save.user_id as string, dataStr, (save.last_save_id as string) || '', (save.updated_at as string) || '');
  }
  db.exec('COMMIT;');
}

function applySqliteMigration(db: DatabaseSync, migration: (typeof DATABASE_MIGRATIONS)[number]): void {
  if (!migration.sqlite_sql?.trim()) return;
  try {
    db.exec(migration.sqlite_sql);
  } catch {
    const statements = splitSQLStatements(migration.sqlite_sql);
    for (const stmt of statements) {
      if (!stmt.trim()) continue;
      try {
        db.exec(stmt);
      } catch (e: unknown) {
        const msg = (e as Error).message.toLowerCase();
        const isDuplicate = msg.includes('duplicate column name') || msg.includes('already exists');
        const isMissing = msg.includes('no such column');
        if (!isDuplicate && !isMissing) {
          throw new Error(`CRITICAL: Error al aplicar migración oficial ${migration.id}: ${(e as Error).message}`);
        }
      }
    }
  }
}

function runOfficialMigrations(db: DatabaseSync): void {
  db.exec('BEGIN TRANSACTION;');
  for (const migration of DATABASE_MIGRATIONS) {
    applySqliteMigration(db, migration);
  }
  db.exec('COMMIT;');
}

interface AuditPokemon {
  name?: string;
  species?: string;
  id?: string;
  level?: number;
  ability?: string;
  nature?: string;
  item?: string;
  heldItem?: string;
  moves?: Array<{ id?: string; name?: string }>;
}

function validatePokemonDex(poke: AuditPokemon, userId: string, errors: string[], warnings: string[]): void {
  const tag = `[User: ${userId}] Pokémon: ${poke.name || poke.species || poke.id} (Lvl ${poke.level ?? '?'})`;

  if (!poke.species) {
    errors.push(`${tag} - Pokémon sin especie definida.`);
  } else if (!Dex.species.get(poke.species).exists) {
    errors.push(`${tag} - Especie '${poke.species}' no existe en el Dex de Showdown.`);
  }

  if (poke.ability && !Dex.abilities.get(poke.ability).exists) {
    errors.push(`${tag} - Habilidad '${poke.ability}' no existe en el Dex de Showdown.`);
  }

  if (poke.nature && !Dex.natures.get(poke.nature).exists) {
    errors.push(`${tag} - Naturaleza '${poke.nature}' no existe en el Dex de Showdown.`);
  }

  const itemKey = poke.item || poke.heldItem;
  if (itemKey && !Dex.items.get(itemKey).exists) {
    warnings.push(`${tag} - Objeto '${itemKey}' es un ítem casero/personalizado.`);
  }

  for (const m of poke.moves || []) {
    if (!m || (!m.id && !m.name)) {
      errors.push(`${tag} - Movimiento sin ID de Showdown.`);
      continue;
    }
    const moveId = m.id || m.name || '';
    if (!Dex.moves.get(moveId).exists) {
      errors.push(`${tag} - Movimiento ID '${moveId}' no existe en el Dex de Showdown.`);
    }
  }
}

function auditMigratedSaves(migratedSaves: Array<{ user_id: string; save_data: string }>): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const row of migratedSaves) {
    let saveData: { team?: AuditPokemon[]; box?: AuditPokemon[] } | null = null;
    try {
      saveData = JSON.parse(row.save_data);
    } catch {
      continue;
    }
    if (!saveData) continue;

    const allPokes = [...(saveData.team || []), ...(saveData.box || [])].filter(Boolean) as AuditPokemon[];
    for (const poke of allPokes) {
      validatePokemonDex(poke, row.user_id, errors, warnings);
    }
  }

  if (errors.length > 0) {
    console.error(`[Save Audit] Encontrados ${errors.length} errores de compatibilidad en el backup migrado:\n` + errors.slice(0, 25).join('\n') + (errors.length > 25 ? `\n... y ${errors.length - 25} errores más.` : ''));
  }

  return { errors, warnings };
}

describe('Player Saves Migration & Compatibility Audit', () => {
  it('debería cargar el backup crudo de test, migrarlo utilizando la base de datos SQLite y las migraciones oficiales del juego, y validar compatibilidad 100% nativa con Showdown Dex', () => {
    if (!fs.existsSync(BACKUP_FILE)) {
      throw new Error(`CRITICAL: Backup fixture file not found at ${BACKUP_FILE}`);
    }

    using db = initAuditDatabase();

    const rawBackup = fs.readFileSync(BACKUP_FILE, 'utf8');
    const backupData = JSON.parse(rawBackup);
    const gameSaves = (backupData.data?.game_saves || []) as Array<Record<string, unknown>>;
    expect(gameSaves.length).toBeGreaterThan(0);

    seedRawGameSaves(db, gameSaves);
    runOfficialMigrations(db);

    const selectSaves = db.prepare('SELECT user_id, save_data FROM game_saves');
    const migratedSaves = selectSaves.all() as { user_id: string; save_data: string }[];
    expect(migratedSaves.length).toBeGreaterThan(0);

    const { errors } = auditMigratedSaves(migratedSaves);
    expect(errors.length).toBe(0);
  }, 240000);
});
