<script setup lang="ts">

import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

// Sub-components
import DebugStatsTab from './debug/DebugStatsTab.vue'
import DebugClassTab from './debug/DebugClassTab.vue'
import DebugItemsTab from './debug/DebugItemsTab.vue'
import DebugPokemonTab from './debug/DebugPokemonTab.vue'
import DebugTimeTab from './debug/DebugTimeTab.vue'
import DebugModalsTab from './debug/DebugModalsTab.vue'
import DebugMapTab from './debug/DebugMapTab.vue'
import DebugMissionsTab from './debug/DebugMissionsTab.vue'
import DebugAudioAnimTab from './debug/DebugAudioAnimTab.vue'
import DebugTrainersTab from './debug/DebugTrainersTab.vue'

import BaseModal from '@/components/common/BaseModal.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'

import { useDebugStore } from '@/stores/debug'

const auth = useAuthStore()
const debugStore = useDebugStore()
const canAccess = computed(() => debugStore.canAccess)

const isOpen = ref(false)
const selectedCategory = ref('stats')
</script>

<template>
  <div
    v-if="canAccess"
    id="debug-trigger"
    class="debug-trigger"
  >
    <button
      id="debug-trigger-btn"
      class="trigger-btn"
      :class="{ active: isOpen }"
      @click.stop="isOpen = true"
    >
      <span class="icon">🛠️</span>
      <span class="label">DEBUG</span>
    </button>

    <BaseModal
      id="debug-panel-modal"
      :show="isOpen"
      title="ADMIN DEBUG TOOLS"
      type="side-left"
      max-width="500px"
      padding="raw"
      overlay="none"
      :lock-scroll="false"
      @close="isOpen = false"
    >
      <template #header-icon>
        <span class="modal-header-emoji">🛠️</span>
      </template>

      <div
        class="debug-window-standard"
        @wheel.stop
        @touchstart.stop
        @touchmove.stop
        @mousedown.stop
      >
        <div class="debug-status-bar">
          <span
            v-if="auth.sessionMode === 'offline'"
            class="badge offline"
          >
            MODO LOCAL
          </span>
          <span
            v-else
            class="badge admin"
          >
            ADMIN ONLINE
          </span>
        </div>

        <nav
          id="debug-nav"
          class="debug-nav"
        >
          <PVTooltip
            v-for="cat in [
              { id: 'stats', label: 'STATS', desc: 'Atributos del jugador, dinero, elo y facción.' },
              { id: 'class', label: 'CLASE', desc: 'Control de clase del jugador, nivel y reputación.' },
              { id: 'items', label: 'ITEMS', desc: 'Añadir objetos al inventario.' },
              { id: 'pokes', label: 'POKES', desc: 'Gestión de Pokedex y equipo.' },
              { id: 'trainers', label: 'ENTREN', desc: 'Simular combates contra entrenadores, policías y líderes.' },
              { id: 'map', label: 'MAPA', desc: 'Visualización de grilla y rendimiento.' },
              { id: 'missions', label: 'MISI', desc: 'Control de misiones de guardería.' },
              { id: 'time', label: 'TIEMPO', desc: 'Simulación de ciclos y climas.' },
              { id: 'modals', label: 'MODAL', desc: 'Tests de ventanas y errores.' }
            ]" 
            :key="cat.id"
            :title="cat.desc"
          >
            <button 
              :id="'debug-tab-' + cat.id"
              :class="{ active: selectedCategory === cat.id }"
              @click.stop="selectedCategory = cat.id"
            >
              {{ cat.label }}
            </button>
          </PVTooltip>
        </nav>

        <main 
          class="debug-content"
          @wheel.stop
        >
          <DebugStatsTab
            v-if="selectedCategory === 'stats'"
          />
          <DebugClassTab
            v-if="selectedCategory === 'class'"
          />
          <DebugItemsTab
            v-if="selectedCategory === 'items'"
          />
          <DebugTimeTab
            v-if="selectedCategory === 'time'"
          />
          <DebugModalsTab
            v-if="selectedCategory === 'modals'"
          />
          
          <DebugPokemonTab
            v-if="selectedCategory === 'pokes'"
          />
          <DebugTrainersTab
            v-if="selectedCategory === 'trainers'"
          />
          <DebugMapTab
            v-if="selectedCategory === 'map'"
          />
          <DebugMissionsTab
            v-if="selectedCategory === 'missions'"
          />
          <DebugAudioAnimTab
            v-if="selectedCategory === 'audio'"
          />
        </main>
      </div>
    </BaseModal>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.debug-trigger {
  position: relative;
  z-index: var(--z-max);
  
}

.trigger-btn {
  background: Linear-Gradient(135deg, #7c3aed 0%, #4f46e5 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 24px;
  @include pixelated;
  @include pixelated;
  font-size: 8px;
  cursor: pointer;
  box-shadow: 0 8px 25px Rgba(124, 58, 237, 0.4);
  border: 1px solid Rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  gap: 12px;

  &:hover {
    transform: Translatey(-2px) Scale(1.05);
    box-shadow: 0 12px 30px Rgba(124, 58, 237, 0.5);
  }
}

.debug-window-standard {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: transparent;
}

.debug-status-bar {
  padding: 12px 20px;
  background: Rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid Rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  gap: 10px;
}

.badge {
  font-size: 8px;
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 800;
  text-transform: uppercase;
  @include pixelated;
  @include pixelated;
  width: fit-content;
  margin: 0;

  &.offline { background: Rgba(52, 211, 153, 0.1); color: $green; border: 1px solid Rgba(52, 211, 153, 0.2); }
  &.admin { background: Rgba(248, 113, 113, 0.1); color: $red; border: 1px solid Rgba(248, 113, 113, 0.2); }
}

.debug-nav {
  display: flex;
  background: Rgba(255, 255, 255, 0.02);
  padding: 4px;
  gap: 4px;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.05);

  button {
    flex: 1;
    background: transparent;
    border: none;
    color: $muted;
    @include pixelated;
    @include pixelated;
    font-size: 8px;
    padding: 14px 4px;
    cursor: pointer;
    border-radius: 12px;
    

    &:hover { color: $white; background: Rgba(255, 255, 255, 0.05); }
    &.active {
      background: Rgba(124, 58, 237, 0.15);
      color: $purple;
      box-shadow: inset 0 0 10px Rgba(124, 58, 237, 0.1), 0 2px 0 Rgba(0,0,0,0.2);
    }
  }
}

.debug-content {
  flex: 1;
  padding: 20px 16px;
  overflow-y: auto;
  min-height: 0;
  overscroll-behavior: contain;
}
</style>

<style lang="scss">
/* Global overrides for debug panel scrollbar (fix scoped violation) */
.debug-content {
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: Rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    &:hover { background: Rgba(255, 255, 255, 0.1); }
  }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: $muted;
  @include pixelated;
  @include pixelated;
  font-size: 8px;
  line-height: 1.6;
}
</style>
