<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { useGTSStore } from '@/stores/gtsStore'
import MarketExplorer from './MarketExplorer.vue'
import MarketFilters from './MarketFilters.vue'
import MarketPublish from './MarketPublish.vue'
import MarketMyItems from './MarketMyItems.vue'

const auth = useAuthStore()
const game = useGameStore()
const gtsStore = useGTSStore()

const activeTab = ref('explore') // 'explore' | 'publish' | 'my_items'

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
            <span class="val">₽ {{ game.state.money.toLocaleString() }}</span>
          </div>
          <button
            class="refresh-btn"
            :disabled="gtsStore.loading"
            @click="refresh"
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
          @click="activeTab = tab.id"
        >
          <span class="t-icon">{{ tab.icon }}</span>
          <span class="t-label">{{ tab.label }}</span>
        </button>
      </nav>
    </header>

    <div
      v-if="auth.sessionMode === 'offline'"
      class="offline-mask"
    >
      <div class="offline-card">
        <span class="icon">🛰️</span>
        <h2>SIN CONEXIÓN</h2>
        <p>El GTS requiere conexión a la Red Satelital de Kanto para sincronizar ofertas con otros entrenadores.</p>
        <button @click="$emit('close')">
          VOLVER
        </button>
      </div>
    </div>

    <main
      v-else
      class="gts-content"
    >
      <div
        v-if="activeTab === 'explore'"
        class="tab-pane explore"
      >
        <MarketFilters />
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
.gts-view {
  display: flex;
  flex-direction: column;
  height: 600px;
  max-width: 900px;
  background: #0d1117;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  position: relative;
}

.gts-header {
  padding: 24px 30px 0;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.title-group {
  h1 {
    font-family: 'Press Start 2P', monospace;
    font-size: 14px;
    color: #a855f7;
    margin: 0 0 8px 0;
    text-shadow: 0 0 15px rgba(168, 85, 247, 0.3);
  }
  .subtitle {
    font-size: 11px;
    color: #64748b;
    margin: 0;
  }
}

.header-stats {
  display: flex;
  align-items: center;
  gap: 15px;

  .stat {
    background: rgba(0, 0, 0, 0.3);
    padding: 8px 16px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    flex-direction: column;
    align-items: flex-end;

    .label { font-size: 8px; color: #64748b; font-weight: bold; margin-bottom: 2px; }
    .val { font-family: 'Press Start 2P', monospace; font-size: 11px; color: #ffd700; }
  }
}

.refresh-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  &:hover:not(:disabled) { background: rgba(255, 255, 255, 0.1); transform: rotate(45deg); }
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
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s;
  border-radius: 12px 12px 0 0;

  .t-icon { font-size: 14px; }
  .t-label { font-size: 10px; font-weight: bold; }

  &:hover { color: #fff; background: rgba(255, 255, 255, 0.03); }
  &.active {
    color: #a855f7;
    background: rgba(168, 85, 247, 0.05);
    border-bottom-color: #a855f7;
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
    background: rgba(255, 255, 255, 0.03);
    padding: 40px;
    border-radius: 30px;
    border: 1px solid rgba(255, 255, 255, 0.08);

    .icon { font-size: 64px; margin-bottom: 20px; display: block; filter: grayScale(100%) Opacity(0.3); }
    h2 { font-family: 'Press Start 2P', monospace; font-size: 14px; color: #fff; margin-bottom: 20px; }
    p { font-size: 13px; color: #64748b; line-height: 1.6; margin-bottom: 30px; }
    
    button {
      padding: 12px 30px;
      background: #a855f7;
      border: none;
      color: #fff;
      border-radius: 12px;
      font-weight: bold;
      cursor: pointer;
    }
  }
}

.scrollable {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
}
</style>
