/**
 * src/logic/map/settlementPlacementHelper.ts
 *
 * URBAN SETTLEMENT PLACEMENT & COLLISION ENGINE
 *
 * Provides deterministic collision detection and non-overlapping candidate placement
 * for structures and decorations in regional settlements.
 */

import type { POINode, UrbanBuildingPlacement } from '../../types/map/poiTypes.ts';

export interface BoundingBox2D {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Checks whether two 2D bounding boxes overlap on the tile grid.
 */
export function checkBoundingBoxOverlap(a: BoundingBox2D, b: BoundingBox2D): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Checks whether a candidate building collides with any existing building in the settlement.
 * Self-collision is ignored when candidate.id matches an existing building.
 */
export function checkBuildingCollision(
  buildings: readonly UrbanBuildingPlacement[],
  candidate: { readonly id?: string; readonly x: number; readonly y: number; readonly width: number; readonly height: number }
): boolean;
export function checkBuildingCollision(
  poi: POINode,
  candidateId: string,
  x: number,
  y: number,
  width: number,
  height: number
): boolean;
export function checkBuildingCollision(
  poiOrBuildings: POINode | readonly UrbanBuildingPlacement[],
  candidateOrId:
    | { readonly id?: string; readonly x: number; readonly y: number; readonly width: number; readonly height: number }
    | string,
  x?: number,
  y?: number,
  width?: number,
  height?: number
): boolean {
  const buildings: readonly UrbanBuildingPlacement[] = Array.isArray(poiOrBuildings)
    ? poiOrBuildings
    : ((poiOrBuildings as POINode).urbanLayout?.buildings ?? []);

  const candidate =
    typeof candidateOrId === 'string'
      ? { id: candidateOrId, x: x ?? 0, y: y ?? 0, width: width ?? 1, height: height ?? 1 }
      : candidateOrId;

  for (const b of buildings) {
    if (candidate.id && b.id === candidate.id) continue;
    if (checkBoundingBoxOverlap(candidate, b)) {
      return true;
    }
  }
  return false;
}

/**
 * Scans a settlement to find the nearest collision-free tile position for a new building.
 * Prioritizes placement inside the settlement footprint; if fully occupied, expands to
 * the immediate perimeter with a safe buffer.
 */
export function findFreePlacementSpot(
  poi: POINode,
  width: number,
  height: number
): { x: number; y: number } {
  const existingBuildings = poi.urbanLayout?.buildings ?? [];
  const startX = poi.gridX;
  const startY = poi.gridY;
  const W = poi.footprint.width;
  const H = poi.footprint.height;

  // 1. First pass: Interior search inside settlement footprint
  const maxInteriorX = Math.max(startX + 1, startX + W - width - 1);
  const maxInteriorY = Math.max(startY + 1, startY + H - height - 1);

  for (let y = startY + 1; y <= maxInteriorY; y += 2) {
    for (let x = startX + 1; x <= maxInteriorX; x += 2) {
      const candidate = { x, y, width, height };
      if (!checkBuildingCollision(existingBuildings, candidate)) {
        if (!blocksGateway(poi, candidate)) {
          return { x, y };
        }
      }
    }
  }

  // 2. Second pass: Try any single-tile stepped interior position
  for (let y = startY + 1; y <= maxInteriorY; y++) {
    for (let x = startX + 1; x <= maxInteriorX; x++) {
      const candidate = { x, y, width, height };
      if (!checkBuildingCollision(existingBuildings, candidate)) {
        if (!blocksGateway(poi, candidate)) {
          return { x, y };
        }
      }
    }
  }

  // 3. Third pass: Perimeter expansion adjacent to the settlement
  for (let buffer = 1; buffer <= 6; buffer++) {
    const minX = Math.max(2, startX - buffer);
    const maxX = startX + W + buffer - width;
    const minY = Math.max(2, startY - buffer);
    const maxY = startY + H + buffer - height;

    for (let y = minY; y <= maxY; y += 2) {
      for (let x = minX; x <= maxX; x += 2) {
        // Skip interior coordinates already checked
        if (x >= startX && x + width <= startX + W && y >= startY && y + height <= startY + H) {
          continue;
        }
        const candidate = { x, y, width, height };
        if (!checkBuildingCollision(existingBuildings, candidate)) {
          if (!blocksGateway(poi, candidate)) {
            return { x, y };
          }
        }
      }
    }
  }

  // Fallback to offset beside settlement
  return { x: startX + W + 1, y: startY + 1 };
}

/**
 * Checks whether a candidate building obstructs any perimeter gateways of the settlement.
 */
function blocksGateway(
  poi: POINode,
  candidate: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
): boolean {
  if (!poi.gateways || poi.gateways.length === 0) return false;
  for (const gw of poi.gateways) {
    if (
      gw.x >= candidate.x &&
      gw.x < candidate.x + candidate.width &&
      gw.y >= candidate.y &&
      gw.y < candidate.y + candidate.height
    ) {
      return true;
    }
  }
  return false;
}
