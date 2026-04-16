<script setup>
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'

const gameStore = useGameStore()

const ui = computed(() => gameStore.state.uiSelection)
const playerClass = computed(() => gameStore.state.playerClass)

const toggleRocket = () => {
  if (typeof window.toggleTeamRocketMode === 'function') {
    window.toggleTeamRocketMode()
  }
}

const confirmRocket = () => {
  if (typeof window.confirmTeamRocketSell === 'function') {
    window.confirmTeamRocketSell()
  }
}

const toggleRelease = () => {
  if (typeof window.toggleReleaseMode === 'function') {
    window.toggleReleaseMode()
  }
}

const confirmRelease = () => {
  if (typeof window.confirmRelease === 'function') {
    window.confirmRelease()
  }
}
</script>

<template>
  <div class="team-header-container">
    <div class="team-header-main">
      <div class="section-title">
        ⚡ Mi Equipo
      </div>
      
      <div class="header-actions">
        <!-- Modo Rocket -->
        <template v-if="playerClass === 'rocket'">
          <template v-if="!ui.teamRocketMode">
            <button class="rocket-btn" @click="toggleRocket">
              🚀 VENTA MASIVA
            </button>
          </template>
          <template v-else>
            <button class="confirm-btn" @click="confirmRocket">
              ✓ VENDER
            </button>
            <button class="cancel-btn" @click="toggleRocket">
              ✕ CANCELAR
            </button>
          </template>
        </template>

        <!-- Modo Liberación -->
        <template v-if="!ui.teamRocketMode">
          <template v-if="!ui.teamReleaseMode">
            <button class="release-btn" @click="toggleRelease">
              🌿 SOLTAR
            </button>
          </template>
          <template v-else>
            <button class="confirm-btn" @click="confirmRelease">
              ✓ CONFIRMAR
            </button>
            <button class="cancel-btn" @click="toggleRelease">
              ✕ CANCELAR
            </button>
          </template>
        </template>
      </div>
    </div>

    <!-- Hint Banners -->
    <Transition name="slide-down">
      <div v-if="ui.teamRocketMode" class="hint-banner rocket-hint">
        🚀 Modo Rocket Activo: Seleccioná los Pokémon que querés vender al Mercado Negro.
      </div>
    </Transition>

    <Transition name="slide-down">
      <div v-if="ui.teamReleaseMode" class="hint-banner release-hint">
        ⚠️ Seleccioná los Pokémon que querés soltar. No podés soltar el último del equipo.
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.team-header-container { margin-bottom: 24px; }

.team-header-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.section-title { margin-bottom: 0; }

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.hint-banner {
  font-size: 11px;
  margin-top: 12px;
  border-radius: 12px;
  padding: 12px 16px;
  animation: slideDown 0.3s ease;
}

.rocket-hint {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.release-hint {
  color: var(--red);
  background: rgba(255, 59, 59, 0.08);
  border: 1px solid rgba(255, 59, 59, 0.2);
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.slide-down-enter-active, .slide-down-leave-active { transition: all 0.3s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-10px); }
</style>
