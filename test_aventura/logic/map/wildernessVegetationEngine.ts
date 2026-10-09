/**
 * src/logic/map/wildernessVegetationEngine.ts
 *
 * WILDERNESS, TALL GRASS & ROUTE ENFRAMING VEGETATION ENGINE
 *
 * Enforces canonical GBA environmental storytelling:
 *   1. Route Enframing: Routes maintain a 1-2 cell clear transition buffer.
 *   2. Tall Grass Encounter Fields: 3x3 to 5x5 patches placed in valley clearings adjacent to routes.
 *   3. Roadside Props: Dispersed wooden fences (poke_fence_wood_h.png) and flower clusters (poke_flowers_red.png).
 *   4. Dense Tree Masses: Fills remaining wilderness with multi-cell tree canopies (oaks in valleys, pines near cliffs).
 *   5. Strict Y-Sorting: Tree instances are sorted strictly North-to-South (Y ascending) so lower canopies overlap upper bases correctly.
 */

import { SimplexNoise } from './noise/simplexNoise.ts';
import type { ContinentMapResult } from './continentGenerator.ts';
import type { POINode } from '../../types/map/poiTypes.ts';
import { sealRouteGateFlankBarriers } from './routeGateBarrierEngine.ts';

export interface TallGrassPatch {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface TreePlacement {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly prefabFile: string;
}

export type WildernessPropType = 'flower' | 'fence_h' | 'fence_v' | 'boulder' | 'bush' | 'log' | 'sapling' | 'signpost';

export interface WildernessPropPlacement {
  readonly type: WildernessPropType;
  readonly x: number;
  readonly y: number;
  readonly prefabFile: string;
}

export interface WildernessLayerResult {
  readonly tallGrassGrid: boolean[][];
  readonly tallGrassPatches: readonly TallGrassPatch[];
  readonly trees: readonly TreePlacement[]; // Guaranteed Y-sorted North to South
  readonly props: readonly WildernessPropPlacement[];
}

export interface WildernessOptions {
  readonly seed?: number;
  readonly tallGrassPatchCount?: number;
  readonly transitableGrid?: readonly (readonly boolean[])[];
  readonly reservedEntityCells?: ReadonlySet<string>;
}

const MIN_TALL_GRASS_PATCH_SEPARATION = 4;
const AUTUMN_MACRO_NOISE_SCALE = 0.015;
const AUTUMN_MACRO_THRESHOLD = 0.28;
const AUTUMN_BUFFER_THRESHOLD = 0.20;
const ROUTE_GATE_PROPS_CLEARANCE_RADIUS = 16;
const CLIFF_BASE_BOULDER_NOISE_THRESHOLD = 0.38;
const MIN_LARGE_FOREST_DUNGEON_DIMENSION = 14;

/**
 * Generates wilderness vegetation, tall grass encounter zones, and roadside framing.
 */
export function generateWildernessLayer(
  continent: ContinentMapResult,
  pois: readonly POINode[],
  pathGrid: readonly (readonly boolean[])[],
  options?: WildernessOptions
): WildernessLayerResult {
  const W = continent.width;
  const H = continent.height;
  const seed = options?.seed ?? 42;
  const transitableGrid = options?.transitableGrid;
  const prng = new SimplexNoise(seed + 555);

  const tallGrassGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const tallGrassPatches: TallGrassPatch[] = [];
  const props: WildernessPropPlacement[] = [];
  const rawTrees: TreePlacement[] = [];

  // 1. Build Clearance & Occupancy Mask
  // Mark cells that are forbidden for trees: paths + 1-cell buffer, settlements, water, sand, cliffs
  const treeBlocked: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));

  // 1.1 Water, Sand, Mountain Plateaus & Barren Biomes (trees grow in lush/highland/forest valleys at elevation 0)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const isNotGrass = continent.terrainMatrix[y]![x] !== 'grass';
      const isElevated = (continent.heightmap[y]?.[x] ?? 0) > 0;
      const mBiome = continent.macroBiomes?.biomeGrid[y]?.[x];
      const isBarrenBiome = mBiome === 'arid_desert' || mBiome === 'volcanic_plateau';

      if (isNotGrass || isElevated || isBarrenBiome) {
        treeBlocked[y]![x] = true;
      }
    }
  }

  // 1.2 Mountain cliffs & safety buffer (1 cell horizontal, 2 cells vertical)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const mCell = continent.resolvedMountain.cellDetails[y]?.[x];
      const isFoot = continent.resolvedMountain.occupiedFootCells[y]?.[x];
      const isCliffEdge = mCell && mCell.role !== 'floor_center';

      if (isFoot || isCliffEdge) {
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < H && nx >= 0 && nx < W) {
              treeBlocked[ny]![nx] = true;
            }
          }
        }
      }
    }
  }

  // 1.3 Settlement Footprints & Individual Building Clearance + 2-cell buffer
  const urbanBlocked: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));

  if (options?.reservedEntityCells) {
    for (const key of options.reservedEntityCells) {
      const commaIdx = key.indexOf(',');
      if (commaIdx !== -1) {
        const cx = parseInt(key.slice(0, commaIdx), 10);
        const cy = parseInt(key.slice(commaIdx + 1), 10);
        if (cx >= 0 && cx < W && cy >= 0 && cy < H) {
          treeBlocked[cy]![cx] = true;
          urbanBlocked[cy]![cx] = true;
        }
      }
    }
  }

  for (const poi of pois) {
    if (poi.type === 'dungeon_forest' || poi.type === 'route_gate') {
      // Dungeon forests and route gates allow surrounding wilderness trees up to their perimeter
      if (poi.urbanLayout?.buildings) {
        for (const b of poi.urbanLayout.buildings) {
          for (let dy = -1; dy <= b.height; dy++) {
            for (let dx = -1; dx <= b.width; dx++) {
              const ny = b.y + dy;
              const nx = b.x + dx;
              if (ny >= 0 && ny < H && nx >= 0 && nx < W) {
                treeBlocked[ny]![nx] = true;
                urbanBlocked[ny]![nx] = true;
              }
            }
          }
        }
      }
      if (poi.urbanLayout?.internalStreets) {
        for (const pt of poi.urbanLayout.internalStreets) {
          if (pt.y >= 0 && pt.y < H && pt.x >= 0 && pt.x < W) {
            treeBlocked[pt.y]![pt.x] = true;
            urbanBlocked[pt.y]![pt.x] = true;
          }
        }
      }
      if (poi.urbanLayout?.props) {
        for (const p of poi.urbanLayout.props) {
          if (p.y >= 0 && p.y < H && p.x >= 0 && p.x < W) {
            treeBlocked[p.y]![p.x] = true;
            urbanBlocked[p.y]![p.x] = true;
          }
        }
      }

      if (poi.type === 'route_gate') {
        const isHoriz = poi.facing === 'east' || poi.facing === 'west';
        const b = poi.urbanLayout?.buildings[0];
        if (isHoriz) {
          // Reserve horizontal transit road corridor: doorY +/- 2 for 12 tiles West and East
          const doorY = b ? b.y + b.height - 1 : poi.gridY + 6;
          const gateMinX = b ? b.x : poi.gridX + 1;
          const gateMaxX = b ? b.x + b.width : poi.gridX + 9;
          for (let x = Math.max(0, gateMinX - 12); x <= Math.min(W - 1, gateMaxX + 12); x++) {
            for (let y = Math.max(0, doorY - 2); y <= Math.min(H - 1, doorY + 2); y++) {
              treeBlocked[y]![x] = true;
              urbanBlocked[y]![x] = true;
            }
          }
        } else {
          // Reserve sacred transit road corridor: midX +/- 2 for 12 tiles North and South
          const midX = b ? Math.floor(b.x + b.width / 2) : poi.gridX + 5;
          const gateMinY = b ? b.y : poi.gridY + 1;
          const gateMaxY = b ? b.y + b.height : poi.gridY + 8;
          for (let y = Math.max(0, gateMinY - 12); y <= Math.min(H - 1, gateMaxY + 12); y++) {
            for (let x = Math.max(0, midX - 2); x <= Math.min(W - 1, midX + 1); x++) {
              treeBlocked[y]![x] = true;
              urbanBlocked[y]![x] = true;
            }
          }
        }
      }

      continue;
    }

    if (poi.urbanLayout?.buildings) {
      for (const b of poi.urbanLayout.buildings) {
        for (let dy = -1; dy <= b.height; dy++) {
          for (let dx = -1; dx <= b.width; dx++) {
            const ny = b.y + dy;
            const nx = b.x + dx;
            if (ny >= 0 && ny < H && nx >= 0 && nx < W) {
              treeBlocked[ny]![nx] = true;
              urbanBlocked[ny]![nx] = true;
            }
          }
        }
      }
    }

    const minX = Math.max(0, poi.gridX - 2);
    const maxX = Math.min(W - 1, poi.gridX + poi.footprint.width + 1);
    const minY = Math.max(0, poi.gridY - 2);
    const maxY = Math.min(H - 1, poi.gridY + poi.footprint.height + 1);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        treeBlocked[y]![x] = true;
        urbanBlocked[y]![x] = true;
      }
    }
  }

  // 1.4 Path Corridors: trunk bases cannot occupy road/path cells
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (pathGrid[y]![x]) {
        treeBlocked[y]![x] = true;
      }
    }
  }

  // 1.5 Mountain Stairs Corridors (strict clearance for stairs and landings)
  const stairBlocked: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  if (continent.placedStairs) {
    for (const stair of continent.placedStairs) {
      for (let dy = -2; dy <= 3; dy++) {
        for (let dx = -1; dx <= 2; dx++) {
          const sy = stair.y + dy;
          const sx = stair.x + dx;
          if (sy >= 0 && sy < H && sx >= 0 && sx < W) {
            treeBlocked[sy]![sx] = true;
            urbanBlocked[sy]![sx] = true;
            stairBlocked[sy]![sx] = true;
          }
        }
      }
    }
  }

  // 2. Generate Tall Grass Encounter Patches (4x3 to 8x6) in corridors along paths
  const targetPatches = options?.tallGrassPatchCount ?? Math.max(16, Math.min(Math.floor((W * H) / 450), 220));
  const pathNeighbors: { x: number; y: number }[] = [];

  const tallGrassBlocked: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  for (const poi of pois) {
    if (poi.type === 'dungeon_forest') {
      for (let dy = 0; dy < poi.footprint.height; dy++) {
        for (let dx = 0; dx < poi.footprint.width; dx++) {
          const cy = poi.gridY + dy;
          const cx = poi.gridX + dx;
          if (cy >= 0 && cy < H && cx >= 0 && cx < W) {
            tallGrassBlocked[cy]![cx] = true;
          }
        }
      }
    }
  }

  const isCellEligibleForTallGrass = (cx: number, cy: number): boolean => {
    if (cx < 2 || cx >= W - 2 || cy < 2 || cy >= H - 2) return false;
    if (pathGrid[cy]?.[cx]) return false;
    if (transitableGrid && !transitableGrid[cy]?.[cx]) return false;
    if (continent.terrainMatrix[cy]?.[cx] !== 'grass') return false;
    if ((continent.heightmap[cy]?.[cx] ?? 0) !== 0) return false;
    if (continent.resolvedMountain.occupiedFootCells[cy]?.[cx]) return false;
    if (urbanBlocked[cy]?.[cx] || tallGrassBlocked[cy]?.[cx] || stairBlocked[cy]?.[cx]) return false;

    const mBiome = continent.macroBiomes?.biomeGrid[cy]?.[cx];
    if (mBiome === 'arid_desert' || mBiome === 'volcanic_plateau' || mBiome === 'mint_highland') return false;

    // Strict 1-tile clearance buffer from any mountain elevation, cliff face, or cliff foot
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const ny = cy + dy;
        const nx = cx + dx;
        if (ny >= 0 && ny < H && nx >= 0 && nx < W) {
          if ((continent.heightmap[ny]?.[nx] ?? 0) > 0) return false;
          if (continent.resolvedMountain.occupiedFootCells[ny]?.[nx]) return false;
          const terr = continent.terrainMatrix[ny]?.[nx];
          if (terr === 'water' || terr === 'water_deep' || terr === 'sand') return false;
        }
      }
    }

    return true;
  };

  // Find candidate spots that are 1-5 cells away from a path, on flat grass (elevation 0)
  for (let y = 4; y < H - 8; y++) {
    for (let x = 4; x < W - 8; x++) {
      if (!isCellEligibleForTallGrass(x, y)) continue;

      // Check distance to path (between 1 and 6 cells)
      let distToPath = Infinity;
      for (let dy = -6; dy <= 6; dy++) {
        for (let dx = -6; dx <= 6; dx++) {
          if (pathGrid[y + dy]?.[x + dx]) {
            const d = Math.hypot(dx, dy);
            if (d < distToPath) distToPath = d;
          }
        }
      }

      if (distToPath >= 1.0 && distToPath <= 6.0) {
        pathNeighbors.push({ x, y });
      }
    }
  }

  // Uniform spatial Fisher-Yates shuffle of candidate centroids across the entire continent
  for (let i = pathNeighbors.length - 1; i > 0; i--) {
    const j = Math.abs(Math.floor(prng.noise2D(i * 12.34, i * 56.78) * 100000)) % (i + 1);
    const temp = pathNeighbors[i]!;
    pathNeighbors[i] = pathNeighbors[j]!;
    pathNeighbors[j] = temp;
  }

  let placedPatchCount = 0;

  for (const cand of pathNeighbors) {
    if (placedPatchCount >= targetPatches) break;

    // Minimum distance from existing patch centroids
    const tooClose = tallGrassPatches.some(
      (p) => Math.hypot(p.x - cand.x, p.y - cand.y) < MIN_TALL_GRASS_PATCH_SEPARATION
    );
    if (tooClose) continue;

    // Canonical GBA patch dimensions (4 to 8 tiles wide, 3 to 6 tiles high)
    const pw = 4 + (Math.abs(Math.floor(prng.noise2D(cand.x * 0.12, cand.y * 0.12) * 5)) % 5);
    const ph = 3 + (Math.abs(Math.floor(prng.noise2D(cand.y * 0.12, cand.x * 0.12) * 4)) % 4);

    let validCellCount = 0;
    for (let dy = 0; dy < ph; dy++) {
      for (let dx = 0; dx < pw; dx++) {
        const cx = cand.x + dx;
        const cy = cand.y + dy;
        if (isCellEligibleForTallGrass(cx, cy)) {
          validCellCount++;
        }
      }
    }

    // Require at least 45% of the patch footprint to be valid flat grass
    if (validCellCount >= Math.floor((pw * ph) * 0.45)) {
      tallGrassPatches.push({ x: cand.x, y: cand.y, width: pw, height: ph });

      for (let dy = 0; dy < ph; dy++) {
        for (let dx = 0; dx < pw; dx++) {
          const cx = cand.x + dx;
          const cy = cand.y + dy;
          if (isCellEligibleForTallGrass(cx, cy)) {
            tallGrassGrid[cy]![cx] = true;
            // Block trees from planting on top of tall grass
            treeBlocked[cy]![cx] = true;
          }
        }
      }
      placedPatchCount++;
    }
  }

  // 2.5 Seed dense tall grass encounter patches along dungeon_forest trails
  for (const poi of pois) {
    if (poi.type === 'dungeon_forest' && poi.urbanLayout?.internalStreets) {
      const trailCells = poi.urbanLayout.internalStreets;
      const trailSet = new Set(trailCells.map((c) => `${c.x}_${c.y}`));
      const bSet = new Set<string>();
      if (poi.urbanLayout.buildings) {
        for (const b of poi.urbanLayout.buildings) {
          for (let dy = 0; dy < b.height; dy++) {
            for (let dx = 0; dx < b.width; dx++) {
              bSet.add(`${b.x + dx}_${b.y + dy}`);
            }
          }
        }
      }
      const propSet = new Set(poi.urbanLayout.props?.map((p) => `${p.x}_${p.y}`) ?? []);

      // 1. Solid rectangular encounter clearings (Viridian Forest GBA style)
      const fw = poi.footprint.width;
      const fh = poi.footprint.height;
      const fMidX = poi.gridX + Math.floor(fw / 2);
      const fMidY = poi.gridY + Math.floor(fh / 2);

      const clearings = [
        // East clearing inside trail loop
        { x1: fMidX + 1, x2: Math.min(poi.gridX + fw - 3, fMidX + 5), y1: fMidY + 2, y2: Math.min(poi.gridY + fh - 5, fMidY + 7) },
        // West clearing inside trail loop
        { x1: Math.max(poi.gridX + 3, fMidX - 6), x2: fMidX - 2, y1: Math.max(poi.gridY + 5, fMidY - 7), y2: fMidY - 2 }
      ];

      for (const cl of clearings) {
        for (let y = cl.y1; y <= cl.y2; y++) {
          for (let x = cl.x1; x <= cl.x2; x++) {
            if (
              y >= 0 && y < H && x >= 0 && x < W &&
              !trailSet.has(`${x}_${y}`) &&
              !bSet.has(`${x}_${y}`) &&
              !propSet.has(`${x}_${y}`) &&
              isCellEligibleForTallGrass(x, y)
            ) {
              tallGrassGrid[y]![x] = true;
              treeBlocked[y]![x] = true;
            }
          }
        }
      }

      // 2. Trail margin encounter patches with buffer (reserved for large forest dungeons)
      if (fw >= MIN_LARGE_FOREST_DUNGEON_DIMENSION && fh >= MIN_LARGE_FOREST_DUNGEON_DIMENSION) {
        for (const cell of trailCells) {
          for (let dy = -3; dy <= 3; dy++) {
            for (let dx = -3; dx <= 3; dx++) {
              const d = Math.hypot(dx, dy);
              if (d >= 1.2 && d <= 3.2) {
                const nx = cell.x + dx;
                const ny = cell.y + dy;
                if (
                  ny >= 0 && ny < H && nx >= 0 && nx < W &&
                  !trailSet.has(`${nx}_${ny}`) &&
                  !bSet.has(`${nx}_${ny}`) &&
                  !propSet.has(`${nx}_${ny}`) &&
                  isCellEligibleForTallGrass(nx, ny)
                ) {
                  const noiseVal = prng.noise2D(nx * 0.35, ny * 0.35);
                  if (noiseVal > 0.40) {
                    tallGrassGrid[ny]![nx] = true;
                    treeBlocked[ny]![nx] = true;
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  // Prune any isolated 1-cell or 2-cell tall grass fragments to guarantee contiguous groups >= 3x3
  for (let iter = 0; iter < 2; iter++) {
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        if (!tallGrassGrid[y]![x]) continue;
        let neighbors = 0;
        if (tallGrassGrid[y - 1]![x]) neighbors++;
        if (tallGrassGrid[y + 1]![x]) neighbors++;
        if (tallGrassGrid[y]![x - 1]) neighbors++;
        if (tallGrassGrid[y]![x + 1]) neighbors++;
        if (neighbors < 2) {
          tallGrassGrid[y]![x] = false;
        }
      }
    }
  }

  // 3. Structured Roadside Props & Micro-Vignettes (Continuous Fences, Signposts, Cliff Boulders, Bushes & Flowers)
  const roadsidePropBlocked: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));

  // Gatehouses handle their own flank barriers; block random roadside props within 16 tiles of any route_gate
  for (const poi of pois) {
    if (poi.type === 'route_gate') {
      const b = poi.urbanLayout?.buildings[0];
      const gateCenterX = b ? Math.floor(b.x + b.width / 2) : poi.gridX + 5;
      const gateCenterY = b ? Math.floor(b.y + b.height / 2) : poi.gridY + 4;
      for (let dy = -ROUTE_GATE_PROPS_CLEARANCE_RADIUS; dy <= ROUTE_GATE_PROPS_CLEARANCE_RADIUS; dy++) {
        const ny = gateCenterY + dy;
        if (ny < 0 || ny >= H) continue;
        for (let dx = -ROUTE_GATE_PROPS_CLEARANCE_RADIUS; dx <= ROUTE_GATE_PROPS_CLEARANCE_RADIUS; dx++) {
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

    // Strict clearance from stairs and mountain cliffs
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const ny = y + dy;
        const nx = x + dx;
        if (ny < 0 || ny >= H || nx < 0 || nx >= W) continue;
        const mCell = continent.resolvedMountain.cellDetails[ny]?.[nx];
        if (mCell?.role.includes('stairs')) return false;
        if (!allowCliffBase && mCell && (mCell.role.includes('cliff') || mCell.role.includes('edge_south'))) {
          return false;
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

  const addRoadsideProp = (prop: WildernessPropPlacement, clearanceRadius: number = 2.0): void => {
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
              3.0
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
        const n = prng.noise2D(x * 0.28, y * 0.28);
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
            2.5
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

      const n = prng.noise2D(x * 0.35, y * 0.35);
      const mBiome = continent.macroBiomes?.biomeGrid[y]?.[x] ?? 'temperate_meadow';

      if (mBiome === 'arid_desert') {
        if (n > 0.55) {
          addRoadsideProp(
            {
              type: 'boulder',
              x,
              y,
              prefabFile: 'poke_boulder_large.png'
            },
            2.5
          );
        }
      } else if (mBiome === 'volcanic_plateau') {
        if (n > 0.55) {
          addRoadsideProp(
            {
              type: 'boulder',
              x,
              y,
              prefabFile: 'poke_boulder_gray.png'
            },
            2.5
          );
        }
      } else if (mBiome === 'mint_highland') {
        if (n > 0.58) {
          addRoadsideProp(
            {
              type: 'bush',
              x,
              y,
              prefabFile: 'poke_bush_round.png'
            },
            2.5
          );
        } else if (n > 0.36 && n <= 0.58) {
          addRoadsideProp(
            {
              type: 'boulder',
              x,
              y,
              prefabFile: 'poke_rock_boulder_mossy_1.png'
            },
            2.5
          );
        }
      } else if (mBiome === 'viridian_forest') {
        if (n > 0.50) {
          addRoadsideProp(
            {
              type: 'bush',
              x,
              y,
              prefabFile: 'poke_bush_round.png'
            },
            2.5
          );
        } else if (n < -0.52) {
          addRoadsideProp(
            {
              type: 'log',
              x,
              y,
              prefabFile: 'poke_log_fallen_trio.png'
            },
            2.5
          );
        }
      } else {
        // Temperate Meadow: round bushes, cuttable trees, and flower clusters
        if (n > 0.65) {
          addRoadsideProp(
            {
              type: 'bush',
              x,
              y,
              prefabFile: 'poke_bush_round.png'
            },
            2.5
          );
        } else if (n < -0.68) {
          addRoadsideProp(
            {
              type: 'bush',
              x,
              y,
              prefabFile: 'poke_fern_wild_bush.png'
            },
            2.5
          );
        } else if (n > 0.46 && n <= 0.60) {
          addRoadsideProp(
            {
              type: 'flower',
              x,
              y,
              prefabFile: 'poke_flowers_red.png'
            },
            2.5
          );
        }
      }
    }
  }

  // 4. Dense Tree Enframing in Wilderness Background (Organic Cúmulos & Groves)
  // Pre-computes Cellular Automata mask (B5678/S45678, 2 iterations) to consolidate
  // dense tree masses and eliminate isolated individual trees.
  let forestMask: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));

  for (let y = 2; y < H - 2; y++) {
    for (let x = 2; x < W - 2; x++) {
      if (treeBlocked[y]?.[x]) continue;
      if (continent.terrainMatrix[y]?.[x] !== 'grass') continue;
      if ((continent.heightmap[y]?.[x] ?? 0) !== 0) continue;
      const mBiome = continent.macroBiomes?.biomeGrid[y]?.[x] ?? 'temperate_meadow';
      if (mBiome === 'arid_desert' || mBiome === 'volcanic_plateau') continue;

      const isNonTransitable = transitableGrid && !transitableGrid[y]?.[x];
      const groveNoise = prng.noise2D(x * 0.08, y * 0.08);

      let nearCorridor = false;
      for (let dy = -4; dy <= 4 && !nearCorridor; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) continue;
          if (pathGrid[y + dy]?.[x + dx]) {
            nearCorridor = true;
            break;
          }
        }
      }

      const threshold = nearCorridor ? -0.95 : -0.75;
      if (isNonTransitable || groveNoise >= threshold) {
        forestMask[y]![x] = true;
      }
    }
  }

  for (let iter = 0; iter < 2; iter++) {
    const nextMask = forestMask.map((row) => [...row]);
    for (let y = 2; y < H - 2; y++) {
      for (let x = 2; x < W - 2; x++) {
        if (treeBlocked[y]?.[x] || continent.terrainMatrix[y]?.[x] !== 'grass') {
          nextMask[y]![x] = false;
          continue;
        }

        let neighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (forestMask[y + dy]?.[x + dx]) neighbors++;
          }
        }

        if (forestMask[y]![x]) {
          if (neighbors < 3) {
            nextMask[y]![x] = false;
          }
        } else {
          if (neighbors >= 5 && !treeBlocked[y]?.[x]) {
            nextMask[y]![x] = true;
          }
        }
      }
    }
    forestMask = nextMask;
  }

  // Iterate strictly from North to South (Y ascending), then West to East
  const treeOccupied: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const treeSpeciesGrid: (string | null)[][] = Array.from({ length: H }, () => Array(W).fill(null));

  for (let y = 3; y < H - 4; y += 1) {
    for (let x = 2; x < W - 4; x += 1) {
      let forceDenseTree = false;
      if (transitableGrid && !transitableGrid[y]?.[x] && continent.terrainMatrix[y]?.[x] === 'grass' && (continent.heightmap[y]?.[x] ?? 0) === 0) {
        forceDenseTree = true;
      }

      if (!forceDenseTree && !forestMask[y]![x]) continue;

      // 4.1 Macro-Biome Species Selection:
      // - mint_highland: alpine pines (poke_tree_pine_small.png, 64x96 px -> width 2, height 3)
      // - viridian_forest: lush green oaks (poke_tree_oak_clean.png, 96x128 px -> width 3, height 4)
      // - temperate_meadow:
      //     * autumn macro-zone (autumnNoise > 0.35): golden yellow oaks (poke_tree_oak_yellow.png, 96x128 px -> width 3, height 4)
      //     * temperate plains / transition: lush green oaks (poke_tree_oak_clean.png, 96x128 px -> width 3, height 4)
      const mBiome = continent.macroBiomes?.biomeGrid[y]?.[x] ?? 'temperate_meadow';
      let prefabFile = 'poke_tree_oak_clean.png';
      let treeWidth = 3;
      let treeHeight = 4;

      if (mBiome === 'mint_highland') {
        prefabFile = 'poke_tree_pine_small.png';
        treeWidth = 2;
        treeHeight = 3;
      } else if (mBiome === 'viridian_forest') {
        prefabFile = 'poke_tree_oak_clean.png';
        treeWidth = 3;
        treeHeight = 4;
      } else {
        const autumnNoise = prng.noise2D(x * AUTUMN_MACRO_NOISE_SCALE, y * AUTUMN_MACRO_NOISE_SCALE);
        if (forceDenseTree) {
          // Continuous wilderness barrier: eliminate deadband gaps between yellow and green biomes
          prefabFile = autumnNoise > 0.24 ? 'poke_tree_oak_yellow.png' : 'poke_tree_oak_clean.png';
          treeWidth = 3;
          treeHeight = 4;
        } else if (autumnNoise > AUTUMN_MACRO_THRESHOLD) {
          prefabFile = 'poke_tree_oak_yellow.png';
          treeWidth = 3;
          treeHeight = 4;
        } else if (autumnNoise <= AUTUMN_BUFFER_THRESHOLD) {
          prefabFile = 'poke_tree_oak_clean.png';
          treeWidth = 3;
          treeHeight = 4;
        } else {
          // Macro-biome transition buffer: keep clear so yellow and green groves never touch
          continue;
        }
      }

      // Check if near a route corridor (within 2 to 4 cells of path) to frame roads with dense tree walls
      let nearPath = false;
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) continue;
          if (pathGrid[y + dy]?.[x + dx]) {
            nearPath = true;
            break;
          }
        }
        if (nearPath) break;
      }

      // 4.2 Subtractive Wilderness: Densely fill the wilderness with canopy walls,
      // creating hermetic route corridors (width 4-8) with zero empty golf course grass plains
      const baseThreshold = -0.98;
      const threshold = nearPath ? -1.0 : baseThreshold;
      const groveNoise = prng.noise2D(x * 0.08, y * 0.08);

      if (!forceDenseTree && groveNoise < threshold) continue;

      const canopyOverhang = treeHeight - 2;
      let fits = true;

      // 1. Water clearance: tree sprite bounds + 1 tile margin must NOT touch water or deep water (sand beaches are allowed)
      for (let dy = -canopyOverhang - 1; dy <= 2; dy++) {
        for (let dx = -1; dx <= treeWidth; dx++) {
          const cy = y + dy;
          const cx = x + dx;
          if (cy < 0 || cy >= H || cx < 0 || cx >= W) {
            fits = false;
            break;
          }
          const t = continent.terrainMatrix[cy]?.[cx];
          if (t === 'water' || t === 'water_deep') {
            fits = false;
            break;
          }
        }
        if (!fits) break;
      }
      if (!fits) continue;

      // 2. Ground footprint clearance: trunk base (2 rows high) must be flat grass and unoccupied
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < treeWidth; dx++) {
          const cy = y + dy;
          const cx = x + dx;
          if (treeBlocked[cy]?.[cx] || treeOccupied[cy]?.[cx]) {
            fits = false;
            break;
          }
          if (continent.terrainMatrix[cy]?.[cx] !== 'grass' || (continent.heightmap[cy]?.[cx] ?? 0) !== 0) {
            fits = false;
            break;
          }
        }
        if (!fits) break;
      }
      if (!fits) continue;

      // 2b. Strict Tall Grass Canopy & Footprint Clearance:
      // A tree cannot plant its trunk base or canopy (-canopyOverhang..1) over any tall grass tile.
      for (let dy = -canopyOverhang; dy <= 1; dy++) {
        for (let dx = 0; dx < treeWidth; dx++) {
          const cy = y + dy;
          const cx = x + dx;
          if (tallGrassGrid[cy]?.[cx]) {
            fits = false;
            break;
          }
        }
        if (!fits) break;
      }
      if (!fits) continue;

      // Enforce strict root clearance so trunks/shadows never overlap (dy < 2 requires dx >= max(wA, wB))
      let overlapsRoots = false;
      for (let i = rawTrees.length - 1; i >= 0; i--) {
        const other = rawTrees[i]!;
        if (y - other.y >= 2) break; // rawTrees are strictly Y-ascending
        const reqDx = forceDenseTree ? Math.min(treeWidth, other.width) : Math.max(treeWidth, other.width);
        if (Math.abs(x - other.x) < reqDx) {
          overlapsRoots = true;
          break;
        }
      }
      if (overlapsRoots) continue;

      // 3. Canopy overhead clearance: foliage cannot clip through buildings, stairs, or mountain cliffs
      for (let dy = -canopyOverhang; dy < 0; dy++) {
        for (let dx = 0; dx < treeWidth; dx++) {
          const cy = y + dy;
          const cx = x + dx;
          if (
            cy < 0 || cy >= H || cx < 0 || cx >= W ||
            urbanBlocked[cy]?.[cx] ||
            stairBlocked[cy]?.[cx] ||
            (continent.heightmap[cy]?.[cx] ?? 0) !== 0 ||
            continent.resolvedMountain.occupiedFootCells[cy]?.[cx]
          ) {
            fits = false;
            break;
          }
        }
        if (!fits) break;
      }
      if (!fits) continue;

      // Check species isolation in O(1): yellow oaks and green oaks must never be within 8 tiles in playable zones
      if (!forceDenseTree && (prefabFile === 'poke_tree_oak_yellow.png' || prefabFile === 'poke_tree_oak_clean.png')) {
        const opposingSpecies = prefabFile === 'poke_tree_oak_yellow.png'
          ? 'poke_tree_oak_clean.png'
          : 'poke_tree_oak_yellow.png';
        let tooClose = false;
        for (let dy = -8; dy <= 8; dy++) {
          const cy = y + dy;
          if (cy < 0 || cy >= H) continue;
          for (let dx = -8; dx <= 8; dx++) {
            const cx = x + dx;
            if (cx < 0 || cx >= W) continue;
            if (treeSpeciesGrid[cy]![cx] === opposingSpecies && Math.hypot(dx, dy) < 8) {
              tooClose = true;
              break;
            }
          }
          if (tooClose) break;
        }
        if (tooClose) continue;
      }

      rawTrees.push({
        x,
        y,
        width: treeWidth,
        height: treeHeight,
        prefabFile
      });

      // Mark ground footprint as occupied in O(1) grids
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < treeWidth; dx++) {
          treeOccupied[y + dy]![x + dx] = true;
          treeSpeciesGrid[y + dy]![x + dx] = prefabFile;
        }
      }
    }
  }

  // 5. Route Gate Flank Sealing & Anti-Bypass Barriers
  // Seal flanks of every route checkpoint with canonical fences, dense trees, and BFS verification
  for (const poi of pois) {
    if (poi.type === 'route_gate') {
      sealRouteGateFlankBarriers({
        continent,
        gate: poi,
        trees: rawTrees,
        props,
        pathGrid,
        blockedMask: treeBlocked
      });
    }
  }

  // 6. Strict Y-Sorting Guarantee:
  // Sort trees by Y ascending so that north trees blit first, and south tree canopies overlap their bases!
  const trees = [...rawTrees].sort((a, b) => a.y - b.y || a.x - b.x);

  return {
    tallGrassGrid,
    tallGrassPatches,
    trees,
    props
  };
}
