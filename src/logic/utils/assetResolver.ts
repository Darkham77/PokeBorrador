
/**
 * assetResolver.ts
 * Centralized logic for resolving optimized asset URLs.
 * LOD (multi-resolution) system has been removed as per user request.
 */

import { ref, type Ref } from 'vue';

/**
 * Global reactive state for current resolution suffix.
 * Always empty string as multi-resolution is disabled.
 */
export const currentLODSuffix: Ref<string> = ref('');

/**
 * Detects the best resolution suffix for the current viewport.
 * Always returns '' as multi-resolution is disabled.
 */
export const getResolutionSuffix = (): string => '';

/**
 * Resolves an asset URL.
 * Simply returns the original URL as multi-resolution is disabled.
 */
export const resolveAsset = (url: string): string => {
  if (!url) return '';
  const base = import.meta.env.BASE_URL || '/';
  let resolved = url;
  if (url.startsWith('/')) {
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
    resolved = `${cleanBase}${url}`;
  }
  return encodeURI(resolved);
};

/**
 * Vue Composable for asset resolution.
 * Multi-resolution logic removed.
 */
export function useAssetResolver() {
  const currentSuffix = ref('');

  const resolve = (url: string): string => {
    if (!url) return '';
    return url;
  };

  return {
    suffix: currentSuffix,
    resolve
  };
}
