/**
 * test_aventura/logic/map/roadsidePropsEngine.ts
 *
 * ROADSIDE PROPS, FENCES, SIGNPOSTS, BOULDERS & BUSHES ENGINE
 *
 * Places structured roadside props and micro-vignettes along paths,
 * cliffs, and settlement entrances:
 *   1. Gatehouse clearance zones (16-tile radius).
 *   2. Trailhead and settlement gateway signposts.
 *   3. Cliff-anchored boulders hugging mountain cliff bases.
 *   4. Dispersed roadside bushes, flowers, logs, and boulders.
 */

import { SimplexNoise } from './noise/simplexNoise.ts';
import type { ContinentMapResult } from './continentGenerator.ts';
import type { POINode } from '../../types/map/poiTypes.ts';
import { isCellAdjacentToMountainStairs } from './continentMountainEngine.ts';
import type { WildernessPropPlacement } from './wildernessVegetationEngine.ts';
import {
  ROUTE_GATE_PROPS_CLEARANCE_RADIUS,
  ROADSIDE_PROP_CLEARANCE_DEFAULT,
  ROADSIDE_SIGNPOST_CLEARANCE,
  ROADSIDE_BOULDER_CLEARANCE,
  CLIFF_BASE_BOULDER_NOISE_THRESHOLD,
  CLIFF_BOULDER_NOISE_SCALE,
  ROADSIDE_PROP_NOISE_SCALE,
  DESERT_BOULDER_THRESHOLD,
  VOLCANIC_BOULDER_THRESHOLD,
  MINT_BUSH_THRESHOLD,
  MINT_BOULDER_MIN,
  MINT_BOULDER_MAX,
  VIRIDIAN_BUSH_THRESHOLD,
  VIRIDIAN_LOG_THRESHOLD,
  MEADOW_ROUND_BUSH_THRESHOLD,
  MEADOW_FERN_BUSH_THRESHOLD,
  MEADOW_FLOWER_MIN,
  MEADOW_FLOWER_MAX
} from '../../config/wildernessConfig.ts';

export interface RoadsidePropsContext {
  readonly pois: readonly POINode[];
  readonly H: number;
  readonly W: number;
  readonly pathGrid: readonly (readonly boolean[])[];
  readonly tallGrassGrid: readonly (readonly boolean[])[];
  readonly continent: ContinentMapResult;
  readonly urbanBlocked: readonly (readonly boolean[])[];
  readonly stairBlocked: readonly (readonly boolean[])[];
  readonly prng: SimplexNoise;
  readonly treeBlocked: boolean[][];
  readonly props: WildernessPropPlacement[];
}

/**
 * Places roadside props, fences, signposts, boulders, and bushes.
 */
