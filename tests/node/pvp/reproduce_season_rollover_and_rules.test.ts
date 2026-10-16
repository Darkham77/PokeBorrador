/**
 * tests/node/pvp/reproduce_season_rollover_and_rules.test.ts
 *
 * Tier 1 Reproduction Test Suite for:
 * 1. Season rollover medal persistence in GameState.rankedMedals.
 * 2. Active season rules expiration & fallback to monthly theme (Halloween Spook types).
 * 3. Passive defense team validation against October theme rules (ghost, dark, poison).
 */

import { describe, it, expect } from 'vite-plus/test';
import { checkAndResolveSeasonEnd } from '@/logic/pvp/rankedSeasonRewardEngine.ts';
import { fetchActiveSeasonRules, findInvalidDefendingPokemon } from '@/stores/pvpDataHelper.ts';
import { INITIAL_STATE } from '@/stores/gameInitialState.ts';
import type { GameState } from '@/types/system/game.ts';
import type { Pokemon } from '@/types/pokemon/pokemon.ts';
import type { DBRouter } from '@/logic/db/dbRouter.ts';

describe('Reproduction: Season Rollover, Rewards & Active Rules', () => {
  describe('Bug 1: Commemorative Medal Persistence in GameState.rankedMedals', () => {
    it('persists commemorative medal directly in gameState.rankedMedals upon season resolution', () => {
      const state: GameState = {
        ...INITIAL_STATE,
        lastResolvedSeasonId: 'johto_kanto_frontier',
        eloRating: 1072,
        rankedMaxElo: 1072,
        rankedRewardsClaimed: ['bronce_1000'],
        rankedMedals: []
      };

      const result = checkAndResolveSeasonEnd(state, 10); // Month 10: October (Halloween)

      expect(result.resolved).toBe(true);
      expect(result.previousSeasonName).toBe('Frontera Kanto & Johto');
      expect(result.tier).toBe('bronce');
      expect(result.medal).not.toBeNull();

      // RED ASSERTION: The medal MUST be stored in state.rankedMedals
      expect(state.rankedMedals).toBeDefined();
      expect(state.rankedMedals?.length).toBe(1);
      expect(state.rankedMedals?.[0]?.seasonName).toBe('Frontera Kanto & Johto');
      expect(state.rankedMedals?.[0]?.tier).toBe('bronce');
    });
  });

  describe('Bug 2: Active Season Rules & Halloween Spook Restrictions', () => {
    it('detects stale ranked_rules_config (expired or from past month) and returns current month theme rules', async () => {
      // Mock DB returning the exact stale row currently in database/migrations/20260907040000
      const mockStaleDb = {
        from: (table: string) => {
          if (table === 'ranked_rules_config') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: 'current',
                      season_name: 'Frontera Kanto & Johto',
                      config: {
                        name: 'Frontera Kanto & Johto',
                        maxPokemon: 6,
                        levelCap: 50,
                        allowedTypes: [],
                        bannedPokemonIds: []
                      }
                    }
                  })
                })
              })
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        }
      } as unknown as DBRouter;

      const rules = await fetchActiveSeasonRules(mockStaleDb);

      expect(rules).not.toBeNull();
      // RED ASSERTION: Since we are in October (Halloween), the stale September rules MUST be discarded
      expect(rules?.name).toBe('Noche de Brujas');
      expect(rules?.allowedTypes).toEqual(['ghost', 'dark', 'poison']);
    });

    it('rejects defending team with non-Halloween types when October theme is active', () => {
      const halloweenRules = {
        name: 'Noche de Brujas',
        levelCap: 50,
        maxPokemon: 6,
        allowedTypes: ['ghost', 'dark', 'poison'],
        bannedPokemonIds: []
      };

      // Mock Rhydon (ground/rock) from user screenshot
      const rhydon = {
        id: 'rhydon',
        name: 'Rhydon',
        level: 50,
        type: 'ground',
        type2: 'rock'
      } as unknown as Pokemon;

      // Mock Gengar (ghost/poison)
      const gengar = {
        id: 'gengar',
        name: 'Gengar',
        level: 50,
        type: 'ghost',
        type2: 'poison'
      } as unknown as Pokemon;

      const invalid = findInvalidDefendingPokemon([rhydon, gengar], halloweenRules);
      expect(invalid).not.toBeNull();
      expect(invalid?.mon.name).toBe('Rhydon');
    });
  });
});
