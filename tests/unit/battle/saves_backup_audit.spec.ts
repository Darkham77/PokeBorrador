import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Dex } from '@pkmn/sim';
import { TABLES_SCHEMA } from '../../../src/logic/db/schema.ts';
import { DATABASE_MIGRATIONS } from '../../../src/logic/db/migrations_data.ts';

const BACKUP_FILE = path.resolve(process.cwd(), 'tests/node/fixtures/server_franco_backup_fixture.json');

describe('Player Saves Migration & Compatibility Audit', () => {
  it('debería cargar el backup crudo de test, migrarlo utilizando la base de datos SQLite y las migraciones oficiales del juego, y validar compatibilidad 100% nativa con Showdown Dex', () => {
    if (!fs.existsSync(BACKUP_FILE)) {
      throw new Error(`CRITICAL: Backup fixture file not found at ${BACKUP_FILE}`);
    }

    // 1. Inicializar base de datos SQLite nativa en memoria usando node:sqlite
    using db = new DatabaseSync(':memory:');
    
    // Crear esquema de tablas oficial
    for (const ddl of TABLES_SCHEMA) {
      db.exec(`CREATE TABLE IF NOT EXISTS ${ddl}`);
    }

    // 2. Cargar el backup crudo de producción
    const rawBackup = fs.readFileSync(BACKUP_FILE, 'utf8');
    const backupData = JSON.parse(rawBackup);
    const gameSaves = backupData.data?.game_saves || [];
    expect(gameSaves.length).toBeGreaterThan(0);

    // Insertar los saves crudos en la base de datos temporal
    const insertSave = db.prepare('INSERT INTO game_saves (user_id, save_data, last_save_id, updated_at) VALUES (?, ?, ?, ?)');
    for (const save of gameSaves) {
      const dataStr = typeof save.save_data === 'string' ? save.save_data : JSON.stringify(save.save_data);
      insertSave.run(save.user_id, dataStr, save.last_save_id || '', save.updated_at || '');
    }

    // 3. Ejecutar secuencialmente todas las migraciones SQLite oficiales del juego
    for (const migration of DATABASE_MIGRATIONS) {
      if (migration.sqlite_sql) {
        try {
          db.exec(migration.sqlite_sql);
        } catch (e: unknown) {
          throw new Error(`CRITICAL: Error al aplicar migración oficial ${migration.id}: ${(e as Error).message}`);
        }
      }
    }

    // 4. Leer los saves ya migrados de la base de datos
    const selectSaves = db.prepare('SELECT user_id, save_data FROM game_saves');
    const migratedSaves = selectSaves.all() as { user_id: string, save_data: string }[];
    expect(migratedSaves.length).toBeGreaterThan(0);

    const errors: string[] = [];
    const warnings: string[] = [];
    const gen = Dex;

    // 5. Validar cada Pokémon contra Showdown Dex
    for (const row of migratedSaves) {
      const userId = row.user_id;
      let saveData;
      try {
        saveData = JSON.parse(row.save_data);
      } catch {
        continue;
      }
      if (!saveData) continue;

      const team = saveData.team || [];
      const box = saveData.box || [];
      const allPokes = [...team, ...box].filter(Boolean);

      for (const poke of allPokes) {
        const tag = `[User: ${userId}] Pokémon: ${poke.name || poke.species || poke.id} (Lvl ${poke.level ?? '?'})`;

        // Validar Especie
        if (!poke.species) {
          errors.push(`${tag} - Pokémon sin especie definida.`);
        } else {
          const species = gen.species.get(poke.species);
          if (!species.exists) {
            errors.push(`${tag} - Especie '${poke.species}' no existe en el Dex de Showdown.`);
          }
        }

        // Validar Habilidad
        if (poke.ability) {
          const ability = gen.abilities.get(poke.ability);
          if (!ability.exists) {
            errors.push(`${tag} - Habilidad '${poke.ability}' no existe en el Dex de Showdown.`);
          }
        }

        // Validar Naturaleza
        if (poke.nature) {
          const nature = gen.natures.get(poke.nature);
          if (!nature.exists) {
            errors.push(`${tag} - Naturaleza '${poke.nature}' no existe en el Dex de Showdown.`);
          }
        }

        // Validar Objeto Equipado
        const itemKey = poke.item || poke.heldItem;
        if (itemKey) {
          const item = gen.items.get(itemKey);
          if (!item.exists) {
            warnings.push(`${tag} - Objeto '${itemKey}' es un ítem casero/personalizado.`);
          }
        }

        // Validar Movimientos
        const moves = poke.moves || [];
        for (const m of moves) {
          if (!m || (!m.id && !m.name)) {
            errors.push(`${tag} - Movimiento sin ID de Showdown.`);
            continue;
          }
          const moveId = m.id || m.name || '';
          const move = gen.moves.get(moveId);
          if (!move.exists) {
            errors.push(`${tag} - Movimiento ID '${moveId}' no existe en el Dex de Showdown.`);
          }
        }
      }
    }

    if (errors.length > 0) {
      console.error(`[Save Audit] Encontrados ${errors.length} errores de compatibilidad en el backup migrado:\n` + errors.slice(0, 25).join('\n') + (errors.length > 25 ? `\n... y ${errors.length - 25} errores más.` : ''));
    }

    expect(errors.length).toBe(0);
  });
});
