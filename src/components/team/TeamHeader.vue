<script setup>
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBoxStore } from '@/stores/boxStore'

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
      <h2 class="section-title">
        ⚡ MI EQUIPO
      </h2>
      
      <div class="header-actions">
        <!-- Modo Rocket -->
        <template v-if="playerClass === 'rocket'">
          <template v-if="!boxStore.teamRocketMode">
            <button
              class="legacy-btn rocket-btn"
              @click="toggleRocket"
            >
              🚀 VENTA MASIVA
            </button>
          </template>
          <template v-else>
            <button
              class="legacy-btn confirm-btn"
              @click="confirmRocket"
            >
              ✓ VENDER
            </button>
            <button
              class="legacy-btn cancel-btn"
              @click="toggleRocket"
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
              @click="toggleRelease"
            >
              🌿 SOLTAR
            </button>
          </template>
          <template v-else>
            <button
              class="legacy-btn confirm-btn"
              @click="confirmRelease"
            >
              ✓ CONFIRMAR
            </button>
            <button
              class="legacy-btn cancel-btn"
              @click="toggleRelease"
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
.team-header-container {
  margin-bottom: 25px;
}

.team-header-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 20px;
  background: #1a1a1a;
  border: 4px solid #333;
  box-shadow: 0 0 0 4px #000;
  flex-wrap: wrap;
  gap: 15px;
}

.section-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 14px;
  color: #fff;
  margin: 0;
  text-shadow: 2px 2px #000;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.legacy-btn {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  padding: 10px 15px;
  cursor: pointer;
  background: #222;
  border: 3px solid #444;
  color: #fff;
  transition: all 0.1s;
}

.legacy-btn:hover {
  background: #333;
  border-color: #666;
  transform: translateY(-2px);
}

.rocket-btn { color: #ef4444; border-color: #ef444466; }
.release-btn { color: #66ff66; border-color: #66ff6666; }
.confirm-btn { background: #065f46; border-color: #10b981; }
.cancel-btn { background: #7f1d1d; border-color: #ef4444; }

/* Hint Banners */
.hint-banner {
  margin-top: 15px;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  line-height: 1.6;
  background: #111;
  border: 4px solid #333;
  box-shadow: 0 0 0 4px #000;
}

.hint-icon { font-size: 16px; }

.rocket-hint { color: #ef4444; border-color: #ef4444; }
.release-hint { color: #ffcc00; border-color: #ffcc00; }

/* Transitions */
.pixel-slide-enter-active, .pixel-slide-leave-active {
  transition: all 0.2s steps(4);
}
.pixel-slide-enter-from, .pixel-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
