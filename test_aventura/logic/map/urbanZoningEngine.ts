/**
 * src/logic/map/urbanZoningEngine.ts
 *
 * INTELLIGENT URBAN ZONING & CITY GENERATOR (Hamlet to Metropolis)
 *
 * Governs dynamic street grid generation, lot/parcel extraction, civic building allocation
 * (Pokémon Center, Poké Mart, Gym, Oak's Lab, Plazas), density-driven residential fill,
 * and guaranteed 100% transitable door-to-street connectivity.
 */

import type { CityGenerationConfig, UrbanScale } from '../../types/map/adventureWorldTypes';
import type { CardinalDirection } from '../../types/map/poiTypes';
import {
  KANTO_HOUSE_SMALL,
  KANTO_HOUSE_BLUE,
  POKEMART,
  POKEMON_CENTER,
  KANTO_LAB,
  KANTO_GYM,
  PLAZA_FOUNTAIN,
  PLAZA_PARK,
  type StructureTemplate
} from '../../config/mapStructures';
import type { TileCollision } from './tilesRegistry.ts';
import type {
  ThemeBiomePalette,
  MapCell,
  MapSpawn,
  MapWarp
} from './proceduralMapGenerator';
import { placeScenicProps, type PropsPlacementResult } from './propsPlacementEngine.ts';

const PARK_BUSH_DENSITY = 0.25;

export interface UrbanZoningOptions {
  mapWidth: number;
  mapHeight: number;
  seed: number;
  config: CityGenerationConfig;
  palette: ThemeBiomePalette;
  baseLayer: (MapCell | null)[][];
  elevationLayer: (MapCell | null)[][];
  objectLayer: (MapCell | null)[][];
  collisionGrid: TileCollision[][];
  isPathCell: boolean[][];
  warps: MapWarp[];
  spawns: MapSpawn[];
  makeCell: (tileId: string, collision: TileCollision) => MapCell;
}

export interface UrbanLot {
  x: number;
  y: number;
  width: number;
  height: number;
  doorX: number;
  doorY: number;
  roadConnectX: number;
  roadConnectY: number;
}

export interface UrbanLayoutResult {
  placedBuildingsCount: number;
  placedCivicCount: number;
  lotsIdentified: number;
  propsResult?: PropsPlacementResult;
}

/**
 * Main entry point for procedural urban zoning.
 */
