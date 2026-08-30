import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { TABLES_SCHEMA } from '@/logic/db/schema';
import { DATABASE_MIGRATIONS } from '@/logic/db/migrations_data';
import { splitSQLStatements, translatePostgresToSqlite } from '@/logic/db/sqlTranslator';
import { validateAndSanitize } from '@/logic/auth/saveSanitizer';
import { serializeState } from '@/logic/auth/saveSerializer';
import type { SaveDataDto } from '@/logic/validation/schemas';

const BACKUP_FIXTURE_PATH = path.resolve(process.cwd(), 'tests/node/fixtures/server_franco_backup_fixture.json');

function migrateBackupSaves(filePath: string): Array<{ user_id: string; save_data: string }> {
  if (!fs.existsSync(filePath)) return [];

  const rawBackup = fs.readFileSync(filePath, 'utf8');
  const backupData = JSON.parse(rawBackup) as { data?: { game_saves?: Array<{ user_id: string; save_data: unknown; last_save_id?: string; updated_at?: string }> } };
  const gameSaves = backupData.data?.game_saves || [];
  if (gameSaves.length === 0) return [];

  using db = new DatabaseSync(':memory:');
  for (const ddl of TABLES_SCHEMA) {
    db.exec(`CREATE TABLE IF NOT EXISTS ${ddl}`);
  }
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT)`);

  const insertSave = db.prepare('INSERT INTO game_saves (user_id, save_data, last_save_id, updated_at) VALUES (?, ?, ?, ?)');
  for (const save of gameSaves) {
    const dataStr = typeof save.save_data === 'string' ? save.save_data : JSON.stringify(save.save_data);
    insertSave.run(save.user_id, dataStr, save.last_save_id || '', save.updated_at || '');
  }

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
            const msg = (stmtErr as Error).message.toLowerCase();
            const isDuplicate = msg.includes('duplicate column name') || msg.includes('already exists');
            const isMissing = msg.includes('no such column');
            if (!isDuplicate && !isMissing) {
              throw stmtErr;
            }
          }
        }
      }
    }
  }

  const selectSaves = db.prepare('SELECT user_id, save_data FROM game_saves');
  return selectSaves.all() as { user_id: string; save_data: string }[];
}

describe('Backup Saves Serialization & Integrity Audit', () => {
  it('debe migrar, validar y serializar correctamente todos los saves del fixture sin pérdida de datos', () => {
    const saves = migrateBackupSaves(BACKUP_FIXTURE_PATH);
    expect(saves.length).toBeGreaterThan(0);

    let verifiedCount = 0;

    for (const row of saves) {
      const rawData = JSON.parse(row.save_data) as SaveDataDto;

      // 1. Sanitización del save migrado
      const sanitizeResult = validateAndSanitize(rawData);
      expect(
        sanitizeResult.valid,
        `Fallo al sanitizar save migrado de usuario ${row.user_id}: ${sanitizeResult.error}`
      ).toBe(true);

      if (!sanitizeResult.valid) continue;

      const loadedDto = sanitizeResult.data;

      // 2. Serialización del estado migrado
      const serialized = serializeState(loadedDto);

      // 4. Re-validación del save serializado (roundtrip)
      const roundtripSanitize = validateAndSanitize(serialized);
      expect(
        roundtripSanitize.valid,
        `Fallo al validar save serializado para usuario ${row.user_id}: ${roundtripSanitize.error}`
      ).toBe(true);

      if (!roundtripSanitize.valid) continue;

      const roundtripData = roundtripSanitize.data;

      // 5. Verificación de preservación 1:1 de campos críticos
      expect(roundtripData.trainer).toBe(loadedDto.trainer);
      expect(roundtripData.money).toBe(loadedDto.money);
      expect(roundtripData.battleCoins).toBe(loadedDto.battleCoins);
      expect(roundtripData.trainerLevel).toBe(loadedDto.trainerLevel);
      expect(roundtripData.trainerExp).toBe(loadedDto.trainerExp);
      expect(roundtripData.badges).toBe(loadedDto.badges);
      expect(roundtripData.balls).toBe(loadedDto.balls);
      expect(roundtripData.starterChosen).toBe(loadedDto.starterChosen);
      expect(roundtripData.team.length).toBe(loadedDto.team.length);
      expect(roundtripData.box.length).toBe(loadedDto.box.length);
      expect(roundtripData.pokedex.length).toBe(loadedDto.pokedex.length);
      expect(roundtripData.defeatedGyms).toEqual(loadedDto.defeatedGyms);
      expect(roundtripData.inventory).toEqual(loadedDto.inventory);

      // Clases y facciones
      if (loadedDto.playerClass) {
        expect(roundtripData.playerClass).toBe(loadedDto.playerClass);
      }
      if (loadedDto.faction) {
        expect(roundtripData.faction).toBe(loadedDto.faction);
      }

      // Progresión de mapas y tickets
      expect(roundtripData.safariTicketSecs).toBe(loadedDto.safariTicketSecs || 0);
      expect(roundtripData.repelSecs).toBe(loadedDto.repelSecs || 0);
      expect(roundtripData.boxCount).toBe(loadedDto.boxCount);

      verifiedCount++;
    }

    expect(verifiedCount).toBe(saves.length);
  }, 120000);
});