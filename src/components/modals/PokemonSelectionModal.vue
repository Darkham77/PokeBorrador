<script setup>
import { ref, computed, watch } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { useBattleVisuals } from '@/composables/useBattleVisuals'
import { useModalStore } from '@/stores/modals'
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
  autoConfirm: { type: Boolean, default: true },
  callbackConfirm: { type: Function, default: null },
  onConfirm: { type: Function, default: null },
  // Battle context props
  isBattleSwitch: { type: Boolean, default: false },
  battleMode: { type: String, default: null }, // 'wild', 'pvp', 'war'
  activePokemonUid: { type: String, default: null },
  preventClose: { type: Boolean, default: false },
  allowDead: { type: Boolean, default: false },
  // Filter by specific unique IDs (used for item application)
  allowedIds: { type: Array, default: () => [] },
  isItemContext: { type: Boolean, default: false }
})

const { _getHpColor } = useBattleVisuals()

let savedFilters = {}
try {
  savedFilters = JSON.parse(localStorage.getItem('pv_selection_filters') || '{}')
} catch (e) {
  console.warn('[PokemonSelectionModal] Error loading filters:', e)
}

const searchQuery = ref(savedFilters.searchQuery || '')
const sortBy = ref(savedFilters.sortBy || 'recent') // 'recent', 'level', 'ivs', 'total'
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

const getPokemonTotalPower = (p) => {
  if (!p) return 0;
  const base = pokemonDataProvider.getPokemonData(p.id);
  const s = base?.stats || base || {}
  const TOT = (s.hp || 0) + (s.atk || 0) + (s.def || 0) + (s.spa || 0) + (s.spd || 0) + (s.spe || 0)
  const ivs = p.ivs || {}
  const totalIvs = (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0)
  return TOT + totalIvs
}

