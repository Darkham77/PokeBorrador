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

// Global Directives
import { gsapNick } from '@/directives/gsapNick'
import { gsapLoop } from '@/directives/gsapLoop'
import { gsapHover } from '@/directives/gsapHover'
import { initGlobalHoverSystem } from '@/logic/hover/globalHover'

import { gsap } from 'gsap'

const app = createApp(App)
const pinia = createPinia()

if (typeof window !== 'undefined') {
  window.Pinia = pinia
  window.gsap = gsap
  if (window.__E2E__ || window.location.search.includes('e2e=true')) {
    gsap.globalTimeline.timeScale(100);
    console.debug('⚡ [E2E] GSAP timeScale set to 100x for instant animations.');
  }
}

app.component('PVTooltip', PVTooltip)

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
  console.error('[Vue error]:', err)
}

app.mount('#app')
window.pwa_app_mounted = true

// Initialize global hover animations
initGlobalHoverSystem()

if (typeof window !== 'undefined') {
  // Battery/CPU optimization: Sleep GSAP ticker when tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      gsap.ticker.sleep()
    } else {
      gsap.ticker.wake()
    }
  })

  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()
    console.warn('[Vite] Chunk preload error detected (stale deployment assets). Triggering PWA update flow.')
    import('@/logic/events/gameBus.ts').then(({ gameBus }) => {
      gameBus.emit('PWA_NEED_REFRESH')
    })
  })
}


