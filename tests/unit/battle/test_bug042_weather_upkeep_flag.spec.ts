import { describe, it, expect } from 'vitest';
import { handleFieldEvents } from '@/logic/battle/showdownBridgeField';

describe('Audit Parity - BUG-042: -weather [upkeep] flag suppresses log', () => {
  it('should not add a new log entry when -weather line contains [upkeep]', async () => {
    let logsCount = 0;
    const mockStore = {
      activeBattle: { value: { weather: { type: 'clear' } } },
      addLog: () => { logsCount++; }
    };
    const ctx = {
      store: mockStore,
      type: '-weather',
      parts: ['', '-weather', 'RainDance', '[upkeep]'],
      line: '|-weather|RainDance|[upkeep]',
      getPoke: () => null,
      getSide: () => 'player',
      playerSide: 'p1'
    };

    await handleFieldEvents(ctx as any);
    expect(logsCount).toBe(0);
  });
});
