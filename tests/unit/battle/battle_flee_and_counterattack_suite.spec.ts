import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import { calculateEscapeChancePure } from '@/logic/battle/battleCatchMath';
import { calculateEscapeChance } from '@/logic/battle/battleFormulas';
import { executeFlee } from '@/logic/battle/battleFlee';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import { gameBus } from '@/logic/events/gameBus';
import { useBattleStore } from '@/stores/battle/battle';
import { restoreBattleState } from '@/logic/battle/orchestratorRestoreHelper';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleContext } from '@/types/battle/battleContext';
import type { BattleState, BattleStages } from '@/types/battle/battle';

vi.mock('@/logic/battle/showdownWorkerClient.ts', () => ({
  showdownWorker: {},
  getShowdownWorker: vi.fn(() => ({})),
  executeTurnInWorker: vi.fn().mockResolvedValue({
    logs: ['|move|p2a: Caterpie|Tackle|p1a: Pikachu', '|-damage|p1a: Pikachu|80/100'],
    isOver: false,
    winner: null
  }),
  isPlayerTrappedInWorker: vi.fn().mockResolvedValue(false),
  syncTeamsFromLastWorkerState: vi.fn().mockResolvedValue(undefined),
  testResetShowdownWorker: vi.fn().mockResolvedValue(undefined)
}));

