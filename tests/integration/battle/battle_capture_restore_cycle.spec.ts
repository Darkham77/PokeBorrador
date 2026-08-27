import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { makePokemon, validatePokemon } from '@/logic/pokemon/pokemonFactory';
import { handleItemUsage } from '@/logic/battle/battleItems';
import { useGameStore } from '@/stores/game';
import { serializeState } from '@/logic/auth/saveSerializer';
import { restoreBattleState } from '@/logic/battle/orchestratorRestoreHelper';
import { validateAndSanitize } from '@/logic/auth/saveSanitizer';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleContext } from '@/types/battle/battleContext';
import { ref } from 'vue';

vi.mock('@/logic/battle/orchestratorWorkerInitHelper.ts', () => ({
  initWorkerForBattle: vi.fn(async () => {}),
}));

vi.mock('@/logic/utils/gsapHelpers', () => ({
  awaitAnimation: vi.fn(() => Promise.resolve()),
}));

vi.mock('gsap', () => ({
  default: {
    delayedCall: vi.fn((_delay, callback) => {
      if (callback) callback();
      return {
        then: (cb?: () => void) => { if (cb) cb(); },
      };
    }),
  },
}));

describe('Battle Capture and Save Restoration Full Cycle (Integration)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('completes the full cycle: battle save -> restore state -> capture with full team -> sent to PC box -> validate save schema', async () => {
    const gameStore = useGameStore();
    gameStore.state.trainer = 'Ash';
    gameStore.state.starterChosen = true;

    // 1. Prepare full team of 6 Pokemon
    const team: Pokemon[] = [
      makePokemon('pikachu', 10)!,
      makePokemon('bulbasaur', 10)!,
      makePokemon('charmander', 10)!,
      makePokemon('squirtle', 10)!,
      makePokemon('pidgeotto', 10)!,
      makePokemon('butterfree', 10)!,
    ];
    gameStore.state.team = team;
    gameStore.state.box = [];

    const wildEnemy = makePokemon('rattata', 3)!;
    expect(wildEnemy).toBeDefined();

    // 2. Active battle state
    gameStore.state.activeBattle = {
      isGym: false,
      gymId: null,
      isTrainer: false,
      trainerName: null,
      locationId: 'route1',
      over: false,
      turnCount: 1,
      player: team[0],
      enemy: wildEnemy,
      enemyTeam: [wildEnemy],
      playerTeam: team,
      playerTeamIndex: 0,
      enemyTeamIndex: 0,
      timestamp: Date.now(),
    } as unknown as typeof gameStore.state.activeBattle;

    // 3. Serialize game state (simulates saving to localStorage/Supabase mid-battle)
    const serialized = serializeState(gameStore.state);
    expect(serialized.activeBattle).toBeDefined();
    expect(serialized.activeBattle?.enemyTeam).toBeDefined();
    expect(serialized.activeBattle?.enemyTeam?.[0]?.species).toBe('rattata');

    // 4. Reset in-memory battle and simulate page refresh / state restoration
    const activeBattleRef = ref(null);
    const mockFsm = {
      transition: vi.fn(async () => {}),
    };

    const mockCtx = {
      activeBattle: activeBattleRef,
      playerStages: ref({}),
      enemyStages: ref({}),
      battleLogs: ref([]),
      isProcessing: ref(false),
      BATTLE_STATES: { EXIT_BATTLE: 'EXIT_BATTLE', ACTIVE_BATTLE: 'ACTIVE_BATTLE' },
      BATTLE_SUBSTATES: { WAIT_INPUT: 'WAIT_INPUT' },
      fsm: mockFsm,
      gs: {
        state: gameStore.state,
      },
    } as unknown as BattleContext;

    await restoreBattleState(mockCtx, serialized.activeBattle);

    expect(activeBattleRef.value).not.toBeNull();
    const restoredBattle = activeBattleRef.value as unknown as { enemy: Pokemon; _initialEnemy: Pokemon };
    expect(restoredBattle.enemy).toBeDefined();
    expect(restoredBattle.enemy.species).toBe('rattata');
    expect(restoredBattle._initialEnemy).toBeDefined();

    // 5. Player throws a Pokeball and captures the restored enemy
    const dummyOptions = {
      eventStore: {} as never,
      addLog: () => {},
      audio: {} as never,
      consumeItem: () => {},
      ctx: mockCtx,
      fsm: mockFsm as never,
      itemId: 'masterball' as const,
    };

    const captureResult = await handleItemUsage('masterball', team[0]!, restoredBattle.enemy!, dummyOptions);
    expect(captureResult.action).toBe('capture');
    expect(captureResult.pokemon).toBeDefined();

    const capturedPokemon = captureResult.pokemon as Pokemon;
    expect(capturedPokemon.species).toBe('rattata');
    expect(() => validatePokemon(capturedPokemon)).not.toThrow();

    // 6. Add captured Pokemon to gameStore (routes to box because team has 6 Pokemon)
    const addResult = gameStore.addPokemon(capturedPokemon, { notify: false });
    expect(addResult.target).toBe('box');
    expect(gameStore.state.box.length).toBe(1);
    expect(gameStore.state.box[0]?.species).toBe('rattata');

    // 7. Sanitize and validate entire save state payload
    const saveValidation = validateAndSanitize(gameStore.state);
    expect(saveValidation.error).toBeUndefined();
    expect(saveValidation.valid).toBe(true);
  });
});
