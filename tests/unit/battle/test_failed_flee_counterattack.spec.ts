import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { executeFlee } from '@/logic/battle/battleFlee';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import { gameBus } from '@/logic/events/gameBus';
import type { BattleContext } from '@/types/battle/battleContext';
import type { BattleState, BattleStages } from '@/types/battle/battle';
import { ref } from 'vue';

vi.mock('@/logic/battle/showdownWorkerClient.ts', () => ({
  showdownWorker: {},
  executeTurnInWorker: vi.fn().mockResolvedValue({
    logs: ['|move|p2a: Caterpie|Tackle|p1a: Pikachu', '|-damage|p1a: Pikachu|80/100'],
    isOver: false,
    winner: null
  }),
  isPlayerTrappedInWorker: vi.fn().mockResolvedValue(false),
  syncTeamsFromLastWorkerState: vi.fn().mockResolvedValue(undefined),
  testResetShowdownWorker: vi.fn().mockResolvedValue(undefined)
}));

describe('Failed Flee Counter-Attack Integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('executes enemy counter-attack and returns to WAIT_INPUT when flee fails and player survives', async () => {
    const slowPlayer = makePokemon('pikachu', 5)!;
    slowPlayer.uid = 'player-pika-1';
    slowPlayer.hp = 100;
    slowPlayer.maxHp = 100;

    const fastEnemy = makePokemon('caterpie', 50)!;
    fastEnemy.uid = 'wild-caterpie-1';
    fastEnemy.hp = 200;
    fastEnemy.maxHp = 200;

    const fsmTransitions: string[] = [];
    const loggedMessages: string[] = [];
    const cryEvents: Array<{ name: string }> = [];

    const onCry = (e: Event) => {
      cryEvents.push((e as CustomEvent).detail);
    };
    gameBus.on('PLAY_CRY', onCry);

    const fsm = {
      currentState: ref('ACTIVE_BATTLE'),
      currentSubState: ref<string | null>('WAIT_INPUT'),
      transition: vi.fn().mockImplementation((state: string, subState: string | null = null) => {
        fsm.currentState.value = state;
        fsm.currentSubState.value = subState;
        fsmTransitions.push(`${state}:${subState}`);
        return Promise.resolve();
      })
    };

    const activeBattleRef = ref<BattleState | null>({
      player: slowPlayer,
      enemy: fastEnemy,
      turnCount: 1,
      over: false,
      fled: false,
      playerFled: false,
      cannotEscape: false,
      isTrainer: false,
      isGym: false,
      escapeAttempts: 0
    } as unknown as BattleState);

    let confirmHandler: (() => Promise<void>) | null = null;
    const ctx = {
      fsm,
      activeBattle: activeBattleRef,
      playerStages: ref({ spe: -6 } as unknown as BattleStages),
      enemyStages: ref({ spe: 6 } as unknown as BattleStages),
      isProcessing: ref(false),
      uiStore: {
        openConfirm: (opts: { onConfirm: () => Promise<void> }) => {
          confirmHandler = opts.onConfirm;
        }
      },
      animations: {
        handleWithdrawRequest: vi.fn(),
        awaitTween: vi.fn()
      },
      addLog: (msg: string) => {
        loggedMessages.push(msg);
      },
      endBattle: vi.fn(),
      handleFaint: vi.fn(),
      BATTLE_STATES: {
        ACTIVE_BATTLE: 'ACTIVE_BATTLE'
      },
      BATTLE_SUBSTATES: {
        ESCAPE_PROCESS: 'ESCAPE_PROCESS',
        POKEMON_RECALL: 'POKEMON_RECALL',
        VACATE_SEAT: 'VACATE_SEAT',
        BUILD_QUEUE: 'BUILD_QUEUE',
        POP_ACTION: 'POP_ACTION',
        APPLY_MOVE: 'APPLY_MOVE',
        EVAL_HP: 'EVAL_HP',
        PLAYER_FAINT_SEQ: 'PLAYER_FAINT_SEQ',
        WAIT_INPUT: 'WAIT_INPUT'
      }
    } as unknown as BattleContext;

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    await executeFlee(ctx);
    expect(confirmHandler).toBeDefined();
    await confirmHandler!();
    randomSpy.mockRestore();

    gameBus.off('PLAY_CRY', onCry);

    // 1. Log outputs failed escape message
    expect(loggedMessages).toContain('¡No pudiste escapar!');

    // 2. Enemy cry is played
    expect(cryEvents.some((c) => c.name === 'caterpie')).toBe(true);

    // 3. FSM advances through counter-attack cycle
    expect(fsmTransitions).toContain('ACTIVE_BATTLE:BUILD_QUEUE');
    expect(fsmTransitions).toContain('ACTIVE_BATTLE:POP_ACTION');
    expect(fsmTransitions).toContain('ACTIVE_BATTLE:APPLY_MOVE');
    expect(fsmTransitions).toContain('ACTIVE_BATTLE:EVAL_HP');

    // 4. Since player has HP > 0, FSM returns to WAIT_INPUT
    expect(fsmTransitions).toContain('ACTIVE_BATTLE:WAIT_INPUT');
    expect(activeBattleRef.value?.escapeAttempts).toBe(1);
    expect(ctx.isProcessing.value).toBe(false);
  });
});
