/**
 * src/logic/map/canonicalAssetsRegistry.ts
 *
 * CANONICAL GBA ASSETS REGISTRY & METADATA PROVIDER
 *
 * Single Source of Truth (SSoT) for all Kanto/FireRed buildings, props,
 * roads, and curbs. Enforces Domain-Type-First governance with O(1)
 * typed dictionary lookups, eliminating naked filenames and hardcoded paths.
 */

import manifestJson from '../../data/map/canonical_assets_manifest.json' with { type: 'json' };

export const CANONICAL_ASSET_CATEGORIES = [
  'buildings',
  'props',
  'roads',
  'curbs',
  'elevation',
  'water',
  'terrain',
  'vegetation'
] as const;
export type CanonicalAssetCategory = (typeof CANONICAL_ASSET_CATEGORIES)[number];

export interface CanonicalSourceRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface CanonicalTileDimensions {
  readonly w: number;
  readonly h: number;
}

export interface CanonicalPixelDimensions {
  readonly w: number;
  readonly h: number;
}

export interface CanonicalDoorOffset {
  readonly dx: number;
  readonly dy: number;
}

export interface CanonicalAssetEntry {
  readonly id: string;
  readonly category: CanonicalAssetCategory;
  readonly name: string;
  readonly sourceImage: string;
  readonly sourceRect: CanonicalSourceRect;
  readonly tileDimensions: CanonicalTileDimensions;
  readonly pixelDimensions: CanonicalPixelDimensions;
  readonly doorOffsets?: readonly CanonicalDoorOffset[];
  readonly collisionMask: readonly (readonly number[])[];
  readonly runtimePath: string;
  readonly alphaKey?: string;
}

export interface BuildingPrefabMeta {
  readonly id: string;
  readonly prefabFile: string;
  readonly runtimePath: string;
  readonly width: number;
  readonly height: number;
  readonly doorOffsets: readonly CanonicalDoorOffset[];
  readonly collisionMask: readonly (readonly number[])[];
}

// O(1) typed registries derived from the canonical manifest
const RAW_MANIFEST = manifestJson as readonly CanonicalAssetEntry[];

export const CANONICAL_ASSETS_BY_ID: Record<string, CanonicalAssetEntry> = Object.freeze(
  RAW_MANIFEST.reduce<Record<string, CanonicalAssetEntry>>((acc, entry) => {
    acc[entry.id] = entry;
    return acc;
  }, {})
);

export const CANONICAL_BUILDINGS: Record<string, CanonicalAssetEntry> = Object.freeze(
  RAW_MANIFEST.filter((e) => e.category === 'buildings').reduce<Record<string, CanonicalAssetEntry>>(
    (acc, entry) => {
      acc[entry.id] = entry;
      return acc;
    },
    {}
  )
);

export const CANONICAL_PROPS: Record<string, CanonicalAssetEntry> = Object.freeze(
  RAW_MANIFEST.filter((e) => e.category === 'props').reduce<Record<string, CanonicalAssetEntry>>(
    (acc, entry) => {
      acc[entry.id] = entry;
      return acc;
    },
    {}
  )
);

export const CANONICAL_ROADS: Record<string, CanonicalAssetEntry> = Object.freeze(
  RAW_MANIFEST.filter((e) => e.category === 'roads').reduce<Record<string, CanonicalAssetEntry>>(
    (acc, entry) => {
      acc[entry.id] = entry;
      return acc;
    },
    {}
  )
);

export const CANONICAL_CURBS: Record<string, CanonicalAssetEntry> = Object.freeze(
  RAW_MANIFEST.filter((e) => e.category === 'curbs').reduce<Record<string, CanonicalAssetEntry>>(
    (acc, entry) => {
      acc[entry.id] = entry;
      return acc;
    },
    {}
  )
);

export const CANONICAL_TERRAIN: Record<string, CanonicalAssetEntry> = Object.freeze(
  RAW_MANIFEST.filter((e) => e.category === 'terrain').reduce<Record<string, CanonicalAssetEntry>>(
    (acc, entry) => {
      acc[entry.id] = entry;
      return acc;
    },
    {}
  )
);

export const CANONICAL_ELEVATION: Record<string, CanonicalAssetEntry> = Object.freeze(
  RAW_MANIFEST.filter((e) => e.category === 'elevation').reduce<Record<string, CanonicalAssetEntry>>(
    (acc, entry) => {
      acc[entry.id] = entry;
      return acc;
    },
    {}
  )
);

/**
 * Returns a canonical asset entry by ID, throwing a descriptive error if missing.
 */
export function getCanonicalAsset(id: string): CanonicalAssetEntry {
  const asset = CANONICAL_ASSETS_BY_ID[id];
  if (!asset) {
    throw new Error(`[canonicalAssetsRegistry] Unknown canonical asset id: "${id}". Check canonical_assets_manifest.json.`);
  }
  return asset;
}

/**
 * Returns building prefab metadata suitable for cityLayoutEngine.
 */
export function getBuildingPrefabMeta(id: string): BuildingPrefabMeta {
  const asset = CANONICAL_BUILDINGS[id];
  if (!asset) {
    throw new Error(`[canonicalAssetsRegistry] Unknown building id: "${id}".`);
  }
  const filename = asset.runtimePath.split('/').pop()!;
  return {
    id: asset.id,
    prefabFile: filename,
    runtimePath: asset.runtimePath,
    width: asset.tileDimensions.w,
    height: asset.tileDimensions.h,
    doorOffsets: asset.doorOffsets ?? [{ dx: Math.floor(asset.tileDimensions.w / 2), dy: asset.tileDimensions.h - 1 }],
    collisionMask: asset.collisionMask
  };
}

/**
 * Resolves the primary sprite filename (e.g. 'poke_dept_store.png') from an asset ID.
 */
export function getAssetFilename(id: string): string {
  const asset = CANONICAL_ASSETS_BY_ID[id];
  if (!asset) {
    throw new Error(`[canonicalAssetsRegistry] Unknown asset id: "${id}".`);
  }
  return asset.runtimePath.split('/').pop()!;
}
