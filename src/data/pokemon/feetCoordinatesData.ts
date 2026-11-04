/**
 * src/data/pokemon/feetCoordinatesData.ts
 *
 * Strongly-typed domain wrapper for src/data/pokemon/pokemonFeetDatabase.json.
 */

import type { AssetUri } from '@francogp/auditor';

import type { GlobalShadowConfig } from '@/types/pokemon/spriteShadows';

import dbJson from './pokemonFeetDatabase.json' with { type: 'json' };

export interface PackedFeetDatabase {
  p?: Record<AssetUri, readonly number[]>;
  n?: Record<AssetUri, readonly number[]>;
  t?: Record<AssetUri, readonly number[]>;
  c?: Record<AssetUri, AssetUri>;
  shadow?: GlobalShadowConfig;
}

export const FEET_COORDINATES_DATA: PackedFeetDatabase = dbJson;
