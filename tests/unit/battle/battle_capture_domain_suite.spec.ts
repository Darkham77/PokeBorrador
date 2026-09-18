import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import { cleanCapturedPokemonForStorage } from '@/logic/battle/battleCatchProcessor';
import { makePokemon, validatePokemon } from '@/logic/pokemon/pokemonFactory';
import { calculateCatchRatePure } from '@/logic/battle/battleCatchMath';
import { handleItemUsage } from '@/logic/battle/battleItems';
import { useBattleCaptureAnimations } from '@/composables/battle/useBattleCaptureAnimations';
import { useGameStore } from '@/stores/game';
import { validateAndSanitize } from '@/logic/auth/saveSanitizer';
import { gameBus } from '@/logic/events/gameBus';
import {
  BUG_SYNERGY_BONUS_PER_BUG,
  BUG_SYNERGY_MAX_BONUS,
  TRAINER_IV_PENALTY_RATE
} from '@/logic/constants/gameplay';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleContext } from '@/types/battle/battleContext';
import type { PurePokemon } from '@/logic/battle/battleMathTypes';

const mockCalculateCatchRate = vi.fn((_mon: unknown, ballType: string = 'pokeball') => {
  if (ballType === 'masterball') {
    return { caught: true, shakes: 3, isCritical: false };
  }
  return { caught: false, shakes: 2, isCritical: false };
});

vi.mock('@/logic/battle/battleEngine.ts', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    calculateCatchRate: (...args: unknown[]) => (mockCalculateCatchRate as any)(...args)
  };
});

vi.mock('@/logic/utils/gsapHelpers', () => {
  const tl = {
    to: (_target: unknown, toVars?: Record<string, unknown>) => {
      if (toVars && typeof toVars.onStart === 'function') toVars.onStart();
      if (toVars && typeof toVars.onComplete === 'function') toVars.onComplete();
      return tl;
    },
    fromTo: (_target: unknown, _from: unknown, toVars?: Record<string, unknown>) => {
      if (toVars && typeof toVars.onStart === 'function') toVars.onStart();
      if (toVars && typeof toVars.onComplete === 'function') toVars.onComplete();
      return tl;
    },
    add: (fn: unknown) => {
      if (typeof fn === 'function') fn();
      return tl;
    },
    addLabel: () => tl,
    set: () => tl,
    eventCallback: (_ev: string, cb?: () => void) => {
      if (cb) cb();
      return tl;
    },
    progress: () => tl,
    seek: () => tl,
    play: () => tl,
    pause: () => tl,
    kill: () => tl
  };
  return {
    createTimeline: () => tl,
    awaitAnimation: () => Promise.resolve(),
    gsapSleep: () => Promise.resolve(),
    killTweens: () => {}
  };
});

vi.mock('gsap', () => {
  const delayedCall = vi.fn((_delay, callback) => {
    if (callback) callback();
    return {
      kill: () => {},
      then: (cb?: () => void) => { if (cb) cb(); },
    };
  });
  const gsapObj = {
    delayedCall,
  };
  return {
    default: gsapObj,
    gsap: gsapObj,
  };
});

