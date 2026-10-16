import type { ContinentMapResult } from '../continentGenerator.ts';
import type { WaterTerrainKind } from '../waterAutotileEngine.ts';
import type { POINode } from '../../../types/map/poiTypes.ts';
import { computeOceanGrid, findPathAStar, getBestGateway } from '../routePathfinding.ts';
import { compileGeologicalAutotiling } from '../geologicalAutotilingEngine.ts';
import { pruneRedundantStairs } from '../mountainAutotileEngine.ts';
import {
  HARBOR_BEACH_PADDING_WEST,
  HARBOR_BEACH_PADDING_EAST,
  HARBOR_BEACH_PADDING_SOUTH,
  FERRY_VESSEL_RESERVE_WIDTH,
  ROUTE_GATE_EXCLUSION_PADDING_X,
  PORT_DOCK_EXCLUSION_PADDING_X,
  PORT_DOCK_EXCLUSION_PADDING_BOTTOM,
  PORT_DOCK_EXCLUSION_PADDING_TOP,
  MIN_DISTANCE_BETWEEN_CAVES,
  HARBOR_WATER_PROXIMITY_RADIUS
} from '../../../config/continentalEngineConfig.ts';
import type { ContinentalSettlementPoisResult } from './continentalSettlementCompiler.ts';

interface GridCoordinatePoint {
  readonly x: number;
  readonly y: number;
}

function isPointInHarborBasin(pt: GridCoordinatePoint, pois: readonly POINode[]): boolean {
  for (const p of pois) {
    if (p.type === 'port_dock') {
      if (
        pt.x >= p.gridX - PORT_DOCK_EXCLUSION_PADDING_X &&
        pt.x <= p.gridX + p.footprint.width + PORT_DOCK_EXCLUSION_PADDING_X &&
        pt.y >= p.gridY - PORT_DOCK_EXCLUSION_PADDING_TOP &&
        pt.y <= p.gridY + p.footprint.height + PORT_DOCK_EXCLUSION_PADDING_BOTTOM
      ) {
        return true;
      }
    }
  }
  return false;
}

function stampWaterBridgesForPath(
  pathCells: readonly GridCoordinatePoint[],
  terrainMatrix: readonly (readonly string[])[],
  bridgeGrid: boolean[][],
  pois: readonly POINode[],
  maxBridgeRun: number = 6
): boolean {
  let wStart = -1;
  let hasSurfWater = false;

  const applyBridgeRun = (start: number, end: number) => {
    for (let k = start; k <= end; k++) {
      const pt = pathCells[k]!;
      if (!isPointInHarborBasin(pt, pois)) {
        bridgeGrid[pt.y]![pt.x] = true;
      }
    }
  };

  for (let i = 0; i <= pathCells.length; i++) {
    const isW =
      i < pathCells.length &&
      (terrainMatrix[pathCells[i]!.y]?.[pathCells[i]!.x] === 'water' ||
        terrainMatrix[pathCells[i]!.y]?.[pathCells[i]!.x] === 'water_deep');

    if (isW && wStart === -1) {
      wStart = i;
      continue;
    }

    if (!isW && wStart !== -1) {
      const wEnd = i - 1;
      const runLen = wEnd - wStart + 1;
      if (runLen <= maxBridgeRun) {
        applyBridgeRun(wStart, wEnd);
      } else {
        hasSurfWater = true;
      }
      wStart = -1;
    }
  }

  return hasSurfWater;
}

