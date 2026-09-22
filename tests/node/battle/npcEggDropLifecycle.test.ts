import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useGameStore } from '@/stores/game';
import { handleNpcBabyEggReward } from '@/logic/battle/rewards/npcEggRewardsHandler';
import { formatBattleLog } from '@/logic/battle/battleLogger';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import { NPC_BABY_POKEMON_POOL, NPC_EGG_TINT } from '@/logic/constants/gameplay';
import { useBreedingActions } from '@/stores/game/actions/breedingActions';
import { serializeState } from '@/logic/auth/saveSerializer';
import { saveDataSchema } from '@/logic/validation/schemas';
import * as v from 'valibot';
import type { BattleContext } from '@/types/battle/battleContext';
import type { BattleState } from '@/types/battle/battle';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('NPC Baby Egg Reward Lifecycle & Daycare Separation', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  function createMockBattleContext(gs: ReturnType<typeof useGameStore>) {
    const logs: Array<{ msg: string; type: string; source: unknown }> = [];
    const notifications: Array<{ msg: string; icon: string }> = [];

    const mockCtx = {
      gs,
      activeBattle: {
        value: {
          isTrainer: true,
          isGym: false,
          isPvP: false,
          isRival: false,
          trainerSprite: 'entrenador',
        } as unknown as BattleState,
      },
      uiStore: {
        notify: vi.fn((msg: string, icon: string) => {
          notifications.push({ msg, icon });
        }),
      },
      addLog: vi.fn((msg: string, type: string, source: unknown) => {
        logs.push({ msg, type, source });
      }),
    };

    return { mockCtx, logs, notifications };
  }

  it('drops baby egg with isNpc: true, tint: NPC_EGG_TINT and logs with source npc_egg', () => {
    const gs = useGameStore();
    const { mockCtx, logs, notifications } = createMockBattleContext(gs);

    vi.spyOn(Math, 'random').mockReturnValue(0.005); // Triggers 2% drop rate

    const awarded = handleNpcBabyEggReward(
      mockCtx as unknown as BattleContext,
      mockCtx.activeBattle.value
    );

    expect(awarded).toBe(true);
    expect(gs.state.eggs).toBeDefined();
    expect(gs.state.eggs!.length).toBe(1);

    const egg = gs.state.eggs![0]!;
    expect(egg.isNpc).toBe(true);
    expect(egg.tint).toBe(NPC_EGG_TINT);
    expect(NPC_BABY_POKEMON_POOL).toContain(egg.id);

    // Verifies battle log received 'npc_egg' as source
    expect(logs.length).toBe(1);
    expect(logs[0]!.source).toBe('npc_egg');
    expect(logs[0]!.type).toBe('log-catch');
    expect(logs[0]!.msg).toContain('¡El Entrenador te ha regalado un misterioso Huevo Pokémon!');

    // Verifies UI notification toast
    expect(notifications.length).toBe(1);
    expect(notifications[0]!.msg).toContain('¡Recibiste un Huevo Pokémon (NPC)!');

    vi.restoreAllMocks();
  });

  it('resolves npc_egg to egg asset URL with iconType npc_egg in battleLogger', () => {
    const gs = useGameStore();
    const expectedEggUrl = getAssetUrl(ASSET_TYPES.POKEMON, 'egg');

    // 1. Text source 'npc_egg'
    const logFromText = formatBattleLog(
      '¡El Entrenador te ha regalado un misterioso Huevo Pokémon!',
      'log-catch',
      'npc_egg',
      { gs }
    );

    expect(logFromText.icon).toBe(expectedEggUrl);
    expect(logFromText.iconType).toBe('npc_egg');

    // 2. Object source (PokemonEgg with isNpc: true)
    const logFromObject = formatBattleLog(
      '¡Huevo obtenido!',
      'log-catch',
      { isNpc: true, totalSteps: 300, id: 'pichu' } as unknown as Pokemon,
      { gs }
    );

    expect(logFromObject.icon).toBe(expectedEggUrl);
    expect(logFromObject.iconType).toBe('npc_egg');

    // 3. Regular egg source 'egg'
    const logRegularEgg = formatBattleLog(
      'Huevo normal',
      'log-catch',
      'egg',
      { gs }
    );

    expect(logRegularEgg.icon).toBe(expectedEggUrl);
    expect(logRegularEgg.iconType).toBe('egg');
  });

  it('guarantees egg goes to Mochila (state.eggs) and leaves Daycare Warehouse untouched', () => {
    const gs = useGameStore();
    gs.state.daycareWarehouse = [];
    gs.state.eggs = [];

    const { mockCtx } = createMockBattleContext(gs);

    vi.spyOn(Math, 'random').mockReturnValue(0.001);

    handleNpcBabyEggReward(
      mockCtx as unknown as BattleContext,
      mockCtx.activeBattle.value
    );

    // Mochila has 1 egg (+1 NPC slot)
    expect(gs.state.eggs.length).toBe(1);
    expect(gs.state.eggs[0]!.isNpc).toBe(true);

    // Daycare warehouse (0/30) is completely untouched
    expect(gs.state.daycareWarehouse.length).toBe(0);

    vi.restoreAllMocks();
  });

  it('blocks drop if player already carries 1 NPC egg in Mochila', () => {
    const gs = useGameStore();
    gs.state.eggs = [
      {
        uid: 'existing-npc-egg',
        id: 'togepi',
        steps: 150,
        totalSteps: 200,
        ready: false,
        isNpc: true,
        tint: NPC_EGG_TINT,
      },
    ];

    const { mockCtx, logs } = createMockBattleContext(gs);
    vi.spyOn(Math, 'random').mockReturnValue(0.001);

    const awarded = handleNpcBabyEggReward(
      mockCtx as unknown as BattleContext,
      mockCtx.activeBattle.value
    );

    expect(awarded).toBe(false);
    expect(gs.state.eggs.length).toBe(1);
    expect(logs.length).toBe(0);

    vi.restoreAllMocks();
  });

  it('blocks drop if total carried eggs reach MAX_TOTAL_CARRIED_EGGS (7)', () => {
    const gs = useGameStore();
    gs.state.eggs = Array.from({ length: 7 }, (_, i) => ({
      uid: `egg-${i}`,
      id: 'caterpie',
      steps: 100,
      totalSteps: 100,
      ready: false,
    }));

    const { mockCtx, logs } = createMockBattleContext(gs);
    vi.spyOn(Math, 'random').mockReturnValue(0.001);

    const awarded = handleNpcBabyEggReward(
      mockCtx as unknown as BattleContext,
      mockCtx.activeBattle.value
    );

    expect(awarded).toBe(false);
    expect(gs.state.eggs.length).toBe(7);
    expect(logs.length).toBe(0);

    vi.restoreAllMocks();
  });

  it('hatches NPC baby egg with full wild vigor (3 to 6)', async () => {
    const gs = useGameStore();
    const { mockCtx } = createMockBattleContext(gs);

    vi.spyOn(Math, 'random').mockReturnValue(0.001);

    handleNpcBabyEggReward(
      mockCtx as unknown as BattleContext,
      mockCtx.activeBattle.value
    );

    const egg = gs.state.eggs![0]!;
    expect(egg.isNpc).toBe(true);

    const scheduleSave = vi.fn().mockResolvedValue(undefined);
    const addPokemon = vi.fn((p) => {
      gs.state.team.push(p);
      return { success: true, target: 'team' as const };
    });

    const { executeHatch } = useBreedingActions(gs.state, scheduleSave, addPokemon);
    const hatched = await executeHatch(egg);

    expect(hatched).toBeDefined();
    expect(hatched.maxVigor).toBeGreaterThanOrEqual(3);
    expect(hatched.maxVigor).toBeLessThanOrEqual(6);
    expect(hatched.vigor).toBe(hatched.maxVigor);
    expect(NPC_BABY_POKEMON_POOL).toContain(hatched.id);

    vi.restoreAllMocks();
  });

  it('validates persistence schema parity for state with NPC egg', () => {
    const gs = useGameStore();
    gs.state.eggs = [
      {
        uid: 'test-npc-egg-save',
        id: 'elekid',
        steps: 250,
        totalSteps: 250,
        ready: false,
        isNpc: true,
        tint: NPC_EGG_TINT,
        nature: 'jolly',
        isShiny: false,
      },
    ];

    const serialized = serializeState(gs.state);
    const validationResult = v.safeParse(saveDataSchema, serialized);

    expect(validationResult.success).toBe(true);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${JSON.stringify(validationResult.issues)}`);
    }

    const savedEggs = validationResult.output.eggs;
    expect(savedEggs).toBeDefined();
    expect(savedEggs!.length).toBe(1);
    expect(savedEggs![0]!.isNpc).toBe(true);
    expect(savedEggs![0]!.tint).toBe(NPC_EGG_TINT);
  });
});
