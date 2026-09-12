import { describe, it, expect, vi } from 'vitest';
import { executeCommitPick, executeHandleTurnTimeout } from '@/logic/pvp/livePvPTurnExecutionHandler';
import { PvPTimerManager } from '@/logic/pvp/pvpTimerHelper';
import type { PvPAction } from '@/types/battle/pvp';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('PvP AFK 2-Strike Lifecycle & Manual Reset', () => {
  it('preserves strikes when autoPick is committed on timeout (isManual: false)', async () => {
    const timerManager = new PvPTimerManager();
    timerManager.state.afkStrikes = 1;
    const afkStrikes = { value: 1 };
    const battleState = { phase: 'choosing', myPick: null as PvPAction | null, config: {} } as any;
    const resolveTurn = vi.fn().mockResolvedValue(undefined);

    const autoPick: PvPAction = { type: 'move', moveIndex: 0, choiceString: 'move 1' };

    // When committing an auto pick (isManual = false), strikes MUST NOT be reset
    await executeCommitPick(autoPick, {
      battleState,
      timerManager,
      afkStrikes,
      battleStore: {} as any,
      resolveTurn
    }, false);

    expect(timerManager.state.afkStrikes).toBe(1);
    expect(afkStrikes.value).toBe(1);
    expect(battleState.myPick).toEqual(autoPick);
    timerManager.destroy();
  });

  it('resets strikes when player commits a manual action (isManual: true / default)', async () => {
    const timerManager = new PvPTimerManager();
    timerManager.state.afkStrikes = 1;
    const afkStrikes = { value: 1 };
    const battleState = { phase: 'choosing', myPick: null as PvPAction | null, config: {} } as any;
    const resolveTurn = vi.fn().mockResolvedValue(undefined);

    const manualPick: PvPAction = { type: 'move', moveIndex: 1, choiceString: 'move 2' };

    // When committing a manual pick (default isManual = true), strikes MUST be reset
    await executeCommitPick(manualPick, {
      battleState,
      timerManager,
      afkStrikes,
      battleStore: {} as any,
      resolveTurn
    });

    expect(timerManager.state.afkStrikes).toBe(0);
    expect(afkStrikes.value).toBe(0);
    expect(battleState.myPick).toEqual(manualPick);
    timerManager.destroy();
  });

  it('executeHandleTurnTimeout calls commitPick with isManual = false on Strike 1', () => {
    const commitPick = vi.fn();
    const forfeit = vi.fn();
    const notify = vi.fn();

    const dummyPoke = {
      id: 'pikachu',
      uid: 'poke-1',
      hp: 100,
      maxHp: 100,
      moves: [{ id: 'thunderbolt', name: 'Thunderbolt', pp: 15, maxPp: 15 }]
    } as unknown as Pokemon;

    executeHandleTurnTimeout(false, {
      uiStore: { notify } as any,
      forfeit,
      battleStore: { state: { playerRequest: { active: [{ moves: [{ id: 'thunderbolt' }] }] } } } as any,
      battleState: { myTeam: [dummyPoke] },
      commitPick
    });

    expect(forfeit).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(expect.stringContaining('Strike 1/2'), '⏱️');
    expect(commitPick).toHaveBeenCalledTimes(1);
    // Crucial: 2nd argument must be false (isManual = false)
    expect(commitPick).toHaveBeenCalledWith(expect.objectContaining({ type: 'move' }), false);
  });

  it('triggers automatic forfeit on Strike 2 consecutive timeout', () => {
    const commitPick = vi.fn();
    const forfeit = vi.fn();
    const notify = vi.fn();

    executeHandleTurnTimeout(true, {
      uiStore: { notify } as any,
      forfeit,
      battleStore: {} as any,
      battleState: { myTeam: [] },
      commitPick
    });

    expect(forfeit).toHaveBeenCalledTimes(1);
    expect(commitPick).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(expect.stringContaining('2 strikes AFK'), '⚠️');
  });

  it('full integrated flow: Turn 1 AFK -> Strike 1 (not reset) -> Turn 2 AFK -> Forfeit', () => {
    let timeoutStrikes = 0;
    let timeoutForfeit = false;
    const forfeit = vi.fn();
    const notify = vi.fn();
    const resolveTurn = vi.fn().mockResolvedValue(undefined);

    const afkStrikes = { value: 0 };
    const battleState = { phase: 'choosing', myPick: null as PvPAction | null, config: {} } as any;

    const dummyPoke = {
      id: 'pikachu',
      uid: 'poke-1',
      hp: 100,
      maxHp: 100,
      moves: [{ id: 'thunderbolt', name: 'Thunderbolt', pp: 15, maxPp: 15 }]
    } as unknown as Pokemon;

    const timerManager = new PvPTimerManager({
      onTurnTimeout: (strikes, isForfeit) => {
        timeoutStrikes = strikes;
        timeoutForfeit = isForfeit;
        afkStrikes.value = strikes;
        executeHandleTurnTimeout(isForfeit, {
          uiStore: { notify } as any,
          forfeit,
          battleStore: { state: { playerRequest: { active: [{ moves: [{ id: 'thunderbolt' }] }] } } } as any,
          battleState: { myTeam: [dummyPoke] },
          commitPick: (pick: PvPAction, isManual = true) => {
            void executeCommitPick(pick, {
              battleState,
              timerManager,
              afkStrikes,
              battleStore: {} as any,
              resolveTurn
            }, isManual);
          }
        });
      }
    });

    // 1. Turn 1 timeout occurs
    timerManager.handleTurnTimeout();
    expect(timeoutStrikes).toBe(1);
    expect(timeoutForfeit).toBe(false);
    expect(afkStrikes.value).toBe(1);
    expect(timerManager.state.afkStrikes).toBe(1);
    expect(forfeit).not.toHaveBeenCalled();

    // 2. Next turn begins (phase reset to choosing)
    battleState.phase = 'choosing';

    // 3. Turn 2 timeout occurs without manual action
    timerManager.handleTurnTimeout();
    expect(timeoutStrikes).toBe(2);
    expect(timeoutForfeit).toBe(true);
    expect(afkStrikes.value).toBe(2);
    expect(timerManager.state.afkStrikes).toBe(2);
    expect(forfeit).toHaveBeenCalledTimes(1);

    timerManager.destroy();
  });
});
