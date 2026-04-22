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
  
  const caughtIds = new Set()
  const seenIds = new Set()
  
  game.state.team.forEach(p => {
    if (p && p.id) {
      caughtIds.add(p.id)
      seenIds.add(p.id)
    }
  })
  
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
  ui.notify('Pokedex sincronizada', '🔄')
}

async function clearPvpTeam() {
  if (!props.securityCheck()) return
  if (!confirm('¿Limpiar equipo PVP de forma permanente?')) return
  
  ui.pvpAutoFillDisabled = true
  game.state.pvpTeam = []
  await game.saveGame(false)
  ui.notify('Equipo PVP limpiado y auto-rellenado desactivado (Temporal)', '🧹')
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
          class="btn-vicio-neutral btn-vicio-sm"
          :class="{ active: ui.debugPokedexMode === 'caught' }"
          title="Atrapar todos"
          @click="setDebugPokedex('caught')"
        >
          ATRAPAR
        </button>
        <button
          class="btn-vicio-neutral btn-vicio-sm"
          :class="{ active: ui.debugPokedexMode === 'seen' }"
          title="Ver todos"
          @click="setDebugPokedex('seen')"
        >
          VER
        </button>
        <button
          class="btn-vicio-primary btn-vicio-sm"
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
            class="btn-vicio-secondary btn-vicio-sm"
            title="Sincroniza la pokedex con lo que tienes en el equipo/caja"
            @click="syncPokedexFromCollection"
          >
            RECALCULAR POKEDEX
          </button>
          <button
            class="btn-vicio-danger btn-vicio-sm"
            title="Borra todo el progreso de la pokedex"
            @click="resetPokedexDB"
          >
            RESET POKEDEX
          </button>
          <button
            class="btn-vicio-secondary btn-vicio-sm"
            :class="{ active: ui.pvpAutoFillDisabled }"
            title="Desactivar el rellenado automático de equipo PVP"
            @click="ui.pvpAutoFillDisabled = !ui.pvpAutoFillDisabled"
          >
            {{ ui.pvpAutoFillDisabled ? 'HABILITAR AUTO-PVP' : 'DESHABILITAR AUTO-PVP' }}
          </button>
          <button
            class="btn-vicio-danger btn-vicio-sm"
            title="Limpia todos los slots del equipo PVP"
            @click="clearPvpTeam"
          >
            LIMPIAR EQUIPO PVP
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
  font-size: 8px;
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

// Global button overrides if specific spacing is needed
.button-row {
  display: flex;
  gap: 8px;
  
  &.wrap { flex-wrap: wrap; }
  
  button {
    flex: 1;
    min-width: 100px;
  }
}
</style>
