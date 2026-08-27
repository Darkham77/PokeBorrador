import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { makePokemon, validatePokemon } from '@/logic/pokemon/pokemonFactory';
import { handleItemUsage } from '@/logic/battle/battleItems';
import { useGameStore } from '@/stores/game';
import { validateAndSanitize } from '@/logic/auth/saveSanitizer';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleContext } from '@/types/battle/battleContext';
import { ref } from 'vue';

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

describe('Battle Capture Save Integrity (Unit)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

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
    expect(captured.species).toBe('rattata');
    expect(captured.caught).toBe(true);

    // Validate that volatile combat properties were cleaned
    expect(captured.lastMove).toBeUndefined();
    expect(captured.choiceMove).toBeUndefined();
    expect(captured.chargingMove).toBeUndefined();

    // Must pass domain factory validation
    expect(() => validatePokemon(captured)).not.toThrow();

    // Add to game storage
    gameStore.addPokemon(captured, { notify: false });

    // Validate entire GameState save payload with Valibot
    const sanitizeResult = validateAndSanitize(gameStore.state);
    expect(sanitizeResult.valid).toBe(true);
    if (!sanitizeResult.valid) {
      expect.fail(`Save sanitization failed: ${sanitizeResult.error}`);
    }
  });

  it('captures a restored enemy Pokemon that was missing vigor and generates valid breeding vigor without crashing validatePokemon', async () => {
    const gameStore = useGameStore();
    gameStore.state.trainer = 'Ash';
    gameStore.state.starterChosen = true;

    const playerMon = makePokemon('charmander', 10)!;
    const wildMon = makePokemon('rattata', 3)!;

    // Simulate restored enemy from legacy battle without vigor
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
