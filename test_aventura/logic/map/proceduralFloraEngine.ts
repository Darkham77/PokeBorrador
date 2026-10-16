// Procedural Flora, Jumpable Ledges & Scenic Props Engine for Overworld Maps

import type { TileCollision } from './tilesRegistry.ts';
import type { MapCell, MapWarp, MapSpawn, MapType } from '../../types/map/proceduralMapTypes.ts';
import type { ThemeBiomePalette } from './proceduralBiomePalettes.ts';
import { placeScenicProps } from './propsPlacementEngine.ts';
import {
  ROUTE_LEDGE_ALT_CHANCE,
  ROUTE_LEDGE_WEST_RATIO,
  ROUTE_LEDGE_EAST_RATIO,
  TALL_GRASS_SKIP_CHANCE,
  ROAD_FLOWER_CHANCE,
  SCATTER_BUSH_CHANCE,
  SCATTER_ROCK_CHANCE,
  DEFAULT_ROUTE_PROPS_DENSITY
} from '../../config/proceduralMapConfig.ts';

export interface FloraAndPropsOptions {
  readonly width: number;
  readonly height: number;
  readonly midY: number;
  readonly seed: number;
  readonly prng: () => number;
  readonly mapType: MapType;
  readonly withTown: boolean;
  readonly candidateLedgeRows: readonly number[];
  readonly palette: ThemeBiomePalette;
  readonly isPathCell: boolean[][];
  readonly baseLayer: (MapCell | null)[][];
  readonly elevationLayer: (MapCell | null)[][];
  readonly objectLayer: (MapCell | null)[][];
  readonly collisionGrid: TileCollision[][];
  readonly warps: MapWarp[];
  readonly spawns: MapSpawn[];
  readonly propsDensity?: number;
  readonly includeFences?: boolean;
  readonly makeCell: (tileId: string, collision: TileCollision) => MapCell;
}

