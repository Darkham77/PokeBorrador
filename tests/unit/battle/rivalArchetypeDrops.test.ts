import { describe, it, expect, vi } from 'vitest';
import { handleRivalSpecialDrops } from '@/logic/battle/rewards/classRewardsHandler';
import type { BattleContext } from '@/types/battle/battleContext';
import type { BattleState } from '@/types/battle/battle';

describe('Rival Archetype Drops', () => {
  const createMockContext = () => ({
    gs: {
      state: {
        inventory: {}
      }
    },
    addLog: vi.fn(),
    uiStore: {
      notify: vi.fn()
    }
  } as unknown as BattleContext);

  it('does NOT drop items if opponent is not rival', () => {
    const ctx = createMockContext();
    const active = {
      isRival: false,
      trainerArchetype: 'gym'
    } as unknown as BattleState;

    handleRivalSpecialDrops(ctx, active);
    expect(Object.keys(ctx.gs.state.inventory)).toHaveLength(0);
    expect(ctx.addLog).not.toHaveBeenCalled();
  });

  it('drops items when trainerArchetype is rival', () => {
    const ctx = createMockContext();
    const active = {
      isRival: false,
      trainerArchetype: 'rival'
    } as unknown as BattleState;

    handleRivalSpecialDrops(ctx, active);
    const itemKeys = Object.keys(ctx.gs.state.inventory);
    expect(itemKeys).toHaveLength(1);
    expect(ctx.addLog).toHaveBeenCalled();
    expect(ctx.uiStore.notify).toHaveBeenCalled();
  });

  it('drops items when active.isRival is true', () => {
    const ctx = createMockContext();
    const active = {
      isRival: true,
      trainerArchetype: undefined
    } as unknown as BattleState;

    handleRivalSpecialDrops(ctx, active);
    const itemKeys = Object.keys(ctx.gs.state.inventory);
    expect(itemKeys).toHaveLength(1);
  });

  it('can drop ivscanner when random threshold matches', () => {
    const ctx = createMockContext();
    const active = {
      trainerArchetype: 'rival'
    } as unknown as BattleState;

    // Force Math.random to return 0.95 (which falls into ivscanner > 85%)
    vi.spyOn(Math, 'random').mockReturnValue(0.95);

    handleRivalSpecialDrops(ctx, active);
    expect(ctx.gs.state.inventory['ivscanner']).toBe(1);

    vi.restoreAllMocks();
  });
});