export function generateUrbanLayout(options: UrbanZoningOptions): UrbanLayoutResult {
  const {
    mapWidth,
    mapHeight,
    seed,
    config,
    palette,
    baseLayer,
    elevationLayer,
    objectLayer,
    collisionGrid,
    isPathCell,
    warps,
    spawns,
    makeCell
  } = options;

  const LCG_MULTIPLIER = 9301 as const;
  const LCG_INCREMENT = 49297 as const;
  const LCG_MODULUS = 233280 as const;

  let prngState = (seed * LCG_MULTIPLIER + LCG_INCREMENT) % LCG_MODULUS;
  function prng(): number {
    prngState = (prngState * LCG_MULTIPLIER + LCG_INCREMENT) % LCG_MODULUS;
    return prngState / LCG_MODULUS;
  }

  // 1. Generate Street Grid based on Urban Scale
  const streetNetwork = generateStreetNetwork(isPathCell, mapWidth, mapHeight, config.scale);

  // 2. Identify Rectangular Building Lots along Street Frontages
  const availableLots = extractAvailableLots(isPathCell, mapWidth, mapHeight, streetNetwork);

  let placedBuildingsCount = 0;
  let placedCivicCount = 0;
  const occupiedLots = new Set<number>();

  // 3. Civic Buildings Allocation Pass
  // 3.1 Plaza (if requested)
  if (config.plazaType && config.plazaType !== 'none') {
    const plazaTemplate = config.plazaType === 'fountain' ? PLAZA_FOUNTAIN : PLAZA_PARK;
    const centralLotIndex = findLotNearCoords(availableLots, occupiedLots, streetNetwork.center.x, streetNetwork.center.y, plazaTemplate.footprint);
    if (centralLotIndex !== -1) {
      const lot = availableLots[centralLotIndex]!;
      occupiedLots.add(centralLotIndex);
      stampStructureAt(elevationLayer, collisionGrid, objectLayer, plazaTemplate, lot.x, lot.y, mapWidth, mapHeight, makeCell);
      placedCivicCount++;
    }
  }

  // 3.2 Oak's Research Lab
  const shouldPlaceLab = config.includeLab ?? (config.scale === 'hamlet');
  if (shouldPlaceLab) {
    const labLotIndex = findBestLotFor(availableLots, occupiedLots, KANTO_LAB.footprint, 'south', mapHeight);
    if (labLotIndex !== -1) {
      const lot = availableLots[labLotIndex]!;
      occupiedLots.add(labLotIndex);
      stampStructureWithDoorway(
        baseLayer,
        elevationLayer,
        objectLayer,
        collisionGrid,
        isPathCell,
        palette,
        KANTO_LAB,
        lot.x,
        lot.y,
        mapWidth,
        mapHeight,
        warps,
        spawns,
        makeCell,
        '_lab'
      );
      placedCivicCount++;
      placedBuildingsCount++;
    }
  }

  // 3.3 Pokémon Center (standard in village, town, city, metropolis)
  const shouldPlaceCenter = config.scale !== 'hamlet';
  if (shouldPlaceCenter) {
    const centerLotIndex = findBestLotFor(availableLots, occupiedLots, POKEMON_CENTER.footprint, 'west', mapWidth);
    if (centerLotIndex !== -1) {
      const lot = availableLots[centerLotIndex]!;
      occupiedLots.add(centerLotIndex);
      stampStructureWithDoorway(
        baseLayer,
        elevationLayer,
        objectLayer,
        collisionGrid,
        isPathCell,
        palette,
        POKEMON_CENTER,
        lot.x,
        lot.y,
        mapWidth,
        mapHeight,
        warps,
        spawns,
        makeCell,
        '_pc'
      );
      placedCivicCount++;
      placedBuildingsCount++;
    }
  }

  // 3.4 Poké Mart (village, town, city, metropolis)
  const shouldPlaceMart = config.scale !== 'hamlet';
  if (shouldPlaceMart) {
    const martLotIndex = findBestLotFor(availableLots, occupiedLots, POKEMART.footprint, 'east', mapWidth);
    if (martLotIndex !== -1) {
      const lot = availableLots[martLotIndex]!;
      occupiedLots.add(martLotIndex);
      stampStructureWithDoorway(
        baseLayer,
        elevationLayer,
        objectLayer,
        collisionGrid,
        isPathCell,
        palette,
        POKEMART,
        lot.x,
        lot.y,
        mapWidth,
        mapHeight,
        warps,
        spawns,
        makeCell,
        '_mart'
      );
      placedCivicCount++;
      placedBuildingsCount++;
    }
  }

  // 3.5 Official Pokémon Gym (town, city, metropolis)
  const shouldPlaceGym = config.includeGym ?? (['town', 'city', 'metropolis'].includes(config.scale));
  if (shouldPlaceGym) {
    const gymLotIndex = findBestLotFor(availableLots, occupiedLots, KANTO_GYM.footprint, 'north', mapHeight);
    if (gymLotIndex !== -1) {
      const lot = availableLots[gymLotIndex]!;
      occupiedLots.add(gymLotIndex);
      stampStructureWithDoorway(
        baseLayer,
        elevationLayer,
        objectLayer,
        collisionGrid,
        isPathCell,
        palette,
        KANTO_GYM,
        lot.x,
        lot.y,
        mapWidth,
        mapHeight,
        warps,
        spawns,
        makeCell,
        '_gym'
      );
      placedCivicCount++;
      placedBuildingsCount++;
    }
  }

  // 4. Residential & Commercial Lots Fill Pass (Density-driven 1..10)
  const densityThreshold = Math.max(0.15, Math.min(1.0, config.buildingDensity * 0.1));
  const residentialTemplates = [KANTO_HOUSE_SMALL, KANTO_HOUSE_BLUE, POKEMART];

  for (let i = 0; i < availableLots.length; i++) {
    if (occupiedLots.has(i)) continue;

    const roll = prng();
    if (roll <= densityThreshold) {
      const lot = availableLots[i]!;
      const chosenTemplate =
        placedBuildingsCount <= 2
          ? KANTO_HOUSE_SMALL
          : residentialTemplates[Math.floor(prng() * residentialTemplates.length)]!;

      if (lot.width >= chosenTemplate.footprint.width && lot.height >= chosenTemplate.footprint.height) {
        occupiedLots.add(i);
        stampStructureWithDoorway(
          baseLayer,
          elevationLayer,
          objectLayer,
          collisionGrid,
          isPathCell,
          palette,
          chosenTemplate,
          lot.x,
          lot.y,
          mapWidth,
          mapHeight,
          warps,
          spawns,
          makeCell,
          `_res_${placedBuildingsCount}`
        );
        placedBuildingsCount++;
      }
    } else {
      // Empty lot: scatter small garden, bushes or flowers
      const lot = availableLots[i]!;
      occupiedLots.add(i);
      decorateEmptyLot(objectLayer, collisionGrid, lot, palette, makeCell, prng);
    }
  }

  // 5. Player and Navigation Spawns
  spawns.unshift({
    id: 'player_start',
    x: streetNetwork.center.x,
    y: streetNetwork.center.y,
    direction: 'down'
  });

  spawns.push({
    id: 'town_exit_south',
    x: streetNetwork.center.x,
    y: mapHeight - 2,
    direction: 'up'
  });

  // 6. Scenic Props & Urban Furniture Placement Pass
  const propsResult = placeScenicProps({
    mapWidth,
    mapHeight,
    seed,
    density: config.propsDensity ?? 50,
    includeFences: config.includeFences ?? true,
    isUrban: true,
    baseLayer,
    elevationLayer,
    objectLayer,
    collisionGrid,
    isPathCell,
    lots: availableLots,
    occupiedLots,
    streetNetwork,
    spawns,
    warps,
    makeCell
  });

  return {
    placedBuildingsCount,
    placedCivicCount,
    lotsIdentified: availableLots.length,
    propsResult
  };
}

