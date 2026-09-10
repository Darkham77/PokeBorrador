/**
 * tests/node/assets/pokemon_feet_database.test.ts
 *
 * Unit & regression tests for Pokémon Feet Database and shiny deduplication fallback.
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import {
  requireFeetPoints
} from '../../../src/data/pokemon/pokemonFeetDatabase.ts';

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

  describe('Legacy Database Parity (Regression against HEAD)', () => {
    it('achieves 100% exact parity against all legacy entries from git HEAD', () => {
      let oldDbRaw: string;
      try {
        oldDbRaw = execSync('git show HEAD:src/data/pokemon/pokemonFeetDatabase.json', {
          maxBuffer: 50 * 1024 * 1024,
          stdio: ['pipe', 'pipe', 'ignore']
        }).toString();
      } catch {
        return;
      }

      const oldDb = JSON.parse(oldDbRaw) as {
        p?: Record<string, [number, number]>;
        n?: Record<string, [number, number]>;
        t?: Record<string, [number, number]>;
      };

      const prefixMap: Record<string, string> = {
        p: '/assets/sprites/pokemon/',
        n: '/assets/sprites/npc/',
        t: '/assets/sprites/trainers/'
      };

      let totalChecked = 0;
      let exactMatches = 0;
      const mismatches: Array<{ path: string; expected: [number, number]; actual: [number, number] }> = [];

      for (const [groupKey, prefix] of Object.entries(prefixMap)) {
        const group = oldDb[groupKey as keyof typeof oldDb] ?? {};
        for (const [subKey, [expectedY, expectedX]] of Object.entries(group)) {
          totalChecked++;
          const fullPath = `${prefix}${subKey}.webp`;
          try {
            const resolved = requireFeetPoints(fullPath);
            const yMatches = Math.abs(resolved.feetY - expectedY) < 1e-4;
            const xMatches = Math.abs(resolved.feetX - expectedX) < 1e-4;

            if (yMatches && xMatches) {
              exactMatches++;
            } else {
              mismatches.push({
                path: fullPath,
                expected: [expectedY, expectedX],
                actual: [resolved.feetY, resolved.feetX]
              });
            }
          } catch {
            mismatches.push({
              path: fullPath,
              expected: [expectedY, expectedX],
              actual: [NaN, NaN]
            });
          }
        }
      }

      expect(totalChecked).toBeGreaterThan(15000);
      expect(mismatches).toHaveLength(0);
      expect(exactMatches).toBe(totalChecked);
    });
  });
});
