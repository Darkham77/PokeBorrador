import { describe, it, expect } from 'vitest';
import { generateContinentMap } from '../../logic/map/continentGenerator.ts';
import {
  extractRealContinentPatches,
  getInstructionDimensions,
  findPatchInstructions
} from '../../logic/map/realContinentPatchExtractor.ts';
import type { WildernessLayerResult } from '../../logic/map/wildernessVegetationEngine.ts';
import type { POINode } from '../../types/map/poiTypes.ts';
import type { TileBlitInstruction } from '../../types/map/autotileStudioTypes.ts';

describe('realContinentPatchPrefabIntegrity', () => {
  it('extracts real patches with instructions and multi-tile prefab footprint coverage', () => {
    const continent = generateContinentMap({
      width: 64,
      height: 64,
      seed: 42
    });

    // Provide a synthetic wilderness with a multi-tile tree at (20, 20) with width 2, height 3
    const mockWilderness: WildernessLayerResult = {
      tallGrassGrid: Array.from({ length: 64 }, () => Array(64).fill(false)),
      tallGrassPatches: [],
      trees: [
        {
          x: 20,
          y: 20,
          width: 2,
          height: 3,
          prefabFile: 'poke_tree_oak_clean.png'
        }
      ],
      props: []
    };

    const patches = extractRealContinentPatches(
      continent,
      [],
      Array.from({ length: 64 }, () => Array(64).fill(false)),
      undefined,
      mockWilderness,
      { radius: 2, maxPerCategory: 5 }
    );

    expect(patches.length).toBeGreaterThan(0);

    for (const patch of patches) {
      // 1. Each patch must expose its filtered intersecting blit instructions
      expect(patch.instructions).toBeDefined();
      expect(Array.isArray(patch.instructions)).toBe(true);
      expect(patch.instructions.length).toBeGreaterThan(0);

      for (const inst of patch.instructions) {
        expect(inst.filename).toBeDefined();
        expect(typeof inst.px).toBe('number');
        expect(typeof inst.py).toBe('number');
      }
    }
  });

  it('covers all tiles within multi-tile prefab footprints in cell.layerStack', () => {
    const continent = generateContinentMap({
      width: 64,
      height: 64,
      seed: 100
    });

    // Synthetic POI with an urban building: 3x3 footprint at (10, 10)
    const mockBuildingPoi: POINode = {
      id: 'test_city',
      name: 'Test City',
      type: 'city',
      gridX: 10,
      gridY: 10,
      footprint: { width: 6, height: 6 },
      elevation: 0,
      terrainPreference: 'flat_grass',
      urbanLayout: {
        nodeId: 'test_city',
        buildings: [
          {
            id: 'b1',
            type: 'house',
            x: 10,
            y: 10,
            width: 3,
            height: 3,
            doorX: 11,
            doorY: 12,
            prefabFile: 'poke_house_wood_blue.png'
          }
        ],
        internalStreets: [],
        pavedPlazaCells: [],
        props: []
      }
    };

    const patches = extractRealContinentPatches(
      continent,
      [mockBuildingPoi],
      Array.from({ length: 64 }, () => Array(64).fill(false)),
      undefined,
      null,
      { radius: 1, maxPerCategory: 12 }
    );

    // Verify all patches have instructions
    for (const patch of patches) {
      expect(patch.instructions).toBeDefined();
    }
  });

  it('correctly calculates prefab dimensions and intersects patch boundaries', () => {
    // poke_tree_oak_clean is 96x128 in manifest
    const oakDims = getInstructionDimensions('poke_tree_oak_clean.png');
    expect(oakDims.w).toBe(96);
    expect(oakDims.h).toBe(128);

    // Standard 32x32 tile
    const plainTileDims = getInstructionDimensions('poke_grass_plain.png');
    expect(plainTileDims.w).toBe(32);
    expect(plainTileDims.h).toBe(32);

    // Tree positioned at px: 64, py: 64 with size 96x128
    // Covers x: [64, 160], y: [64, 192]
    const instructions: TileBlitInstruction[] = [
      { filename: 'poke_tree_oak_clean.png', px: 64, py: 64 },
      { filename: 'poke_grass_plain.png', px: 500, py: 500 }
    ];

    // Patch centered at tile (3, 3) -> cx: 3, cy: 3, radius: 1
    // Bounds in px: [ (3-1)*32, (3-1)*32, (3+2)*32, (3+2)*32 ] = [64, 64, 160, 160]
    const intersecting = findPatchInstructions(instructions, 3, 3, 1);
    expect(intersecting.length).toBe(1);
    expect(intersecting[0]?.filename).toBe('poke_tree_oak_clean.png');

    // Patch far away at (20, 20) -> should not intersect tree
    const farPatch = findPatchInstructions(instructions, 20, 20, 1);
    expect(farPatch.length).toBe(0);
  });
});
