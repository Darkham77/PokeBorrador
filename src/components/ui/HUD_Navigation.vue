<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useNavigationState } from "@/composables/navigation/useNavigationState";
import HUD_NavPokemonGroup from "./navigation/HUD_NavPokemonGroup.vue";
import HUD_NavMarketGroup from "./navigation/HUD_NavMarketGroup.vue";
import HUD_NavSocialGroup from "./navigation/HUD_NavSocialGroup.vue";
import EggSprite from "@/components/common/EggSprite.vue";
import PVHUDButton from "@/components/common/PVHUDButton.vue";
import PVTooltip from "@/components/common/PVTooltip.vue";

interface Props {
  position?: string;
}

withDefaults(defineProps<Props>(), {
  position: "top"
});

const {
  uiStore,
  modalStore,
  activeTab,
  mochilaTooltipDescription,
  gymRematchesCount,
  medalsBreakdown,
  crianzaBadgeValue,
  eggsBreakdown,
  handleTabChange
} = useNavigationState();

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Element | null;
  if (!target) return;
  if (target.closest(".hud-nav") || target.closest(".hud-submenu") || target.closest(".hud-group")) {
    return;
  }
  uiStore.openHudGroup = null;
};

onMounted(() => {
  window.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  window.removeEventListener("click", handleClickOutside);
});
</script>

<template>
  <div
    class="hud-nav"
    :class="[`pos-${position}`]"
  >
    <!-- 0. INICIO -->
    <PVHUDButton
      id="nav-home-btn"
      custom-class="home-btn"
      :active="activeTab === 'home'"
      data-tab="home"
      @click.stop="handleTabChange('home')"
    >
      <template #icon>
        <span class="emoji">🏠</span>
      </template>
      INICIO
    </PVHUDButton>

    <!-- 1. MAPA -->
    <PVHUDButton
      id="nav-map-btn"
      custom-class="map-btn"
      :active="activeTab === 'map'"
      data-tab="map"
      @click.stop="handleTabChange('map')"
    >
      <template #icon>
        <span class="emoji">🗺️</span>
      </template>
      MAPA
    </PVHUDButton>

    <!-- 2. POKÉMON (Grupo Modular) -->
    <HUD_NavPokemonGroup :position="position" />

    <!-- 3. MOCHILA -->
    <PVTooltip
      title="MOCHILA"
      :description="mochilaTooltipDescription"
      position="top"
    >
      <PVHUDButton
        id="nav-bag-btn"
        :active="modalStore.isOpen('Inventory')"
        @click.stop="handleTabChange('bag')"
      >
        <template #icon>
          <span class="emoji">🎒</span>
        </template>
        MOCHILA
      </PVHUDButton>
    </PVTooltip>
    
    <!-- 4. GIMS -->
    <PVTooltip
      title="GIMNASIOS"
      :description="medalsBreakdown"
      position="top"
    >
      <PVHUDButton
        id="nav-gyms-btn"
        :active="activeTab === 'gyms'"
        :badge-value="gymRematchesCount > 0 ? gymRematchesCount : 0"
        @click.stop="handleTabChange('gyms')"
      >
        <template #icon>
          <span class="emoji">🏆</span>
        </template>
        GIMS
      </PVHUDButton>
    </PVTooltip>

    <!-- 5. CRIANZA -->
    <PVTooltip
      title="CRIANZA"
      :description="eggsBreakdown"
      position="top"
    >
      <PVHUDButton
        id="nav-crianza-btn"
        :active="activeTab === 'daycare'"
        :badge-value="crianzaBadgeValue"
        @click.stop="handleTabChange('daycare')"
      >
        <template #icon>
          <span style="display: inline-flex; justify-content: center; align-items: center; width: 100%;">
            <EggSprite size="20" />
          </span>
        </template>
        CRIANZA
      </PVHUDButton>
    </PVTooltip>

    <!-- 6. MARKET (Grupo Modular) -->
    <HUD_NavMarketGroup :position="position" />

    <!-- 7. SOCIAL (Grupo Modular) -->
    <HUD_NavSocialGroup :position="position" />
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_hud-navigation.scss"></style>
