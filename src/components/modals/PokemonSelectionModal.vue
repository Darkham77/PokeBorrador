<script setup>
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { PDEX_TYPE_COLORS } from '@/logic/pokedexConstants'
import BaseModal from '@/components/common/BaseModal.vue'

const uiStore = useUIStore()
const gameStore = useGameStore()

const props = defineProps({
  title: { type: String, default: null },
  subtitle: { type: String, default: null },
  excludeUids: { type: Array, default: null },
  onConfirm: { type: Function, default: null }, // Mantener por compatibilidad pero usar interna
  callbackConfirm: { type: Function, default: null }, // Nuevo nombre para evitar colisiones
  maxSelect: { type: Number, default: 1 },
  minSelect: { type: Number, default: 1 },
  includeTeam: { type: Boolean, default: true },
  typeFilter: { type: String, default: null }
})

// Props/Configuración del modal (vía props o uiStore para compatibilidad legacy)
const config = computed(() => {
  const base = { ...uiStore.pokemonSelectionConfig }
  return {
    ...base,
    title: props.title || base.title,
    subtitle: props.subtitle || base.subtitle,
    excludeUids: props.excludeUids || base.excludeUids,
    // Priorizar la función que venga de cualquier lado
    onConfirm: props.callbackConfirm || props.onConfirm || base.onConfirm,
    maxSelect: props.maxSelect ?? base.maxSelect ?? 1,
    minSelect: props.minSelect ?? base.minSelect ?? 1,
    includeTeam: props.includeTeam ?? base.includeTeam ?? true,
    typeFilter: props.typeFilter || base.typeFilter
  }
})

const isOpen = ref(true)

const selectedUids = ref([])
const sortBy = ref('recent')
const sortOrder = ref('desc')

const searchQuery = ref('')

