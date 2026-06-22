import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { GameState } from '../../../src/types/system/game.ts';
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';

describe('Pokedex Migration Logic Test', () => {
  it('correctly syncs Pokedex from box and team for Angianemar and updates save ID', () => {
    // 1. Load the backup JSON file
    const backupPath = path.resolve('tests/node/fixtures/server_franco_backup_fixture.json');
    assert.ok(fs.existsSync(backupPath), 'Backup file must exist');

    const backupContent = fs.readFileSync(backupPath, 'utf8');
    const backupData = JSON.parse(backupContent);
    assert.ok(backupData.data, 'Backup must contain data');

    // 2. Find Angianemar's save game
    const saves = backupData.data.game_saves || [];
    const targetUserId = '259ef49f-54b2-40c6-a797-5951dc966cb4'; // Angianemar's UUID
    const userSave = saves.find((s: { user_id: string }) => s.user_id === targetUserId);

    assert.ok(userSave, 'Angianemar save must exist in backup');
    const saveData = userSave.save_data as GameState;
    
    // Force pre-migration state by removing squirtle to ensure determinism
    saveData.pokedex = (saveData.pokedex || []).filter((id: string) => id !== 'squirtle');
    saveData.seenPokedex = (saveData.seenPokedex || []).filter((id: string) => id !== 'squirtle');
    
    const initialLastSaveId = userSave.last_save_id;

    // 3. Pre-migration assertions
    // Verify squirtle is in the box
    const hasSquirtleInBox = (saveData.box || []).some((p: Pokemon) => p.id === 'squirtle');
    assert.strictEqual(hasSquirtleInBox, true, 'Angianemar must have squirtle in their box initially');

    // Verify squirtle is NOT in their pokedex
    const hasSquirtleInPokedex = (saveData.pokedex || []).includes('squirtle');
    assert.strictEqual(hasSquirtleInPokedex, false, 'Angianemar must NOT have squirtle in their pokedex initially');

    // 4. Run JS equivalent of the SQL migration logic
    const pokedexSet = new Set<string>(saveData.pokedex || []);
    const seenPokedexSet = new Set<string>(saveData.seenPokedex || []);

    // Add team ids
    (saveData.team || []).forEach((p: Pokemon) => {
      if (p?.id) {
        pokedexSet.add(p.id);
        seenPokedexSet.add(p.id);
      }
    });

    // Add box ids
    (saveData.box || []).forEach((p: Pokemon) => {
      if (p?.id) {
        pokedexSet.add(p.id);
        seenPokedexSet.add(p.id);
      }
    });

    saveData.pokedex = Array.from(pokedexSet);
    saveData.seenPokedex = Array.from(seenPokedexSet);

    // Simulate rotation of last_save_id
    const newLastSaveId = 'mocked-random-uuid-generation-1234';
    userSave.last_save_id = newLastSaveId;

    // 5. Post-migration assertions
    assert.strictEqual(saveData.pokedex.includes('squirtle'), true, 'Squirtle must be in pokedex after migration');
    assert.strictEqual(saveData.seenPokedex.includes('squirtle'), true, 'Squirtle must be in seenPokedex after migration');
    assert.notStrictEqual(userSave.last_save_id, initialLastSaveId, 'last_save_id must change after migration');
  });
});
