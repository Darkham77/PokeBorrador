import '@/logic/utils/temporal-init.ts';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import '@/styles/_index.scss';
import './styles/ui_demo.scss';

// Global Components
import PVTooltip from '@/components/common/PVTooltip.vue';

// Global Directives
import { gsapNick } from '@/directives/gsapNick';
import { gsapLoop } from '@/directives/gsapLoop';
import { gsapHover } from '@/directives/gsapHover';
import { initGlobalHoverSystem } from '@/logic/hover/globalHover';
import { gsap } from 'gsap';

import { useGameStore } from '@/stores/game';
import { useUIStore } from '@/stores/ui';
import { DEMO_TEAM_POKEMON, DEMO_BOX_POKEMON } from './data/mockPokemon.ts';

const app = createApp(App);
const pinia = createPinia();

if (typeof window !== 'undefined') {
  window.Pinia = pinia;
  window.gsap = gsap;
}

app.component('PVTooltip', PVTooltip);
app.directive('gsap-nick', gsapNick);
app.directive('gsap-loop', gsapLoop);
app.directive('gsap-hover', gsapHover);

app.use(pinia);

// Mock Data Initializer for official components
const gameStore = useGameStore(pinia);
gameStore.state.team = DEMO_TEAM_POKEMON;
gameStore.state.box = DEMO_BOX_POKEMON;
gameStore.state.starterChosen = true;
const DEMO_INVENTORY_INITIAL_QUANTITIES = {
  POKEBALL: 25,
  POTION: 20,
  SUPERPOTION: 12,
  REVIVE: 6
} as const;

gameStore.state.inventory = {
  pokeball: DEMO_INVENTORY_INITIAL_QUANTITIES.POKEBALL,
  ultraball: 10,
  potion: DEMO_INVENTORY_INITIAL_QUANTITIES.POTION,
  superpotion: DEMO_INVENTORY_INITIAL_QUANTITIES.SUPERPOTION,
  maxpotion: 5,
  revive: DEMO_INVENTORY_INITIAL_QUANTITIES.REVIVE,
  leftovers: 2,
  charcoal: 1
};

const uiStore = useUIStore(pinia);
uiStore.activeTab = 'home';

app.mount('#app');

initGlobalHoverSystem();
