import './logic/utils/temporal-init.ts'
import { createApp } from 'vue'

import { createPinia, type Pinia } from 'pinia'
import App from './App.vue'
import router from './router/index.ts'
import '@/styles/_index.scss'
import { useErrorStore } from '@/stores/errorStore'

declare global {
  interface Window {
    Pinia?: Pinia
  }
}

// Global Components
import PVTooltip from '@/components/common/PVTooltip.vue'
import PokemonPreview from '@/components/admin/debug/PokemonPreview.vue'

// Global Directives
import { gsapNick } from '@/directives/gsapNick'
import { gsapLoop } from '@/directives/gsapLoop'
import { gsapHover } from '@/directives/gsapHover'
import { initGlobalHoverSystem } from '@/logic/hover/globalHover'
import { preloadShowdownWorker } from '@/logic/battle/showdownWorkerClient.ts'

const app = createApp(App)
const pinia = createPinia()

if (typeof window !== 'undefined') {
  window.Pinia = pinia
}

app.component('PVTooltip', PVTooltip)
app.component('PokemonPreview', PokemonPreview)

app.directive('gsap-nick', gsapNick)
app.directive('gsap-loop', gsapLoop)
app.directive('gsap-hover', gsapHover)

app.use(pinia)
app.use(router)

app.config.errorHandler = (err, _instance, info) => {
  try {
    const errorStore = useErrorStore(pinia)
    errorStore.setError(err, {
      type: 'Vue Render Error',
      source: info
    })
  } catch (e) {
    console.error('Failed to log Vue error to errorStore:', e)
  }
  console.error(err)
}

app.mount('#app')
window.pwa_app_mounted = true
preloadShowdownWorker()

// Initialize global hover animations
initGlobalHoverSystem()

if (typeof window !== 'undefined') {
  if (window.__E2E__ || window.location.search.includes('e2e=true')) {
    import('gsap').then(({ gsap }) => {
      gsap.globalTimeline.timeScale(100);
      console.debug('⚡ [E2E] GSAP timeScale set to 100x for instant animations.');
    });
  }
}


