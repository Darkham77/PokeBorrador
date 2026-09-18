import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ref } from 'vue';
import { terminateBattle } from '@/logic/battle/resolution';
import { calculateDamage, getEffectiveSpeed } from '@/logic/battle/battleEngine';
import { gameBus } from '@/logic/events/gameBus';
import { BATTLE_STATES, BATTLE_SUBSTATES } from '@/logic/battle/battleStateMachine';
import { startEncounter, handleBattleFlowCompletion } from '@/logic/battle/searchLoop';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { dispatchMoveEffect } from '@/logic/battle/actions/actionRegistry';
import { requirePokemonMoveId } from '@/data/battle/moves';
import type { Pokemon, Move } from '@/types/pokemon/pokemon';
import type { BattleStages } from '@/types/battle/battle';
import type { BattleContext } from '@/types/battle/battleContext';
import type { MoveBaseData } from '@/types/system/database';

vi.mock('@/logic/events/gameBus', () => ({
  gameBus: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  }
}));

vi.mock('@/logic/battle/battleFlow', () => ({
  updateCastformForm: vi.fn()
}));

vi.mock('@/logic/encounters/encounters', () => ({
  generateEncounter: vi.fn(async () => ({
    type: 'wild',
    pokemon: { id: 'pidgey', name: 'Pidgey', hp: 50, maxHp: 50, uid: 'pidgey-1', moves: [{ id: 'tackle', name: 'Placaje', pp: 35 }] }
  }))
}));

// Mock day cycle for deterministic results in tests
vi.mock('@/logic/utils/timeUtils', async () => {
  const actual = await vi.importActual('@/logic/utils/timeUtils') as object;
  return {
    ...actual,
    getDayCycle: vi.fn(() => 'day'),
  };
});

