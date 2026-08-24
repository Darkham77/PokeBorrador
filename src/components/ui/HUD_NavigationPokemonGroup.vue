<script setup lang="ts">
import type { useModalStore } from '@/stores/modals'
import type { useBreedingStore } from '@/stores/breeding'
import PVHUDButton from '@/components/common/PVHUDButton.vue'

defineProps<{
  activeTab: string
  openHudGroup: string | null
  modalStore: ReturnType<typeof useModalStore>
  breedingStore: ReturnType<typeof useBreedingStore>
  handleMouseEnter: (group: string) => void
  handleMouseLeave: (group: string) => void
  toggleGroupMenu: (name: string) => void
  handleTabChange: (tab: string, event?: Event) => void
  beforeEnter: (el: Element) => void
  enter: (el: Element, done: () => void) => void
  leave: (el: Element, done: () => void) => void
}>()

const emit = defineEmits<{
  (e: 'closeHudGroup'): void
}>()
</script>

<template>
  <div 
    class="hud-group relative-box"
    @mouseenter="handleMouseEnter('POKEMON')"
    @mouseleave="handleMouseLeave('POKEMON')"
  >
    <PVHUDButton
      id="nav-pokemon-btn"
      custom-class="group-btn"
      :active="['box', 'pokedex'].includes(activeTab) || openHudGroup === 'POKEMON' || modalStore.isOpen('TeamManagement') || modalStore.isOpen('EventMissions') || modalStore.isOpen('DaycareMissions')"
      :badge-value="breedingStore.fulfillableMissionsCount"
      @click.stop="toggleGroupMenu('POKEMON')"
    >
      <template #icon>
        ⚡
      </template>
      POKÉMON
    </PVHUDButton>
    
    <Transition
      :css="false"
      @before-enter="beforeEnter"
      @enter="enter"
      @leave="leave"
    >
      <div 
        v-if="openHudGroup === 'POKEMON'"
        class="hud-submenu"
      >
        <button
          id="nav-pokemon-team-btn"
          class="hud-nav-btn"
          :class="{ active: modalStore.isOpen('TeamManagement') }"
          @click.stop="handleTabChange('team', $event); emit('closeHudGroup')"
        >
          <span class="icon">⚡</span>
          <span class="nav-item-label">EQUIPO</span>
        </button>
        <button
          id="nav-pokemon-pc-btn"
          class="hud-nav-btn"
          :class="{ active: activeTab === 'box' }"
          @click.stop="handleTabChange('box', $event); emit('closeHudGroup')"
        >
          <span class="icon">📦</span>
          <span class="nav-item-label">CAJA PC</span>
        </button>
        <button
          id="nav-pokemon-missions-btn"
          class="hud-nav-btn"
          :class="{ active: modalStore.isOpen('EventMissions') || modalStore.isOpen('DaycareMissions') }"
          @click.stop="handleTabChange('missions'); emit('closeHudGroup')"
        >
          <span class="icon">📜</span>
          <span class="nav-item-label">MISIONES</span>
          <span
            v-if="breedingStore.fulfillableMissionsCount > 0"
            class="hud-notification-badge"
          >
            {{ breedingStore.fulfillableMissionsCount }}
          </span>
        </button>
        <button
          id="nav-pokemon-pokedex-btn"
          class="hud-nav-btn"
          :class="{ active: activeTab === 'pokedex' }"
          @click.stop="handleTabChange('pokedex', $event); emit('closeHudGroup')"
        >
          <span class="icon">📖</span>
          <span class="nav-item-label">POKÉDEX</span>
        </button>
      </div>
    </Transition>
  </div>
</template>
