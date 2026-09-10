import '@/logic/utils/temporal-init.ts'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import '@/styles/_index.scss'
import './styles/ui_demo.scss'

// Global Components
import PVTooltip from '@/components/common/PVTooltip.vue'

// Global Directives
import { gsapNick } from '@/directives/gsapNick'
import { gsapLoop } from '@/directives/gsapLoop'
import { gsapHover } from '@/directives/gsapHover'
import { initGlobalHoverSystem } from '@/logic/hover/globalHover'
import { gsap } from 'gsap'

import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { DEMO_TEAM_POKEMON, DEMO_BOX_POKEMON } from './data/mockPokemon.ts'

const app = createApp(App)
const pinia = createPinia()

if (typeof window !== 'undefined') {
  window.Pinia = pinia
  window.gsap = gsap
}

app.component('PVTooltip', PVTooltip)
app.directive('gsap-nick', gsapNick)
app.directive('gsap-loop', gsapLoop)
app.directive('gsap-hover', gsapHover)

app.use(pinia)

// Mock Data Initializer for official components
const gameStore = useGameStore(pinia)
gameStore.state.team = DEMO_TEAM_POKEMON
gameStore.state.box = DEMO_BOX_POKEMON
gameStore.state.starterChosen = true
gameStore.state.inventory = {
  pokeball: 25,
  ultraball: 10,
  potion: 20,
  superpotion: 12,
  maxpotion: 5,
  revive: 6,
  leftovers: 2,
  charcoal: 1
}

const uiStore = useUIStore(pinia)
uiStore.activeTab = 'home'

app.mount('#app')

initGlobalHoverSystem()
