/**
 * test_aventura/logic/map/assetWebPathResolver.ts
 *
 * ASSET WEB PATH RESOLVER ENGINE (SSoT)
 * Resolves any sprite, tile, or prefab filename to its canonical web path
 * using the static asset files index dictionary.
 */

import { ASSET_FILES_INDEX } from '../../data/map/assetFilesIndex.ts';

const POKE_PREFIX_REGEX = /^poke_/;
const PNG_EXTENSION_REGEX = /\.png$/i;
const TEST_AVENTURA_PREFIX = '/test_aventura/assets/';
const ASSETS_PREFIX = '/assets/';
const ASSETS_REPLACEMENT_PREFIX = '/test_aventura/assets/';

export function resolveAssetWebPath(name: string): string | undefined {
  if (!name) return undefined;
  if (name.startsWith(TEST_AVENTURA_PREFIX)) return name;
  if (name.startsWith(ASSETS_PREFIX))
    return `${ASSETS_REPLACEMENT_PREFIX}${name.slice(ASSETS_PREFIX.length)}`;

  const clean = name.replace(POKE_PREFIX_REGEX, '');
  const noExt = clean.replace(PNG_EXTENSION_REGEX, '');

  return (
    ASSET_FILES_INDEX[name] ??
    ASSET_FILES_INDEX[clean] ??
    ASSET_FILES_INDEX[`${clean}.png`] ??
    ASSET_FILES_INDEX[`poke_${clean}`] ??
    ASSET_FILES_INDEX[`poke_${clean}.png`] ??
    ASSET_FILES_INDEX[noExt] ??
    ASSET_FILES_INDEX[`poke_${noExt}`]
  );
}
