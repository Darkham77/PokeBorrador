/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { h, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import '../../helpers/battleMockSetup';
import BattleMoveSlot from '@/components/battle/BattleMoveSlot.vue';
import { executeSwitch } from '@/logic/battle/actions/switchAction';
import { clearVolatileStatus } from '@/logic/battle/battleStatus';
import { BATTLE_STATES, BATTLE_SUBSTATES } from '@/logic/battle/battleStateMachine';
import type { BattleContext } from '@/types/battle/battleContext';
import type { Pokemon, Move } from '@/types/pokemon/pokemon';

vi.mock('@/logic/services/assetService', () => ({
  getAssetUrl: () => 'mock-url',
  ASSET_TYPES: { MOVE: 'move' }
}));

vi.mock('@/stores/battle/battle', () => ({
  useBattleStore: vi.fn(() => ({
    state: { weather: { type: 'clear' } }
  }))
}));

vi.mock('@/composables/battle/useMoveSlotData', () => ({
  useMoveSlotData: vi.fn(() => ({
    moveData: { value: { type: 'flying', cat: 'physical', power: 90, acc: 95 } },
    finalPower: { value: 90 },
    finalAccuracy: { value: 95 },
    moveModifier: { value: null },
    effectivenessMultiplier: { value: 1.0 }
  }))
}));

// Mock components to avoid deep rendering issues in simple unit tests
vi.mock('@/components/shared/PokemonTypeTag.vue', () => ({
  default: { render: () => h('div', 'TypeTag') }
}));
vi.mock('@/components/common/PVTooltip.vue', () => ({
  default: { render: () => h('div', 'Tooltip') }
}));
vi.mock('@/components/battle/MoveTooltip.vue', () => ({
  default: { render: () => h('div', 'MoveTooltip') }
}));

describe('Battle Move Slot UI & Choice / Volatile Move Locking Suite', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('BattleMoveSlot Component Interactions', () => {
    it('should disable non-locked moves when player has twoturnmove active', async () => {
      const moveFly = { id: 'fly', name: 'Vuelo', pp: 15, maxPP: 15 } as Move;
      const moveTackle = { id: 'tackle', name: 'Placaje', pp: 35, maxPP: 35 } as Move;

      const playerInfo = {
        uid: 'p1',
        name: 'Dragonite',
        volatileCounters: {
          twoturnmove: 1
        },
        lastMove: moveFly
      } as unknown as Pokemon;

      // Mount slot for Vuelo (the locked move)
      const wrapperFly = mount(BattleMoveSlot, {
        props: {
          move: moveFly,
          index: 0,
          playerInfo
        }
      });

      // Mount slot for Tackle (the disabled move)
      const wrapperTackle = mount(BattleMoveSlot, {
        props: {
          move: moveTackle,
          index: 1,
          playerInfo
        }
      });

      // Vuelo should NOT be disabled
      const buttonFly = wrapperFly.find('button.move-card-vicio');
      expect(buttonFly.attributes('disabled')).toBeUndefined();
      expect(wrapperFly.find('.move-slot-wrapper').classes()).not.toContain('is-disabled');

      // Tackle SHOULD be disabled
      const buttonTackle = wrapperTackle.find('button.move-card-vicio');
      expect(buttonTackle.attributes('disabled')).toBeDefined();
      expect(wrapperTackle.find('.move-slot-wrapper').classes()).toContain('is-disabled');
    });

    it('should reactively disable moves when twoturnmove is dynamically set', async () => {
      const moveFly = { id: 'fly', name: 'Vuelo', pp: 15, maxPP: 15 } as Move;
      const moveTackle = { id: 'tackle', name: 'Placaje', pp: 35, maxPP: 35 } as Move;

      const playerInfo = ref({
        uid: 'p1',
        name: 'Dragonite',
        volatileCounters: {}
      } as unknown as Pokemon);

      const wrapper = mount(BattleMoveSlot, {
        props: {
          move: moveTackle,
          index: 1,
          playerInfo: playerInfo.value
        }
      });

      interface TestVMInstance {
        isDisabled: boolean;
        $nextTick: () => Promise<void>;
      }
      const vmInstance = wrapper.vm as unknown as TestVMInstance;

      expect(vmInstance.isDisabled).toBe(false);

      playerInfo.value.volatileCounters = { twoturnmove: 1 };
      playerInfo.value.lastMove = moveFly;

      await vmInstance.$nextTick();

      expect(vmInstance.isDisabled).toBe(true);
    });

    it('disables other moves when a choice move is selected', () => {
      const pokemon = {
        uid: 'p1',
        name: 'Charizard',
        heldItem: 'choicespecs',
        choiceMove: 'Lanzallamas',
        moves: [
          { id: 'flamethrower', name: 'Lanzallamas', pp: 15, maxPP: 15 },
          { id: 'airslash', name: 'Tajo Aéreo', pp: 15, maxPP: 15 }
        ]
      } as unknown as Pokemon;

      // Mount Lanzallamas slot
      const wrapperFlamethrower = mount(BattleMoveSlot, {
        props: {
          move: pokemon.moves[0] as Move,
          index: 0,
          playerInfo: pokemon
        }
      });

      // Mount Tajo Aéreo slot
      const wrapperAirSlash = mount(BattleMoveSlot, {
        props: {
          move: pokemon.moves[1] as Move,
          index: 1,
          playerInfo: pokemon
        }
      });

      // Lanzallamas (the selected choiceMove) should NOT be disabled
      expect(wrapperFlamethrower.classes()).not.toContain('is-disabled');

      // Tajo Aéreo (another move) should be disabled
      expect(wrapperAirSlash.classes()).toContain('is-disabled');
      expect(wrapperAirSlash.find('button').attributes('disabled')).toBeDefined();
    });
  });

  describe('Volatile Status & Clear Lifecycle', () => {
    it('resets choiceMove restriction when clearVolatileStatus is called (e.g. on switch out)', () => {
      const pokemon = {
        uid: 'p1',
        name: 'Charizard',
        heldItem: 'choicespecs',
        choiceMove: 'Lanzallamas'
      } as unknown as Pokemon & { choiceMove?: string };

      clearVolatileStatus(pokemon);

      expect(pokemon.choiceMove).toBeUndefined();
    });

    it('should revert Ditto transformation back to original properties and clean up others', () => {
      const originalDitto = {
        id: 'ditto',
        name: 'Ditto',
        type: 'normal',
        atk: 48,
        def: 48,
        spa: 48,
        spd: 48,
        spe: 48,
        moves: [],
        level: 5,
        maxHp: 30
      };

      const pokemon = {
        id: 'pikachu',
        name: 'Pikachu',
        type: 'electric',
        atk: 55,
        def: 40,
        spa: 50,
        spd: 50,
        spe: 90,
        moves: [{ name: 'Impactrueno', pp: 30, maxPP: 30 }],
        hp: 20,
        maxHp: 35,
        isTransformed: true,
        originalDitto,
        furyCutterCount: 4,
        identified: true
      } as unknown as Pokemon;

      clearVolatileStatus(pokemon);

      expect(pokemon.isTransformed).toBe(false);
      expect(pokemon.originalDitto).toBeUndefined();
      expect(pokemon.id).toBe('ditto');
      expect(pokemon.name).toBe('Ditto');
      expect(pokemon.type).toBe('normal');
      expect(pokemon.atk).toBe(48);
      expect(pokemon.def).toBe(48);
      expect(pokemon.hp).toBe(20);
      expect(pokemon.maxHp).toBe(30);
      expect(pokemon.furyCutterCount).toBe(0);
      expect(pokemon.identified).toBe(false);
    });
  });

  describe('executeSwitch twoturnmove blocking', () => {
    it('should block switch when active pokemon has twoturnmove active and is not forced', async () => {
      const oldPoke = {
        uid: 'p-old',
        name: 'Dragonite',
        hp: 100,
        volatileCounters: {
          twoturnmove: 1
        }
      } as unknown as Pokemon;

      const newPoke = {
        uid: 'p-new',
        name: 'Charizard',
        hp: 100
      } as unknown as Pokemon;

      const team = [oldPoke, newPoke];

      const activeBattle = ref({
        player: oldPoke,
        enemy: { uid: 'e-active', hp: 100 } as unknown as Pokemon,
        playerTeamIndex: 0
      });

      const fsm = {
        currentState: { value: BATTLE_STATES.ACTIVE_BATTLE } as { value: string },
        currentSubState: { value: BATTLE_SUBSTATES.WAIT_INPUT } as { value: string | null },
        transition: vi.fn(async (s: string, sub?: string) => {
          (fsm.currentState as { value: string }).value = s;
          if (sub) (fsm.currentSubState as { value: string | null }).value = sub;
        })
      };

      const mockCtx = {
        gs: { state: { team } },
        activeBattle,
        fsm,
        BATTLE_STATES,
        BATTLE_SUBSTATES,
        addLog: vi.fn(),
        persistBattle: vi.fn()
      } as unknown as BattleContext;

      // Non-forced switch
      await executeSwitch(mockCtx, 1, false);

      // Should have returned early, transitioning back to WAIT_INPUT
      expect(fsm.currentSubState.value).toBe(BATTLE_SUBSTATES.WAIT_INPUT);
      // Active pokemon should still be the old one
      expect(activeBattle.value.player.uid).toBe('p-old');
    });
  });

  describe('parseShowdownLogLine twoturnmove and lockedmove', () => {
    it('should set twoturnmove and lastMove on prepare', async () => {
      const { parseShowdownLogLine } = await import('@/logic/battle/showdownBridge');
      const player = {
        uid: 'p-active',
        id: 'rayquaza',
        name: 'Rayquaza-Mega',
        hp: 100,
        volatileCounters: {}
      } as unknown as Pokemon;
      
      const activeBattle = ref({
        player,
        enemy: { uid: 'e-active', id: 'pikachu', name: 'Pikachu', hp: 100 } as unknown as Pokemon,
        playerTeam: [player],
        enemyTeam: [{ uid: 'e-active', id: 'pikachu', name: 'Pikachu', hp: 100 }]
      });
      
      const mockCtx = {
        activeBattle,
        addLog: vi.fn(),
        attackerSide: ref(null),
        activeMove: ref(null)
      } as unknown as BattleContext;
      
      await parseShowdownLogLine(mockCtx, '|-prepare|p1a: Rayquaza-Mega|Fly|[uids]p1a:Rayquaza-Mega=p-active');
      
      expect(player.volatileCounters?.['twoturnmove']).toBe(1);
      expect(player.lastMove?.id).toBe('fly');
    });

    it('should set lockedmove on move with locked_move effect', async () => {
      const { parseShowdownLogLine } = await import('@/logic/battle/showdownBridge');
      const player = {
        uid: 'p-active',
        id: 'rayquaza',
        name: 'Rayquaza-Mega',
        hp: 100,
        volatileCounters: {}
      } as unknown as Pokemon;
      
      const activeBattle = ref({
        player,
        enemy: { uid: 'e-active', id: 'pikachu', name: 'Pikachu', hp: 100 } as unknown as Pokemon,
        playerTeam: [player],
        enemyTeam: [{ uid: 'e-active', id: 'pikachu', name: 'Pikachu', hp: 100 }]
      });
      
      const mockCtx = {
        activeBattle,
        addLog: vi.fn(),
        attackerSide: ref(null),
        activeMove: ref(null)
      } as unknown as BattleContext;
      
      // Simular uso de Enfado (Outrage)
      await parseShowdownLogLine(mockCtx, '|move|p1a: Rayquaza-Mega|Outrage|p2a: Pikachu|[uids]p1a:Rayquaza-Mega=p-active,p2a:Pikachu=e-active');
      
      expect(player.volatileCounters?.['lockedmove']).toBe(1);
      expect(player.lastMove?.id).toBe('outrage');
    });
  });
});
