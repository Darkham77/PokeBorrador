<script setup>
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useMapStore } from '@/stores/map'
import PVTooltip from '@/components/common/PVTooltip.vue'

const _gameStore = useGameStore()
const _uiStore = useUIStore()
const mapStore = useMapStore()
const gs = computed(() => _gameStore.state)

// Time cycle logic synced with Map/Logic
const dayCycle = computed(() => {
  const cycle = mapStore.currentCycle
  const info = {
    morning: { icon: '🌅', label: 'Amanecer', color: '#FFD93D' },
    day: { icon: '☀️', label: 'Día', color: '#FFEEAD' },
    dusk: { icon: '🌇', label: 'Atardecer', color: '#FF6B35' },
    night: { icon: '🌙', label: 'Noche', color: '#9b4dca' }
  }
  return info[cycle] || { icon: '☀️', label: 'Día', color: '#FFEEAD' }
})

const currentSeason = computed(() => mapStore.currentSeason)

</script>

<template>
  <div class="hud-items">
    <!-- CICLO HORARIO REACTIVO -->
    <PVTooltip
      :title="`${dayCycle.label.toUpperCase()} - ${currentSeason.label.toUpperCase()}`"
      description="El mundo cambia cada 8 horas. ¡Las estaciones cambian cada semana!"
      position="bottom"
    >
      <div
        id="time-cycle-display"
        class="hud-pill time-pill"
      >
        <span id="time-icon">{{ dayCycle.icon }}</span>
        <span
          id="time-label"
          class="pill-value"
          :style="{ color: dayCycle.color, fontSize: '6.5px' }"
        >{{ dayCycle.label }}</span>
        <span
          class="pill-value season-label"
          style="color: #A0C4FF; font-size: 7px; margin-top: -3px;"
        >{{ currentSeason.label }}</span>
      </div>
    </PVTooltip>

    <!-- DINERO -->
    <PVTooltip
      title="POKÉ-PESOS (₱)"
      description="Moneda principal obtenida en combates y venta de objetos."
      position="bottom"
    >
      <div class="hud-pill money-pill">
        <span class="currency-icon-money">₱</span>
        <span
          id="hud-money"
          class="pill-value"
        >{{ (gs.money || 0).toLocaleString() }}</span>
      </div>
    </PVTooltip>

    <!-- BC -->
    <PVTooltip
      title="BATTLE COINS (BC)"
      description="Moneda de élite obtenida en eventos y misiones especiales."
      position="bottom"
    >
      <div class="hud-pill bc-pill">
        <i class="fas fa-coins currency-icon-bc" />
        <span
          id="hud-bc"
          class="pill-value"
        >{{ (gs.battleCoins || 0).toLocaleString() }}</span>
      </div>
    </PVTooltip>

    <!-- MEDALLAS -->
    <PVTooltip
      title="MEDALLAS"
      description="Progreso de tu aventura. Desbloquean nuevas zonas y Pokémon."
      position="bottom"
    >
      <div class="hud-pill badge-pill">
        <i class="fas fa-medal" />
        <span
          id="badge-count"
          class="pill-value"
        >{{ gs.badges }}</span>
      </div>
    </PVTooltip>

    <!-- BALLS -->
    <PVTooltip
      title="POKÉ BALLS"
      description="Cantidad total de Poké Balls disponibles en tu mochila."
      position="bottom"
    >
      <div class="hud-pill ball-pill">
        <div class="ball-icon-wrap">
          <img
            src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40' width='40' height='40'><circle cx='20' cy='20' r='19' fill='%23222' stroke='%23111' stroke-width='1.5'/><path d='M1 20 A19 19 0 0 1 39 20 Z' fill='%23e63030'/><path d='M1 20 A19 19 0 0 0 39 20 Z' fill='%23f5f5f5'/><rect x='1' y='18' width='38' height='4' fill='%23111'/><circle cx='20' cy='20' r='6' fill='%23111'/><circle cx='20' cy='20' r='4' fill='%23f5f5f5'/><circle cx='18' cy='18' r='1.2' fill='%23ffffff' opacity='0.7'/></svg>"
            width="24"
            height="24"
            data-ignore="[PureVue-Ignore]"
            @error="e => e.target.style.display = 'none'"
          >
        </div>
        <span
          id="ball-count"
          class="pill-value"
        >{{ gs.balls }}</span>
      </div>
    </PVTooltip>

    <!-- HUEVOS -->
    <PVTooltip
      title="HUEVOS POKÉMON"
      description="Huevos en proceso de incubación. Haz clic para ver detalles."
      position="bottom"
    >
      <div
        id="hud-egg-container"
        class="hud-pill egg-pill"
        @click.stop="_uiStore.toggleProfile()"
      >
        <span>🥚</span>
        <span
          id="egg-count"
          class="pill-value"
        >{{ (gs.eggs || []).length }}</span>
      </div>
    </PVTooltip>
  </div>
</template>

<style scoped lang="scss">
.hud-items {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ball-icon-wrap {
  height: 28px;
  display: flex;
  align-items: center;
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin-left: 8px;
}

.hud-pill {
  transition: all 0.2s ease;
  
  &:hover {
    transform: TranslateY(-2px);
    background: Rgba(255, 255, 255, 0.12);
    box-shadow: 0 4px 12px Rgba(0, 0, 0, 0.2);
  }

  .currency-icon-hud {
    width: 20px;
    height: 20px;
    image-rendering: pixelated;
    object-fit: contain;
  }
}

.hud-sq-btn {
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);

  &:hover {
    transform: Scale(1.08) TranslateY(-2px);
    filter: Brightness(1.15);
  }

  &:active {
    transform: Scale(0.95);
  }
}
</style>
