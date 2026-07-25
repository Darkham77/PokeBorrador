import { describe, it, expect } from 'vitest';
import { handleFieldEvents } from '@/logic/battle/showdownBridgeField';

describe('Audit Parity - BUG-057: -swapsideconditions null safety', () => {
  it('should swap side conditions safely even when one side conditions object is null/undefined', async () => {
    const battle = { playerSideConditions: { reflect: { turns: 5 } }, enemySideConditions: undefined };
    const ctx = {
      store: { activeBattle: { value: battle }, addLog: () => {} },
      type: '-swapsideconditions',
      parts: ['', '-swapsideconditions'],
      line: '|-swapsideconditions',
      getPoke: () => null,
      getSide: () => 'player',
      playerSide: 'p1'
    };
    await handleFieldEvents(ctx as any);
    expect((battle.enemySideConditions as unknown as Record<string, { turns: number }> | undefined)?.reflect?.turns).toBe(5);
    expect(battle.playerSideConditions).toBeUndefined();
  });
});
