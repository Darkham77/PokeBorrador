/**
 * tests/node/map/mountainAutotileEngine.test.ts
 *
 * TIER 1 RED-TO-GREEN TEST SUITE
 * Validates 8-neighbor bitmasking, convex outer corners, concave inner corners,
 * and 2-tile south projection with non-destructive foot overlay and occupancy flagging.
 */

import { describe, it, expect } from 'vitest';
import {
  compute8NeighborElevationMask,
  resolveMountainAutotileCell,
  resolveMountainMapGrid,
  stampMountainStairs,
  CANONICAL_MOUNTAIN_BRUSH_BROWN,
  CANONICAL_MOUNTAIN_BRUSH_BROWN_ROCK,
  CANONICAL_MOUNTAIN_BRUSH_GRAY,
  type ElevationMatrix
} from '../../../src/logic/map/mountainAutotileEngine.ts';
import { generateContinentMap } from '../../../src/logic/map/continentGenerator.ts';


describe('mountainAutotileEngine', () => {
  describe('compute8NeighborElevationMask', () => {
    it('detects a completely surrounded center cell (mask = 255)', () => {
      const elev: ElevationMatrix = [
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1]
      ];
      const mask = compute8NeighborElevationMask(elev, 1, 1, 1);
      expect(mask).toBe(255);
    });

    it('detects an outer NW corner (no neighbors north or west)', () => {
      const elev: ElevationMatrix = [
        [0, 0, 0],
        [0, 1, 1],
        [0, 1, 1]
      ];
      const mask = compute8NeighborElevationMask(elev, 1, 1, 1);
      // Neighbors should only be E, S, SE
      // N=false, W=false, NW=false, NE=false, SW=false
      expect(mask & 2).toBe(0); // N
      expect(mask & 8).toBe(0); // W
      expect(mask & 16).not.toBe(0); // E
      expect(mask & 64).not.toBe(0); // S
      expect(mask & 128).not.toBe(0); // SE
    });
  });

  describe('resolveMountainAutotileCell - Convex Outer Corners & Edges', () => {
    // 3x3 mountain island on grass (elevation 1 surrounded by 0)
    // Coords: x in [1..3], y in [1..3]
    const island: ElevationMatrix = [
      [0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0],
      [0, 1, 1, 1, 0],
      [0, 1, 1, 1, 0],
      [0, 0, 0, 0, 0]
    ];

    it('resolves outer North-West corner at (1, 1)', () => {
      const res = resolveMountainAutotileCell(island, 1, 1, 'brown');
      expect(res.role).toBe('corner_outer_nw');
      expect(res.primaryTile).toBe(CANONICAL_MOUNTAIN_BRUSH_BROWN.cornerOuterNW);
    });

    it('resolves outer North-East corner at (3, 1)', () => {
      const res = resolveMountainAutotileCell(island, 3, 1, 'brown');
      expect(res.role).toBe('corner_outer_ne');
      expect(res.primaryTile).toBe(CANONICAL_MOUNTAIN_BRUSH_BROWN.cornerOuterNE);
    });

    it('resolves North edge between corners at (2, 1)', () => {
      const res = resolveMountainAutotileCell(island, 2, 1, 'brown');
      expect(res.role).toBe('edge_north');
      expect(res.primaryTile).toBe(CANONICAL_MOUNTAIN_BRUSH_BROWN_ROCK.edgeNorth);
    });

    it('resolves West wall at (1, 2)', () => {
      const res = resolveMountainAutotileCell(island, 1, 2, 'brown');
      expect(res.role).toBe('edge_west');
      expect(res.primaryTile).toBe(CANONICAL_MOUNTAIN_BRUSH_BROWN_ROCK.edgeWest);
    });

    it('resolves East wall at (3, 2)', () => {
      const res = resolveMountainAutotileCell(island, 3, 2, 'brown');
      expect(res.role).toBe('edge_east');
      expect(res.primaryTile).toBe(CANONICAL_MOUNTAIN_BRUSH_BROWN_ROCK.edgeEast);
    });

    it('resolves center floor at (2, 2)', () => {
      const res = resolveMountainAutotileCell(island, 2, 2, 'brown');
      expect(res.role).toBe('floor_center');
      expect(res.primaryTile).toBe(CANONICAL_MOUNTAIN_BRUSH_BROWN_ROCK.floor);
    });
  });

  describe('resolveMountainAutotileCell - 2-Tile South Cliff Projection (Option A)', () => {
    // 3x3 mountain island on grass (elevation 1 at y=1..3)
    const island: ElevationMatrix = [
      [0, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0, 0],
      [0, 1, 1, 1, 0, 0],
      [0, 1, 1, 1, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0]
    ];

    it('resolves South Top face at (2, 3) and projects South Foot at (2, 4)', () => {
      const res = resolveMountainAutotileCell(island, 2, 3, 'brown');
      expect(res.role).toBe('edge_south_top');
      expect(res.primaryTile).toBe(CANONICAL_MOUNTAIN_BRUSH_BROWN_ROCK.floor);

      // Must project a south foot onto y+1
      expect(res.projectedFoot).toBeDefined();
      expect(res.projectedFoot?.targetX).toBe(2);
      expect(res.projectedFoot?.targetY).toBe(4);
      expect(res.projectedFoot?.tile).toBe(CANONICAL_MOUNTAIN_BRUSH_BROWN.edgeSouth_Foot);
      expect(res.projectedFoot?.occupiesCell).toBe(true);
    });

    it('resolves South-West corner top at (1, 3) and projects Corner BL Foot at (1, 4)', () => {
      const res = resolveMountainAutotileCell(island, 1, 3, 'brown');
      expect(res.role).toBe('corner_outer_sw_top');
      expect(res.projectedFoot).toBeDefined();
      expect(res.projectedFoot?.targetX).toBe(1);
      expect(res.projectedFoot?.targetY).toBe(4);
      expect(res.projectedFoot?.tile).toBe(CANONICAL_MOUNTAIN_BRUSH_BROWN.cornerOuterSW_Foot);
    });

    it('resolves South-East corner top at (3, 3) and projects Corner BR Foot at (3, 4)', () => {
      const res = resolveMountainAutotileCell(island, 3, 3, 'brown');
      expect(res.role).toBe('corner_outer_se_top');
      expect(res.projectedFoot).toBeDefined();
      expect(res.projectedFoot?.targetX).toBe(3);
      expect(res.projectedFoot?.targetY).toBe(4);
      expect(res.projectedFoot?.tile).toBe(CANONICAL_MOUNTAIN_BRUSH_BROWN.cornerOuterSE_Foot);
    });
  });

  describe('resolveMountainMapGrid - Full Grid Resolution with L-Shaped Plateau', () => {
    // L-Shaped Plateau (with an inner concave corner):
    const lShape: ElevationMatrix = [
      [0, 0, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0, 0, 0],
      [0, 1, 1, 1, 0, 0, 0],
      [0, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0]
    ];

    it('resolves the entire map and places projected feet in an overlay layer without corrupting base cells', () => {
      const result = resolveMountainMapGrid(lShape, 'brown');

      // The base grid dimensions should match
      expect(result.primaryTiles.length).toBe(7);
      expect(result.primaryTiles[0]?.length).toBe(7);

      // (2, 5) is elevation 0, but receives a projected foot from (2, 4)
      expect(result.cliffFootOverlays.some(o => o.targetX === 2 && o.targetY === 5)).toBe(true);

      // (2, 5) must be flagged as occupied by cliff foot
      expect(result.occupiedFootCells[5]?.[2]).toBe(true);

      // Inner concave corner must be resolved properly to pure floor in 2.5D
      const innerCornerCell = result.cellDetails[3]?.[3];
      expect(innerCornerCell).toBeDefined();
      expect(innerCornerCell?.role).toBe('corner_inner_ne');
      expect(innerCornerCell?.primaryTile).toBe(CANONICAL_MOUNTAIN_BRUSH_BROWN_ROCK.floor);
    });

    it('uses authentic cliff top rim for North edge (no vertical wall drop in 2.5D perspective)', () => {
      expect(CANONICAL_MOUNTAIN_BRUSH_BROWN.edgeNorth).toBe('poke_cliff_brown_top.png');
      expect(CANONICAL_MOUNTAIN_BRUSH_GRAY.edgeNorth).toBe('poke_cliff_gray_top.png');
    });

    it('supports gray palette cleanly', () => {
      const result = resolveMountainMapGrid(lShape, 'gray');
      expect(result.primaryTiles[1]?.[1]).toBe(CANONICAL_MOUNTAIN_BRUSH_GRAY.cornerOuterNW);
    });

    it('resolves Tier 2 plateau with rock-tier borders and feet when placed on Tier 1 rock', () => {
      // 5x5 grid: Elevation 1 island with an elevated Tier 2 cell at center
      const tieredGrid: ElevationMatrix = [
        [0, 0, 0, 0, 0],
        [0, 1, 1, 1, 0],
        [0, 1, 2, 1, 0],
        [0, 1, 1, 1, 0],
        [0, 0, 0, 0, 0]
      ];

      const result = resolveMountainMapGrid(tieredGrid, 'brown');

      // Center cell (2, 2) is peak_isolated since it is 1x1
      const center = result.cellDetails[2]?.[2];
      expect(center?.elevation).toBe(2);
      expect(center?.role).toBe('peak_isolated');

      // 6x6 grid: 2x2 Tier 2 plateau on 4x4 Tier 1
      const tieredPlateau: ElevationMatrix = [
        [0, 0, 0, 0, 0, 0],
        [0, 1, 1, 1, 1, 0],
        [0, 1, 2, 2, 1, 0],
        [0, 1, 2, 2, 1, 0],
        [0, 1, 1, 1, 1, 0],
        [0, 0, 0, 0, 0, 0]
      ];

      const tResult = resolveMountainMapGrid(tieredPlateau, 'brown');
      const nwTier2 = tResult.cellDetails[2]?.[2];
      expect(nwTier2?.elevation).toBe(2);
      expect(nwTier2?.role).toBe('corner_outer_nw');
      // Should use the rounded corner tile because all mountain borders mandate rounding
      expect(nwTier2?.primaryTile).toBe('poke_cliff_brown_corner_tl.png');

      // South edge top at (2, 3) projects foot to (2, 4) which is elevation 1 (rock)
      const swTier2 = tResult.cellDetails[3]?.[2];
      expect(swTier2?.role).toBe('corner_outer_sw_top');
      expect(swTier2?.projectedFoot?.targetElev).toBe(1);
      expect(swTier2?.projectedFoot?.tile).toBe('poke_cliff_brown_corner_bl.png');
    });
  });

  describe('stampMountainStairs', () => {
    // 6x6 test grid: 4x4 Tier 1 plateau surrounded by 0
    const island: ElevationMatrix = [
      [0, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 1, 0],
      [0, 0, 0, 0, 0, 0]
    ];

    it('stamps stairs on South wall (Tier 1 -> Tier 0) replacing top tiles and clearing foot occupancy', () => {
      const initial = resolveMountainMapGrid(island, 'brown');

      // Before stairs, (2, 4) and (3, 4) are edge_south_top, and (2, 5) and (3, 5) are occupied feet
      expect(initial.cellDetails[4]?.[2]?.role).toBe('edge_south_top');
      expect(initial.cellDetails[4]?.[3]?.role).toBe('edge_south_top');
      expect(initial.occupiedFootCells[5]?.[2]).toBe(true);
      expect(initial.occupiedFootCells[5]?.[3]).toBe(true);

      const stamped = stampMountainStairs(initial, 2, 4, 'brown');

      // Primary tiles at y=4 must be mountain floor (plateau rock) ending flush where stairs meet plateau
      expect(stamped.primaryTiles[4]?.[2]).toBe(CANONICAL_MOUNTAIN_BRUSH_BROWN_ROCK.floor);
      expect(stamped.primaryTiles[4]?.[3]).toBe(CANONICAL_MOUNTAIN_BRUSH_BROWN_ROCK.floor);

      // Cell roles must be updated
      expect(stamped.cellDetails[4]?.[2]?.role).toBe('stairs_l');
      expect(stamped.cellDetails[4]?.[3]?.role).toBe('stairs_r');

      // Cliff foot overlays at y=5 must be stairs_L and stairs_R with occupiesCell = false
      const footL = stamped.cliffFootOverlays.find(ov => ov.targetX === 2 && ov.targetY === 5);
      const footR = stamped.cliffFootOverlays.find(ov => ov.targetX === 3 && ov.targetY === 5);
      expect(footL).toBeDefined();
      expect(footL?.tile).toBe(CANONICAL_MOUNTAIN_BRUSH_BROWN_ROCK.stairs_L);
      expect(footL?.occupiesCell).toBe(false);

      expect(footR).toBeDefined();
      expect(footR?.tile).toBe(CANONICAL_MOUNTAIN_BRUSH_BROWN_ROCK.stairs_R);
      expect(footR?.occupiesCell).toBe(false);

      // Foot cells at y=5 must no longer be occupied, allowing player traversal!
      expect(stamped.occupiedFootCells[5]?.[2]).toBe(false);
      expect(stamped.occupiedFootCells[5]?.[3]).toBe(false);
    });

    it('stamps rock-tier stairs on Tier 2 -> Tier 1 South wall', () => {
      // 8x8 grid: Tier 1 base (y=1..6, x=1..6), Tier 2 upper (y=2..3, x=2..5)
      const tieredGrid: ElevationMatrix = [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 0],
        [0, 1, 2, 2, 2, 2, 1, 0],
        [0, 1, 2, 2, 2, 2, 1, 0],
        [0, 1, 1, 1, 1, 1, 1, 0],
        [0, 1, 1, 1, 1, 1, 1, 0],
        [0, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 0]
      ];

      const initial = resolveMountainMapGrid(tieredGrid, 'brown');
      // At y=3, x=3..4, elevation 2 drops to elevation 1 at y=4
      expect(initial.cellDetails[3]?.[3]?.role).toBe('edge_south_top');
      expect(initial.cellDetails[3]?.[4]?.role).toBe('edge_south_top');

      const stamped = stampMountainStairs(initial, 3, 3, 'brown');

      // Primary tiles at y=3 remain rock plateau floor
      expect(stamped.primaryTiles[3]?.[3]).toBe(CANONICAL_MOUNTAIN_BRUSH_BROWN_ROCK.floor);
      expect(stamped.primaryTiles[3]?.[4]).toBe(CANONICAL_MOUNTAIN_BRUSH_BROWN_ROCK.floor);

      // Foot overlays at y=4 must also be rock-tier stairs
      const footL = stamped.cliffFootOverlays.find(ov => ov.targetX === 3 && ov.targetY === 4);
      expect(footL?.tile).toBe(CANONICAL_MOUNTAIN_BRUSH_BROWN_ROCK.stairs_L);
      expect(footL?.occupiesCell).toBe(false);
      expect(stamped.occupiedFootCells[4]?.[3]).toBe(false);
      expect(stamped.occupiedFootCells[4]?.[4]).toBe(false);
    });

    it('supports options.stairs in resolveMountainMapGrid directly', () => {
      const result = resolveMountainMapGrid(island, {
        palette: 'brown',
        stairs: [{ x: 2, y: 4 }]
      });

      expect(result.primaryTiles[4]?.[2]).toBe(CANONICAL_MOUNTAIN_BRUSH_BROWN_ROCK.floor);
      expect(result.primaryTiles[4]?.[3]).toBe(CANONICAL_MOUNTAIN_BRUSH_BROWN_ROCK.floor);
      expect(result.occupiedFootCells[5]?.[2]).toBe(false);
      expect(result.occupiedFootCells[5]?.[3]).toBe(false);
    });

    it('throws when attempting to stamp stairs out of bounds or on non-south walls', () => {
      const initial = resolveMountainMapGrid(island, 'brown');

      // Out of bounds
      expect(() => stampMountainStairs(initial, 10, 10, 'brown')).toThrow('out of bounds');

      // Center floor at (2, 2) is not a south wall
      expect(() => stampMountainStairs(initial, 2, 2, 'brown')).toThrow('target cells must be');
    });
  });

  describe('Pattern 2 Reproduction (Seed #42 - Corners & South Plateau Rim)', () => {
    const continent = generateContinentMap({
      seed: 42,
      width: 128,
      height: 128,
      oceanWaterPercentage: 0.35,
      mountainPercentage: 0.22,
      lakeCount: 3
    });

    it('Sub-issue 2A: resolves outer corners bordering grass with rounded grass corners, not square rock', () => {
      // (76, 50): Gray palette, outer NW corner bordering grass north and west
      const c76_50 = continent.resolvedMountain.cellDetails[50]?.[76];
      expect(c76_50?.role).toBe('corner_outer_nw');
      expect(c76_50?.primaryTile).toBe('poke_cliff_gray_corner_tl.png');

      // (34, 49): Brown palette, outer NE corner bordering grass north and east
      const c34_49 = continent.resolvedMountain.cellDetails[49]?.[34];
      expect(c34_49?.role).toBe('corner_outer_ne');
      expect(c34_49?.primaryTile).toBe('poke_cliff_brown_corner_tr.png');

      // (33, 49): Brown palette, outer NW corner bordering grass north and west
      const c33_49 = continent.resolvedMountain.cellDetails[49]?.[33];
      expect(c33_49?.role).toBe('corner_outer_nw');
      expect(c33_49?.primaryTile).toBe('poke_cliff_brown_corner_tl.png');

      // (80, 47): Gray palette, outer NW corner bordering grass
      const c80_47 = continent.resolvedMountain.cellDetails[47]?.[80];
      expect(c80_47?.role).toBe('corner_outer_nw');
      expect(c80_47?.primaryTile).toBe('poke_cliff_gray_corner_tl.png');

      // (84, 44) & (85, 44): Gray palette, outer NW and NE corners
      const c84_44 = continent.resolvedMountain.cellDetails[44]?.[84];
      const c85_44 = continent.resolvedMountain.cellDetails[44]?.[85];
      expect(c84_44?.primaryTile).toBe('poke_cliff_gray_corner_tl.png');
      expect(c85_44?.primaryTile).toBe('poke_cliff_gray_corner_tr.png');
    });

    it('Sub-issue 2B: resolves south cliff top on plateau as plateau floor without isolated rock face', () => {
      // (54, 30): Brown palette, south rim of plateau at elevation 1
      const c54_30 = continent.resolvedMountain.cellDetails[30]?.[54];
      expect(c54_30?.role).toBe('edge_south_top');
      expect(c54_30?.primaryTile).toBe('poke_cliff_brown_plateau_rock.png');
      expect(c54_30?.projectedFoot?.targetX).toBe(54);
      expect(c54_30?.projectedFoot?.targetY).toBe(31);
      expect(c54_30?.projectedFoot?.tile).toBe('poke_cliff_brown_face.png');
      expect(c54_30?.projectedFoot?.occupiesCell).toBe(true);
    });
  });
});