describe('Battle Capture Domain Suite', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('Battle Catch Processor & Storage Cleansing', () => {
    it('cleans volatile flags and initializes capture metadata on caught pokemon', () => {
      const rawEnemy = makePokemon('rattata', 10, { bypassWhitelist: true }) as Pokemon;
      rawEnemy.hp = 15;
      rawEnemy.status = 'psn';
      rawEnemy.volatileCounters = { confusion: 2 };
      rawEnemy.furyCutterCount = 3;

      const cleaned = cleanCapturedPokemonForStorage(rawEnemy, null, 'pokeball');

      expect(cleaned.caught).toBe(true);
      expect(cleaned.obtainedMethod).toBe('wild');
      expect(cleaned.volatileCounters).toEqual({});
      expect(cleaned.furyCutterCount).toBe(0);
      expect(cleaned.tags).toContain('ball:pokeball');
      expect(cleaned.status).toBe('psn');
    });

    it('reverts Castform to normal form on capture', () => {
      const castformEnemy = makePokemon('castform', 25, { bypassWhitelist: true }) as Pokemon;
      castformEnemy.form = 'sunny';
      castformEnemy.type = 'fire';

      const cleaned = cleanCapturedPokemonForStorage(castformEnemy, null, 'ultraball');

      expect(cleaned.form).toBe('normal');
      expect(cleaned.type).toBe('normal');
      expect(cleaned.tags).toContain('ball:ultraball');
    });

    it('correctly uses initialEnemy snapshot from _initialEnemies in 2v2 wild battles', () => {
      const enemy1 = makePokemon('rattata', 10, { bypassWhitelist: true }) as Pokemon;
      const enemy2 = makePokemon('pidgey', 12, { bypassWhitelist: true }) as Pokemon;
      enemy1.uid = 'wild-seat-2';
      enemy2.uid = 'wild-seat-4';

      const initialEnemy1 = structuredClone(enemy1);
      const initialEnemy2 = structuredClone(enemy2);

      const activeEnemy2 = structuredClone(enemy2);
      activeEnemy2.hp = Math.round(activeEnemy2.maxHp * 0.5);
      activeEnemy2.volatileCounters = { confusion: 1 };

      const battleState = {
        _initialEnemy: initialEnemy1,
        _initialEnemies: {
          [enemy1.uid]: initialEnemy1,
          [enemy2.uid]: initialEnemy2
        }
      };

      const resolvedInitial = (activeEnemy2.uid && battleState._initialEnemies?.[activeEnemy2.uid]) || battleState._initialEnemy;
      expect(resolvedInitial.id).toBe('pidgey');
      expect(resolvedInitial.uid).toBe('wild-seat-4');

      const cleaned = cleanCapturedPokemonForStorage(activeEnemy2, resolvedInitial, 'greatball');
      expect(cleaned.id).toBe('pidgey');
      expect(cleaned.hp).toBe(activeEnemy2.hp);
      expect(cleaned.volatileCounters).toEqual({});
      expect(cleaned.caught).toBe(true);
    });
  });

  describe('Class Catch Modifiers (Cazabichos & Entrenador)', () => {
    const baseTarget: PurePokemon = {
      id: 'caterpie',
      level: 5,
      hp: 20,
      maxHp: 20,
      type: 'bug',
      catchRate: 100
    };

    it('applies +5% per bug Pokémon in team', () => {
      const activeTeam = [
        { type1: 'bug', type2: null },
        { type1: 'bug', type2: 'flying' }
      ];

      const res = calculateCatchRatePure(baseTarget, 'pokeball', 1, {
        playerClass: 'cazabichos',
        activeTeam
      });

      expect(res.bugSynergyBonus).toBe(2 * BUG_SYNERGY_BONUS_PER_BUG);
      expect(res.bugSynergyBonus).toBe(0.10);
    });

    it('caps bug synergy bonus at +30% maximum', () => {
      const activeTeam = [
        { type1: 'bug', type2: null },
        { type1: 'bug', type2: null },
        { type1: 'bug', type2: null },
        { type1: 'bug', type2: null },
        { type1: 'bug', type2: null },
        { type1: 'bug', type2: null },
        { type1: 'bug', type2: null }
      ];

      const res = calculateCatchRatePure(baseTarget, 'pokeball', 1, {
        playerClass: 'cazabichos',
        activeTeam
      });

      expect(res.bugSynergyBonus).toBe(BUG_SYNERGY_MAX_BONUS);
      expect(res.bugSynergyBonus).toBe(0.30);
    });

    it('gives 0 bonus if team has no bug Pokémon', () => {
      const activeTeam = [
        { type1: 'fire', type2: null },
        { type1: 'water', type2: null }
      ];

      const res = calculateCatchRatePure(baseTarget, 'pokeball', 1, {
        playerClass: 'cazabichos',
        activeTeam
      });

      expect(res.bugSynergyBonus).toBe(0);
    });

    it('applies -10% catch rate penalty when target IV total > 120 for entrenador', () => {
      const res = calculateCatchRatePure(baseTarget, 'pokeball', 1, {
        playerClass: 'entrenador',
        ivTotal: 130
      });

      expect(res.trainerIvPenaltyApplied).toBe(true);
      expect(TRAINER_IV_PENALTY_RATE).toBe(0.10);
    });

    it('does not apply penalty when target IV total <= 120', () => {
      const res = calculateCatchRatePure(baseTarget, 'pokeball', 1, {
        playerClass: 'entrenador',
        ivTotal: 120
      });

      expect(res.trainerIvPenaltyApplied).toBe(false);
    });

    it('does not apply penalty for non-entrenador classes even with IV > 120', () => {
      const res = calculateCatchRatePure(baseTarget, 'pokeball', 1, {
        playerClass: 'rocket',
        ivTotal: 150
      });

      expect(res.trainerIvPenaltyApplied).toBe(false);
    });
  });

  describe('Capture Breakout & Failure Integration', () => {
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

      expect(consumedItem).toBe('pokeball');
      expect(fsmTransitions).toContain('ACTIVE_BATTLE:CATCH_PROCESS');
      expect(fsmTransitions.filter(s => s === 'ACTIVE_BATTLE:CATCH_SHAKE').length).toBe(2);
      expect(fsmTransitions).toContain('ACTIVE_BATTLE:CATCH_BREAK');
      expect(fsmTransitions).toContain('ACTIVE_BATTLE:FADEOUT_BALL');

      expect(breakEventDispatched).toBe(true);
      expect(releaseRequestSpy).toHaveBeenCalledWith({ side: 'enemy' });
      expect(ballFadeOutSpy).toHaveBeenCalledWith('enemy');
      expect(loggedMessages).toContain('¡Oh, no! ¡El Pokémon se ha escapado!');
      expect(result).toEqual({ action: 'enemy_turn' });
    });
  });

  describe('Battle Capture Save Integrity', () => {
    it('captures a wild enemy Pokemon and verifies that it passes validatePokemon and validateAndSanitize cleanly', async () => {
      const gameStore = useGameStore();
      gameStore.state.trainer = 'Ash';
      gameStore.state.starterChosen = true;

      const playerMon = makePokemon('charmander', 10);
      const wildMon = makePokemon('rattata', 3);

      expect(playerMon).not.toBeNull();
      expect(wildMon).not.toBeNull();

      gameStore.state.team = [playerMon as Pokemon];
      gameStore.state.box = [];

      const mockCtx = {
        activeBattle: ref({
          player: playerMon,
          enemy: wildMon,
          _initialEnemy: structuredClone(wildMon),
          over: false,
          isTrainer: false,
        }),
        animations: {},
      } as unknown as BattleContext;

      const dummyOptions = {
        eventStore: {} as never,
        addLog: () => {},
        audio: {} as never,
        consumeItem: () => {},
        ctx: mockCtx,
        itemId: 'masterball' as const,
      };

      const res = await handleItemUsage('masterball', playerMon as Pokemon, wildMon as Pokemon, dummyOptions);

      expect(res).toBeDefined();
      expect(res.action).toBe('capture');
      expect(res.pokemon).toBeDefined();

      const captured = res.pokemon as Pokemon;
      expect(captured.id).toBe('rattata');
      expect(captured.caught).toBe(true);

      expect(captured.lastMove).toBeUndefined();
      expect(captured.choiceMove).toBeUndefined();
      expect(captured.chargingMove).toBeUndefined();

      expect(() => validatePokemon(captured)).not.toThrow();

      gameStore.addPokemon(captured, { notify: false });

      const sanitizeResult = validateAndSanitize(gameStore.state);
      expect(sanitizeResult.valid).toBe(true);
    });

    it('captures a restored enemy Pokemon that was missing vigor and generates valid breeding vigor without crashing validatePokemon', async () => {
      const gameStore = useGameStore();
      gameStore.state.trainer = 'Ash';
      gameStore.state.starterChosen = true;

      const playerMon = makePokemon('charmander', 10)!;
      const wildMon = makePokemon('rattata', 3)!;

      wildMon.vigor = undefined as unknown as number;
      wildMon.maxVigor = undefined as unknown as number;

      const mockCtx = {
        activeBattle: ref({
          player: playerMon,
          enemy: wildMon,
          _initialEnemy: structuredClone(wildMon),
          over: false,
          isTrainer: false,
        }),
        animations: {},
      } as unknown as BattleContext;

      const dummyOptions = {
        eventStore: {} as never,
        addLog: () => {},
        audio: {} as never,
        consumeItem: () => {},
        ctx: mockCtx,
        itemId: 'masterball' as const,
      };

      const res = await handleItemUsage('masterball', playerMon, wildMon, dummyOptions);
      expect(res.action).toBe('capture');
      const captured = res.pokemon as Pokemon;

      expect(captured.maxVigor).toBeGreaterThanOrEqual(3);
      expect(captured.maxVigor).toBeLessThanOrEqual(6);
      expect(captured.vigor).toBe(captured.maxVigor);
      expect(() => validatePokemon(captured)).not.toThrow();
    });
  });

  describe('Capture Animation Kinematics', () => {
    it('handleShakeRequest activates and then completes isShaking on the seat during capture shakes', async () => {
      const mockBattleStore = {
        state: ref({ isTrainer: false, isGym: false }),
        player: { id: 'pikachu', name: 'Pikachu', uid: 'player-pika-1' } as Pokemon,
        enemy: { id: 'pidgey', name: 'Pidgey', uid: 'enemy-pidgey-1' } as Pokemon
      } as any;

      const captureAnims = useBattleCaptureAnimations(mockBattleStore, mockBattleStore.enemy);

      await captureAnims.handleShakeRequest({ side: 'enemy', isCapture: true });

      const enemySeat = captureAnims.seats.value.seat2;
      expect(enemySeat.entry.isShaking).toBe(false);
      expect(enemySeat.exit.isShaking).toBe(false);
    });

    it('handleBlinkRequest dispatches statusDamage sound and activates isBlinking', async () => {
      const mockBattleStore = {
        state: ref({ isTrainer: false, isGym: false }),
        player: { id: 'pikachu', name: 'Pikachu', uid: 'player-pika-1' } as Pokemon,
        enemy: { id: 'pidgey', name: 'Pidgey', uid: 'enemy-pidgey-1' } as Pokemon
      } as any;

      const captureAnims = useBattleCaptureAnimations(mockBattleStore, mockBattleStore.enemy);

      const soundEvents: string[] = [];
      const onSound = (e: Event) => {
        soundEvents.push((e as CustomEvent).detail);
      };
      gameBus.on('PLAY_SOUND', onSound);

      await captureAnims.handleBlinkRequest({ side: 'player' });

      gameBus.off('PLAY_SOUND', onSound);

      expect(soundEvents).toContain('statusDamage');
      const playerSeat = captureAnims.seats.value.seat1;
      expect(playerSeat.entry.isBlinking).toBe(false);
    });

    it('handleHealRequest dispatches heal sound and activates isHealing', async () => {
      const mockBattleStore = {
        state: ref({ isTrainer: false, isGym: false }),
        player: { id: 'pikachu', name: 'Pikachu', uid: 'player-pika-1' } as Pokemon,
        enemy: { id: 'pidgey', name: 'Pidgey', uid: 'enemy-pidgey-1' } as Pokemon
      } as any;

      const captureAnims = useBattleCaptureAnimations(mockBattleStore, mockBattleStore.enemy);

      const soundEvents: string[] = [];
      const onSound = (e: Event) => {
        soundEvents.push((e as CustomEvent).detail);
      };
      gameBus.on('PLAY_SOUND', onSound);

      await captureAnims.handleHealRequest({ side: 'player' });

      gameBus.off('PLAY_SOUND', onSound);

      expect(soundEvents).toContain('heal');
      const playerSeat = captureAnims.seats.value.seat1;
      expect(playerSeat.entry.isHealing).toBe(false);
    });

    it('playCatchCelebration emits caught audio and triggers catch sparkles', async () => {
      const mockBattleStore = {
        state: ref({ isTrainer: false, isGym: false }),
        player: { id: 'pikachu', name: 'Pikachu', uid: 'player-pika-1' } as Pokemon,
        enemy: { id: 'mewtwo', name: 'Mewtwo', uid: 'enemy-mewtwo-1' } as Pokemon
      } as any;

      const captureAnims = useBattleCaptureAnimations(mockBattleStore, mockBattleStore.enemy);

      const soundEvents: string[] = [];
      const onSound = (e: Event) => {
        soundEvents.push((e as CustomEvent).detail);
      };
      gameBus.on('PLAY_SOUND', onSound);

      await captureAnims.playCatchCelebration('enemy');

      gameBus.off('PLAY_SOUND', onSound);

      expect(soundEvents).toContain('caught');
      expect(captureAnims.seats.value.seat2.entry.isCaptureActive).toBe(true);
    });

    it('executes repeated capture throw cleanly without stalling on stale tween registrations', async () => {
      const enemyPoke = { id: 'mewtwo', name: 'Mewtwo', uid: 'enemy-mewtwo-repeat' } as Pokemon;
      const mockBattleStore = {
        state: ref({ isTrainer: false, isGym: false }),
        player: { id: 'pikachu', name: 'Pikachu', uid: 'player-pika-repeat' } as Pokemon,
        enemy: enemyPoke
      } as any;

      const captureAnims = useBattleCaptureAnimations(mockBattleStore, enemyPoke);
      captureAnims.initListeners();

      const createMockTween = () => {
        return {
          isActive: () => true,
          progress: () => 0,
          totalDuration: () => 0.05,
          parent: {},
          eventCallback: (ev: string, cb?: () => void) => {
            if (ev === 'onComplete' && cb) {
              setTimeout(cb, 5);
            }
          }
        } as any;
      };

      // 1. First catch attempt
      const catchPromise1 = captureAnims.handleCatchRequest({ side: 'enemy', ballId: 'pokeball', pokemon: enemyPoke });
      expect(captureAnims.seats.value.seat2.exit.animState).toBe('catching');

      // Simulate tween registration from BattleCombatant
      gameBus.emit('REGISTER_TWEEN', { key: `enemy-${enemyPoke.uid}`, tween: createMockTween() });
      await catchPromise1;
      expect(captureAnims.seats.value.seat2.exit.animState).toBe('trapped');

      // 2. Breakout
      const releasePromise = captureAnims.handleReleaseRequest({ side: 'enemy', pokemon: enemyPoke });
      expect(captureAnims.seats.value.seat2.entry.animState).toBe('releasing');
      gameBus.emit('REGISTER_TWEEN', { key: `enemy-${enemyPoke.uid}`, tween: createMockTween() });
      await releasePromise;
      expect(captureAnims.seats.value.seat2.entry.animState).toBeNull();

      // 3. Second catch attempt
      const catchPromise2 = captureAnims.handleCatchRequest({ side: 'enemy', ballId: 'pokeball', pokemon: enemyPoke });
      expect(captureAnims.seats.value.seat2.exit.animState).toBe('catching');

      gameBus.emit('REGISTER_TWEEN', { key: `enemy-${enemyPoke.uid}`, tween: createMockTween() });
      await catchPromise2;
      expect(captureAnims.seats.value.seat2.exit.animState).toBe('trapped');

      captureAnims.cleanupListeners();
    });
  });
});
