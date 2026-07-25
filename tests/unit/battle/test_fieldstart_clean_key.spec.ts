import { describe, it, expect } from 'vitest';
import { handleFieldEvents } from '@/logic/battle/showdownBridgeField';

describe('Audit Parity - Clean Key Fieldstart Token', () => {
  it('should recognize fieldstart token with move prefix', async () => {
    const mockStore = {
      activeBattle: { value: { fieldConditions: {} } },
      addLog: () => {}
    };
    const ctx = {
      store: mockStore,
      type: '-fieldstart',
      parts: ['', '-fieldstart', 'move: Trick Room'],
      line: '|-fieldstart|move: Trick Room',
      getPoke: () => null,
      playerSide: 'p1'
    };
    const handled = await handleFieldEvents(ctx as any);
    expect(handled).toBe(true);
    const conds = mockStore.activeBattle.value.fieldConditions as Record<string, unknown>;
    expect(conds['Trick Room']).toBeDefined();
  });
});
