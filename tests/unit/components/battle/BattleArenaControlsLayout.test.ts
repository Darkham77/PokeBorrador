// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import BattleArenaControls from '@/components/battle/BattleArenaControls.vue';
import { useBattleStore } from '@/stores/battle/battle';

describe('BattleArenaControls Layout & Spacer', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
  });

  it('renders zone-spacer when allowBag is false (PvP / no-bag battles)', () => {
    const battleStore = useBattleStore();
    battleStore.state = { isPvP: true } as any;

    const wrapper = mount(BattleArenaControls, {
      global: {
        plugins: [pinia],
        stubs: {
          BattleQuickTeam: true,
          BattleMovesGrid: true,
          BattleActionButtons: true,
          BattleQuickBag: true,
          StruggleOverlay: true
        }
      }
    });

    expect(battleStore.uiConfig.allowBag).toBe(false);
    expect(wrapper.find('.zone-team').exists()).toBe(true);
    expect(wrapper.find('.controls-content').exists()).toBe(true);
    expect(wrapper.find('.zone-bag').exists()).toBe(false);
    expect(wrapper.find('.zone-spacer').exists()).toBe(true);
  });

  it('renders zone-bag and omits zone-spacer when allowBag is true (Wild / PvE battles)', () => {
    const battleStore = useBattleStore();
    battleStore.state = null;

    const wrapper = mount(BattleArenaControls, {
      global: {
        plugins: [pinia],
        stubs: {
          BattleQuickTeam: true,
          BattleMovesGrid: true,
          BattleActionButtons: true,
          BattleQuickBag: true,
          StruggleOverlay: true
        }
      }
    });

    expect(battleStore.uiConfig.allowBag).toBe(true);
    expect(wrapper.find('.zone-team').exists()).toBe(true);
    expect(wrapper.find('.controls-content').exists()).toBe(true);
    expect(wrapper.find('.zone-bag').exists()).toBe(true);
    expect(wrapper.find('.zone-spacer').exists()).toBe(false);
  });
});
