/**
 * src/logic/map/canvasLandmarkRenderer.ts
 *
 * Dedicated rendering engine for regional POI landmarks, architectural structures,
 * cave entrances, port docks, cargo dressing, and route gatehouses.
 * Decoupled from canvasTileRenderer.ts to comply with the 1000-line SRP architecture limit.
 */

import type { ContinentMapResult } from './continentGenerator.ts';
import type { POINode, CardinalDirection } from '../../types/map/poiTypes.ts';

export const CANVAS_TILE_SIZE = 32;

/**
 * Resolves the orientation-specific canonical Vermilion Port Gate asset.
 */
export function resolvePortGateAsset(facing: CardinalDirection, baseFile?: string): string {
  if (baseFile && baseFile !== 'poke_port_vermilion_gate.png') {
    return baseFile;
  }
  switch (facing) {
    case 'north':
      return 'poke_port_vermilion_gate_north.png';
    case 'west':
      return 'poke_port_vermilion_gate_west.png';
    case 'east':
      return 'poke_port_vermilion_gate_east.png';
    case 'south':
    default:
      return 'poke_port_vermilion_gate.png';
  }
}

/**
 * Resolves the orientation-specific canonical port vessel asset.
 * - South: Canonical Vermilion docked passenger ferry (poke_ship_ferry_docked.png)
 * - North, East: Canonical 2.5D Seagallop Catamaran (poke_ship_seagallop_east.png)
 * - West: Canonical 2.5D Seagallop Catamaran (poke_ship_seagallop_west.png)
 */
export function resolvePortFerryAsset(facing: CardinalDirection): string {
  switch (facing) {
    case 'north':
    case 'east':
      return 'poke_ship_seagallop_east.png';
    case 'west':
      return 'poke_ship_seagallop_west.png';
    case 'south':
    default:
      return 'poke_ship_ferry_docked.png';
  }
}

export interface StampedBuilding {
  readonly file: string;
  readonly px: number;
  readonly py: number;
  readonly ySort: number;
}

export interface LandmarkBuildingParams {
  readonly continent: ContinentMapResult;
  readonly pois: readonly POINode[];
  readonly buildingFootprintMask: readonly (readonly boolean[])[];
  readonly unifiedPathGrid: readonly (readonly boolean[])[];
  readonly bridgeGrid?: readonly (readonly boolean[])[];
  readonly tileSize?: number;
}

const ROUTE_GATE_WIDTH = 6 as const;
const ROUTE_GATE_HEIGHT = 7 as const;
const ROUTE_GATE_HORIZONTAL_WIDTH = 8 as const;
const ROUTE_GATE_HORIZONTAL_HEIGHT = 5 as const;
const PORT_TRUCK_WIDTH = 3 as const;
const PORT_CARGO_DOUBLE_WIDTH = 2 as const;
const PORT_CARGO_STACK_WIDTH = 3 as const;
const PORT_FERRY_LENGTH = 7 as const;
const PORT_FERRY_BEAM = 5 as const;

/**
 * Resolves all architectural structures, landmarks, and contextual scenic dressings
 * into Y-sorted StampedBuilding instances for canvas rendering.
 */
