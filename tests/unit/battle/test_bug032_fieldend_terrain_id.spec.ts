import { describe, it, expect } from 'vitest';
import { handleFieldEvents } from '@/logic/battle/showdownBridgeField';

describe('Audit Parity - BUG-032: -fieldend must clear terrain when condition arrives in ID form', () => {
  it('should clear activeBattle.terrain when fieldend arrives as lowercase ID "electricterrain"', async () => {
    const battle = { terrain: 'electricterrain', fieldConditions: {} };
    const ctx = {
      store: { activeBattle: { value: battle }, addLog: () => {} },
      type: '-fieldend',
      parts: ['', '-fieldend', 'electricterrain'],
      line: '|-fieldend|electricterrain',
      p: null,
      getPoke: () => null,
      getSide: () => null,
      playerSide: 'p1',
    } as unknown as Parameters<typeof handleFieldEvents>[0];

    await handleFieldEvents(ctx);

    // terrain must be cleared regardless of whether it arrives as display name or canonical ID
    expect(battle.terrain).toBeNull();
  });
});