export function stampFloraLedgesAndProps(options: FloraAndPropsOptions): void {
  const {
    width,
    height,
    midY,
    seed,
    prng,
    mapType,
    withTown,
    candidateLedgeRows,
    palette,
    isPathCell,
    baseLayer,
    elevationLayer,
    objectLayer,
    collisionGrid,
    warps,
    spawns,
    propsDensity,
    includeFences,
    makeCell
  } = options;

  // 7.5 Jumpable 1-Way Route Ledges
  if (mapType === 'route' && palette.ledge) {
    const tryStampLedgeSegment = (ly: number, startX: number, endX: number): boolean => {
      if (endX - startX < 3) return false;
      let currentRunStart = -1;
      let bestRun: { start: number; end: number } | null = null;

      for (let x = startX; x <= endX; x++) {
        const isBlocked =
          isPathCell[ly]![x] ||
          isPathCell[ly - 1]?.[x] ||
          isPathCell[ly + 1]?.[x] ||
          elevationLayer[ly]![x] !== null ||
          elevationLayer[ly + 1]?.[x] !== null ||
          objectLayer[ly]![x] !== null;

        if (isBlocked) {
          if (bestRun) break;
          currentRunStart = -1;
          continue;
        }

        if (currentRunStart === -1) currentRunStart = x;
        const runLength = x - currentRunStart + 1;
        if (runLength >= 3) {
          bestRun = { start: currentRunStart, end: x };
        }
      }

      if (!bestRun) return false;

      for (let x = bestRun.start; x <= bestRun.end; x++) {
        const tileId =
          prng() < ROUTE_LEDGE_ALT_CHANCE && palette.ledge!.centerAlt
            ? palette.ledge!.centerAlt
            : palette.ledge!.center;
        baseLayer[ly]![x] = makeCell(tileId, 'ledge');
        collisionGrid[ly]![x] = 'ledge';
      }
      return true;
    };

    let placedLedgeCount = 0;
    for (const ly of candidateLedgeRows) {
      if (ly < 4 || ly >= height - 4) continue;
      const segments = [
        { startX: 3, endX: Math.min(width - 4, Math.floor(width * ROUTE_LEDGE_WEST_RATIO)) },
        { startX: Math.max(4, Math.floor(width * ROUTE_LEDGE_EAST_RATIO)), endX: width - 4 }
      ];

      for (const seg of segments) {
        if (!tryStampLedgeSegment(ly, seg.startX, seg.endX)) continue;
        placedLedgeCount++;
        if (placedLedgeCount >= 2) break;
      }
      if (placedLedgeCount >= 2) break;
    }
  }

  // 8. Tall Grass Encounter Patches
  if (mapType === 'route') {
    const pathBorderCandidates: { x: number; y: number }[] = [];
    for (let y = 3; y < height - 4; y++) {
      for (let x = 3; x < width - 4; x++) {
        if (
          isPathCell[y]![x] ||
          elevationLayer[y]![x] !== null ||
          objectLayer[y]![x] !== null ||
          collisionGrid[y]![x] === 'ledge'
        ) {
          continue;
        }
        const hasAdjacentPath = [
          isPathCell[y - 1]?.[x],
          isPathCell[y + 1]?.[x],
          isPathCell[y]?.[x - 1],
          isPathCell[y]?.[x + 1]
        ].some(Boolean);
        if (hasAdjacentPath) {
          pathBorderCandidates.push({ x, y });
        }
      }
    }

    const TALL_GRASS_PATH_BORDER_ANCHOR_CHANCE = 0.8 as const;
    const numPatches = Math.min(8, Math.max(5, Math.floor(width / 5)));
    for (let p = 0; p < numPatches; p++) {
      const patchW = 3 + Math.floor(prng() * 4);
      const patchH = 3 + Math.floor(prng() * 4);
      let px0: number;
      let py0: number;

      if (pathBorderCandidates.length > 0 && prng() < TALL_GRASS_PATH_BORDER_ANCHOR_CHANCE) {
        const anchor = pathBorderCandidates[Math.floor(prng() * pathBorderCandidates.length)]!;
        px0 = Math.max(2, Math.min(width - patchW - 3, anchor.x - Math.floor(patchW / 2)));
        py0 = Math.max(2, Math.min(height - patchH - 3, anchor.y - Math.floor(patchH / 2)));
      } else {
        const PATCH_RANDOM_MARGIN_X = 6 as const;
        const PATCH_RANDOM_MARGIN_Y = 7 as const;
        px0 = 3 + Math.floor(prng() * Math.max(1, width - patchW - PATCH_RANDOM_MARGIN_X));
        py0 = 4 + Math.floor(prng() * Math.max(1, height - patchH - PATCH_RANDOM_MARGIN_Y));
      }

      for (let gy = 0; gy < patchH; gy++) {
        for (let gx = 0; gx < patchW; gx++) {
          if (prng() < TALL_GRASS_SKIP_CHANCE) continue;
          const px = px0 + gx;
          const py = py0 + gy;
          if (
            px < width &&
            py < height &&
            !isPathCell[py]![px] &&
            elevationLayer[py]![px] === null &&
            objectLayer[py]![px] === null &&
            collisionGrid[py]![px] !== 'ledge'
          ) {
            objectLayer[py]![px] = makeCell(palette.props.tallGrass, false);
          }
        }
      }
    }
  }

  // 9. Curated Flowers along roads and open pasture
  for (let x = 4; x < width - 4; x++) {
    const yTopRoad = midY - 2;
    if (
      yTopRoad >= 0 &&
      !isPathCell[yTopRoad]![x] &&
      !elevationLayer[yTopRoad]![x] &&
      !objectLayer[yTopRoad]![x]
    ) {
      if (prng() < ROAD_FLOWER_CHANCE && palette.props.flowers.length > 0) {
        const flowerId = palette.props.flowers[Math.floor(prng() * palette.props.flowers.length)]!;
        objectLayer[yTopRoad]![x] = makeCell(flowerId, false);
      }
    }
    const yBottomRoad = midY + 2;
    if (
      yBottomRoad < height &&
      !isPathCell[yBottomRoad]![x] &&
      !elevationLayer[yBottomRoad]![x] &&
      !objectLayer[yBottomRoad]![x]
    ) {
      if (prng() < ROAD_FLOWER_CHANCE && palette.props.flowers.length > 0) {
        const flowerId = palette.props.flowers[Math.floor(prng() * palette.props.flowers.length)]!;
        objectLayer[yBottomRoad]![x] = makeCell(flowerId, false);
      }
    }
  }

  // 10. Scatter Small Rocks & Bushes
  for (let y = 3; y < height - 3; y++) {
    for (let x = 3; x < width - 3; x++) {
      if (isPathCell[y]![x] || elevationLayer[y]![x] !== null || objectLayer[y]![x] !== null)
        continue;
      const roll = prng();
      if (roll < SCATTER_BUSH_CHANCE) {
        objectLayer[y]![x] = makeCell(palette.props.bush, true);
        collisionGrid[y]![x] = true;
      } else if (roll < SCATTER_ROCK_CHANCE && palette.props.rock) {
        objectLayer[y]![x] = makeCell(palette.props.rock, true);
        collisionGrid[y]![x] = true;
      }
    }
  }

  // 10.5 Route Scenic Props Pass
  if (!withTown) {
    placeScenicProps({
      mapWidth: width,
      mapHeight: height,
      seed,
      density: propsDensity ?? DEFAULT_ROUTE_PROPS_DENSITY,
      includeFences: includeFences ?? true,
      isUrban: false,
      baseLayer,
      elevationLayer,
      objectLayer,
      collisionGrid,
      isPathCell,
      spawns,
      warps,
      makeCell
    });
  }
}
