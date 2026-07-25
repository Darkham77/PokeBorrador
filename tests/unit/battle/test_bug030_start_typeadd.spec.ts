import { describe, it, expect } from 'vitest';
import { handleFieldEvents } from '@/logic/battle/showdownBridgeField';

describe('Audit Parity - BUG-030: -start typeadd must update type2, not add a counter flag', () => {
  it('should update target.type2 when typeadd is received in -start', async () => {
    const mockPoke = { volatileCounters: {}, name: 'Trevenant', type: 'ghost', type2: 'grass' };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: '-start',
      parts: ['', '-start', 'p1a: Trevenant', 'typeadd', 'Fire'],
      line: '|-start|p1a: Trevenant|typeadd|Fire',
      p: null,
      getPoke: () => mockPoke,
      getSide: () => 'player',
      playerSide: 'p1',
    } as unknown as Parameters<typeof handleFieldEvents>[0];

    await handleFieldEvents(ctx);

    // typeadd must add Fire as addedType — type2 should reflect it or addedType field should be set
    expect((mockPoke as Record<string, unknown>).addedType).toBe('Fire');
    expect((mockPoke.volatileCounters as Record<string, number>)['typeadd']).toBeUndefined();
  });
});
