import { describe, it, expect } from 'vitest';
import { handleFieldEvents } from '@/logic/battle/showdownBridgeField';

describe('Audit Parity - BUG-040: -fieldend must clear terrain when electricterrain ID arrives without spaces', () => {
  it('should clear terrain for all canonical terrain IDs in both display-name and ID form', async () => {
    const terrainIds = ['electricterrain', 'grassyterrain', 'mistyterrain', 'psychicterrain'];

    for (const terrainId of terrainIds) {
      const battle = { terrain: terrainId, fieldConditions: {} as Record<string, unknown> };
      const ctx = {
        store: { activeBattle: { value: battle }, addLog: () => {} },
        type: '-fieldend',
        parts: ['', '-fieldend', terrainId],
        line: `|-fieldend|${terrainId}`,
        p: null,
        getPoke: () => null,
        getSide: () => null,
        playerSide: 'p1',
      } as unknown as Parameters<typeof handleFieldEvents>[0];

      await handleFieldEvents(ctx);

      expect(battle.terrain).toBeNull();
    }
  });
});
