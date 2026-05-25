<script setup lang="ts">

import { ref, computed, watch } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'

import { useModalStore } from '@/stores/modals'
import { safeStorage } from '@/logic/utils/storage'
import BaseModal from '@/components/common/BaseModal.vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { hasPokemonTag } from '@/logic/constants/tags'
import { logger } from '@/logic/utils/logger'
import { useBreedingStore } from '@/stores/breeding'
import { checkCompatibility } from '@/logic/breeding/breedingEngine'
import PokemonSelectionItem from './PokemonSelectionItem.vue'
import PokemonSelectionFilters from './PokemonSelectionFilters.vue'
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
  allowedIds?: string[] | null
  isItemContext?: boolean
  customList?: Pokemon[]
  isDaycareContext?: boolean
  daycareSlotIdx?: number
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
  allowedIds: null,
  isItemContext: false,
  customList: () => [],
  isDaycareContext: false,
  daycareSlotIdx: 0
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

const breedingStore = useBreedingStore()

const otherDaycarePokemon = computed(() => {
  if (!props.isDaycareContext) return null
  const otherSlotIdx = props.daycareSlotIdx === 1 ? 0 : 1
  return breedingStore.slots.find((s) => s.slotIndex === otherSlotIdx)?.pokemon || null
})

const filterCompatibleOnly = ref(props.isDaycareContext && !!otherDaycarePokemon.value)

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
    if (props.allowedIds && !props.allowedIds.includes(p.uid)) return false
    
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

    if (props.isDaycareContext && filterCompatibleOnly.value && otherDaycarePokemon.value) {
      const compat = checkCompatibility(p, otherDaycarePokemon.value)
      if (!compat || compat.level === 0) return false
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
      <PokemonSelectionFilters
        v-model:search-query="searchQuery"
        v-model:sort-by="sortBy"
        v-model:sort-order="sortOrder"
        v-model:active-tags="activeTags"
        v-model:filter-compatible-only="filterCompatibleOnly"
        :is-daycare-context="props.isDaycareContext"
        :other-daycare-pokemon="otherDaycarePokemon"
      />

      <div class="ps-vertical-list scrollable-content">
        <PokemonSelectionItem
          v-for="item in availablePokemon" 
          :key="item.pokemon.uid"
          :item="item"
          :is-selected="selectedUids.includes(item.pokemon.uid)"
          :total="getPokemonTotalPower(item.pokemon)"
          :is-battle-context="props.isBattleSwitch || props.isItemContext || !!(props.allowedIds && props.allowedIds.length > 0)"
          :auto-confirm="props.autoConfirm"
          :is-daycare-context="props.isDaycareContext"
          :daycare-slot-idx="props.daycareSlotIdx"
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
