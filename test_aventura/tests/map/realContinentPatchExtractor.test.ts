import { describe, it, expect } from 'vitest';
import { generateContinentMap } from '../../logic/map/continentGenerator.ts';
import {
  extractRealContinentPatches,
  extractCellNeighborhood
} from '../../logic/map/realContinentPatchExtractor.ts';

describe('realContinentPatchExtractor', () => {
  it('extracts authentic transition patches from a generated continent', () => {
    const continent = generateContinentMap({
      width: 64,
      height: 64,
      seed: 42
    });

    const patches = extractRealContinentPatches(
      continent,
      [],
      [],
      undefined,
      null,
      { radius: 2, maxPerCategory: 5 }
    );

    expect(patches.length).toBeGreaterThan(0);

    for (const patch of patches) {
      expect(patch.seed).toBe(42);
      expect(patch.radius).toBe(2);
      expect(patch.cells.length).toBe(5); // 2 * radius + 1
      expect(patch.cells[0]?.length).toBe(5);

      const center = patch.cells[2]![2]!;
      expect(center.isCenter).toBe(true);
      expect(center.x).toBe(patch.centerX);
      expect(center.y).toBe(patch.centerY);
      expect(center.filename).toMatch(/\.png$/);
      expect(center.layerStack.length).toBeGreaterThan(0);
    }
  });

  it('supports 3x3 radius extraction', () => {
    const continent = generateContinentMap({
      width: 64,
      height: 64,
      seed: 123
    });

    const patches = extractRealContinentPatches(
      continent,
      [],
      [],
      undefined,
      null,
      { radius: 1, maxPerCategory: 3 }
    );

    expect(patches.length).toBeGreaterThan(0);
    const first = patches[0]!;
    expect(first.cells.length).toBe(3);
    expect(first.cells[0]?.length).toBe(3);
    expect(first.cells[1]![1]?.isCenter).toBe(true);
  });

  it('extracts complete 3x3 neighborhood with ascii representation', () => {
    const continent = generateContinentMap({
      width: 64,
      height: 64,
      seed: 42
    });

    const neighborhood = extractCellNeighborhood(continent, 32, 32);
    expect(neighborhood.cells.length).toBe(3);
    expect(neighborhood.cells[0]?.length).toBe(3);
    expect(neighborhood.cells[1]![1]?.dir).toBe('C');
    expect(neighborhood.cells[0]![0]?.dir).toBe('NW');
    expect(neighborhood.cells[2]![2]?.dir).toBe('SE');
    expect(neighborhood.asciiGrid).toContain('[NW:');
    expect(neighborhood.asciiGrid).toContain('[C : *ERROR*]');
  });

  it('supports 7x7 radius (radius 3) extraction for large mountain massifs', () => {
    const continent = generateContinentMap({
      width: 64,
      height: 64,
      seed: 42
    });

    const patches = extractRealContinentPatches(
      continent,
      [],
      [],
      undefined,
      null,
      { radius: 3, maxPerCategory: 2 }
    );

    expect(patches.length).toBeGreaterThan(0);
    const first = patches[0]!;
    expect(first.radius).toBe(3);
    expect(first.cells.length).toBe(7);
    expect(first.cells[0]?.length).toBe(7);
    expect(first.cells[3]![3]?.isCenter).toBe(true);
    expect(first.cells[3]![3]?.x).toBe(first.centerX);
    expect(first.cells[3]![3]?.y).toBe(first.centerY);
  });

  it('extracts diverse multi-tier mountain candidates including higher floors, stairs, and south walls', () => {
    const continent = generateContinentMap({
      width: 128,
      height: 128,
      seed: 16
    });

    const patches = extractRealContinentPatches(
      continent,
      [],
      [],
      undefined,
      null,
      { radius: 2, maxPerCategory: 16, mountainLimit: 48 }
    );

    const mountainPatches = patches.filter((p) => p.category === 'mountain_cliff');
    // Expanded mountain limit must yield significantly more than the legacy 16 points
    expect(mountainPatches.length).toBeGreaterThan(16);

    // Must detect multi-tier cliffs (Pisos superiores)
    const multiTier = mountainPatches.filter(
      (p) => p.mountainSubtype === 'multi_tier' || (p.maxElevationInPatch ?? 0) >= 2
    );
    expect(multiTier.length).toBeGreaterThan(0);

    // Must detect mountain stairs
    const stairs = mountainPatches.filter((p) => p.mountainSubtype === 'stairs');
    expect(stairs.length).toBeGreaterThan(0);

    // Must detect south walls with 2.5D projection
    const southWalls = mountainPatches.filter((p) => p.mountainSubtype === 'south_wall');
    expect(southWalls.length).toBeGreaterThan(0);
  });
});

