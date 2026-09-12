import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleBattleFlowCompletion } from '@/logic/battle/searchLoop';
import type { BattleContext } from '@/types/battle/battleContext';
import { ref } from 'vue';
import { useUIStore } from '@/stores/ui';
import { setActivePinia, createPinia } from 'pinia';

describe('Battle ReturnTab Navigation - Unit Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('navigates back to arena when returning from a battle started from the arena tab', async () => {
    const uiStore = useUIStore();
    uiStore.activeTab = 'battle';

    const ctx = {
      activeBattle: ref({
        isPvP: true,
        returnTab: 'arena',
        locationId: 'gym'
      }),
      isProcessing: ref(false),
      fsm: {
        transition: vi.fn().mockResolvedValue(undefined)
      },
      BATTLE_STATES: { EXIT_BATTLE: 'EXIT_BATTLE' },
      gs: {
        state: { activeBattle: {} },
        save: vi.fn().mockResolvedValue(undefined)
      },
      clearLogs: vi.fn()
    } as unknown as BattleContext;

    await handleBattleFlowCompletion(ctx, 'map');

    expect(uiStore.activeTab).toBe('arena');
    expect(ctx.activeBattle.value).toBeNull();
  });

  it('navigates back to gyms when returnTab is gyms or in a gym battle', async () => {
    const uiStore = useUIStore();
    uiStore.activeTab = 'battle';

    const ctx = {
      activeBattle: ref({
        isGym: true,
        returnTab: 'gyms',
        locationId: 'pewter_gym'
      }),
      isProcessing: ref(false),
      fsm: {
        transition: vi.fn().mockResolvedValue(undefined)
      },
      BATTLE_STATES: { EXIT_BATTLE: 'EXIT_BATTLE' },
      gs: {
        state: { activeBattle: {} },
        save: vi.fn().mockResolvedValue(undefined)
      },
      clearLogs: vi.fn()
    } as unknown as BattleContext;

    await handleBattleFlowCompletion(ctx, 'map');

    expect(uiStore.activeTab).toBe('gyms');
  });

  it('navigates back to home when returnTab is home', async () => {
    const uiStore = useUIStore();
    uiStore.activeTab = 'battle';

    const ctx = {
      activeBattle: ref({
        returnTab: 'home',
        locationId: 'route1'
      }),
      isProcessing: ref(false),
      fsm: {
        transition: vi.fn().mockResolvedValue(undefined)
      },
      BATTLE_STATES: { EXIT_BATTLE: 'EXIT_BATTLE' },
      gs: {
        state: { activeBattle: {} },
        save: vi.fn().mockResolvedValue(undefined)
      },
      clearLogs: vi.fn()
    } as unknown as BattleContext;

    await handleBattleFlowCompletion(ctx, 'map');

    expect(uiStore.activeTab).toBe('home');
  });

  it('defaults to map when returnTab is not specified and not a gym', async () => {
    const uiStore = useUIStore();
    uiStore.activeTab = 'battle';

    const ctx = {
      activeBattle: ref({
        isGym: false,
        locationId: 'route1'
      }),
      isProcessing: ref(false),
      fsm: {
        transition: vi.fn().mockResolvedValue(undefined)
      },
      BATTLE_STATES: { EXIT_BATTLE: 'EXIT_BATTLE' },
      gs: {
        state: { activeBattle: {} },
        save: vi.fn().mockResolvedValue(undefined)
      },
      clearLogs: vi.fn()
    } as unknown as BattleContext;

    await handleBattleFlowCompletion(ctx, 'map');

    expect(uiStore.activeTab).toBe('map');
  });
});
