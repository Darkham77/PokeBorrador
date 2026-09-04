<script setup lang="ts">

import { ref, computed, watch } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'

import { useModalStore } from '@/stores/modals'
import { safeStorage } from '@/logic/utils/storage'
import BaseModal from '@/components/common/BaseModal.vue'
import { logger } from '@/logic/utils/logger'
import { useBreedingStore } from '@/stores/breeding'
import { checkCompatibility } from '@/logic/breeding/breedingEngine'
import PokemonSelectionItem from './PokemonSelectionItem.vue'
import PokemonSelectionFilters from './PokemonSelectionFilters.vue'
import type { Pokemon, PokemonStorageLocation, PokemonSelectionSource } from '@/types/pokemon/pokemon'
import type { ResolvedSubCompetition, SubCompetitionConfig } from '@/logic/events/eventCompetitions'
import {
  isBabyPokemonSpeciesId,
  isFossilPokemonSpeciesId,
  isLegendaryPokemonSpeciesId,
  requirePokemonSpeciesId,
} from '@/data/pokemon/pokedex'
import { getMaxVigor } from '@/logic/pokemon/pokemonUtils'

import { isPokemonFilterTagId, type PokemonFilterTagId } from '@/logic/constants/tags'
import { filterAndSortPokemon, getPokemonTotalPower } from '@/logic/pokemon/pokemonSelectionFilter.ts'

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
  allowedSpecies?: string[] | null
  isItemContext?: boolean
  customList?: Pokemon[]
  isDaycareContext?: boolean
  daycareSlotIdx?: number
  subCompetition?: ResolvedSubCompetition | SubCompetitionConfig | null
  show?: boolean
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
  allowedSpecies: null,
  isItemContext: false,
  customList: () => [],
  isDaycareContext: false,
  daycareSlotIdx: 0,
  subCompetition: null,
  show: true
})



interface SavedFilters {
  searchQuery?: string
  sortBy?: string
  sortOrder?: string
  activeTags?: PokemonFilterTagId[]
}

const contextKey = computed(() => {
  if (props.isBattleSwitch) return 'battle_switch'
  if (props.isDaycareContext) return 'daycare'
  if (props.isItemContext) return 'item_use'
  if (props.subCompetition) return `competition_${props.subCompetition.metric}`
  if (props.battleMode === 'pvp') return 'pvp_selection'
  if (props.battleMode === 'war') return 'war_selection'
  return 'general'
})

const storageKey = computed(() => `pv_selection_filters_${contextKey.value}`)

const loadSavedFilters = (key: string): SavedFilters => {
  try {
    const raw = safeStorage.getItem(key) || (!props.isBattleSwitch ? safeStorage.getItem('pv_selection_filters') : null)
    return JSON.parse(raw || '{}') as SavedFilters
  } catch (e) {
    logger.warn('PokemonSelectionModal', 'Error loading context filters', e)
    return {}
  }
}

const initialFilters = loadSavedFilters(storageKey.value)

const getInitialSortForSubComp = (sub: ResolvedSubCompetition | SubCompetitionConfig) => {
  const sortDir = sub.order === 'min' ? 'asc' : 'desc'
  if (sub.metric === 'weight') return { sortBy: 'weight', sortOrder: sortDir }
  if (sub.metric === 'height') return { sortBy: 'height', sortOrder: sortDir }
  if (sub.metric === 'total_ivs') return { sortBy: 'ivs', sortOrder: 'desc' }
  if (sub.metric === 'stat_iv') return { sortBy: 'ivs', sortOrder: 'desc' }
  if (sub.metric === 'level') return { sortBy: 'level', sortOrder: sortDir }
  if (sub.metric === 'friendship') return { sortBy: 'friendship', sortOrder: sortDir }
  return { sortBy: 'recent', sortOrder: 'desc' }
}

const initialSubCompSort = props.subCompetition ? getInitialSortForSubComp(props.subCompetition) : null

// In battle switch mode, strictly reset search and tags to ensure team availability
const isBattleMode = props.isBattleSwitch
const searchQuery = ref(isBattleMode ? '' : (initialFilters.searchQuery || ''))
const sortBy = ref(initialSubCompSort ? initialSubCompSort.sortBy : (initialFilters.sortBy || 'recent'))
const sortOrder = ref(initialSubCompSort ? initialSubCompSort.sortOrder : (initialFilters.sortOrder || 'desc'))
const activeTags = ref<PokemonFilterTagId[]>(isBattleMode ? [] : (Array.isArray(initialFilters.activeTags) ? initialFilters.activeTags.filter(isPokemonFilterTagId) : []))
const selectedUids = ref<string[]>([])

// When a subCompetition is provided, always enforce its target sort metric and direction
watch(
  () => props.subCompetition,
  (sub) => {
    if (sub) {
      const s = getInitialSortForSubComp(sub)
      sortBy.value = s.sortBy
      sortOrder.value = s.sortOrder
    }
  },
  { immediate: true }
)

const breedingStore = useBreedingStore()

