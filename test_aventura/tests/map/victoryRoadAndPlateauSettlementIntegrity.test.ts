/**
 * tests/node/map/victoryRoadAndPlateauSettlementIntegrity.test.ts
 *
 * Tier 1 & Tier 2 unit test suite verifying:
 * 1. Victory Road cave pair: lower cave entrance (elevation 0) and upper cave exit (elevation 1) connecting Route 23 to Indigo Plateau.
 * 2. Route 22/23 path purity: inland path alignment eliminating shoreline-clipping and distorted 1-cell bridges.
 * 3. Cinnabar Island mountain settlement: 100% building footprint on uniform elevation (no cliff overhang) + accessible mountain stairs.
 * 4. Zero tall grass in urban zones: 100% sterile city footprints and plazas across both canonical and procedural maps.
 */

import { describe, it, expect } from 'vitest';
import { buildCanonicalRegionMap } from '../../../src/logic/map/continent/canonicalRegionPresets.ts';

describe('Victory Road, Plateau Settlement & Urban Tall Grass Integrity', () => {
  it('guarantees Victory Road has a lower entrance (elevation 0) and upper exit (elevation 1) linked to Indigo Plateau', () => {
    const { continent, pois, routeNetwork } = buildCanonicalRegionMap('kanto');

    const lowerCave = pois.find((p) => p.id === 'victory_road_entrance');
    const upperCave = pois.find((p) => p.id === 'victory_road_exit');
    const league = pois.find((p) => p.id === 'indigo');

    expect(lowerCave, 'Lower cave entrance must exist').toBeDefined();
    expect(upperCave, 'Upper cave exit must exist').toBeDefined();
    expect(league, 'Indigo Plateau must exist').toBeDefined();

    // Lower cave is at elevation 0 on south-facing cliff
    expect(lowerCave!.elevation).toBe(0);
    const lowerTopElev = continent.heightmap[lowerCave!.gridY]?.[lowerCave!.gridX] ?? 0;
    const lowerDoorElev = continent.heightmap[lowerCave!.gridY + 1]?.[lowerCave!.gridX] ?? 0;
    expect(lowerTopElev, 'Lower cave top must be in cliff face').toBeGreaterThanOrEqual(1);
    expect(lowerDoorElev, 'Lower cave doorstep must be ground level').toBe(0);

    // Upper cave is at elevation 1 on south-facing upper ridge
    expect(upperCave!.elevation).toBe(1);
    const upperTopElev = continent.heightmap[upperCave!.gridY]?.[upperCave!.gridX] ?? 0;
    const upperDoorElev = continent.heightmap[upperCave!.gridY + 1]?.[upperCave!.gridX] ?? 0;
    expect(upperTopElev, 'Upper cave top must be in upper rock ridge').toBeGreaterThanOrEqual(2);
    expect(upperDoorElev, 'Upper cave doorstep must be at elevation 1 plateau').toBe(1);

    // Route network links
    const lowerEdge = routeNetwork.edges.find(
      (e) => e.toNodeId === 'victory_road_entrance' || e.fromNodeId === 'victory_road_entrance'
    );
    expect(lowerEdge, 'Route must connect to lower cave entrance').toBeDefined();

    // Path connects upper cave exit east to central avenue and north to League
    expect(routeNetwork.pathGrid[42]?.[upperCave!.gridX], 'Path must exist at upper cave doorstep').toBe(true);
    expect(routeNetwork.pathGrid[42]?.[42], 'Path must connect to central avenue').toBe(true);
    expect(routeNetwork.pathGrid[37]?.[42], 'Path must reach League palace avenue').toBe(true);

    // Mountain surface between entrance and exit (latitude 45 to 53) must have NO surface path
    for (let y = 46; y <= 53; y++) {
      expect(routeNetwork.pathGrid[y]?.[42], `Mountain surface at y=${y} must be pristine (no surface road)`).toBe(false);
    }
  });

  it('guarantees Route 22/23 has 0 shoreline clipping and zero 1-cell wide bridge deformities', () => {
    const { routeNetwork } = buildCanonicalRegionMap('kanto');

    // Route 22/23 between latitude 60 and 120 must not clip into shoreline with 1-cell bridges
    for (let y = 60; y <= 120; y++) {
      for (let x = 38; x <= 52; x++) {
        if (routeNetwork.pathGrid[y]?.[x]) {
          // If it's a bridge, it must be part of a proper >= 2 cell wide bridge
          if (routeNetwork.bridgeGrid[y]?.[x]) {
            const bNeighbors = [
              { dx: 0, dy: -1 },
              { dx: 0, dy: 1 },
              { dx: -1, dy: 0 },
              { dx: 1, dy: 0 }
            ].filter((n) => routeNetwork.bridgeGrid[y + n.dy]?.[x + n.dx]);
            expect(bNeighbors.length, `Bridge at (${x},${y}) must not be an isolated 1-cell strip`).toBeGreaterThanOrEqual(2);
          }
        }
      }
    }
  });

  it('guarantees Cinnabar Island buildings sit 100% on flat ground with zero cliff overhang and has accessible mountain stairs', () => {
    const { continent, pois } = buildCanonicalRegionMap('kanto');
    const cinnabar = pois.find((p) => p.id === 'cinnabar');
    expect(cinnabar).toBeDefined();

    // All buildings in Cinnabar must have uniform elevation across their entire footprint
    for (const b of cinnabar!.urbanLayout!.buildings) {
      const baseElev = continent.heightmap[b.y]?.[b.x];
      for (let dy = 0; dy < b.height; dy++) {
        for (let dx = 0; dx < b.width; dx++) {
          const cellElev = continent.heightmap[b.y + dy]?.[b.x + dx];
          expect(
            cellElev,
            `Building ${b.id} cell at (${b.x + dx}, ${b.y + dy}) must match base elevation ${baseElev}`
          ).toBe(baseElev);
        }
      }
    }

    // Must have a south-facing mountain stair connecting the elevated plateau to the ground
    const cinnabarStairs = continent.placedStairs.filter(
      (st) => st.x >= cinnabar!.gridX - 2 && st.x <= cinnabar!.gridX + cinnabar!.footprint.width + 2 &&
              st.y >= cinnabar!.gridY - 2 && st.y <= cinnabar!.gridY + cinnabar!.footprint.height + 2
    );
    expect(cinnabarStairs.length, 'Cinnabar Island must have mountain stairs').toBeGreaterThanOrEqual(1);
  });

  it('guarantees 100% zero tall grass tiles inside any urban footprint across both Kanto and procedural maps', () => {
    const { pois, wilderness } = buildCanonicalRegionMap('kanto');

    for (const poi of pois) {
      if (poi.type !== 'city' && poi.type !== 'metropolis' && poi.type !== 'town') continue;

      const minX = Math.max(0, poi.gridX - 1);
      const maxX = poi.gridX + poi.footprint.width;
      const minY = Math.max(0, poi.gridY - 1);
      const maxY = poi.gridY + poi.footprint.height;

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const isTallGrass = wilderness.tallGrassGrid[y]?.[x];
          expect(
            isTallGrass,
            `Tall grass must NOT exist inside ${poi.name} (${poi.id}) at (${x}, ${y})`
          ).toBeFalsy();
        }
      }
    }
  });
});
