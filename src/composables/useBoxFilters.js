import { reactive, computed, ref } from 'vue';
import { getPokemonTier } from '@/logic/pokemon/tierEngine';

export function useBoxFilters(boxArray, currentBoxIndex) {
  const filters = reactive({
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
  });

  const sortMode = ref('none'); // 'none', 'level', 'tier', 'type', 'pokedex'
  const isFiltersOpen = ref(false);

  const hasActiveFilters = computed(() => {
    return filters.tier !== 'all' || 
           filters.type !== 'all' || 
           filters.levelMin > 1 || 
           filters.levelMax < 100 ||
           filters.ivHP > 0 || filters.ivATK > 0 || filters.ivDEF > 0 || 
           filters.ivSPA > 0 || filters.ivSPD > 0 || filters.ivSPE > 0 ||
           filters.ivAny31 || 
           filters.ivTotalMin > 0 || 
           filters.ivTotalMax < 186 ||
           filters.search !== '';
  });

  const displayList = computed(() => {
    const isFiltered = hasActiveFilters.value;
    const isSorted = sortMode.value !== 'none';
    
    let result = boxArray.value.map((p, index) => ({ p, index }));

    if (isFiltered) {
      result = result.filter(({ p }) => {
        if (!p) return false;
        const tierInfo = getPokemonTier(p);
        const ivs = p.ivs || {};
        const totalIv = (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + 
                        (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0);

        if (filters.tier !== 'all' && tierInfo.tier !== filters.tier) return false;
        if (filters.type !== 'all' && p.type !== filters.type && p.type2 !== filters.type) return false;
        if (p.level < filters.levelMin || p.level > filters.levelMax) return false;

        if (filters.ivAny31 && !Object.values(ivs).some(v => v === 31)) return false;
        if (totalIv < filters.ivTotalMin || totalIv > filters.ivTotalMax) return false;

        if ((ivs.hp || 0) < filters.ivHP) return false;
        if ((ivs.atk || 0) < filters.ivATK) return false;
        if ((ivs.def || 0) < filters.ivDEF) return false;
        if ((ivs.spa || 0) < filters.ivSPA) return false;
        if ((ivs.spd || 0) < filters.ivSPD) return false;
        if ((ivs.spe || 0) < filters.ivSPE) return false;

        if (filters.search && !p.name.toLowerCase().includes(filters.search.toLowerCase())) return false;

        return true;
      });
    }

    if (isSorted) {
      result.sort((a, b) => {
        if (sortMode.value === 'level') return b.p.level - a.p.level;
        if (sortMode.value === 'tier') return getPokemonTier(b.p).total - getPokemonTier(a.p).total;
        if (sortMode.value === 'type') return a.p.type.localeCompare(b.p.type);
        if (sortMode.value === 'pokedex') return (a.p.pokedexId || 999) - (b.p.pokedexId || 999);
        return 0;
      });
    }

    return result;
  });

  function resetFilters() {
    Object.assign(filters, {
      tier: 'all', type: 'all', levelMin: 1, levelMax: 100,
      ivHP: 0, ivATK: 0, ivDEF: 0, ivSPA: 0, ivSPD: 0, ivSPE: 0,
      ivAny31: false, ivTotalMin: 0, ivTotalMax: 186,
      search: ''
    });
    sortMode.value = 'none';
  }

  return {
    filters,
    isFiltersOpen,
    sortMode,
    hasActiveFilters,
    processedBoxList: displayList,
    resetFilters
  };
}
