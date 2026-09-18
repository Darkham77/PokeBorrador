<script setup lang="ts">
import RouteSpawnsPokemonRow from './RouteSpawnsPokemonRow.vue';
import type { RouteSpawnMappedItem } from '@/logic/utils/routeSpawnHelpers';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';

interface Props {
  spawnItems: RouteSpawnMappedItem[];
  weatherEmoji: string;
  weatherLabel: string;
  getStatusTooltip: (spawnType: string) => { title: string; desc: string };
  getSpawnTooltip: (item: RouteSpawnMappedItem) => Record<string, unknown>; // open-record: Generic key-value data dictionary container
}

defineProps<Props>();

defineEmits<{
  (e: 'select-pokemon', id: PokemonSpeciesId, isSeen: boolean): void;
}>();
</script>

<template>
  <RouteSpawnsPokemonRow
    v-for="poke in spawnItems"
    :key="poke.id"
    :poke="poke"
    :weather-emoji="weatherEmoji"
    :weather-label="weatherLabel"
    :get-status-tooltip="getStatusTooltip"
    :get-spawn-tooltip="getSpawnTooltip"
    @select-pokemon="(id, isSeen) => $emit('select-pokemon', id, isSeen)"
  />
</template>

<style scoped lang="scss" src="@/styles/components/_route-spawns-tables.scss"></style>
