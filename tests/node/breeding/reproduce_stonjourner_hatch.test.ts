import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import { inheritMoves } from '@/logic/breeding/breedingEngine';
import { checkPokemonLegality } from '@/logic/pokemon/pokemonLegality';
import { validateAndSanitize } from '@/logic/auth/saveSanitizer';
import { useBreedingActions } from '@/stores/game/actions/breedingActions';
import type { GameState } from '@/types/system/game';
import type { Pokemon, PokemonEgg } from '@/types/pokemon/pokemon';
import type { SaveDataDto } from '@/logic/validation/schemas';

describe('Stonjourner & Unreleased Pokemon in Debug Mode / Breeding', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    if (typeof globalThis.window === 'undefined') {
      (globalThis as unknown as { window: unknown }).window = globalThis;
    }
  });

  afterEach(() => {
    if (typeof globalThis.window !== 'undefined') {
      delete (globalThis.window as { __VITE_DEBUG__?: unknown }).__VITE_DEBUG__;
    }
  });

  it('inheritMoves does not assign high level-up moves to baby at level 1 if not an egg move or TM', () => {
    // Both parents have wideguard (level 48 move for Stonjourner)
    const pA: Partial<Pokemon> = {
      id: 'stonjourner',
      level: 50,
      moves: [
        { id: 'wideguard', name: 'Vastaguardia', pp: 10, maxPP: 10, type: 'rock', power: 0, acc: 100, cat: 'status' }
      ]
    };
    const pB: Partial<Pokemon> = {
      id: 'stonjourner',
      level: 50,
      moves: [
        { id: 'wideguard', name: 'Vastaguardia', pp: 10, maxPP: 10, type: 'rock', power: 0, acc: 100, cat: 'status' }
      ]
    };

    const inherited = inheritMoves(pA as Pokemon, pB as Pokemon, 'stonjourner');
    // Wideguard is 9L48, not a TM, not an egg move for Stonjourner. It should NOT be inherited at Lv 1.
    expect(inherited).not.toContain('wideguard');
  });

  it('allows hatching an egg of an unreleased Pokemon (Stonjourner) when debug mode is active', async () => {
    // Simulate debug mode
    (globalThis.window as { __VITE_DEBUG__?: unknown }).__VITE_DEBUG__ = {};

    const egg: PokemonEgg = {
      uid: 'egg-stonjourner-1',
      id: 'stonjourner',
      steps: 0,
      totalSteps: 250,
      ready: true,
      movesAtBirth: ['rockthrow', 'block']
    };

    const mockState: Partial<GameState> = {
      eggs: [egg],
      team: [],
      box: [],
      playerClass: 'entrenador'
    };

    const breedingActions = useBreedingActions(
      mockState as GameState,
      async () => {},
      (p) => {
        mockState.team?.push(p);
        return { success: true, target: 'team' };
      }
    );

    const hatched = await breedingActions.executeHatch(egg);
    expect(hatched).toBeDefined();
    expect(hatched.id).toBe('stonjourner');
    expect(hatched.level).toBe(1);
    expect(hatched.moves.length).toBeGreaterThan(0);
  });

  it('allows hatching an unreleased Pokemon even if movesAtBirth had an arbitrary move when debug mode is active', async () => {
    (globalThis.window as { __VITE_DEBUG__?: unknown }).__VITE_DEBUG__ = {};

    const egg: PokemonEgg = {
      uid: 'egg-stonjourner-wideguard',
      id: 'stonjourner',
      steps: 0,
      totalSteps: 250,
      ready: true,
      movesAtBirth: ['wideguard']
    };

    const mockState: Partial<GameState> = {
      eggs: [egg],
      team: [],
      box: [],
      playerClass: 'entrenador'
    };

    const breedingActions = useBreedingActions(
      mockState as GameState,
      async () => {},
      (p) => {
        mockState.team?.push(p);
        return { success: true, target: 'team' };
      }
    );

    const hatched = await breedingActions.executeHatch(egg);
    expect(hatched).toBeDefined();
    expect(hatched.id).toBe('stonjourner');
    expect(hatched.moves.some(m => m?.id === 'wideguard')).toBe(true);
  });

  it('validates and sanitizes save data containing unreleased Pokemon when debug mode is active', () => {
    (globalThis.window as { __VITE_DEBUG__?: unknown }).__VITE_DEBUG__ = {};

    const testPokemon = makePokemon('stonjourner', 10, { bypassWhitelist: true });
    expect(testPokemon).not.toBeNull();

    const legality = checkPokemonLegality(testPokemon);
    expect(legality.isLegal).toBe(true);

    const validBaseSave = {
      trainer: 'Franco',
      gender: 'h',
      badges: 8,
      balls: 5,
      money: 1000,
      battleCoins: 50,
      trainerLevel: 14,
      trainerExp: 100,
      trainerExpNeeded: 200,
      inventory: { pokeball: 5, potion: 2 },
      team: [testPokemon!],
      box: [],
      eggs: [],
      pokedex: ['stonjourner'],
      seenPokedex: ['stonjourner'],
      defeatedGyms: ['pewter'],
      starterChosen: true,
      eloRating: 1000,
      pvpStats: { wins: 0, losses: 0, draws: 0 },
      rankedMaxElo: 1000,
      passiveTeamActive: false,
      daycare_mission_refreshes: 3,
      boxCount: 4,
      classLevel: 1,
      classXP: 0,
      classData: {
        captureStreak: 0,
        longestStreak: 0,
        reputation: 0,
        blackMarketSales: 0,
        criminality: 0,
        kitCaptures: 0
      },
      warCoins: 0,
      warCoinsSpent: 0,
      lastPokemonCenterHeal: 0,
      playtime: 120
    } as unknown as SaveDataDto;

    const result = validateAndSanitize(validBaseSave);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.team?.[0]?.id).toBe('stonjourner');
      expect((result.data.team?.[0] as Pokemon)?.isIllegal).toBeFalsy();
    }
  });
});
