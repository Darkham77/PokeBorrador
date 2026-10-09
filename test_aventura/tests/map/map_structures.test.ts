/**
 * tests/node/map/map_structures.test.ts
 *
 * Tier 1 Unit Test: Validates canonical multitile structure templates integrity,
 * footprint dimensions, and local collision masks.
 */

import { describe, it, expect } from 'vitest';
import {
  STRUCTURE_TEMPLATES,
  KANTO_HOUSE_SMALL,
  POKEMART,
  POKEMON_CENTER,
  getStructureTemplate,
  getStructureTemplatesByTheme,
  type StructureTemplate
} from '../../../src/config/mapStructures.ts';

describe('Map Structure Templates & Multitile Stamping System', () => {
  const templates: StructureTemplate[] = [
    KANTO_HOUSE_SMALL,
    POKEMART,
    POKEMON_CENTER
  ];

  it('verifies all registered templates match their footprint dimensions exactly', () => {
    for (const tmpl of templates) {
      const { width, height } = tmpl.footprint;

      // Check tile matrix
      expect(tmpl.tiles.length, `${tmpl.id} rows must equal height`).toBe(height);
      for (let r = 0; r < height; r++) {
        expect(tmpl.tiles[r]?.length, `${tmpl.id} row ${r} cols must equal width`).toBe(width);
      }

      // Check collision mask
      expect(tmpl.collisionMask.length, `${tmpl.id} collision rows must equal height`).toBe(height);
      for (let r = 0; r < height; r++) {
        expect(tmpl.collisionMask[r]?.length, `${tmpl.id} collision row ${r} cols must equal width`).toBe(width);
      }
    }
  });

  it('validates collision masks values are strictly 0, 1, or 2', () => {
    const validValues = new Set([0, 1, 2]);

    for (const tmpl of templates) {
      for (const row of tmpl.collisionMask) {
        for (const col of row) {
          expect(validValues.has(col)).toBe(true);
        }
      }
    }
  });

  it('verifies that every structure has at least one walkable entrance door (col = 0)', () => {
    for (const tmpl of templates) {
      const flatCollisions = tmpl.collisionMask.flat();
      const hasDoor = flatCollisions.includes(0);
      expect(hasDoor, `${tmpl.id} must have a walkable entrance door`).toBe(true);
    }
  });

  it('retrieves templates via registry helper functions O(1)', () => {
    expect(Object.keys(STRUCTURE_TEMPLATES).length).toBeGreaterThanOrEqual(3);
    expect(getStructureTemplate('pokemon_center')).toBe(POKEMON_CENTER);
    expect(getStructureTemplate('pokemart')).toBe(POKEMART);
    expect(getStructureTemplate('kanto_house_small')).toBe(KANTO_HOUSE_SMALL);
    expect(getStructureTemplate('non_existent_structure')).toBeUndefined();

    const fireredTemplates = getStructureTemplatesByTheme('firered');
    expect(fireredTemplates.length).toBeGreaterThanOrEqual(3);
  });
});
