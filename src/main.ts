import './logic/utils/temporal-init.ts';
import '@/logic/system/gamePrefetchCoordinator.ts';
import { createPinia, type Pinia } from 'pinia';
import { createApp } from 'vue';
import { DataLoaderPlugin } from 'vue-router/experimental';

import { gameBus } from '@/logic/events/gameBus';
import { logger } from '@/logic/utils/logger';
import { useErrorStore } from '@/stores/errorStore';

import '@/styles/_index.scss';
import { useUpdateStore } from '@/stores/update';

import App from './App.vue';
import router from './router/index.ts';

declare global {
  interface Window {
    Pinia?: Pinia;
  }
}

import { gsap } from 'gsap';

// Global Components
import PVTooltip from '@/components/common/PVTooltip.vue';
import { gsapHover } from '@/directives/gsapHover';
import { gsapLoop } from '@/directives/gsapLoop';
// Global Directives
import { gsapNick } from '@/directives/gsapNick';
import { initGlobalHoverSystem } from '@/logic/hover/globalHover';

const app = createApp(App);
const pinia = createPinia();

if (typeof globalThis.window !== 'undefined') {
  globalThis.window.Pinia = pinia;
  globalThis.window.gsap = gsap;
  if (globalThis.window.__E2E__ || globalThis.location.search.includes('e2e=true')) {
    gsap.globalTimeline.timeScale(100);
    logger.debug('⚡ [E2E] GSAP timeScale set to 100x for instant animations.');
  }
}

app.component('PVTooltip', PVTooltip);

app.directive('gsap-nick', gsapNick);
app.directive('gsap-loop', gsapLoop);
app.directive('gsap-hover', gsapHover);

app.use(pinia);
app.use(DataLoaderPlugin, { router });
app.use(router);

app.config.errorHandler = (err, _instance, info) => {
  try {
    const errorStore = useErrorStore(pinia);
    errorStore.setError(err, {
      type: 'Vue Render Error',
      source: info
    });
  } catch (e) {
    logger.error('VueErrorHandler', `Failed to log Vue error to errorStore: ${String(e)}`);
  }
  logger.error('VueErrorHandler', `[Vue error]: ${String(err)}`);
};

app.mount('#app');
if (typeof globalThis.window !== 'undefined') {
  globalThis.window.pwa_app_mounted = true;
}

// Initialize global hover animations
initGlobalHoverSystem();

if (typeof globalThis.window !== 'undefined') {
  // Battery/CPU optimization: Sleep GSAP ticker when tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      gsap.ticker.sleep();
    } else {
      gsap.ticker.wake();
    }
  });

  globalThis.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    logger.warn(
      '[Vite] Chunk preload error detected (stale deployment assets). Triggering update flow via gameBus.'
    );
    try {
      useUpdateStore(pinia).notifyChunkLoadError(event);
    } catch {
      gameBus.emit('PWA_NEED_REFRESH');
    }
  });
}
