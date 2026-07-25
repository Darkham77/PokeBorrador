import { describe, it, expect } from 'vitest';
import { handleFieldEvents } from '@/logic/battle/showdownBridgeField';

describe('Audit Parity - BUG-074: fieldend terrain log clear message', () => {
  it('should format electricterrain fieldend log correctly', async () => {
    let logMsg = '';
    const battle = { terrain: 'electricterrain' };
    const ctx = {
      store: { activeBattle: { value: battle }, addLog: (msg: string) => { logMsg = msg; } },
      type: '-fieldend',
      parts: ['', '-fieldend', 'move: Electric Terrain'],
      line: '|-fieldend|move: Electric Terrain',
      getPoke: () => null,
      getSide: () => 'player',
      playerSide: 'p1'
    };
    await handleFieldEvents(ctx as any);
    expect(battle.terrain).toBeNull();
    expect(logMsg).toContain('desapareció');
  });
});
