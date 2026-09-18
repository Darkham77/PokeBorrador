<script setup lang="ts">
import { computed } from 'vue';
import type { RouteSpawnTab } from '@/types/pokemon/encounters';

const props = defineProps<{
  mode: RouteSpawnTab;
}>();

const pokemonColLabel = computed(() => {
  if (props.mode === 'pokemon') return 'Pokémon';
  if (props.mode === 'item') return 'Objeto';
  return 'Encuentro';
});

const typesColLabel = computed(() => {
  if (props.mode === 'pokemon') return 'Tipos';
  if (props.mode === 'item') return 'Categoría';
  return 'Tipo / Rol';
});

const showStatusCol = computed(() => {
  return props.mode === 'pokemon' || props.mode === 'npc';
});

const multiplierColLabel = computed(() => {
  return props.mode === 'pokemon' ? 'Clima / Mod' : 'Detalles';
});

const probColLabel = computed(() => {
  return props.mode === 'npc' ? 'Prob. Paso' : 'Prob. Real';
});

const statsColLabel = computed(() => {
  return props.mode === 'pokemon' ? 'Stats' : '-';
});
</script>

<template>
  <div class="report-table-header">
    <div class="col-pokemon">
      {{ pokemonColLabel }}
    </div>
    <div class="col-types">
      {{ typesColLabel }}
    </div>
    <div
      v-if="showStatusCol"
      class="col-type"
    >
      Estado
    </div>
    <div class="col-multiplier">
      {{ multiplierColLabel }}
    </div>
    <div class="col-prob">
      {{ probColLabel }}
    </div>
    <div class="col-stats">
      {{ statsColLabel }}
    </div>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_route-spawns-tables.scss"></style>
