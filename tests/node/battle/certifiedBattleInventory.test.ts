import { describe, expect, it } from 'vitest';
import { createCertifiedBattleInventory } from '../../../scripts/e2e/fuzzer/core/certifiedBattleInventory.ts';

describe('createCertifiedBattleInventory', () => {
  it('includes every certified bag action item in the initialized inventory', () => {
    expect(createCertifiedBattleInventory(['antidote', 'revive'], 99)).toEqual({
      antidote: 99,
      revive: 99,
    });
  });
});
