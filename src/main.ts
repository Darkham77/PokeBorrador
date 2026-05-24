import './logic/utils/temporal-init.ts'
import { createApp } from 'vue'

import { createPinia, type Pinia } from 'pinia'
import App from './App.vue'
import router from './router'
import '@/styles/_index.scss'

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
import { initGlobalHoverSystem } from '@/logic/globalHover'

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

app.mount('#app')
window.pwa_app_mounted = true

// Initialize global hover animations
initGlobalHoverSystem()

