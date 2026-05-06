/**
 * tests/unit/ranked.spec.js
 * Unit tests for Ranked PvP logic.
 */
import { describe, it, expect } from 'vitest';
import { 
  getEloTier, 
  isAllowedRankGap, 
  normalizeRankedRules, 
  validatePokemonForRanked 
} from '@/logic/pvp/rankedEngine';

describe('Ranked Engine', () => {
  it('should return correct tiers for ELO', () => {
    expect(getEloTier(1000).name).toBe('Bronce');
    expect(getEloTier(1250).name).toBe('Plata');
    expect(getEloTier(1650).name).toBe('Oro');
    expect(getEloTier(2200).name).toBe('Platino');
    expect(getEloTier(2800).name).toBe('Diamante');
    expect(getEloTier(3500).name).toBe('Maestro');
  });

  it('should validate allowed rank gaps (Max Gap = 1)', () => {
    expect(isAllowedRankGap(1000, 1300)).toBe(true);  // Bronce vs Plata
    expect(isAllowedRankGap(1000, 1700)).toBe(false); // Bronce vs Oro
    expect(isAllowedRankGap(2700, 3500)).toBe(true);  // Diamante vs Maestro
    expect(isAllowedRankGap(1000, 3500)).toBe(false); // Bronce vs Maestro
  });

  it('should normalize rules correctly', () => {
    const raw = {
      maxPokemon: 3,
      levelCap: 50,
      allowedTypes: ['Fire', 'WATER'],
      bannedPokemonIds: ['MEWTWO']
    };
    const rules = normalizeRankedRules(raw, 'Test Season');
    
    expect(rules.maxPokemon).toBe(3);
    expect(rules.levelCap).toBe(50);
    expect(rules.allowedTypes).toContain('fire');
    expect(rules.bannedPokemonIds).toContain('mewtwo');
  });

  it('should validate pokemon against rules', () => {
    const rules = {
      levelCap: 50,
      allowedTypes: ['fire'],
      bannedPokemonIds: ['charizard']
    };

    const okPonyta = { id: 'ponyta', name: 'Ponyta', level: 20, type: ['fire'] };
    const overLeveled = { id: 'ponyta', level: 51, type: ['fire'] };
    const wrongType = { id: 'staryu', level: 20, type: ['water'] };
    const banned = { id: 'charizard', name: 'Charizard', level: 40, type: ['fire'] };

    expect(validatePokemonForRanked(okPonyta, rules).ok).toBe(true);
    expect(validatePokemonForRanked(overLeveled, rules).ok).toBe(false);
    expect(validatePokemonForRanked(wrongType, rules).ok).toBe(false);
    expect(validatePokemonForRanked(banned, rules).ok).toBe(false);
  });
});
