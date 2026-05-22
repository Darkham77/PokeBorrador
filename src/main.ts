import './logic/utils/temporal-init.ts'
import { createApp } from 'vue'

import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import '@/styles/_index.scss'

// Global Components
import PVTooltip from '@/components/common/PVTooltip.vue'
import PokemonPreview from '@/components/admin/debug/PokemonPreview.vue'

// Global Directives
import { gsapNick } from '@/directives/gsapNick'

const app = createApp(App)
const pinia = createPinia()

app.component('PVTooltip', PVTooltip)
app.component('PokemonPreview', PokemonPreview)

app.directive('gsap-nick', gsapNick)

app.use(pinia)
app.use(router)

app.mount('#app')
window.pwa_app_mounted = true

