/**
 * assetResolver.js
 * Centralized logic for resolving optimized asset URLs (LOD).
 */

import { ref, onMounted, onUnmounted } from 'vue';

const BREAKPOINTS = {
  MOBILE: 600,
  TABLET: 1024
};

/**
 * Global reactive state for current LOD suffix.
 */
export const currentLODSuffix = ref('');

const updateGlobalSuffix = () => {
  if (typeof window === 'undefined') return;
  const width = window.innerWidth;
  if (width < BREAKPOINTS.MOBILE) currentLODSuffix.value = '@0.25x';
  else if (width < BREAKPOINTS.TABLET) currentLODSuffix.value = '@0.5x';
  else currentLODSuffix.value = '';
};

// Initial check and listener
if (typeof window !== 'undefined') {
  updateGlobalSuffix();
  window.addEventListener('resize', updateGlobalSuffix); // [PureVue-Ignore]
}

/**
 * Detects the best resolution suffix for the current viewport.
 * @returns {string} '@0.25x', '@0.5x' or '' (empty for original)
 */
export const getResolutionSuffix = () => currentLODSuffix.value;

export const resolveAsset = (url, isLodEnabled = true) => {
  if (!isLodEnabled || !url) return url;
  
  const isWebp = url.includes('.webp');
  const isJson = url.includes('.json');
  
  if (!isWebp && !isJson) return url;
  
  const suffix = getResolutionSuffix();
  if (!suffix) return url;

  // We only append the suffix if it's not already there
  if (url.includes('@')) return encodeURI(url);

  if (isWebp) return encodeURI(url.replace('.webp', `${suffix}.webp`));
  if (isJson) return encodeURI(url.replace('.json', `${suffix}.json`));
  
  return encodeURI(url);
};

/**
 * Vue Composable for reactive LOD resolution.
 */

export function useAssetResolver() {
  const currentSuffix = ref(getResolutionSuffix());

  const handleResize = () => {
    currentSuffix.value = getResolutionSuffix();
  };

  onMounted(() => window.addEventListener('resize', handleResize)); // [PureVue-Ignore]
  onUnmounted(() => window.removeEventListener('resize', handleResize));

  const resolve = (url, isLodEnabled = true) => {
    if (!isLodEnabled || !url) return url;
    
    const isWebp = url.includes('.webp');
    const isJson = url.includes('.json');
    if (!isWebp && !isJson) return url;
    if (url.includes('@')) return url;

    const suffix = currentSuffix.value;
    if (!suffix) return url;

    if (isWebp) return url.replace('.webp', `${suffix}.webp`);
    if (isJson) return url.replace('.json', `${suffix}.json`);
    
    return url;
  };

  return {
    suffix: currentSuffix,
    resolve
  };
}