export function resolvePoiLandmarksAndBuildings(
  params: LandmarkBuildingParams
): readonly StampedBuilding[] {
  const { continent, pois, buildingFootprintMask, unifiedPathGrid, bridgeGrid } = params;
  const tileSize = params.tileSize ?? CANVAS_TILE_SIZE;
  const H = continent.height;
  const W = continent.width;
  const buildingsToStamp: StampedBuilding[] = [];

  for (const poi of pois) {
    if (poi.urbanLayout && poi.urbanLayout.buildings.length > 0) {
      for (const b of poi.urbanLayout.buildings) {
        const px = b.x * tileSize + (b.pixelOffsetX ?? 0);
        const py = b.y * tileSize + (b.pixelOffsetY ?? 0);

        buildingsToStamp.push({
          file: b.prefabFile,
          px,
          py,
          ySort: py + b.height * tileSize
        });
      }
    } else {
      const px = poi.gridX * tileSize;
      const py = poi.gridY * tileSize;
      if (poi.type === 'cave_entrance') {
        const mtnPal = continent.geologicalClusters?.paletteMatrix?.[poi.gridY]?.[poi.gridX] ?? continent.mountainPalette ?? 'brown';
        const caveFile = mtnPal === 'gray'
          ? 'poke_cave_entrance_gray.png'
          : 'poke_cave_entrance_brown.png';

        buildingsToStamp.push({
          file: caveFile,
          px,
          py,
          ySort: py + poi.footprint.height * tileSize
        });

        // Authentic Mountain Scenery Props (flanking boulder, rubble stones & signpost)
        const gx = poi.gridX;
        const gy = poi.gridY;

        // 1. Canonical Boulder (1x1 tile) on left flank
        const boulderX = gx - 2;
        const boulderY = gy + 2;
        if (
          boulderX >= 0 &&
          boulderY < H &&
          continent.terrainMatrix[boulderY]?.[boulderX] === 'grass' &&
          (continent.heightmap[boulderY]?.[boulderX] ?? 0) === 0 &&
          !unifiedPathGrid[boulderY]?.[boulderX] &&
          !buildingFootprintMask[boulderY]?.[boulderX]
        ) {
          buildingsToStamp.push({
            file: 'poke_cave_boulder_rock.png',
            px: boulderX * tileSize,
            py: boulderY * tileSize,
            ySort: (boulderY + 1) * tileSize
          });
        }

        // 2. Canonical Rubble Stones (1x1 tile) on right cliff base flank
        const rubbleX = gx + 2;
        const rubbleY = gy + 2;
        if (
          rubbleX < W &&
          rubbleY < H &&
          continent.terrainMatrix[rubbleY]?.[rubbleX] === 'grass' &&
          (continent.heightmap[rubbleY]?.[rubbleX] ?? 0) === 0 &&
          !unifiedPathGrid[rubbleY]?.[rubbleX] &&
          !buildingFootprintMask[rubbleY]?.[rubbleX]
        ) {
          buildingsToStamp.push({
            file: 'poke_cave_rubble_stones.png',
            px: rubbleX * tileSize,
            py: rubbleY * tileSize,
            ySort: (rubbleY + 1) * tileSize
          });
        }

        // 3. Rustic Signpost on path flank
        const signX = gx - 1;
        const signY = gy + 3;
        if (
          signX >= 0 &&
          signY < H &&
          continent.terrainMatrix[signY]?.[signX] === 'grass' &&
          (continent.heightmap[signY]?.[signX] ?? 0) === 0 &&
          !unifiedPathGrid[signY]?.[signX] &&
          !buildingFootprintMask[signY]?.[signX]
        ) {
          buildingsToStamp.push({
            file: 'poke_signpost.png',
            px: signX * tileSize,
            py: signY * tileSize,
            ySort: (signY + 1) * tileSize
          });
        }
      } else if (poi.type === 'port_dock') {
        const facing = poi.facing ?? 'south';
        const gx = poi.gridX;
        const gy = poi.gridY;

        const isPureDryLand = (x: number, y: number, wTiles = 1, hTiles = 1, buffer = 1): boolean => {
          for (let dy = -buffer; dy < hTiles + buffer; dy++) {
            for (let dx = -buffer; dx < wTiles + buffer; dx++) {
              const cx = x + dx;
              const cy = y + dy;
              if (cx < 0 || cx >= W || cy < 0 || cy >= H) return false;
              const t = continent.terrainMatrix[cy]?.[cx];
              if (t === 'water' || t === 'water_deep') return false;
            }
          }
          return true;
        };

        const isDryUnpavedLand = (x: number, y: number, wTiles = 1, hTiles = 1, buffer = 1): boolean => {
          if (!isPureDryLand(x, y, wTiles, hTiles, buffer)) return false;
          for (let dy = 0; dy < hTiles; dy++) {
            for (let dx = 0; dx < wTiles; dx++) {
              const cx = x + dx;
              const cy = y + dy;
              if (unifiedPathGrid?.[cy]?.[cx] || bridgeGrid?.[cy]?.[cx]) return false;
            }
          }
          return true;
        };

        if (facing === 'south') {
          // 1. Authentic Vermilion Port Gate (7x6 tiles)
          const gateFile = resolvePortGateAsset('south', poi.buildingFile);
          buildingsToStamp.push({
            file: gateFile,
            px,
            py,
            ySort: py + poi.footprint.height * tileSize
          });

          // 2. Famous Vermilion Dock Truck (3x2 tiles) parked on dry beach next to the gate
          if (gx + 7 + PORT_TRUCK_WIDTH <= W && gy + 2 < H && isDryUnpavedLand(gx + 7, gy + 2, PORT_TRUCK_WIDTH, 2, 1)) {
            buildingsToStamp.push({
              file: 'poke_port_dock_truck.png',
              px: (gx + 7) * tileSize,
              py: (gy + 2) * tileSize,
              ySort: (gy + 4) * tileSize
            });
          }

          // 3. Double Cargo Crates Stack (2x1 tiles) on left side of gate
          if (gx >= 3 && gy + 2 < H && isDryUnpavedLand(gx - PORT_CARGO_DOUBLE_WIDTH - 1, gy + 2, PORT_CARGO_DOUBLE_WIDTH, 1, 1)) {
            buildingsToStamp.push({
              file: 'poke_port_cargo_crates_double.png',
              px: (gx - PORT_CARGO_DOUBLE_WIDTH - 1) * tileSize,
              py: (gy + 2) * tileSize,
              ySort: (gy + 4) * tileSize
            });
          }

          // 4. Single Cargo Crates Stack (3x2 tiles) on right esplanade
          if (gx + 7 + PORT_CARGO_STACK_WIDTH <= W && gy >= 2 && isDryUnpavedLand(gx + 7, gy - 1, PORT_CARGO_STACK_WIDTH, 2, 1)) {
            buildingsToStamp.push({
              file: 'poke_port_cargo_crates_stack.png',
              px: (gx + 7) * tileSize,
              py: (gy - 1) * tileSize,
              ySort: (gy + 1) * tileSize
            });
          }

          // 5. Pier bollard chains flanking gate entrance strictly on dry ground (at least 1 tile clear from water)
          if (gx >= 2 && gy + 4 < H && isDryUnpavedLand(gx - 2, gy + 4, 2, 1, 1)) {
            buildingsToStamp.push({
              file: 'poke_port_bollard_chains.png',
              px: (gx - 2) * tileSize,
              py: (gy + 4) * tileSize,
              ySort: (gy + 5) * tileSize
            });
          }
          if (gx + 7 + 2 <= W && gy + 4 < H && isDryUnpavedLand(gx + 7, gy + 4, 2, 1, 1)) {
            buildingsToStamp.push({
              file: 'poke_port_bollard_chains.png',
              px: (gx + 7) * tileSize,
              py: (gy + 4) * tileSize,
              ySort: (gy + 5) * tileSize
            });
          }

          // 6. Moored Passenger Ferry at the south pier tip
          let endPierY = gy + poi.footprint.height;
          if (bridgeGrid) {
            while (endPierY < H && bridgeGrid[endPierY]?.[gx + 2]) {
              endPierY++;
            }
            endPierY--;
          }
          const shipY = Math.min(endPierY, H - PORT_FERRY_BEAM);
          if (shipY >= gy + poi.footprint.height && gx >= 0 && gx + PORT_FERRY_LENGTH <= W) {
            buildingsToStamp.push({
              file: resolvePortFerryAsset('south'),
              px: gx * tileSize,
              py: shipY * tileSize,
              ySort: (shipY + PORT_FERRY_BEAM) * tileSize
            });
          }
        } else if (facing === 'east') {
          // 1. Upright Lighthouse Beacon Columns framing the pier entrance on the shore (rows gy+2..gy+4 reserved for pier walkway)
          // Top column sits above the pier: rows gy-2..gy+1 (base at gy+1, pier begins at gy+2: zero walkway overlap)
          // Bottom column sits below the pier: rows gy+5..gy+8 (pier ends at gy+4: zero walkway overlap)
          const postX = gx + poi.footprint.width - 2;
          const topPostY = gy - 2;
          const btmPostY = gy + 5;

          if (postX >= 0 && postX + 2 <= W && topPostY >= 0 && !unifiedPathGrid?.[gy + 1]?.[postX] && !unifiedPathGrid?.[gy + 1]?.[postX + 1]) {
            buildingsToStamp.push({
              file: 'poke_port_lighthouse_beacon.png',
              px: postX * tileSize,
              py: topPostY * tileSize,
              ySort: (gy + 2) * tileSize
            });
          }
          if (postX >= 0 && postX + 2 <= W && btmPostY + 4 <= H && !unifiedPathGrid?.[btmPostY]?.[postX] && !unifiedPathGrid?.[btmPostY]?.[postX + 1]) {
            buildingsToStamp.push({
              file: 'poke_port_lighthouse_beacon.png',
              px: postX * tileSize,
              py: btmPostY * tileSize,
              ySort: (btmPostY + 4) * tileSize
            });
          }

          // 2. East-facing horizontal pier extending East (rows gy+2..gy+4)
          let endPierX = gx + poi.footprint.width;
          if (bridgeGrid) {
            while (endPierX < W && bridgeGrid[gy + 2]?.[endPierX]) {
              endPierX++;
            }
            endPierX--;
          }

          // 3. Moored Seagallop Catamaran at east pierhead (5x3 tiles, genuine 2.5D profile)
          const shipEastX = Math.min(endPierX, W - 5);
          if (shipEastX >= gx && gy + 2 >= 0 && gy + 5 <= H) {
            buildingsToStamp.push({
              file: resolvePortFerryAsset('east'),
              px: shipEastX * tileSize,
              py: (gy + 2) * tileSize,
              ySort: (gy + 5) * tileSize + 10
            });
          }

          // 4. Shoreline props & bollards strictly on dry land with 1-tile clearance from water
          if (gx >= 4 && gy >= 2 && isDryUnpavedLand(gx - 4, gy - 2, PORT_TRUCK_WIDTH, 2, 1)) {
            buildingsToStamp.push({
              file: 'poke_port_dock_truck.png',
              px: (gx - 4) * tileSize,
              py: (gy - 2) * tileSize,
              ySort: gy * tileSize
            });
          }
          if (gx >= 4 && gy + 5 < H && isDryUnpavedLand(gx - 4, gy + 5, PORT_CARGO_STACK_WIDTH, 2, 1)) {
            buildingsToStamp.push({
              file: 'poke_port_cargo_crates_stack.png',
              px: (gx - 4) * tileSize,
              py: (gy + 5) * tileSize,
              ySort: (gy + 7) * tileSize
            });
          }
          if (gx >= 2 && gy >= 2 && isDryUnpavedLand(gx - 2, gy - 2, 2, 1, 1)) {
            buildingsToStamp.push({
              file: 'poke_port_bollard_chains.png',
              px: (gx - 2) * tileSize,
              py: (gy - 2) * tileSize,
              ySort: (gy - 1) * tileSize
            });
          }
          if (gx >= 2 && gy + 6 < H && isDryUnpavedLand(gx - 2, gy + 6, 2, 1, 1)) {
            buildingsToStamp.push({
              file: 'poke_port_bollard_chains.png',
              px: (gx - 2) * tileSize,
              py: (gy + 6) * tileSize,
              ySort: (gy + 7) * tileSize
            });
          }
        } else if (facing === 'west') {
          // 1. Upright Lighthouse Beacon Columns framing the pier entrance on the shore (rows gy+2..gy+4 reserved for pier walkway)
          const postX = gx;
          const topPostY = gy - 2;
          const btmPostY = gy + 5;

          if (postX >= 0 && postX + 2 <= W && topPostY >= 0 && !unifiedPathGrid?.[gy + 1]?.[postX] && !unifiedPathGrid?.[gy + 1]?.[postX + 1]) {
            buildingsToStamp.push({
              file: 'poke_port_lighthouse_beacon.png',
              px: postX * tileSize,
              py: topPostY * tileSize,
              ySort: (gy + 2) * tileSize
            });
          }
          if (postX >= 0 && postX + 2 <= W && btmPostY + 4 <= H && !unifiedPathGrid?.[btmPostY]?.[postX] && !unifiedPathGrid?.[btmPostY]?.[postX + 1]) {
            buildingsToStamp.push({
              file: 'poke_port_lighthouse_beacon.png',
              px: postX * tileSize,
              py: btmPostY * tileSize,
              ySort: (btmPostY + 4) * tileSize
            });
          }

          // 2. West-facing horizontal pier extending West (rows gy+2..gy+4)
          let endPierX = gx - 1;
          if (bridgeGrid) {
            while (endPierX >= 0 && bridgeGrid[gy + 2]?.[endPierX]) {
              endPierX--;
            }
            endPierX++;
          }

          // 3. Moored Seagallop Catamaran at west pierhead (5x3 tiles, genuine 2.5D profile facing West)
          const shipWestX = Math.max(0, endPierX - 5);
          if (shipWestX + 5 <= W && gy + 2 >= 0 && gy + 5 <= H) {
            buildingsToStamp.push({
              file: resolvePortFerryAsset('west'),
              px: shipWestX * tileSize,
              py: (gy + 2) * tileSize,
              ySort: (gy + 5) * tileSize + 10
            });
          }

          // 4. Shoreline props & bollards strictly on dry land with 1-tile clearance from water
          const inlandX = gx + poi.footprint.width + 1;
          if (inlandX + PORT_TRUCK_WIDTH <= W && gy >= 2 && isDryUnpavedLand(inlandX, gy - 2, PORT_TRUCK_WIDTH, 2, 1)) {
            buildingsToStamp.push({
              file: 'poke_port_dock_truck.png',
              px: inlandX * tileSize,
              py: (gy - 2) * tileSize,
              ySort: gy * tileSize
            });
          }
          if (inlandX + PORT_CARGO_STACK_WIDTH <= W && gy + 5 < H && isDryUnpavedLand(inlandX, gy + 5, PORT_CARGO_STACK_WIDTH, 2, 1)) {
            buildingsToStamp.push({
              file: 'poke_port_cargo_crates_stack.png',
              px: inlandX * tileSize,
              py: (gy + 5) * tileSize,
              ySort: (gy + 7) * tileSize
            });
          }
          const bollardWestX = gx + poi.footprint.width;
          if (bollardWestX + 2 <= W && gy >= 2 && isDryUnpavedLand(bollardWestX, gy - 2, 2, 1, 1)) {
            buildingsToStamp.push({
              file: 'poke_port_bollard_chains.png',
              px: bollardWestX * tileSize,
              py: (gy - 2) * tileSize,
              ySort: (gy - 1) * tileSize
            });
          }
          if (bollardWestX + 2 <= W && gy + 6 < H && isDryUnpavedLand(bollardWestX, gy + 6, 2, 1, 1)) {
            buildingsToStamp.push({
              file: 'poke_port_bollard_chains.png',
              px: bollardWestX * tileSize,
              py: (gy + 6) * tileSize,
              ySort: (gy + 7) * tileSize
            });
          }
        } else if (facing === 'north') {
          // 1. Upright Lighthouse Beacon Columns framing the pier entrance on dry sand (cols gx+2..gx+4 reserved for pier)
          // Left post at gx-1..gx (1-tile gap to pier gx+2: zero walkway overlap)
          // Right post at gx+5..gx+6 (1-tile gap to pier gx+4: zero walkway overlap)
          const leftPostX = gx - 1;
          const rightPostX = gx + 5;
          const postY = gy - 1;

          if (leftPostX >= 0 && isDryUnpavedLand(leftPostX, gy + 2, 2, 1, 0)) {
            buildingsToStamp.push({
              file: 'poke_port_lighthouse_beacon.png',
              px: leftPostX * tileSize,
              py: postY * tileSize,
              ySort: (gy + 3) * tileSize
            });
          }
          if (rightPostX + 2 <= W && isDryUnpavedLand(rightPostX, gy + 2, 2, 1, 0)) {
            buildingsToStamp.push({
              file: 'poke_port_lighthouse_beacon.png',
              px: rightPostX * tileSize,
              py: postY * tileSize,
              ySort: (gy + 3) * tileSize
            });
          }

          // 2. North-facing vertical pier extending North
          let endPierY = gy - 1;
          if (bridgeGrid) {
            while (endPierY >= 0 && bridgeGrid[endPierY]?.[gx + 2]) {
              endPierY--;
            }
            endPierY++;
          }

          // 3. Moored Seagallop Catamaran at northern pierhead (5x3 tiles, moored horizontally)
          const shipNorthX = gx + 1;
          const shipNorthY = Math.max(0, endPierY - 3);
          if (shipNorthX >= 0 && shipNorthX + 5 <= W && endPierY >= 0) {
            buildingsToStamp.push({
              file: resolvePortFerryAsset('north'),
              px: shipNorthX * tileSize,
              py: shipNorthY * tileSize,
              ySort: endPierY * tileSize
            });
          }

          // 4. Props & bollards to the south on dry land with 1-tile clearance from water
          if (gx >= 2 && gy + 4 < H && isDryUnpavedLand(gx - 2, gy + 4, 2, 1, 1)) {
            buildingsToStamp.push({
              file: 'poke_port_bollard_chains.png',
              px: (gx - 2) * tileSize,
              py: (gy + 4) * tileSize,
              ySort: (gy + 5) * tileSize
            });
          }
          if (gx + 6 + 2 <= W && gy + 4 < H && isDryUnpavedLand(gx + 6, gy + 4, 2, 1, 1)) {
            buildingsToStamp.push({
              file: 'poke_port_bollard_chains.png',
              px: (gx + 6) * tileSize,
              py: (gy + 4) * tileSize,
              ySort: (gy + 5) * tileSize
            });
          }
          if (gx + 7 + PORT_TRUCK_WIDTH <= W && gy + poi.footprint.height + 2 <= H && isDryUnpavedLand(gx + 7, gy + poi.footprint.height, PORT_TRUCK_WIDTH, 2, 1)) {
            buildingsToStamp.push({
              file: 'poke_port_dock_truck.png',
              px: (gx + 7) * tileSize,
              py: (gy + poi.footprint.height) * tileSize,
              ySort: (gy + poi.footprint.height + 2) * tileSize
            });
          }
          if (gx >= 3 && gy + poi.footprint.height + 2 <= H && isDryUnpavedLand(gx - 3, gy + poi.footprint.height, PORT_CARGO_STACK_WIDTH, 2, 1)) {
            buildingsToStamp.push({
              file: 'poke_port_cargo_crates_stack.png',
              px: (gx - 3) * tileSize,
              py: (gy + poi.footprint.height) * tileSize,
              ySort: (gy + poi.footprint.height + 2) * tileSize
            });
          }
        }
      } else if (poi.type === 'route_gate') {
        const isHoriz = poi.facing === 'east' || poi.facing === 'west';
        const gw = isHoriz ? ROUTE_GATE_HORIZONTAL_WIDTH : ROUTE_GATE_WIDTH;
        const gh = isHoriz ? ROUTE_GATE_HORIZONTAL_HEIGHT : ROUTE_GATE_HEIGHT;
        const gateFile = isHoriz ? 'gatehouse_route_horizontal.png' : 'gatehouse_route.png';
        const gateGx = poi.gridX + Math.floor((poi.footprint.width - gw) / 2);
        const gateGy = poi.gridY + Math.floor((poi.footprint.height - gh) / 2);
        buildingsToStamp.push({
          file: gateFile,
          px: gateGx * tileSize,
          py: gateGy * tileSize,
          ySort: (gateGy + gh) * tileSize
        });
      } else if (poi.type === 'water_landmark') {
        // Canonical maritime building: rustic fisherman cottage or harbor beacon light tower
        const file = poi.buildingFile ?? 'house_wood_brown.png';
        const bldW = file === 'poke_port_lighthouse_beacon.png' ? 2 : 4;
        const bldH = file === 'poke_port_lighthouse_beacon.png' ? 4 : 4;
        const offsetX = Math.floor((poi.footprint.width - bldW) / 2) * tileSize;
        const offsetY = Math.floor((poi.footprint.height - bldH) / 2) * tileSize;
        buildingsToStamp.push({
          file,
          px: px + offsetX,
          py: py + offsetY,
          ySort: py + poi.footprint.height * tileSize
        });

        // Dressing for islet sanctuary/cottage: signpost and flowers
        if (file !== 'poke_port_lighthouse_beacon.png') {
          const signGx = poi.gridX + 1;
          const signGy = poi.gridY + poi.footprint.height - 1;
          if (signGx < W && signGy < H && continent.terrainMatrix[signGy]?.[signGx] === 'grass' && !unifiedPathGrid[signGy]?.[signGx]) {
            buildingsToStamp.push({
              file: 'poke_signpost.png',
              px: signGx * tileSize,
              py: signGy * tileSize,
              ySort: (signGy + 1) * tileSize
            });
          }
          const flowerGx = poi.gridX + poi.footprint.width - 2;
          const flowerGy = poi.gridY + poi.footprint.height - 1;
          if (flowerGx < W && flowerGy < H && continent.terrainMatrix[flowerGy]?.[flowerGx] === 'grass' && !unifiedPathGrid[flowerGy]?.[flowerGx]) {
            buildingsToStamp.push({
              file: 'poke_flowers_red.png',
              px: flowerGx * tileSize,
              py: flowerGy * tileSize,
              ySort: (flowerGy + 1) * tileSize
            });
          }
        }
      }
    }
  }

  // Sort buildings North to South (Y ascending) so southern structures overlap northern roofs properly
  buildingsToStamp.sort((a, b) => a.ySort - b.ySort || a.px - b.px);
  return buildingsToStamp;
}
