import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleNpcBabyEggReward } from '@/logic/battle/rewards/npcEggRewardsHandler';
import { NPC_BABY_POKEMON_POOL } from '@/logic/constants/gameplay';
import { useBreedingActions } from '@/stores/game/actions/breedingActions';
import type { BattleContext } from '@/types/battle/battleContext';
import type { GameState } from '@/types/system/game';
import type { PokemonEgg } from '@/types/pokemon/pokemon';

describe('NPC Baby Egg Rewards', () => {
  let mockCtx: any;
  let mockState: GameState;

  beforeEach(() => {
    mockState = {
      eggs: [] as PokemonEgg[],
      team: [],
      box: [],
      money: 1000,
      inventory: {},
      playerClass: 'entrenador'
    } as unknown as GameState;

    mockCtx = {
      activeBattle: {
        value: {
          isTrainer: true,
          isRival: false,
          isGym: false,
          isPvP: false
        }
      },
      gs: {
        state: mockState
      },
      uiStore: {
        notify: vi.fn()
      },
      eventStore: {
        globalMultipliers: { shiny: 1 }
      },
      addLog: vi.fn()
    };
  });

  it('should not award an egg in wild encounters (isTrainer: false)', () => {
    mockCtx.activeBattle.value.isTrainer = false;
    mockCtx.activeBattle.value.isGym = false;

    const awarded = handleNpcBabyEggReward(mockCtx as unknown as BattleContext, mockCtx.activeBattle.value);
    expect(awarded).toBe(false);
    expect(mockState.eggs.length).toBe(0);
    expect(mockCtx.addLog).not.toHaveBeenCalled();
  });

  it('should not award an egg in Gym battles (isGym: true)', () => {
    mockCtx.activeBattle.value.isTrainer = true;
    mockCtx.activeBattle.value.isGym = true;

    // Even with a very low random roll
    vi.spyOn(Math, 'random').mockReturnValue(0.001);

    const awarded = handleNpcBabyEggReward(mockCtx as unknown as BattleContext, mockCtx.activeBattle.value);
    expect(awarded).toBe(false);
    expect(mockState.eggs.length).toBe(0);
    expect(mockCtx.addLog).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it('should not award an egg in PvP encounters (isPvP: true)', () => {
    mockCtx.activeBattle.value.isTrainer = true;
    mockCtx.activeBattle.value.isPvP = true;

    vi.spyOn(Math, 'random').mockReturnValue(0.001);

    const awarded = handleNpcBabyEggReward(mockCtx as unknown as BattleContext, mockCtx.activeBattle.value);
    expect(awarded).toBe(false);
    expect(mockState.eggs.length).toBe(0);
    expect(mockCtx.addLog).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it('should respect 2% drop rate for normal NPC trainers', () => {
    mockCtx.activeBattle.value.isTrainer = true;
    mockCtx.activeBattle.value.isRival = false;

    // Roll 0.021 is >= 0.02 (2%), should NOT drop
    vi.spyOn(Math, 'random').mockReturnValue(0.021);
    let awarded = handleNpcBabyEggReward(mockCtx as unknown as BattleContext, mockCtx.activeBattle.value);
    expect(awarded).toBe(false);
    expect(mockState.eggs.length).toBe(0);

    // Roll 0.015 is < 0.02 (2%), should drop
    vi.spyOn(Math, 'random').mockReturnValue(0.015);
    awarded = handleNpcBabyEggReward(mockCtx as unknown as BattleContext, mockCtx.activeBattle.value);
    expect(awarded).toBe(true);
    expect(mockState.eggs.length).toBe(1);

    const egg = mockState.eggs[0];
    expect(egg).toBeDefined();
    if (!egg) throw new Error('Expected egg to be defined');

    expect(egg.isNpc).toBe(true);
    expect(NPC_BABY_POKEMON_POOL).toContain(egg.id);
    expect(mockCtx.addLog).toHaveBeenCalledWith(
      '¡El Entrenador te ha regalado un misterioso Huevo Pokémon!',
      'log-catch',
      'egg'
    );
    expect(mockCtx.uiStore.notify).toHaveBeenCalledWith(
      '¡Recibiste un Huevo Pokémon (NPC)! 🥚',
      '🥚'
    );

    vi.restoreAllMocks();
  });

  it('should respect 5% drop rate for Rivals (isRival: true)', () => {
    mockCtx.activeBattle.value.isTrainer = true;
    mockCtx.activeBattle.value.isRival = true;

    // Roll 0.051 is >= 0.05 (5%), should NOT drop
    vi.spyOn(Math, 'random').mockReturnValue(0.051);
    let awarded = handleNpcBabyEggReward(mockCtx as unknown as BattleContext, mockCtx.activeBattle.value);
    expect(awarded).toBe(false);
    expect(mockState.eggs.length).toBe(0);

    // Roll 0.045 is < 0.05 (5%), should drop
    vi.spyOn(Math, 'random').mockReturnValue(0.045);
    awarded = handleNpcBabyEggReward(mockCtx as unknown as BattleContext, mockCtx.activeBattle.value);
    expect(awarded).toBe(true);
    expect(mockState.eggs.length).toBe(1);

    const egg = mockState.eggs[0];
    expect(egg).toBeDefined();
    if (!egg) throw new Error('Expected egg to be defined');

    expect(egg.isNpc).toBe(true);
    expect(NPC_BABY_POKEMON_POOL).toContain(egg.id);
    expect(mockCtx.addLog).toHaveBeenCalledWith(
      '¡El Rival te ha regalado un misterioso Huevo Pokémon!',
      'log-catch',
      'egg'
    );
    expect(mockCtx.uiStore.notify).toHaveBeenCalledWith(
      '¡Recibiste un Huevo Pokémon (Rival)! 🥚',
      '🥚'
    );

    vi.restoreAllMocks();
  });

  it('should hatch an NPC baby egg with full wild vigor (3 to 6)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01);
    handleNpcBabyEggReward(mockCtx as unknown as BattleContext, mockCtx.activeBattle.value);
    vi.restoreAllMocks();

    const egg = mockState.eggs[0];
    expect(egg).toBeDefined();
    if (!egg) throw new Error('Expected egg to be defined');
    expect(egg.isNpc).toBe(true);

    const scheduleSave = vi.fn().mockResolvedValue(undefined);
    const addPokemon = vi.fn((p) => {
      mockState.team.push(p);
      return { success: true, target: 'team' as const };
    });

    const { executeHatch } = useBreedingActions(mockState, scheduleSave, addPokemon);
    const hatched = await executeHatch(egg);

    expect(hatched).toBeDefined();
    expect(hatched.maxVigor).toBeGreaterThanOrEqual(3);
    expect(hatched.maxVigor).toBeLessThanOrEqual(6);
    expect(hatched.vigor).toBe(hatched.maxVigor);
  });

  it('should not award an egg if already carrying the maximum allowed NPC eggs (1)', () => {
    mockState.eggs = [
      {
        uid: 'npc-egg-1',
        id: 'pichu',
        steps: 100,
        ready: false,
        isNpc: true
      }
    ];

    vi.spyOn(Math, 'random').mockReturnValue(0.001);

    const awarded = handleNpcBabyEggReward(mockCtx as unknown as BattleContext, mockCtx.activeBattle.value);
    expect(awarded).toBe(false);
    expect(mockState.eggs.length).toBe(1);
    expect(mockCtx.addLog).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it('should not award an egg if all 7 incubator slots are filled', () => {
    mockState.eggs = Array.from({ length: 7 }, (_, i) => ({
      uid: `egg-${i}`,
      id: 'caterpie',
      steps: 100,
      ready: false
    }));

    vi.spyOn(Math, 'random').mockReturnValue(0.001);

    const awarded = handleNpcBabyEggReward(mockCtx as unknown as BattleContext, mockCtx.activeBattle.value);
    expect(awarded).toBe(false);
    expect(mockState.eggs.length).toBe(7);
    expect(mockCtx.addLog).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });
});
