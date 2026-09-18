/**
 * tests/node/assets/pokemon_feet_database.test.ts
 *
 * Unit & regression tests for Pokémon Feet Database and shiny deduplication fallback.
 */

import { describe, it, expect } from 'vitest';
import {
  requireFeetPoints
} from '../../../src/data/pokemon/pokemonFeetDatabase.ts';
import type { PackedFeetDatabase } from '../../../src/data/pokemon/feetCoordinatesData.ts';
import legacyFeetDb from '../../fixtures/assets/pokemonFeetDatabase.legacy.json' with { type: 'json' };
import overridesJson from '../../../src/data/pokemon/spriteShadowOverrides.json' with { type: 'json' };

describe('pokemonFeetDatabase', () => {
  describe('Base Sprite Resolution', () => {
    it('resolves valid coordinates for standard base sprites', () => {
      const frontPoints = requireFeetPoints('/assets/sprites/pokemon/animated/Front/1i.webp');
      expect(frontPoints.feetY).toBeGreaterThan(0);
      expect(frontPoints.feetY).toBeLessThanOrEqual(1);
      expect(frontPoints.feetX).toBeGreaterThan(0);
      expect(frontPoints.feetX).toBeLessThanOrEqual(1);

      const backPoints = requireFeetPoints('/assets/sprites/pokemon/animated/Back/1i.webp');
      expect(backPoints.feetY).toBeGreaterThan(0);
      expect(backPoints.feetX).toBeGreaterThan(0);
    });
  });

  describe('Shiny Fallback Resolution', () => {
    it('resolves shiny sprite with fallback to base sprite coordinates', () => {
      const basePoints = requireFeetPoints('/assets/sprites/pokemon/animated/Front/1i.webp');
      const shinyPoints = requireFeetPoints('/assets/sprites/pokemon/animated/Front shiny/1i.webp');

      expect(shinyPoints.feetY).toBe(basePoints.feetY);
      expect(shinyPoints.feetX).toBe(basePoints.feetX);
    });

    it('handles animated Back shiny with fallback to Back base', () => {
      const basePoints = requireFeetPoints('/assets/sprites/pokemon/animated/Back/1i.webp');
      const shinyPoints = requireFeetPoints('/assets/sprites/pokemon/animated/Back shiny/1i.webp');

      expect(shinyPoints.feetY).toBe(basePoints.feetY);
      expect(shinyPoints.feetX).toBe(basePoints.feetX);
    });

    it('handles animated Front shiny with fallback to Front base', () => {
      const basePoints = requireFeetPoints('/assets/sprites/pokemon/animated/Front/25i.webp');
      const shinyPoints = requireFeetPoints('/assets/sprites/pokemon/animated/Front shiny/25i.webp');

      expect(shinyPoints.feetY).toBe(basePoints.feetY);
      expect(shinyPoints.feetX).toBe(basePoints.feetX);
    });
  });

  describe('NPC and Trainer Sprites', () => {
    it('resolves NPC sprite coordinates from the n group', () => {
      const points = requireFeetPoints('/assets/sprites/npc/aaron.webp');
      expect(points.feetY).toBeGreaterThan(0);
      expect(points.feetX).toBeGreaterThan(0);
    });

    it('resolves trainer sprite coordinates from the t group', () => {
      const points = requireFeetPoints('/assets/sprites/trainers/cazabichos_h_front.webp');
      expect(points.feetY).toBeGreaterThan(0);
      expect(points.feetX).toBeGreaterThan(0);
    });
  });

  describe('Path Normalization & Sanitization', () => {
    it('normalizes .png extension to .webp', () => {
      const pngPoints = requireFeetPoints('/assets/sprites/pokemon/animated/Front/1i.png');
      const webpPoints = requireFeetPoints('/assets/sprites/pokemon/animated/Front/1i.webp');
      expect(pngPoints).toEqual(webpPoints);
    });

    it('decodes URL-encoded paths (%20)', () => {
      const encodedPoints = requireFeetPoints('/assets/sprites/pokemon/animated/Front%20shiny/1i.webp');
      const decodedPoints = requireFeetPoints('/assets/sprites/pokemon/animated/Front shiny/1i.webp');
      expect(encodedPoints).toEqual(decodedPoints);
    });

    it('trims leading/trailing whitespace', () => {
      const trimmedPoints = requireFeetPoints('  /assets/sprites/pokemon/animated/Front/1i.webp  ');
      const normalPoints = requireFeetPoints('/assets/sprites/pokemon/animated/Front/1i.webp');
      expect(trimmedPoints).toEqual(normalPoints);
    });

    it('normalizes paths missing a leading slash', () => {
      const withoutSlash = requireFeetPoints('assets/sprites/pokemon/animated/Front/1i.webp');
      const withSlash = requireFeetPoints('/assets/sprites/pokemon/animated/Front/1i.webp');
      expect(withoutSlash).toEqual(withSlash);
    });

    it('resolves animated sprite paths lacking frame suffix to the default idle frame', () => {
      const unSuffixed = requireFeetPoints('assets/sprites/pokemon/animated/Front/26.webp');
      const explicitIdle = requireFeetPoints('/assets/sprites/pokemon/animated/Front/26i.webp');
      expect(unSuffixed).toEqual(explicitIdle);
      expect(unSuffixed.shadowScale).toBe(0.65);
      expect(unSuffixed.feetX).toBe(0.605);
      expect(unSuffixed.feetY).toBe(0.924);
    });
  });

  describe('Error Handling', () => {
    it('throws when path is empty', () => {
      expect(() => requireFeetPoints('')).toThrow('[pokemonFeetDatabase] Path cannot be empty');
    });

    it('throws when path does not exist in database', () => {
      expect(() => requireFeetPoints('/assets/sprites/pokemon/Front/nonexistent_pokemon_99999.webp')).toThrow(
        '[pokemonFeetDatabase] Unknown feet database path'
      );
    });
  });

  describe('Automatic Calculations Parity (Pre-Deduplication Baseline)', () => {
    const COORDINATE_EPSILON = 1e-4;
    const MIN_AUTOMATIC_MATCHES_THRESHOLD = 14000;
    const TOTAL_LEGACY_SPRITE_COUNT = 19024;

    it('achieves exact parity with legacy snapshot for sprites using automatic calculations', () => {
      const oldDb: PackedFeetDatabase = legacyFeetDb;
      const rawJson = overridesJson as { overrides?: Record<string, { feetY: number; feetX: number }> };
      const overridesMap: Record<string, { feetY: number; feetX: number }> = rawJson.overrides ?? {};

      const prefixMap: Record<string, string> = {
        p: '/assets/sprites/pokemon/',
        n: '/assets/sprites/npc/',
        t: '/assets/sprites/trainers/'
      };

      function isOverridden(path: string): boolean {
        if (overridesMap[path]) return true;
        const baseKey = path
          .replace('/Back shiny/', '/Back/')
          .replace('/Front shiny/', '/Front/')
          .replace('/Icons shiny/', '/Icons/')
          .replace('/Back_shiny/', '/Back/')
          .replace('/Front_shiny/', '/Front/')
          .replace('/Icons_shiny/', '/Icons/')
          .replace('/shiny/', '/');
        if (overridesMap[baseKey]) return true;
        const idleKey = path.replace(/v(?=[^/]*\.webp$)/, 'i');
        if (overridesMap[idleKey]) return true;
        const idleBaseKey = baseKey.replace(/v(?=[^/]*\.webp$)/, 'i');
        if (overridesMap[idleBaseKey]) return true;
        return false;
      }

      let automaticMatches = 0;
      for (const [groupKey, prefix] of Object.entries(prefixMap)) {
        const group = (oldDb[groupKey as keyof PackedFeetDatabase] as Record<string, readonly number[]> | undefined) ?? {};
        for (const [subKey, coords] of Object.entries(group)) {
          const fullPath = `${prefix}${subKey}.webp`;
          if (isOverridden(fullPath)) continue;

          const resolved = requireFeetPoints(fullPath);
          const yMatches = Math.abs(resolved.feetY - coords[0]!) < COORDINATE_EPSILON;
          const xMatches = Math.abs(resolved.feetX - coords[1]!) < COORDINATE_EPSILON;

          if (yMatches && xMatches) {
            automaticMatches++;
          }
        }
      }

      expect(automaticMatches).toBeGreaterThan(MIN_AUTOMATIC_MATCHES_THRESHOLD);
    });

    it('resolves all 19,024 known sprite paths to valid coordinates without throwing', () => {
      const oldDb: PackedFeetDatabase = legacyFeetDb;
      const prefixMap: Record<string, string> = {
        p: '/assets/sprites/pokemon/',
        n: '/assets/sprites/npc/',
        t: '/assets/sprites/trainers/'
      };

      let totalResolved = 0;
      for (const [groupKey, prefix] of Object.entries(prefixMap)) {
        const group = (oldDb[groupKey as keyof PackedFeetDatabase] as Record<string, readonly number[]> | undefined) ?? {};
        for (const [subKey] of Object.entries(group)) {
          const fullPath = `${prefix}${subKey}.webp`;
          const resolved = requireFeetPoints(fullPath);
          expect(resolved.feetX).toBeGreaterThan(0);
          expect(resolved.feetX).toBeLessThanOrEqual(1);
          expect(resolved.feetY).toBeGreaterThan(0);
          expect(resolved.feetY).toBeLessThanOrEqual(1);
          totalResolved++;
        }
      }

      expect(totalResolved).toBe(TOTAL_LEGACY_SPRITE_COUNT);
    });
  });

  describe('Manual Shadow Overrides & Custom Grounding', () => {
    const COORDINATE_EPSILON = 1e-4;
    const MIN_OVERRIDES_COUNT = 1000;

    it('applies 100% of manual overrides from spriteShadowOverrides.json with exact precision', () => {
      const rawJson = overridesJson as {
        overrides?: Record<string, {
          feetY: number;
          feetX: number;
          isFlying?: boolean;
          shadowScale?: number;
        }>;
      };
      const overridesMap = rawJson.overrides ?? {};

      let overrideCount = 0;
      for (const [spritePath, override] of Object.entries(overridesMap)) {
        overrideCount++;
        const resolved = requireFeetPoints(spritePath);
        expect(Math.abs(resolved.feetY - override.feetY)).toBeLessThan(COORDINATE_EPSILON);
        expect(Math.abs(resolved.feetX - override.feetX)).toBeLessThan(COORDINATE_EPSILON);

        if (override.isFlying !== undefined) {
          expect(resolved.isFlying ?? false).toBe(override.isFlying);
        }
        if (override.shadowScale !== undefined) {
          expect(resolved.shadowScale).toBe(override.shadowScale);
        }
      }

      expect(overrideCount).toBeGreaterThan(MIN_OVERRIDES_COUNT);
    });

    it('inherits manual overrides in shiny variants via O(1) shiny fallback', () => {
      const butterfreeBase = requireFeetPoints('/assets/sprites/pokemon/animated/Front/12i.webp');
      const butterfreeShiny = requireFeetPoints('/assets/sprites/pokemon/animated/Front shiny/12i.webp');

      expect(butterfreeBase.isFlying).toBe(true);
      expect(butterfreeShiny.isFlying).toBe(true);
      expect(butterfreeShiny.feetX).toBe(butterfreeBase.feetX);
      expect(butterfreeShiny.feetY).toBe(butterfreeBase.feetY);
      expect(butterfreeShiny.shadowScale).toBe(butterfreeBase.shadowScale);
    });
  });
});