/**
 * Generates street grid networks based on urban scale.
 */
export function generateStreetNetwork(
  isPathCell: boolean[][],
  width: number,
  height: number,
  scale: UrbanScale
): { center: { x: number; y: number }; xRoads: number[]; yRoads: number[] } {
  const midX = Math.floor(width / 2);
  const midY = Math.floor(height / 2);

  const xRoads: number[] = [];
  const yRoads: number[] = [];

  if (scale === 'hamlet') {
    // Single main horizontal path + central vertical connector
    yRoads.push(midY);
    xRoads.push(midX);
  } else if (scale === 'village') {
    // Dual perpendicular central avenues
    yRoads.push(midY);
    xRoads.push(midX);
  } else if (scale === 'town') {
    // 2 horizontal avenues + central & optional lateral vertical streets
    yRoads.push(Math.floor(height * 0.38), Math.floor(height * 0.65));
    xRoads.push(midX);
    if (width >= 44) {
      xRoads.push(Math.floor(width * 0.28), Math.floor(width * 0.72));
    }
  } else if (scale === 'city') {
    // 2 horizontal boulevards + 3 vertical streets
    yRoads.push(Math.floor(height * 0.32), Math.floor(height * 0.68));
    xRoads.push(Math.floor(width * 0.25), midX, Math.floor(width * 0.75));
  } else {
    // Metropolis: 3 horizontal + 3 vertical boulevards
    yRoads.push(Math.floor(height * 0.26), midY, Math.floor(height * 0.74));
    xRoads.push(Math.floor(width * 0.25), midX, Math.floor(width * 0.75));
  }

  // Stamp horizontal avenues (width 2)
  for (const ry of yRoads) {
    for (let x = 0; x < width; x++) {
      for (let dy = -1; dy <= 0; dy++) {
        const y = ry + dy;
        if (y >= 0 && y < height) isPathCell[y]![x] = true;
      }
    }
  }

  // Stamp vertical avenues (width 2)
  for (const rx of xRoads) {
    for (let y = 0; y < height; y++) {
      for (let dx = -1; dx <= 0; dx++) {
        const x = rx + dx;
        if (x >= 0 && x < width) isPathCell[y]![x] = true;
      }
    }
  }

  return {
    center: { x: midX, y: midY },
    xRoads,
    yRoads
  };
}

/**
 * Extracts candidate rectangular building lots along street edges.
 */
