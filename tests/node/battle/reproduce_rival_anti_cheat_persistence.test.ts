import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { serializeActiveBattle } from '@/logic/auth/battleSerializerHelper';
import { restoreBattleState } from '@/logic/battle/orchestratorRestoreHelper';
import { saveGame, resetSaveOperationState } from '@/logic/auth/saveService';
import { saveCoordinator } from '@/logic/auth/saveCoordinator';
import { INITIAL_STATE } from '@/stores/gameInitialState';
import { pokemonDebugService } from '@/logic/debug/pokemonDebugService';
import { requirePokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { GameState } from '@/types/system/game';
import type { BattleState } from '@/types/battle/battle';
import type { AuthUser } from '@/types/auth/auth';
import { ref } from 'vue';

describe('Rival Anti-Cheat Battle Persistence & Remote Save Parity', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    resetSaveOperationState();
  });

  it('should faithfully serialize and restore an active rival trainer battle', async () => {
    const p1 = pokemonDebugService.generate({ id: requirePokemonSpeciesId('pikachu'), level: 50 });
    const rivalMon = pokemonDebugService.generate({ id: requirePokemonSpeciesId('eevee'), level: 50 });

    const rivalBattle: BattleState = {
      player: p1,
      enemy: rivalMon,
      playerTeamIndex: 0,
      enemyTeamIndex: 0,
      participants: [p1.uid],
      locationId: 'route1',
      isTrainer: true,
      trainerName: 'Rival Gary',
      trainerSprite: 'silver',
      enemyTeam: [rivalMon],
      weather: { type: 'none', turns: 0 },
      turnCount: 2,
      over: false,
      escapeAttempts: 0,
      wasSearching: false,
    };

    const gameState = {
      ...INITIAL_STATE,
      trainer: 'Red',
      starterChosen: true,
      team: [p1],
      activeBattle: rivalBattle,
    } as unknown as GameState;

    // 1. Serialize active battle
    const serialized = serializeActiveBattle(gameState);
    expect(serialized).not.toBeNull();
    expect(serialized?.isTrainer).toBe(true);
    expect(serialized?.trainerName).toBe('Rival Gary');
    expect(serialized?.enemyTeam?.[0]?.id).toBe(requirePokemonSpeciesId('eevee'));

    // 2. Restore active battle into context
    const activeBattleRef = ref<BattleState | null>(null);
    const transitions: Array<{ state: string; subState?: string }> = [];

    const mockCtx = {
      activeBattle: activeBattleRef,
      playerStages: ref({}),
      enemyStages: ref({}),
      battleLogs: ref([]),
      isProcessing: ref(false),
      BATTLE_STATES: {
        SEARCH_PHASE: 'SEARCH_PHASE',
        ACTIVE_BATTLE: 'ACTIVE_BATTLE',
        CONTEXT_SETUP: 'CONTEXT_SETUP',
        EXIT_BATTLE: 'EXIT_BATTLE',
      },
      BATTLE_SUBSTATES: {
        WAIT_INPUT: 'WAIT_INPUT',
        DISCOVER_WILDS: 'DISCOVER_WILDS',
      },
      fsm: {
        currentState: ref('EXIT_BATTLE'),
        transition: async (state: string, subState?: string) => {
          transitions.push({ state, subState });
          mockCtx.fsm.currentState.value = state;
        },
      },
      gs: {
        state: gameState,
        save: () => {},
      },
      router: { push: vi.fn() },
    };

    await restoreBattleState(mockCtx as any, serialized);

    expect(activeBattleRef.value).not.toBeNull();
    expect(activeBattleRef.value?.isTrainer).toBe(true);
    expect(activeBattleRef.value?.trainerName).toBe('Rival Gary');
    expect(mockCtx.fsm.currentState.value).toBe('ACTIVE_BATTLE');
  });

  it('bypasses 60-second cloud throttle when forceRemote: true is requested during battle persistence', async () => {
    // Simulate that a cloud save happened recently (throttle window active)
    saveCoordinator.notifyCloudSaveSuccess();
    expect(saveCoordinator.shouldExecuteCloudSave(false)).toBe(false);

    const user: AuthUser = {
      id: '00000000-0000-0000-0000-000000000099',
      email: 'anticheat@test.local',
      user_metadata: { username: 'AntiCheatRival' },
    };

    const starter = pokemonDebugService.generate({ id: requirePokemonSpeciesId('rayquaza'), level: 100 });
    const rivalMon = pokemonDebugService.generate({ id: requirePokemonSpeciesId('eevee'), level: 50 });

    const state: GameState = {
      ...INITIAL_STATE,
      trainer: 'AntiCheatRival',
      starterChosen: true,
      team: [starter],
      activeBattle: {
        player: starter,
        enemy: rivalMon,
        playerTeamIndex: 0,
        enemyTeamIndex: 0,
        participants: [starter.uid],
        locationId: 'route1',
        isTrainer: true,
        trainerName: 'Rival',
        enemyTeam: [rivalMon],
        weather: { type: 'none', turns: 0 },
        turnCount: 1,
        over: false,
        escapeAttempts: 0,
      } as BattleState,
    } as unknown as GameState;

    let rpcCalled = false;
    const mockDb: any = {
      mode: 'online',
      rpc: async (_name: string, _params: unknown) => {
        rpcCalled = true;
        return { data: { success: true, last_save_id: 'save-remote-1' }, error: null };
      },
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: user.id } }) }) }),
        update: () => ({ eq: async () => ({ data: null, error: null }) }),
      }),
    };

    // Un-forced save is throttled locally
    const unforcedResult = await saveGame(state, user, { db: mockDb, showNotif: false, forceRemote: false });
    expect(unforcedResult?.remote).toBe(false);
    expect(rpcCalled).toBe(false);

    // ForceRemote save bypasses throttle and persists to remote database
    const forcedResult = await saveGame(state, user, { db: mockDb, showNotif: false, forceRemote: true });
    expect(forcedResult?.remote).toBe(true);
    expect(rpcCalled).toBe(true);
  });
});
