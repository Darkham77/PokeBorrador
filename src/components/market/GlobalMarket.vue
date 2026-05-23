<script setup lang="ts">

import { ref, onMounted, onUnmounted } from 'vue'
import { useGsapTransition } from '@/composables/useGsapTransition'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { useGTSStore } from '@/stores/gts'
import { formatCurrency } from '@/logic/utils/formatters'
import MarketExplorer from './MarketExplorer.vue'
import MarketFilters from './MarketFilters.vue'
import MarketPublish from './MarketPublish.vue'
import MarketMyItems from './MarketMyItems.vue'

const auth = useAuthStore()
const game = useGameStore()
const gtsStore = useGTSStore()

const activeTab = ref('explore') // 'explore' | 'publish' | 'my_items'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const TABS = [
  { id: 'explore', label: 'EXPLORAR', icon: '🔍' },
  { id: 'publish', label: 'PUBLICAR', icon: '🚀' },
  { id: 'my_items', label: 'MIS PUBLICACIONES', icon: '📦' }
]

onMounted(async () => {
  if (auth.sessionMode === 'online') {
    await Promise.all([
      gtsStore.fetchListings(),
      gtsStore.fetchUserData()
    ])
    gtsStore.initRealtime()
  }
})

onUnmounted(() => {
  gtsStore.stopRealtime()
})

const offlineTransitionHooks = useGsapTransition({
  type: 'fade',
  duration: 0.3
})

async function refresh() {
  if (activeTab.value === 'explore') await gtsStore.fetchListings()
  else await gtsStore.fetchUserData()
}
</script>

<template>
  <div class="gts-view">
    <header class="gts-header">
      <div class="header-main">
        <div class="title-group">
          <h1>GLOBAL TRADE STATION</h1>
          <p class="subtitle">
            Intercambio Pokémon Mundial
          </p>
        </div>
        
        <div class="header-stats">
          <div class="stat money">
            <span class="label">SALDO:</span>
            <span class="val">₽ {{ formatCurrency(game.state.money) }}</span>
          </div>
          <button
            class="refresh-btn"
            :disabled="gtsStore.loading"
            @click.stop="refresh"
          >
            {{ gtsStore.loading ? '...' : '🔄' }}
          </button>
        </div>
      </div>

      <nav class="gts-tabs">
        <button 
          v-for="tab in TABS"
          :key="tab.id"
          class="tab-btn"
          :class="{ active: activeTab === tab.id }"
          @click.stop="activeTab = tab.id"
        >
          <span class="t-icon">{{ tab.icon }}</span>
          <span class="t-label">{{ tab.label }}</span>
        </button>
      </nav>
    </header>

    <Transition
      :css="false"
      v-on="offlineTransitionHooks"
    >
      <div
        v-if="auth.sessionMode === 'offline'"
        class="offline-mask"
      >
        <div class="offline-card">
          <span
            v-gsap-loop="{ effect: 'float', duration: 3, y: -8, rotation: 0 }"
            class="icon"
          >🛰️</span>
          <h2>SIN CONEXIÓN</h2>
          <p>El GTS requiere conexión a la Red Satelital de Kanto para sincronizar ofertas con otros entrenadores.</p>
          <button @click.stop="emit('close')">
            VOLVER
          </button>
        </div>
      </div>
    </Transition>

    <main
      v-if="auth.sessionMode !== 'offline'"
      class="gts-content"
    >
      <div
        v-if="activeTab === 'explore'"
        class="tab-pane explore"
      >
        <MarketFilters context="explore" />
        <div class="explorer-wrap scrollable">
          <MarketExplorer />
        </div>
      </div>

      <div
        v-else-if="activeTab === 'publish'"
        class="tab-pane publish"
      >
        <MarketPublish />
      </div>

      <div
        v-else-if="activeTab === 'my_items'"
        class="tab-pane my-items"
      >
        <MarketMyItems />
      </div>
    </main>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.gts-view {
  display: flex;
  flex-direction: column;
  height: 600px;
  max-width: 900px;
  background: Rgba(13, 17, 23, 1);
  border-radius: 24px;
  border: 1px solid Rgba(255, 255, 255, 0.1);
  overflow: hidden;
  box-shadow: 0 20px 50px Rgba(0, 0, 0, 0.5);
  position: relative;
}

.gts-header {
  padding: 24px 30px 0;
  background: Rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid Rgba(255, 255, 255, 0.05);
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.title-group {
  h1 {
    @include pixelated;
    font-size: 14px;
    color: Rgba(56, 189, 248, 1);
    margin: 0 0 8px 0;
    text-shadow: 0 0 15px Rgba(56, 189, 248, 0.3);
  }
  .subtitle {
    font-size: 11px;
    color: $muted;
    margin: 0;
  }
}

.header-stats {
  display: flex;
  align-items: center;
  gap: 15px;

  .stat {
    background: Rgba(0, 0, 0, 0.3);
    padding: 8px 16px;
    border-radius: 12px;
    border: 1px solid Rgba(255, 255, 255, 0.05);
    display: flex;
    flex-direction: column;
    align-items: flex-end;

    .label { font-size: 8px; color: $muted; font-weight: bold; margin-bottom: 2px; }
    .val { @include pixelated; font-size: 11px; color: $coin-gold; }
  }
}

.refresh-btn {
  background: Rgba(255, 255, 255, 0.05);
  border: 1px solid Rgba(255, 255, 255, 0.1);
  color: $white;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  &:hover:not(:disabled) { background: Rgba(255, 255, 255, 0.1); transform: Rotate(45deg); }
  &:disabled { opacity: 0.5; cursor: wait; }
}

.gts-tabs {
  display: flex;
  gap: 8px;
}

.tab-btn {
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 12px 20px;
  color: $muted;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s;
  border-radius: 12px 12px 0 0;

  .t-icon { font-size: 14px; }
  .t-label { font-size: 10px; font-weight: bold; }

  &:hover { color: $white; background: Rgba(255, 255, 255, 0.03); }
  &.active {
    color: Rgba(56, 189, 248, 1);
    background: Rgba(56, 189, 248, 0.05);
    border-bottom-color: Rgba(56, 189, 248, 1);
  }
}

.gts-content {
  flex: 1;
  padding: 24px 30px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.tab-pane {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  
  &.explore {
     .explorer-wrap {
       flex: 1;
       overflow-y: auto;
       min-height: 0;
     }
  }
}

.offline-mask {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
  
  .offline-card {
    max-width: 400px;
    background: Rgba(255, 255, 255, 0.03);
    padding: 40px;
    border-radius: 30px;
    border: 1px solid Rgba(255, 255, 255, 0.08);

    .icon { font-size: 64px; margin-bottom: 20px; display: block; will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  filter: Grayscale(100%); opacity: 0.3; }
    h2 { @include pixelated; font-size: 14px; color: $white; margin-bottom: 20px; }
    p { font-size: 13px; color: $muted; line-height: 1.6; margin-bottom: 30px; }
    
    button {
      padding: 12px 30px;
      background: Rgba(56, 189, 248, 1);
      border: none;
      color: $white;
      border-radius: 12px;
      font-weight: bold;
      cursor: pointer;
    }
  }
}

.scrollable {
  /* Global scrollbars apply via .custom-scrollbar */
}
</style>
