import { describe, it, expect } from 'vitest';
import { handleCoreEvents } from '@/logic/battle/showdownBridgeCore';

describe('Audit Parity - BUG-051: move resets disabled turns', () => {
  it('should decrease or reset disabled turns when move is executed', async () => {
    const attacker = {
      name: 'Pikachu',
      disabledTurns: 3,
      disabledMove: { id: 'thunderbolt' }
    };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: 'move',
      parts: ['', 'move', 'p1a: Pikachu', 'Quick Attack'],
      line: '|move|p1a: Pikachu|Quick Attack',
      getPoke: () => attacker,
      getSide: () => 'player',
      turnLogs: []
    };
    await handleCoreEvents(ctx as any);
    expect(attacker.disabledTurns).toBeLessThan(3);
  });
});
