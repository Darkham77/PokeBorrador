<script setup>
import { ref, computed, watch } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import BaseModal from '@/components/common/BaseModal.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { POKEMON_TAGS, POKEMON_BADGES, hasPokemonTag } from '@/logic/constants/tags'
import PokemonSelectionItem from './PokemonSelectionItem.vue'

const uiStore = useUIStore()
const gameStore = useGameStore()
const props = defineProps({
  title: { type: String, default: 'SELECCIONAR POKÉMON' },
  subtitle: { type: String, default: '' },
  excludeUids: { type: Array, default: () => [] },
  includeTeam: { type: Boolean, default: true },
  multi: { type: Boolean, default: false },
  maxSelect: { type: Number, default: 1 },
  minSelect: { type: Number, default: 1 },
  autoConfirm: { type: Boolean, default: false },
  callbackConfirm: { type: Function, default: null },
  onConfirm: { type: Function, default: null }
})

const config = computed(() => {
  return {
    ...props,
    onConfirm: props.callbackConfirm || props.onConfirm
  }
})

let savedFilters = {}
try {
  savedFilters = JSON.parse(localStorage.getItem('pv_selection_filters') || '{}')
} catch (e) {
  console.warn('[PokemonSelectionModal] Error loading filters:', e)
}

const searchQuery = ref(savedFilters.searchQuery || '')
const sortBy = ref(savedFilters.sortBy || 'recent') // 'recent', 'level', 'ivs', 'bst'
const sortOrder = ref(savedFilters.sortOrder || 'desc')
const activeTags = ref(Array.isArray(savedFilters.activeTags) ? savedFilters.activeTags : [])
const selectedUids = ref([])

// Persist filters
watch([sortBy, sortOrder, activeTags, searchQuery], () => {
  localStorage.setItem('pv_selection_filters', JSON.stringify({
    sortBy: sortBy.value,
    sortOrder: sortOrder.value,
    activeTags: activeTags.value,
    searchQuery: searchQuery.value
  }))
}, { deep: true })

const availablePokemon = computed(() => {
  const box = gameStore.state.box || []
  const team = gameStore.state.team || []
  
  const sourceList = config.value.includeTeam !== false
    ? [
        ...team.map((p, i) => ({ pokemon: p, _source: 'team', index: i })),
        ...box.map((p, i) => ({ pokemon: p, _source: 'box', index: i }))
      ]
    : box.map((p, i) => ({ pokemon: p, _source: 'box', index: i }))

  // Filter
  let filtered = sourceList.filter(item => {
    const p = item.pokemon
    if (!p) return false
    if (p.onMission || p.inDaycare) return false
    
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      const matchName = p.name?.toLowerCase().includes(q)
      const matchNick = p.nickname?.toLowerCase().includes(q)
      const matchId = String(p.id).includes(q)
      if (!matchName && !matchNick && !matchId) return false
    }

    if (config.value.excludeUids && config.value.excludeUids.includes(p.uid)) return false
    
    // Tags Filter
    if (activeTags.value.length > 0) {
      if (!activeTags.value.every(tag => {
        if (tag === 'shiny') return p.isShiny
        if (tag === 'team') return item._source === 'team'
        if (tag === 'box') return item._source === 'box'
        return hasPokemonTag(p, tag)
      })) return false
    }

    return true
  })

  // Sort
  return filtered.sort((a, b) => {
    const pA = a.pokemon
    const pB = b.pokemon
    let valA, valB

    if (sortBy.value === 'level') {
      valA = pA.level || 0
      valB = pB.level || 0
    } else if (sortBy.value === 'ivs') {
      const sum = (ivs) => Object.values(ivs || {}).reduce((s, v) => s + (v || 0), 0)
      valA = sum(pA.ivs)
      valB = sum(pB.ivs)
    } else if (sortBy.value === 'bst') {
      valA = getPokemonBst(pA)
      valB = getPokemonBst(pB)
    } else {
      // Recent (usar el orden original invertido o no)
      // Damos prioridad a los de la caja como "más recientes" si se concatenan después
      valA = (a._source === 'box' ? 1000 : 0) + a.index
      valB = (b._source === 'box' ? 1000 : 0) + b.index
    }

    if (valA === valB) {
      return sortOrder.value === 'desc' 
        ? b.pokemon.uid.localeCompare(a.pokemon.uid) 
        : a.pokemon.uid.localeCompare(b.pokemon.uid)
    }
    return sortOrder.value === 'desc' ? valB - valA : valA - valB
  })
})

