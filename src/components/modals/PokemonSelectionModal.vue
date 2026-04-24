<script setup>
import { ref, computed, watch } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { PDEX_TYPE_COLORS } from '@/logic/pokedexConstants'
import BaseModal from '@/components/common/BaseModal.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { POKEMON_TAGS, POKEMON_BADGES, hasPokemonTag } from '@/logic/constants/tags'
import { ASSET_TYPES, getAssetUrl } from '@/logic/services/assetService'

const uiStore = useUIStore()
const gameStore = useGameStore()
const isOpen = ref(false)

const config = computed(() => {
  const base = { ...uiStore.pokemonSelectionConfig }
  return {
    ...base,
    title: base.title || 'SELECCIONAR POKÉMON',
    subtitle: base.subtitle,
    excludeUids: base.excludeUids,
    onConfirm: base.callbackConfirm || base.onConfirm
  }
})

const savedFilters = JSON.parse(localStorage.getItem('pv_selection_filters') || '{}')
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
      const matchId = String(p.id).includes(q)
      if (!matchName && !matchId) return false
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
      return sortOrder.value === 'desc' ? -1 : 1
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
  const minSelect = config.value.minSelect || 1
  if (selectedUids.value.length < minSelect) return
  
  const selectedObjects = selectedUids.value.map(uid => {
    const item = availablePokemon.value.find(it => it.pokemon.uid === uid)
    return item ? item.pokemon : null
  }).filter(Boolean)
  
  const cb = config.value.onConfirm
  if (typeof cb === 'function') {
    cb(selectedObjects)
  }
  close()
}

function close() {
  uiStore.close('PokemonSelection')
  uiStore.pokemonSelectionConfig = {}
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

const getTypeColor = (type) => PDEX_TYPE_COLORS[type?.toLowerCase()] || '#aaa'

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
          <button
            v-if="searchQuery"
            class="clear-search"
            @click="searchQuery = ''"
          >
            ✕
          </button>
        </div>
        
        <div class="sort-btns">
          <PVTooltip
            title="MÁS RECIENTES"
            description="Orden cronológico de captura."
            position="bottom"
            class="sort-wrapper"
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
            class="sort-wrapper"
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
            class="sort-wrapper"
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
            class="sort-wrapper"
          >
            <button
              :class="{ active: sortBy === 'bst' }"
              @click="setSort('bst')"
            >
              BST {{ sortBy === 'bst' ? (sortOrder === 'desc' ? '▼' : '▲') : '' }}
            </button>
          </PVTooltip>
        </div>

        <div class="tags-section">
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
          <div class="tags-bar">
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

      <div class="vertical-list scrollable-content">
        <div 
          v-for="item in availablePokemon" 
          :key="item.pokemon.uid"
          class="list-item"
          :class="{ selected: selectedUids.includes(item.pokemon.uid) }"
          :style="{ '--type-color': getTypeColor(item.pokemon.types?.[0] || item.pokemon.type) }"
          @click="toggleSelection(item)"
        >
          <div class="poke-preview-container">
            <PVTooltip
              title="DETALLES"
              description="Ver información completa de este Pokémon."
              position="top"
              class="poke-preview"
              @click.stop="openDetail(item)"
            >
              <div class="preview-bg" />
              <img
                :src="getAssetUrl(ASSET_TYPES.POKEMON, item.pokemon.id, { isShiny: item.pokemon.isShiny })"
                alt=""
                class="pixelated"
                @error="e => e.target.style.display = 'none'"
              >
              <span
                v-if="item.pokemon.isShiny"
                class="shiny-star"
              >✨</span>
            </PVTooltip>

            <!-- Action badges (Held Item + Tags) -->
            <div
              v-if="item.pokemon.heldItem || item.pokemon.tags?.length"
              class="mini-badges"
            >
              <PVTooltip
                v-if="item.pokemon.heldItem"
                :title="POKEMON_BADGES.heldItem.label"
                :description="`${POKEMON_BADGES.heldItem.desc} (${item.pokemon.heldItem})`"
                position="top"
              >
                <span class="mini-icon">{{ POKEMON_BADGES.heldItem.icon }}</span>
              </PVTooltip>

              <template
                v-for="t in POKEMON_TAGS"
                :key="t.id"
              >
                <PVTooltip
                  v-if="hasPokemonTag(item.pokemon, t.id)"
                  :title="t.label"
                  :description="t.desc"
                  position="top"
                >
                  <span class="mini-icon">{{ t.icon }}</span>
                </PVTooltip>
              </template>
            </div>
          </div>

          <div class="poke-details">
            <div class="top-line">
              <div class="name-group">
                <span class="name">{{ item.pokemon.name?.replace(/[♂♀]/g, '').trim() || 'Desconocido' }}</span>
                <span
                  v-if="item.pokemon.gender"
                  :class="['gender-icon', item.pokemon.gender === 'M' ? 'male' : 'female']"
                >
                  {{ item.pokemon.gender === 'M' ? '♂' : '♀' }}
                </span>
              </div>
              <div class="actions-right">
                <span class="lvl">Nv.{{ item.pokemon.level ?? 1 }}</span>
              </div>
            </div>
            <div class="bottom-line">
              <div class="types-row">
                <span 
                  v-for="t in item.pokemon.types || [item.pokemon.type]" 
                  :key="t"
                  class="type-pill"
                  :style="{ background: getTypeColor(t) }"
                >
                  {{ t?.toUpperCase() }}
                </span>
              </div>
              <div class="stats-summary">
                <span
                  v-if="item.pokemon.ivs"
                  class="stat-badge ivs"
                >IVs: {{ Object.values(item.pokemon.ivs).reduce((s,v)=>s+(v||0),0) }}</span>
                <span class="stat-badge bst">BST: {{ getPokemonBst(item.pokemon) }}</span>
              </div>
              <span
                class="source-tag"
                :class="item._source"
              >{{ item._source === 'team' ? 'EQUIPO' : 'CAJA' }}</span>
            </div>
          </div>

          <div class="selection-indicator">
            <div class="check-circle">
              <span v-if="selectedUids.includes(item.pokemon.uid)">✓</span>
            </div>
          </div>
        </div>

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
