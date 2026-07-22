<script setup lang="ts">
import PVHUDButton from '@/components/common/PVHUDButton.vue'

const emit = defineEmits<{
  (e: 'close-hud-group'): void
}>()

defineProps<{
  modalStore: { isOpen: (modal: string) => boolean }
  gtsStore: { unseenSalesCount: number }
  gameStore: { state: { playerClass?: string | null } }
  uiStore: { openHudGroup: string | null }
  handleMouseEnter: (group: string) => void
  handleMouseLeave: (group: string) => void
  toggleGroupMenu: (group: string) => void
  handleTabChange: (tab: string, e?: Event) => void
  beforeEnter: (el: Element) => void
  enter: (el: Element, done: () => void) => void
  leave: (el: Element, done: () => void) => void
}>()
</script>

<template>
  <div 
    class="hud-group relative-box"
    @mouseenter="handleMouseEnter('MARKET')"
    @mouseleave="handleMouseLeave('MARKET')"
  >
    <PVHUDButton
      custom-class="group-btn"
      :active="uiStore.openHudGroup === 'MARKET' || modalStore.isOpen('GlobalMarket') || modalStore.isOpen('Shop') || modalStore.isOpen('BCShop') || modalStore.isOpen('WarShop') || modalStore.isOpen('ReputationShop')"
      :badge-value="gtsStore.unseenSalesCount"
      @click.stop="toggleGroupMenu('MARKET')"
    >
      <template #icon>
        🏪
      </template>
      MARKET
    </PVHUDButton>
    
    <Transition
      :css="false"
      @before-enter="beforeEnter"
      @enter="enter"
      @leave="leave"
    >
      <div 
        v-if="uiStore.openHudGroup === 'MARKET'"
        class="hud-submenu"
      >
        <button
          class="hud-nav-btn"
          :class="{ active: modalStore.isOpen('GlobalMarket') }"
          @click.stop="handleTabChange('online-market'); emit('close-hud-group')"
        >
          <span class="icon">🌎</span>
          <span class="nav-item-label">GLOBAL</span>
          <span
            v-if="gtsStore.unseenSalesCount > 0"
            class="hud-notification-badge"
          >
            {{ gtsStore.unseenSalesCount }}
          </span>
        </button>
        <button
          class="hud-nav-btn"
          :class="{ active: modalStore.isOpen('Shop') }"
          @click.stop="handleTabChange('market'); emit('close-hud-group')"
        >
          <span class="icon">🛒</span>
          <span class="nav-item-label">LOCAL</span>
        </button>
        <button
          class="hud-nav-btn"
          :class="{ active: modalStore.isOpen('BCShop') }"
          @click.stop="handleTabChange('trainer-shop'); emit('close-hud-group')"
        >
          <span class="icon">🎖️</span>
          <span class="nav-item-label">BC SHOP</span>
        </button>
        <button
          v-if="gameStore.state.playerClass === 'entrenador'"
          class="hud-nav-btn rep-shop-nav-btn"
          :class="{ active: modalStore.isOpen('ReputationShop') }"
          @click.stop="handleTabChange('reputation-shop'); emit('close-hud-group')"
        >
          <span class="icon">★</span>
          <span class="nav-item-label">REPUTACIÓN</span>
        </button>
        <button
          class="hud-nav-btn war-shop-nav-btn"
          :class="{ active: modalStore.isOpen('WarShop') }"
          @click.stop="handleTabChange('war-shop'); emit('close-hud-group')"
        >
          <span class="icon">🚩</span>
          <span class="nav-item-label">GUERRA</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_hud-navigation.scss"></style>
