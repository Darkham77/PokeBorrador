import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { serializeActiveBattle } from '@/logic/auth/battleSerializerHelper';
import { restoreBattleState } from '@/logic/battle/orchestratorRestoreHelper';
import type { GameState } from '@/types/system/game';
import type { BattleState } from '@/types/battle/battle';
import type { BattleContext } from '@/types/battle/battleContext';
import { ref } from 'vue';

describe('Battle Searching Mode Persistence & Serialization Parity', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  const dummyState: GameState = {
    map: { currentMap: 'route2' } as GameState['map'],
    team: [{ id: 'pikachu', hp: 100, maxHp: 100 }] as unknown as GameState['team'],
  } as GameState;

  it('should faithfully serialize an active searching state without dropping locationId or wasSearching', () => {
    const searchingBattle: BattleState = {
      player: null,
      enemy: null,
      playerTeamIndex: 0,
      enemyTeamIndex: 0,
      participants: [],
      locationId: 'route2',
      isTrainer: false,
      weather: { type: 'none', turns: 0 },
      turnCount: 0,
      over: false,
      escapeAttempts: 0,
      wasSearching: true
    };

    const gameState = {
      ...dummyState,
      activeBattle: searchingBattle
    } as GameState;

    const serialized = serializeActiveBattle(gameState);
    expect(serialized).not.toBeNull();
    expect(serialized?.wasSearching).toBe(true);
    expect(serialized?.locationId).toBe('route2');
  });

  it('should restore searching mode into SEARCH_PHASE when receiving serialized searching battle payload', async () => {
    const activeBattleRef = ref<BattleState | null>(null);

    const mockCtx = {
      activeBattle: activeBattleRef,
      playerStages: ref({}),
      enemyStages: ref({}),
      battleLogs: ref([]),
      isProcessing: ref(false),
      BATTLE_STATES: { SEARCH_PHASE: 'SEARCH_PHASE', ACTIVE_BATTLE: 'ACTIVE_BATTLE', CONTEXT_SETUP: 'CONTEXT_SETUP' },
      BATTLE_SUBSTATES: { WAIT_INPUT: 'WAIT_INPUT', DISCOVER_WILDS: 'DISCOVER_WILDS' },
      fsm: {
        currentState: ref('IDLE'),
        transition: () => {}
      },
      gs: {
        state: dummyState,
        save: () => {}
      },
      animations: null,
      uiConfig: {},
      isPvP: ref(false)
    } as unknown as BattleContext;

    const serializedPayload = {
      locationId: 'route2',
      wasSearching: true,
      turnCount: 0,
      isTrainer: false,
      isGym: false,
      isPvP: false
    };

    await restoreBattleState(mockCtx, serializedPayload);
    expect(mockCtx.activeBattle.value).not.toBeNull();
    expect(mockCtx.activeBattle.value?.wasSearching).toBe(true);
    expect(mockCtx.activeBattle.value?.locationId).toBe('route2');
  });
});