const availablePokemon = computed(() => {
  const box = gameStore.state.box || []
  const team = gameStore.state.team || []
  
  let sourceList;
  
  if (props.battleMode === 'pvp') {
    const pvpUids = gameStore.state.pvpTeam || []
    const allPokes = [...team, ...box]
    sourceList = allPokes
      .filter(p => pvpUids.includes(p.uid))
      .map(p => ({ 
        pokemon: p, 
        _source: team.some(tp => tp.uid === p.uid) ? 'team' : 'box',
        index: pvpUids.indexOf(p.uid) 
      }))
  } else if (props.battleMode === 'war') {
    const warUids = gameStore.state.warTeam || []
    const allPokes = [...team, ...box]
    sourceList = allPokes
      .filter(p => warUids.includes(p.uid))
      .map(p => ({ 
        pokemon: p, 
        _source: team.some(tp => tp.uid === p.uid) ? 'team' : 'box',
        index: warUids.indexOf(p.uid)
      }))
  } else if (props.battleMode === 'wild' || props.isBattleSwitch) {
    sourceList = team.map((p, i) => ({ pokemon: p, _source: 'team', index: i }))
  } else {
    sourceList = props.includeTeam !== false
      ? [
          ...team.map((p, i) => ({ pokemon: p, _source: 'team', index: i })),
          ...box.map((p, i) => ({ pokemon: p, _source: 'box', index: i }))
        ]
      : box.map((p, i) => ({ pokemon: p, _source: 'box', index: i }))
  }

  let filtered = sourceList.filter(item => {
    const p = item.pokemon
    if (!p) return false
    if (p.onMission || p.inDaycare) return false
    if (props.isBattleSwitch && props.activePokemonUid === p.uid) return false
    if (props.isBattleSwitch && p.hp <= 0 && !props.allowDead) return false
    
    // Filter by specific allowed IDs
    if (props.allowedIds && props.allowedIds.length > 0 && !props.allowedIds.includes(p.uid)) return false
    
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      const matchName = p.name?.toLowerCase().includes(q)
      const matchNick = p.nickname?.toLowerCase().includes(q)
      const matchId = String(p.id).includes(q)
      if (!matchName && !matchNick && !matchId) return false
    }

    if (props.excludeUids && props.excludeUids.includes(p.uid)) return false
    
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
    } else if (sortBy.value === 'TOT') {
      valA = getPokemonTotalPower(pA)
      valB = getPokemonTotalPower(pB)
    } else {
      valA = pA.obtainedAt || ((a._source === 'box' ? 1000 : 0) + a.index)
      valB = pB.obtainedAt || ((b._source === 'box' ? 1000 : 0) + b.index)
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
    const maxSelect = props.maxSelect || 1
    if (selectedUids.value.length < maxSelect) {
      selectedUids.value.push(uid)
    } else if (maxSelect === 1) {
      selectedUids.value = [uid]
    }
  }

  if (props.autoConfirm && selectedUids.value.length >= (props.minSelect || 1)) {
    confirm()
  }
}

function confirm() {
  const minSelect = props.minSelect || 1
  if (selectedUids.value.length < minSelect) return
  
  const selectedObjects = selectedUids.value.map(uid => {
    const item = availablePokemon.value.find(it => it.pokemon.uid === uid)
    return item ? item.pokemon : null
  }).filter(Boolean)
  
  const cb = props.callbackConfirm || props.onConfirm
  if (typeof cb === 'function') {
    cb(selectedObjects)
  }
  forceClose()
}

function close() {
  if (props.preventClose) return
  forceClose()
}

function forceClose() {
  useModalStore().close('BattleSwitch')
  useModalStore().close('PokemonSelection')
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
    :title="props.title"
    max-width="650px"
    variant="retro"
    padding="raw"
    :prevent-close="preventClose"
    :show-close-button="!preventClose"
    @close="close"
  >
    <template #header>
      <div class="ps-header-content">
        <h2 class="ps-modal-title">
          {{ props.title }}
        </h2>
        <div class="ps-search-box-header">
          <span class="ps-header-search-icon">🔍</span>
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Buscar..."
            class="ps-search-input-header"
          >
          <button
            v-if="searchQuery"
            class="ps-header-clear-search"
            @click.stop="searchQuery = ''"
          >
            ✕
          </button>
        </div>
      </div>
    </template>

    <div class="selection-container">
      <div class="filters-bar">
        <div class="ps-sort-btns">
          <PVTooltip
            title="MÁS RECIENTES"
            description="Orden cronológico de captura."
            position="bottom"
            class="ps-sort-wrapper"
          >
            <button
              :class="{ active: sortBy === 'recent' }"
              @click.stop="setSort('recent')"
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
              @click.stop="setSort('level')"
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
              @click.stop="setSort('ivs')"
            >
              IVs {{ sortBy === 'ivs' ? (sortOrder === 'desc' ? '▼' : '▲') : '' }}
            </button>
          </PVTooltip>
          <PVTooltip
            title="PODER TOTAL"
            description="Suma de estadísticas base e IVs individuales."
            position="bottom"
            class="ps-sort-wrapper"
          >
            <button
              :class="{ active: sortBy === 'TOT' }"
              @click.stop="setSort('TOT')"
            >
              TOTAL {{ sortBy === 'TOT' ? (sortOrder === 'desc' ? '▼' : '▲') : '' }}
            </button>
          </PVTooltip>
        </div>

        <div class="ps-tags-section">
          <div class="ps-tags-row-unified">
            <span class="ps-section-label">ETIQUETAS:</span>
            
            <PVTooltip
              title="LIMPIAR FILTROS"
              description="Resetear búsqueda, orden y etiquetas."
            >
              <button
                v-if="activeTags.length > 0 || searchQuery || sortBy !== 'recent'"
                class="ps-clear-icon-btn"
                @click.stop="clearFilters"
              >
                🧹
              </button>
            </PVTooltip>

            <div class="ps-tags-list-horizontal">
              <PVTooltip 
                v-for="t in POKEMON_TAGS" 
                :key="t.id"
                :title="t.label" 
                :description="t.desc" 
                position="bottom"
              >
                <button
                  :class="{ active: activeTags.includes(t.id) }"
                  @click.stop="toggleTagFilter(t.id)"
                >
                  <span class="icon">{{ t.icon }}</span>
                  <span class="ps-tag-label">{{ t.shortLabel || t.label }}</span>
                </button>
              </PVTooltip>
              
              <PVTooltip 
                :title="POKEMON_BADGES.shiny.label" 
                :description="POKEMON_BADGES.shiny.desc" 
                position="bottom"
              >
                <button
                  :class="{ active: activeTags.includes('shiny') }"
                  @click.stop="toggleTagFilter('shiny')"
                >
                  <span class="icon">{{ POKEMON_BADGES.shiny.icon }}</span>
                  <span class="ps-tag-label">{{ POKEMON_BADGES.shiny.shortLabel }}</span>
                </button>
              </PVTooltip>
            </div>
          </div>
        </div>
      </div>

      <div class="ps-vertical-list scrollable-content">
        <PokemonSelectionItem
          v-for="item in availablePokemon" 
          :key="item.pokemon.uid"
          :item="item"
          :is-selected="selectedUids.includes(item.pokemon.uid)"
          :total="getPokemonTotalPower(item.pokemon)"
          :is-battle-context="props.isBattleSwitch || props.isItemContext || (props.allowedIds && props.allowedIds.length > 0)"
          :auto-confirm="props.autoConfirm"
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

    <template 
      v-if="!props.autoConfirm"
      #footer
    >
      <div class="modal-footer">
        <div class="count">
          {{ selectedUids.length }} / {{ props.maxSelect || 1 }} SELECCIONADOS
        </div>
        <button 
          class="btn-confirm" 
          :disabled="selectedUids.length < (props.minSelect || 1)"
          @click.stop="confirm"
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
