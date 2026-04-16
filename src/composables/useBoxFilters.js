import { ref, computed } from 'vue'
import { getPokemonTier } from '@/logic/pokemonUtils'

export function useBoxFilters(boxSource) {
  const isFiltersOpen = ref(false)
  const sortMode = ref('none')
  
  const filters = ref({
    tier: 'all',
    type: 'all',
    levelMin: 1,
    levelMax: 100,
    ivHP: 0,
    ivATK: 0,
    ivDEF: 0,
    ivSPA: 0,
    ivSPD: 0,
    ivSPE: 0,
    ivAny31: false,
    ivTotalMin: 0,
    ivTotalMax: 186,
    search: ''
  })

  const hasActiveFilters = computed(() => {
    const f = filters.value
    return f.tier !== 'all' || f.type !== 'all' || f.levelMin > 1 || f.levelMax < 100 ||
           f.ivHP > 0 || f.ivATK > 0 || f.ivDEF > 0 || f.ivSPA > 0 || f.ivSPD > 0 || f.ivSPE > 0 ||
           f.ivAny31 || f.ivTotalMin > 0 || f.ivTotalMax < 186 || f.search !== ''
  })

  const processedBoxList = computed(() => {
    const box = boxSource.value || []
    let list = box.map((p, index) => ({ p, index }))

    // Aplicar filtros
    if (hasActiveFilters.value) {
      const f = filters.value
      list = list.filter(({ p }) => {
        const searchStr = f.search.toLowerCase()
        const matchesId = String(p.id).toLowerCase().includes(searchStr)
        const matchesName = p.name && p.name.toLowerCase().includes(searchStr)
        if (f.search && !matchesId && !matchesName) return false
        
        if (f.tier !== 'all' && getPokemonTier(p).tier !== f.tier) return false
        if (f.type !== 'all' && p.type !== f.type && p.type2 !== f.type) return false
        if (p.level < f.levelMin || p.level > f.levelMax) return false
        
        const ivs = p.ivs || {}
        if ((ivs.hp || 0) < f.ivHP) return false
        if ((ivs.atk || 0) < f.ivATK) return false
        if ((ivs.def || 0) < f.ivDEF) return false
        if ((ivs.spa || 0) < f.ivSPA) return false
        if ((ivs.spd || 0) < f.ivSPD) return false
        if ((ivs.spe || 0) < f.ivSPE) return false
        
        const tierInfo = getPokemonTier(p)
        if (tierInfo.total < f.ivTotalMin || tierInfo.total > f.ivTotalMax) return false
        if (f.ivAny31 && !Object.values(ivs).some(v => v === 31)) return false

        return true
      })
    }

    // Aplicar ordenamiento
    if (sortMode.value !== 'none') {
      list.sort((a, b) => {
        if (sortMode.value === 'level') return b.p.level - a.p.level
        if (sortMode.value === 'tier') return getPokemonTier(b.p).total - getPokemonTier(a.p).total
        if (sortMode.value === 'type') return (a.p.type || '').localeCompare(b.p.type || '')
        if (sortMode.value === 'pokedex') return (a.p.id || 0) - (b.p.id || 0)
        return 0
      })
    }

    return list
  })

  const resetFilters = () => {
    filters.value = {
      tier: 'all', type: 'all', levelMin: 1, levelMax: 100,
      ivHP: 0, ivATK: 0, ivDEF: 0, ivSPA: 0, ivSPD: 0, ivSPE: 0,
      ivAny31: false, ivTotalMin: 0, ivTotalMax: 186,
      search: ''
    }
    sortMode.value = 'none'
  }

  return {
    filters,
    isFiltersOpen,
    sortMode,
    hasActiveFilters,
    processedBoxList,
    resetFilters
  }
}
