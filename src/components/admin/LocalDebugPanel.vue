<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

// Sub-components
import DebugStatsTab from './debug/DebugStatsTab.vue'
import DebugItemsTab from './debug/DebugItemsTab.vue'
import DebugPokemonTab from './debug/DebugPokemonTab.vue'
import DebugTimeTab from './debug/DebugTimeTab.vue'
import DebugModalsTab from './debug/DebugModalsTab.vue'
import DebugMapTab from './debug/DebugMapTab.vue'
import DebugMissionsTab from './debug/DebugMissionsTab.vue'

import BaseModal from '@/components/common/BaseModal.vue'

import { useDebugStore } from '@/stores/debug'

const auth = useAuthStore()
const debug = useDebugStore()
const canAccess = computed(() => debug.canAccess)

const isOpen = ref(false)
const selectedCategory = ref('stats')
</script>

<template>
  <div
    v-if="canAccess"
    class="debug-trigger"
  >
    <button
      class="trigger-btn"
      :class="{ active: isOpen }"
      @click="isOpen = true"
    >
      <span class="icon">🛠️</span>
      <span class="label">DEBUG</span>
    </button>

    <BaseModal
      :show="isOpen"
      title="ADMIN DEBUG TOOLS"
      type="side-left"
      max-width="460px"
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

        <nav class="debug-nav">
          <button 
            v-for="cat in ['stats', 'items', 'pokes', 'map', 'missions', 'time', 'modals']" 
            :key="cat"
            :class="{ active: selectedCategory === cat }"
            @click="selectedCategory = cat"
          >
            {{ cat.toUpperCase() }}
          </button>
        </nav>

        <main 
          class="debug-content"
          @wheel.stop
        >
          <DebugStatsTab
            v-if="selectedCategory === 'stats'"
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
          <DebugMapTab
            v-if="selectedCategory === 'map'"
          />
          <DebugMissionsTab
            v-if="selectedCategory === 'missions'"
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
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.trigger-btn {
  background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 24px;
  font-family: 'Press Start 2P', monospace;
  @include pixelated;
  font-size: 8px;
  cursor: pointer;
  box-shadow: 0 8px 25px rgba(124, 58, 237, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  gap: 12px;

  &:hover {
    transform: TranslateY(-2px) Scale(1.05);
    box-shadow: 0 12px 30px rgba(124, 58, 237, 0.5);
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
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
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
  font-family: 'Press Start 2P', monospace;
  @include pixelated;
  width: fit-content;
  margin: 0;

  &.offline { background: rgba(52, 211, 153, 0.1); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.2); }
  &.admin { background: rgba(248, 113, 113, 0.1); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.2); }
}

.debug-nav {
  display: flex;
  background: rgba(255, 255, 255, 0.02);
  padding: 4px;
  gap: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  button {
    flex: 1;
    background: transparent;
    border: none;
    color: #94a3b8;
    font-family: 'Press Start 2P', monospace;
    @include pixelated;
    font-size: 8px;
    padding: 14px 4px;
    cursor: pointer;
    border-radius: 12px;
    transition: all 0.2s;

    &:hover { color: $white; background: rgba(255, 255, 255, 0.05); }
    &.active {
      background: rgba(124, 58, 237, 0.15);
      color: #c084fc;
      box-shadow: inset 0 0 10px rgba(124, 58, 237, 0.1);
    }
  }
}

.debug-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  min-height: 0;
  overscroll-behavior: contain;

  /* Custom scrollbar for debug panel */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    &:hover { background: rgba(255, 255, 255, 0.1); }
  }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: $muted;
  font-family: 'Press Start 2P', monospace;
  @include pixelated;
  font-size: 8px;
  line-height: 1.6;
}
</style>
