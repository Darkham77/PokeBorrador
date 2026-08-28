import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { handleItemUsage } from '@/logic/battle/battleItems';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import { gameBus } from '@/logic/events/gameBus';
import type { BattleContext } from '@/types/battle/battleContext';
import { ref } from 'vue';

vi.mock('@/logic/battle/battleEngine.ts', () => ({
  calculateCatchRate: vi.fn(() => ({ caught: false, shakes: 2 }))
}));

describe('Capture Breakout and Failure Integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('triggers CATCH_BREAK, handleReleaseRequest, and playBallFadeOut when ball breakout occurs', async () => {
    const playerMon = makePokemon('pikachu', 20)!;
    playerMon.uid = 'player-pika-1';

    const wildMewtwo = makePokemon('mewtwo', 70)!;
    wildMewtwo.uid = 'wild-mewtwo-1';
    wildMewtwo.hp = wildMewtwo.maxHp;

    const fsmTransitions: string[] = [];
    const loggedMessages: string[] = [];
    let consumedItem: string | null = null;

    const mockFsm = {
      transition: vi.fn((state: string, sub: string) => {
        fsmTransitions.push(`${state}:${sub}`);
        return Promise.resolve();
      })
    };

    const releaseRequestSpy = vi.fn().mockResolvedValue(undefined);
    const shakeRequestSpy = vi.fn().mockResolvedValue(undefined);
    const ballFadeOutSpy = vi.fn().mockResolvedValue(undefined);
    const catchRequestSpy = vi.fn().mockResolvedValue(undefined);

    const mockCtx = {
      activeBattle: ref({
        player: playerMon,
        enemy: wildMewtwo,
        _initialEnemy: structuredClone(wildMewtwo),
        over: false,
        isTrainer: false
      }),
      animations: {
        handleCatchRequest: catchRequestSpy,
        handleShakeRequest: shakeRequestSpy,
        handleReleaseRequest: releaseRequestSpy,
        playBallFadeOut: ballFadeOutSpy
      },
      gs: {
        state: {
          stats: { captureAttempts: 0 }
        }
      }
    } as unknown as BattleContext;

    let breakEventDispatched = false;
    const onBreak = () => {
      breakEventDispatched = true;
    };
    gameBus.on('CATCH_BREAK', onBreak);

    const dummyOptions = {
      eventStore: { globalMultipliers: { catch: 1 } } as any,
      addLog: (msg: string) => {
        loggedMessages.push(msg);
      },
      audio: {} as any,
      consumeItem: (itemId: string) => {
        consumedItem = itemId;
      },
      fsm: mockFsm as any,
      ctx: mockCtx,
      itemId: 'pokeball' as const
    };

    const result = await handleItemUsage('pokeball', playerMon, wildMewtwo, dummyOptions);

    gameBus.off('CATCH_BREAK', onBreak);

    // 1. Pokeball was consumed
    expect(consumedItem).toBe('pokeball');

    // 2. FSM went through CATCH_PROCESS -> CATCH_SHAKE (x2) -> CATCH_BREAK -> FADEOUT_BALL
    expect(fsmTransitions).toContain('ACTIVE_BATTLE:CATCH_PROCESS');
    expect(fsmTransitions.filter(s => s === 'ACTIVE_BATTLE:CATCH_SHAKE').length).toBe(2);
    expect(fsmTransitions).toContain('ACTIVE_BATTLE:CATCH_BREAK');
    expect(fsmTransitions).toContain('ACTIVE_BATTLE:FADEOUT_BALL');

    // 3. Break event and release animations were triggered
    expect(breakEventDispatched).toBe(true);
    expect(releaseRequestSpy).toHaveBeenCalledWith({ side: 'enemy' });
    expect(ballFadeOutSpy).toHaveBeenCalledWith('enemy');

    // 4. Log indicates escape
    expect(loggedMessages).toContain('¡Oh, no! ¡El Pokémon se ha escapado!');

    // 5. Result returns enemy turn
    expect(result).toEqual({ action: 'enemy_turn' });
  });
});
