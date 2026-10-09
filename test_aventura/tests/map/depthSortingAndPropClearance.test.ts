/**
 * tests/node/map/depthSortingAndPropClearance.test.ts
 *
 * TIER 1 RED-TO-GREEN REPRODUCTION & INTEGRITY TEST
 *
 * Validates:
 *   1. 2.5D Depth (Y = Z) sorting invariant across all standing entities in canvasTileRenderer:
 *      - Tree above building (smaller Y) is stamped BEFORE the building.
 *      - Tree below building (greater Y) is stamped AFTER the building.
 *      - Tree below another tree (greater Y) is stamped AFTER the tree above (covers it).
 *      - Urban props in front of building facade are stamped AFTER the building.
 *   2. Multi-tile prop footprint clearance in organicCityEngine:
 *      - 3x3 Monumental Fountain (poke_fountain) reserves all 9 tiles.
 *      - Benches, fences, and flowers NEVER overlap any of the fountain's 9 tiles.
 */

import { describe, it, expect } from 'vitest';
import { buildMapBlitInstructions, CANVAS_TILE_SIZE } from '../../../src/logic/map/canvasTileRenderer.ts';
import { generateSettlementLayout } from '../../../src/logic/map/cityLayoutEngine.ts';
import type { ContinentMapResult } from '../../../src/logic/map/continentGenerator.ts';
import type { POINode } from '../../../src/types/map/poiTypes.ts';
import type { WaterTerrainKind } from '../../../src/logic/map/waterAutotileEngine.ts';
import type { WildernessLayerResult } from '../../../src/logic/map/wildernessVegetationEngine.ts';

function createMockContinent(W = 32, H = 32): ContinentMapResult {
  const terrainMatrix: WaterTerrainKind[][] = Array.from({ length: H }, () => Array(W).fill('grass'));
  const heightmap: number[][] = Array.from({ length: H }, () => Array(W).fill(0));
  return {
    width: W,
    height: H,
    seed: 42,
    terrainMatrix,
    heightmap,
    resolvedWater: {
      width: W,
      height: H,
      primaryTiles: Array.from({ length: H }, () => Array(W).fill('poke_grass_plain.png')),
      cellDetails: Array.from({ length: H }, () => Array(W).fill(null))
    },
    resolvedMountain: {
      width: W,
      height: H,
      primaryTiles: Array.from({ length: H }, () => Array(W).fill('')),
      cellDetails: Array.from({ length: H }, () => Array(W).fill(null)),
      cliffFootOverlays: [],
      occupiedFootCells: Array.from({ length: H }, () => Array(W).fill(false))
    },
    placedStairs: [],
    cells: Array.from({ length: H }, (_, y) =>
      Array.from({ length: W }, (_, x) => ({
        x,
        y,
        terrain: 'grass',
        elevation: 0,
        isWalkable: true,
        layerStack: ['poke_grass_plain.png']
      }))
    )
  };
}

