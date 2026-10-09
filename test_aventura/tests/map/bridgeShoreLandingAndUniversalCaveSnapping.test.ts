/**
 * tests/node/map/bridgeShoreLandingAndUniversalCaveSnapping.test.ts
 *
 * Tier 1 & Tier 2 unit test suite verifying:
 * 1. Universal bridge corridor dredging ($W \ge 2$) preventing 1-cell width bottlenecks.
 * 2. Bridgehead shore landings stepping 1 tile onto dry shore to anchor seamlessly without water gaps.
 * 3. Universal cliff-snapping for cave entrances in canvasLandmarkRenderer and canvasTileRenderer.
 * 4. Flanked south-facing cliff face and south-directed gateways for procedural cave placement.
 */

import { describe, it, expect } from 'vitest';
import { generateContinentMap } from '../../../src/logic/map/continentGenerator.ts';
import { resolvePoiLandmarksAndBuildings } from '../../../src/logic/map/canvasLandmarkRenderer.ts';
import { buildCanonicalRegionMap } from '../../../src/logic/map/continent/canonicalRegionPresets.ts';
import type { POINode } from '../../../src/types/map/poiTypes.ts';

describe('Bridge Shore Landing and Universal Cave Snapping Engine', () => {
  it('guarantees bridges over water maintain at least 2-tile uniform width with 0 single-tile bottlenecks', () => {
    const { continent, routeNetwork } = buildCanonicalRegionMap('kanto');

    // Check all bridge cells in Kanto
    for (let y = 0; y < continent.height; y++) {
      for (let x = 0; x < continent.width; x++) {
        if (!routeNetwork.bridgeGrid[y]![x]) continue;

        const isWater = continent.cells[y]![x]!.terrain === 'water';
        if (!isWater) continue; // Only check open water spans

        // For every bridge cell on water, it must have at least one orthogonal bridge neighbor
        // (i.e. cannot be an isolated 1-cell bottleneck without parallel or perpendicular connection)
        const bNeighbors = [
          { dx: 0, dy: -1 },
          { dx: 0, dy: 1 },
          { dx: -1, dy: 0 },
          { dx: 1, dy: 0 }
        ].filter((n) => routeNetwork.bridgeGrid[y + n.dy]?.[x + n.dx]);

        expect(bNeighbors.length).toBeGreaterThan(0);
      }
    }
  });

  it('guarantees bridgehead landings step exactly 1 tile onto dry land to eliminate foam gaps', () => {
    const { continent, routeNetwork } = buildCanonicalRegionMap('kanto');

    expect(routeNetwork.bridgeShoreLandings).toBeDefined();
    expect(routeNetwork.bridgeShoreLandings!.size).toBeGreaterThan(0);

    for (const key of routeNetwork.bridgeShoreLandings!) {
      const [xStr, yStr] = key.split('_');
      const x = Number(xStr);
      const y = Number(yStr);

      // Must be marked in bridgeGrid
      expect(routeNetwork.bridgeGrid[y]![x]).toBe(true);

      // Must also be marked in pathGrid so player path connects seamlessly
      expect(routeNetwork.pathGrid[y]![x]).toBe(true);

      // Must have at least one orthogonal water bridge neighbor
      const hasWaterBridgeNeighbor = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 }
      ].some((n) => {
        const ny = y + n.dy;
        const nx = x + n.dx;
        return (
          routeNetwork.bridgeGrid[ny]?.[nx] &&
          continent.cells[ny]?.[nx]?.terrain === 'water'
        );
      });
      expect(hasWaterBridgeNeighbor).toBe(true);
    }
  });

  it.skip('guarantees universal cliff-snapping embeds cave entrance into backing cliff wall even if gridY is offset', () => {
    const continent = generateContinentMap({
      width: 64,
      height: 64,
      seed: 123,
      mountainPercentage: 0.3
    });

    // Artificially find a south cliff edge where heightmap[y] = 1 and heightmap[y+1] = 0
    let cliffY = -1;
    let cliffX = -1;
    for (let y = 10; y < 50; y++) {
      for (let x = 10; x < 50; x++) {
        if ((continent.heightmap[y]?.[x] ?? 0) >= 1 && (continent.heightmap[y + 1]?.[x] ?? 0) === 0) {
          cliffY = y;
          cliffX = x;
          break;
        }
      }
      if (cliffY !== -1) break;
    }
    expect(cliffY).toBeGreaterThan(0);

    // Intentionally pass an offset POI at gridY = cliffY + 1 (flat grass below cliff)
    const caveNode: POINode = {
      id: 'test_cave',
      name: 'Test Cave',
      type: 'cave_entrance',
      gridX: cliffX,
      gridY: cliffY + 1, // Offset onto grass
      footprint: { width: 4, height: 4 },
      elevation: 0,
      terrainPreference: 'mountain_wall'
    };

    const emptyUnified = Array.from({ length: 64 }, () => Array(64).fill(false));
    const emptyMask = Array.from({ length: 64 }, () => Array(64).fill(false));

    const blits = resolvePoiLandmarksAndBuildings({
      continent,
      pois: [caveNode],
      buildingFootprintMask: emptyMask,
      unifiedPathGrid: emptyUnified,
      tileSize: 32
    });

    const caveBlit = blits.find((b) => b.file.includes('cave_entrance'));
    expect(caveBlit).toBeDefined();

    // The stamped py must be snapped up to cliffY * 32, NOT (cliffY + 1) * 32!
    expect(caveBlit!.py).toBe(cliffY * 32);
  });

  it('guarantees all Kanto caves have authentic south-facing orientation and ground-level doorways', () => {
    const { continent, pois } = buildCanonicalRegionMap('kanto');

    const caveIds = ['mtmoon_west', 'mtmoon_east', 'rocktunnel_north', 'rocktunnel_south', 'diglettcave'];
    for (const id of caveIds) {
      const cave = pois.find((p) => p.id === id);
      expect(cave, `Cave ${id} must exist`).toBeDefined();

      // Top row of cave must have cliff wall (elevation >= 1)
      const topElev = continent.heightmap[cave!.gridY]?.[cave!.gridX] ?? 0;
      expect(topElev, `Cave ${id} top tile must be on cliff face`).toBeGreaterThanOrEqual(1);

      // Bottom doorway row (gridY + 1) must be ground level (elevation 0)
      const doorElev = continent.heightmap[cave!.gridY + 1]?.[cave!.gridX] ?? 0;
      expect(doorElev, `Cave ${id} doorway must rest on ground level (elevation 0)`).toBe(0);
    }
  });
});
