<script setup lang="ts">
import { ref, computed } from 'vue';
import { PDEX_TYPE_COLORS } from '@/logic/constants/pokedexConstants';
import { GAME_TMS, TM_COMPAT_SETS } from '@/data/pokemon/pokedex';
import { useUIStore } from '@/stores/ui';
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue';
import { toPokemonType } from '@/data/battle/types';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';

interface Props {
  speciesId: PokemonSpeciesId;
}

const props = defineProps<Props>();

const ui = useUIStore();

const tmSearchQuery = ref('');
const tmSortBy = ref('id');

const tms = computed(() => {
  const compatSet = TM_COMPAT_SETS[props.speciesId];

  const allTms = GAME_TMS.map((tm) => ({
    ...tm,
    isCompatible: compatSet?.has(tm.id) ?? false
  }));

  let filtered = allTms;
  if (tmSearchQuery.value) {
    const q = tmSearchQuery.value.toLowerCase();
    filtered = allTms.filter(
      (tm) => tm.name.toLowerCase().includes(q) || tm.id.toLowerCase().includes(q)
    );
  }

  return filtered.toSorted((a, b) => {
    if (tmSortBy.value === 'name') return a.name.localeCompare(b.name);
    return a.id.localeCompare(b.id, undefined, { numeric: true });
  });
});
</script>

<template>
  <div class="tab-pane tms-pane">
    <div class="tm-controls">
      <div class="search-box">
        <span class="emoji">🔍</span>
        <input
          id="pokemon-tms-tab-input-tmsearchquery"
          v-model="tmSearchQuery"
          type="text"
          aria-label="Buscar Máquina Técnica (MT)"
          placeholder="Buscar MT..."
          class="tm-search-input"
        />
      </div>
      <div class="sort-box">
        <button
          id="pokemon-tms-tab-btn-id"
          class="sort-btn"
          :class="{ active: tmSortBy === 'id' }"
          @click.stop="tmSortBy = 'id'"
        >
          ID
        </button>
        <button
          id="pokemon-tms-tab-btn-abc"
          class="sort-btn"
          :class="{ active: tmSortBy === 'name' }"
          @click.stop="tmSortBy = 'name'"
        >
          ABC
        </button>
      </div>
    </div>

    <div class="tm-grid">
      <div
        v-for="tm in tms"
        id="pokemon-tms-tab-div-1"
        :key="tm.id"
        role="button"
        tabindex="0"
        class="tm-item clickable-item"
        :class="{ incompatible: !tm.isCompatible }"
        @click.stop="ui.openMoveDetail(tm.moveId)"
      >
        <div class="tm-id" :style="{ background: PDEX_TYPE_COLORS[toPokemonType(tm.type)] }">
          {{ tm.id }}
        </div>
        <div class="tm-info">
          <span class="tm-name">{{ tm.name }}</span>
          <PokemonTypeTag :type="toPokemonType(tm.type)" size="sm" />
        </div>
        <div class="tm-check">
          <span class="emoji">{{ tm.isCompatible ? '✓' : '✕' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@use '@/styles/components/pokedex-detail';
</style>
