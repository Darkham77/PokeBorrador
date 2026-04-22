<script setup>
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'

const props = defineProps({
  securityCheck: { type: Function, required: true }
})

const game = useGameStore()
const ui = useUIStore()

async function setDebugPokedex(mode) {
  if (!props.securityCheck()) return
  
  if (mode === 'real') {
    ui.debugPokedexMode = null
    // Restore real progress from database just in case they modified it earlier
    await game.loadGame()
    ui.notify('Debug: Pokedex REAL RESTAURADA', '✅')
  } else {
    ui.debugPokedexMode = mode === 'none' ? null : mode
    const msg = mode === 'caught' ? 'CAPTURADA' : mode === 'seen' ? 'VISTA' : 'RESET'
    const icon = mode === 'caught' ? '🌟' : mode === 'seen' ? '👁️' : '👁️‍🗨️'
    ui.notify(`Debug: Pokedex ${msg} (VISTA TEMPORAL)`, icon)
  }
}

async function resetPokedexDB() {
  if (!props.securityCheck()) return
  if (!confirm('⚠️ PELIGRO: Esto borrará TODO el progreso de tu Pokedex (Avistados y Capturados) de forma PERMANENTE. ¿Continuar?')) return
  
  game.state.pokedex = []
  game.state.seenPokedex = []
  
  await game.saveGame(false)
  ui.notify('Pokedex reseteada en la base de datos', '🧹')
}

async function syncPokedexFromCollection() {
  if (!props.securityCheck()) return
  if (!confirm('Esto recalculará tu Pokedex basándose en los Pokémon que posees actualmente. ¿Continuar?')) return
  
  // Start with current progress or empty?
  // User says "recalculate", implying we should find everything they have.
  const caughtIds = new Set()
  const seenIds = new Set()
  
  // Process Team
  game.state.team.forEach(p => {
    if (p && p.id) {
      caughtIds.add(p.id)
      seenIds.add(p.id)
    }
  })
  
  // Process Box
  if (game.state.box) {
    game.state.box.forEach(p => {
      if (p && p.id) {
        caughtIds.add(p.id)
        seenIds.add(p.id)
      }
    })
  }
  
  game.state.pokedex = Array.from(caughtIds)
  game.state.seenPokedex = Array.from(seenIds)
  
  await game.saveGame(false)
  ui.notify('Pokedex sincronizada con tu colección', '🔄')
}
</script>

<template>
  <div class="debug-tab-content">
    <h3 class="debug-section-title">
      POKEMON DEBUG
    </h3>

    <!-- Pokedex Tools -->
    <div class="debug-card full-width">
      <label>Override Visual Pokedex (No se guarda)</label>
      <div class="button-row wrap">
        <button
          class="small-btn"
          :class="{ active: ui.debugPokedexMode === 'caught' }"
          title="Atrapar todos"
          @click="setDebugPokedex('caught')"
        >
          ATRAPAR
        </button>
        <button
          class="small-btn"
          :class="{ active: ui.debugPokedexMode === 'seen' }"
          title="Ver todos"
          @click="setDebugPokedex('seen')"
        >
          VER
        </button>
        <button
          class="small-btn accent"
          :class="{ active: !ui.debugPokedexMode }"
          title="Restaurar progreso real"
          @click="setDebugPokedex('real')"
        >
          REAL
        </button>
      </div>
      
      <div class="debug-danger-zone">
        <label class="danger-label">Persistent Database Changes (SE GUARDA)</label>
        <div class="button-row wrap">
          <button
            class="sync-btn"
            title="Sincroniza la pokedex con lo que tienes en el equipo/caja"
            @click="syncPokedexFromCollection"
          >
            RECALCULAR DESDE COLECCIÓN
          </button>
          <button
            class="sync-btn danger"
            title="Borra todo el progreso de la pokedex"
            @click="resetPokedexDB"
          >
            OLVIDAR TODO (RESET)
          </button>
        </div>
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
    color: $muted;
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
  color: $white;
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  cursor: pointer;
  transition: all 0.2s;
  @include pixelated;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }

  &.active {
    background: rgba(124, 58, 237, 0.2);
    border-color: #c084fc;
    color: #c084fc;
    box-shadow: inset 0 0 10px rgba(124, 58, 237, 0.1);
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

.debug-danger-zone {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed rgba(124, 58, 237, 0.3);
  text-align: right;
}

.danger-label {
  color: #ef4444 !important;
  margin-top: 4px;
  margin-bottom: 8px !important;
  opacity: 0.8;
}

.sync-btn {
  background: rgba(124, 58, 237, 0.1);
  border: 1px solid rgba(124, 58, 237, 0.2);
  color: #c084fc;
  padding: 8px 12px;
  border-radius: 8px;
  font-family: 'Press Start 2P', monospace;
  font-size: 6px;
  cursor: pointer;
  flex: 1;
  min-width: 120px;
  @include pixelated;

  &:hover {
    background: #7c3aed;
    color: $white;
  }

  &.danger {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
    color: #f87171;

    &:hover {
      background: #ef4444;
      color: $white;
    }
  }
}
</style>
