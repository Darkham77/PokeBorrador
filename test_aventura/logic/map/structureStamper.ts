// Structure Stamper Engine for Multi-Tile Buildings & Scenic Props

import type { StructureTemplate } from '../../config/mapStructures.ts';
import type {
  GeneratedMap,
  MapCell,
  CollisionType,
  MapWarp,
  MapSpawn
} from '../../types/map/proceduralMapTypes.ts';
import {
  type TilesRegistryService,
  type TileCollision,
  defaultTilesRegistry
} from './tilesRegistry.ts';

interface StructureCellLayers {
  readonly decLayer: (MapCell | null)[][];
  readonly legacyDec?: (MapCell | null)[][];
  readonly elev: (MapCell | null)[][];
  readonly legacyElev?: (MapCell | null)[][];
}

function stampStructureLayers(
  gx: number,
  gy: number,
  cell: MapCell,
  isProp: boolean,
  layers: StructureCellLayers
): void {
  if (isProp) {
    layers.decLayer[gy]![gx] = cell;
    if (layers.legacyDec) {
      layers.legacyDec[gy]![gx] = cell;
    }
  } else {
    layers.elev[gy]![gx] = cell;
    if (layers.legacyElev) {
      layers.legacyElev[gy]![gx] = cell;
    }
    if (layers.decLayer[gy]) {
      layers.decLayer[gy][gx] = null;
    }
    if (layers.legacyDec?.[gy]) {
      layers.legacyDec[gy][gx] = null;
    }
  }
}

function registerStructureDoors(
  gridX: number,
  gridY: number,
  footW: number,
  footH: number,
  structureTemplate: StructureTemplate,
  targetMap: GeneratedMap
): void {
  if (!structureTemplate.interiorMapId || !targetMap.entities) return;
  const warps = targetMap.entities.warps as MapWarp[];
  const spawns = targetMap.entities.spawns as MapSpawn[];
  for (let r = 0; r < footH; r++) {
    for (let c = 0; c < footW; c++) {
      if (structureTemplate.collisionMask[r]?.[c] === 0) {
        const doorX = gridX + c;
        const doorY = gridY + r;
        warps.push({
          x: doorX,
          y: doorY,
          targetMapId: structureTemplate.interiorMapId,
          targetSpawnId: structureTemplate.defaultSpawnId ?? 'spawn_entrance'
        });
        const stepY = doorY + 1;
        if (stepY < targetMap.height) {
          spawns.push({
            id: `${structureTemplate.id}_exit`,
            x: doorX,
            y: stepY,
            direction: 'down'
          });
        }
      }
    }
  }
}

/**
 * Declarative function to stamp a multitile structure template and overwrite
 * the collision matrix atomically in a single step.
 */
export function stampStructure(
  targetMap: GeneratedMap,
  structureTemplate: StructureTemplate,
  gridX: number,
  gridY: number,
  registry: TilesRegistryService = defaultTilesRegistry
): boolean {
  const { width: footW, height: footH } = structureTemplate.footprint;

  if (
    gridX < 0 ||
    gridY < 0 ||
    gridX + footW > targetMap.width ||
    gridY + footH > targetMap.height
  ) {
    return false;
  }

  const elev = targetMap.layers.elevation as (MapCell | null)[][];
  const colMat = targetMap.collisionMatrix as CollisionType[][];
  const colGrid = targetMap.collisionGrid as TileCollision[][] | undefined;
  const legacyElev = targetMap.elevationLayer as (MapCell | null)[][] | undefined;
  const decLayer = targetMap.layers.decorations as (MapCell | null)[][];
  const legacyDec = targetMap.objectLayer as (MapCell | null)[][] | undefined;

  const layers: StructureCellLayers = {
    decLayer,
    legacyDec,
    elev,
    legacyElev
  };

  for (let r = 0; r < footH; r++) {
    for (let c = 0; c < footW; c++) {
      const tileId = structureTemplate.tiles[r]?.[c];
      const col = structureTemplate.collisionMask[r]?.[c] ?? 1;
      const gx = gridX + c;
      const gy = gridY + r;

      if (tileId) {
        const entry = registry.getTileById(tileId);
        const filePath = entry ? entry.file_path : `/assets/tiles/decorations/${tileId}.png`;
        const tileCol: TileCollision = col === 1 ? true : col === 2 ? 'water' : false;
        const cell: MapCell = { tileId, filePath, collision: tileCol };
        const isProp = structureTemplate.id.startsWith('prop_');

        stampStructureLayers(gx, gy, cell, isProp, layers);
      }

      colMat[gy]![gx] = col;
      if (colGrid) {
        colGrid[gy]![gx] = col === 1 ? true : col === 2 ? 'water' : false;
      }
    }
  }

  // Register warps and exit spawns if interiorMapId is provided
  registerStructureDoors(gridX, gridY, footW, footH, structureTemplate, targetMap);

  return true;
}

export function stampStructureInternal(
  targetElevationLayer: (MapCell | null)[][],
  collisionGrid: TileCollision[][],
  objectLayer: (MapCell | null)[][],
  template: StructureTemplate,
  startX: number,
  startY: number,
  mapWidth: number,
  mapHeight: number,
  registry: TilesRegistryService = defaultTilesRegistry
): boolean {
  const { width: footW, height: footH } = template.footprint;
  if (startX < 0 || startY < 0 || startX + footW > mapWidth || startY + footH > mapHeight) {
    return false;
  }
  for (let r = 0; r < footH; r++) {
    for (let c = 0; c < footW; c++) {
      const tileId = template.tiles[r]?.[c];
      const col = template.collisionMask[r]?.[c] ?? 1;
      const gx = startX + c;
      const gy = startY + r;
      if (tileId) {
        const entry = registry.getTileById(tileId);
        const filePath = entry ? entry.file_path : `/assets/tiles/decorations/${tileId}.png`;
        const tileCol: TileCollision = col === 1 ? true : col === 2 ? 'water' : false;
        targetElevationLayer[gy]![gx] = { tileId, filePath, collision: tileCol };
        collisionGrid[gy]![gx] = tileCol;
      }
      if (objectLayer[gy]) {
        objectLayer[gy][gx] = null;
      }
    }
  }
  return true;
}

export function registerStructureEntities(
  warps: MapWarp[],
  spawns: MapSpawn[],
  template: StructureTemplate,
  startX: number,
  startY: number,
  mapHeight: number,
  instanceSuffix: string = ''
): void {
  if (!template.interiorMapId) return;

  for (let r = 0; r < template.footprint.height; r++) {
    for (let c = 0; c < template.footprint.width; c++) {
      if (template.collisionMask[r]?.[c] === 0) {
        const doorX = startX + c;
        const doorY = startY + r;
        const targetSpawnId = template.defaultSpawnId ?? 'spawn_entrance';

        warps.push({
          x: doorX,
          y: doorY,
          targetMapId: template.interiorMapId,
          targetSpawnId
        });

        const stepY = doorY + 1;
        if (stepY < mapHeight) {
          spawns.push({
            id: `${template.id}${instanceSuffix}_exit`,
            x: doorX,
            y: stepY,
            direction: 'down'
          });
        }
      }
    }
  }
}
