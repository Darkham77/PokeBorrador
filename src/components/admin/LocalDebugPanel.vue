<script setup lang="ts">

import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { GAME_UI_EVENTS } from '@/types/system/gameEvents.ts'
import { useWindowListener } from '@/composables/ui/useWindowListener'

// Sub-components
import LocalDebugTabContent from './LocalDebugTabContent.vue'
import { DEBUG_PANEL_CATEGORIES } from './debug/debugPanelCategories.ts'

import BaseModal from '@/components/common/BaseModal.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'

import { useDebugStore } from '@/stores/debug'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const debugStore = useDebugStore()
const router = useRouter()
const canAccess = computed(() => debugStore.canAccess)

const isOpen = ref(false)
const selectedCategory = ref('stats')

const openShadowEditor = () => {
  isOpen.value = false
  router.push('/dev/shadow-editor')
}

const closeForBattleEntry = () => {
  isOpen.value = false
}

useWindowListener(GAME_UI_EVENTS.BATTLE_ENTERING, closeForBattleEntry)
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
      <span class="emoji">🛠️</span>
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
        <span class="emoji modal-header-emoji">🛠️</span>
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
          <button
            id="debug-shadow-editor-btn"
            class="badge shadow-btn"
            title="Abrir editor visual de sombras"
            @click.stop="openShadowEditor"
          >
            <span class="emoji">🎨</span> SOMBRAS
          </button>
        </div>

        <nav
          id="debug-nav"
          class="debug-nav"
        >
          <PVTooltip
            v-for="cat in DEBUG_PANEL_CATEGORIES" 
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

        <LocalDebugTabContent
          :selected-category="selectedCategory"
          @close="isOpen = false"
        />
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
  &.shadow-btn {
    background: Rgba(168, 85, 247, 0.15);
    color: var(--purple, #c084fc);
    border: 1px solid Rgba(168, 85, 247, 0.3);
    cursor: pointer;
    margin-left: auto;
    &:hover {
      background: Rgba(168, 85, 247, 0.25);
      border-color: Rgba(168, 85, 247, 0.5);
    }
  }
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

</style>

<style lang="scss">
@use "@/styles/components/debug" as *;

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
