/**
 * assetResolver.js
 * Centralized logic for resolving optimized asset URLs.
 * LOD (multi-resolution) system has been removed as per user request.
 */

import { ref } from 'vue';

/**
 * Global reactive state for current resolution suffix.
 * Always empty string as multi-resolution is disabled.
 */
export const currentLODSuffix = ref('');

/**
 * Detects the best resolution suffix for the current viewport.
 * Always returns '' as multi-resolution is disabled.
 * @returns {string} Always ''
 */
export const getResolutionSuffix = () => '';

/**
 * Resolves an asset URL.
 * Simply returns the original URL as multi-resolution is disabled.
 */
export const resolveAsset = (url) => {
  if (!url) return '';
  return encodeURI(url);
};

/**
 * Vue Composable for asset resolution.
 * Multi-resolution logic removed.
 */
export function useAssetResolver() {
  const currentSuffix = ref('');

  const resolve = (url) => {
    if (!url) return '';
    return url;
  };

  return {
    suffix: currentSuffix,
    resolve
  };
}
