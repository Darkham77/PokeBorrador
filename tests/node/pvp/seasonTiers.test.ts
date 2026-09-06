import { describe, it, expect } from 'vitest';
import {
  getEloTier,
  isAllowedRankGap,
  validateTeamForRanked,
  normalizeRankedRules,
  RANKED_TIERS,
  getSeasonalPrizesForTier
} from '@/logic/pvp/rankedEngine';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('seasonTiers & rankedEngine', () => {
  describe('getEloTier', () => {
    it('correctly classifies ratings into tiers', () => {
      expect(getEloTier(1000).name).toBe('Bronce');
      expect(getEloTier(1199).name).toBe('Bronce');
      expect(getEloTier(1200).name).toBe('Plata');
      expect(getEloTier(1599).name).toBe('Plata');
      expect(getEloTier(1600).name).toBe('Oro');
      expect(getEloTier(2099).name).toBe('Oro');
      expect(getEloTier(2100).name).toBe('Platino');
      expect(getEloTier(2699).name).toBe('Platino');
      expect(getEloTier(2700).name).toBe('Diamante');
      expect(getEloTier(3400).name).toBe('Maestro');
      expect(getEloTier(4000).name).toBe('Maestro');
      expect(RANKED_TIERS.MAESTRO.minElo).toBe(3400);
      expect(RANKED_TIERS.DIAMANTE.minElo).toBe(2700);
    });
  });

  describe('isAllowedRankGap', () => {
    it('allows matches within 1 tier difference', () => {
      // Bronce (1000) vs Plata (1300) -> 1 tier gap -> allowed
      expect(isAllowedRankGap(1000, 1300, 1)).toBe(true);
      // Plata (1300) vs Oro (1700) -> 1 tier gap -> allowed
      expect(isAllowedRankGap(1300, 1700, 1)).toBe(true);
    });

    it('rejects matches exceeding max gap', () => {
      // Bronce (1000) vs Oro (1700) -> 2 tiers gap -> rejected
      expect(isAllowedRankGap(1000, 1700, 1)).toBe(false);
      // Bronce (1000) vs Maestro (3500) -> rejected
      expect(isAllowedRankGap(1000, 3500, 1)).toBe(false);
    });
  });

  describe('validateTeamForRanked', () => {
    const rules = normalizeRankedRules({
      maxPokemon: 6,
      levelCap: 50,
      bannedPokemonIds: ['mewtwo' as any]
    });

    it('validates a compliant team', () => {
      const team: Pokemon[] = [
        { id: 'pikachu', name: 'Pikachu', level: 50, type: 'electric', hp: 100, maxHp: 100, atk: 50, def: 50, spa: 50, spd: 50, spe: 50, moves: [] } as unknown as Pokemon
      ];
      const result = validateTeamForRanked(team, rules);
      expect(result.ok).toBe(true);
    });

    it('rejects a team exceeding maxPokemon', () => {
      const team = new Array(7).fill(null).map((_, i) => ({
        id: 'pikachu', name: `Pika${i}`, level: 50, type: 'electric', hp: 100, maxHp: 100, atk: 50, def: 50, spa: 50, spd: 50, spe: 50, moves: []
      })) as unknown as Pokemon[];

      const result = validateTeamForRanked(team, rules);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('Máximo 6');
    });

    it('rejects a team with a banned pokemon', () => {
      const team: Pokemon[] = [
        { id: 'mewtwo', name: 'Mewtwo', level: 50, type: 'psychic', hp: 100, maxHp: 100, atk: 50, def: 50, spa: 50, spd: 50, spe: 50, moves: [] } as unknown as Pokemon
      ];
      const result = validateTeamForRanked(team, rules);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('está baneado');
    });

    it('rejects a pokemon exceeding levelCap', () => {
      const team: Pokemon[] = [
        { id: 'pikachu', name: 'Pikachu', level: 55, type: 'electric', hp: 100, maxHp: 100, atk: 50, def: 50, spa: 50, spd: 50, spe: 50, moves: [] } as unknown as Pokemon
      ];
      const result = validateTeamForRanked(team, rules);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('supera el nivel máximo');
    });
  });

  describe('getSeasonalPrizesForTier', () => {
    it('returns appropriate rewards scaled by tier', () => {
      const maestroPrize = getSeasonalPrizesForTier('maestro');
      expect(maestroPrize.battleCoins).toBe(500);
      expect(maestroPrize.dungeonTickets).toBeGreaterThanOrEqual(3);
      expect(maestroPrize.pokemonReward?.shiny).toBe(true);

      const diamantePrize = getSeasonalPrizesForTier('diamante');
      expect(diamantePrize.battleCoins).toBe(350);

      const broncePrize = getSeasonalPrizesForTier('bronce');
      expect(broncePrize.battleCoins).toBe(25);
    });
  });
});