export function carveContinentalCorridorsAndPaths(
  continent: ContinentMapResult,
  settlementPois: ContinentalSettlementPoisResult,
  seed: number,
  width: number,
  height: number
): boolean[][] {
  const { pois, poiById, bridgeGrid, placedGates, activeCorridors } = settlementPois;
  const isOceanGrid = computeOceanGrid(continent);
  const pathGrid: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));

  // Project wooden harbor pier of width >= 3 extending 3-5 tiles into deep water
  for (const poi of pois) {
    if (poi.type !== 'port_dock') continue;
    const pierW = 3;
    const pierLen = 4;
    const pierStartX =
      poi.gridX + (poi.footprint.width >= 7 ? Math.floor((poi.footprint.width - pierW) / 2) : 0);
    const pierStartY = poi.gridY + poi.footprint.height;

    for (let dy = 0; dy < pierLen; dy++) {
      const py = pierStartY + dy;
      if (py < 0 || py >= height) continue;
      for (let dx = 0; dx < pierW; dx++) {
        const px = pierStartX + dx;
        if (px < 0 || px >= width) continue;
        bridgeGrid[py]![px] = true;
        (continent.terrainMatrix as WaterTerrainKind[][])[py]![px] = 'water';
      }
    }

    // Reserve mooring cell adjacent to the pier for ferry vessel sprite
    const ferryX = pierStartX + pierW + 1;
    const ferryY = pierStartY;
    if (ferryY + 4 < height && ferryX + FERRY_VESSEL_RESERVE_WIDTH < width) {
      for (let fdy = 0; fdy < 4; fdy++) {
        for (let fdx = 0; fdx < FERRY_VESSEL_RESERVE_WIDTH; fdx++) {
          (continent.terrainMatrix as WaterTerrainKind[][])[ferryY + fdy]![ferryX + fdx] = 'water';
        }
      }
    }
  }

  const collectCorridorExclusionZones = (
    fromPoi: POINode,
    toPoi: POINode
  ): { x1: number; y1: number; x2: number; y2: number }[] => {
    const zones: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (const p of pois) {
      if (p.id !== fromPoi.id && p.id !== toPoi.id) {
        if (p.type === 'route_gate') {
          zones.push({
            x1: p.gridX - ROUTE_GATE_EXCLUSION_PADDING_X,
            y1: p.gridY - 4,
            x2: p.gridX + p.footprint.width + ROUTE_GATE_EXCLUSION_PADDING_X,
            y2: p.gridY + p.footprint.height + 4
          });
        } else if (p.type === 'port_dock') {
          zones.push({
            x1: p.gridX - PORT_DOCK_EXCLUSION_PADDING_X,
            y1: p.gridY - 2,
            x2: p.gridX + p.footprint.width + PORT_DOCK_EXCLUSION_PADDING_X,
            y2: p.gridY + p.footprint.height + PORT_DOCK_EXCLUSION_PADDING_BOTTOM
          });
        } else {
          zones.push({
            x1: p.gridX + 1,
            y1: p.gridY + 1,
            x2: p.gridX + p.footprint.width - 2,
            y2: p.gridY + p.footprint.height - 2
          });
        }
      } else if (p.type === 'route_gate') {
        const b = p.urbanLayout?.buildings[0];
        if (b) {
          zones.push({
            x1: b.x,
            y1: b.y,
            x2: b.x + b.width - 1,
            y2: b.y + b.height - 1
          });
        }
      } else if (p.type === 'port_dock') {
        zones.push({
          x1: p.gridX - PORT_DOCK_EXCLUSION_PADDING_X,
          y1: p.gridY - 2,
          x2: p.gridX + p.footprint.width + PORT_DOCK_EXCLUSION_PADDING_X,
          y2: p.gridY + p.footprint.height + PORT_DOCK_EXCLUSION_PADDING_BOTTOM
        });
      }
    }
    return zones;
  };

  for (const corridor of activeCorridors) {
    if (corridor.kind === 'wormhole_tunnel' || corridor.kind === 'surf_route') continue;
    const fromPoi = poiById.get(corridor.fromId);
    const toPoi = poiById.get(corridor.toId);

    let stamped = false;
    if (fromPoi && toPoi) {
      const startGw =
        (corridor as { customStartGw?: { x: number; y: number } }).customStartGw ??
        getBestGateway(fromPoi, toPoi.gridX, toPoi.gridY);
      const goalGw =
        (corridor as { customGoalGw?: { x: number; y: number } }).customGoalGw ??
        getBestGateway(toPoi, fromPoi.gridX, fromPoi.gridY);

      // Exclude third-party settlements and protect route gatehouses from being bypassed or clipped
      const otherZones = collectCorridorExclusionZones(fromPoi, toPoi);

      const astarRes = findPathAStar(
        continent,
        startGw.x,
        startGw.y,
        goalGw.x,
        goalGw.y,
        pathGrid,
        true,
        otherZones,
        isOceanGrid
      );

      if (astarRes && astarRes.path.length > 0) {
        const hasSurfWater = stampWaterBridgesForPath(
          astarRes.path,
          continent.terrainMatrix,
          bridgeGrid,
          pois
        );
        if (hasSurfWater) {
          (corridor as { kind: string }).kind = 'surf_route';
        }

        const stampAstarPath = (path: readonly { x: number; y: number }[]) => {
          for (const pt of path) {
            if (pt.x < 0 || pt.x >= width || pt.y < 0 || pt.y >= height) continue;
            const t = continent.terrainMatrix[pt.y]?.[pt.x];
            if (t !== 'water' && t !== 'water_deep') {
              pathGrid[pt.y]![pt.x] = true;
            }
          }
        };

        stampAstarPath(astarRes.path);
        (corridor as { pathCells: typeof corridor.pathCells }).pathCells = astarRes.path;
        stamped = true;
      }
    }

    if (!stamped) {
      console.warn(
        `[ContinentalEngine] Warning: Corridor ${corridor.id} (${corridor.fromId} -> ${corridor.toId}) failed A* pathfinding. Fallback path applied.`
      );
      const hasSurfWater = stampWaterBridgesForPath(
        corridor.pathCells,
        continent.terrainMatrix,
        bridgeGrid,
        pois
      );
      if (hasSurfWater) {
        (corridor as { kind: string }).kind = 'surf_route';
      }

      for (const pt of corridor.pathCells) {
        if (pt.x < 0 || pt.x >= width || pt.y < 0 || pt.y >= height) continue;
        const cell = continent.cells[pt.y]?.[pt.x];
        if (!cell || (!cell.isWalkable && !cell.isStair)) continue;
        const t = continent.terrainMatrix[pt.y]?.[pt.x];
        if (t !== 'water' && t !== 'water_deep') {
          pathGrid[pt.y]![pt.x] = true;
        }
      }
    }
  }

  // Ensure harbor basins around port docks are 100% free of stray bridge pieces
  for (const port of pois) {
    if (port.type !== 'port_dock') continue;
    const pierStartX =
      port.gridX + (port.footprint.width >= 7 ? Math.floor((port.footprint.width - 3) / 2) : 0);
    const pierEndX = pierStartX + 2;
    const pierStartY = port.gridY + port.footprint.height;

    for (
      let y = port.gridY - 2;
      y <= port.gridY + port.footprint.height + PORT_DOCK_EXCLUSION_PADDING_BOTTOM;
      y++
    ) {
      for (
        let x = port.gridX - PORT_DOCK_EXCLUSION_PADDING_X;
        x <= port.gridX + port.footprint.width + PORT_DOCK_EXCLUSION_PADDING_X;
        x++
      ) {
        if (y < 0 || y >= height || x < 0 || x >= width) continue;
        const isPartOfPier = x >= pierStartX && x <= pierEndX && y >= pierStartY;
        if (!isPartOfPier && bridgeGrid[y]?.[x]) {
          bridgeGrid[y]![x] = false;
        }
      }
    }
  }

  // Ensure doorsteps in front of cave entrances connect to the route network
  for (const poi of pois) {
    if (poi.type === 'cave_entrance') {
      const doorY = poi.gridY + 1;
      const doorX = poi.gridX;
      if (doorY >= 0 && doorY < height && doorX >= 0 && doorX < width) {
        pathGrid[doorY]![doorX] = true;
      }
    }
  }

  // Procedural cave entrances on south cliff faces intersecting or adjacent to routes
  let proceduralTunnelIndex = 1;
  const tryPlaceProceduralCave = (cx: number, cy: number) => {
    const mCell = continent.resolvedMountain?.cellDetails?.[cy]?.[cx];
    const isSouthCliffWall =
      Boolean(mCell && (mCell.role.includes('edge_south') || mCell.role.includes('cliff'))) &&
      (continent.heightmap[cy]?.[cx] ?? 0) >= 1 &&
      (continent.heightmap[cy + 1]?.[cx] ?? 0) === 0 &&
      continent.terrainMatrix[cy + 1]?.[cx] !== 'water' &&
      continent.terrainMatrix[cy + 1]?.[cx] !== 'water_deep';

    if (!isSouthCliffWall || !pathGrid[cy + 1]?.[cx]) return;

    const hasNearbyCave = pois.some(
      (p) =>
        p.type === 'cave_entrance' &&
        Math.hypot(p.gridX - cx, p.gridY - cy) < MIN_DISTANCE_BETWEEN_CAVES
    );
    if (hasNearbyCave) return;

    const hasBacking =
      (continent.heightmap[cy - 1]?.[cx] ?? 0) >= 1 &&
      (continent.heightmap[cy - 2]?.[cx] ?? 0) >= 1;
    if (!hasBacking) return;

    const mtnPal =
      continent.geologicalClusters?.paletteMatrix?.[cy]?.[cx] ??
      continent.mountainPalette ??
      'brown';
    const caveFile =
      mtnPal === 'gray' ? 'poke_cave_entrance_gray.png' : 'poke_cave_entrance_brown.png';
    pois.push({
      id: `cave_tunnel_${cx}_${cy}`,
      name: `Túnel de Paso ${proceduralTunnelIndex++}`,
      type: 'cave_entrance',
      footprint: { width: 2, height: 2 },
      terrainPreference: 'mountain_wall',
      gridX: cx,
      gridY: cy,
      elevation: 0,
      buildingFile: caveFile
    });
    pathGrid[cy + 1]![cx] = true;
    if (cx + 1 < width) pathGrid[cy + 1]![cx + 1] = true;
  };

  for (let cy = 2; cy < height - 3; cy++) {
    for (let cx = 2; cx < width - 3; cx++) {
      tryPlaceProceduralCave(cx, cy);
    }
  }

  // Ensure the central through-road passing through route gatehouses is stamped onto pathGrid
  for (const gate of placedGates) {
    if (gate.urbanLayout?.internalStreets) {
      for (const pt of gate.urbanLayout.internalStreets) {
        if (pt.x >= 0 && pt.x < width && pt.y >= 0 && pt.y < height) {
          pathGrid[pt.y]![pt.x] = true;
        }
      }
    }
  }

  // Prune redundant stairs within Manhattan distance < 4
  const prunedStairs = pruneRedundantStairs(continent.placedStairs, pathGrid);
  (continent as { placedStairs: typeof continent.placedStairs }).placedStairs = prunedStairs;

  // Ensure all land bordering harbor water or port docks has a continuous sand beach transition
  const isNearHarborWater = (x: number, y: number): boolean => {
    for (let dy = -HARBOR_WATER_PROXIMITY_RADIUS; dy <= HARBOR_WATER_PROXIMITY_RADIUS; dy++) {
      for (let dx = -HARBOR_WATER_PROXIMITY_RADIUS; dx <= HARBOR_WATER_PROXIMITY_RADIUS; dx++) {
        const ny = y + dy;
        const nx = x + dx;
        const t = continent.terrainMatrix[ny]?.[nx];
        if (t === 'water' || t === 'water_deep') {
          return true;
        }
      }
    }
    return false;
  };

  for (const port of pois) {
    if (port.type !== 'port_dock') continue;
    const minX = Math.max(0, port.gridX - HARBOR_BEACH_PADDING_WEST);
    const maxX = Math.min(width - 1, port.gridX + port.footprint.width + HARBOR_BEACH_PADDING_EAST);
    const minY = Math.max(0, port.gridY - 6);
    const maxY = Math.min(
      height - 1,
      port.gridY + port.footprint.height + HARBOR_BEACH_PADDING_SOUTH
    );

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (continent.terrainMatrix[y]?.[x] === 'grass' && isNearHarborWater(x, y)) {
          (continent.terrainMatrix as WaterTerrainKind[][])[y]![x] = 'sand';
        }
      }
    }
  }

  // Phase 8b: Unified Geological Autotiling (Coasts, Cliffs, Deep Water, Macro-Biomes)
  if (continent.macroBiomes) {
    const geoPass = compileGeologicalAutotiling(
      continent.terrainMatrix,
      continent.heightmap,
      continent.macroBiomes,
      {
        seed,
        mountainPalette: continent.mountainPalette,
        paletteMatrix: continent.geologicalClusters?.paletteMatrix,
        placedStairs: prunedStairs,
        riverDrainage: continent.riverDrainage
      }
    );

    (continent as { terrainMatrix: typeof continent.terrainMatrix }).terrainMatrix =
      geoPass.sanitizedWaterMatrix;
    (continent as { resolvedWater: typeof continent.resolvedWater }).resolvedWater =
      geoPass.resolvedWater;
    (continent as { resolvedMountain: typeof continent.resolvedMountain }).resolvedMountain =
      geoPass.resolvedMountain;
    (
      continent as { resolvedMacroBiomes?: typeof continent.resolvedMacroBiomes }
    ).resolvedMacroBiomes = geoPass.resolvedMacroBiomes;
    (continent as { cells: typeof continent.cells }).cells = geoPass.cells;
  }

  return pathGrid;
}
