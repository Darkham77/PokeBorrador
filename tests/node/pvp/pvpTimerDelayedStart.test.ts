import { describe, it, expect, vi } from 'vitest';
import { executeCheckBothTeamsConfirmed, executeHandleOpponentTeam } from '@/logic/pvp/livePvPBattleSetupHandler';
import { executeStartPassiveBattle } from '@/logic/pvp/livePvPPassiveFallbackHandler';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('PvP Turn Timer Delayed Start (Wait until WAIT_INPUT)', () => {
  const dummyPoke: Pokemon = {
    id: 'pikachu',
    uid: 'poke-1',
    name: 'Pikachu',
    level: 50,
    hp: 100,
    maxHp: 100,
    moves: []
  } as unknown as Pokemon;

  it('executeCheckBothTeamsConfirmed starts timer only after startBattle resolves', async () => {
    let resolveStartBattle!: () => void;
    const startBattlePromise = new Promise<void>((resolve) => {
      resolveStartBattle = resolve;
    });

    const startTurnTimer = vi.fn();
    const startBattle = vi.fn().mockReturnValue(startBattlePromise);

    const ctx = {
      battleState: {
        active: true,
        phase: 'sync',
        inviteId: 'match-1',
        isHost: true,
        opponentId: 'opp-1',
        opponentName: 'Rival',
        enemyTeam: [dummyPoke],
        myTeam: [dummyPoke]
      } as any,
      myTeamConfirmed: { value: true },
      enemyTeamConfirmed: { value: true },
      timerManager: { startTurnTimer } as any,
      battleStore: { startBattle } as any
    };

    executeCheckBothTeamsConfirmed(ctx);

    // Immediately after call, startBattle is invoked, but timer MUST NOT start yet
    expect(startBattle).toHaveBeenCalledTimes(1);
    expect(startTurnTimer).not.toHaveBeenCalled();

    // Once intro finishes and startBattle resolves:
    resolveStartBattle();
    await startBattlePromise;

    expect(startTurnTimer).toHaveBeenCalledTimes(1);
  });

  it('executeCheckBothTeamsConfirmed does NOT start timer if battle was aborted before intro finished', async () => {
    let resolveStartBattle!: () => void;
    const startBattlePromise = new Promise<void>((resolve) => {
      resolveStartBattle = resolve;
    });

    const startTurnTimer = vi.fn();
    const startBattle = vi.fn().mockReturnValue(startBattlePromise);

    const ctx = {
      battleState: {
        active: true,
        phase: 'sync',
        inviteId: 'match-1',
        isHost: true,
        opponentId: 'opp-1',
        opponentName: 'Rival',
        enemyTeam: [dummyPoke],
        myTeam: [dummyPoke]
      } as any,
      myTeamConfirmed: { value: true },
      enemyTeamConfirmed: { value: true },
      timerManager: { startTurnTimer } as any,
      battleStore: { startBattle } as any
    };

    executeCheckBothTeamsConfirmed(ctx);

    // Simulate match aborting during intro
    ctx.battleState.active = false;

    resolveStartBattle();
    await startBattlePromise;

    expect(startTurnTimer).not.toHaveBeenCalled();
  });

  it('executeHandleOpponentTeam starts timer only after startBattle resolves', async () => {
    let resolveStartBattle!: () => void;
    const startBattlePromise = new Promise<void>((resolve) => {
      resolveStartBattle = resolve;
    });

    const startTurnTimer = vi.fn();
    const startBattle = vi.fn().mockReturnValue(startBattlePromise);

    const battleState = {
      active: true,
      phase: 'sync',
      inviteId: 'match-2',
      isHost: false,
      isRanked: true,
      opponentId: 'opp-2',
      opponentName: 'Rival 2',
      enemyTeam: [],
      enemyHp: [],
      enemyActiveIdx: 0,
      myTeam: [dummyPoke],
      logs: []
    } as any;

    const ctx = {
      timerManager: { startTurnTimer } as any,
      battleStore: { startBattle } as any
    };

    executeHandleOpponentTeam({
      team: [dummyPoke],
      trainerName: 'Rival 2'
    }, battleState, ctx);

    // Timer must not start immediately
    expect(startBattle).toHaveBeenCalledTimes(1);
    expect(startTurnTimer).not.toHaveBeenCalled();

    resolveStartBattle();
    await startBattlePromise;

    expect(startTurnTimer).toHaveBeenCalledTimes(1);
  });

  it('executeStartPassiveBattle starts timer only after startBattle resolves', async () => {
    let resolveStartBattle!: () => void;
    const startBattlePromise = new Promise<void>((resolve) => {
      resolveStartBattle = resolve;
    });

    const startTurnTimer = vi.fn();
    const startBattle = vi.fn().mockReturnValue(startBattlePromise);

    const ctx = {
      battleState: {
        active: true,
        phase: 'sync',
        inviteId: 'passive-1',
        isHost: false,
        myTeam: [dummyPoke],
        myHp: [100],
        enemyTeam: [],
        enemyHp: [],
        logs: []
      } as any,
      timerManager: { startTurnTimer, resetStrikes: vi.fn() } as any,
      afkStrikes: { value: 0 },
      resolvePvpTeam: vi.fn().mockReturnValue([dummyPoke]),
      notify: vi.fn(),
      battleStore: { startBattle } as any
    };

    executeStartPassiveBattle(
      {
        opponentId: 'def-1',
        opponentName: 'Passive Rival',
        opponentElo: 1200,
        enemyTeam: [dummyPoke]
      },
      ctx
    );

    // Timer must not start synchronously
    expect(startBattle).toHaveBeenCalledTimes(1);
    expect(startTurnTimer).not.toHaveBeenCalled();

    resolveStartBattle();
    await startBattlePromise;

    expect(startTurnTimer).toHaveBeenCalledTimes(1);
  });
});
