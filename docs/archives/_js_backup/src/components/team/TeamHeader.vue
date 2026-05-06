<script setup>
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBoxStore } from '@/stores/box'

const gameStore = useGameStore()
const boxStore = useBoxStore()

const playerClass = computed(() => gameStore.state.playerClass)

const toggleRocket = () => {
  boxStore.toggleTeamRocketMode()
}

const confirmRocket = () => {
  boxStore.confirmTeamRocketSell()
}

const toggleRelease = () => {
  boxStore.toggleTeamReleaseMode()
}

const confirmRelease = () => {
  boxStore.confirmTeamRelease()
}
</script>

<template>
  <div class="team-header-container">
    <div class="team-header-main legacy-panel">
      <h2 class="th-section-title">
        ⚡ MI EQUIPO
      </h2>
      
      <div class="header-actions">
        <!-- Modo Rocket -->
        <template v-if="playerClass === 'rocket'">
          <template v-if="!boxStore.teamRocketMode">
            <button
              class="legacy-btn rocket-btn"
              @click.stop="toggleRocket"
            >
              🚀 VENTA MASIVA
            </button>
          </template>
          <template v-else>
            <button
              class="legacy-btn confirm-btn"
              @click.stop="confirmRocket"
            >
              ✓ VENDER
            </button>
            <button
              class="legacy-btn cancel-btn"
              @click.stop="toggleRocket"
            >
              ✕ CANCELAR
            </button>
          </template>
        </template>

        <!-- Modo Liberación -->
        <template v-if="!boxStore.teamRocketMode">
          <template v-if="!boxStore.teamReleaseMode">
            <button
              class="legacy-btn release-btn"
              @click.stop="toggleRelease"
            >
              🌿 SOLTAR
            </button>
          </template>
          <template v-else>
            <button
              class="legacy-btn confirm-btn"
              @click.stop="confirmRelease"
            >
              ✓ CONFIRMAR
            </button>
            <button
              class="legacy-btn cancel-btn"
              @click.stop="toggleRelease"
            >
              ✕ CANCELAR
            </button>
          </template>
        </template>
      </div>
    </div>

    <!-- Hint Banners -->
    <Transition name="pixel-slide">
      <div
        v-if="boxStore.teamRocketMode"
        class="hint-banner rocket-hint legacy-panel"
      >
        <span class="hint-icon">🚀</span>
        <p>MODO ROCKET ACTIVO: Seleccioná los Pokémon que querés vender al Mercado Negro.</p>
      </div>
    </Transition>

    <Transition name="pixel-slide">
      <div
        v-if="boxStore.teamReleaseMode"
        class="hint-banner release-hint legacy-panel"
      >
        <span class="hint-icon">⚠️</span>
        <p>Seleccioná los Pokémon que querés soltar. No podés soltar el último del equipo.</p>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
@use "@/styles/core/_mixins" as *;
.team-header-container {
  margin-bottom: 25px;
}

.team-header-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 20px;
  background: $card2;
  border: 4px solid Rgba(51, 51, 51, 1);
  box-shadow: 0 0 0 4px var(--black);
  flex-wrap: wrap;
  gap: 15px;
}

.th-section-title {
  @include pixelated;
  font-size: 14px;
  color: var(--white);
  margin: 0;
  text-shadow: 2px 2px var(--black);
}

.header-actions {
  display: flex;
  gap: 10px;
}

.legacy-btn {
  @include pixelated;
  font-size: 8px;
  padding: 10px 15px;
  cursor: pointer;
  background: Rgba(34, 34, 34, 1);
  border: 3px solid Rgba(68, 68, 68, 1);
  color: var(--white);
  transition: all 0.1s;
}

.legacy-btn:hover {
  background: Rgba(51, 51, 51, 1);
  border-color: Rgba(102, 102, 102, 1);
  transform: translateY(-2px);
}

.rocket-btn { color: Rgba(239, 68, 68, 1); border-color: Rgba(239, 68, 68, 0.4); }
.release-btn { color: Rgba(102, 255, 102, 1); border-color: Rgba(102, 255, 102, 0.4); }
.confirm-btn { background: Rgba(6, 95, 70, 1); border-color: Rgba(16, 185, 129, 1); }
.cancel-btn { background: Rgba(127, 29, 29, 1); border-color: Rgba(239, 68, 68, 1); }

/* Hint Banners */
.hint-banner {
  margin-top: 15px;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  @include pixelated;
  font-size: 8px;
  line-height: 1.6;
  background: Rgba(17, 17, 17, 1);
  border: 4px solid Rgba(51, 51, 51, 1);
  box-shadow: 0 0 0 4px var(--black);
}

.hint-icon { font-size: 16px; }

.rocket-hint { color: Rgba(239, 68, 68, 1); border-color: Rgba(239, 68, 68, 1); }
.release-hint { color: Rgba(255, 204, 0, 1); border-color: Rgba(255, 204, 0, 1); }

/* Transitions */
.pixel-slide-enter-active, .pixel-slide-leave-active {
  transition: all 0.2s steps(4);
}
.pixel-slide-enter-from, .pixel-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
