import { describe, it, expect, vi } from 'vitest';
import { processRocketStealMechanics } from '@/logic/battle/orchestratorRocketHelper';
import type { BattleContext } from '@/types/battle/battleContext';
import { ref } from 'vue';

describe('processRocketStealMechanics', () => {
  it('does nothing if player is not rocket and enemy is not rocket', async () => {
    const mockCtx = {
      gs: { state: { playerClass: 'trainer', inventory: {}, money: 1000 } },
      classStore: { classLevel: 5, addCriminality: vi.fn() },
      activeBattle: ref(null),
      addLog: vi.fn(),
      uiStore: { notify: vi.fn() },
      audio: { play: vi.fn() },
    } as unknown as BattleContext;

    await processRocketStealMechanics(mockCtx, false, false, 'Wild Pikachu', null);
    expect(mockCtx.addLog).not.toHaveBeenCalled();
  });
});
