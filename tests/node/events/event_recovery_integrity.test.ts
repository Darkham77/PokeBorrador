import { describe, it, expect } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { auditAndRepairSaveData, repairAccountsInSqlite } from '../../../scripts/maintenance/repair_account_legality.ts';
import type { SaveDataDto } from '../../../src/logic/validation/schemas.ts';
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';

describe('Event Pokémon Recovery Integrity Test (Tier 2)', () => {
  it('auditAndRepairSaveData automatically liberates onEvent stuck Pokémon across team, box, and daycare', () => {
    const mockSaveData: SaveDataDto = {
      team: [
        {
          uid: 'team-magikarp',
          id: 'magikarp',
          name: 'Magikarp',
          level: 5,
          hp: 20,
          maxHp: 20,
          onEvent: true,
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
          moves: [{ id: 'splash', name: 'Salpicadura', pp: 40, maxPP: 40 }]
        } as unknown as Pokemon
      ],
      box: [
        {
          uid: 'box-magikarp',
          id: 'magikarp',
          name: 'Magikarp Dorado',
          level: 5,
          hp: 20,
          maxHp: 20,
          onEvent: true,
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
          moves: [{ id: 'splash', name: 'Salpicadura', pp: 40, maxPP: 40 }]
        } as unknown as Pokemon
      ],
      daycareWarehouse: [
        {
          uid: 'daycare-magikarp',
          id: 'magikarp',
          name: 'Magikarp Guarderia',
          level: 10,
          hp: 25,
          maxHp: 25,
          onEvent: true,
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
          moves: [{ id: 'splash', name: 'Salpicadura', pp: 40, maxPP: 40 }]
        } as unknown as Pokemon
      ]
    } as unknown as SaveDataDto;

    const result = auditAndRepairSaveData(mockSaveData, true);

    expect(result.modified).toBe(true);
    expect(mockSaveData.team[0]?.onEvent).toBe(false);
    expect(mockSaveData.box[0]?.onEvent).toBe(false);
    expect((mockSaveData.daycareWarehouse as Pokemon[])[0]?.onEvent).toBe(false);
    expect(result.details.some(d => d.includes('liberado de evento concluido/legacy'))).toBe(true);
  });

  it('repairAccountsInSqlite restores stuck Pokémon in SQLite database saves without data loss', () => {
    const db = new DatabaseSync(':memory:');
    db.exec(`
      CREATE TABLE game_saves (
        user_id TEXT PRIMARY KEY,
        save_data TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const initialSave = {
      team: [
        {
          uid: 'p-1',
          id: 'magikarp',
          name: 'Magikarp',
          level: 5,
          hp: 20,
          maxHp: 20,
          onEvent: true,
          ivs: { hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15 },
          moves: [{ id: 'splash', name: 'Salpicadura', pp: 40, maxPP: 40 }]
        }
      ],
      box: [
        {
          uid: 'p-2',
          id: 'gyarados',
          name: 'Gyarados',
          level: 20,
          hp: 70,
          maxHp: 70,
          onEvent: true,
          ivs: { hp: 20, atk: 20, def: 20, spa: 20, spd: 20, spe: 20 },
          moves: [{ id: 'waterfall', name: 'Cascada', pp: 15, maxPP: 15 }]
        }
      ]
    };

    db.prepare('INSERT INTO game_saves (user_id, save_data) VALUES (?, ?)').run('user_test_event', JSON.stringify(initialSave));

    const summary = repairAccountsInSqlite({
      dbInstance: db,
      userId: 'user_test_event',
      silent: true
    });

    expect(summary.accountsAudited).toBe(1);
    expect(summary.accountsRepaired).toBe(1);

    const row = db.prepare('SELECT save_data FROM game_saves WHERE user_id = ?').get('user_test_event') as { save_data: string };
    const parsedSave = JSON.parse(row.save_data);

    expect(parsedSave.team[0].onEvent).toBe(false);
    expect(parsedSave.box[0].onEvent).toBe(false);
    expect(parsedSave.team[0].name).toBe('Magikarp');
    expect(parsedSave.box[0].name).toBe('Gyarados');

    db.close();
  });
});
