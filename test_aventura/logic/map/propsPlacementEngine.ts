/**
 * src/logic/map/propsPlacementEngine.ts
 *
 * CANONICAL SCENIC PROPS & URBAN FURNITURE PLACEMENT ENGINE (SSoT)
 *
 * Governs procedural placement of street lamps, residential mailboxes,
 * civic signposts, plaza benches, perimeter fences, and wildflower clusters.
 * Enforces strictly the Clearance Invariant (zero solid props on doors, doorsteps,
 * player spawns, or active road circulation lanes).
 */

import {
  type MapPropDefinition,
  STREET_LAMP,
  MAILBOX,
  BENCH_WOODEN,
  BENCH_STONE,
  FLOWER_POT,
  SIGNPOST,
  FENCE_WHITE,
  FENCE_WOOD,
  TRASH_BIN,
  FLOWERS_RED,
  FLOWERS_YELLOW,
  FLOWERS_BLUE,
  WOOD_STUMP,
  TRIMMED_HEDGE,
  FIELD_ROCK
} from '../../config/mapProps';
import { type TileCollision, type TilesRegistryService, defaultTilesRegistry } from './tilesRegistry.ts';
import type {
  MapCell,
  MapSpawn,
  MapWarp,
  GeneratedMap,
  CollisionType
} from './proceduralMapGenerator.ts';
import type { UrbanLot } from './urbanZoningEngine.ts';

export interface PropsPlacementOptions {
  readonly mapWidth: number;
  readonly mapHeight: number;
  readonly seed: number;
  readonly density: number; // 0 to 100
  readonly includeFences?: boolean; // default: true
  readonly isUrban: boolean;
  readonly baseLayer: (MapCell | null)[][];
  readonly elevationLayer: (MapCell | null)[][];
  readonly objectLayer: (MapCell | null)[][];
  readonly collisionGrid: TileCollision[][];
  readonly isPathCell: boolean[][];
  readonly lots?: readonly UrbanLot[];
  readonly occupiedLots?: ReadonlySet<number>;
  readonly streetNetwork?: {
    readonly center: { readonly x: number; readonly y: number };
    readonly xRoads: readonly number[];
    readonly yRoads: readonly number[];
  };
  readonly spawns?: readonly MapSpawn[];
  readonly warps?: readonly MapWarp[];
  readonly makeCell: (tileId: string, collision: TileCollision) => MapCell;
}

export interface PropsPlacementResult {
  readonly placedPropsCount: number;
  readonly lampsCount: number;
  readonly mailboxesCount: number;
  readonly benchesCount: number;
  readonly fencesCount: number;
  readonly flowersCount: number;
}

/**
 * Deterministic Mulberry32 Pseudo-Random Number Generator.
 */
