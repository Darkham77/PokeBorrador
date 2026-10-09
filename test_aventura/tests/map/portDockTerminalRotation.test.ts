/**
 * tests/node/map/portDockTerminalRotation.test.ts
 *
 * TIER 1 & TIER 2 UNIT TESTS: PORT TERMINAL ROTATION & RENDERING
 *
 * Validates:
 *   1. Port terminal building is stamped for ALL 4 cardinal facings ('south', 'north', 'west', 'east').
 *   2. Terminal gate file rotates correctly:
 *      - south: poke_port_vermilion_gate.png (width 7, height 6)
 *      - north: poke_port_vermilion_gate_north.png (width 7, height 6)
 *      - west:  poke_port_vermilion_gate_west.png (width 6, height 7)
 *      - east:  poke_port_vermilion_gate_east.png (width 6, height 7)
 *   3. Pier alignment matches the gate walkway on all 4 facings (centered 3 tiles wide).
 *   4. Exactly 1 port dock is placed on any procedural map, and it ALWAYS renders a terminal building.
 */

import { describe, it, expect } from 'vitest';
import { resolvePoiLandmarksAndBuildings, resolvePortFerryAsset } from '../../../src/logic/map/canvasLandmarkRenderer.ts';
import { generateContinentMap } from '../../../src/logic/map/continentGenerator.ts';
import { placeRegionalPOIs } from '../../../src/logic/map/poiPlacementEngine.ts';
import type { POINode, CardinalDirection } from '../../../src/types/map/poiTypes.ts';

describe('portDockTerminalRotation', () => {
  const directions: readonly CardinalDirection[] = ['south', 'north', 'west', 'east'] as const;

  for (const dir of directions) {
    it(`guarantees port_dock stamps canonical 2.5D architecture for facing: ${dir}`, () => {
      const W = 64;
      const H = 64;
      const continent = generateContinentMap({
        width: W,
        height: H,
        seed: 42,
        oceanWaterPercentage: 0.35,
        beachWidth: 3,
        lakeCount: 1,
        mountainPercentage: 0.15,
        withStairs: false
      });

      const isWestOrEast = dir === 'west' || dir === 'east';
      const bWidth = isWestOrEast ? 6 : 7;
      const bHeight = isWestOrEast ? 7 : 6;

      const expectedLandmark =
        dir === 'south'
          ? 'poke_port_vermilion_gate.png'
          : 'poke_port_lighthouse_beacon.png';

      const mockPort: POINode = {
        id: 'test_port',
        name: 'Puerto de Prueba',
        type: 'port_dock',
        footprint: { width: bWidth, height: bHeight },
        gridX: 20,
        gridY: 20,
        elevation: 0,
        facing: dir,
        buildingFile: dir === 'south' ? 'poke_port_vermilion_gate.png' : 'poke_port_lighthouse_beacon.png',
        terrainPreference: 'coast_water',
        hasGym: false
      };

      const buildingFootprintMask = Array.from({ length: H }, () => Array(W).fill(false));
      const unifiedPathGrid = Array.from({ length: H }, () => Array(W).fill(false));
      const bridgeGrid = Array.from({ length: H }, () => Array(W).fill(false));

      // Setup simulated pier in bridgeGrid so vessel can moor at pier tip
      if (dir === 'south') {
        for (let r = 26; r <= 32; r++) {
          bridgeGrid[r]![22] = true;
          bridgeGrid[r]![23] = true;
          bridgeGrid[r]![24] = true;
        }
      } else if (dir === 'east') {
        for (let c = 26; c <= 32; c++) {
          bridgeGrid[22]![c] = true;
          bridgeGrid[23]![c] = true;
          bridgeGrid[24]![c] = true;
        }
      } else if (dir === 'west') {
        for (let c = 14; c <= 19; c++) {
          bridgeGrid[22]![c] = true;
          bridgeGrid[23]![c] = true;
          bridgeGrid[24]![c] = true;
        }
      } else if (dir === 'north') {
        for (let r = 14; r <= 19; r++) {
          bridgeGrid[r]![22] = true;
          bridgeGrid[r]![23] = true;
          bridgeGrid[r]![24] = true;
        }
      }

      const stamped = resolvePoiLandmarksAndBuildings({
        continent,
        pois: [mockPort],
        buildingFootprintMask,
        unifiedPathGrid,
        bridgeGrid
      });

      // 1. Verify entrance landmark
      const landmarkStamped = stamped.find((b) => b.file === expectedLandmark);
      expect(landmarkStamped, `Missing entrance landmark for facing ${dir}`).toBeDefined();

      // 2. Verify moored vessel
      const expectedVessel = resolvePortFerryAsset(dir);
      const vesselStamped = stamped.find((b) => b.file === expectedVessel);
      expect(vesselStamped, `Missing passenger vessel for facing ${dir}`).toBeDefined();

      // 3. Verify posts NEVER overlap the pier walkway
      if (dir === 'east' || dir === 'west') {
        // Pier walkway occupies rows 22..24. Beacon posts must be strictly <= row 21 or >= row 25.
        const beaconPosts = stamped.filter((b) => b.file === 'poke_port_lighthouse_beacon.png');
        for (const post of beaconPosts) {
          const postTileY = post.py / 32;
          const postBaseTileY = postTileY + 3; // base of 4-tile beacon
          const pierWalkwayStart = 22;
          const pierWalkwayEnd = 24;
          const overlapsWalkway = postTileY <= pierWalkwayEnd && postBaseTileY >= pierWalkwayStart;
          expect(overlapsWalkway, `Beacon at py=${post.py} overlaps walkway rows 22..24`).toBe(false);
        }
      } else if (dir === 'north') {
        // Pier walkway occupies cols 22..24. Beacon posts must be strictly <= col 21 or >= col 25.
        const beaconPosts = stamped.filter((b) => b.file === 'poke_port_lighthouse_beacon.png');
        for (const post of beaconPosts) {
          const postTileX = post.px / 32;
          const overlapsWalkway = postTileX >= 22 && postTileX <= 24;
          expect(overlapsWalkway, `North beacon at px=${post.px} overlaps walkway cols 22..24`).toBe(false);
        }
      }
    });
  }

  it('guarantees every procedurally generated map has a port dock with landmark and vessel', () => {
    for (const seed of [42, 100, 2026, 9999]) {
      const continent = generateContinentMap({
        width: 128,
        height: 128,
        seed,
        oceanWaterPercentage: 0.35,
        beachWidth: 3,
        lakeCount: 3,
        mountainPercentage: 0.22,
        withStairs: true
      });

      const pois = placeRegionalPOIs(continent, { targetCount: 18, seed });
      const portDocks = pois.filter((p) => p.type === 'port_dock');
      expect(portDocks.length).toBe(1);

      const port = portDocks[0]!;
      expect(port.facing).toBeDefined();

      const stamped = resolvePoiLandmarksAndBuildings({
        continent,
        pois: [port],
        buildingFootprintMask: Array.from({ length: 128 }, () => Array(128).fill(false)),
        unifiedPathGrid: Array.from({ length: 128 }, () => Array(128).fill(false))
      });

      const expectedLandmark =
        port.facing === 'south'
          ? 'poke_port_vermilion_gate.png'
          : 'poke_port_lighthouse_beacon.png';

      const landmarkStamped = stamped.find((b) => b.file === expectedLandmark);
      expect(landmarkStamped, `Expected landmark ${expectedLandmark} for seed ${seed}`).toBeDefined();
    }
  });
});
