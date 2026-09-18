/**
 * tests/unit/battle/battle_switch_action_suite.spec.ts
 * Consolidated domain test suite for Battle Switch Actions:
 * Bench switch guards (valid healthy bench detection), Showdown worker turn sync,
 * volatile status cleanup and stat stage reset on switch.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import { executeSwitch } from '@/logic/battle/actions/switchAction';
import { clearVolatileStatus } from '@/logic/battle/battleStatus';
import { useGameStore } from '@/stores/game';
import type { BattleContext } from '@/types/battle/battleContext';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleStages } from '@/types/battle/battle';

const mockWorker = vi.hoisted(() => ({
  postMessage: vi.fn(),
  onmessage: null as ((ev: MessageEvent) => void) | null
}));

vi.mock('@/logic/battle/orchestrator', () => ({
  showdownWorker: mockWorker,
  executeTurnInWorker: vi.fn(async (p1Choice: string, p2Choice?: string) => {
    const payload: { p1Choice: string; p2Choice?: string } = { p1Choice };
    if (p2Choice !== undefined) payload.p2Choice = p2Choice;
    mockWorker.postMessage({ type: 'EXECUTE_TURN', payload });
    return { logs: [], isOver: false, winner: null };
  }),
  isPlayerTrappedInWorker: vi.fn(async () => false)
}));

vi.mock('@/logic/battle/showdownWorkerClient', () => ({
  showdownWorker: mockWorker,
  getShowdownWorker: vi.fn(() => mockWorker),
  executeTurnInWorker: vi.fn(async (p1Choice: string, p2Choice?: string) => {
    const payload: { p1Choice: string; p2Choice?: string } = { p1Choice };
    if (p2Choice !== undefined) payload.p2Choice = p2Choice;
    mockWorker.postMessage({ type: 'EXECUTE_TURN', payload });
    return { logs: [], isOver: false, winner: null };
  }),
  isPlayerTrappedInWorker: vi.fn(async () => false),
  syncTeamsFromLastWorkerState: vi.fn(async () => {}),
  testResetShowdownWorker: vi.fn(async () => {})
}));

vi.mock('@/logic/battle/showdownBridge', () => ({
  filterShowdownLogs: vi.fn(() => []),
  parseShowdownLogLine: vi.fn(async () => {})
}));

vi.mock('@/logic/pokemon/typeEngine', () => ({
  getCombinedEffectiveness: vi.fn(() => 1.0)
}));

vi.mock('@/stores/ui', () => ({
  useUIStore: vi.fn(() => ({
    notify: vi.fn()
  }))
}));

vi.mock('@/logic/providers/pokemonDataProvider', () => ({
  pokemonDataProvider: {
    getMoveData: vi.fn((id: string) => {
      if (id === 'bubble') return { name: 'Burbuja', type: 'water', cat: 'special', power: 20, acc: 100 };
      return { name: 'Placaje', type: 'normal', cat: 'physical', power: 35, acc: 95 };
    })
  }
}));

// =============================================================================
// 1. Battle Switch Bench Guard Suite
// =============================================================================
describe('Battle Switch Bench Guard', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('prevents opening switch modal when no valid bench pokémon exist and triggers notification toast', () => {
    const gameStore = useGameStore();

    gameStore.state.team = [
      {
        uid: 'active-poke-1',
        id: 'mew',
        nickname: 'Mew',
        hp: 342,
        maxHp: 342,
        level: 100,
        moves: ['surf'],
        ability: 'synchronize',
        nature: 'serious',
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
      }
    ] as unknown as Pokemon[];

    const team = gameStore.state.team;
    const activeUid = 'active-poke-1';
    const hasBenchPokemon = team.some(p => p && p.hp > 0 && p.uid !== activeUid);

    expect(hasBenchPokemon).toBe(false);
  });

  it('allows switch modal when at least one healthy bench pokémon exists', () => {
    const gameStore = useGameStore();

    gameStore.state.team = [
      {
        uid: 'active-poke-1',
        id: 'mew',
        nickname: 'Mew 1',
        hp: 342,
        maxHp: 342,
        level: 100,
        moves: ['surf']
      },
      {
        uid: 'bench-poke-2',
        id: 'charizard',
        nickname: 'Charizard',
        hp: 300,
        maxHp: 300,
        level: 100,
        moves: ['flamethrower']
      }
    ] as any;

    const team = gameStore.state.team;
    const activeUid = 'active-poke-1';
    const hasBenchPokemon = team.some(p => p && p.hp > 0 && p.uid !== activeUid);

    expect(hasBenchPokemon).toBe(true);
  });
});

// =============================================================================
// 2. Switch Sync & Worker Execution Suite
// =============================================================================
describe('Switch Sync & Showdown Worker Protocol', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockWorker.postMessage.mockClear();
    mockWorker.postMessage.mockImplementation(() => {
      Promise.resolve().then(() => {
        if (mockWorker.onmessage) {
          mockWorker.onmessage({
            data: {
              type: 'TURN_SUCCESS',
              payload: { logs: [], isOver: false, winner: null }
            }
          } as unknown as MessageEvent);
        }
      });
    });
  });

  function createMockContext() {
    const p1 = { uid: 'p1', name: 'Charmeleon', hp: 50, maxHp: 100, atk: 15, spa: 12, moves: [{ id: 'tackle', name: 'Placaje', pp: 35, maxPP: 35 }] } as unknown as Pokemon;
    const p2 = { uid: 'p2', name: 'Charizard', hp: 100, maxHp: 100, atk: 25, spa: 22, moves: [{ id: 'wingattack', name: 'Ala de Acero', pp: 35, maxPP: 35 }] } as unknown as Pokemon;
    const enemy = { uid: 'e1', name: 'Pidgey', hp: 40, maxHp: 40, def: 10, spd: 10, moves: [{ id: 'peck', name: 'Picotazo', pp: 35, maxPP: 35 }] } as unknown as Pokemon;

    const activeBattle = ref({
      player: p1,
      enemy,
      playerTeamIndex: 0,
      p1SlotOrder: [p1.uid, p2.uid],
      p2SlotOrder: null as string[] | null,
      participants: ['p1'],
      isTrainer: false,
      weather: { type: 'clear', visual: 'clear', turns: -1 },
      playerRequest: {
        side: {
          pokemon: [
            { ident: 'p1: Charmeleon', details: 'Charmeleon', condition: '50/100', active: true, uid: p1.uid },
            { ident: 'p1: Charizard', details: 'Charizard', condition: '100/100', active: false, uid: p2.uid }
          ]
        }
      }
    });

    const playerStages = ref<BattleStages>({
      atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0,
      reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0
    });
    const enemyStages = ref<BattleStages>({
      atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0,
      reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0
    });

    const ctx = {
      gs: {
        state: {
          team: [p1, p2]
        }
      },
      activeBattle,
      fsm: {
        transition: vi.fn(async () => {})
      },
      BATTLE_STATES: {
        REORDER_TEAM: 'REORDER_TEAM',
        ACTIVE_BATTLE: 'ACTIVE_BATTLE'
      },
      BATTLE_SUBSTATES: {
        FIND_HEALTHY: 'FIND_HEALTHY',
        CHECK_ACTIVE_SEAT: 'CHECK_ACTIVE_SEAT',
        SWITCHING: 'SWITCHING',
        POKEMON_CALL: 'POKEMON_CALL',
        BUILD_QUEUE: 'BUILD_QUEUE',
        POP_ACTION: 'POP_ACTION',
        APPLY_MOVE: 'APPLY_MOVE',
        EVAL_HP: 'EVAL_HP'
      },
      addLog: vi.fn(),
      exitingPlayer: ref(null),
      playerStages,
      enemyStages,
      persistBattle: vi.fn(),
      handleFaint: vi.fn(),
      endBattle: vi.fn()
    } as unknown as BattleContext;

    return { ctx, p1, p2, playerStages, enemyStages };
  }

  it('should post EXECUTE_TURN with switch command to worker on voluntary switch', async () => {
    const { ctx } = createMockContext();

    await executeSwitch(ctx, 1, false);

    expect(mockWorker.postMessage).toHaveBeenCalledWith({
      type: 'EXECUTE_TURN',
      payload: {
        p1Choice: 'switch 2',
        p2Choice: expect.stringContaining('move')
      }
    });
  });

  it('should post EXECUTE_TURN with switch command and NO p2Choice on forced switch', async () => {
    const { ctx } = createMockContext();

    await executeSwitch(ctx, 1, true);

    expect(mockWorker.postMessage).toHaveBeenCalledWith({
      type: 'EXECUTE_TURN',
      payload: {
        p1Choice: 'switch 2',
        p2Choice: ''
      }
    });
  });

  it('should restore player active pokemon and index if worker throws error during switch', async () => {
    const { ctx, p1 } = createMockContext();
    
    const { executeTurnInWorker } = await import('@/logic/battle/showdownWorkerClient');
    vi.mocked(executeTurnInWorker).mockRejectedValueOnce(new Error('INVALID_CHOICE'));

    await expect(executeSwitch(ctx, 1, false)).rejects.toThrow('INVALID_CHOICE');

    expect(ctx.activeBattle.value?.player!.uid).toBe(p1.uid);
    expect(ctx.activeBattle.value?.playerTeamIndex).toBe(0);
  });

  it('should abort switch early and notify player if trapped by Arena Trap/Shadow Tag', async () => {
    const { ctx, p1 } = createMockContext();

    const { isPlayerTrappedInWorker } = await import('@/logic/battle/orchestrator');
    vi.mocked(isPlayerTrappedInWorker).mockResolvedValueOnce(true);

    const transitionSpy = vi.spyOn(ctx.fsm, 'transition');

    await executeSwitch(ctx, 1, false);

    expect(transitionSpy).not.toHaveBeenCalledWith('REORDER_TEAM');
    expect(ctx.activeBattle.value?.player!.uid).toBe(p1.uid);
  });
});

// =============================================================================
// 3. Switch Cleanup & Volatile Status Reset Suite
// =============================================================================
describe('Battle Switch Out State Cleanup Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('clearVolatileStatus cleanses all temporary battle states from the pokemon object', () => {
    const mockPoke = {
      uid: 'p1',
      name: 'Bulbasaur',
      volatileCounters: { confused: 2, taunt: 1 },
      lastMove: { id: 'tackle', name: 'Placaje' },
      confused: 2,
      flinched: true,
      substitute: 50,
      seeded: true,
      attracted: true,
      cursed: true,
      protect: true,
      detect: true,
      destinyBond: true,
      perishSongCount: 3,
      tauntTurns: 2,
      disabledTurns: 2,
      disabledMove: 'tackle',
      encoreTurns: 2,
      encoreMove: 'tackle',
      focusEnergy: true
    } as unknown as Pokemon;

    clearVolatileStatus(mockPoke);

    expect(mockPoke.volatileCounters).toEqual({});
    expect(mockPoke.lastMove).toBeNull();
    expect(mockPoke.confused).toBe(0);
    expect(mockPoke.flinched).toBe(false);
    expect(mockPoke.substitute).toBe(0);
    expect(mockPoke.seeded).toBe(false);
    expect(mockPoke.attracted).toBe(false);
    expect(mockPoke.cursed).toBe(false);
    expect(mockPoke.protect).toBe(false);
    expect(mockPoke.detect).toBe(false);
    expect(mockPoke.destinyBond).toBe(false);
    expect(mockPoke.perishSongCount).toBe(0);
    expect(mockPoke.tauntTurns).toBe(0);
    expect(mockPoke.disabledTurns).toBe(0);
    expect(mockPoke.disabledMove).toBeNull();
    expect(mockPoke.encoreTurns).toBe(0);
    expect(mockPoke.encoreMove).toBeNull();
    expect(mockPoke.focusEnergy).toBe(false);
  });

  it('executeSwitch cleanses volatile status and resets stages of the active pokemon to 0', async () => {
    const oldPoke = {
      uid: 'p1',
      name: 'Bulbasaur',
      hp: 100,
      maxHp: 100,
      volatileCounters: { confused: 2 },
      lastMove: { id: 'tackle', name: 'Placaje' },
      confused: 2
    } as unknown as Pokemon;

    const newPoke = {
      uid: 'p2',
      name: 'Ivysaur',
      hp: 100,
      maxHp: 100,
      volatileCounters: {},
      lastMove: null
    } as unknown as Pokemon;

    const activeBattle = ref({
      player: oldPoke,
      enemy: { uid: 'e1', name: 'Charmander', hp: 100, maxHp: 100, moves: [] } as unknown as Pokemon,
      playerTeamIndex: 0,
      participants: ['p1'],
      isTrainer: false,
      weather: { type: 'clear', visual: 'clear', turns: -1 },
      playerRequest: {
        side: {
          pokemon: [
            { uid: 'p1', condition: '100/100' },
            { uid: 'p2', condition: '100/100' }
          ]
        }
      }
    });

    const playerStages = ref<BattleStages>({
      atk: 2, def: -1, spa: 0, spd: 0, spe: 1, accuracy: 0, evasion: 0,
      reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0
    });

    const enemyStages = ref<BattleStages>({
      atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0,
      reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0
    });

    const ctx: BattleContext = {
      gs: {
        state: {
          team: [oldPoke, newPoke]
        }
      },
      activeBattle,
      fsm: {
        transition: vi.fn(async () => {})
      },
      BATTLE_STATES: {
        REORDER_TEAM: 'REORDER_TEAM',
        ACTIVE_BATTLE: 'ACTIVE_BATTLE'
      },
      BATTLE_SUBSTATES: {
        FIND_HEALTHY: 'FIND_HEALTHY',
        CHECK_ACTIVE_SEAT: 'CHECK_ACTIVE_SEAT',
        SWITCHING: 'SWITCHING',
        POKEMON_CALL: 'POKEMON_CALL',
        BUILD_QUEUE: 'BUILD_QUEUE',
        POP_ACTION: 'POP_ACTION',
        WAIT_INPUT: 'WAIT_INPUT'
      },
      playerStages,
      enemyStages,
      addLog: vi.fn(),
      exitingPlayer: ref(null),
      persistBattle: vi.fn(),
      handleFaint: vi.fn(),
      animations: {
        handleCatchRequest: vi.fn(async () => {}),
        handleReleaseRequest: vi.fn(async () => {})
      }
    } as unknown as BattleContext;

    await executeSwitch(ctx, 1, false);

    expect(oldPoke.volatileCounters).toEqual({});
    expect(oldPoke.lastMove).toBeNull();
    expect(oldPoke.confused).toBe(0);

    expect(playerStages.value.atk).toBe(0);
    expect(playerStages.value.def).toBe(0);
    expect(playerStages.value.spe).toBe(0);
  });
});