export function placeRoadsideProps(ctx: RoadsidePropsContext): void {
  const {
    pois,
    H,
    W,
    pathGrid,
    tallGrassGrid,
    continent,
    urbanBlocked,
    stairBlocked,
    prng,
    treeBlocked,
    props
  } = ctx;
  const roadsidePropBlocked: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));

  // Gatehouses handle their own flank barriers; block random roadside props within 16 tiles of any route_gate
  for (const poi of pois) {
    if (poi.type === 'route_gate') {
      const b = poi.urbanLayout?.buildings[0];
      const gateCenterX = b ? Math.floor(b.x + b.width / 2) : poi.gridX + 5;
      const gateCenterY = b ? Math.floor(b.y + b.height / 2) : poi.gridY + 4;
      for (
        let dy = -ROUTE_GATE_PROPS_CLEARANCE_RADIUS;
        dy <= ROUTE_GATE_PROPS_CLEARANCE_RADIUS;
        dy++
      ) {
        const ny = gateCenterY + dy;
        if (ny < 0 || ny >= H) continue;
        for (
          let dx = -ROUTE_GATE_PROPS_CLEARANCE_RADIUS;
          dx <= ROUTE_GATE_PROPS_CLEARANCE_RADIUS;
          dx++
        ) {
          const nx = gateCenterX + dx;
          if (nx < 0 || nx >= W) continue;
          if (Math.hypot(dx, dy) <= ROUTE_GATE_PROPS_CLEARANCE_RADIUS) {
            roadsidePropBlocked[ny]![nx] = true;
          }
        }
      }
    }
  }

  const isCandidatePropCell = (x: number, y: number, allowCliffBase = false): boolean => {
    if (x < 2 || x >= W - 2 || y < 2 || y >= H - 2) return false;
    if (pathGrid[y]![x]) return false;
    if (tallGrassGrid[y]![x]) return false;
    if (continent.terrainMatrix[y]![x] !== 'grass') return false;
    if ((continent.heightmap[y]?.[x] ?? 0) !== 0) return false;
    if (continent.resolvedMountain.occupiedFootCells[y]?.[x]) return false;
    if (continent.resolvedMountain.cellDetails[y]?.[x]) return false;
    if (urbanBlocked[y]?.[x] || stairBlocked[y]?.[x] || roadsidePropBlocked[y]?.[x]) return false;

    if (isCellAdjacentToMountainStairs(x, y, continent.resolvedMountain.cellDetails, W, H))
      return false;

    if (!allowCliffBase) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny < 0 || ny >= H || nx < 0 || nx >= W) continue;
          const mCell = continent.resolvedMountain.cellDetails[ny]?.[nx];
          if (mCell && (mCell.role.includes('cliff') || mCell.role.includes('edge_south'))) {
            return false;
          }
        }
      }
    }

    // Proximity clearance: props must never be adjacent to water bodies
    const isNearWater = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 }
    ].some((n) => {
      const terr = continent.terrainMatrix[y + n.dy]?.[x + n.dx];
      return terr === 'water' || terr === 'water_deep';
    });
    if (isNearWater) return false;

    return true;
  };

  const blockRadius = (cx: number, cy: number, radius: number): void => {
    const rCeil = Math.ceil(radius);
    for (let dy = -rCeil; dy <= rCeil; dy++) {
      for (let dx = -rCeil; dx <= rCeil; dx++) {
        if (Math.hypot(dx, dy) <= radius) {
          const ny = cy + dy;
          const nx = cx + dx;
          if (ny >= 0 && ny < H && nx >= 0 && nx < W) {
            roadsidePropBlocked[ny]![nx] = true;
          }
        }
      }
    }
  };

  const addRoadsideProp = (
    prop: WildernessPropPlacement,
    clearanceRadius: number = ROADSIDE_PROP_CLEARANCE_DEFAULT
  ): void => {
    props.push(prop);
    treeBlocked[prop.y]![prop.x] = true;
    blockRadius(prop.x, prop.y, clearanceRadius);
  };

  // 3.2 Route Trailhead & Settlement Gateway Signposts
  for (const poi of pois) {
    if (
      poi.type === 'dungeon_forest' ||
      poi.type === 'cave_entrance' ||
      poi.type === 'water_landmark' ||
      poi.type === 'port_dock'
    ) {
      continue;
    }

    const minX = Math.max(2, poi.gridX - 3);
    const maxX = Math.min(W - 3, poi.gridX + poi.footprint.width + 2);
    const minY = Math.max(2, poi.gridY - 3);
    const maxY = Math.min(H - 3, poi.gridY + poi.footprint.height + 2);

    let placedSign = false;
    for (let sy = minY; sy <= maxY && !placedSign; sy++) {
      for (let sx = minX; sx <= maxX && !placedSign; sx++) {
        // Look for cells bordering the path exit just outside settlement footprint
        if (!pathGrid[sy]?.[sx]) continue;

        // Check neighboring candidate cells for signpost placement
        const candidateOffsets = [
          { dx: 1, dy: 0 },
          { dx: -1, dy: 0 },
          { dx: 0, dy: 1 },
          { dx: 0, dy: -1 }
        ];

        for (const off of candidateOffsets) {
          const px = sx + off.dx;
          const py = sy + off.dy;
          if (isCandidatePropCell(px, py)) {
            addRoadsideProp(
              {
                type: 'signpost',
                x: px,
                y: py,
                prefabFile: 'poke_signpost_wood_small.png'
              },
              ROADSIDE_SIGNPOST_CLEARANCE
            );
            placedSign = true;
            break;
          }
        }
      }
    }
  }

  // 3.3 Cliff-Anchored Boulders (Hugging Mountain Cliff Bases on Flat Ground)
  for (let y = 3; y < H - 3; y++) {
    for (let x = 3; x < W - 3; x++) {
      if (!isCandidatePropCell(x, y, true)) continue;

      // Check if directly at the southern or eastern base of a mountain cliff
      const isSouthCliffBase =
        continent.resolvedMountain.cellDetails[y - 1]?.[x]?.role.startsWith('edge_south') ||
        continent.resolvedMountain.occupiedFootCells[y - 1]?.[x] === true;

      if (isSouthCliffBase) {
        const n = prng.noise2D(x * CLIFF_BOULDER_NOISE_SCALE, y * CLIFF_BOULDER_NOISE_SCALE);
        if (n > CLIFF_BASE_BOULDER_NOISE_THRESHOLD) {
          const mBiome = continent.macroBiomes?.biomeGrid[y]?.[x] ?? 'temperate_meadow';
          let boulderFile = 'poke_rock_boulder_mossy_1.png';

          if (mBiome === 'arid_desert') {
            boulderFile = 'poke_rock_boulder_brown_large.png';
          } else if (mBiome === 'volcanic_plateau') {
            boulderFile = 'poke_boulder_gray.png';
          } else if (mBiome === 'mint_highland') {
            boulderFile = 'poke_rock_boulder_mossy_1.png';
          }

          addRoadsideProp(
            {
              type: 'boulder',
              x,
              y,
              prefabFile: boulderFile
            },
            ROADSIDE_BOULDER_CLEARANCE
          );
        }
      }
    }
  }

  // 3.4 Dispersed Roadside Bushes, Flowers & Logs along Path Borders
  for (let y = 2; y < H - 2; y++) {
    for (let x = 2; x < W - 2; x++) {
      if (!isCandidatePropCell(x, y)) continue;

      const hasAdjacentPath =
        pathGrid[y - 1]?.[x] ||
        pathGrid[y + 1]?.[x] ||
        pathGrid[y]?.[x - 1] ||
        pathGrid[y]?.[x + 1];

      if (!hasAdjacentPath) continue;

      const n = prng.noise2D(x * ROADSIDE_PROP_NOISE_SCALE, y * ROADSIDE_PROP_NOISE_SCALE);
      const mBiome = continent.macroBiomes?.biomeGrid[y]?.[x] ?? 'temperate_meadow';

      if (mBiome === 'arid_desert') {
        if (n > DESERT_BOULDER_THRESHOLD) {
          addRoadsideProp(
            {
              type: 'boulder',
              x,
              y,
              prefabFile: 'poke_boulder_large.png'
            },
            ROADSIDE_BOULDER_CLEARANCE
          );
        }
      } else if (mBiome === 'volcanic_plateau') {
        if (n > VOLCANIC_BOULDER_THRESHOLD) {
          addRoadsideProp(
            {
              type: 'boulder',
              x,
              y,
              prefabFile: 'poke_boulder_gray.png'
            },
            ROADSIDE_BOULDER_CLEARANCE
          );
        }
      } else if (mBiome === 'mint_highland') {
        if (n > MINT_BUSH_THRESHOLD) {
          addRoadsideProp(
            {
              type: 'bush',
              x,
              y,
              prefabFile: 'poke_bush_round.png'
            },
            ROADSIDE_BOULDER_CLEARANCE
          );
        } else if (n > MINT_BOULDER_MIN && n <= MINT_BOULDER_MAX) {
          addRoadsideProp(
            {
              type: 'boulder',
              x,
              y,
              prefabFile: 'poke_rock_boulder_mossy_1.png'
            },
            ROADSIDE_BOULDER_CLEARANCE
          );
        }
      } else if (mBiome === 'viridian_forest') {
        if (n > VIRIDIAN_BUSH_THRESHOLD) {
          addRoadsideProp(
            {
              type: 'bush',
              x,
              y,
              prefabFile: 'poke_bush_round.png'
            },
            ROADSIDE_BOULDER_CLEARANCE
          );
        } else if (n < VIRIDIAN_LOG_THRESHOLD) {
          addRoadsideProp(
            {
              type: 'log',
              x,
              y,
              prefabFile: 'poke_log_fallen_trio.png'
            },
            ROADSIDE_BOULDER_CLEARANCE
          );
        }
      } else {
        // Temperate Meadow: round bushes, cuttable trees, and flower clusters
        if (n > MEADOW_ROUND_BUSH_THRESHOLD) {
          addRoadsideProp(
            {
              type: 'bush',
              x,
              y,
              prefabFile: 'poke_bush_round.png'
            },
            ROADSIDE_BOULDER_CLEARANCE
          );
        } else if (n < MEADOW_FERN_BUSH_THRESHOLD) {
          addRoadsideProp(
            {
              type: 'bush',
              x,
              y,
              prefabFile: 'poke_fern_wild_bush.png'
            },
            ROADSIDE_BOULDER_CLEARANCE
          );
        } else if (n > MEADOW_FLOWER_MIN && n <= MEADOW_FLOWER_MAX) {
          addRoadsideProp(
            {
              type: 'flower',
              x,
              y,
              prefabFile: 'poke_flowers_red.png'
            },
            ROADSIDE_BOULDER_CLEARANCE
          );
        }
      }
    }
  }
}
