import { describe, it, expect } from 'vitest';
import { handleCoreEvents } from '@/logic/battle/showdownBridgeCore';

describe('Audit Parity - BUG-083: switch preserves active status', () => {
  it('should not reset active status to null on switch event when no status is given', async () => {
    const target = { name: 'Pikachu', hp: 100, maxHp: 100, status: 'psn' };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: 'switch',
      parts: ['', 'switch', 'p1a: Pikachu', 'Pikachu, L50', '100/100'],
      line: '|switch|p1a: Pikachu|Pikachu, L50|100/100',
      getPoke: () => target,
      getSide: () => 'player'
    };
    await handleCoreEvents(ctx as any);
    expect(target.status).toBe('psn');
  });
});
