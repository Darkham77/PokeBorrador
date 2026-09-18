/**
 * tests/unit/battle/trainer_and_npc_battle_suite.spec.ts
 * Consolidated domain test suite for NPC Trainers & Rivals:
 * Thematic pools, team generation, drops/rewards, AI move filtering,
 * item usage with Showdown turn skipping, and counter switching.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import '../../helpers/battleMockSetup';
import { TRAINER_TYPES, getArchetypePool, type TrainerTypeKey } from '@/data/player/trainerTypes';
import { ENABLED_POKEMON_IDS_SET, MAX_POKEMON_LEVEL } from '@/data/system/constants';
import { Dex, toID } from '@pkmn/sim';
import { RivalTeamGenerator } from '@/logic/battle/engine/rivalTeamGenerator.ts';
import { handleRivalSpecialDrops } from '@/logic/battle/rewards/classRewardsHandler';
import { decideEnemyMove } from '@/logic/battle/ai/battleAI';
import { executeTurn } from '@/logic/battle/battleTurn';
import { processFaint } from '@/logic/battle/resolution';
import { BATTLE_STATES, BATTLE_SUBSTATES } from '@/logic/battle/battleStateMachine';
import { useBattleStore } from '@/stores/battle/battle';
import type { BattleContext } from '@/types/battle/battleContext';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleStages, BattleState } from '@/types/battle/battle';

// Hoisted Mocks for Showdown Worker & AI
const mockExecuteTurn = vi.hoisted(() => vi.fn().mockResolvedValue({ logs: [], isOver: false, winner: null }));
const mockFindBestSwitchIndex = vi.hoisted(() => vi.fn(() => 1));
const mockResolveShowdownSlot = vi.hoisted(() => vi.fn(() => 3));

vi.mock('@/logic/battle/orchestrator', () => ({
  showdownWorker: {},
  executeTurnInWorker: mockExecuteTurn
}));

vi.mock('@/logic/battle/showdownWorkerClient', () => ({
  showdownWorker: {},
  getShowdownWorker: vi.fn(() => ({})),
  executeTurnInWorker: mockExecuteTurn,
  syncTeamsFromLastWorkerState: vi.fn(async () => {})
}));

vi.mock('@/logic/battle/showdownBridge', () => ({
  filterShowdownLogs: vi.fn(() => []),
  parseShowdownLogLine: vi.fn(async () => {})
}));

vi.mock('@/logic/battle/showdownTeamResolver', () => ({
  ShowdownTeamResolver: {
    getShowdownSlotForUid: mockResolveShowdownSlot,
    getPokemonByShowdownSlot: vi.fn(),
    getShowdownOrder: vi.fn((team) => team)
  }
}));

vi.mock('@/logic/battle/ai/battleAI', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/logic/battle/ai/battleAI')>();
  return {
    ...actual,
    findBestSwitchIndex: mockFindBestSwitchIndex
  };
});

// =============================================================================
// 1. Dynamic Thematic Trainer Pools (O(1))
// =============================================================================
describe('Dynamic Thematic Trainer Pools (O(1))', () => {
  it('should resolve a non-empty pool for every defined trainer archetype', () => {
    const keys = Object.keys(TRAINER_TYPES) as TrainerTypeKey[];
    for (const key of keys) {
      const pool = getArchetypePool(key);
      expect(pool.length, `Pool for archetype ${key} must not be empty`).toBeGreaterThan(0);
    }
  });

  it('should ensure 100% of species in all archetype pools are within ENABLED_POKEMON_IDS_SET', () => {
    const keys = Object.keys(TRAINER_TYPES) as TrainerTypeKey[];
    for (const key of keys) {
      const pool = getArchetypePool(key);
      for (const speciesId of pool) {
        expect(
          ENABLED_POKEMON_IDS_SET.has(speciesId),
          `Species ${speciesId} in ${key} must be enabled`
        ).toBe(true);
      }
    }
  });

  it('should enforce thematic type integrity for Caza Bichos (only Bug Pokémon)', () => {
    const bugPool = getArchetypePool('caza_bichos');
    expect(bugPool.length).toBeGreaterThanOrEqual(6);
    
    for (const id of bugPool) {
      const spec = Dex.species.get(id);
      expect(spec.types).toContain('Bug');
    }
  });

  it('should enforce thematic type integrity for Pescador (only Water Pokémon)', () => {
    const waterPool = getArchetypePool('pescador');
    expect(waterPool.length).toBeGreaterThanOrEqual(10);
    
    for (const id of waterPool) {
      const spec = Dex.species.get(id);
      expect(spec.types).toContain('Water');
    }
  });

  it('should enforce thematic type integrity for Luchador (only Fighting Pokémon)', () => {
    const fightPool = getArchetypePool('luchador');
    expect(fightPool.length).toBeGreaterThanOrEqual(5);
    
    for (const id of fightPool) {
      const spec = Dex.species.get(id);
      expect(spec.types).toContain('Fighting');
    }
  });

  it('should exclude legendaries like Mewtwo/Articuno from standard NPC pools', () => {
    const standardKeys = (Object.keys(TRAINER_TYPES) as TrainerTypeKey[]).filter(k => k !== 'rival');
    for (const key of standardKeys) {
      const pool = getArchetypePool(key);
      expect(pool).not.toContain('mewtwo');
      expect(pool).not.toContain('mew');
      expect(pool).not.toContain('articuno');
      expect(pool).not.toContain('zapdos');
      expect(pool).not.toContain('moltres');
    }
  });

  it('should maintain the explicit Ace pool for Rival', () => {
    const rivalPool = getArchetypePool('rival');
    expect(rivalPool).toEqual(TRAINER_TYPES['rival'].pool);
  });
});

// =============================================================================
// 2. Rival Team Generator (Showdown Extended Engine)
// =============================================================================
describe('RivalTeamGenerator - Showdown Extended Engine', () => {
  it('generates a team where slot 0 is always the requested Ace', () => {
    const ace = 'dragonite';
    const team = RivalTeamGenerator.generateTeam({
      level: 45,
      teamSize: 4,
      aceSpeciesId: ace,
    });

    expect(team.length).toBe(4);
    expect(toID(team[0]!.species)).toBe('dragonite');
  });

  it('generates 100% enabled species across all team members', () => {
    const team = RivalTeamGenerator.generateTeam({
      level: 50,
      teamSize: 6,
      aceSpeciesId: 'charizard',
    });

    expect(team.length).toBe(6);
    for (const member of team) {
      expect(ENABLED_POKEMON_IDS_SET.has(toID(member.species))).toBe(true);
    }
  });

  it('applies the exact level to all team members', () => {
    const targetLevel = 37;
    const team = RivalTeamGenerator.generateTeam({
      level: targetLevel,
      teamSize: 3,
      aceSpeciesId: 'alakazam',
    });

    for (const member of team) {
      expect(member.level).toBe(targetLevel);
    }
  });

  it('caps level at MAX_POKEMON_LEVEL when requested at maximum boundary', () => {
    const team = RivalTeamGenerator.generateTeam({
      level: MAX_POKEMON_LEVEL,
      teamSize: 5,
      aceSpeciesId: 'gengar',
    });

    for (const member of team) {
      expect(member.level).toBe(100);
    }
  });

  it('contains no duplicate species in the team', () => {
    const team = RivalTeamGenerator.generateTeam({
      level: 60,
      teamSize: 6,
      aceSpeciesId: 'machamp',
    });

    const speciesList = team.map(m => toID(m.species));
    const uniqueSpecies = new Set(speciesList);
    expect(uniqueSpecies.size).toBe(team.length);
  });

  it('produces legal movesets recognized by @pkmn/sim Dex', () => {
    const team = RivalTeamGenerator.generateTeam({
      level: 55,
      teamSize: 4,
      aceSpeciesId: 'lapras',
    });

    for (const member of team) {
      expect(member.moves.length).toBeGreaterThan(0);
      expect(member.moves.length).toBeLessThanOrEqual(4);
      for (const moveId of member.moves) {
        if (!moveId) continue;
        const move = Dex.moves.get(moveId);
        expect(move.exists).toBe(true);
      }
    }
  });

  it('handles teamSize = 1 correctly', () => {
    const team = RivalTeamGenerator.generateTeam({
      level: 20,
      teamSize: 1,
      aceSpeciesId: 'charizard',
    });

    expect(team.length).toBe(1);
    expect(toID(team[0]!.species)).toBe('charizard');
    expect(team[0]!.level).toBe(20);
  });
});

// =============================================================================
// 3. Rival Archetype Special Drops
// =============================================================================
describe('Rival Archetype Drops', () => {
  const createMockContext = () => ({
    gs: {
      state: {
        inventory: {}
      }
    },
    addLog: vi.fn(),
    uiStore: {
      notify: vi.fn()
    }
  } as unknown as BattleContext);

  it('does NOT drop items if opponent is not rival', () => {
    const ctx = createMockContext();
    const active = {
      isRival: false,
      trainerArchetype: 'gym'
    } as unknown as BattleState;

    handleRivalSpecialDrops(ctx, active);
    expect(Object.keys(ctx.gs.state.inventory)).toHaveLength(0);
    expect(ctx.addLog).not.toHaveBeenCalled();
  });

  it('drops items when trainerArchetype is rival', () => {
    const ctx = createMockContext();
    const active = {
      isRival: false,
      trainerArchetype: 'rival'
    } as unknown as BattleState;

    handleRivalSpecialDrops(ctx, active);
    const itemKeys = Object.keys(ctx.gs.state.inventory);
    expect(itemKeys).toHaveLength(1);
    expect(ctx.addLog).toHaveBeenCalled();
    expect(ctx.uiStore.notify).toHaveBeenCalled();
  });

  it('drops items when active.isRival is true', () => {
    const ctx = createMockContext();
    const active = {
      isRival: true,
      trainerArchetype: undefined
    } as unknown as BattleState;

    handleRivalSpecialDrops(ctx, active);
    const itemKeys = Object.keys(ctx.gs.state.inventory);
    expect(itemKeys).toHaveLength(1);
  });

  it('can drop ivscanner when random threshold matches', () => {
    const ctx = createMockContext();
    const active = {
      trainerArchetype: 'rival'
    } as unknown as BattleState;

    vi.spyOn(Math, 'random').mockReturnValue(0.95);

    handleRivalSpecialDrops(ctx, active);
    expect(ctx.gs.state.inventory['ivscanner']).toBe(1);

    vi.restoreAllMocks();
  });
});

// =============================================================================
// 4. Enemy AI - Disabled Moves Filtering
// =============================================================================
describe('Enemy AI - Disabled Moves Filtering', () => {
  let enemy: Pokemon;
  let player: Pokemon;
  let playerStages: BattleStages;

  beforeEach(() => {
    setActivePinia(createPinia());

    enemy = {
      id: 'gengar',
      name: 'Gengar',
      level: 50,
      moves: [
        { id: 'shadowpunch', name: 'Shadow Punch', pp: 10, maxPP: 10 },
        { id: 'belch', name: 'Belch', pp: 5, maxPP: 5 }
      ]
    } as unknown as Pokemon;

    player = {
      id: 'mew',
      name: 'Mew',
      level: 50,
      moves: []
    } as unknown as Pokemon;

    playerStages = {
      atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0,
      reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0
    };
  });

  it('should choose the best move under normal circumstances when no request is present', () => {
    const chosenMove = decideEnemyMove(enemy, player, playerStages, false);
    expect(chosenMove).not.toBeNull();
    expect(['shadowpunch', 'belch']).toContain(chosenMove!.id);
  });

  it('should filter out moves disabled by Showdown activeRequest', () => {
    const battleStore = useBattleStore();
    battleStore.state = {
      enemyRequest: {
        active: [
          {
            moves: [
              { id: 'shadowpunch', disabled: false },
              { id: 'belch', disabled: true }
            ]
          }
        ]
      }
    } as unknown as BattleState;

    const chosenMove = decideEnemyMove(enemy, player, playerStages, false);
    expect(chosenMove).not.toBeNull();
    expect(chosenMove!.id).toBe('shadowpunch');
  });

  it('should return null (struggle fallback trigger) if all moves are disabled in the request', () => {
    const battleStore = useBattleStore();
    battleStore.state = {
      enemyRequest: {
        active: [
          {
            moves: [
              { id: 'shadowpunch', disabled: true },
              { id: 'belch', disabled: true }
            ]
          }
        ]
      }
    } as unknown as BattleState;

    const chosenMove = decideEnemyMove(enemy, player, playerStages, false);
    expect(chosenMove).toBeNull();
  });
});

// =============================================================================
// 5. NPC Item Usage & Turn Skipping
// =============================================================================
describe('NPC Item Usage & Turn Skipping', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('should evaluate and use NPC item if enemy HP is low, and trigger turn skipping in Showdown worker', async () => {
    const player = {
      uid: 'p-active',
      name: 'Charizard',
      hp: 100,
      maxHp: 100,
      moves: [{ id: 'tackle', name: 'Placaje', pp: 35, maxPp: 35, power: 40, type: 'normal', cat: 'physical' }]
    } as unknown as Pokemon;

    const enemy = {
      uid: 'e-active',
      name: 'Pikachu',
      hp: 10,
      maxHp: 50,
      moves: [{ id: 'tackle', name: 'Placaje', pp: 35, maxPp: 35, power: 40, type: 'normal', cat: 'physical' }]
    } as unknown as Pokemon;

    const activeBattle = ref({
      player,
      enemy,
      isTrainer: true,
      over: false,
      locationId: 'route1',
      enemyInventory: {
        'superpotion': 1
      },
      playerUsedItem: false,
      enemyUsedItem: false
    });

    const fsm = {
      currentState: { value: BATTLE_STATES.ACTIVE_BATTLE } as { value: string },
      currentSubState: { value: BATTLE_SUBSTATES.WAIT_INPUT } as { value: string | null },
      transition: vi.fn(async (s: string, sub?: string) => {
        (fsm.currentState as { value: string }).value = s;
        if (sub) (fsm.currentSubState as { value: string | null }).value = sub;
      })
    };

    const enemyStages = ref<BattleStages>({
      atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0,
      reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0
    });

    const mockCtx = {
      activeBattle,
      fsm,
      BATTLE_STATES,
      BATTLE_SUBSTATES,
      enemyStages,
      playerStages: ref({}),
      gs: {
        state: {
          team: [player]
        }
      },
      addLog: vi.fn(),
      clearVolatileStatus: vi.fn()
    } as unknown as BattleContext;

    await executeTurn(mockCtx, 0);

    // 1. Healed Pikachu from 10 to 50
    expect(enemy.hp).toBe(50);
    expect(activeBattle.value.enemyInventory['superpotion']).toBeUndefined();

    // 2. Flagged item usage
    expect(activeBattle.value.enemyUsedItem).toBe(true);

    // 3. Called showdown worker with p2Skip = true
    expect(mockExecuteTurn).toHaveBeenCalledWith(
      expect.stringContaining('move'),
      expect.stringContaining('struggle'),
      false,
      true
    );
  });
});

// =============================================================================
// 6. NPC Counter Switching & Showdown Sync
// =============================================================================
describe('NPC Counter Switching & Showdown Sync', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('should choose the best counter and notify the showdown worker with correct slot index on NPC faint', async () => {
    const faintedEnemy = { uid: 'e-fainted', name: 'Rattata', hp: 0, maxHp: 30 } as unknown as Pokemon;
    const nextEnemy1 = { uid: 'e-next1', name: 'Pidgeotto', hp: 50, maxHp: 50 } as unknown as Pokemon;
    const nextEnemy2 = { uid: 'e-next2', name: 'Alakazam', hp: 80, maxHp: 80 } as unknown as Pokemon;

    const enemyTeam = [faintedEnemy, nextEnemy2, nextEnemy1];
    const player = { uid: 'p-active', name: 'Charizard', hp: 100, maxHp: 100 } as unknown as Pokemon;

    const activeBattle = ref({
      player,
      enemy: faintedEnemy,
      enemyTeam,
      playerTeamIndex: 0,
      isTrainer: true,
      over: false,
      locationId: 'route1',
      enemyRequest: null as unknown as Record<string, unknown> | null
    });

    const fsm = {
      currentState: { value: BATTLE_STATES.ACTIVE_BATTLE } as { value: string },
      currentSubState: { value: BATTLE_SUBSTATES.CLEANUP_MEMORY } as { value: string | null },
      transition: vi.fn(async (s: string, sub?: string) => {
        (fsm.currentState as { value: string }).value = s;
        if (sub) (fsm.currentSubState as { value: string | null }).value = sub;
      })
    };

    const enemyStages = ref<BattleStages>({
      atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0,
      reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0
    });

    const mockCtx = {
      activeBattle,
      fsm,
      BATTLE_STATES,
      BATTLE_SUBSTATES,
      faintedSides: { value: new Set<string>() },
      enemyStages,
      gs: {
        state: {
          team: [player]
        }
      },
      addLog: vi.fn(),
      clearVolatileStatus: vi.fn(),
      animations: {
        handleCatchRequest: vi.fn(),
        playBallFadeOut: vi.fn(),
        handleReleaseRequest: vi.fn()
      }
    } as unknown as BattleContext;

    await processFaint(mockCtx, 'enemy');

    // 1. Should run AI picker
    expect(mockFindBestSwitchIndex).toHaveBeenCalledWith(enemyTeam, player, faintedEnemy.uid, expect.anything(), 'faint_replacement');

    // 2. Selected Alakazam
    expect(activeBattle.value.enemy?.uid).toBe(nextEnemy2.uid);

    expect(mockResolveShowdownSlot).toHaveBeenCalledWith(null, nextEnemy2.uid);

    // 3. Sent switch command
    expect(mockExecuteTurn).toHaveBeenCalledWith('', 'switch 3', true, false);
  });
});