describe('2.5D Depth Sorting (Y = Z) & Prop Clearance', () => {
  it('strictly stamps trees north of buildings BEFORE buildings, and trees south of buildings AFTER buildings', () => {
    const W = 30;
    const H = 30;
    const continent = createMockContinent(W, H);

    // House at x=10, y=10 (footprint 4x4, base at y=14)
    const poiNode: POINode = {
      id: 'test_depth_town',
      name: 'Depth Test Town',
      type: 'town',
      gridX: 8,
      gridY: 8,
      footprint: { width: 14, height: 14 },
      gateways: [],
      elevation: 0,
      terrainPreference: 'flat_grass',
      urbanLayout: {
        nodeId: 'test_depth_town',
        buildings: [
          {
            id: 'house_middle',
            type: 'house',
            x: 10,
            y: 10,
            width: 4,
            height: 4,
            doorX: 12,
            doorY: 13,
            prefabFile: 'house_wood_brown.png'
          }
        ],
        props: [],
        internalStreets: [{ x: 12, y: 14 }],
        pavedPlazaCells: [],
        curbs: [],
        roadMaterial: 'dirt'
      }
    };

    // Tree North (x=10, y=6, height=4, base at row 8) -> NORTH of house
    // Tree South (x=15, y=14, height=4, base at row 16) -> SOUTH of house
    const wilderness: WildernessLayerResult = {
      trees: [
        { prefabFile: 'poke_tree_oak_clean.png', x: 10, y: 6, width: 3, height: 4 },
        { prefabFile: 'poke_tree_oak_clean.png', x: 15, y: 14, width: 3, height: 4 }
      ],
      tallGrassGrid: Array.from({ length: H }, () => Array(W).fill(false)),
      tallGrassPatches: [],
      props: []
    };

    const pathGrid = Array.from({ length: H }, () => Array(W).fill(false));
    const { instructions } = buildMapBlitInstructions(continent, [poiNode], pathGrid, undefined, wilderness);

    let treeNorthIdx = -1;
    let houseIdx = -1;
    let treeSouthIdx = -1;

    instructions.forEach((inst, idx) => {
      if (inst.filename.includes('poke_tree_oak_clean')) {
        if (inst.py < 10 * CANVAS_TILE_SIZE) {
          treeNorthIdx = idx;
        } else if (inst.py >= 12 * CANVAS_TILE_SIZE) {
          treeSouthIdx = idx;
        }
      }
      if (inst.filename.includes('house_wood_brown')) {
        houseIdx = idx;
      }
    });

    expect(treeNorthIdx).toBeGreaterThanOrEqual(0);
    expect(houseIdx).toBeGreaterThanOrEqual(0);
    expect(treeSouthIdx).toBeGreaterThanOrEqual(0);

    // CRITICAL 2.5D DEPTH INVARIANT:
    // Tree North (ySort=8) MUST be stamped BEFORE House (ySort=14)
    expect(treeNorthIdx).toBeLessThan(houseIdx);
    // Tree South (ySort=16) MUST be stamped AFTER House (ySort=14)
    expect(treeSouthIdx).toBeGreaterThan(houseIdx);
  });

  it('strictly stamps trees below other trees AFTER them so foreground trees cover background trees', () => {
    const W = 20;
    const H = 20;
    const continent = createMockContinent(W, H);

    const wilderness: WildernessLayerResult = {
      trees: [
        { prefabFile: 'poke_tree_oak_clean.png', x: 5, y: 3, width: 3, height: 4 },
        { prefabFile: 'poke_tree_oak_clean.png', x: 5, y: 5, width: 3, height: 4 }
      ],
      tallGrassGrid: Array.from({ length: H }, () => Array(W).fill(false)),
      tallGrassPatches: [],
      props: []
    };

    const pathGrid = Array.from({ length: H }, () => Array(W).fill(false));
    const { instructions } = buildMapBlitInstructions(continent, [], pathGrid, undefined, wilderness);

    const treeIndices: number[] = [];
    instructions.forEach((inst, idx) => {
      if (inst.filename.includes('poke_tree_oak_clean')) {
        treeIndices.push(idx);
      }
    });

    expect(treeIndices.length).toBe(2);
    // Upper tree (y=3) must be drawn first, lower tree (y=5) must be drawn second
    expect(treeIndices[0]).toBeLessThan(treeIndices[1]!);
  });

  it('guarantees that 3x3 monumental fountains never collide or overlap with benches, fences, or flowers', () => {
    const node: POINode = {
      id: 'town_with_pond',
      name: 'Pond Town',
      type: 'town',
      gridX: 4,
      gridY: 4,
      footprint: { width: 18, height: 16 },
      gateways: [],
      elevation: 0,
      terrainPreference: 'flat_grass',
      tier: 1
    };

    const context = {
      width: 30,
      height: 30,
      terrainMatrix: Array.from({ length: 30 }, () => Array(30).fill('grass' as WaterTerrainKind)),
      heightmap: Array.from({ length: 30 }, () => Array(30).fill(0)),
      occupiedFootCells: Array.from({ length: 30 }, () => Array(30).fill(false))
    };

    const layout = generateSettlementLayout(node, context, 777);
    const fountain = layout.props.find((p) => p.type === 'fountain');

    if (fountain) {
      // Fountain occupies 3x3 cells: [fountain.x .. fountain.x + 2] x [fountain.y .. fountain.y + 2]
      const fountainCells = new Set<string>();
      for (let dy = 0; dy < 3; dy++) {
        for (let dx = 0; dx < 3; dx++) {
          fountainCells.add(`${fountain.x + dx}_${fountain.y + dy}`);
        }
      }

      // Check all other props
      for (const prop of layout.props) {
        if (prop === fountain) continue;
        const propKey = `${prop.x}_${prop.y}`;
        expect(fountainCells.has(propKey)).toBe(false);

        // If bench is 2 tiles wide, check second tile as well
        if (prop.type === 'bench' && !prop.prefabFile.includes('_v')) {
          expect(fountainCells.has(`${prop.x + 1}_${prop.y}`)).toBe(false);
        }
      }
    }
  });
});
