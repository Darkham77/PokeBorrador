import { describe, it } from 'vitest';
import assert from 'node:assert/strict';

// Mock window to simulate browser during replay
globalThis.window = {
  __VITE_DEBUG__: {
    mockEnemyChoices: ['move 1', 'switch 2'],
    enemyChoiceIndex: 0
  }
} as any;

import { ScriptedAI } from '../../../src/logic/battle/ai/scriptedAI.ts';

describe('CombatAI - ScriptedAI Logic (Native Node.js 26+)', () => {
  it('ScriptedAI decideMove should replay moves from the mock choices', () => {
    const ai = new ScriptedAI();
    const fakePokemon = {
      moves: [{ id: 'tackle', name: 'Tackle' }]
    } as any;

    if (globalThis.window?.__VITE_DEBUG__) {
      globalThis.window.__VITE_DEBUG__.enemyChoiceIndex = 0;
    }

    const move = ai.decideMove(fakePokemon, {} as any, {} as any, false);
    assert.ok(move);
    assert.strictEqual(move.id, 'tackle');
  });

  it('ScriptedAI shouldSwitch should return true if mock choice is switch', () => {
    const ai = new ScriptedAI();
    if (globalThis.window?.__VITE_DEBUG__) {
      globalThis.window.__VITE_DEBUG__.enemyChoiceIndex = 1; // 'switch 2'
    }

    const result = ai.shouldSwitch({} as any, {} as any, []);
    assert.strictEqual(result, true);
  });

  it('ScriptedAI evaluateAndUseItem should always return false', async () => {
    const ai = new ScriptedAI();
    const result = await ai.evaluateAndUseItem({} as any, {} as any);
    assert.strictEqual(result, false);
  });
});
