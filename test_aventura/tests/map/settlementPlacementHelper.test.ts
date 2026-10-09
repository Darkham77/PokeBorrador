/**
 * tests/node/map/settlementPlacementHelper.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  checkBoundingBoxOverlap,
  checkBuildingCollision,
  findFreePlacementSpot
} from '../../logic/map/settlementPlacementHelper.ts';
import type { POINode, UrbanBuildingPlacement } from '../../types/map/poiTypes.ts';

describe('settlementPlacementHelper', () => {
  it('detects bounding box overlap correctly', () => {
    const boxA = { x: 10, y: 10, width: 4, height: 4 };
    const boxB = { x: 12, y: 12, width: 4, height: 4 };
    const boxC = { x: 15, y: 15, width: 4, height: 4 };

    expect(checkBoundingBoxOverlap(boxA, boxB)).toBe(true);
    expect(checkBoundingBoxOverlap(boxA, boxC)).toBe(false);
  });

  it('checks building collisions and ignores self-collision', () => {
    const existing: UrbanBuildingPlacement[] = [
      {
        id: 'b1',
        type: 'pokecenter',
        x: 10,
        y: 10,
        width: 5,
        height: 5,
        doorX: 12,
        doorY: 14,
        prefabFile: 'poke_center.png'
      }
    ];

    expect(checkBuildingCollision(existing, { id: 'b2', x: 12, y: 12, width: 4, height: 4 })).toBe(true);
    expect(checkBuildingCollision(existing, { id: 'b1', x: 10, y: 10, width: 5, height: 5 })).toBe(false);
    expect(checkBuildingCollision(existing, { id: 'b3', x: 20, y: 20, width: 4, height: 4 })).toBe(false);
  });

  it('finds a non-overlapping free placement spot for a new structure', () => {
    const mockPoi: POINode = {
      id: 'celadon',
      name: 'Ciudad Azulona',
      type: 'metropolis',
      footprint: { width: 16, height: 14 },
      terrainPreference: 'flat_grass',
      gridX: 20,
      gridY: 20,
      elevation: 0,
      urbanLayout: {
        nodeId: 'celadon',
        buildings: [
          {
            id: 'dept_store',
            type: 'dept_store',
            x: 21,
            y: 21,
            width: 6,
            height: 6,
            doorX: 23,
            doorY: 26,
            prefabFile: 'dept_store.png'
          }
        ],
        props: [],
        internalStreets: [],
        pavedPlazaCells: []
      }
    };

    const spot = findFreePlacementSpot(mockPoi, 4, 4);
    expect(spot).toBeDefined();

    // Must not overlap the existing 6x6 department store at (21, 21)
    const overlapsDeptStore = checkBoundingBoxOverlap(
      { x: spot.x, y: spot.y, width: 4, height: 4 },
      { x: 21, y: 21, width: 6, height: 6 }
    );
    expect(overlapsDeptStore).toBe(false);
  });
});
