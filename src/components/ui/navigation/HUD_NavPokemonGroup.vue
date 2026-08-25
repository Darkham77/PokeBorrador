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
  breedingStore,
  activeTab,
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
    @mouseenter="handleMouseEnter('POKEMON')"
    @mouseleave="handleMouseLeave('POKEMON')"
  >
    <PVHUDButton
      id="nav-pokemon-btn"
      custom-class="group-btn"
      :active="['box', 'pokedex'].includes(activeTab) || uiStore.openHudGroup === 'POKEMON' || modalStore.isOpen('TeamManagement') || modalStore.isOpen('EventMissions') || modalStore.isOpen('DaycareMissions')"
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
      @before-enter="el => beforeEnter(el, position)"
      @enter="enter"
      @leave="(el, done) => leave(el, position, done)"
    >
      <div 
        v-if="uiStore.openHudGroup === 'POKEMON'"
        class="hud-submenu"
      >
        <button
          id="nav-pokemon-team-btn"
          class="hud-nav-btn"
          :class="{ active: modalStore.isOpen('TeamManagement') }"
          @click.stop="handleTabChange('team', $event); uiStore.openHudGroup = null"
        >
          <span class="icon">⚡</span>
          <span class="nav-item-label">EQUIPO</span>
        </button>
        <button
          id="nav-pokemon-pc-btn"
          class="hud-nav-btn"
          :class="{ active: activeTab === 'box' }"
          @click.stop="handleTabChange('box', $event); uiStore.openHudGroup = null"
        >
          <span class="icon">📦</span>
          <span class="nav-item-label">CAJA PC</span>
        </button>
        <button
          id="nav-pokemon-missions-btn"
          class="hud-nav-btn"
          :class="{ active: modalStore.isOpen('EventMissions') || modalStore.isOpen('DaycareMissions') }"
          @click.stop="handleTabChange('missions'); uiStore.openHudGroup = null"
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
          @click.stop="handleTabChange('pokedex', $event); uiStore.openHudGroup = null"
        >
          <span class="icon">📖</span>
          <span class="nav-item-label">POKÉDEX</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_hud-navigation.scss"></style>