function mulberry32(seed: number): () => number {
  let state = Math.floor(seed) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Checks if a prop can be safely placed at (x, y) without out-of-bounds or collision conflicts.
 */
export function canPlacePropAt(
  objectLayer: (MapCell | null)[][],
  elevationLayer: (MapCell | null)[][],
  isPathCell: boolean[][],
  prop: MapPropDefinition,
  x: number,
  y: number,
  mapWidth: number,
  mapHeight: number,
  allowOnPath = false
): boolean {
  // 1. Strict Boundary Check (prevents out-of-bounds access)
  if (x < 0 || y < 0 || x + prop.width > mapWidth || y + prop.height > mapHeight) {
    return false;
  }

  // 2. Multi-cell clearance check
  for (let r = 0; r < prop.height; r++) {
    for (let c = 0; c < prop.width; c++) {
      const gx = x + c;
      const gy = y + r;

      // Cannot overwrite existing decoration / tree / prop
      if (objectLayer[gy]?.[gx] !== null) {
        return false;
      }

      // Cannot overwrite building / water / elevation
      if (elevationLayer[gy]?.[gx] !== null) {
        return false;
      }

      // Clearance Invariant: Solid prop tiles must never be placed on paths
      const isSolid = prop.collisionMask[r]?.[c] === 1;
      if (isSolid && !allowOnPath && isPathCell[gy]?.[gx]) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Stamps a prop directly into objectLayer and updates collisionGrid synchronously.
 */
export function stampPropAt(
  objectLayer: (MapCell | null)[][],
  collisionGrid: TileCollision[][],
  prop: MapPropDefinition,
  x: number,
  y: number,
  mapWidth: number,
  mapHeight: number,
  makeCell: (tileId: string, collision: TileCollision) => MapCell
): boolean {
  if (x < 0 || y < 0 || x + prop.width > mapWidth || y + prop.height > mapHeight) {
    return false;
  }

  for (let r = 0; r < prop.height; r++) {
    for (let c = 0; c < prop.width; c++) {
      const gx = x + c;
      const gy = y + r;
      const tileId = prop.tiles[r]?.[c];
      const isSolid = prop.collisionMask[r]?.[c] === 1;

      if (tileId) {
        objectLayer[gy]![gx] = makeCell(tileId, isSolid);
        if (isSolid) {
          collisionGrid[gy]![gx] = true;
        }
      }
    }
  }

  return true;
}

/**
 * Stamps a prop onto a full GeneratedMap instance (used by editor tools).
 */
export function stampProp(
  targetMap: GeneratedMap,
  prop: MapPropDefinition,
  gridX: number,
  gridY: number,
  registry: TilesRegistryService = defaultTilesRegistry
): boolean {
  const { width: pw, height: ph } = prop;

  if (
    gridX < 0 ||
    gridY < 0 ||
    gridX + pw > targetMap.width ||
    gridY + ph > targetMap.height
  ) {
    return false;
  }

  const decLayer = targetMap.layers.decorations as (MapCell | null)[][];
  const legacyDec = targetMap.objectLayer as (MapCell | null)[][] | undefined;
  const colMat = targetMap.collisionMatrix as CollisionType[][];
  const colGrid = targetMap.collisionGrid as TileCollision[][] | undefined;

  for (let r = 0; r < ph; r++) {
    for (let c = 0; c < pw; c++) {
      const tileId = prop.tiles[r]?.[c];
      const col = prop.collisionMask[r]?.[c] ?? 0;
      const isSolid = col === 1;
      const gx = gridX + c;
      const gy = gridY + r;

      if (tileId) {
        const entry = registry.getTileById(tileId);
        const filePath = entry ? entry.file_path : `/assets/tiles/decorations/${tileId}.png`;
        const cell: MapCell = { tileId, filePath, collision: isSolid };

        decLayer[gy]![gx] = cell;
        if (legacyDec) {
          legacyDec[gy]![gx] = cell;
        }

        if (isSolid) {
          colMat[gy]![gx] = 1;
          if (colGrid) {
            colGrid[gy]![gx] = true;
          }
        }
      }
    }
  }

  return true;
}

/**
 * Main procedural placement entry point.
 */
export function placeScenicProps(options: PropsPlacementOptions): PropsPlacementResult {
  const {
    mapWidth,
    mapHeight,
    seed,
    density,
    includeFences = true,
    isUrban,
    baseLayer: _baseLayer,
    elevationLayer,
    objectLayer,
    collisionGrid,
    isPathCell,
    lots = [],
    occupiedLots = new Set<number>(),
    streetNetwork,
    spawns = [],
    warps = [],
    makeCell
  } = options;

  if (density <= 0) {
    return {
      placedPropsCount: 0,
      lampsCount: 0,
      mailboxesCount: 0,
      benchesCount: 0,
      fencesCount: 0,
      flowersCount: 0
    };
  }

  const prng = mulberry32(seed + 8080);
  const dFactor = Math.min(1.0, Math.max(0.05, density / 100));

  let placedPropsCount = 0;
  let lampsCount = 0;
  let mailboxesCount = 0;
  let benchesCount = 0;
  let fencesCount = 0;
  let flowersCount = 0;

  // Build strict exclusion set for Pedestrian Clearance Invariant
  const reservedPositions = new Set<string>();

  // Exclude all spawn points
  for (const sp of spawns) {
    reservedPositions.add(`${sp.x},${sp.y}`);
  }

  // Exclude all doors and doorsteps
  for (const wp of warps) {
    reservedPositions.add(`${wp.x},${wp.y}`);
    reservedPositions.add(`${wp.x},${wp.y + 1}`);
  }

  // Exclude doors from lot definitions as well
  for (const lot of lots) {
    reservedPositions.add(`${lot.doorX},${lot.doorY}`);
    reservedPositions.add(`${lot.doorX},${lot.doorY + 1}`);
    reservedPositions.add(`${lot.roadConnectX},${lot.roadConnectY}`);
  }

  const isReserved = (x: number, y: number, w = 1, h = 1): boolean => {
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        if (reservedPositions.has(`${x + c},${y + r}`)) return true;
      }
    }
    return false;
  };

  if (isUrban && streetNetwork) {
    // -------------------------------------------------------------
    // 1. Street Lamps along horizontal and vertical avenues
    // -------------------------------------------------------------
    const lampSpacing = 6;

    for (const ry of streetNetwork.yRoads) {
      // Avenue occupies ry - 1 and ry.
      // Sidewalks are at ry - 2 (North) and ry + 1 (South).
      for (let x = 3; x <= mapWidth - 4; x += lampSpacing) {
        if (prng() > dFactor) continue;

        // Try South sidewalk (lamp base at ry + 1)
        const southY = ry + 1;
        if (
          southY + 1 < mapHeight &&
          !isReserved(x, southY, 1, 2) &&
          canPlacePropAt(objectLayer, elevationLayer, isPathCell, STREET_LAMP, x, southY, mapWidth, mapHeight)
        ) {
          stampPropAt(objectLayer, collisionGrid, STREET_LAMP, x, southY, mapWidth, mapHeight, makeCell);
          placedPropsCount++;
          lampsCount++;
        } else {
          // Try North sidewalk (lamp top at ry - 3, base at ry - 2)
          const northY = ry - 3;
          if (
            northY >= 0 &&
            !isReserved(x, northY, 1, 2) &&
            canPlacePropAt(objectLayer, elevationLayer, isPathCell, STREET_LAMP, x, northY, mapWidth, mapHeight)
          ) {
            stampPropAt(objectLayer, collisionGrid, STREET_LAMP, x, northY, mapWidth, mapHeight, makeCell);
            placedPropsCount++;
            lampsCount++;
          }
        }
      }
    }

    for (const rx of streetNetwork.xRoads) {
      for (let y = 3; y <= mapHeight - 5; y += lampSpacing) {
        if (prng() > dFactor) continue;

        // Try East sidewalk
        const eastX = rx + 1;
        if (
          eastX < mapWidth &&
          !isReserved(eastX, y, 1, 2) &&
          canPlacePropAt(objectLayer, elevationLayer, isPathCell, STREET_LAMP, eastX, y, mapWidth, mapHeight)
        ) {
          stampPropAt(objectLayer, collisionGrid, STREET_LAMP, eastX, y, mapWidth, mapHeight, makeCell);
          placedPropsCount++;
          lampsCount++;
        }
      }
    }

    // -------------------------------------------------------------
    // 2. Residential Mailboxes & Front Gardens
    // -------------------------------------------------------------
    for (let i = 0; i < lots.length; i++) {
      if (!occupiedLots.has(i)) continue;
      const lot = lots[i]!;

      // Attempt to place mailbox 1 tile adjacent to door (doorstep row)
      const sideOffsets = prng() < 0.5 ? [1, -1] : [-1, 1];
      for (const ox of sideOffsets) {
        const mbX = lot.doorX + ox;
        const mbY = lot.doorY + 1; // doorstep row adjacent to front door
        if (
          mbX >= lot.x &&
          mbX < lot.x + lot.width &&
          mbY < mapHeight &&
          !isReserved(mbX, mbY, 1, 1) &&
          canPlacePropAt(objectLayer, elevationLayer, isPathCell, MAILBOX, mbX, mbY, mapWidth, mapHeight)
        ) {
          stampPropAt(objectLayer, collisionGrid, MAILBOX, mbX, mbY, mapWidth, mapHeight, makeCell);
          placedPropsCount++;
          mailboxesCount++;
          break;
        }
      }

      // -------------------------------------------------------------
      // 3. Perimeter Fences & Hedges around lots
      // -------------------------------------------------------------
      if (includeFences && dFactor >= 0.25) {
        const fenceProp = prng() < 0.6 ? FENCE_WHITE : TRIMMED_HEDGE;
        // Front lot border facing road (lot.y + lot.height - 1)
        const frontY = lot.y + lot.height - 1;
        for (let fx = lot.x; fx < lot.x + lot.width; fx++) {
          // Strict clearance: never fence the door column or doorstep!
          if (fx === lot.doorX || Math.abs(fx - lot.doorX) <= 0) continue;
          if (isReserved(fx, frontY, 1, 1)) continue;

          if (
            canPlacePropAt(objectLayer, elevationLayer, isPathCell, fenceProp, fx, frontY, mapWidth, mapHeight)
          ) {
            stampPropAt(objectLayer, collisionGrid, fenceProp, fx, frontY, mapWidth, mapHeight, makeCell);
            placedPropsCount++;
            fencesCount++;
          }
        }
      }

      // -------------------------------------------------------------
      // 3.5. Orderly Front Yard Flowerbed (Classic GBA 1x2 or 1x3 rows)
      // -------------------------------------------------------------
      const flowerProp = prng() < 0.5 ? FLOWERS_RED : prng() < 0.5 ? FLOWERS_BLUE : FLOWERS_YELLOW;
      const yardY = lot.y + lot.height - 2;
      for (let fx = lot.x; fx < lot.x + lot.width; fx++) {
        if (fx === lot.doorX || Math.abs(fx - lot.doorX) <= 1) continue;
        if (isReserved(fx, yardY, 1, 1)) continue;
        if (canPlacePropAt(objectLayer, elevationLayer, isPathCell, flowerProp, fx, yardY, mapWidth, mapHeight)) {
          stampPropAt(objectLayer, collisionGrid, flowerProp, fx, yardY, mapWidth, mapHeight, makeCell);
          placedPropsCount++;
          flowersCount++;
        }
      }
    }

    // -------------------------------------------------------------
    // 4. Civic Signs & Informational Notice Boards
    // -------------------------------------------------------------
    for (const wp of warps) {
      if (prng() > dFactor) continue;
      const signX = wp.x + (prng() < 0.5 ? 2 : -2);
      const signY = wp.y + 1;

      if (
        signX >= 0 &&
        signX < mapWidth &&
        signY < mapHeight &&
        !isReserved(signX, signY, 1, 1) &&
        canPlacePropAt(objectLayer, elevationLayer, isPathCell, SIGNPOST, signX, signY, mapWidth, mapHeight)
      ) {
        stampPropAt(objectLayer, collisionGrid, SIGNPOST, signX, signY, mapWidth, mapHeight, makeCell);
        placedPropsCount++;
      }
    }

    // -------------------------------------------------------------
    // 5. Plaza Benches & Civic Waste Bins
    // -------------------------------------------------------------
    const benchProp = prng() < 0.5 ? BENCH_WOODEN : BENCH_STONE;
    const centerX = streetNetwork.center.x;
    const centerY = streetNetwork.center.y;

    // Place benches around central square quadrants if clear
    const benchCandidates = [
      { x: centerX - 4, y: centerY - 3 },
      { x: centerX + 2, y: centerY - 3 },
      { x: centerX - 4, y: centerY + 2 },
      { x: centerX + 2, y: centerY + 2 }
    ];

    for (const pos of benchCandidates) {
      if (prng() > dFactor) continue;
      if (
        !isReserved(pos.x, pos.y, benchProp.width, benchProp.height) &&
        canPlacePropAt(objectLayer, elevationLayer, isPathCell, benchProp, pos.x, pos.y, mapWidth, mapHeight)
      ) {
        stampPropAt(objectLayer, collisionGrid, benchProp, pos.x, pos.y, mapWidth, mapHeight, makeCell);
        placedPropsCount++;
        benchesCount++;
      }
    }

    // Plaza corners flower pots and trash bins
    const cornerCandidates = [
      { x: centerX - 5, y: centerY - 4, prop: FLOWER_POT },
      { x: centerX + 4, y: centerY - 4, prop: TRASH_BIN },
      { x: centerX - 5, y: centerY + 3, prop: TRASH_BIN },
      { x: centerX + 4, y: centerY + 3, prop: FLOWER_POT }
    ];

    for (const c of cornerCandidates) {
      if (prng() > dFactor) continue;
      if (
        !isReserved(c.x, c.y, 1, 1) &&
        canPlacePropAt(objectLayer, elevationLayer, isPathCell, c.prop, c.x, c.y, mapWidth, mapHeight)
      ) {
        stampPropAt(objectLayer, collisionGrid, c.prop, c.x, c.y, mapWidth, mapHeight, makeCell);
        placedPropsCount++;
      }
    }
  } else {
    // -------------------------------------------------------------
    // Wild Route Mode Scenic Decor
    // -------------------------------------------------------------
    // 1. Signpost at route entry / fork
    const midX = Math.floor(mapWidth / 2);
    const midY = Math.floor(mapHeight / 2);

    if (
      !isReserved(midX + 2, midY + 1, 1, 1) &&
      canPlacePropAt(objectLayer, elevationLayer, isPathCell, SIGNPOST, midX + 2, midY + 1, mapWidth, mapHeight)
    ) {
      stampPropAt(objectLayer, collisionGrid, SIGNPOST, midX + 2, midY + 1, mapWidth, mapHeight, makeCell);
      placedPropsCount++;
    }

    // 2. Wood fences along elevation / ledge runs
    if (includeFences) {
      for (let y = 4; y < mapHeight - 4; y += 5) {
        if (prng() > dFactor) continue;
        const x = 3 + Math.floor(prng() * 3);
        if (
          !isReserved(x, y, 1, 1) &&
          canPlacePropAt(objectLayer, elevationLayer, isPathCell, FENCE_WOOD, x, y, mapWidth, mapHeight)
        ) {
          stampPropAt(objectLayer, collisionGrid, FENCE_WOOD, x, y, mapWidth, mapHeight, makeCell);
          placedPropsCount++;
          fencesCount++;
        }
      }
    }

    // 3. Field rocks and wood stumps in open wild
    for (let y = 3; y < mapHeight - 3; y += 4) {
      for (let x = 3; x < mapWidth - 3; x += 4) {
        if (prng() < dFactor * 0.15) {
          const obstacleProp = prng() < 0.5 ? FIELD_ROCK : WOOD_STUMP;
          if (
            !isReserved(x, y, 1, 1) &&
            canPlacePropAt(objectLayer, elevationLayer, isPathCell, obstacleProp, x, y, mapWidth, mapHeight)
          ) {
            stampPropAt(objectLayer, collisionGrid, obstacleProp, x, y, mapWidth, mapHeight, makeCell);
            placedPropsCount++;
          }
        }
      }
    }
  }

  // -------------------------------------------------------------
  // Ubiquitous Flower Clusters (Walkable, both Urban & Route)
  // -------------------------------------------------------------
  const flowerProps = [FLOWERS_RED, FLOWERS_YELLOW, FLOWERS_BLUE];
  const numClusters = Math.floor((mapWidth * mapHeight * dFactor) / 100);

  for (let c = 0; c < numClusters; c++) {
    const cx = 3 + Math.floor(prng() * (mapWidth - 6));
    const cy = 3 + Math.floor(prng() * (mapHeight - 6));
    const clusterProp = flowerProps[Math.floor(prng() * flowerProps.length)]!;

    // Stamp a 2x2 or 3-flower cluster
    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = 0; dx <= 1; dx++) {
        if (prng() < 0.35) continue;
        const fx = cx + dx;
        const fy = cy + dy;

        if (
          !isReserved(fx, fy, 1, 1) &&
          canPlacePropAt(objectLayer, elevationLayer, isPathCell, clusterProp, fx, fy, mapWidth, mapHeight)
        ) {
          stampPropAt(objectLayer, collisionGrid, clusterProp, fx, fy, mapWidth, mapHeight, makeCell);
          placedPropsCount++;
          flowersCount++;
        }
      }
    }
  }

  return {
    placedPropsCount,
    lampsCount,
    mailboxesCount,
    benchesCount,
    fencesCount,
    flowersCount
  };
}
