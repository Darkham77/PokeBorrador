import { computed, ref, reactive } from 'vue';
import { getPokemonTier } from '@/logic/pokemon/tierEngine';
import { PDEX_ORDER } from '@/data/pokedex';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';

export function useBoxFilters(boxArray, _currentBoxIndex) {
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
    ivMin: 0,
    ivMax: 31,
    ivTotalMin: 0,
    ivTotalMax: 186,
    bstMin: 0,
    bstMax: 1000,
    search: '',
    tags: []
  });

  const sortMode = ref('none'); 
  const sortDirection = ref('desc'); 
  const isFiltersOpen = ref(false);

  const hasActiveFilters = computed(() => {
    return filters.tier !== 'all' || 
           filters.type !== 'all' || 
           filters.levelMin > 1 || 
           filters.levelMax < 100 ||
           filters.ivHP > 0 || filters.ivATK > 0 || filters.ivDEF > 0 || 
           filters.ivSPA > 0 || filters.ivSPD > 0 || filters.ivSPE > 0 ||
           filters.ivAny31 || 
           filters.ivMin > 0 || filters.ivMax < 31 ||
           filters.ivTotalMin > 0 || filters.ivTotalMax < 186 ||
           filters.bstMin > 0 || filters.bstMax < 1000 ||
           filters.search !== '' ||
           filters.tags.length > 0;
  });

  const processedBoxList = computed(() => {
    const isFiltered = hasActiveFilters.value;
    const isSorted = sortMode.value !== 'none';
    
    // Always filter out empty slots first to avoid crashes in sort/logic
    const rawList = boxArray.value || [];
    let result = rawList
      .map((p, index) => ({ p, index }))
      .filter(item => item.p != null);

    if (isFiltered) {
      result = result.filter(({ p }) => {
        const tierInfo = getPokemonTier(p);
        const ivs = p.ivs || {};
        const allIvs = [ivs.hp||0, ivs.atk||0, ivs.def||0, ivs.spa||0, ivs.spd||0, ivs.spe||0];
        const totalIvs = allIvs.reduce((s, v) => s + v, 0);
        
        // TOTAL Power calculation (BST + IVs)
        const species = pokemonDataProvider.getPokemonData(p.id);
        const bst = species ? ((species.hp||0)+(species.atk||0)+(species.def||0)+(species.spa||0)+(species.spd||0)+(species.spe||0)) : 0;
        const totalPower = bst + totalIvs;

        if (filters.tier !== 'all' && tierInfo.tier !== filters.tier) return false;
        if (filters.type !== 'all' && p.type !== filters.type && p.type2 !== filters.type) return false;
        if (p.level < filters.levelMin || p.level > filters.levelMax) return false;

        if (filters.ivAny31 && !allIvs.some(v => v === 31)) return false;
        if (allIvs.some(v => v < filters.ivMin || v > filters.ivMax)) return false;
        
        if (totalIvs < filters.ivTotalMin || totalIvs > filters.ivTotalMax) return false;
        if (totalPower < filters.bstMin || totalPower > filters.bstMax) return false;

        if ((ivs.hp || 0) < filters.ivHP) return false;
        if ((ivs.atk || 0) < filters.ivATK) return false;
        if ((ivs.def || 0) < filters.ivDEF) return false;
        if ((ivs.spa || 0) < filters.ivSPA) return false;
        if ((ivs.spd || 0) < filters.ivSPD) return false;
        if ((ivs.spe || 0) < filters.ivSPE) return false;

        if (filters.search) {
          const q = filters.search.toLowerCase();
          const matchesName = p.name?.toLowerCase().includes(q);
          const matchesNick = p.nickname?.toLowerCase().includes(q);
          if (!matchesName && !matchesNick) return false;
        }

        if (filters.tags.length > 0) {
          const pTags = p.tags || [];
          const hasRequiredTag = filters.tags.every(t => {
            if (t === 'iv31') return pTags.includes('iv31') || allIvs.some(v => v === 31);
            if (t === 'shy') return p.isShiny;
            return pTags.includes(t);
          });
          if (!hasRequiredTag) return false;
        }

        return true;
      });
    }

    if (isSorted) {
      const isAsc = sortDirection.value === 'asc';
      result.sort((a, b) => {
        let cmp = 0;
        const pA = a.p;
        const pB = b.p;

        if (sortMode.value === 'level') cmp = pB.level - pA.level;
        else if (sortMode.value === 'tier') cmp = getPokemonTier(pB).total - getPokemonTier(pA).total;
        else if (sortMode.value === 'type') cmp = (pA.type || '').localeCompare(pB.type || '');
        else if (sortMode.value === 'pokedex') {
          const idxA = PDEX_ORDER.indexOf(pA.id);
          const idxB = PDEX_ORDER.indexOf(pB.id);
          cmp = (idxA === -1 ? 9999 : idxA) - (idxB === -1 ? 9999 : idxB);
        }
        else if (sortMode.value === 'bst') {
          const specA = pokemonDataProvider.getPokemonData(pA.id);
          const specB = pokemonDataProvider.getPokemonData(pB.id);
          const bstA = specA ? ((specA.hp||0)+(specA.atk||0)+(specA.def||0)+(specA.spa||0)+(specA.spd||0)+(specA.spe||0)) : 0;
          const bstB = specB ? ((specB.hp||0)+(specB.atk||0)+(specB.def||0)+(specB.spa||0)+(specB.spd||0)+(specB.spe||0)) : 0;
          
          const ivsA = pA.ivs || {};
          const totalIvsA = (ivsA.hp||0)+(ivsA.atk||0)+(ivsA.def||0)+(ivsA.spa||0)+(ivsA.spd||0)+(ivsA.spe||0);
          const ivsB = pB.ivs || {};
          const totalIvsB = (ivsB.hp||0)+(ivsB.atk||0)+(ivsB.def||0)+(ivsB.spa||0)+(ivsB.spd||0)+(ivsB.spe||0);
          
          cmp = (bstB + totalIvsB) - (bstA + totalIvsA);
        }

        if (cmp === 0) {
          return isAsc ? a.index - b.index : b.index - a.index;
        }
        return isAsc ? -cmp : cmp;
      });
    }

    return result;
  });

  function resetFilters() {
    filters.tier = 'all';
    filters.type = 'all';
    filters.levelMin = 1;
    filters.levelMax = 100;
    filters.ivHP = 0; filters.ivATK = 0; filters.ivDEF = 0;
    filters.ivSPA = 0; filters.ivSPD = 0; filters.ivSPE = 0;
    filters.ivAny31 = false;
    filters.ivMin = 0;
    filters.ivMax = 31;
    filters.ivTotalMin = 0;
    filters.ivTotalMax = 186;
    filters.bstMin = 0;
    filters.bstMax = 1000;
    filters.search = '';
    filters.tags = [];
    
    sortMode.value = 'none';
    sortDirection.value = 'desc';
  }

  return {
    filters,
    isFiltersOpen,
    sortMode,
    sortDirection,
    hasActiveFilters,
    processedBoxList,
    resetFilters
  };
}
