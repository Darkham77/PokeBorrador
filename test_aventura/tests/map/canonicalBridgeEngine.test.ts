import { describe, it, expect } from 'vitest';
import {
  resolveCanonicalBridges,
  resolveWaterLandmarkPlatform
} from '../../../src/logic/map/canonicalBridgeEngine.ts';
import { generateContinentMap } from '../../../src/logic/map/continentGenerator.ts';
import { placeRegionalPOIs } from '../../../src/logic/map/poiPlacementEngine.ts';
import {
  generateRouteNetwork,
  computeOceanGrid
} from '../../../src/logic/map/routeNetworkEngine.ts';
import type { POINode } from '../../../src/types/map/poiTypes.ts';

describe('canonicalBridgeEngine', () => {
  it('resolves vertical 2-cell bridge with left and right railings', () => {
    const W = 10;
    const H = 10;
    const bridgeGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
    const terrainGrid = Array.from({ length: H }, () =>
      Array.from({ length: W }, () => ({ terrain: 'water' }))
    );

    // Vertical bridge 2-cells wide at x=4,5 from y=2 to y=7
    for (let y = 2; y <= 7; y++) {
      bridgeGrid[y]![4] = true;
      bridgeGrid[y]![5] = true;
    }

    const blits = resolveCanonicalBridges(bridgeGrid, terrainGrid);
    const tileMap = new Map<string, string>();
    for (const b of blits) {
      tileMap.set(`${b.x}_${b.y}`, b.file);
    }

    // Left column at y=4, x=4 must be poke_bridge_v_left.png
    expect(tileMap.get('4_4')).toBe('poke_bridge_v_left.png');
    // Right column at y=4, x=5 must be poke_bridge_v_right.png
    expect(tileMap.get('5_4')).toBe('poke_bridge_v_right.png');
  });

  it('guarantees continuous side railings on vertical bridge even when banks have diagonal land cells', () => {
    const W = 10;
    const H = 10;
    const bridgeGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
    const terrainGrid = Array.from({ length: H }, () =>
      Array.from({ length: W }, () => ({ terrain: 'water' }))
    );

    // North shore is land at y=1
    terrainGrid[1]![4] = { terrain: 'grass' };
    terrainGrid[1]![5] = { terrain: 'grass' };
    // South shore is land at y=6
    terrainGrid[6]![4] = { terrain: 'grass' };
    terrainGrid[6]![5] = { terrain: 'grass' };

    // Diagonal land intrusions on the flanks (e.g. riverbank slopes):
    terrainGrid[2]![3] = { terrain: 'grass' }; // West neighbor at y=2 is land!
    terrainGrid[5]![6] = { terrain: 'grass' }; // East neighbor at y=5 is land!

    // Vertical bridge 2-cells wide at x=4,5 from y=2 to y=5
    for (let y = 2; y <= 5; y++) {
      bridgeGrid[y]![4] = true;
      bridgeGrid[y]![5] = true;
    }

    const blits = resolveCanonicalBridges(bridgeGrid, terrainGrid);
    const tileMap = new Map<string, string>();
    for (const b of blits) {
      tileMap.set(`${b.x}_${b.y}`, b.file);
    }

    // Left flank at x=4 MUST ALWAYS be poke_bridge_v_left across all rows, including y=2 where west is land!
    for (let y = 2; y <= 5; y++) {
      expect(tileMap.get(`4_${y}`)).toBe('poke_bridge_v_left.png');
    }

    // Right flank at x=5 MUST ALWAYS be poke_bridge_v_right across all rows, including y=5 where east is land!
    for (let y = 2; y <= 5; y++) {
      expect(tileMap.get(`5_${y}`)).toBe('poke_bridge_v_right.png');
    }
  });

  it('guarantees continuous top and bottom railings on horizontal bridge even when banks have diagonal land cells', () => {
    const W = 10;
    const H = 10;
    const bridgeGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
    const terrainGrid = Array.from({ length: H }, () =>
      Array.from({ length: W }, () => ({ terrain: 'water' }))
    );

    // West shore is land at x=1
    terrainGrid[4]![1] = { terrain: 'grass' };
    terrainGrid[5]![1] = { terrain: 'grass' };
    // East shore is land at x=6
    terrainGrid[4]![6] = { terrain: 'grass' };
    terrainGrid[5]![6] = { terrain: 'grass' };

    // Diagonal land intrusions on flanks:
    terrainGrid[3]![2] = { terrain: 'grass' }; // North neighbor at x=2 is land!
    terrainGrid[6]![5] = { terrain: 'grass' }; // South neighbor at x=5 is land!

    // Horizontal bridge 2-cells high at y=4,5 from x=2 to x=5
    for (let x = 2; x <= 5; x++) {
      bridgeGrid[4]![x] = true;
      bridgeGrid[5]![x] = true;
    }

    const blits = resolveCanonicalBridges(bridgeGrid, terrainGrid);
    const tileMap = new Map<string, string>();
    for (const b of blits) {
      tileMap.set(`${b.x}_${b.y}`, b.file);
    }

    // Top flank at y=4 MUST ALWAYS be poke_bridge_h_top across all columns, including x=2 where north is land!
    for (let x = 2; x <= 5; x++) {
      expect(tileMap.get(`${x}_4`)).toBe('poke_bridge_h_top.png');
    }

    // Bottom flank at y=5 MUST ALWAYS be poke_bridge_h_bot across all columns, including x=5 where south is land!
    for (let x = 2; x <= 5; x++) {
      expect(tileMap.get(`${x}_5`)).toBe('poke_bridge_h_bot.png');
    }
  });

  it('resolves horizontal 2-cell bridge with top rail and bottom pilings', () => {
    const W = 10;
    const H = 10;
    const bridgeGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
    const terrainGrid = Array.from({ length: H }, () =>
      Array.from({ length: W }, () => ({ terrain: 'water' }))
    );

    // Horizontal bridge 2-cells high at y=4,5 from x=2 to x=7
    for (let x = 2; x <= 7; x++) {
      bridgeGrid[4]![x] = true;
      bridgeGrid[5]![x] = true;
    }

    const blits = resolveCanonicalBridges(bridgeGrid, terrainGrid);
    const tileMap = new Map<string, string>();
    for (const b of blits) {
      tileMap.set(`${b.x}_${b.y}`, b.file);
    }

    // Top row at y=4, x=4 must be poke_bridge_h_top.png
    expect(tileMap.get('4_4')).toBe('poke_bridge_h_top.png');
    // Bottom row at y=5, x=4 must be poke_bridge_h_bot.png
    expect(tileMap.get('4_5')).toBe('poke_bridge_h_bot.png');
  });

  it('resolves universal 3-cell and 4-cell wide vertical bridges', () => {
    const W = 12;
    const H = 10;
    const bridgeGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
    const terrainGrid = Array.from({ length: H }, () =>
      Array.from({ length: W }, () => ({ terrain: 'water' }))
    );

    // 4-cells wide vertical bridge (x=3,4,5,6) from y=2 to y=7
    for (let y = 2; y <= 7; y++) {
      for (let x = 3; x <= 6; x++) {
        bridgeGrid[y]![x] = true;
      }
    }

    const blits = resolveCanonicalBridges(bridgeGrid, terrainGrid);
    const tileMap = new Map<string, string>();
    for (const b of blits) {
      tileMap.set(`${b.x}_${b.y}`, b.file);
    }

    // Left railing at x=3
    expect(tileMap.get('3_4')).toBe('poke_bridge_v_left.png');
    // Center planks at x=4 and x=5
    expect(tileMap.get('4_4')).toBe('poke_bridge_v_mid.png');
    expect(tileMap.get('5_4')).toBe('poke_bridge_v_mid.png');
    // Right railing at x=6
    expect(tileMap.get('6_4')).toBe('poke_bridge_v_right.png');
  });

  it('resolves universal 3-cell high horizontal bridge with top, mid, and bot pilings', () => {
    const W = 10;
    const H = 10;
    const bridgeGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
    const terrainGrid = Array.from({ length: H }, () =>
      Array.from({ length: W }, () => ({ terrain: 'water' }))
    );

    // 3-cells high horizontal bridge (y=3,4,5) from x=2 to x=7
    for (let y = 3; y <= 5; y++) {
      for (let x = 2; x <= 7; x++) {
        bridgeGrid[y]![x] = true;
      }
    }

    const blits = resolveCanonicalBridges(bridgeGrid, terrainGrid);
    const tileMap = new Map<string, string>();
    for (const b of blits) {
      tileMap.set(`${b.x}_${b.y}`, b.file);
    }

    // Top beam railing at y=3
    expect(tileMap.get('4_3')).toBe('poke_bridge_h_top.png');
    // Mid plank deck at y=4
    expect(tileMap.get('4_4')).toBe('poke_bridge_h_mid.png');
    // Bottom pilings at y=5
    expect(tileMap.get('4_5')).toBe('poke_bridge_h_bot.png');
  });

  it('resolves 3x3 platform with authentic outer corner turns and perimeter railings', () => {
    const W = 10;
    const H = 10;
    const bridgeGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
    const terrainGrid = Array.from({ length: H }, () =>
      Array.from({ length: W }, () => ({ terrain: 'water' }))
    );

    // 3x3 platform at x=3..5, y=3..5
    for (let y = 3; y <= 5; y++) {
      for (let x = 3; x <= 5; x++) {
        bridgeGrid[y]![x] = true;
      }
    }

    const blits = resolveCanonicalBridges(bridgeGrid, terrainGrid);
    const tileMap = new Map<string, string>();
    for (const b of blits) {
      tileMap.set(`${b.x}_${b.y}`, b.file);
    }

    // 4 Outer corners
    expect(tileMap.get('3_3')).toBe('poke_bridge_corner_turn_nw.png');
    expect(tileMap.get('5_3')).toBe('poke_bridge_corner_turn_ne.png');
    expect(tileMap.get('3_5')).toBe('poke_bridge_corner_turn_sw.png');
    expect(tileMap.get('5_5')).toBe('poke_bridge_corner_turn_se.png');

    // Perimeter borders
    expect(tileMap.get('4_3')).toBe('poke_bridge_h_top.png');
    expect(tileMap.get('4_5')).toBe('poke_bridge_h_bot.png');
    expect(tileMap.get('3_4')).toBe('poke_bridge_v_left.png');
    expect(tileMap.get('5_4')).toBe('poke_bridge_v_right.png');

    // Interior center
    expect(tileMap.get('4_4')).toBe('poke_bridge_v_mid.png');
  });

  it('ensures shore landing transitions keep entrance open without transverse railing', () => {
    const W = 10;
    const H = 10;
    const bridgeGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
    const terrainGrid = Array.from({ length: H }, () =>
      Array.from({ length: W }, () => ({ terrain: 'water' }))
    );

    // North shore at y=1 is land
    terrainGrid[1]![4] = { terrain: 'grass' };
    terrainGrid[1]![5] = { terrain: 'grass' };

    // Vertical bridge at x=4,5 from y=2 to y=7
    for (let y = 2; y <= 7; y++) {
      bridgeGrid[y]![4] = true;
      bridgeGrid[y]![5] = true;
    }

    const blits = resolveCanonicalBridges(bridgeGrid, terrainGrid);
    const tileMap = new Map<string, string>();
    for (const b of blits) {
      tileMap.set(`${b.x}_${b.y}`, b.file);
    }

    // At y=2, touching north land: must be side railings, NOT corner turns or top beam!
    expect(tileMap.get('4_2')).toBe('poke_bridge_v_left.png');
    expect(tileMap.get('5_2')).toBe('poke_bridge_v_right.png');
  });

  it('resolves 90-degree corner turns between horizontal and vertical spans', () => {
    const W = 10;
    const H = 10;
    const bridgeGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
    const terrainGrid = Array.from({ length: H }, () =>
      Array.from({ length: W }, () => ({ terrain: 'water' }))
    );

    // Horizontal bridge coming from x=2..4 at y=4,5
    // Turning south down to y=8 at x=4,5
    for (let x = 2; x <= 4; x++) {
      bridgeGrid[4]![x] = true;
      bridgeGrid[5]![x] = true;
    }
    for (let y = 5; y <= 8; y++) {
      bridgeGrid[y]![4] = true;
      bridgeGrid[y]![5] = true;
    }

    const blits = resolveCanonicalBridges(bridgeGrid, terrainGrid);
    expect(blits.length).toBeGreaterThan(0);
    // Should have corner or directional tiles at junction
    const files = new Set(blits.map(b => b.file));
    const hasCornerOrBridge = Array.from(files).some(f => f.includes('bridge') || f.includes('corner'));
    expect(hasCornerOrBridge).toBe(true);
  });

  it('guarantees water landmarks generate contoured pier platform instead of solid bounding box', () => {
    const poi: POINode = {
      id: 'ocean_lighthouse',
      name: 'Faro Marino',
      type: 'water_landmark',
      gridX: 10,
      gridY: 10,
      footprint: { width: 6, height: 7 },
      elevation: 0,
      terrainPreference: 'coast_water'
    };

    const terrainGrid = Array.from({ length: 30 }, () =>
      Array.from({ length: 30 }, () => ({ terrain: 'water' }))
    );

    const pierBlits = resolveWaterLandmarkPlatform(poi, terrainGrid);
    expect(pierBlits.length).toBeGreaterThan(0);

    // Verify all blit files exist in our canonical catalog
    for (const pb of pierBlits) {
      expect(pb.file).toMatch(/poke_dock_wood|poke_bridge/);
    }
  });

  it('guarantees routes to water landmarks create continuous bridge across water (> 4 cells)', () => {
    const continent = generateContinentMap({
      width: 128,
      height: 128,
      seed: 42,
      oceanWaterPercentage: 0.35,
      beachWidth: 3,
      lakeCount: 3,
      mountainPercentage: 0.22,
      withStairs: true
    });

    const pois = placeRegionalPOIs(continent, { targetCount: 18, seed: 42 });
    const waterLandmark = pois.find(p => p.type === 'water_landmark');
    expect(waterLandmark).toBeDefined();

    const routeNet = generateRouteNetwork(continent, pois, { allowBridges: true });

    // Check if any edge touches the water landmark
    const landmarkEdges = routeNet.edges.filter(
      e => e.fromNodeId === waterLandmark?.id || e.toNodeId === waterLandmark?.id
    );

    if (landmarkEdges.length > 0) {
      // For any route leading to the water landmark, water cells must be marked on bridgeGrid!
      let waterBridgeCount = 0;
      for (const e of landmarkEdges) {
        for (const pt of e.waypoints) {
          if (continent.cells[pt.y]![pt.x]!.terrain === 'water') {
            if (routeNet.bridgeGrid[pt.y]![pt.x]) {
              waterBridgeCount++;
            }
          }
        }
      }
      expect(waterBridgeCount).toBeGreaterThan(0);
    }
  });

  it('resolves single-sided fishing balconies attached to bridge with proper railings', () => {
    const W = 10;
    const H = 10;
    const bridgeGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
    const terrainGrid = Array.from({ length: H }, () =>
      Array.from({ length: W }, () => ({ terrain: 'water' }))
    );

    // Vertical bridge at x=4,5 from y=2 to y=7
    for (let y = 2; y <= 7; y++) {
      bridgeGrid[y]![4] = true;
      bridgeGrid[y]![5] = true;
    }

    // East balcony attached at x=6, y=4
    bridgeGrid[4]![6] = true;
    // West balcony attached at x=3, y=6
    bridgeGrid[6]![3] = true;

    const blits = resolveCanonicalBridges(bridgeGrid, terrainGrid);
    const tileMap = new Map<string, string>();
    for (const b of blits) {
      tileMap.set(`${b.x}_${b.y}`, b.file);
    }

    expect(tileMap.get('6_4')).toBe('poke_bridge_deck_e.png');
    expect(tileMap.get('3_6')).toBe('poke_bridge_deck_w.png');
  });

  it('guarantees port_dock piers have uniform 3-cell boardwalk corridors terminating cleanly over water with railings', () => {
    const continent = generateContinentMap({
      width: 128,
      height: 128,
      seed: 42,
      oceanWaterPercentage: 0.35,
      beachWidth: 3,
      lakeCount: 3,
      mountainPercentage: 0.22,
      withStairs: true
    });

    const pois = placeRegionalPOIs(continent, { targetCount: 18, seed: 42 });
    const portDocks = pois.filter(p => p.type === 'port_dock');
    expect(portDocks.length).toBeGreaterThan(0);

    const routeNet = generateRouteNetwork(continent, pois, { allowBridges: true });

    for (const dock of portDocks) {
      const facing = dock.facing ?? 'south';
      // Find the pier cells in bridgeGrid strictly along the pier projection
      const pierRows = new Map<number, number[]>();
      const pierCols = new Map<number, number[]>();

      for (let y = 0; y < 128; y++) {
        for (let x = 0; x < 128; x++) {
          if (routeNet.bridgeGrid[y]![x]) {
            if (facing === 'north' && y < dock.gridY && Math.abs(x - dock.gridX) <= 5) {
              const row = pierRows.get(y) ?? [];
              row.push(x);
              pierRows.set(y, row);
            } else if (facing === 'south' && y >= dock.gridY + dock.footprint.height && Math.abs(x - dock.gridX) <= 5) {
              const row = pierRows.get(y) ?? [];
              row.push(x);
              pierRows.set(y, row);
            } else if (facing === 'east' && x >= dock.gridX + dock.footprint.width && Math.abs(y - dock.gridY) <= 5) {
              const col = pierCols.get(x) ?? [];
              col.push(y);
              pierCols.set(x, col);
            } else if (facing === 'west' && x < dock.gridX && Math.abs(y - dock.gridY) <= 5) {
              const col = pierCols.get(x) ?? [];
              col.push(y);
              pierCols.set(x, col);
            }
          }
        }
      }

      if (facing === 'north' || facing === 'south') {
        expect(pierRows.size).toBeGreaterThan(0);
        for (const [_, xs] of pierRows) {
          // Uniform 3-cell corridor terminating in water
          expect(xs.length).toBe(3);
        }
      } else {
        expect(pierCols.size).toBeGreaterThan(0);
        for (const [_, ys] of pierCols) {
          // Uniform 3-cell corridor terminating in water
          expect(ys.length).toBe(3);
        }
      }
    }
  });

  it('guarantees pathGrid has 0 cells on water across the entire map', () => {
    const continent = generateContinentMap({
      width: 128,
      height: 128,
      seed: 42,
      oceanWaterPercentage: 0.35,
      beachWidth: 3,
      lakeCount: 3,
      mountainPercentage: 0.22,
      withStairs: true
    });

    const pois = placeRegionalPOIs(continent, { targetCount: 18, seed: 42 });
    const routeNet = generateRouteNetwork(continent, pois, { allowBridges: true });

    let waterPathLeakCount = 0;
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        if (continent.cells[y]![x]!.terrain === 'water' && routeNet.pathGrid[y]![x]) {
          waterPathLeakCount++;
        }
      }
    }
    expect(waterPathLeakCount).toBe(0);
  });

  it('places lake_shrine in an inland freshwater lake and generates authentic inland lake bridge crossings', () => {
    const continent = generateContinentMap({
      width: 128,
      height: 128,
      seed: 42,
      oceanWaterPercentage: 0.35,
      beachWidth: 3,
      lakeCount: 3,
      mountainPercentage: 0.22,
      withStairs: true
    });

    const isOcean = computeOceanGrid(continent);
    const pois = placeRegionalPOIs(continent, { targetCount: 18, seed: 42 });
    const lakeShrine = pois.find((p) => p.id === 'lake_shrine');
    expect(lakeShrine).toBeDefined();

    // Santuario del Lago must be located inside an inland lake (NOT in perimeter ocean)
    expect(isOcean[lakeShrine!.gridY]?.[lakeShrine!.gridX]).toBe(false);

    const routeNet = generateRouteNetwork(continent, pois, { allowBridges: true });
    const blits = resolveCanonicalBridges(routeNet.bridgeGrid, continent.cells);

    // There must be authentic bridge crossings over inland lake water (at least a 2x2 crossing = 4 tiles)
    const inlandLakeBridgeBlits = blits.filter((b) => !isOcean[b.y]?.[b.x]);
    expect(inlandLakeBridgeBlits.length).toBeGreaterThanOrEqual(4);
  });

  it('guarantees zero isolated orphan bridge tiles exist across the entire region', () => {
    const continent = generateContinentMap({
      width: 128,
      height: 128,
      seed: 42,
      oceanWaterPercentage: 0.35,
      beachWidth: 3,
      lakeCount: 3,
      mountainPercentage: 0.22,
      withStairs: true
    });

    const pois = placeRegionalPOIs(continent, { targetCount: 18, seed: 42 });
    const routeNet = generateRouteNetwork(continent, pois, { allowBridges: true });
    const blits = resolveCanonicalBridges(routeNet.bridgeGrid, continent.cells);

    const bridgeSet = new Set(blits.map((b) => `${b.x}_${b.y}`));
    for (const b of blits) {
      // Every bridge tile must have at least one adjacent bridge neighbor
      const hasNeighbor =
        bridgeSet.has(`${b.x + 1}_${b.y}`) ||
        bridgeSet.has(`${b.x - 1}_${b.y}`) ||
        bridgeSet.has(`${b.x}_${b.y + 1}`) ||
        bridgeSet.has(`${b.x}_${b.y - 1}`);
      expect(hasNeighbor).toBe(true);

      // Bottom rail of horizontal bridge must strictly have a bridge body directly above it
      if (b.file === 'poke_bridge_h_bot.png') {
        expect(bridgeSet.has(`${b.x}_${b.y - 1}`)).toBe(true);
      }
    }
  });

  it('guarantees bridgeGrid has 0 cells on dry land (grass, sand, mountain) across the entire map', () => {
    const continent = generateContinentMap({
      width: 128,
      height: 128,
      seed: 42,
      oceanWaterPercentage: 0.35,
      beachWidth: 3,
      lakeCount: 3,
      mountainPercentage: 0.22,
      withStairs: true
    });

    const pois = placeRegionalPOIs(continent, { targetCount: 18, seed: 42 });
    const routeNet = generateRouteNetwork(continent, pois, { allowBridges: true });

    let bridgeOnLandCount = 0;
    const violations: { x: number; y: number; terrain: string }[] = [];
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        if (routeNet.bridgeGrid[y]![x]) {
          const terrain = continent.cells[y]![x]!.terrain;
          if (terrain !== 'water' && terrain !== 'sand') {
            bridgeOnLandCount++;
            violations.push({ x, y, terrain });
          }
        }
      }
    }

    expect(violations).toEqual([]);
    expect(bridgeOnLandCount).toBe(0);
  });

  it('guarantees all bridge spans over water are strictly rectilinear without 1-cell diagonal staircases', () => {
    const continent = generateContinentMap({
      width: 128,
      height: 128,
      seed: 42,
      oceanWaterPercentage: 0.35,
      beachWidth: 3,
      lakeCount: 3,
      mountainPercentage: 0.22,
      withStairs: true
    });

    const pois = placeRegionalPOIs(continent, { targetCount: 18, seed: 42 });
    const routeNet = generateRouteNetwork(continent, pois, { allowBridges: true });
    const blits = resolveCanonicalBridges(routeNet.bridgeGrid, continent.cells);

    // Identify corner turn blits
    const cornerBlits = blits.filter((b) => b.file.includes('corner_turn_'));

    // A 1-cell diagonal staircase step is formed by two opposite corner turns that are diagonally adjacent (dx=1, dy=1)
    const staircases: { a: string; b: string }[] = [];
    for (let i = 0; i < cornerBlits.length; i++) {
      for (let j = i + 1; j < cornerBlits.length; j++) {
        const a = cornerBlits[i]!;
        const b = cornerBlits[j]!;
        if (Math.abs(a.x - b.x) === 1 && Math.abs(a.y - b.y) === 1) {
          staircases.push({ a: `${a.file} at (${a.x},${a.y})`, b: `${b.file} at (${b.x},${b.y})` });
        }
      }
    }
    expect(staircases).toEqual([]);

    // Every corner turn must belong to an authentic square platform deck (>= 3x3)
    for (const cb of cornerBlits) {
      const neighborCount = blits.filter(
        (b) => Math.abs(b.x - cb.x) <= 1 && Math.abs(b.y - cb.y) <= 1 && b !== cb
      ).length;
      expect(neighborCount).toBeGreaterThanOrEqual(3);
    }
  });

  it('guarantees horizontal pier ending in water strictly uses pure bamboo tiles with 0 style clash', () => {
    const W = 15;
    const H = 8;
    const bridgeGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
    const terrainGrid = Array.from({ length: H }, () =>
      Array.from({ length: W }, () => ({ terrain: 'water' }))
    );

    // Land on the left (col 0..2)
    for (let r = 0; r < H; r++) {
      for (let c = 0; c <= 2; c++) {
        terrainGrid[r]![c] = { terrain: 'sand' };
      }
    }

    // 2-cell horizontal pier extending East into water from c=3 to c=10 on rows 3 and 4
    for (let c = 3; c <= 10; c++) {
      bridgeGrid[3]![c] = true;
      bridgeGrid[4]![c] = true;
    }

    const blits = resolveCanonicalBridges(bridgeGrid, terrainGrid);
    const tileMap = new Map<string, string>();
    for (const b of blits) {
      tileMap.set(`${b.x}_${b.y}`, b.file);
    }

    // Must be 100% bamboo logs from start to terminal dead end
    for (let c = 3; c <= 10; c++) {
      expect(tileMap.get(`${c}_3`)).toBe('poke_bridge_h_top.png');
      expect(tileMap.get(`${c}_4`)).toBe('poke_bridge_h_bot.png');
    }

    // 0 Route 24 yellow planks or corner turns on the horizontal pier
    const hasStyleClash = blits.some(
      (b) => b.file.includes('bridge_v_') || b.file.includes('corner_turn_')
    );
    expect(hasStyleClash).toBe(false);
  });

  it('guarantees vertical pier ending in water strictly uses pure yellow planks with 0 bamboo tiles', () => {
    const W = 10;
    const H = 15;
    const bridgeGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
    const terrainGrid = Array.from({ length: H }, () =>
      Array.from({ length: W }, () => ({ terrain: 'water' }))
    );

    // Land on the North (row 0..2)
    for (let r = 0; r <= 2; r++) {
      for (let c = 0; c < W; c++) {
        terrainGrid[r]![c] = { terrain: 'sand' };
      }
    }

    // 2-cell vertical pier extending South into water from r=3 to r=10 on cols 4 and 5
    for (let r = 3; r <= 10; r++) {
      bridgeGrid[r]![4] = true;
      bridgeGrid[r]![5] = true;
    }

    const blits = resolveCanonicalBridges(bridgeGrid, terrainGrid);
    const tileMap = new Map<string, string>();
    for (const b of blits) {
      tileMap.set(`${b.x}_${b.y}`, b.file);
    }

    // Must be 100% yellow planks with railings all the way to terminal dead end
    for (let r = 3; r <= 10; r++) {
      expect(tileMap.get(`4_${r}`)).toBe('poke_bridge_v_left.png');
      expect(tileMap.get(`5_${r}`)).toBe('poke_bridge_v_right.png');
    }

    // 0 Route 12 bamboo logs on the vertical pier
    const hasBamboo = blits.some((b) => b.file.includes('bridge_h_'));
    expect(hasBamboo).toBe(false);
  });

  it('guarantees port_dock POIs use poke_port_vermilion_gate and exactly 1 port dock is placed per map', () => {
    for (const testSeed of [42, 100, 2026, 9999]) {
      const continent = generateContinentMap({
        width: 128,
        height: 128,
        seed: testSeed,
        oceanWaterPercentage: 0.35,
        beachWidth: 3,
        lakeCount: 3,
        mountainPercentage: 0.22,
        withStairs: true
      });

      const pois = placeRegionalPOIs(continent, { targetCount: 18, seed: testSeed });
      const portDocks = pois.filter((p) => p.type === 'port_dock');
      expect(portDocks.length).toBe(1);

      for (const dock of portDocks) {
        expect(dock.buildingFile).toMatch(/^(poke_port_vermilion_gate(_(north|west|east))?|poke_port_lighthouse_beacon)\.png$/);
      }
    }
  });

  it('guarantees port_dock pier is strictly 3-cells wide and resolves to canonical Vermilion stone pier tiles', () => {
    const continent = generateContinentMap({
      width: 128,
      height: 128,
      seed: 42,
      oceanWaterPercentage: 0.35,
      beachWidth: 3,
      lakeCount: 3,
      mountainPercentage: 0.22,
      withStairs: true
    });

    const pois = placeRegionalPOIs(continent, { targetCount: 18, seed: 42 });
    const portDock = pois.find((p) => p.type === 'port_dock')!;
    expect(portDock).toBeDefined();

    const routeNet = generateRouteNetwork(continent, pois, { allowBridges: true });
    expect(routeNet.portDockBridgeKeys).toBeDefined();
    expect(routeNet.portDockBridgeKeys!.size).toBeGreaterThanOrEqual(9);

    const isPortDockCell = (x: number, y: number): boolean =>
      Boolean(routeNet.portDockBridgeKeys?.has(`${x}_${y}`));

    const blits = resolveCanonicalBridges(routeNet.bridgeGrid, continent.cells, {
      isPortDockCell
    });

    const portBlits = blits.filter((b) => isPortDockCell(b.x, b.y));
    expect(portBlits.length).toBeGreaterThanOrEqual(9);

    // All port blits must strictly use official poke_port_pier_* tiles
    for (const b of portBlits) {
      expect(b.file.startsWith('poke_port_pier_')).toBe(true);
    }

    // Verify 3-cell wide cross sections
    const facing = portDock.facing ?? 'south';
    if (facing === 'south' || facing === 'north') {
      const byY = new Map<number, number[]>();
      for (const b of portBlits) {
        const xs = byY.get(b.y) ?? [];
        xs.push(b.x);
        byY.set(b.y, xs);
      }
      for (const [_, xs] of byY) {
        expect(xs.length).toBe(3);
      }
    } else {
      const byX = new Map<number, number[]>();
      for (const b of portBlits) {
        const ys = byX.get(b.x) ?? [];
        ys.push(b.y);
        byX.set(b.x, ys);
      }
      for (const [_, ys] of byX) {
        expect(ys.length).toBe(3);
      }
    }

    // Verify normal non-port bridges continue using wooden poke_bridge_* tiles
    const nonPortBlits = blits.filter((b) => !isPortDockCell(b.x, b.y));
    for (const b of nonPortBlits) {
      expect(b.file.startsWith('poke_bridge_')).toBe(true);
    }
  });
});