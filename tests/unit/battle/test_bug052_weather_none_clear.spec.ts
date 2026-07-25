import { describe, it, expect } from 'vitest';
import { handleFieldEvents } from '@/logic/battle/showdownBridgeField';

describe('Audit Parity - BUG-052: -weather none clear', () => {
  it('should set activeBattle weather type to clear when -weather none is received', async () => {
    const battle = { weather: { type: 'rain' } };
    const ctx = {
      store: { activeBattle: { value: battle }, addLog: () => {} },
      type: '-weather',
      parts: ['', '-weather', 'none'],
      line: '|-weather|none',
      getPoke: () => null,
      getSide: () => 'player',
      playerSide: 'p1'
    };

    await handleFieldEvents(ctx as any);
    expect(battle.weather.type).toBe('clear');
  });
});