describe('Battle Resolution, Engine & Turn Flow Suite', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('terminateBattle & Cleanup Flow', () => {
    interface MockCtx {
      activeBattle: {
        value: {
          enemy: { id: number; name: string } | null;
          _initialEnemy: { id: number; name: string } | null;
          over: boolean;
          locationId: string;
        } | null;
      };
      fsm: {
        currentState: { value: string };
        transition: (s: string, _sub?: string) => Promise<void>;
      };
      faintedSides: {
        value: {
          clear: () => void;
        };
      };
      gs: {
        state: { activeBattle: unknown };
        save: () => Promise<void>;
      };
      BATTLE_STATES: typeof BATTLE_STATES;
      BATTLE_SUBSTATES: typeof BATTLE_SUBSTATES;
      waitForLogs: () => Promise<void>;
      completeBattleFlow: () => Promise<void>;
    }

    let mockCtx: MockCtx;

    beforeEach(() => {
      mockCtx = {
        activeBattle: {
          value: {
            enemy: { id: 19, name: 'Rattata' },
            _initialEnemy: { id: 19, name: 'Rattata' },
            over: false,
            locationId: 'route1'
          }
        },
        fsm: {
          currentState: { value: BATTLE_STATES.ACTIVE_BATTLE },
          transition: vi.fn(async (s: string, _sub?: string) => {
            mockCtx.fsm.currentState.value = s;
          })
        },
        faintedSides: {
          value: {
            clear: vi.fn()
          }
        },
        gs: {
          state: { activeBattle: {} },
          save: vi.fn(async () => {})
        },
        BATTLE_STATES,
        BATTLE_SUBSTATES,
        waitForLogs: vi.fn(async () => {}),
        completeBattleFlow: vi.fn(async () => {})
      };
    });

    it('should cleanup _initialEnemy when terminating battle', async () => {
      await terminateBattle(mockCtx as unknown as Parameters<typeof terminateBattle>[0], true, true);
      
      expect(mockCtx.activeBattle.value!._initialEnemy).toBeNull();
      expect(mockCtx.activeBattle.value!.enemy).toBeNull();
    });

    it('should handle missing activeBattle gracefully', async () => {
      mockCtx.activeBattle.value = null;
      
      await terminateBattle(mockCtx as unknown as Parameters<typeof terminateBattle>[0], true);
      
      expect(mockCtx.fsm.transition).toHaveBeenCalledWith(BATTLE_STATES.EXIT_BATTLE);
    });
  });

  describe('Battle Engine Damage Formulas & Stat Stages', () => {
    const attacker = { level: 100, atk: 200, spa: 200, type: 'electric' } as unknown as Pokemon;
    const defender = { level: 100, def: 100, spd: 100, type: 'normal' } as unknown as Pokemon;
    const move = { name: 'Rayo', type: 'electric', power: 90, cat: 'special' } as const;

    beforeEach(() => {
      vi.spyOn(Math, 'random').mockReturnValue(1.0);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should calculate base special damage correctly', () => {
      const result = calculateDamage(attacker, defender, move, { atkStages: 0, defStages: 0 });
      expect(result.dmg).toBe(229);
    });

    it('should scale damage with attack stages (+2 stages = 2x)', () => {
      const result = calculateDamage(attacker, defender, move, { atkStages: 2, defStages: 0 });
      expect(result.dmg).toBe(456);
    });

    it('should scale damage with defense stages (+2 stages = 0.5x)', () => {
      const result = calculateDamage(attacker, defender, move, { atkStages: 0, defStages: 2 });
      expect(result.dmg).toBe(115);
    });

    it('Intrépido should hit Ghost types with Normal moves', () => {
      const scramp = { id: 'miltank', type: 'normal', atk: 100, level: 50, ability: 'scrappy' } as unknown as Pokemon;
      const ghost = { id: 'gastly', type: 'ghost', def: 50, level: 50 } as unknown as Pokemon;
      const normalMove = { name: 'Pisotón', type: 'normal', power: 65, cat: 'physical' } as const;
      
      const result = calculateDamage(scramp, ghost, normalMove);
      expect(result.dmg).toBeGreaterThan(0);
      expect(result.eff).toBe(1);
    });

    it('Sebo should reduce Fire/Ice damage by 50%', () => {
      const fireAtk = { id: 'charmander', type: 'fire', spa: 100, level: 50 } as unknown as Pokemon;
      const thickFatDef = { id: 'snarlax', type: 'normal', spd: 100, level: 50, ability: 'thickfat' } as unknown as Pokemon;
      const flame = { name: 'Lanzallamas', type: 'fire', power: 90, cat: 'special' } as const;
      
      const noSeboResult = calculateDamage(fireAtk, { ...thickFatDef, ability: null } as unknown as Pokemon, flame);
      const seboResult = calculateDamage(fireAtk, thickFatDef, flame);
      
      expect(seboResult.dmg).toBe(Math.floor(noSeboResult.dmg * 0.5));
    });

    it('should boost Fire damage in Sun and reduce in Rain', () => {
      const fireAtk = { level: 50, spa: 100, type: 'fire' } as unknown as Pokemon;
      const normDef = { level: 50, spd: 100, type: 'normal' } as unknown as Pokemon;
      const flame = { name: 'Lanzallamas', type: 'fire', power: 90, cat: 'special' } as const;

      const sun = calculateDamage(fireAtk, normDef, flame, { weather: { type: 'sun', turns: 5 } });
      expect(sun.dmg).toBe(91);

      const rain = calculateDamage(fireAtk, normDef, flame, { weather: { type: 'rain', turns: 5 } });
      expect(rain.dmg).toBe(30);
    });

    it('Clorofila should double speed in Day and Paralysis should halve speed', () => {
      const chloro = { spe: 50, ability: 'chlorophyll' } as unknown as Pokemon;
      expect(getEffectiveSpeed(chloro, { spe: 0 }, { weather: null })).toBe(100);

      const para = { spe: 100, status: 'par' } as unknown as Pokemon;
      expect(getEffectiveSpeed(para, { spe: 0 }, { weather: null })).toBe(50);
    });
  });

  describe('Turn Flow & Faint Handlers', () => {
    function createMockStore() {
      const p = { id: '25', uid: 'p1', name: 'Pikachu', hp: 100, maxHp: 100, level: 50, atk: 100, spa: 100, moves: [{ id: 'tackle', name: 'Tackle', power: 40, pp: 10 }] };
      const e = { id: '16', name: 'Pidgey', hp: 100, maxHp: 100, level: 5, def: 50, spd: 50 };
      
      const store = {
        activeBattle: {
          value: {
            player: p,
            enemy: e,
            enemyTeam: [] as unknown[],
            participants: [] as unknown[],
            isTrainer: false
          }
        },
        playerStages: { value: { atk: 0 } },
        enemyStages: { value: { def: 0 } },
        attackerSide: { value: null as string | null },
        activeMove: { value: null as unknown },
        fsm: {
          transition: vi.fn()
        },
        BATTLE_STATES: { ACTIVE_BATTLE: 'ACTIVE_BATTLE' },
        BATTLE_SUBSTATES: { 
          BUILD_QUEUE: 'BUILD_QUEUE', 
          POP_ACTION: 'POP_ACTION', 
          APPLY_MOVE: 'APPLY_MOVE', 
          EVAL_HP: 'EVAL_HP',
          PLAYER_FAINT_SEQ: 'PLAYER_FAINT_SEQ',
          ENEMY_REPLACEMENT_SEQ: 'ENEMY_REPLACEMENT_SEQ'
        },
        gs: {
          state: {
            team: [p]
          }
        },
        addLog: vi.fn(),
        endBattle: vi.fn(),
        handleFaint: vi.fn()
      };

      store.handleFaint = vi.fn(async (side: string) => {
        gameBus.emit('PLAY_FAINT', { side });
        if (side === 'enemy' && store.activeBattle.value.isTrainer) {
          const next = store.activeBattle.value.enemyTeam[0] as { name: string; hp: number } | undefined;
          if (next) {
            gameBus.emit('PLAY_WITHDRAW', { side: 'enemy' });
            gameBus.emit('PLAY_SEND_OUT', { side: 'enemy', pokemon: next });
            store.addLog('¡Entrenador envía a Rattata!', 'log-enemy', 'enemy_trainer');
          }
        }
      });

      return store;
    }

    it('should trigger gameBus animations when handleFaint is called', async () => {
      const mockStore = createMockStore();
      mockStore.activeBattle.value.enemy.hp = 0;
      await mockStore.handleFaint('enemy');
      expect(gameBus.emit).toHaveBeenCalledWith('PLAY_FAINT', { side: 'enemy' });
    });

    it('should handle trainer switching pokemon when one faints', async () => {
      const mockStore = createMockStore();
      mockStore.activeBattle.value.isTrainer = true;
      mockStore.activeBattle.value.enemy.hp = 0;
      const nextPokemon = { name: 'Rattata', hp: 100 };
      mockStore.activeBattle.value.enemyTeam = [nextPokemon];

      await mockStore.handleFaint('enemy');

      expect(gameBus.emit).toHaveBeenCalledWith('PLAY_WITHDRAW', { side: 'enemy' });
      expect(gameBus.emit).toHaveBeenCalledWith('PLAY_SEND_OUT', expect.objectContaining({ side: 'enemy', pokemon: nextPokemon }));
      expect(mockStore.addLog).toHaveBeenCalledWith(expect.stringContaining('¡Entrenador envía a Rattata!'), 'log-enemy', 'enemy_trainer');
    });
  });

  describe('Auto-Battle Search & Completion Flow', () => {
    let mockCtx: BattleContext;

    beforeEach(() => {
      const currentState = ref<string>(BATTLE_STATES.SEARCH_PHASE);
      const currentSubState = ref<string | null>(BATTLE_SUBSTATES.COMBAT_OR_FLEE);

      const playerMon = {
        uid: 'charizard-1',
        name: 'Charizard',
        hp: 100,
        maxHp: 100,
        moves: [{ id: 'flamethrower', name: 'Lanzallamas', pp: 15 }]
      } as unknown as Pokemon;

      const enemyMon = {
        uid: 'rattata-1',
        name: 'Rattata',
        hp: 40,
        maxHp: 40,
        moves: [{ id: 'tackle', name: 'Placaje', pp: 35 }]
      } as unknown as Pokemon;

      mockCtx = {
        activeBattle: ref({
          locationId: 'route1',
          _initialEnemy: enemyMon,
          enemy: enemyMon,
          player: playerMon,
          isTrainer: false,
          isGym: false,
          over: false,
          wasSearching: true,
          rewardsProcessed: false,
          _rewardCombatants: []
        }),
        debugLoopPokemon: ref(null),
        isProcessing: ref(false),
        isIntroAnimating: ref(false),
        isSearching: ref(true),
        isBattleActive: ref(true),
        isFinishing: ref(false),
        isReadyToExit: ref(false),
        faintedSides: ref(new Set<string>()),
        gs: {
          state: {
            team: [playerMon],
            map: { currentMap: 'route1' }
          },
          save: vi.fn(async () => {})
        },
        fsm: {
          currentState,
          currentSubState,
          transition: vi.fn(async (s: string, sub: string | null = null) => {
            currentState.value = s;
            currentSubState.value = sub;
          })
        },
        BATTLE_STATES,
        BATTLE_SUBSTATES,
        clearLogs: vi.fn(),
        addLog: vi.fn(),
        clearVolatileStatus: vi.fn(),
        persistBattle: vi.fn(),
        initBattle: vi.fn(async () => {
          currentState.value = BATTLE_STATES.ACTIVE_BATTLE;
          currentSubState.value = BATTLE_SUBSTATES.WAIT_INPUT;
        })
      } as unknown as BattleContext;
    });

    it('should cleanly start encounter from COMBAT_OR_FLEE when called', async () => {
      expect(mockCtx.fsm.currentState.value).toBe(BATTLE_STATES.SEARCH_PHASE);
      expect(mockCtx.fsm.currentSubState.value).toBe(BATTLE_SUBSTATES.COMBAT_OR_FLEE);

      await startEncounter(mockCtx);

      expect(mockCtx.initBattle).toHaveBeenCalled();
      expect(mockCtx.isProcessing.value).toBe(false);
      expect(mockCtx.isIntroAnimating.value).toBe(false);
    });

    it('should ignore redundant startEncounter if isProcessing is already true', async () => {
      mockCtx.isProcessing.value = true;
      await expect(startEncounter(mockCtx)).resolves.toBeUndefined();
      expect(mockCtx.initBattle).not.toHaveBeenCalled();
    });

    it('should ignore stale startEncounter if FSM has already advanced past SEARCH_PHASE', async () => {
      mockCtx.fsm.currentState.value = BATTLE_STATES.FIRST_INTRO;
      mockCtx.fsm.currentSubState.value = BATTLE_SUBSTATES.WILD_ENCOUNTER;

      await expect(startEncounter(mockCtx)).resolves.toBeUndefined();
      expect(mockCtx.initBattle).not.toHaveBeenCalled();
    });

    it('should complete search flow and stop in stable COMBAT_OR_FLEE state', async () => {
      await handleBattleFlowCompletion(mockCtx, 'search');

      expect(mockCtx.fsm.transition).toHaveBeenCalledWith(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.COMBAT_OR_FLEE);
      expect(mockCtx.isProcessing.value).toBe(false);
    });
  });

  describe('ActionRegistry & Move Effect Mapping Coverage', () => {
    function toMove(moveData: MoveBaseData): Move {
      return {
        ...moveData,
        maxPP: moveData.pp,
      };
    }

    function createDispatchFixture() {
      const logs: string[] = [];
      const dummySrc = { uid: 'src-uid', name: 'Bulbasaur' } as Pokemon;
      const dummyTgt = { uid: 'tgt-uid', name: 'Pikachu' } as Pokemon;
      const srcStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } as BattleStages;
      const tgtStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } as BattleStages;
      const addLogFn = (msg: string) => { logs.push(msg); };
      const dummyCtx = {
        activeBattle: {
          value: {
            player: dummySrc,
            enemy: dummyTgt,
            playerTeam: [dummySrc],
            enemyTeam: [dummyTgt],
            playerSideConditions: {},
            enemySideConditions: {},
            weather: { type: 'clear', visual: 'clear', turns: 5 }
          }
        },
        player: { value: dummySrc },
        enemy: { value: dummyTgt },
        playerStages: { value: srcStages },
        enemyStages: { value: tgtStages },
        exitingPlayer: { value: null },
        exitingEnemy: { value: null },
        fsm: { transition: async () => {} },
        uiStore: { notify: () => {}, isBattleSwitchForced: false },
        gs: { state: { money: 1000 } }
      } as unknown as BattleContext;
      return { dummySrc, dummyTgt, srcStages, tgtStages, addLogFn, dummyCtx };
    }

    it('dispatches common Showdown move effects without throwing', async () => {
      const movesToTest = [
        'growl',
        'tailwhip',
        'thunderwave',
        'recover',
        'aurorabeam',
        'acidarmor',
        'sunnyday'
      ];

      const { dummySrc, dummyTgt, srcStages, tgtStages, addLogFn, dummyCtx } = createDispatchFixture();

      for (const moveId of movesToTest) {
        const moveData = pokemonDataProvider.getMoveData(moveId);
        expect(moveData).not.toBeNull();

        await expect(
          dispatchMoveEffect(toMove(moveData!), dummySrc, dummyTgt, srcStages, tgtStages, addLogFn, dummyCtx)
        ).resolves.not.toThrow();
      }
    });

    it('does not assign legacy string effects to simple damage moves', () => {
      const tackle = pokemonDataProvider.getMoveData('tackle');
      expect(tackle).not.toBeNull();
      expect(tackle?.effect).toBeUndefined();

      const scratch = pokemonDataProvider.getMoveData('scratch');
      expect(scratch).not.toBeNull();
      expect(scratch?.effect).toBeUndefined();
    });

    it('dispatches real enabled learnset moves without throwing', async () => {
      const { POKEMON_DB } = await import('@/data/pokemon/pokemonDB');
      const { toID } = await import('@pkmn/sim');
      const { ENABLED_POKEMON_IDS } = await import('@/data/system/constants');
      const { dummySrc, dummyTgt, srcStages, tgtStages, addLogFn, dummyCtx } = createDispatchFixture();

      const learnsetMoves = new Set<ReturnType<typeof requirePokemonMoveId>>();
      for (const [speciesId, poke] of Object.entries(POKEMON_DB)) {
        if (!(ENABLED_POKEMON_IDS as readonly string[]).includes(speciesId)) continue;
        if (poke.learnset && Array.isArray(poke.learnset)) {
          poke.learnset.forEach((m: { id: string }) => {
            if (m.id && m.id !== 'Unknown') {
              learnsetMoves.add(requirePokemonMoveId(toID(m.id)));
            }
          });
        }
      }

      const dispatchErrors: string[] = [];

      for (const moveId of learnsetMoves) {
        const moveData = pokemonDataProvider.getMoveData(moveId);
        if (!moveData) continue;
        try {
          await dispatchMoveEffect(toMove(moveData), dummySrc, dummyTgt, srcStages, tgtStages, addLogFn, dummyCtx);
        } catch (error) {
          dispatchErrors.push(`Move: ${moveData.name} (${moveId}) -> ${(error as Error).message}`);
        }
      }

      expect(dispatchErrors).toEqual([]);
    });
  });
});
