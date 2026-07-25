import { describe, it, expect } from 'vitest';
import { handleFieldEvents } from '@/logic/battle/showdownBridgeField';

describe('Audit Parity - BUG-031: -end disable must also clear moves[i].disabled shadow field', () => {
  it('should clear disabled flag on the affected move object, not just the disabledMove reference', async () => {
    const mockMove = { id: 'hydropump', name: 'Hydro Pump', disabled: true };
    const mockPoke = {
      name: 'Blastoise',
      disabledMove: { id: 'hydropump', name: 'Hydro Pump' },
      disabledTurns: 2,
      volatileCounters: {},
      moves: [mockMove],
    };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: '-end',
      parts: ['', '-end', 'p1a: Blastoise', 'Disable'],
      line: '|-end|p1a: Blastoise|Disable',
      p: null,
      getPoke: () => mockPoke,
      getSide: () => 'player',
      playerSide: 'p1',
    } as unknown as Parameters<typeof handleFieldEvents>[0];

    await handleFieldEvents(ctx);

    // disabledMove reference must be cleared
    expect(mockPoke.disabledMove).toBeNull();
    expect(mockPoke.disabledTurns).toBe(0);
    // The actual move's disabled flag must ALSO be cleared
    expect(mockMove.disabled).toBe(false);
  });
});