describe('Battle Flee, Escapes & Counter-Attack Domain Suite', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('Flee Probability & Escape Formula Mechanics', () => {
    it('guarantees escape if player speed is greater than or equal to wild enemy speed', () => {
      const playerPoke: Partial<Pokemon> = {
        id: 'charmander',
        name: 'Charmander',
        level: 10,
        spe: 25,
        type: 'fire'
      };
      const enemyPoke: Partial<Pokemon> = {
        id: 'rattata',
        name: 'Rattata',
        level: 5,
        spe: 15,
        type: 'normal'
      };

      const canEscape = calculateEscapeChance(
        playerPoke as Pokemon,
        enemyPoke as Pokemon,
        0,
        {}
      );

      expect(canEscape).toBe(true);
    });

    it('guarantees escape if player has runaway ability or smokeball or is ghost type', () => {
      const ghostPoke: Partial<Pokemon> = {
        id: 'gastly',
        name: 'Gastly',
        level: 5,
        spe: 10,
        type: 'ghost'
      };
      const fastEnemy: Partial<Pokemon> = {
        id: 'electrode',
        name: 'Electrode',
        level: 50,
        spe: 150,
        type: 'electric'
      };

      const canEscapeGhost = calculateEscapeChance(
        ghostPoke as Pokemon,
        fastEnemy as Pokemon,
        0,
        {}
      );

      expect(canEscapeGhost).toBe(true);
    });

    it('calculates probability and increases chance with escape attempts when player is slower', () => {
      const slowPlayer = { spe: 10, type: 'normal' };
      const fastEnemy = { spe: 100, type: 'normal' };

      const guaranteedWithAttempts = calculateEscapeChancePure(
        slowPlayer as any,
        fastEnemy as any,
        10,
        null
      );

      expect(guaranteedWithAttempts).toBe(true);
    });

    it('prevents escape when trapped by Shadow Tag, Arena Trap, or Magnet Pull unless immune', () => {
      const groundedPlayer = { spe: 50, type: 'normal' };
      const arenaTrapEnemy = { spe: 20, type: 'ground', ability: 'arenatrap' };

      expect(calculateEscapeChancePure(groundedPlayer as any, arenaTrapEnemy as any, 0, null)).toBe(false);

      const flyingPlayer = { spe: 50, type: 'flying' };
      expect(calculateEscapeChancePure(flyingPlayer as any, arenaTrapEnemy as any, 0, null)).toBe(true);
    });
  });

  describe('Failed Flee Counter-Attack Integration', () => {
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

      expect(loggedMessages).toContain('¡No pudiste escapar!');
      expect(cryEvents.some((c) => c.name === 'caterpie')).toBe(true);

      expect(fsmTransitions).toContain('ACTIVE_BATTLE:BUILD_QUEUE');
      expect(fsmTransitions).toContain('ACTIVE_BATTLE:POP_ACTION');
      expect(fsmTransitions).toContain('ACTIVE_BATTLE:APPLY_MOVE');
      expect(fsmTransitions).toContain('ACTIVE_BATTLE:EVAL_HP');

      expect(fsmTransitions).toContain('ACTIVE_BATTLE:WAIT_INPUT');
      expect(activeBattleRef.value?.escapeAttempts).toBe(1);
      expect(ctx.isProcessing.value).toBe(false);
    });

    it('rejects flee early when player is locked into a move (e.g. twoturnmove / lockedmove)', async () => {
      const lockedPlayer = makePokemon('mew', 50)!;
      lockedPlayer.uid = 'p1-mew';
      lockedPlayer.volatileCounters = { twoturnmove: 1 };

      const enemy = makePokemon('caterpie', 5)!;
      enemy.uid = 'wild-caterpie-1';

      const loggedMessages: string[] = [];
      const openConfirmMock = vi.fn();

      const ctx = {
        isProcessing: ref(false),
        activeBattle: ref({
          player: lockedPlayer,
          enemy,
          cannotEscape: false,
          isTrainer: false,
          isGym: false
        }),
        addLog: (msg: string) => loggedMessages.push(msg),
        uiStore: {
          openConfirm: openConfirmMock
        }
      } as unknown as BattleContext;

      await executeFlee(ctx);

      expect(openConfirmMock).not.toHaveBeenCalled();
      expect(loggedMessages).toContain('¡No puedes huir mientras estás ejecutando un movimiento bloqueado o atrapado!');
    });
  });

  describe('Flee Animation Parity (Player Recall vs Wild Enemy Flee)', () => {
    it('player successful flee executes POKEMON_RECALL (Pokéball) and triggers parallel wild enemy flee animation', async () => {
      const p1 = makePokemon('pidgeot', 31)!;
      p1.uid = 'player-pidgeot-1';
      p1.hp = 92;
      p1.maxHp = 92;

      const e1 = makePokemon('caterpie', 4)!;
      e1.uid = 'wild-caterpie-1';
      e1.hp = 18;
      e1.maxHp = 18;

      const fsmTransitions: string[] = [];
      const busEvents: Array<{ side: string; type?: string }> = [];

      const handleWithdrawSpy = vi.fn().mockResolvedValue(undefined);
      const escapeListener = (e: Event) => {
        const data = (e as CustomEvent).detail as { side: string; type?: string };
        busEvents.push(data);
      };
      gameBus.on('PLAY_ESCAPE_ANIM', escapeListener);

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
        player: p1,
        enemy: e1,
        turnCount: 1,
        over: false,
        fled: false,
        playerFled: false,
        cannotEscape: false,
        isTrainer: false,
        isGym: false,
        escapeAttempts: 0
      } as unknown as BattleState);

      const endBattleSpy = vi.fn().mockResolvedValue(undefined);

      let confirmHandler: (() => Promise<void>) | null = null;
      const ctx = {
        fsm,
        activeBattle: activeBattleRef,
        playerStages: ref({ spe: 0 } as unknown as BattleStages),
        enemyStages: ref({ spe: 0 } as unknown as BattleStages),
        isProcessing: ref(false),
        uiStore: {
          openConfirm: (opts: { onConfirm: () => Promise<void> }) => {
            confirmHandler = opts.onConfirm;
          }
        },
        animations: {
          handleWithdrawRequest: handleWithdrawSpy
        },
        addLog: vi.fn(),
        endBattle: endBattleSpy,
        BATTLE_STATES: {
          ACTIVE_BATTLE: 'ACTIVE_BATTLE'
        },
        BATTLE_SUBSTATES: {
          ESCAPE_PROCESS: 'ESCAPE_PROCESS',
          POKEMON_RECALL: 'POKEMON_RECALL',
          VACATE_SEAT: 'VACATE_SEAT'
        }
      } as unknown as BattleContext;

      await executeFlee(ctx);
      expect(confirmHandler).toBeDefined();
      await confirmHandler!();

      gameBus.off('PLAY_ESCAPE_ANIM', escapeListener);

      expect(fsmTransitions).toContain('ACTIVE_BATTLE:POKEMON_RECALL');
      expect(fsmTransitions).toContain('ACTIVE_BATTLE:VACATE_SEAT');

      expect(handleWithdrawSpy).toHaveBeenCalledWith({ side: 'player', pokemon: p1 });
      expect(busEvents.some(e => e.side === 'enemy' && e.type === 'flee')).toBe(true);
      expect(busEvents.some(e => e.side === 'player' && e.type === 'flee')).toBe(false);

      expect(activeBattleRef.value?.playerFled).toBe(true);
      expect(endBattleSpy).toHaveBeenCalledWith(false, true);
    });

    it('teleport escape maintains teleport type in animation events', () => {
      const busEvents: Array<{ side: string; type?: string }> = [];
      const escapeListener = (e: Event) => {
        const data = (e as CustomEvent).detail;
        busEvents.push(data);
      };
      gameBus.on('TRIGGER_COMBATANT_ESCAPE', escapeListener);

      gameBus.emit('TRIGGER_COMBATANT_ESCAPE', { side: 'enemy', type: 'teleport' });

      gameBus.off('TRIGGER_COMBATANT_ESCAPE', escapeListener);

      expect(busEvents.some(e => e.side === 'enemy' && e.type === 'teleport')).toBe(true);
    });
  });

  describe('Flee Button Persistence & UI State', () => {
    it('restores cannotEscape as false for wild battles on F5 reload even if stale cannotEscape was saved', async () => {
      const battleStore = useBattleStore();

      const mockPlayer = { uid: 'p1', id: 'gengar', hp: 34, maxHp: 162, moves: [] } as unknown as Pokemon;
      const mockEnemy = { uid: 'pidgeotto-1', id: 'pidgeotto', hp: 15, maxHp: 15, moves: [] } as unknown as Pokemon;

      const staleSavedData = {
        locationId: 'route1',
        wasSearching: true,
        isTrainer: false,
        isGym: false,
        isPvP: false,
        isGuardian: false,
        cannotEscape: true,
        enemy: mockEnemy,
        player: mockPlayer,
        playerTeam: [mockPlayer],
        enemyTeam: [mockEnemy]
      };

      const mockCtx: Partial<BattleContext> = {
        activeBattle: { value: null } as any,
        isProcessing: { value: false } as any,
        fsm: {
          transition: vi.fn().mockResolvedValue(undefined),
          currentSubState: { value: 'WAIT_INPUT' }
        } as any,
        BATTLE_STATES: { EXIT_BATTLE: 'EXIT_BATTLE', ACTIVE_BATTLE: 'ACTIVE_BATTLE' } as any,
        BATTLE_SUBSTATES: { WAIT_INPUT: 'WAIT_INPUT', FIRST_INTRO: 'FIRST_INTRO' } as any,
        gs: {
          state: { team: [mockPlayer], activeBattle: null },
          registerPokedex: vi.fn(),
          save: vi.fn()
        } as any,
        addLog: vi.fn(),
        playerStages: { value: {} } as any,
        enemyStages: { value: {} } as any,
        battleLogs: { value: [] } as any,
        isIntroAnimating: { value: false } as any,
        attackerSide: { value: null } as any,
        activeMove: { value: null } as any,
        persistBattle: vi.fn()
      };

      await restoreBattleState(mockCtx as BattleContext, staleSavedData);

      expect(mockCtx.activeBattle?.value).toBeDefined();
      expect(mockCtx.activeBattle?.value?.cannotEscape).toBe(false);

      battleStore.state = mockCtx.activeBattle!.value;
      expect(battleStore.uiConfig.allowFlee).toBe(true);
      expect(battleStore.uiConfig.allowCatch).toBe(true);
    });

    it('restores cannotEscape as false for ongoing wild combat with turnCount > 0', async () => {
      const battleStore = useBattleStore();

      const mockPlayer = { uid: 'p1', id: 'gengar', hp: 34, maxHp: 162, moves: [] } as unknown as Pokemon;
      const mockEnemy = { uid: 'pidgeotto-1', id: 'pidgeotto', hp: 15, maxHp: 15, moves: [] } as unknown as Pokemon;

      const staleSavedData = {
        locationId: 'route1',
        wasSearching: true,
        turnCount: 2,
        battleHistory: [{ turn: 1, action: 'attack' }],
        isTrainer: false,
        isGym: false,
        isPvP: false,
        isGuardian: false,
        cannotEscape: true,
        enemy: mockEnemy,
        player: mockPlayer,
        playerTeam: [mockPlayer],
        enemyTeam: [mockEnemy]
      };

      const mockCtx: Partial<BattleContext> = {
        activeBattle: { value: null } as any,
        isProcessing: { value: false } as any,
        fsm: {
          transition: vi.fn().mockResolvedValue(undefined),
          currentSubState: { value: 'WAIT_INPUT' }
        } as any,
        BATTLE_STATES: { EXIT_BATTLE: 'EXIT_BATTLE', ACTIVE_BATTLE: 'ACTIVE_BATTLE' } as any,
        BATTLE_SUBSTATES: { WAIT_INPUT: 'WAIT_INPUT', FIRST_INTRO: 'FIRST_INTRO' } as any,
        gs: {
          state: { team: [mockPlayer], activeBattle: null },
          registerPokedex: vi.fn(),
          save: vi.fn()
        } as any,
        addLog: vi.fn(),
        playerStages: { value: {} } as any,
        enemyStages: { value: {} } as any,
        battleLogs: { value: [] } as any,
        isIntroAnimating: { value: false } as any,
        attackerSide: { value: null } as any,
        activeMove: { value: null } as any,
        persistBattle: vi.fn()
      };

      await restoreBattleState(mockCtx as BattleContext, staleSavedData);

      expect(mockCtx.activeBattle?.value).toBeDefined();
      expect(mockCtx.activeBattle?.value?.cannotEscape).toBe(false);

      battleStore.state = mockCtx.activeBattle!.value;
      expect(battleStore.uiConfig.allowFlee).toBe(true);
    });

    it('keeps allowFlee as false strictly for trainer, gym, and pvp battles', () => {
      const battleStore = useBattleStore();

      battleStore.state = { isTrainer: false, isGym: false, isPvP: false, isGuardian: false } as any;
      expect(battleStore.uiConfig.allowFlee).toBe(true);

      battleStore.state = { isTrainer: true, isGym: false, isPvP: false } as any;
      expect(battleStore.uiConfig.allowFlee).toBe(false);

      battleStore.state = { isTrainer: false, isGym: true, isPvP: false } as any;
      expect(battleStore.uiConfig.allowFlee).toBe(false);

      battleStore.state = { isTrainer: false, isGym: false, isPvP: true } as any;
      expect(battleStore.uiConfig.allowFlee).toBe(false);

      battleStore.state = { isTrainer: false, isGym: false, isPvP: false, isGuardian: true } as any;
      expect(battleStore.uiConfig.allowFlee).toBe(false);
    });
  });
});
