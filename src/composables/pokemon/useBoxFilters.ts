import { ref, computed, type Ref } from 'vue'
import { useStorage, refDebounced } from '@vueuse/core'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { FRIENDSHIP_SEAL_TIERS } from '@/types/pokemon/friendship'
import { matchesAllBoxFilters, checkHasActiveFilters } from './boxFilterPredicates.ts'
import { sortBoxItems } from './boxSortComparators.ts'
import type { PokemonFilterTagId } from '@/logic/constants/tags'

export const FRIENDSHIP_SEAL_TIER_FILTERS = ['all', ...FRIENDSHIP_SEAL_TIERS] as const
type FriendshipSealTierFilter = (typeof FRIENDSHIP_SEAL_TIER_FILTERS)[number]

interface FilterState {
  tier: string
  type: string
  levelMin: number
  levelMax: number
  friendshipMin: number
  friendshipMax: number
  ivTotalMin: number
  ivTotalMax: number
  ivAny31: boolean
  ivMin: number
  ivMax: number
  bstMin: number
  bstMax: number
  ivHP: number
  ivATK: number
  ivDEF: number
  ivSPA: number
  ivSPD: number
  ivSPE: number
  evHP: number
  evATK: number
  evDEF: number
  evSPA: number
  evSPD: number
  evSPE: number
  search: string
  isOpen: boolean
  tags: PokemonFilterTagId[]
  friendshipSealTier: FriendshipSealTierFilter
  friendshipEvoReady: boolean
  friendshipMaxOnly: boolean
}

export function useBoxFilters(box: Ref<(Pokemon | null)[]>, options?: { debounceMs?: number }) {
  const sortMode = useStorage('box_sort_mode', 'recent')
  const sortDirection = useStorage('box_sort_direction', 'desc')
  const isFiltersOpen = ref(false)

  const isTestEnv = typeof process !== 'undefined' && (!!process.env.VITEST || process.env.NODE_ENV === 'test')
  const defaultDebounce = isTestEnv ? 0 : 150
  const debounceDuration = options?.debounceMs ?? defaultDebounce
  
const MAX_TOTAL_IVS = 186
const MAX_BST_FILTER = 1000
const MAX_SINGLE_IV = 31
const MAX_POKEMON_LEVEL_CONST = 100
const MAX_POKEMON_FRIENDSHIP_CONST = 255

  const filters = ref<FilterState>({
    tier: 'all',
    type: 'all',
    levelMin: 1,
    levelMax: MAX_POKEMON_LEVEL_CONST,
    friendshipMin: 0,
    friendshipMax: MAX_POKEMON_FRIENDSHIP_CONST,
    ivTotalMin: 0,
    ivTotalMax: MAX_TOTAL_IVS,
    ivAny31: false,
    ivMin: 0,
    ivMax: MAX_SINGLE_IV,
    bstMin: 0,
    bstMax: MAX_BST_FILTER,
    ivHP: 0,
    ivATK: 0,
    ivDEF: 0,
    ivSPA: 0,
    ivSPD: 0,
    ivSPE: 0,
    evHP: 0,
    evATK: 0,
    evDEF: 0,
    evSPA: 0,
    evSPD: 0,
    evSPE: 0,
    search: '',
    isOpen: false,
    tags: [],
    friendshipSealTier: 'all',
    friendshipEvoReady: false,
    friendshipMaxOnly: false,
  })

  const debouncedSearch = debounceDuration > 0
    ? refDebounced(computed(() => filters.value.search), debounceDuration)
    : computed(() => filters.value.search)

  const hasActiveFilters = computed(() => checkHasActiveFilters(filters.value))

  const processedBoxList = computed(() => {
    if (!box.value) return []
    
    let list = box.value.map((p: Pokemon | null, i: number) => ({ p, index: i }))

    const effectiveFilters = debouncedSearch.value === filters.value.search
      ? filters.value
      : { ...filters.value, search: debouncedSearch.value }

    // Apply Filters
    list = list.filter(({ p }: { p: Pokemon | null }) => {
      if (!p) return false // Skip empty slots
      return matchesAllBoxFilters(p, effectiveFilters)
    })

    // Apply Sorting
    if (sortMode.value !== 'none') {
      list = sortBoxItems(list, sortMode.value, sortDirection.value)
    }

    return list
  })

  function toggleFilters() {
    isFiltersOpen.value = !isFiltersOpen.value
  }

  function resetFilters() {
    filters.value = {
      tier: 'all',
      type: 'all',
      levelMin: 1,
      levelMax: 100,
      ivTotalMin: 0,
      ivTotalMax: MAX_TOTAL_IVS,
      ivAny31: false,
      ivMin: 0,
      ivMax: MAX_SINGLE_IV,
      bstMin: 0,
      bstMax: MAX_BST_FILTER,
      ivHP: 0,
      ivATK: 0,
      ivDEF: 0,
      ivSPA: 0,
      ivSPD: 0,
      ivSPE: 0,
      evHP: 0,
      evATK: 0,
      evDEF: 0,
      evSPA: 0,
      evSPD: 0,
      evSPE: 0,
      search: '',
      isOpen: filters.value.isOpen,
      tags: [],
      friendshipMin: 0,
      friendshipMax: MAX_POKEMON_FRIENDSHIP_CONST,
      friendshipSealTier: 'all',
      friendshipEvoReady: false,
      friendshipMaxOnly: false,
    }
    sortMode.value = 'none'
    sortDirection.value = 'desc'
  }

  function setBoxSort(mode: string) {
    sortMode.value = mode
  }

  return {
    filters,
    sortMode,
    sortDirection,
    isFiltersOpen,
    processedBoxList,
    hasActiveFilters,
    toggleFilters,
    resetFilters,
    setBoxSort
  }
}
