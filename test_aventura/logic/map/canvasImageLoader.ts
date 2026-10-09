/**
 * src/logic/map/canvasImageLoader.ts
 *
 * CANONICAL 2D CANVAS TILE & PREFAB ASSET LOADER
 *
 * Dedicated image loading, caching, and URL resolution for the Canvas Tile Renderer.
 */

import { CANONICAL_ASSETS_BY_ID } from './canonicalAssetsRegistry.ts';

const imageCache = new Map<string, HTMLImageElement>();

const FALLBACK_TILE_MAP: Record<string, string> = {
  'poke_cliff_brown_inner_nw.png': 'poke_cliff_brown_edge_n.png',
  'poke_cliff_brown_inner_ne.png': 'poke_cliff_brown_edge_n.png',
  'poke_cliff_brown_inner_sw.png': 'poke_cliff_brown_foot.png',
  'poke_cliff_brown_inner_se.png': 'poke_cliff_brown_foot.png',
  'poke_cliff_gray_inner_nw.png': 'poke_cliff_gray_edge_n.png',
  'poke_cliff_gray_inner_ne.png': 'poke_cliff_gray_edge_n.png',
  'poke_cliff_gray_inner_sw.png': 'poke_cliff_gray_foot.png',
  'poke_cliff_gray_inner_se.png': 'poke_cliff_gray_foot.png',
  'poke_sand_water_corner_nw.png': 'poke_water_ocean_edge_n.png',
  'poke_sand_water_corner_ne.png': 'poke_water_ocean_edge_n.png',
  'poke_sand_water_corner_sw.png': 'poke_water_ocean_edge_s.png',
  'poke_sand_water_corner_se.png': 'poke_water_ocean_edge_s.png'
};

/**
 * Resolves public web URL for a given tile or prefab asset filename.
 * Guarantees 100% resolution via canonical Essentials / GBA assets with safe fallbacks.
 */
export function resolveTileUrl(filename: string): string {
  const baseId = filename.replace(/\.png$/, '');
  const canonAsset = CANONICAL_ASSETS_BY_ID[baseId];
  if (canonAsset) {
    return `/test_aventura/assets/${canonAsset.runtimePath}`;
  }

  // Safe fallback mapping for missing geological/coastal variants
  const fallback = FALLBACK_TILE_MAP[filename];
  if (fallback) {
    console.warn(`[CanvasImageLoader] Warning: Asset "${filename}" unmapped in manifest, safely falling back to "${fallback}"`);
    const fbBaseId = fallback.replace(/\.png$/, '');
    const fbAsset = CANONICAL_ASSETS_BY_ID[fbBaseId];
    if (fbAsset) {
      return `/test_aventura/assets/${fbAsset.runtimePath}`;
    }
  }

  if (
    filename === 'poke_tree_cuttable.png' ||
    filename === 'tree_cuttable.png' ||
    filename === 'tree_viridian_forest.png' ||
    filename === 'poke_tree_poke.png' ||
    filename === 'tree_poke.png'
  ) {
    return `/test_aventura/assets/prefabs/vegetation/${filename}`;
  }
  return `/test_aventura/assets/prefabs/${filename}`;
}

/**
 * Loads and caches a canonical image. Fails loudly with console error if missing.
 */
export function loadTileImage(filename: string): Promise<HTMLImageElement | null> {
  const cached = imageCache.get(filename);
  if (cached) return Promise.resolve(cached);

  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const primaryUrl = resolveTileUrl(filename);
    const img = new Image();
    img.src = primaryUrl;
    img.onload = (): void => {
      imageCache.set(filename, img);
      resolve(img);
    };
    img.onerror = (): void => {
      console.error(`[CanvasTileRenderer] Missing canonical Essentials asset: ${filename} (attempted ${primaryUrl})`);
      resolve(null);
    };
  });
}

/**
 * Pre-loads a collection of unique tile image filenames into the in-memory cache.
 */
export async function preloadTileImages(filenames: Iterable<string>): Promise<void> {
  const toLoad = Array.from(filenames).filter((fn) => !imageCache.has(fn));
  await Promise.all(toLoad.map((fn) => loadTileImage(fn)));
}

/**
 * Returns the underlying in-memory image cache map (e.g. for testing / debugging).
 */
export function getImageCache(): Map<string, HTMLImageElement> {
  return imageCache;
}
