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
import type { Pokemon } from '@/types/pokemon/pokemon'
import { LEGENDARY_POKEMON, BABY_POKEMON, FOSSIL_POKEMON } from '@/data/pokemon/pokedex'
import { getMaxVigor } from '@/logic/pokemon/pokemonUtils'

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
  savedFilters = JSON.parse(safeStorage.getItem('pv_selection_filters') || '{}') as SavedFilters
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

const availablePokemon = computed<{ pokemon: Pokemon, _source: 'team' | 'box' | 'market', index: number }[]>(() => {
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
    isBattleSwitch: props.isBattleSwitch,
    activePokemonUid: props.activePokemonUid,
    allowDead: props.allowDead
  })

  if (props.isDaycareContext) {
    const legendaries = new Set(LEGENDARY_POKEMON);
    const babyPokemon = new Set(BABY_POKEMON);
    const fossils = new Set(FOSSIL_POKEMON);
    result = result.filter(item => {
      const p = item.pokemon;
      if (!p.id) return true;
      const idLower = p.id.toLowerCase();
      const maxVig = getMaxVigor(p);
      if (maxVig <= 0) return false;
      if (legendaries.has(idLower)) return false;
      if (babyPokemon.has(idLower)) return false;
      if (fossils.has(idLower)) return false;
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
