import { describe, it, expect } from 'vitest';
import { handleMiscEvents } from '@/logic/battle/showdownBridgeMisc';

describe('Audit Parity - BUG-035: swap token must update position in activeBattle seat model', () => {
  it('should update active slot index when |swap| arrives in doubles', () => {
    const battle = {
      player: { name: 'Pikachu', position: 0 },
      playerB: { name: 'Charizard', position: 1 },
    } as Record<string, unknown>;
    const store = { activeBattle: { value: battle }, addLog: () => {} };
    const ctx = {
      store,
      type: 'swap',
      parts: ['', 'swap', 'p1a: Pikachu', '1'],
      line: '|swap|p1a: Pikachu|1',
      p: null,
      getPoke: (id: string) => id.includes('Pikachu') ? battle.player : null,
      getSide: () => 'player',
    } as unknown as Parameters<typeof handleMiscEvents>[0];

    handleMiscEvents(ctx);

    // The swap must update position index on the involved Pokemon — not just log a message
    const pikachu = battle.player as { position: number };
    expect(pikachu.position).toBe(1);
  });
});