const otherDaycarePokemon = computed(() => {
  if (!props.isDaycareContext) return null
  const otherSlotIdx = props.daycareSlotIdx === 1 ? 0 : 1
  return breedingStore.slots.find((s) => s.slotIndex === otherSlotIdx)?.pokemon || null
})

const filterCompatibleOnly = ref(props.isDaycareContext && !!otherDaycarePokemon.value)

// Persist filters strictly within the caller's own isolated context
watch([sortBy, sortOrder, activeTags, searchQuery], () => {
  if (props.isBattleSwitch) return
  const payload = JSON.stringify({
    sortBy: sortBy.value,
    sortOrder: sortOrder.value,
    activeTags: activeTags.value,
    searchQuery: searchQuery.value
  })
  safeStorage.setItem(storageKey.value, payload)
  safeStorage.setItem('pv_selection_filters', payload)
}, { deep: true })

const availablePokemon = computed<{ pokemon: Pokemon, _source: PokemonSelectionSource, index: number }[]>(() => {
  const box = (gameStore.state.box || []) as (Pokemon | null)[]
  const team = (gameStore.state.team || []) as (Pokemon | null)[]
  
  let sourceList: { pokemon: Pokemon, _source: PokemonStorageLocation, index: number }[] = []
  
  if (props.customList && props.customList.length > 0) {
    sourceList = props.customList.map((p, i) => ({ pokemon: p, _source: 'box' as const, index: i }))
  } else if (props.battleMode === 'pvp') {
    const pvpUids = (gameStore.state.pvpTeam || []) as string[] // no-domain: Non-domain utility collection or data structure
    sourceList = pvpUids
      .map((uid, index) => {
        const p = gameStore.getPokemonByUid(uid)
        if (!p) return null
        return {
          pokemon: p,
          _source: team.some(tp => tp && tp.uid === p.uid) ? 'team' as const : 'box' as const,
          index
        }
      })
      .filter((item): item is { pokemon: Pokemon, _source: PokemonStorageLocation, index: number } => item !== null)
  } else if (props.battleMode === 'war') {
    const warUids = (gameStore.state.warTeam || []) as string[] // no-domain: Non-domain utility collection or data structure
    sourceList = warUids
      .map((uid, index) => {
        const p = gameStore.getPokemonByUid(uid)
        if (!p) return null
        return {
          pokemon: p,
          _source: team.some(tp => tp && tp.uid === p.uid) ? 'team' as const : 'box' as const,
          index
        }
      })
      .filter((item): item is { pokemon: Pokemon, _source: PokemonStorageLocation, index: number } => item !== null)
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

  // Filter out busy/invalid status
  const validSourceList = sourceList.filter(item => {
    const p = item.pokemon
    return p && !p.onMission && !p.inDaycare && !p.onDefense
  })

  let result = filterAndSortPokemon(validSourceList, {
    searchQuery: searchQuery.value,
    sortBy: sortBy.value,
    sortOrder: sortOrder.value,
    activeTags: activeTags.value,
    excludeUids: props.excludeUids,
    allowedIds: props.allowedIds,
    allowedSpecies: props.allowedSpecies,
    isBattleSwitch: props.isBattleSwitch,
    activePokemonUid: props.activePokemonUid,
    allowDead: props.allowDead
  })

  if (props.isDaycareContext) {
    result = result.filter(item => {
      const p = item.pokemon;
      if (!p.id) return true;
      const speciesId = requirePokemonSpeciesId(p.id);
      const maxVig = getMaxVigor(p);
      if (maxVig <= 0) return false;
      if (isLegendaryPokemonSpeciesId(speciesId)) return false;
      if (isBabyPokemonSpeciesId(speciesId)) return false;
      if (isFossilPokemonSpeciesId(speciesId)) return false;
      return true;
    });
  }

  if (props.isDaycareContext && filterCompatibleOnly.value && otherDaycarePokemon.value) {
    result = result.filter(item => {
      const compat = checkCompatibility(item.pokemon, otherDaycarePokemon.value!)
      return compat && compat.level > 0
    })
  }

  return result
})

interface PokemonSelectionItemEntry {
  pokemon: Pokemon;
  _source: PokemonSelectionSource;
  index: number;
}

function toggleSelection(item: PokemonSelectionItemEntry) {
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
  Reflect.set(window, '_openPokemonSelectionModal', (opts: Record<string, unknown>) => { // open-record: Generic key-value data dictionary container
    uiStore.open('PokemonSelection', { 
      title: '⚡ SELECCIONAR POKÉMON',
      subtitle: 'Elige un Pokémon para la tarea.',
      maxSelect: 1,
      minSelect: 1,
      ...opts 
    })
    selectedUids.value = []
  })
}

function openDetail(item: PokemonSelectionItemEntry) {
  uiStore.openPokemonDetail(item.pokemon, item.index, item._source, { source: 'selection' })
}
</script>

<template>
  <BaseModal
    close-btn-id="pokemon-selection-modal-close-btn"
    :show="props.show"
    :title="props.title"
    max-width="640px"
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
          :sub-competition="props.subCompetition"
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
          id="pokemon-selection-confirm-btn"
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
