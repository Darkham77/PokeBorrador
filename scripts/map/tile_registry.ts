/**
 * scripts/map/tile_registry.ts
 *
 * Single Source of Truth for semantic tile catalog and O(1) classification lookups.
 */

import fs from 'node:fs';
import path from 'node:path';

export type TileCategory = 'terrain' | 'structures' | 'props' | 'nature';

export type TileSubcategory =
  | 'mountains'
  | 'water_shores'
  | 'grass_edges'
  | 'paths'
  | 'cliffs_ledges'
  | 'bridges'
  | 'buildings'
  | 'fences'
  | 'doors'
  | 'vehicles'
  | 'decorations'
  | 'trees'
  | 'plants'
  | 'rocks'
  | 'unknown';

export type TileCollision = 'passable' | 'solid' | 'water';

export interface TileDimensions {
  width: number;
  height: number;
  cols: number;
  rows: number;
}

export interface TileDefinition {
  id: string;
  category: TileCategory;
  subcategory: TileSubcategory;
  path: string;
  tileSize: number;
  dimensions: TileDimensions;
  collision: TileCollision;
  tags: readonly string[];
}

export interface TileCatalogPayload {
  version: string;
  updatedAt: string;
  tiles: Record<string, Omit<TileDefinition, 'id'>>;
}

const DEFAULT_CATALOG_PATH = path.resolve('scratch/map_lab/tilesets/catalog/tiles_catalog.json');

// In-memory O(1) lookup tables
const tileMap = new Map<string, TileDefinition>();
const subcategoryIndex = new Map<string, Set<string>>();

/**
 * Clear the in-memory registry.
 */
export function clearTileRegistryMemory(): void {
  tileMap.clear();
  subcategoryIndex.clear();
}

/**
 * Register a tile directly in memory.
 */
export function registerTileMemory(tile: TileDefinition): void {
  if (!tile || !tile.id) return;
  tileMap.set(tile.id, tile);

  const sub = tile.subcategory || 'unknown';
  if (!subcategoryIndex.has(sub)) {
    subcategoryIndex.set(sub, new Set());
  }
  subcategoryIndex.get(sub)!.add(tile.id);
}

/**
 * Load and index tiles from catalog JSON file.
 */
export function loadCatalogFromFile(catalogPath = DEFAULT_CATALOG_PATH): TileCatalogPayload {
  clearTileRegistryMemory();
  // fallow-ignore-next-line security-sink
  const targetPath = path.resolve(catalogPath);
  if (!fs.existsSync(targetPath)) {
    return { version: '1.0', updatedAt: new Date().toISOString(), tiles: {} };
  }

  try {
    // fallow-ignore-next-line security-sink
    const raw = fs.readFileSync(targetPath, 'utf8');
    const data = JSON.parse(raw) as TileCatalogPayload;
    const tiles = data.tiles || {};
    for (const [id, tile] of Object.entries(tiles)) {
      registerTileMemory({ id, ...tile });
    }
    return data;
  } catch (err) {
    console.error(`[tile_registry] Failed to read ${targetPath}:`, err);
    return { version: '1.0', updatedAt: new Date().toISOString(), tiles: {} };
  }
}

/**
 * Persist in-memory tiles to catalog JSON file.
 */
export function saveCatalogToFile(catalogPath = DEFAULT_CATALOG_PATH): TileCatalogPayload {
  // fallow-ignore-next-line security-sink
  const targetPath = path.resolve(catalogPath);
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const tilesObj: Record<string, Omit<TileDefinition, 'id'>> = {};
  for (const [id, tile] of tileMap.entries()) {
    const { id: _ignored, ...rest } = tile;
    tilesObj[id] = rest;
  }

  const payload: TileCatalogPayload = {
    version: '1.0',
    updatedAt: new Date().toISOString(),
    tiles: tilesObj
  };

  fs.writeFileSync(targetPath, JSON.stringify(payload, null, 2), 'utf8');
  return payload;
}

/**
 * Get a tile by its unique ID in O(1).
 */
export function getTile(tileId: string): TileDefinition | undefined { // domain-ok
  return tileMap.get(tileId);
}

/**
 * Get all tiles belonging to a subcategory in O(1) index lookup.
 */
export function getTilesBySubcategory(subcategory: TileSubcategory | string): TileDefinition[] {
  const ids = subcategoryIndex.get(subcategory);
  if (!ids) return [];
  const results: TileDefinition[] = [];
  for (const id of ids) {
    const tile = tileMap.get(id);
    if (tile) results.push(tile);
  }
  return results;
}

/**
 * O(1) Predicates
 */
export function isMountain(tileId: string): boolean {
  const tile = tileMap.get(tileId);
  return Boolean(tile && tile.subcategory === 'mountains');
}

export function isShore(tileId: string): boolean {
  const tile = tileMap.get(tileId);
  return Boolean(tile && tile.subcategory === 'water_shores');
}

export function isGrassEdge(tileId: string): boolean {
  const tile = tileMap.get(tileId);
  return Boolean(tile && tile.subcategory === 'grass_edges');
}

export function isBridge(tileId: string): boolean {
  const tile = tileMap.get(tileId);
  return Boolean(tile && tile.subcategory === 'bridges');
}

export function isBuilding(tileId: string): boolean {
  const tile = tileMap.get(tileId);
  return Boolean(tile && tile.subcategory === 'buildings');
}

export function isVehicle(tileId: string): boolean {
  const tile = tileMap.get(tileId);
  return Boolean(tile && tile.subcategory === 'vehicles');
}

/**
 * Validates whether a tileId exists in the catalog.
 */
export function validateMapTile(tileId: string): { valid: boolean; error?: string } {
  if (!tileMap.has(tileId)) {
    return {
      valid: false,
      error: `Tile '${tileId}' is not registered in the catalog.`
    };
  }
  return { valid: true };
}

// Automatically load catalog if present
loadCatalogFromFile();
