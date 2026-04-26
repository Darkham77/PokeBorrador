import { computed, ref } from 'vue';
import { getPokemonTier } from '@/logic/pokemon/tierEngine';
import { PDEX_ORDER } from '@/data/pokedex';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';

export function useBoxFilters(boxArray, _currentBoxIndex) {
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
    const f = filters.value;
    return f.tier !== 'all' || 
           f.type !== 'all' || 
           f.levelMin > 1 || 
           f.levelMax < 100 ||
           f.ivHP > 0 || f.ivATK > 0 || f.ivDEF > 0 || 
           f.ivSPA > 0 || f.ivSPD > 0 || f.ivSPE > 0 ||
           f.ivAny31 || 
           f.ivMin > 0 || f.ivMax < 31 ||
           f.ivTotalMin > 0 || f.ivTotalMax < 186 ||
           f.bstMin > 0 || f.bstMax < 1000 ||
           f.search !== '' ||
           f.tags.length > 0;
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
        const f = filters.value;
        const tierInfo = getPokemonTier(p);
        const ivs = p.ivs || {};
        const allIvs = [ivs.hp||0, ivs.atk||0, ivs.def||0, ivs.spa||0, ivs.spd||0, ivs.spe||0];
        const totalIvs = allIvs.reduce((s, v) => s + v, 0);
        
        // TOTAL Power calculation (BST + IVs)
        const species = pokemonDataProvider.getPokemonData(p.id);
        const bst = species ? ((species.hp||0)+(species.atk||0)+(species.def||0)+(species.spa||0)+(species.spd||0)+(species.spe||0)) : 0;
        const totalPower = bst + totalIvs;

        if (f.tier !== 'all' && tierInfo.tier !== f.tier) return false;
        if (f.type !== 'all' && p.type !== f.type && p.type2 !== f.type) return false;
        if (p.level < f.levelMin || p.level > f.levelMax) return false;

        if (f.ivAny31 && !allIvs.some(v => v === 31)) return false;
        if (allIvs.some(v => v < f.ivMin || v > f.ivMax)) return false;
        
        if (totalIvs < f.ivTotalMin || totalIvs > f.ivTotalMax) return false;
        if (totalPower < f.bstMin || totalPower > f.bstMax) return false;

        if ((ivs.hp || 0) < f.ivHP) return false;
        if ((ivs.atk || 0) < f.ivATK) return false;
        if ((ivs.def || 0) < f.ivDEF) return false;
        if ((ivs.spa || 0) < f.ivSPA) return false;
        if ((ivs.spd || 0) < f.ivSPD) return false;
        if ((ivs.spe || 0) < f.ivSPE) return false;

        if (f.search) {
          const q = f.search.toLowerCase();
          const matchesName = p.name?.toLowerCase().includes(q);
          const matchesNick = p.nickname?.toLowerCase().includes(q);
          if (!matchesName && !matchesNick) return false;
        }

        if (f.tags.length > 0) {
          const pTags = p.tags || [];
          const hasRequiredTag = f.tags.every(t => {
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
    filters.value = {
      tier: 'all',
      type: 'all',
      levelMin: 1,
      levelMax: 100,
      ivHP: 0, ivATK: 0, ivDEF: 0,
      ivSPA: 0, ivSPD: 0, ivSPE: 0,
      ivAny31: false,
      ivMin: 0,
      ivMax: 31,
      ivTotalMin: 0,
      ivTotalMax: 186,
      bstMin: 0,
      bstMax: 1000,
      search: '',
      tags: []
    };
    
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
