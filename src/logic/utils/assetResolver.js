/**
 * assetResolver.js
 * Centralized logic for resolving optimized asset URLs (LOD).
 */

const BREAKPOINTS = {
  MOBILE: 600,
  TABLET: 1024
};

/**
 * Detects the best resolution suffix for the current viewport.
 * @returns {string} '@0.25x', '@0.5x' or '' (empty for original)
 */
export const getResolutionSuffix = () => {
  if (typeof window === 'undefined') return '';
  const width = window.innerWidth;
  
  if (width < BREAKPOINTS.MOBILE) return '@0.25x';
  if (width < BREAKPOINTS.TABLET) return '@0.5x';
  return '';
};

/**
 * Resolves a path to its optimized version if available.
 * @param {string} url - The base webp URL (e.g. '/assets/maps/ruta1.webp')
 * @param {boolean} isLodEnabled - Whether this asset has LOD versions
 * @returns {string} The optimized URL
 */
export const resolveAsset = (url, isLodEnabled = true) => {
  if (!isLodEnabled || !url || !url.includes('.webp')) return url;
  
  const suffix = getResolutionSuffix();
  if (!suffix) return url;

  // We only append the suffix if it's not already there
  if (url.includes('@')) return encodeURI(url);

  return encodeURI(url.replace('.webp', `${suffix}.webp`));
};

/**
 * Vue Composable for reactive LOD resolution.
 */
import { ref, onMounted, onUnmounted } from 'vue';

export function useAssetResolver() {
  const currentSuffix = ref(getResolutionSuffix());

  const handleResize = () => {
    currentSuffix.value = getResolutionSuffix();
  };

  onMounted(() => window.addEventListener('resize', handleResize)); // [PureVue-Ignore]
  onUnmounted(() => window.removeEventListener('resize', handleResize));

  const resolve = (url, isLodEnabled = true) => resolveAsset(url, isLodEnabled);

  return {
    suffix: currentSuffix,
    resolve
  };
}
