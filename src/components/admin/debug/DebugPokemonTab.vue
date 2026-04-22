<script setup>
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { PDEX_ORDER, GEN2_PDEX_ORDER } from '@/logic/pokedexConstants'

const props = defineProps({
  securityCheck: { type: Function, required: true }
})

const game = useGameStore()
const ui = useUIStore()

async function setDebugPokedex(mode) {
  if (!props.securityCheck()) return
  
  const allIds = [...PDEX_ORDER, ...GEN2_PDEX_ORDER]
  
  if (mode === 'caught') {
    game.state.pokedex = [...allIds]
    game.state.seenPokedex = [...allIds]
    ui.notify('Debug: Pokedex CAPTURADA (Temporal)', '🌟')
  } else if (mode === 'seen') {
    game.state.pokedex = []
    game.state.seenPokedex = [...allIds]
    ui.notify('Debug: Pokedex VISTA (Temporal)', '👁️')
  } else if (mode === 'none') {
    game.state.pokedex = []
    game.state.seenPokedex = []
    ui.notify('Debug: Pokedex OLVIDADA (Temporal)', '🧹')
  } else if (mode === 'real') {
    // Restore real progress from database
    await game.loadGame()
    ui.notify('Debug: Pokedex REAL RESTAURADA', '✅')
  }
}
</script>

<template>
  <div class="debug-tab-content">
    <h3 class="debug-section-title">
      POKEMON DEBUG
    </h3>

    <!-- Pokedex Tools -->
    <div class="debug-card full-width">
      <label>Testing Pokedex (Temporal)</label>
      <div class="button-row wrap">
        <button
          class="small-btn"
          title="Atrapar todos"
          @click="setDebugPokedex('caught')"
        >
          ATRAPAR
        </button>
        <button
          class="small-btn"
          title="Ver todos"
          @click="setDebugPokedex('seen')"
        >
          VER
        </button>
        <button
          class="small-btn"
          title="Olvidar todos"
          @click="setDebugPokedex('none')"
        >
          OLVIDAR
        </button>
        <button
          class="small-btn accent"
          title="Restaurar progreso real"
          @click="setDebugPokedex('real')"
        >
          REAL
        </button>
      </div>
    </div>

    <!-- Future Pokemon Tools -->
    <div class="debug-card full-width empty">
      <p>Selector de Shiny/Legendarios próximamente...</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.debug-tab-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.debug-section-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: var(--yellow);
  margin-bottom: 10px;
  @include pixelated;
}

.debug-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  
  &.full-width { width: 100%; }
  &.empty { 
    padding: 40px 20px;
    text-align: center;
    color: #64748b;
    font-size: 8px;
    font-family: 'Press Start 2P', monospace;
    @include pixelated;
  }

  label {
    display: block;
    font-family: 'Press Start 2P', monospace;
    font-size: 8px;
    color: #94a3b8;
    margin-bottom: 12px;
    @include pixelated;
  }
}

.button-row {
  display: flex;
  gap: 8px;
  
  &.wrap { flex-wrap: wrap; }
}

.small-btn {
  flex: 1;
  min-width: 80px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #fff;
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  cursor: pointer;
  transition: all 0.2s;
  @include pixelated;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }

  &.accent {
    @include btn-vicio-primary;
    padding: 8px;
    font-size: 7px;
    border-radius: 8px;
    min-width: 80px;
    box-shadow: 0 3px 0 #b45309;
    
    &:hover:not(:disabled) {
      transform: TranslateY(-1px);
      box-shadow: 0 4px 0 #b45309;
    }
  }
}
</style>
