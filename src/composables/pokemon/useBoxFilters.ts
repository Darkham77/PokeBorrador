import { ref, computed, watch, type Ref } from 'vue'
import { getPokemonTier } from '@/logic/pokemon/tierEngine'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { getPokedexOrderIndex, requirePokemonSpeciesId } from '@/data/pokemon/pokedex'
import { hasPokemonTag } from '@/logic/constants/tags'

interface FilterState {
  tier: string
  type: string
  levelMin: number
  levelMax: number
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
  search: string
  isOpen: boolean
  tags: string[]
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
  
  const filters = ref<FilterState>({
    tier: 'all',
    type: 'all',
    levelMin: 1,
    levelMax: 100,
    ivTotalMin: 0,
    ivTotalMax: 186,
    ivAny31: false,
    ivMin: 0,
    ivMax: 31,
    bstMin: 0,
    bstMax: 1000,
    ivHP: 0,
    ivATK: 0,
    ivDEF: 0,
    ivSPA: 0,
    ivSPD: 0,
    ivSPE: 0,
    search: '',
    isOpen: false,
    tags: []
  })

  const hasActiveFilters = computed(() => {
    const f = filters.value
    return f.tier !== 'all' || f.type !== 'all' || f.levelMin > 1 || f.levelMax < 100 ||
           f.ivTotalMin > 0 || f.ivTotalMax < 186 || f.ivAny31 || f.search !== '' ||
           f.bstMin > 0 || f.bstMax < 1000 || f.ivHP > 0 || f.ivATK > 0 || f.ivDEF > 0 ||
           f.ivSPA > 0 || f.ivSPD > 0 || f.ivSPE > 0 || f.ivMin > 0 || f.ivMax < 31 ||
           (f.tags && f.tags.length > 0)
  })

  const processedBoxList = computed(() => {
    if (!box.value) return []
    
    let list = box.value.map((p: Pokemon | null, i: number) => ({ p, index: i }))

    // Apply Filters
    list = list.filter(({ p }: { p: Pokemon | null }) => {
      if (!p) return false // Skip empty slots
      const f = filters.value
      const ivs = p.ivs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
      const totalIv = (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) +
                     (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0)
      
      if (f.tier !== 'all' && getPokemonTier(p).tier !== f.tier) return false
      if (f.type !== 'all' && p.type !== f.type) return false
      if (p.level < f.levelMin || p.level > f.levelMax) return false
      if (totalIv < f.ivTotalMin || totalIv > f.ivTotalMax) return false
      if (f.ivAny31 && !Object.values(ivs).some(v => v === 31)) return false
      
      // Individual IV Range (All stats must be within range)
      const allIvValues = [ivs.hp||0, ivs.atk||0, ivs.def||0, ivs.spa||0, ivs.spd||0, ivs.spe||0]
      if (allIvValues.some(v => v < f.ivMin || v > f.ivMax)) return false

      // Individual IV Filters (Specific stats)
      if ((ivs.hp || 0) < f.ivHP) return false
      if ((ivs.atk || 0) < f.ivATK) return false
      if ((ivs.def || 0) < f.ivDEF) return false
      if ((ivs.spa || 0) < f.ivSPA) return false
      if ((ivs.spd || 0) < f.ivSPD) return false
      if ((ivs.spe || 0) < f.ivSPE) return false

      // Tags filter
      if (f.tags && f.tags.length > 0) {
        if (!f.tags.every(t => {
          if (t === 'team') return false // 'team' tag filter is handled outside in box lists if needed, or we check if it is part of active team. But wait! Box filters only filter box pokemons. Let's keep existing tag behavior for normal tags or check hasPokemonTag.
          return hasPokemonTag(p, t)
        })) return false
      }

      // TOTAL Filter (Species Base Stats + IVs)
      const species = pokemonDataProvider.getPokemonData(p.id)
      if (species) {
        const bst = (species.hp || 0) + (species.atk || 0) + (species.def || 0) +
                    (species.spa || 0) + (species.spd || 0) + (species.spe || 0)
        const totalPower = bst + totalIv
        if (totalPower < f.bstMin || totalPower > f.bstMax) return false
      }

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
        else if (sortMode.value === 'bst') {
          const specA = pokemonDataProvider.getPokemonData(pA.id);
          const specB = pokemonDataProvider.getPokemonData(pB.id);
          const bstA = specA ? ((specA.hp || 0) + (specA.atk || 0) + (specA.def || 0) + (specA.spa || 0) + (specA.spd || 0) + (specA.spe || 0)) : 0;
          const bstB = specB ? ((specB.hp || 0) + (specB.atk || 0) + (specB.def || 0) + (specB.spa || 0) + (specB.spd || 0) + (specB.spe || 0)) : 0;
          
          const ivsA = pA.ivs;
          const totalIvsA = Object.values(ivsA).reduce((s: number, v) => s + (Number(v) || 0), 0);
          const ivsB = pB.ivs;
          const totalIvsB = Object.values(ivsB).reduce((s: number, v) => s + (Number(v) || 0), 0);
          
          result = (bstB + totalIvsB) - (bstA + totalIvsA);
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
      ivTotalMax: 186,
      ivAny31: false,
      ivMin: 0,
      ivMax: 31,
      bstMin: 0,
      bstMax: 1000,
      ivHP: 0,
      ivATK: 0,
      ivDEF: 0,
      ivSPA: 0,
      ivSPD: 0,
      ivSPE: 0,
      search: '',
      isOpen: filters.value.isOpen,
      tags: []
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
