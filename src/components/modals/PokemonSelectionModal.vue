<script setup>
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

// const uiStore = useUIStore()
const gameStore = useGameStore()

// Props/Configuración del modal
const config = ref({
  title: 'SELECCIONAR POKÉMON',
  subtitle: 'Elige un Pokémon para la tarea.',
  maxSelect: 1,
  minSelect: 1,
  typeFilter: null,
  onConfirm: null,
  context: 'generic', // 'rocket', 'breeder', 'event'
  includeTeam: true
})

const isOpen = ref(false)
const selectedUids = ref([]) // use UID instead of array index

// Búsqueda y filtrado
const searchQuery = ref('')

const availablePokemon = computed(() => {
  const box = gameStore.state.box || []
  const team = gameStore.state.team || []
  
  let sourceList;
  if (config.value.includeTeam) {
    sourceList = [
      ...team.map(p => ({ ...p, _source: 'team' })),
      ...box.map(p => ({ ...p, _source: 'box' }))
    ]
  } else {
    sourceList = box.map(p => ({ ...p, _source: 'box' }))
  }

  return sourceList.filter(p => {
    // Básicos: No en misión ni en guardería
    if (p.onMission || p.inDaycare) return false
    
    // Filtro de búsqueda
    if (searchQuery.value && !p.name.toLowerCase().includes(searchQuery.value.toLowerCase()) && !p.id.toLowerCase().includes(searchQuery.value.toLowerCase())) return false
    
    // Filtro de tipo
    if (config.value.typeFilter) {
      if (p.type !== config.value.typeFilter && p.type2 !== config.value.typeFilter) return false
    }
    
    return true
  })
})

function toggleSelect(uid) {
  const sIdx = selectedUids.value.indexOf(uid)
  if (sIdx > -1) {
    selectedUids.value.splice(sIdx, 1)
  } else {
    if (selectedUids.value.length < config.value.maxSelect) {
      selectedUids.value.push(uid)
    } else if (config.value.maxSelect === 1) {
      selectedUids.value = [uid]
    }
  }
}

function confirm() {
  if (selectedUids.value.length < config.value.minSelect) return
  // Find the actual pokemon objects
  const selectedObjects = selectedUids.value.map(uid => availablePokemon.value.find(p => p.uid === uid)).filter(Boolean)
  
  if (config.value.onConfirm) config.value.onConfirm(selectedObjects)
  close()
}

function close() {
  isOpen.value = false
  selectedUids.value = []
}

// Exponer para abrir desde cualquier lado
window._openPokemonSelectionModal = (opts) => {
  config.value = { ...config.value, ...opts }
  selectedUids.value = []
  isOpen.value = true
}

function getProjectedValue(p) {
  const totalIvs = Object.values(p.ivs || {}).reduce((a, b) => a + (b || 0), 0)
  return 1000 + ((p.level || 1) * 100) + (totalIvs * 25)
}
</script>

<template>
  <Transition name="fade">
    <div
      v-if="isOpen"
      class="modal-overlay"
      @click.self="close"
    >
      <div
        class="modal-container"
        :class="config.context"
      >
        <header class="modal-header">
          <div class="header-info">
            <h2 class="press-start">
              {{ config.title }}
            </h2>
            <p class="subtitle">
              {{ config.subtitle }}
            </p>
          </div>
          <button
            class="close-btn"
            @click="close"
          >
            ✕
          </button>
        </header>

        <div class="search-bar">
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Buscar por nombre o ID..."
            class="search-input"
          >
        </div>

        <div class="pokemon-grid">
          <div 
            v-for="p in availablePokemon" 
            :key="p.uid"
            class="poke-card"
            :class="{ selected: selectedUids.includes(p.uid) }"
            @click="toggleSelect(p.uid)"
          >
            <div class="card-header">
              <span class="lvl">Nv.{{ p.level }}</span>
              <span
                v-if="p.isShiny"
                class="shiny"
              >✨</span>
              <span
                class="source-badge"
                :class="p._source"
              >
                {{ p._source === 'team' ? 'Equipo' : 'PC' }}
              </span>
            </div>
            
            <div class="poke-sprite">
              <img
                :src="getAssetUrl(ASSET_TYPES.POKEMON, p.id, { isShiny: p.isShiny })"
                alt=""
              >
            </div>

            <div class="poke-info">
              <span class="name">{{ p.name }}</span>
              <div class="iv-total">
                IVs: {{ Object.values(p.ivs || {}).reduce((a, b) => a + (b || 0), 0) }}
              </div>
              
              <div
                v-if="config.context === 'rocket'"
                class="projected-value"
              >
                ₽{{ getProjectedValue(p).toLocaleString() }}
              </div>
            </div>

            <div class="selection-indicator">
              <div class="checkbox">
                <span v-if="selectedUids.includes(p.uid)">✓</span>
              </div>
            </div>
          </div>

          <div
            v-if="availablePokemon.length === 0"
            class="empty-msg"
          >
            No se encontraron Pokémon disponibles con estos filtros.
          </div>
        </div>

        <footer class="modal-footer">
          <div class="selection-info">
            Seleccionados: {{ selectedUids.length }} / {{ config.maxSelect }}
          </div>
          <button 
            class="confirm-btn" 
            :disabled="selectedUids.length < config.minSelect"
            @click="confirm"
          >
            CONFIRMAR SELECCIÓN
          </button>
        </footer>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 9800;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  backdrop-filter: blur(8px);
}

