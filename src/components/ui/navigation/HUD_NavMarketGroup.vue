<script setup lang="ts">
import PVHUDButton from "@/components/common/PVHUDButton.vue";
import { useNavigationState } from "@/composables/navigation/useNavigationState";

withDefaults(defineProps<{
  position?: string;
}>(), {
  position: "top"
});

const {
  uiStore,
  modalStore,
  gtsStore,
  gameStore,
  handleMouseEnter,
  handleMouseLeave,
  toggleGroupMenu,
  handleTabChange,
  beforeEnter,
  enter,
  leave
} = useNavigationState();
</script>

<template>
  <div 
    class="hud-group relative-box"
    :class="[`pos-${position}`]"
    @mouseenter="handleMouseEnter('MARKET')"
    @mouseleave="handleMouseLeave('MARKET')"
  >
    <PVHUDButton
      id="nav-market-btn"
      custom-class="group-btn"
      :active="uiStore.openHudGroup === 'MARKET' || modalStore.isOpen('GlobalMarket') || modalStore.isOpen('Shop') || modalStore.isOpen('BCShop') || modalStore.isOpen('WarShop') || modalStore.isOpen('ReputationShop')"
      :badge-value="gtsStore.unseenSalesCount"
      @click.stop="toggleGroupMenu('MARKET')"
    >
      <template #icon>
        <span class="emoji">🏪</span>
      </template>
      MARKET
    </PVHUDButton>
    
    <Transition
      :css="false"
      @before-enter="el => beforeEnter(el, position)"
      @enter="enter"
      @leave="(el, done) => leave(el, position, done)"
    >
      <div 
        v-if="uiStore.openHudGroup === 'MARKET'"
        class="hud-submenu"
      >
        <button
          id="nav-market-global-btn"
          class="hud-nav-btn"
          :class="{ active: modalStore.isOpen('GlobalMarket') }"
          @click.stop="handleTabChange('online-market'); uiStore.openHudGroup = null"
        >
          <span class="emoji">🌎</span>
          <span class="nav-item-label">GLOBAL</span>
          <span
            v-if="gtsStore.unseenSalesCount > 0"
            class="hud-notification-badge"
          >
            {{ gtsStore.unseenSalesCount }}
          </span>
        </button>
        <button
          id="nav-market-local-btn"
          class="hud-nav-btn"
          :class="{ active: modalStore.isOpen('Shop') }"
          @click.stop="handleTabChange('market'); uiStore.openHudGroup = null"
        >
          <span class="emoji">🛒</span>
          <span class="nav-item-label">LOCAL</span>
        </button>
        <button
          id="nav-market-bc-btn"
          class="hud-nav-btn"
          :class="{ active: modalStore.isOpen('BCShop') }"
          @click.stop="handleTabChange('trainer-shop'); uiStore.openHudGroup = null"
        >
          <span class="emoji">🎖️</span>
          <span class="nav-item-label">BC SHOP</span>
        </button>
        <button
          v-if="gameStore.state.playerClass === 'entrenador'"
          id="nav-market-reputation-btn"
          class="hud-nav-btn rep-shop-nav-btn"
          :class="{ active: modalStore.isOpen('ReputationShop') }"
          @click.stop="handleTabChange('reputation-shop'); uiStore.openHudGroup = null"
        >
          <span class="emoji">★</span>
          <span class="nav-item-label">REPUTACIÓN</span>
        </button>
        <button
          id="nav-market-war-btn"
          class="hud-nav-btn war-shop-nav-btn"
          :class="{ active: modalStore.isOpen('WarShop') }"
          @click.stop="handleTabChange('war-shop'); uiStore.openHudGroup = null"
        >
          <span class="emoji">🚩</span>
          <span class="nav-item-label">GUERRA</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_hud-navigation.scss"></style>