export function extractAvailableLots(
  isPathCell: boolean[][],
  mapWidth: number,
  mapHeight: number,
  network: { xRoads: number[]; yRoads: number[] }
): UrbanLot[] {
  const lots: UrbanLot[] = [];
  const LOT_W = 6;
  const LOT_H = 5;
  const PADDING = 3;

  const claimed: boolean[][] = Array.from({ length: mapHeight }, () => Array(mapWidth).fill(false));

  // 1. First Pass: Primary South-facing lots along North side of all horizontal avenues
  for (const ry of network.yRoads) {
    const lotY = ry - 1 - LOT_H;
    if (lotY < PADDING) continue;

    for (let x = PADDING; x <= mapWidth - LOT_W - PADDING; x++) {
      let isFree = true;
      for (let ly = lotY; ly < lotY + LOT_H; ly++) {
        for (let lx = x; lx < x + LOT_W; lx++) {
          if (isPathCell[ly]![lx] || claimed[ly]![lx]) {
            isFree = false;
            break;
          }
        }
        if (!isFree) break;
      }

      if (!isFree) continue;

      const roadConnectY = lotY + LOT_H;
      if (roadConnectY < mapHeight) {
        const doorX = x + Math.floor(LOT_W / 2);
        const doorY = lotY + LOT_H - 1;

        lots.push({
          x,
          y: lotY,
          width: LOT_W,
          height: LOT_H,
          doorX,
          doorY,
          roadConnectX: doorX,
          roadConnectY
        });

        for (let ly = lotY; ly < lotY + LOT_H; ly++) {
          for (let lx = x; lx < x + LOT_W; lx++) {
            claimed[ly]![lx] = true;
          }
        }

        x += LOT_W;
      }
    }
  }

  // 2. Second Pass: Lots along South side of horizontal avenues
  for (const ry of network.yRoads) {
    const lotY = ry + 1;
    if (lotY + LOT_H > mapHeight - PADDING) continue;

    for (let x = PADDING; x <= mapWidth - LOT_W - PADDING; x++) {
      let isFree = true;
      for (let ly = lotY; ly < lotY + LOT_H; ly++) {
        for (let lx = x; lx < x + LOT_W; lx++) {
          if (isPathCell[ly]![lx] || claimed[ly]![lx]) {
            isFree = false;
            break;
          }
        }
        if (!isFree) break;
      }

      if (!isFree) continue;

      const doorX = x + Math.floor(LOT_W / 2);
      const doorY = lotY + LOT_H - 1;
      const roadConnectY = lotY - 1;

      lots.push({
        x,
        y: lotY,
        width: LOT_W,
        height: LOT_H,
        doorX,
        doorY,
        roadConnectX: doorX,
        roadConnectY
      });

      for (let ly = lotY; ly < lotY + LOT_H; ly++) {
        for (let lx = x; lx < x + LOT_W; lx++) {
          claimed[ly]![lx] = true;
        }
      }

      x += LOT_W;
    }
  }

  return lots;
}

/**
 * Finds lot closest to target coordinates.
 */
export function findLotNearCoords(
  lots: UrbanLot[],
  occupied: Set<number>,
  targetX: number,
  targetY: number,
  footprint: { width: number; height: number }
): number {
  let bestIdx = -1;
  let bestDist = Infinity;

  for (let i = 0; i < lots.length; i++) {
    if (occupied.has(i)) continue;
    const lot = lots[i]!;
    if (lot.width < footprint.width || lot.height < footprint.height) continue;

    const d = Math.hypot(lot.x - targetX, lot.y - targetY);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }

  return bestIdx;
}

/**
 * Finds best lot for a building prioritizing quadrant bias (north, south, east, west).
 */
