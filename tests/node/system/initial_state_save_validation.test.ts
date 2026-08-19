import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { INITIAL_STATE } from '../../../src/stores/gameInitialState.ts';
import { serializeState } from '../../../src/logic/auth/saveSerializer.ts';
import { validateSaveData } from '../../../src/logic/validation/schemas.ts';
import type { GameState } from '../../../src/types/system/game.ts';

describe('Initial Game State Save Validation Parity', () => {
  it('serializes INITIAL_STATE into a payload that passes validateSaveData cleanly', () => {
    const rawState = JSON.parse(JSON.stringify(INITIAL_STATE)) as GameState;
    rawState.trainer = 'TestTrainer';
    rawState.starterChosen = true;

    const serialized = serializeState(rawState);
    const res = validateSaveData(serialized);

    assert.strictEqual(
      res.success,
      true,
      `Validation failed: ${JSON.stringify(res.issues)}`
    );
  });
});