.modal-container {
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  width: 100%;
  max-width: 500px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

.modal-container.rocket { border-color: #ef444466; box-shadow: 0 0 30px #ef444422; }

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.press-start {
  font-family: 'Press Start 2P', cursive;
  font-size: 12px;
  color: #fff;
  margin: 0;
}

.subtitle {
  font-size: 11px;
  color: #94a3b8;
  margin: 6px 0 0 0;
}

.close-btn {
  background: none;
  border: none;
  color: #64748b;
  font-size: 20px;
  cursor: pointer;
}

.search-bar {
  padding: 16px 24px;
}

.search-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px 16px;
  color: #fff;
  font-size: 13px;
}

.pokemon-grid {
  flex: 1;
  overflow-y: auto;
  padding: 0 24px 24px 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 12px;
}

.poke-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.poke-card:hover { border-color: rgba(255, 255, 255, 0.2); transform: translateY(-2px); }
.poke-card.selected { background: rgba(59, 130, 246, 0.1); border-color: #3b82f6; }
.rocket .poke-card.selected { background: rgba(239, 68, 68, 0.1); border-color: #ef4444; }

.card-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #64748b;
  margin-bottom: 4px;
}

.source-badge {
  font-size: 7px;
  padding: 2px 4px;
  border-radius: 4px;
  margin-left: auto;
  text-transform: uppercase;
  &.team { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
  &.box { background: rgba(255, 255, 255, 0.05); color: #888; }
}

.poke-sprite img {
  width: 64px;
  height: 64px;
  image-rendering: pixelated;
}

.poke-info {
  text-align: center;
  margin-top: 4px;
}

.name {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 110px;
}

.iv-total { font-size: 9px; color: #64748b; margin-top: 2px; }

.projected-value {
  font-size: 10px;
  color: #22c55e;
  font-weight: 800;
  margin-top: 4px;
}

.selection-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
}

.checkbox {
  width: 18px;
  height: 18px;
  border: 1.5px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #fff;
}

.selected .checkbox { background: #3b82f6; border-color: #3b82f6; }
.rocket .selected .checkbox { background: #ef4444; border-color: #ef4444; }

.modal-footer {
  padding: 20px 24px;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.selection-info {
  font-size: 11px;
  color: #94a3b8;
  text-align: center;
}

.confirm-btn {
  background: #3b82f6;
  border: none;
  color: #fff;
  padding: 14px;
  border-radius: 12px;
  font-family: 'Press Start 2P', cursive;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 0 #1d4ed8;
}

.rocket .confirm-btn { background: #ef4444; box-shadow: 0 4px 0 #991b1b; }

.confirm-btn:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 6px 0 #1d4ed8; }
.rocket .confirm-btn:not(:disabled):hover { box-shadow: 0 6px 0 #991b1b; }

.confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

.empty-msg {
  grid-column: 1 / -1;
  padding: 40px;
  text-align: center;
  color: #64748b;
  font-size: 12px;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
