import { ref, computed, watch, type Ref } from 'vue'
import { getPokemonTier } from '@/logic/pokemon/tierEngine'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { getPokedexOrderIndex, requirePokemonSpeciesId } from '@/data/pokemon/pokedex'
import { calculateTotalIVs } from '@/logic/pokemon/statsMath'
import { calculateTotalPower } from '@/logic/pokemon/pokemonUtils'
import { hasPokemonTag } from '@/logic/constants/tags'
import { getPokemonPhysicalWeight, getPokemonPhysicalHeight } from '@/logic/pokemon/physicalDimensionsMath'
import {
  isReadyForFriendshipEvolution,
  resolveFriendshipSealTier,
} from '@/logic/pokemon/friendshipLogic'
import { FRIENDSHIP_BOUNDS, type FriendshipSealTier } from '@/types/pokemon/friendship'

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
  tags: string[]
  friendshipSealTier: FriendshipSealTier | 'all'
  friendshipEvoReady: boolean
  friendshipMaxOnly: boolean
}

export function useBoxFilters(box: Ref<(Pokemon | null)[]>) {
  const savedSortMode = typeof localStorage !== 'undefined' ? localStorage.getItem('box_sort_mode') : null
  const savedSortDirection = typeof localStorage !== 'undefined' ? localStorage.getItem('box_sort_direction') : null

  const sortMode = ref(savedSortMode || 'recent')
  const sortDirection = ref(savedSortDirection || 'desc')
  const isFiltersOpen = ref(false)

  if (typeof localStorage !== 'undefined') {
    watch(sortMode, (newVal) => {
      localStorage.setItem('box_sort_mode', newVal)
    })
    watch(sortDirection, (newVal) => {
      localStorage.setItem('box_sort_direction', newVal)
    })
  }
  
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

  const hasActiveFilters = computed(() => {
    const f = filters.value
    return f.tier !== 'all' || f.type !== 'all' || f.levelMin > 1 || f.levelMax < MAX_POKEMON_LEVEL_CONST ||
           f.friendshipMin > 0 || f.friendshipMax < MAX_POKEMON_FRIENDSHIP_CONST ||
           f.ivTotalMin > 0 || f.ivTotalMax < MAX_TOTAL_IVS || f.ivAny31 || f.search !== '' ||
           f.bstMin > 0 || f.bstMax < MAX_BST_FILTER || f.ivHP > 0 || f.ivATK > 0 || f.ivDEF > 0 ||
           f.ivSPA > 0 || f.ivSPD > 0 || f.ivSPE > 0 || f.ivMin > 0 || f.ivMax < MAX_SINGLE_IV ||
           f.evHP > 0 || f.evATK > 0 || f.evDEF > 0 || f.evSPA > 0 || f.evSPD > 0 || f.evSPE > 0 ||
           (f.tags && f.tags.length > 0) || f.friendshipSealTier !== 'all' || f.friendshipEvoReady || f.friendshipMaxOnly
  })

  const processedBoxList = computed(() => {
    if (!box.value) return []
    
    let list = box.value.map((p: Pokemon | null, i: number) => ({ p, index: i }))

    // Apply Filters
    list = list.filter(({ p }: { p: Pokemon | null }) => {
      if (!p) return false // Skip empty slots
      const f = filters.value
      const totalIv = calculateTotalIVs(p.ivs)
      
      if (f.tier !== 'all' && getPokemonTier(p).tier !== f.tier) return false
      if (f.type !== 'all' && p.type !== f.type) return false
      if (p.level < f.levelMin || p.level > f.levelMax) return false
      if (totalIv < f.ivTotalMin || totalIv > f.ivTotalMax) return false
      if (f.ivAny31 && !Object.values(p.ivs || {}).some(v => v === MAX_SINGLE_IV)) return false
      
      // Individual IV Range (All stats must be within range)
      const allIvValues = [p.ivs?.hp||0, p.ivs?.atk||0, p.ivs?.def||0, p.ivs?.spa||0, p.ivs?.spd||0, p.ivs?.spe||0]
      if (allIvValues.some(v => v < f.ivMin || v > f.ivMax)) return false

      // Individual IV Filters (Specific stats)
      if ((p.ivs?.hp || 0) < f.ivHP) return false
      if ((p.ivs?.atk || 0) < f.ivATK) return false
      if ((p.ivs?.def || 0) < f.ivDEF) return false
      if ((p.ivs?.spa || 0) < f.ivSPA) return false
      if ((p.ivs?.spd || 0) < f.ivSPD) return false
      if ((p.ivs?.spe || 0) < f.ivSPE) return false

      // Individual EV Filters (Specific stats)
      if ((p.evs?.hp || 0) < f.evHP) return false
      if ((p.evs?.atk || 0) < f.evATK) return false
      if ((p.evs?.def || 0) < f.evDEF) return false
      if ((p.evs?.spa || 0) < f.evSPA) return false
      if ((p.evs?.spd || 0) < f.evSPD) return false
      if ((p.evs?.spe || 0) < f.evSPE) return false

      // Tags filter
      if (f.tags && f.tags.length > 0) {
        if (!f.tags.every(t => {
          if (t === 'team') return false
          return hasPokemonTag(p, t)
        })) return false
      }

      // Friendship Filters
      const pFriendship = p.friendship ?? 70
      if (pFriendship < f.friendshipMin || pFriendship > f.friendshipMax) {
        return false
      }
      if (f.friendshipSealTier !== 'all' && resolveFriendshipSealTier(p.friendship) !== f.friendshipSealTier) {
        return false
      }
      if (f.friendshipEvoReady && !isReadyForFriendshipEvolution(p)) {
        return false
      }
      if (f.friendshipMaxOnly && (p.friendship ?? 70) < FRIENDSHIP_BOUNDS.AFFINITY_PERK_THRESHOLD) {
        return false
      }

      // TOTAL Filter (Species Base Stats + IVs + EVs)
      const totalPower = calculateTotalPower(p)
      if (totalPower < f.bstMin || totalPower > f.bstMax) return false

      if (f.search) {
        const query = f.search.toLowerCase() // text-ok
        const nameMatch = p.name.toLowerCase().includes(query) // text-ok
        const nickMatch = p.nickname?.toLowerCase().includes(query)
        if (!nameMatch && !nickMatch) return false
      }
      
      return true
    })

    // Apply Sorting
    if (sortMode.value !== 'none') {
      list.sort((a: { p: Pokemon | null; index: number }, b: { p: Pokemon | null; index: number }) => {
        const pA = a.p as Pokemon;
        const pB = b.p as Pokemon;
        
        let result = 0
        if (sortMode.value === 'level') result = pB.level - pA.level;
        else if (sortMode.value === 'tier') result = getPokemonTier(pB).total - getPokemonTier(pA).total;
        else if (sortMode.value === 'friendship') {
          result = (pB.friendship ?? 70) - (pA.friendship ?? 70);
        }
        else if (sortMode.value === 'bst') {
          result = calculateTotalPower(pB) - calculateTotalPower(pA);
        }
        else if (sortMode.value === 'type') result = pA.type.localeCompare(pB.type);
        else if (sortMode.value === 'recent') {
          const tA = pA.obtainedAt || a.index || 0;
          const tB = pB.obtainedAt || b.index || 0;
          result = tB - tA;
        }
        else if (sortMode.value === 'pokedex') {
          const indexA = getPokedexOrderIndex(requirePokemonSpeciesId(pA.id));
          const indexB = getPokedexOrderIndex(requirePokemonSpeciesId(pB.id));
          const idxA = indexA === -1 ? 9999 : indexA;
          const idxB = indexB === -1 ? 9999 : indexB;
          result = idxB - idxA;
        }
        else if (sortMode.value === 'weight') {
          result = getPokemonPhysicalWeight(pB) - getPokemonPhysicalWeight(pA);
        }
        else if (sortMode.value === 'height') {
          result = getPokemonPhysicalHeight(pB) - getPokemonPhysicalHeight(pA);
        }
        
        return sortDirection.value === 'asc' ? -result : result
      })
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