const availablePokemon = computed(() => {
  const box = gameStore.state.box || []
  const team = gameStore.state.team || []
  
  let sourceList;
  if (config.value.includeTeam !== false) {
    sourceList = [
      ...team.map(p => ({ ...p, _source: 'team' })),
      ...box.map(p => ({ ...p, _source: 'box' }))
    ]
  } else {
    sourceList = box.map(p => ({ ...p, _source: 'box' }))
  }

  // Filter
  let filtered = sourceList.filter(p => {
    if (p.onMission || p.inDaycare) return false
    
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      if (!p.name.toLowerCase().includes(q) && !p.id.toLowerCase().includes(q)) return false
    }
    
    if (config.value.typeFilter) {
      if (p.type !== config.value.typeFilter && p.type2 !== config.value.typeFilter) return false
    }

    if (config.value.excludeUids && config.value.excludeUids.includes(p.uid)) return false
    
    return true
  })

  // Sort
  return filtered.sort((a, b) => {
    let valA, valB
    if (sortBy.value === 'level') {
      valA = a.level
      valB = b.level
    } else if (sortBy.value === 'ivs') {
      valA = Object.values(a.ivs || {}).reduce((sum, v) => sum + (v || 0), 0)
      valB = Object.values(b.ivs || {}).reduce((sum, v) => sum + (v || 0), 0)
    } else {
      return sortOrder.value === 'desc' ? -1 : 1
    }

    if (sortOrder.value === 'desc') return valB - valA
    return valA - valB
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
  
  const selectedObjects = selectedUids.value.map(uid => availablePokemon.value.find(p => p.uid === uid)).filter(Boolean)
  
  const cb = config.value.onConfirm
  if (typeof cb === 'function') {
    cb(selectedObjects)
  } else {
    console.error('[PokemonSelection] Callback confirm is not a function:', cb)
  }
  close()
}

function close() {
  uiStore.close('PokemonSelection')
}

function setSort(type) {
  if (sortBy.value === type) {
    sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortBy.value = type
    sortOrder.value = 'desc'
  }
}

const getTypeColor = (type) => PDEX_TYPE_COLORS[type?.toLowerCase()] || '#aaa'

// Legacy bridge
if (typeof window !== 'undefined') {
  window._openPokemonSelectionModal = (opts) => {
    uiStore.pokemonSelectionConfig = { 
      title: 'SELECCIONAR POKÉMON',
      subtitle: 'Elige un Pokémon para la tarea.',
      maxSelect: 1,
      minSelect: 1,
      ...opts 
    }
    selectedUids.value = []
    isOpen.value = true
  }
}
</script>

<template>
  <BaseModal
    show
    :title="config.title || 'SELECCIÓN'"
    max-width="550px"
    variant="retro"
    @close="close"
  >
    <div class="selection-container">
      <div class="filters-bar">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Buscar por nombre o ID..."
            class="search-input"
          >
        </div>
        
        <div class="sort-btns">
          <button 
            :class="{ active: sortBy === 'level' }" 
            @click="setSort('level')"
          >
            LVL {{ sortBy === 'level' ? (sortOrder === 'desc' ? '▼' : '▲') : '' }}
          </button>
          <button 
            :class="{ active: sortBy === 'ivs' }" 
            @click="setSort('ivs')"
          >
            IVs {{ sortBy === 'ivs' ? (sortOrder === 'desc' ? '▼' : '▲') : '' }}
          </button>
          <button 
            :class="{ active: sortBy === 'recent' }" 
            @click="setSort('recent')"
          >
            REC
          </button>
        </div>
      </div>

      <div class="vertical-list">
        <div 
          v-for="p in availablePokemon" 
          :key="p.uid"
          class="list-item"
          :class="{ selected: selectedUids.includes(p.uid) }"
          @click="toggleSelect(p.uid)"
        >
          <div 
            class="poke-preview-container"
            :style="{ '--type-color': getTypeColor(p.type) }"
            title="Ver detalles"
            @click.stop="uiStore.openPokemonDetail(p, -1, p._source)"
          >
            <div class="poke-preview">
              <div class="preview-bg" />
              <img
                :src="getAssetUrl(ASSET_TYPES.POKEMON, p.id, { isShiny: p.isShiny })"
                alt=""
                class="pixelated"
                @error="e => e.target.style.display = 'none'"
              >
              <span
                v-if="p.isShiny"
                class="shiny-star"
              >✨</span>
            </div>
            <!-- Action badges (Held Item + Tags) -->
            <div
              v-if="p.heldItem || p.tags?.length"
              class="mini-badges"
            >
              <span
                v-if="p.heldItem"
                class="mini-icon"
                title="Objeto"
              >🎒</span>
              <span
                v-if="p.tags?.includes('fav')"
                class="mini-icon"
              >⭐</span>
              <span
                v-if="p.tags?.includes('breed')"
                class="mini-icon"
              >❤️</span>
              <span
                v-if="p.tags?.includes('iv31')"
                class="mini-icon"
              >31</span>
            </div>
          </div>

          <div class="poke-details">
            <div class="top-line">
              <div class="name-group">
                <span class="name">{{ p.name }}</span>
                <span
                  v-if="p.gender"
                  :class="['gender-icon', p.gender === 'M' ? 'male' : 'female']"
                >
                  {{ p.gender === 'M' ? '♂' : '♀' }}
                </span>
              </div>
              <div class="actions-right">
                <span class="lvl">Nv.{{ p.level }}</span>
              </div>
            </div>
            <div class="bottom-line">
              <div class="types-row">
                <span
                  class="type-badge"
                  :class="'type-' + p.type.toLowerCase()"
                >{{ p.type }}</span>
                <span
                  v-if="p.type2"
                  class="type-badge"
                  :class="'type-' + p.type2.toLowerCase()"
                >{{ p.type2 }}</span>
              </div>
              <span class="iv-summary">IVs: {{ Object.values(p.ivs || {}).reduce((s, v) => s + (v || 0), 0) }}</span>
              <span
                class="source-tag"
                :class="p._source"
              >{{ p._source === 'team' ? 'EQUIPO' : 'CAJA' }}</span>
            </div>
          </div>

          <div class="selection-indicator">
            <div class="check-circle">
              <span v-if="selectedUids.includes(p.uid)">✓</span>
            </div>
          </div>
        </div>

        <div
          v-if="availablePokemon.length === 0"
          class="empty-state"
        >
          No se encontraron Pokémon.
        </div>
      </div>
    </div>

    <template #footer>
      <div class="modal-footer">
        <div class="count">
          {{ selectedUids.length }} / {{ config.maxSelect || 1 }} SELECCIONADOS
        </div>
        <button 
          class="btn-confirm" 
          :disabled="selectedUids.length < (config.minSelect || 1)"
          @click="confirm"
        >
          CONFIRMAR
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<style lang="scss">
@use "@/styles/components/pokemon-selection";
</style>