function toggleSelection(item) {
  const uid = item.pokemon.uid
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
  console.log('[DEBUG] PokemonSelection: confirm called', { selectedUids: selectedUids.value })
  const minSelect = config.value.minSelect || 1
  if (selectedUids.value.length < minSelect) {
    console.warn('[DEBUG] PokemonSelection: Not enough items selected')
    return
  }
  
  const selectedObjects = selectedUids.value.map(uid => {
    const item = availablePokemon.value.find(it => it.pokemon.uid === uid)
    return item ? item.pokemon : null
  }).filter(Boolean)
  
  console.log('[DEBUG] PokemonSelection: selectedObjects to emit:', selectedObjects)
  
  const cb = config.value.onConfirm
  if (typeof cb === 'function') {
    cb(selectedObjects)
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

function toggleTagFilter(tagId) {
  const idx = activeTags.value.indexOf(tagId)
  if (idx > -1) {
    activeTags.value.splice(idx, 1)
  } else {
    activeTags.value.push(tagId)
  }
}

function clearFilters() {
  searchQuery.value = ''
  sortBy.value = 'recent'
  sortOrder.value = 'desc'
  activeTags.value = []
}

const getPokemonBst = (p) => {
  const getSpeciesKey = (name) => {
    if (!name) return ''
    const n = name.toLowerCase()
    if (n.includes('♂')) return 'nidoran_m'
    if (n.includes('♀')) return 'nidoran_f'
    if (n.includes('mr.')) return 'mr_mime'
    return n.replace(/[^a-z0-9]/g, '')
  }
  const speciesKey = getSpeciesKey(p.name)
  const base = pokemonDataProvider.getPokemonData(speciesKey)
  const s = base?.stats || base || {}
  return (s.hp || 0) + (s.atk || 0) + (s.def || 0) + (s.spa || 0) + (s.spd || 0) + (s.spe || 0)
}


if (typeof window !== 'undefined') {
  window._openPokemonSelectionModal = (opts) => {
    uiStore.open('PokemonSelection', { 
      title: 'SELECCIONAR POKÉMON',
      subtitle: 'Elige un Pokémon para la tarea.',
      maxSelect: 1,
      minSelect: 1,
      ...opts 
    })
    selectedUids.value = []
  }
}

function openDetail(item) {
  uiStore.open('PokemonDetail', {
    pokemon: item.pokemon,
    index: item.index,
    context: item._source,
    extra: { source: 'selection' }
  })
}
</script>

<template>
  <BaseModal
    show
    :title="config.title"
    max-width="650px"
    variant="retro"
    padding="raw"
    no-scroll
    @close="close"
  >
    <div class="selection-container">
      <div class="filters-bar">
        <div class="ps-search-box">
          <span class="search-icon">🔍</span>
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Buscar por nombre o ID..."
            class="ps-search-input"
          >
          <button
            v-if="searchQuery"
            class="clear-search"
            @click="searchQuery = ''"
          >
            ✕
          </button>
        </div>
        
        <div class="ps-sort-btns">
          <PVTooltip
            title="MÁS RECIENTES"
            description="Orden cronológico de captura."
            position="bottom"
            class="ps-sort-wrapper"
          >
            <button
              :class="{ active: sortBy === 'recent' }"
              @click="setSort('recent')"
            >
              REC {{ sortBy === 'recent' ? (sortOrder === 'desc' ? '▼' : '▲') : '' }}
            </button>
          </PVTooltip>
          <PVTooltip
            title="NIVEL"
            description="Orden por nivel de combate."
            position="bottom"
            class="ps-sort-wrapper"
          >
            <button
              :class="{ active: sortBy === 'level' }"
              @click="setSort('level')"
            >
              LVL {{ sortBy === 'level' ? (sortOrder === 'desc' ? '▼' : '▲') : '' }}
            </button>
          </PVTooltip>
          <PVTooltip
            title="IVs"
            description="Potencial genético total."
            position="bottom"
            class="ps-sort-wrapper"
          >
            <button
              :class="{ active: sortBy === 'ivs' }"
              @click="setSort('ivs')"
            >
              IVs {{ sortBy === 'ivs' ? (sortOrder === 'desc' ? '▼' : '▲') : '' }}
            </button>
          </PVTooltip>
          <PVTooltip
            title="BST"
            description="Poder base de la especie."
            position="bottom"
            class="ps-sort-wrapper"
          >
            <button
              :class="{ active: sortBy === 'bst' }"
              @click="setSort('bst')"
            >
              BST {{ sortBy === 'bst' ? (sortOrder === 'desc' ? '▼' : '▲') : '' }}
            </button>
          </PVTooltip>
        </div>

        <div class="ps-tags-section">
          <div class="section-header">
            <span class="section-label">ETIQUETAS:</span>
            <button
              v-if="activeTags.length > 0 || searchQuery || sortBy !== 'recent'"
              class="clear-all-btn"
              @click="clearFilters"
            >
              LIMPIAR FILTROS
            </button>
          </div>
          <div class="ps-tags-bar">
            <PVTooltip 
              v-for="t in POKEMON_TAGS" 
              :key="t.id"
              :title="t.label" 
              :description="t.desc" 
              position="bottom"
            >
              <button
                :class="{ active: activeTags.includes(t.id) }"
                @click="toggleTagFilter(t.id)"
              >
                <span class="icon">{{ t.icon }}</span>
                <span class="label">{{ t.shortLabel || t.label }}</span>
              </button>
            </PVTooltip>
            
            <PVTooltip 
              :title="POKEMON_BADGES.shiny.label" 
              :description="POKEMON_BADGES.shiny.desc" 
              position="bottom"
            >
              <button
                :class="{ active: activeTags.includes('shiny') }"
                @click="toggleTagFilter('shiny')"
              >
                <span class="icon">{{ POKEMON_BADGES.shiny.icon }}</span>
                <span class="label">{{ POKEMON_BADGES.shiny.shortLabel }}</span>
              </button>
            </PVTooltip>
            <PVTooltip
              title="EQUIPO"
              description="Pokémon de tu equipo actual."
              position="bottom"
            >
              <button
                :class="{ active: activeTags.includes('team') }"
                @click="toggleTagFilter('team')"
              >
                <span class="icon">🎒</span>
                <span class="label">TEAM</span>
              </button>
            </PVTooltip>
          </div>
        </div>
      </div>

      <div class="ps-vertical-list scrollable-content">
        <PokemonSelectionItem
          v-for="item in availablePokemon" 
          :key="item.pokemon.uid"
          :item="item"
          :is-selected="selectedUids.includes(item.pokemon.uid)"
          :bst="getPokemonBst(item.pokemon)"
          @select="toggleSelection"
          @open-detail="openDetail"
        />

        <div 
          v-if="availablePokemon.length === 0"
          class="empty-state"
        >
          No se encontraron Pokémon disponibles.
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
