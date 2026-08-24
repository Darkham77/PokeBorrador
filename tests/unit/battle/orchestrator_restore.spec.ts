import { describe, it, expect, vi } from 'vitest';
import { restoreBattleState } from '@/logic/battle/orchestratorRestoreHelper';
import type { BattleContext } from '@/types/battle/battleContext';
import type { BattleState, BattleStages } from '@/types/battle/battle';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import { ref } from 'vue';

vi.mock('@/logic/battle/orchestratorWorkerInitHelper', () => ({
  initWorkerForBattle: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('@/logic/battle/searchLoop', () => ({
  handleBattleFlowCompletion: vi.fn().mockResolvedValue(undefined)
}));

function createMockStages(overrides: Partial<BattleStages> = {}): BattleStages {
  return {
    atk: 0,
    def: 0,
    spa: 0,
    spd: 0,
    spe: 0,
    accuracy: 0,
    evasion: 0,
    reflect: 0,
    lightScreen: 0,
    safeguard: 0,
    mist: 0,
    spikes: 0,
    ...overrides
  };
}

function createMockBattleContext(): BattleContext {
  const p1 = makePokemon('bulbasaur', 10)!;
  p1.uid = 'p1-uid-1234';

  const fsm = {
    currentState: ref('EXIT_BATTLE'),
    currentSubState: ref(null),
    transition: vi.fn().mockImplementation((state, subState = null) => {
      fsm.currentState.value = state;
      fsm.currentSubState.value = subState;
      return Promise.resolve();
    }),
    canTransitionTo: vi.fn().mockReturnValue(true),
    is: vi.fn(),
    isSub: vi.fn()
  };

  return {
    fsm,
    activeBattle: ref<BattleState | null>(null),
    playerStages: ref(createMockStages()),
    enemyStages: ref(createMockStages()),
    battleLogs: ref([]),
    isProcessing: ref(true),
    gs: {
      state: {
        team: [p1],
        map: { currentMap: 'route1' },
        activeBattle: null
      }
    },
    BATTLE_STATES: {
      INITIALIZING: 'INITIALIZING',
      SEARCH_PHASE: 'SEARCH_PHASE',
      ACTIVE_BATTLE: 'ACTIVE_BATTLE',
      EXIT_BATTLE: 'EXIT_BATTLE',
      REWARDS_PHASE: 'REWARDS_PHASE'
    },
    BATTLE_SUBSTATES: {
      WAIT_INPUT: 'WAIT_INPUT',
      COMBAT_OR_FLEE: 'COMBAT_OR_FLEE',
      MINIGAME_CHECK: 'MINIGAME_CHECK'
    }
  } as unknown as BattleContext;
}

describe('orchestratorRestoreHelper - restoreBattleState', () => {
  it('should faithfully restore active combat with exact enemy, HP, stages, and logs', async () => {
    const ctx = createMockBattleContext();
    const enemy = makePokemon('pidgey', 10)!;
    enemy.uid = 'enemy-uid-5678';
    enemy.hp = 15;

    const savedBattle: Partial<BattleState> = {
      player: ctx.gs.state.team[0],
      enemy,
      turnCount: 3,
      over: false,
      locationId: 'route1',
      wasSearching: true,
      playerStages: createMockStages({ atk: 1 }),
      enemyStages: createMockStages({ def: -1 }),
      battleLogs: [{ id: '1', msg: '¡Lanzallamas!', type: 'log-info', side: 'player', icon: null, iconType: null }]
    };

    await restoreBattleState(ctx, savedBattle);

    expect(ctx.activeBattle.value).not.toBeNull();
    expect(ctx.activeBattle.value?.enemy?.uid).toBe('enemy-uid-5678');
    expect(ctx.activeBattle.value?.turnCount).toBe(3);
    expect(ctx.playerStages.value.atk).toBe(1);
    expect(ctx.enemyStages.value.def).toBe(-1);
    expect(ctx.battleLogs.value.length).toBe(1);
    expect(ctx.fsm.currentState.value).toBe('ACTIVE_BATTLE');
    expect(ctx.fsm.currentSubState.value).toBe('WAIT_INPUT');
    expect(ctx.isProcessing.value).toBe(false);
  });

  it('should drop minigame states (fishing / archaeology) and return cleanly to search loop without persisting', async () => {
    const ctx = createMockBattleContext();
    const { handleBattleFlowCompletion } = await import('@/logic/battle/searchLoop');

    const savedMinigame: Partial<BattleState> = {
      locationId: 'route1',
      minigame: 'fishing',
      wasSearching: true
    };

    await restoreBattleState(ctx, savedMinigame);

    expect(handleBattleFlowCompletion).toHaveBeenCalledWith(ctx, 'search');
    expect(ctx.activeBattle.value?.minigame).toBeNull();
    expect(ctx.activeBattle.value?.wasSearching).toBe(true);
  });

  it('should discard completed battles (over: boolean) and transition to EXIT_BATTLE', async () => {
    const ctx = createMockBattleContext();
    const savedOverBattle: Partial<BattleState> = {
      locationId: 'route1',
      over: true
    };

    await restoreBattleState(ctx, savedOverBattle);

    expect(ctx.activeBattle.value).toBeNull();
    expect(ctx.fsm.currentState.value).toBe('EXIT_BATTLE');
  });
});
