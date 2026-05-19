<script setup lang="ts">

import { ref, computed, watch } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'

import { useModalStore } from '@/stores/modals'
import { safeStorage } from '@/logic/utils/storage'
import BaseModal from '@/components/common/BaseModal.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { POKEMON_TAGS, POKEMON_BADGES, hasPokemonTag } from '@/logic/constants/tags'
import { logger } from '@/logic/utils/logger'
import PokemonSelectionItem from './PokemonSelectionItem.vue'
import type { Pokemon } from '@/types/pokemon'

const uiStore = useUIStore()
const gameStore = useGameStore()

interface Props {
  title?: string
  subtitle?: string
  excludeUids?: string[]
  includeTeam?: boolean
  multi?: boolean
  maxSelect?: number
  minSelect?: number
  autoConfirm?: boolean
  callbackConfirm?: ((selected: Pokemon[]) => void) | null
  onConfirm?: ((selected: Pokemon[]) => void) | null
  isBattleSwitch?: boolean
  battleMode?: string | null
  activePokemonUid?: string | null
  preventClose?: boolean
  allowDead?: boolean
  allowedIds?: string[]
  isItemContext?: boolean
  customList?: Pokemon[]
}

const props = withDefaults(defineProps<Props>(), {
  title: '⚡ SELECCIONAR POKÉMON',
  subtitle: '',
  excludeUids: () => [],
  includeTeam: true,
  multi: false,
  maxSelect: 1,
  minSelect: 1,
  autoConfirm: true,
  callbackConfirm: null,
  onConfirm: null,
  isBattleSwitch: false,
  battleMode: null,
  activePokemonUid: null,
  preventClose: false,
  allowDead: false,
  allowedIds: () => [],
  isItemContext: false,
  customList: () => []
})



interface SavedFilters {
  searchQuery?: string
  sortBy?: string
  sortOrder?: string
  activeTags?: string[]
}

let savedFilters: SavedFilters = {}
try {
  savedFilters = JSON.parse(safeStorage.getItem('pv_selection_filters') || '{}')
} catch (e) {
  logger.warn('PokemonSelectionModal', 'Error loading filters', e)
}

const searchQuery = ref(savedFilters.searchQuery || '')
const sortBy = ref(savedFilters.sortBy || 'recent') // 'recent', 'level', 'ivs', 'total'
const sortOrder = ref(savedFilters.sortOrder || 'desc')
const activeTags = ref<string[]>(Array.isArray(savedFilters.activeTags) ? savedFilters.activeTags : [])
const selectedUids = ref<string[]>([])

// Persist filters
watch([sortBy, sortOrder, activeTags, searchQuery], () => {
  safeStorage.setItem('pv_selection_filters', JSON.stringify({
    sortBy: sortBy.value,
    sortOrder: sortOrder.value,
    activeTags: activeTags.value,
    searchQuery: searchQuery.value
  }))
}, { deep: true })

const getPokemonTotalPower = (p: Pokemon) => {
  if (!p) return 0
  const base = pokemonDataProvider.getPokemonData(p.id)
  const TOT = base ? (base.hp + base.atk + base.def + base.spa + base.spd + base.spe) : 0
  
  const ivs = p.ivs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
  const totalIvs = (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0)
  return TOT + totalIvs
}

const availablePokemon = computed<{ pokemon: Pokemon, _source: 'team' | 'box', index: number }[]>(() => {
  const box = (gameStore.state.box || []) as (Pokemon | null)[]
  const team = (gameStore.state.team || []) as (Pokemon | null)[]
  
  let sourceList: { pokemon: Pokemon, _source: 'team' | 'box', index: number }[] = []
  
  if (props.customList && props.customList.length > 0) {
    sourceList = props.customList.map((p, i) => ({ pokemon: p, _source: 'box' as const, index: i }))
  } else if (props.battleMode === 'pvp') {
    const pvpUids = (gameStore.state.pvpTeam || []) as string[]
    const allPokes = [...team, ...box].filter((p): p is Pokemon => p !== null)
    sourceList = allPokes
      .filter(p => pvpUids.includes(p.uid))
      .map(p => ({ 
        pokemon: p, 
        _source: team.some(tp => tp && tp.uid === p.uid) ? 'team' as const : 'box' as const,
        index: pvpUids.indexOf(p.uid) 
      }))
  } else if (props.battleMode === 'war') {
    const warUids = (gameStore.state.warTeam || []) as string[]
    const allPokes = [...team, ...box].filter((p): p is Pokemon => p !== null)
    sourceList = allPokes
      .filter(p => warUids.includes(p.uid))
      .map(p => ({ 
        pokemon: p, 
        _source: team.some(tp => tp && tp.uid === p.uid) ? 'team' as const : 'box' as const,
        index: warUids.indexOf(p.uid)
      }))
  } else if (props.battleMode === 'wild' || props.isBattleSwitch) {
    sourceList = team
      .filter((p): p is Pokemon => p !== null)
      .map((p, i) => ({ pokemon: p, _source: 'team' as const, index: i }))
  } else {
    const teamItems = team
      .filter((p): p is Pokemon => p !== null)
      .map((p, i) => ({ pokemon: p, _source: 'team' as const, index: i }))
    const boxItems = box
      .filter((p): p is Pokemon => p !== null)
      .map((p, i) => ({ pokemon: p, _source: 'box' as const, index: i }))
    
    sourceList = props.includeTeam !== false
      ? [...teamItems, ...boxItems]
      : boxItems
  }

  const filtered = sourceList.filter(item => {
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
    let valA: number, valB: number

    if (sortBy.value === 'level') {
      valA = pA.level || 0
      valB = pB.level || 0
    } else if (sortBy.value === 'ivs') {
      const sum = (ivs: Pokemon['ivs']) => {
        const obj = ivs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
        return (obj.hp || 0) + (obj.atk || 0) + (obj.def || 0) + (obj.spa || 0) + (obj.spd || 0) + (obj.spe || 0)
      }
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

function toggleSelection(item: { pokemon: Pokemon, _source: 'team' | 'box' | 'market', index: number }) {
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
  }).filter((p): p is Pokemon => p !== null)
  
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

function setSort(type: string) {
  if (sortBy.value === type) {
    sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortBy.value = type
    sortOrder.value = 'desc'
  }
}

function toggleTagFilter(tagId: string) {
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
  const win = window as unknown as { _openPokemonSelectionModal?: (opts: Record<string, unknown>) => void }
  win._openPokemonSelectionModal = (opts: Record<string, unknown>) => {
    uiStore.open('PokemonSelection', { 
      title: '⚡ SELECCIONAR POKÉMON',
      subtitle: 'Elige un Pokémon para la tarea.',
      maxSelect: 1,
      minSelect: 1,
      ...opts 
    })
    selectedUids.value = []
  }
}

function openDetail(item: { pokemon: Pokemon, _source: 'team' | 'box' | 'market', index: number }) {
  uiStore.openPokemonDetail(item.pokemon, item.index, item._source, { source: 'selection' })
}
</script>

<template>
  <BaseModal
    show
    :title="props.title"
    max-width="480px"
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
      </div>
    </template>

    <div class="selection-container">
      <div class="filters-bar">
        <div class="ps-search-row">
          <span class="ps-search-icon">🔍</span>
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Buscar por nombre o ID..."
            class="ps-search-input"
          >
          <button
            v-if="searchQuery"
            class="ps-clear-search"
            @click.stop="searchQuery = ''"
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
                v-if="POKEMON_BADGES.shiny"
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
