import '@/logic/utils/temporal-init.ts'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import '@/styles/_index.scss'

// Global Components (matching main app so components compile successfully)
import PVTooltip from '@/components/common/PVTooltip.vue'
import PokemonPreview from '@/components/admin/debug/PokemonPreview.vue'

// Global Directives
import { gsapNick } from '@/directives/gsapNick'
import { gsapLoop } from '@/directives/gsapLoop'
import { gsapHover } from '@/directives/gsapHover'
import { initGlobalHoverSystem } from '@/logic/hover/globalHover'

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

app.mount('#app')

if (typeof window !== 'undefined') {
  initGlobalHoverSystem()
}
