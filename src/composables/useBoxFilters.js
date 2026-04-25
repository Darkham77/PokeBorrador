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
    bstMax: 800,
    search: '',
    tags: [] // Etiquetas activas
  });

  const sortMode = ref('none'); // 'none', 'level', 'tier', 'type', 'pokedex', 'bst'
  const sortDirection = ref('desc'); // 'desc', 'asc'
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
           f.bstMin > 0 || f.bstMax < 800 ||
           f.search !== '' ||
           f.tags.length > 0;
  });

  const displayList = computed(() => {
    const isFiltered = hasActiveFilters.value;
    const isSorted = sortMode.value !== 'none';
    const f = filters.value;
    
    let result = boxArray.value.map((p, index) => ({ p, index }));

    if (isFiltered) {
      result = result.filter(({ p }) => {
        if (!p) return false;
        const tierInfo = getPokemonTier(p);
        const ivs = p.ivs || {};
        
        // BST calculation using data provider
        const species = pokemonDataProvider.getPokemonData(p.id);
        const bst = species ? ((species.hp||0)+(species.atk||0)+(species.def||0)+(species.spa||0)+(species.spd||0)+(species.spe||0)) : 0;

        if (f.tier !== 'all' && tierInfo.tier !== f.tier) return false;
        if (f.type !== 'all' && p.type !== f.type && p.type2 !== f.type) return false;
        if (p.level < f.levelMin || p.level > f.levelMax) return false;

        if (f.ivAny31 && !Object.values(ivs).some(v => v === 31)) return false;
        
        // IV Range check (All stats)
        const allIvs = [ivs.hp||0, ivs.atk||0, ivs.def||0, ivs.spa||0, ivs.spd||0, ivs.spe||0];
        if (allIvs.some(v => v < f.ivMin || v > f.ivMax)) return false;

        if (bst < f.bstMin || bst > f.bstMax) return false;

        if ((ivs.hp || 0) < f.ivHP) return false;
        if ((ivs.atk || 0) < f.ivATK) return false;
        if ((ivs.def || 0) < f.ivDEF) return false;
        if ((ivs.spa || 0) < f.ivSPA) return false;
        if ((ivs.spd || 0) < f.ivSPD) return false;
        if ((ivs.spe || 0) < f.ivSPE) return false;

        const matchesName = p.name.toLowerCase().includes(f.search.toLowerCase());
        const matchesNick = p.nickname?.toLowerCase().includes(f.search.toLowerCase());
        if (f.search && !matchesName && !matchesNick) return false;

        // Tags Filter
        if (f.tags.length > 0) {
          const pTags = p.tags || [];
          const hasRequiredTag = f.tags.every(t => {
            if (t === 'iv31') return pTags.includes('iv31') || Object.values(ivs).some(v => v === 31);
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
        if (sortMode.value === 'level') cmp = b.p.level - a.p.level;
        else if (sortMode.value === 'tier') cmp = getPokemonTier(b.p).total - getPokemonTier(a.p).total;
        else if (sortMode.value === 'type') cmp = a.p.type.localeCompare(b.p.type);
        else if (sortMode.value === 'pokedex') {
          const idxA = PDEX_ORDER.indexOf(a.p.id);
          const idxB = PDEX_ORDER.indexOf(b.p.id);
          cmp = (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
        }
        else if (sortMode.value === 'bst') {
          const specA = pokemonDataProvider.getPokemonData(a.p.id);
          const specB = pokemonDataProvider.getPokemonData(b.p.id);
          const bstA = specA ? ((specA.hp||0)+(specA.atk||0)+(specA.def||0)+(specA.spa||0)+(specA.spd||0)+(specA.spe||0)) : 0;
          const bstB = specB ? ((specB.hp||0)+(specB.atk||0)+(specB.def||0)+(specB.spa||0)+(specB.spd||0)+(specB.spe||0)) : 0;
          cmp = bstB - bstA;
        }
        return isAsc ? -cmp : cmp;
      });
    }

    return result;
  });

  function resetFilters() {
    filters.value = {
      tier: 'all', type: 'all', levelMin: 1, levelMax: 100,
      ivHP: 0, ivATK: 0, ivDEF: 0, ivSPA: 0, ivSPD: 0, ivSPE: 0,
      ivAny31: false, ivMin: 0, ivMax: 31, ivTotalMin: 0, ivTotalMax: 186,
      bstMin: 0, bstMax: 800,
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
    displayList, // renamed to displayList to match usages if needed, but return original name
    processedBoxList: displayList,
    resetFilters
  };
}
