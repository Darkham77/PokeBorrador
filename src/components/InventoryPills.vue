<script setup>
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'

const gameStore = useGameStore()
const uiStore = useUIStore()
const gs = computed(() => gameStore.state)

// Time cycle logic
const dayCycle = computed(() => {
  const cycle = (typeof window.getDayCycle === 'function') ? window.getDayCycle() : 'day'
  const info = {
    morning: { icon: '🌅', label: 'Amanecer', color: '#FFD93D' },
    day: { icon: '☀️', label: 'Día', color: '#FFEEAD' },
    dusk: { icon: '🌅', label: 'Atardecer', color: '#FF6B35' },
    night: { icon: '🌙', label: 'Noche', color: '#9b4dca' }
  }
  return info[cycle] || { icon: '☀️', label: 'Día', color: '#FFEEAD' }
})
</script>

<template>
  <div class="hud-items">
    <!-- CICLO HORARIO REACTIVO -->
    <div
      id="time-cycle-display"
      class="hud-pill time-pill pv-tooltip-container pv-to-bottom"
    >
      <span id="time-icon">{{ dayCycle.icon }}</span>
      <span
        id="time-label"
        class="pill-value"
        :style="{ color: dayCycle.color }"
      >{{ dayCycle.label }}</span>
      <div class="pv-tooltip">
        <span class="pv-tooltip-title">CICLO HORARIO</span>
        <span class="pv-tooltip-desc">El mundo cambia cada 4 horas. ¡Diferentes Pokémon aparecen según la hora!</span>
      </div>
    </div>

    <!-- DINERO -->
    <div class="hud-pill money-pill pv-tooltip-container pv-to-bottom">
      <span>₱</span>
      <span
        id="hud-money"
        class="pill-value"
      >{{ (gs.money || 0).toLocaleString() }}</span>
      <div class="pv-tooltip">
        <span class="pv-tooltip-title">POKÉ-PESOS (₱)</span>
        <span class="pv-tooltip-desc">Moneda principal.</span>
      </div>
    </div>

    <!-- BC -->
    <div class="hud-pill bc-pill pv-tooltip-container pv-to-bottom">
      <i class="fas fa-coins" />
      <span
        id="hud-bc"
        class="pill-value"
      >{{ (gs.battleCoins || 0).toLocaleString() }}</span>
      <div class="pv-tooltip">
        <span class="pv-tooltip-title">BC</span>
        <span class="pv-tooltip-desc">Moneda de élite.</span>
      </div>
    </div>

    <!-- MEDALLAS -->
    <div class="hud-pill badge-pill pv-tooltip-container pv-to-bottom">
      <i class="fas fa-medal" />
      <span
        id="badge-count"
        class="pill-value"
      >{{ gs.badges }}</span>
      <div class="pv-tooltip">
        <span class="pv-tooltip-title">MEDALLAS</span>
      </div>
    </div>

    <!-- BALLS -->
    <div class="hud-pill ball-pill pv-tooltip-container pv-to-bottom">
      <div class="ball-icon-wrap">
        <img
          src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40' width='40' height='40'><circle cx='20' cy='20' r='19' fill='%23222' stroke='%23111' stroke-width='1.5'/><path d='M1 20 A19 19 0 0 1 39 20 Z' fill='%23e63030'/><path d='M1 20 A19 19 0 0 0 39 20 Z' fill='%23f5f5f5'/><rect x='1' y='18' width='38' height='4' fill='%23111'/><circle cx='20' cy='20' r='6' fill='%23111'/><circle cx='20' cy='20' r='4' fill='%23f5f5f5'/><circle cx='18' cy='18' r='1.2' fill='%23ffffff' opacity='0.7'/></svg>"
          width="24"
          height="24"
        >
      </div>
      <span
        id="ball-count"
        class="pill-value"
      >{{ gs.balls }}</span>
    </div>

    <!-- HUEVOS -->
    <div
      id="hud-egg-container"
      class="hud-pill egg-pill pv-tooltip-container pv-to-bottom"
      @click="uiStore.toggleProfile()"
    >
      <span>🥚</span>
      <span
        id="egg-count"
        class="pill-value"
      >{{ (gs.eggs || []).length }}</span>
      <div class="pv-tooltip">
        <span class="pv-tooltip-title">HUEVOS</span>
      </div>
    </div>

    <!-- BOTONES DE ACCIÓN (Unificados con etiquetas) -->
    <div class="action-buttons">
      <button
        id="hud-profile-btn"
        class="hud-sq-btn"
        @click="uiStore.toggleProfile()"
      >
        <span>👤</span><span>Perfil</span>
      </button>

      <button
        id="hud-settings-btn"
        class="hud-sq-btn"
        @click="uiStore.toggleSettings()"
      >
        <span>⚙️</span><span>Ajustes</span>
      </button>

      <button
        id="hud-library-btn"
        class="hud-sq-btn"
        @click="uiStore.toggleLibrary()"
      >
        <span>📖</span><span>Libro</span>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.hud-items {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ball-icon-wrap {
  height: 24px;
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
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.12);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
}

.hud-sq-btn {
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);

  &:hover {
    transform: Scale(1.08) translateY(-2px);
    filter: Brightness(1.15);
  }

  &:active {
    transform: Scale(0.95);
  }
}
</style>
