/**
 * tests/node/hatch_auras.test.ts
 *
 * NATIVE NODE.JS TEST (Node.js 26+)
 *
 * Tests the aura style generation in src/logic/breeding/hatchAuras.ts.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getAuraStyles } from '../../src/logic/breeding/hatchAuras.ts';
import type { Pokemon } from '../../src/types/pokemon.ts';

interface MockPokemon {
  type: string;
  isShiny?: boolean;
  isGuardian?: boolean;
}

describe('hatchAuras - getAuraStyles', () => {
  const flare1 = 'url1';
  const flare2 = 'url2';

  it('should return default cyan/blue colors when pokemon is null', () => {
    const styles = getAuraStyles(null, flare1, flare2);
    assert.strictEqual(styles['--flare-1-url'], "url('url1')");
    assert.strictEqual(styles['--flare-2-url'], "url('url2')");
    assert.strictEqual(styles['--aura-color-1'], 'rgba(0, 255, 255, 0.85)');
    assert.strictEqual(styles['--aura-color-2'], 'rgba(0, 190, 255, 0.75)');
  });

  it('should return correct type colors for normal type pokemon', () => {
    const p: MockPokemon = { type: 'normal' };
    const styles = getAuraStyles(p as unknown as Pokemon, flare1, flare2);
    assert.strictEqual(styles['--aura-color-1'], 'rgba(168, 168, 120, 0.95)');
    assert.strictEqual(styles['--aura-color-2'], 'rgba(120, 120, 90, 0.8)');
  });

  it('should return gold/orange colors for shiny pokemon', () => {
    const p: MockPokemon = { type: 'fire', isShiny: true };
    const styles = getAuraStyles(p as unknown as Pokemon, flare1, flare2);
    assert.strictEqual(styles['--aura-color-1'], 'rgba(255, 215, 0, 0.95)');
    assert.strictEqual(styles['--aura-color-2'], 'rgba(255, 140, 0, 0.85)');
  });

  it('should return white/silver colors for guardian pokemon', () => {
    const p: MockPokemon = { type: 'water', isGuardian: true };
    const styles = getAuraStyles(p as unknown as Pokemon, flare1, flare2);
    assert.strictEqual(styles['--aura-color-1'], 'rgba(255, 255, 255, 0.95)');
    assert.strictEqual(styles['--aura-color-2'], 'rgba(173, 216, 230, 0.85)');
  });
});
