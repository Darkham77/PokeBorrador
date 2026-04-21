<script setup>
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import BaseModal from '@/components/common/BaseModal.vue'

const uiStore = useUIStore()
const gameStore = useGameStore()

// Props/Configuración del modal (vía uiStore)
const config = computed(() => uiStore.pokemonSelectionConfig || {})
const isOpen = computed({
  get: () => uiStore.isPokemonSelectionOpen,
  set: (val) => { uiStore.isPokemonSelectionOpen = val }
})

const selectedUids = ref([]) // use UID instead of array index

// Búsqueda y filtrado
const searchQuery = ref('')

const availablePokemon = computed(() => {
  const box = gameStore.state.box || []
  const team = gameStore.state.team || []
  
  let sourceList;
  if (config.value.includeTeam !== false) { // Default to true
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
    const maxSelect = config.value.maxSelect || 1
    if (selectedUids.value.length < maxSelect) {
      selectedUids.value.push(uid)
    } else if (maxSelect === 1) {
      selectedUids.value = [uid]
    }
  }
}

function confirm() {
  const minSelect = config.value.minSelect || 1
  if (selectedUids.value.length < minSelect) return
  
  // Find the actual pokemon objects
  const selectedObjects = selectedUids.value.map(uid => availablePokemon.value.find(p => p.uid === uid)).filter(Boolean)
  
  if (config.value.onConfirm) config.value.onConfirm(selectedObjects)
  close()
}

function close() {
  isOpen.value = false
  selectedUids.value = []
}

// Legacy bridge
if (typeof window !== 'undefined') {
  window._openPokemonSelectionModal = (opts) => {
    uiStore.pokemonSelectionConfig = { 
      title: 'SELECCIONAR POKÉMON',
      subtitle: 'Elige un Pokémon para la tarea.',
      maxSelect: 1,
      minSelect: 1,
      context: 'generic',
      ...opts 
    }
    selectedUids.value = []
    isOpen.value = true
  }
}

function getProjectedValue(p) {
  const totalIvs = Object.values(p.ivs || {}).reduce((a, b) => a + (b || 0), 0)
  return 1000 + ((p.level || 1) * 100) + (totalIvs * 25)
}
</script>

<template>
  <BaseModal
    :show="isOpen"
    :title="config.title || 'SELECCIÓN'"
    max-width="500px"
    variant="retro"
    @close="close"
  >
    <div
      class="pokemon-selection-inner"
      :class="config.context"
    >
      <p class="selection-help-text">
        {{ config.subtitle }}
      </p>

      <div class="search-section">
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
              class="shiny-icon"
            >✨</span>
            <span
              class="source-tag"
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
          No se encontraron Pokémon disponibles.
        </div>
      </div>
    </div>

    <template #footer>
      <div class="selection-footer">
        <div class="selection-count">
          Seleccionados: {{ selectedUids.length }} / {{ config.maxSelect || 1 }}
        </div>
        <button 
          class="confirm-btn-primary" 
          :disabled="selectedUids.length < (config.minSelect || 1)"
          @click="confirm"
        >
          CONFIRMAR SELECCIÓN
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.pokemon-selection-inner {
  padding: 8px 0;
}

.selection-help-text {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 20px;
  text-align: center;
}

.search-section {
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 14px 16px;
  color: #fff;
  font-size: 13px;
  outline: none;

  &:focus {
    border-color: var(--yellow);
    background: rgba(255, 255, 255, 0.06);
  }
}

.pokemon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 12px;
  max-height: 45vh;
  overflow-y: auto;
  min-height: 0;
  padding: 4px;
}

.poke-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;

  &:hover {
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.05);
  }

  &.selected {
    background: rgba(59, 130, 246, 0.1);
    border-color: #3b82f6;
    box-shadow: 0 0 15px rgba(59, 130, 246, 0.2);
  }
}

.rocket .poke-card.selected {
  background: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
  box-shadow: 0 0 15px rgba(239, 68, 68, 0.2);
}

.card-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 9px;
  font-family: 'Press Start 2P', monospace;
  color: rgba(255, 255, 255, 0.3);
  margin-bottom: 8px;
}

.lvl { color: #fff; }
.shiny-icon { color: var(--yellow); }

.source-tag {
  font-size: 7px;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: auto;
  text-transform: uppercase;
  font-family: sans-serif;
  font-weight: 900;

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
  margin-top: 8px;

  .name {
    display: block;
    font-size: 13px;
    font-weight: 800;
    color: #f8fafc;
    margin-bottom: 2px;
  }

  .iv-total { font-size: 9px; color: rgba(255, 255, 255, 0.3); }
}

.projected-value {
  font-size: 10px;
  color: #22c55e;
  font-weight: 800;
  margin-top: 6px;
  font-family: 'Press Start 2P', monospace;
}

.selection-indicator {
  position: absolute;
  top: 10px;
  right: 10px;
}

.checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  transition: all 0.2s;
}

.selected .checkbox {
  background: #3b82f6;
  border-color: #3b82f6;
}

.rocket .selected .checkbox {
  background: #ef4444;
  border-color: #ef4444;
}

.selection-footer {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.selection-count {
  font-size: 10px;
  font-family: 'Press Start 2P', monospace;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
}

.confirm-btn-primary {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: #fff;
  border: none;
  border-radius: 14px;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  font-weight: 900;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5);
    filter: Brightness(1.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }
}

.rocket .confirm-btn-primary {
  background: linear-gradient(135deg, #ef4444, #991b1b);
  box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);

  &:hover:not(:disabled) {
    box-shadow: 0 6px 20px rgba(239, 68, 68, 0.5);
  }
}

.empty-msg {
  grid-column: 1 / -1;
  padding: 60px 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.2);
  font-size: 11px;
  font-family: 'Press Start 2P', monospace;
}
</style>
