import { describe, it, expect } from 'vitest';
import { handleFieldEvents } from '@/logic/battle/showdownBridgeField';

describe('Audit Parity - BUG-033: -fieldstart terrain detection by substring is fragile', () => {
  it('should NOT classify a pseudo-weather containing "terrain" in name as an actual terrain', async () => {
    const battle = { terrain: null, fieldConditions: {} as Record<string, unknown> };
    const ctx = {
      store: { activeBattle: { value: battle }, addLog: () => {} },
      type: '-fieldstart',
      // Simulate a pseudo-weather move called "desolatedterrain" (hypothetical, but valid canonical ID)
      parts: ['', '-fieldstart', 'desolatedterrain'],
      line: '|-fieldstart|desolatedterrain',
      p: null,
      getPoke: () => null,
      getSide: () => null,
      playerSide: 'p1',
    } as unknown as Parameters<typeof handleFieldEvents>[0];

    await handleFieldEvents(ctx);

    // A non-canonical terrain should go to fieldConditions, NOT overwrite activeBattle.terrain
    expect(battle.terrain).toBeNull();
    expect(battle.fieldConditions['desolatedterrain']).toBeDefined();
  });
});
