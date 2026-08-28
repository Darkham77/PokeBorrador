import { describe, it, expect, vi, beforeEach } from 'vitest';
import { restoreBattleState } from '@/logic/battle/orchestratorRestoreHelper';
import type { BattleContext } from '@/types/battle/battleContext';
import type { BattleState, BattleStages } from '@/types/battle/battle';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import { ref } from 'vue';

vi.mock('@/logic/battle/orchestratorWorkerInitHelper', () => ({
  initWorkerForBattle: vi.fn().mockResolvedValue(undefined)
}));

const mockHandleBattleFlowCompletion = vi.fn().mockResolvedValue(undefined);
vi.mock('@/logic/battle/searchLoop', () => ({
  handleBattleFlowCompletion: (...args: unknown[]) => mockHandleBattleFlowCompletion(...args)
}));

function createMockStages(): BattleStages {
  return {
    atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0,
    reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0
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
      },
      save: vi.fn().mockResolvedValue(undefined)
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

describe('Search Phase F5 Restore (Wild vs Trainer)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('restores wild encounter in search phase back to SEARCH_PHASE upon F5 when turnCount is 0', async () => {
    const ctx = createMockBattleContext();
    const wildPidgey = makePokemon('pidgey', 4)!;
    wildPidgey.uid = 'wild-pidgey-1';

    const savedBattle: Partial<BattleState> = {
      player: ctx.gs.state.team[0],
      enemy: wildPidgey,
      turnCount: 0,
      over: false,
      locationId: 'route1',
      wasSearching: true,
      isTrainer: false,
      isGym: false,
      battleHistory: []
    };

    await restoreBattleState(ctx, savedBattle);

    // Must resume search mode without forcing into active battle
    expect(mockHandleBattleFlowCompletion).toHaveBeenCalledWith(ctx, 'search');
    expect(ctx.activeBattle.value?.wasSearching).toBe(true);
    expect(ctx.fsm.transition).not.toHaveBeenCalledWith('ACTIVE_BATTLE', 'WAIT_INPUT');
  });

  it('restores trainer encounter upon F5 directly to ACTIVE_BATTLE:WAIT_INPUT to prevent escaping', async () => {
    const ctx = createMockBattleContext();
    const trainerDoduo = makePokemon('doduo', 4)!;
    trainerDoduo.uid = 'trainer-doduo-1';

    const savedBattle: Partial<BattleState> = {
      player: ctx.gs.state.team[0],
      enemy: trainerDoduo,
      enemyTeam: [trainerDoduo],
      turnCount: 0,
      over: false,
      locationId: 'route1',
      wasSearching: true,
      isTrainer: true,
      isGym: false,
      trainerName: 'Ornitólogo Ramón',
      battleHistory: []
    };

    await restoreBattleState(ctx, savedBattle);

    // Must resume in active battle without option to escape
    expect(ctx.fsm.transition).toHaveBeenCalledWith('ACTIVE_BATTLE', 'WAIT_INPUT');
    expect(mockHandleBattleFlowCompletion).not.toHaveBeenCalled();
    expect(ctx.activeBattle.value?.isTrainer).toBe(true);
  });

  it('restores in-progress wild combat (turnCount > 0) to ACTIVE_BATTLE:WAIT_INPUT', async () => {
    const ctx = createMockBattleContext();
    const wildPidgey = makePokemon('pidgey', 4)!;
    wildPidgey.uid = 'wild-pidgey-1';

    const savedBattle: Partial<BattleState> = {
      player: ctx.gs.state.team[0],
      enemy: wildPidgey,
      turnCount: 2,
      over: false,
      locationId: 'route1',
      wasSearching: true,
      isTrainer: false,
      isGym: false,
      battleHistory: [{ turnCount: 1, p1Choice: 'move 1', p2Choice: 'move 1' }]
    };

    await restoreBattleState(ctx, savedBattle);

    expect(ctx.fsm.transition).toHaveBeenCalledWith('ACTIVE_BATTLE', 'WAIT_INPUT');
  });
});
