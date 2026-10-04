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
  @include pixelated;
  @include pixelated;

  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  border: none;
  border: 1px solid Rgb(255 255 255 / 20%);
  border-radius: 24px;
  background: Linear-Gradient(135deg, #7c3aed 0%, #4f46e5 100%);
  color: white;
  font-size: 8px;
  cursor: pointer;
  box-shadow: 0 8px 25px Rgb(124 58 237 / 40%);

  &:hover {
    transform: Translatey(-2px) Scale(1.05);
    box-shadow: 0 12px 30px Rgb(124 58 237 / 50%);
  }
}

.debug-window-standard {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: transparent;
}

.debug-status-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: Rgb(0 0 0 / 20%);
  border-bottom: 1px solid Rgb(255 255 255 / 5%);
}

.badge {
  @include pixelated;
  @include pixelated;

  width: fit-content;
  margin: 0;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 8px;
  font-weight: 800;
  text-transform: uppercase;

  &.offline { border: 1px solid Rgb(52 211 153 / 20%); background: Rgb(52 211 153 / 10%); color: $green; }
  &.admin { border: 1px solid Rgb(248 113 113 / 20%); background: Rgb(248 113 113 / 10%); color: $red; }
  &.shadow-btn {
    border: 1px solid Rgb(168 85 247 / 30%);
    background: Rgb(168 85 247 / 15%);
    color: var(--purple, #c084fc);
    cursor: pointer;
    margin-left: auto;
    &:hover {
      background: Rgb(168 85 247 / 25%);
      border-color: Rgb(168 85 247 / 50%);
    }
  }
}

.debug-nav {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: Rgb(255 255 255 / 2%);
  border-bottom: 1px solid Rgb(255 255 255 / 5%);

  button {
    @include pixelated;
    @include pixelated;

    padding: 14px 4px;
    border: none;
    border-radius: 12px;
    background: transparent;
    color: $muted;
    font-size: 8px;
    flex: 1;
    cursor: pointer;
    

    &:hover { background: Rgb(255 255 255 / 5%); color: $white; }
    &.active {
      background: Rgb(124 58 237 / 15%);
      color: $purple;
      box-shadow: inset 0 0 10px Rgb(124 58 237 / 10%), 0 2px 0 Rgb(0 0 0 / 20%);
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
    border-radius: 10px;
    background: Rgb(255 255 255 / 5%);
    &:hover { background: Rgb(255 255 255 / 10%); }
  }
}

.empty-state {
  @include pixelated;
  @include pixelated;

  padding: 60px 20px;
  color: $muted;
  font-size: 8px;
  line-height: 1.6;
  text-align: center;
}
</style>