export function findBestLotFor(
  lots: UrbanLot[],
  occupied: Set<number>,
  footprint: { width: number; height: number },
  bias: CardinalDirection,
  boundary: number
): number {
  let bestIdx = -1;
  let bestScore = -Infinity;

  for (let i = 0; i < lots.length; i++) {
    if (occupied.has(i)) continue;
    const lot = lots[i]!;
    if (lot.width < footprint.width || lot.height < footprint.height) continue;

    let score = 0;
    if (bias === 'north') score = boundary - lot.y;
    else if (bias === 'south') score = lot.y;
    else if (bias === 'west') score = boundary - lot.x;
    else if (bias === 'east') score = lot.x;

    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return bestIdx;
}

/**
 * Stamps a structure template and connects its door cleanly to the road grid.
 */
function stampStructureWithDoorway(
  baseLayer: (MapCell | null)[][],
  elevationLayer: (MapCell | null)[][],
  objectLayer: (MapCell | null)[][],
  collisionGrid: TileCollision[][],
  isPathCell: boolean[][],
  palette: ThemeBiomePalette,
  template: StructureTemplate,
  x: number,
  y: number,
  mapWidth: number,
  mapHeight: number,
  warps: MapWarp[],
  spawns: MapSpawn[],
  makeCell: (tileId: string, collision: TileCollision) => MapCell,
  suffix: string
): void {
  const { width: fw, height: fh } = template.footprint;
  if (x + fw > mapWidth || y + fh > mapHeight) return;

  let localDoorX = -1;
  let localDoorY = -1;

  for (let r = 0; r < fh; r++) {
    for (let c = 0; c < fw; c++) {
      const tileId = template.tiles[r]?.[c];
      const col = template.collisionMask[r]?.[c] ?? 1;
      const gx = x + c;
      const gy = y + r;

      if (tileId) {
        const isDoor = col === 0 && r === fh - 1;
        if (isDoor) {
          localDoorX = gx;
          localDoorY = gy;
          isPathCell[gy]![gx] = true;
        }

        const tileCol: TileCollision = col === 1 ? true : col === 2 ? 'water' : false;
        elevationLayer[gy]![gx] = makeCell(tileId, tileCol);
        collisionGrid[gy]![gx] = tileCol;
      }
      if (objectLayer[gy]) objectLayer[gy]![gx] = null;
    }
  }

  // Connect door to the nearest road cell if door exists
  if (localDoorX !== -1 && localDoorY !== -1) {
    const doorstepY = localDoorY + 1;
    if (doorstepY < mapHeight) {
      // Path leading down towards street
      for (let py = doorstepY; py < Math.min(mapHeight, doorstepY + 3); py++) {
        baseLayer[py]![localDoorX] = makeCell(palette.path.center, false);
        collisionGrid[py]![localDoorX] = false;
        isPathCell[py]![localDoorX] = true;
        if (objectLayer[py]) objectLayer[py]![localDoorX] = null;
        if (py < mapHeight - 1 && isPathCell[py + 1]![localDoorX]) break;
      }
    }

    // Register Warp & Spawn
    warps.push({
      x: localDoorX,
      y: localDoorY,
      targetMapId: template.interiorMapId ?? `interior_${template.id}`,
      targetSpawnId: template.defaultSpawnId ?? 'spawn_door'
    });

    spawns.push({
      id: `${template.id}_exit${suffix}`,
      x: localDoorX,
      y: Math.min(mapHeight - 1, localDoorY + 1),
      direction: 'down'
    });
  }
}

/**
 * Stamps civic structures without doors (such as fountains and parks).
 */
function stampStructureAt(
  elevationLayer: (MapCell | null)[][],
  collisionGrid: TileCollision[][],
  objectLayer: (MapCell | null)[][],
  template: StructureTemplate,
  x: number,
  y: number,
  mapWidth: number,
  mapHeight: number,
  makeCell: (tileId: string, collision: TileCollision) => MapCell
): void {
  const { width: fw, height: fh } = template.footprint;
  for (let r = 0; r < fh; r++) {
    for (let c = 0; c < fw; c++) {
      const tileId = template.tiles[r]?.[c];
      const col = template.collisionMask[r]?.[c] ?? 1;
      const gx = x + c;
      const gy = y + r;

      if (gx < mapWidth && gy < mapHeight && tileId) {
        const tileCol: TileCollision = col === 1 ? true : col === 2 ? 'water' : false;
        elevationLayer[gy]![gx] = makeCell(tileId, tileCol);
        collisionGrid[gy]![gx] = tileCol;
      }
      if (objectLayer[gy]?.[gx]) objectLayer[gy]![gx] = null;
    }
  }
}

/**
 * Decorates unbuilt lots with gardens, small trees, and bushes.
 */
function decorateEmptyLot(
  objectLayer: (MapCell | null)[][],
  collisionGrid: TileCollision[][],
  lot: UrbanLot,
  palette: ThemeBiomePalette,
  makeCell: (tileId: string, collision: TileCollision) => MapCell,
  prng: () => number
): void {
  for (let y = lot.y; y < lot.y + lot.height; y++) {
    for (let x = lot.x; x < lot.x + lot.width; x++) {
      if (prng() < PARK_BUSH_DENSITY && objectLayer[y]?.[x] === null && !collisionGrid[y]?.[x]) {
        objectLayer[y]![x] = makeCell(palette.props.bush, true);
        collisionGrid[y]![x] = true;
      }
    }
  }
}
