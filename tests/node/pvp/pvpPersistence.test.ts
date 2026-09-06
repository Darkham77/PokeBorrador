import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useGameStore } from '@/stores/game';
import { serializeActiveBattle } from '@/logic/auth/battleSerializerHelper';
import { restoreBattleState } from '@/logic/battle/orchestratorRestoreHelper';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleContext } from '@/types/battle/battleContext';
import { ref } from 'vue';

describe('PvP Battle State Persistence & Restoration', () => {
  const createFakePoke = (uid: string, name: string): Pokemon => {
    return {
      uid,
      id: 25,
      name,
      level: 50,
      hp: 100,
      maxHp: 100,
      moves: ['thunderbolt'],
      stats: { hp: 100, atk: 55, def: 40, spa: 50, spd: 50, spe: 90 },
      isIllegal: false
    } as unknown as Pokemon;
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    const gs = useGameStore();
    Object.assign(gs.state, {
      starterChosen: true,
      team: [createFakePoke('adv-1', 'AdventurePoke')],
      pvpTeam: ['pvp-1', 'pvp-2', 'pvp-3'],
      pvpTeam6: []
    });
  });

  it('should serialize an active PvP battle with full metadata and dedicated teams', () => {
    const gs = useGameStore();
    const p1 = createFakePoke('pvp-1', 'Pikachu');
    const p2 = createFakePoke('pvp-2', 'Charizard');
    const p3 = createFakePoke('pvp-3', 'Blastoise');

    const e1 = createFakePoke('enemy-1', 'Gengar');
    const e2 = createFakePoke('enemy-2', 'Alakazam');
    const e3 = createFakePoke('enemy-3', 'Machamp');

    gs.state.activeBattle = {
      isPvP: true,
      isTrainer: true,
      locationId: 'gym',
      pvpMatchId: 'match-xyz-789',
      pvpIsHost: true,
      pvpOpponentId: 'user-rival-99',
      pvpOpponentName: 'Rival Gary',
      turnCount: 4,
      playerTeam: [p1, p2, p3],
      enemyTeam: [e1, e2, e3],
      player: p1,
      enemy: e1,
      weather: { type: 'none', visual: 'clear', turns: -1 },
      over: false,
      playerStages: { atk: 1, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0 },
      enemyStages: { atk: 0, def: -1, spa: 0, spd: 0, spe: 0, accuracy: 0 },
      battleLogs: []
    } as unknown as typeof gs.state.activeBattle;

    const serialized = serializeActiveBattle(gs.state);

    expect(serialized).not.toBeNull();
    expect(serialized?.isPvP).toBe(true);
    expect(serialized?.pvpMatchId).toBe('match-xyz-789');
    expect(serialized?.pvpIsHost).toBe(true);
    expect(serialized?.pvpOpponentId).toBe('user-rival-99');
    expect(serialized?.pvpOpponentName).toBe('Rival Gary');
    expect(serialized?.turnCount).toBe(4);
    expect(serialized?.playerTeam).toHaveLength(3);
    expect(serialized?.enemyTeam).toHaveLength(3);
    expect(serialized?.playerTeam?.[0]?.name).toBe('Pikachu');
    expect(serialized?.enemyTeam?.[0]?.name).toBe('Gengar');
  });

  it('should faithfully restore a PvP battle state and preserve the PvP team over adventure team', async () => {
    const gs = useGameStore();
    const p1 = createFakePoke('pvp-1', 'Pikachu');
    const p2 = createFakePoke('pvp-2', 'Charizard');
    const e1 = createFakePoke('enemy-1', 'Gengar');

    const fakeBattleData = {
      isPvP: true,
      isTrainer: true,
      locationId: 'gym',
      pvpMatchId: 'match-reconnect-123',
      pvpIsHost: false,
      pvpOpponentId: 'host-user-1',
      pvpOpponentName: 'Host Ash',
      turnCount: 2,
      playerTeam: [p1, p2],
      enemyTeam: [e1],
      playerTeamIndex: 0,
      enemyTeamIndex: 0,
      over: false
    };

    const transitionMock = vi.fn().mockResolvedValue(undefined);

    const fakeContext = {
      BATTLE_STATES: { ACTIVE_BATTLE: 'ACTIVE_BATTLE', EXIT_BATTLE: 'EXIT_BATTLE' },
      BATTLE_SUBSTATES: { WAIT_INPUT: 'WAIT_INPUT' },
      activeBattle: ref(null),
      playerStages: ref({}),
      enemyStages: ref({}),
      battleLogs: ref([]),
      isProcessing: ref(false),
      fsm: { transition: transitionMock },
      gs
    } as unknown as BattleContext;

    await restoreBattleState(fakeContext, fakeBattleData);

    expect(fakeContext.activeBattle.value).not.toBeNull();
    expect(fakeContext.activeBattle.value?.isPvP).toBe(true);
    expect(fakeContext.activeBattle.value?.pvpMatchId).toBe('match-reconnect-123');
    // Crucial: playerTeam must be the restored PvP team, NOT the adventure team
    expect(fakeContext.activeBattle.value?.playerTeam?.[0]?.name).toBe('Pikachu');
    expect(fakeContext.activeBattle.value?.player?.name).toBe('Pikachu');
    expect(fakeContext.activeBattle.value?.enemy?.name).toBe('Gengar');
    expect(transitionMock).toHaveBeenCalledWith('ACTIVE_BATTLE', 'WAIT_INPUT');
  });
});
