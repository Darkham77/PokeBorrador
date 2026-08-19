import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { pokemonDebugService } from '../../../src/logic/debug/pokemonDebugService.ts';
import { serializeState } from '../../../src/logic/auth/saveSerializer.ts';
import { validateSaveData } from '../../../src/logic/validation/schemas.ts';
import { INITIAL_STATE } from '../../../src/stores/gameInitialState.ts';
import type { GameState } from '../../../src/types/system/game.ts';

describe('Level 100 Pokemon Serialization Parity', () => {
  it('generates level 100 pokemon with finite serializable expNeeded (0) and passes validateSaveData', () => {
    const mew = pokemonDebugService.generate({ id: 'mew', level: 100 });
    assert.strictEqual(mew.level, 100);
    assert.strictEqual(typeof mew.expNeeded, 'number');
    assert.strictEqual(Number.isFinite(mew.expNeeded), true);

    const state = JSON.parse(JSON.stringify(INITIAL_STATE)) as GameState;
    state.trainer = 'TestTrainer';
    state.starterChosen = true;
    state.team = [mew];

    const serialized = serializeState(state);
    // Simulating round-trip JSON serialization
    const jsonString = JSON.stringify(serialized);
    const parsed = JSON.parse(jsonString);
    const validation = validateSaveData(parsed);

    assert.strictEqual(
      validation.success,
      true,
      `Save validation failed for level 100 Pokemon: ${JSON.stringify(validation.issues)}`
    );
  });
});
