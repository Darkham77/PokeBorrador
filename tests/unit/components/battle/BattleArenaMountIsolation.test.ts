import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vite-plus/test';

import BattleArena from '@/components/battle/BattleArena.vue';
import BattleTrainerEntities from '@/components/battle/BattleTrainerEntities.vue';
import { useBattleStore } from '@/stores/battle/battle';
import { useMapStore } from '@/stores/map';

describe('BattleArena Mount & Idle State Resilience (Tier 1 RED Reproduction)', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
  });

  it('mounts cleanly in idle state when app boots (battleStore.state is null, isBattleActive is false)', () => {
    const battleStore = useBattleStore();
    const mapStore = useMapStore();
    battleStore.state = null;
    mapStore.currentMap = 'pallet_town';

    expect(() => {
      mount(BattleArena, {
        global: {
          plugins: [pinia],
          stubs: {
            BaseModal: true,
            PVTooltip: true,
            BattleArenaView: true,
            BattleLog: true,
            BattleArenaControls: true,
            Teleport: true
          }
        }
      });
    }).not.toThrow();
  });

  it('throws loud error during active battle if locationId is missing', () => {
    const battleStore = useBattleStore();
    battleStore.state = {
      player: null,
      enemy: null,
      isTrainer: false,
      turnCount: 1,
      over: false,
      weather: null
    } as any;

    expect(() => {
      mount(BattleArena, {
        global: {
          plugins: [pinia],
          stubs: {
            BaseModal: true,
            PVTooltip: true,
            BattleArenaView: true,
            BattleLog: true,
            BattleArenaControls: true,
            Teleport: true
          }
        }
      });
    }).toThrowError(/\[BattleArena\] battle\.locationId no especificado en batalla activa/);
  });

  it('mounts BattleTrainerEntities cleanly without throwing ReferenceError: watch is not defined', () => {
    const wrapper = mount(BattleTrainerEntities, {
      props: {
        isTrainerVisible: true,
        showStandingTrainers: false,
        trainerAnimState: null,
        showGuides: false,
        p2Pos: { x: 100, y: 100 },
        baseEntitySizeEnemy: 64,
        baseEntitySizePlayer: 64,
        objectScale: 1,
        isTrainerOrGym: false,
        isPvP: false,
        trainerSprite: 'cazabichos',
        trainerGender: 'h',
        trainerName: 'Ash',
        playerBackSpriteUrl: '/assets/sprites/trainers/cazabichos_h_back.webp'
      }
    });

    expect(wrapper.exists()).toBe(true);
  });
});
