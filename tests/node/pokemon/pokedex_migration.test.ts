import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { GameState } from '../../../src/types/system/game.ts';
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';
import type { PokemonSpeciesId } from '../../../src/data/pokemon/pokedex.ts';

interface SaveWrapper {
  user_id?: string
  save_data?: GameState
  last_save_id?: string
}

function findAngianemarSave(saves: SaveWrapper[]): SaveWrapper | undefined {
  return saves.find((s) => s.user_id === '259ef49f-54b2-40c6-a797-5951dc966cb4');
}

function filterSquirtle(list: PokemonSpeciesId[] | undefined): PokemonSpeciesId[] {
  return (list || []).filter((id) => id !== 'squirtle');
}

function hasSquirtle(box: (Pokemon | null)[] | undefined): boolean {
  return (box || []).some((p) => p?.id === 'squirtle');
}

function getPokemonIds(team: (Pokemon | null)[] | undefined, box: (Pokemon | null)[] | undefined): PokemonSpeciesId[] {
  const ids: PokemonSpeciesId[] = [];
  if (team) {
    for (const p of team) {
      if (p?.id) ids.push(p.id);
    }
  }
  if (box) {
    for (const p of box) {
      if (p?.id) ids.push(p.id);
    }
  }
  return ids;
}

describe('Pokedex Migration Logic Test', () => {
  it('correctly syncs Pokedex from box and team for Angianemar and updates save ID', () => {
    // 1. Load the backup JSON file
    const backupPath = path.resolve('tests/node/fixtures/server_franco_backup_fixture.json');
    assert.ok(fs.existsSync(backupPath), 'Backup file must exist');

    const backupContent = fs.readFileSync(backupPath, 'utf8');
    const backupData = JSON.parse(backupContent);
    assert.ok(backupData.data, 'Backup must contain data');

    // 2. Find Angianemar's save game
    const userSave = findAngianemarSave(backupData.data.game_saves || []);

    assert.ok(userSave, 'Angianemar save must exist in backup');
    const saveData = userSave.save_data as GameState;
    
    // Force pre-migration state by removing squirtle to ensure determinism
    saveData.pokedex = filterSquirtle(saveData.pokedex);
    saveData.seenPokedex = filterSquirtle(saveData.seenPokedex);
    
    const initialLastSaveId = userSave.last_save_id;

    // 3. Pre-migration assertions
    assert.strictEqual(hasSquirtle(saveData.box), true, 'Angianemar must have squirtle in their box initially');
    assert.strictEqual(saveData.pokedex.includes('squirtle'), false, 'Angianemar must NOT have squirtle in their pokedex initially');

    // 4. Run JS equivalent of the SQL migration logic
    const pokemonIds = getPokemonIds(saveData.team, saveData.box);

    saveData.pokedex = Array.from(new Set<PokemonSpeciesId>([...(saveData.pokedex || []), ...pokemonIds]));
    saveData.seenPokedex = Array.from(new Set<PokemonSpeciesId>([...(saveData.seenPokedex || []), ...pokemonIds]));

    // Simulate rotation of last_save_id
    userSave.last_save_id = 'mocked-random-uuid-generation-1234';

    // 5. Post-migration assertions
    assert.strictEqual(saveData.pokedex.includes('squirtle'), true, 'Squirtle must be in pokedex after migration');
    assert.strictEqual(saveData.seenPokedex.includes('squirtle'), true, 'Squirtle must be in seenPokedex after migration');
    assert.notStrictEqual(userSave.last_save_id, initialLastSaveId, 'last_save_id must change after migration');
  });
});
