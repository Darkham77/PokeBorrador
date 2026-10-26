import '@/logic/utils/temporal-init.ts';
import { createPinia } from 'pinia';
import { createApp } from 'vue';

import PokemonPreview from '@/components/admin/debug/PokemonPreview.vue';

import '@/styles/_index.scss';
import './styles/animations.scss';

// Global Components (matching main app so components compile successfully)
import PVTooltip from '@/components/common/PVTooltip.vue';
import { gsapHover } from '@/directives/gsapHover';
import { gsapLoop } from '@/directives/gsapLoop';
// Global Directives
import { gsapNick } from '@/directives/gsapNick';
import { initGlobalHoverSystem } from '@/logic/hover/globalHover';

import App from './App.vue';

const app = createApp(App);
const pinia = createPinia();

if (typeof globalThis.window !== 'undefined') {
  globalThis.window.Pinia = pinia;
}

app.component('PVTooltip', PVTooltip);
app.component('PokemonPreview', PokemonPreview);

app.directive('gsap-nick', gsapNick);
app.directive('gsap-loop', gsapLoop);
app.directive('gsap-hover', gsapHover);

import { createRouter, createMemoryHistory } from 'vue-router';

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/:catchAll(.*)', component: { template: '<div />' } }]
});

app.use(router);
app.use(pinia);

app.mount('#app');

if (typeof globalThis.window !== 'undefined') {
  initGlobalHoverSystem();
}
