/**
 * tests/node/auditors/validate_pokemon.test.ts
 *
 * Dedicated unit test suite for PokemonDbAuditor:
 * - Validates Pokemon base stats, types, and species against Showdown Dex
 * - Asserts learnset integrity and canonical database contracts
 * - Asserts clean execution on repository data
 */

import { describe, it, expect } from 'vitest';
import {
  PokemonDbAuditor,
  POKEMON_DB_RULES,
  type PokemonDbRuleId
} from '../../../scripts/auditors/domain_data/validate_pokemon.ts';

describe('PokemonDbAuditor', () => {
  describe('Metadata & Configuration', () => {
    it('initializes with correct auditor ID and domain_data family', () => {
      const auditor = new PokemonDbAuditor();
      expect(auditor.id).toBe('validate_pokemon');
      expect(auditor.family).toBe('domain_data');
      expect(auditor.description.length).toBeLessThanOrEqual(60);
    });

    it('declares all expected canonical rules in POKEMON_DB_RULES', () => {
      const expectedRules: PokemonDbRuleId[] = [
        'pokemon-invalid-species',
        'pokemon-base-stat-mismatch',
        'pokemon-type-mismatch',
        'pokemon-invalid-learnset-move',
        'pokemon-missing-learnset'
      ];

      for (const rule of expectedRules) {
        expect(POKEMON_DB_RULES).toContain(rule);
      }
      expect(POKEMON_DB_RULES).toHaveLength(expectedRules.length);
    });
  });

  describe('Rule Coverage & Invariant Assertions', () => {
    it('covers all declared pokemon db rules in auditor', () => {
      const auditor = new PokemonDbAuditor();
      const rules: PokemonDbRuleId[] = [
        'pokemon-invalid-species',
        'pokemon-base-stat-mismatch',
        'pokemon-type-mismatch',
        'pokemon-invalid-learnset-move',
        'pokemon-missing-learnset'
      ];

      for (const rule of rules) {
        expect(auditor.ruleIds).toContain(rule);
      }
    });
  });

  describe('Clean Execution Verification', () => {
    it('executes cleanly with zero errors on repository dataset', async () => {
      const auditor = new PokemonDbAuditor();
      const result = await auditor.execute();

      expect(result.summary.errors).toBe(0);
      expect(result.status).toBe('passed');
      expect(result.metrics['Enabled Pokemon validated']).toBeGreaterThan(0);
    });
  });
});
