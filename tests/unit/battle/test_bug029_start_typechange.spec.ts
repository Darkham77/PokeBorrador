import { describe, it, expect } from 'vitest';
import { handleFieldEvents } from '@/logic/battle/showdownBridgeField';

describe('Audit Parity - BUG-029: -start typechange must update target.type, not add a counter flag', () => {
  it('should update target type when typechange is received in -start', async () => {
    const mockPoke = { volatileCounters: {}, name: 'Arceus', type: 'normal', type2: null };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: '-start',
      parts: ['', '-start', 'p1a: Arceus', 'typechange', 'Fire', '[silent]'],
      line: '|-start|p1a: Arceus|typechange|Fire|[silent]',
      p: null,
      getPoke: () => mockPoke,
      getSide: () => 'player',
      playerSide: 'p1',
    } as unknown as Parameters<typeof handleFieldEvents>[0];

    await handleFieldEvents(ctx);

    // typechange must update target.type to 'Fire', not store a counter
    expect(mockPoke.type).toBe('Fire');
    expect((mockPoke.volatileCounters as Record<string, number>)['typechange']).toBeUndefined();
  });
});
