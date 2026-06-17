/**
 * tests/node/pokemon_utils.test.ts
 *
 * NATIVE NODE.JS TEST (Node.js 26+)
 *
 * Tests pure utility functions from src/logic/pokemonUtils.ts.
 * getTypeEffectivenessMsg and getMoveDescription are nearly-pure functions:
 *   - getTypeEffectivenessMsg: fully pure (no deps)
 *   - getMoveDescription: pure when `md` is passed explicitly (avoids provider call)
 *
 * Pattern: pass all data inline — zero mocks required.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  getTypeEffectivenessMsg,
  getMoveDescriptionPure,
} from '../../../src/logic/pokemon/pokemonMath.ts';

import type { MoveBaseData } from '../../../src/types/system/database.ts';

// ── getTypeEffectivenessMsg ───────────────────────────────────────────────────

describe('getTypeEffectivenessMsg', () => {
  it('returns "¡No afecta!" for 0x multiplier', () => {
    assert.strictEqual(getTypeEffectivenessMsg(0), '¡No afecta!');
  });

  it('returns "¡Es muy eficaz!" for 2x', () => {
    assert.strictEqual(getTypeEffectivenessMsg(2), '¡Es muy eficaz!');
  });

  it('returns "¡Es muy eficaz!" for 4x', () => {
    assert.strictEqual(getTypeEffectivenessMsg(4), '¡Es muy eficaz!');
  });

  it('returns "No es muy eficaz..." for 0.5x', () => {
    assert.strictEqual(getTypeEffectivenessMsg(0.5), 'No es muy eficaz...');
  });

  it('returns "No es muy eficaz..." for 0.25x', () => {
    assert.strictEqual(getTypeEffectivenessMsg(0.25), 'No es muy eficaz...');
  });

  it('returns null for 1x (neutral)', () => {
    assert.strictEqual(getTypeEffectivenessMsg(1), null);
  });
});

// ── getMoveDescription ────────────────────────────────────────────────────────
// All cases pass `md` explicitly → pokemonDataProvider is never called

describe('getMoveDescription (with explicit MoveBaseData)', () => {
  it('status move returns the status description', () => {
    const md = { cat: 'status' } as unknown as MoveBaseData;
    assert.strictEqual(
      getMoveDescriptionPure('growl', md),
      'Un movimiento que causa un efecto de estado o alteración.',
    );
  });

  it('selfKO move description mentions debilita', () => {
    const md = { selfKO: true, power: 250, cat: 'physical' } as unknown as MoveBaseData;
    assert.ok(getMoveDescriptionPure('explosion', md).includes('debilita'));
  });

  it('recoil move mentions retroceso', () => {
    const md = { recoil: 0.25, cat: 'physical', power: 80 } as unknown as MoveBaseData;
    assert.ok(getMoveDescriptionPure('take-down', md).includes('retroceso'));
  });

  it('drain move (non-status) mentions Restaura', () => {
    const md = { drain: 0.5, cat: 'special', power: 75 } as unknown as MoveBaseData;
    assert.ok(getMoveDescriptionPure('mega-drain', md).includes('Restaura'));
  });

  it('burn_10 effect returns correct string', () => {
    const md = { effect: 'burn_10', cat: 'special', power: 40 } as unknown as MoveBaseData;
    assert.ok(getMoveDescriptionPure('ember', md).includes('quemar'));
  });

  it('poison effect returns correct string', () => {
    const md = { effect: 'poison', cat: 'special', power: 65 } as unknown as MoveBaseData;
    assert.ok(getMoveDescriptionPure('sludge-bomb', md).includes('Envenena'));
  });

  it('priority move mentions primero', () => {
    const md = { priority: 1, cat: 'physical', power: 40 } as unknown as MoveBaseData;
    assert.ok(getMoveDescriptionPure('quick-attack', md).includes('primero'));
  });

  it('OHKO move description mentions Fulmina', () => {
    const md = { ohko: true, cat: 'physical', power: 0 } as unknown as MoveBaseData;
    assert.ok(getMoveDescriptionPure('fissure', md).includes('Fulmina'));
  });

  it('move with no effect returns default physical description', () => {
    const md = { cat: 'physical', power: 40 } as unknown as MoveBaseData;
    const result = getMoveDescriptionPure('tackle', md);
    assert.ok(
      result.includes('Causa daño'),
      `Expected default damage description, got: "${result}"`,
    );
  });
});
