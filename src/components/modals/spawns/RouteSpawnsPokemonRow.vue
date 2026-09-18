<script setup lang="ts">
/**
 * src/components/modals/spawns/RouteSpawnsPokemonRow.vue
 * 
 * Atomic row representation for route spawn Pokémon list.
 */

import { computed } from 'vue';
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue';
import PVTooltip from '@/components/common/PVTooltip.vue';
import { toPokemonType } from '@/data/battle/types';
import type { RouteSpawnMappedItem } from '@/logic/utils/routeSpawnHelpers';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';

import RouteSpawnsProbabilityBar from './RouteSpawnsProbabilityBar.vue';

interface Props {
  poke: RouteSpawnMappedItem;
  weatherEmoji: string;
  weatherLabel: string;
  getStatusTooltip?: (spawnType: string) => { title: string; desc: string };
  getSpawnTooltip: (item: RouteSpawnMappedItem) => Record<string, unknown>; // open-record: Generic key-value data dictionary container
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'select-pokemon', id: PokemonSpeciesId, isSeen: boolean): void;
}>();

const tooltipInfo = computed(() => {
  if (!props.getStatusTooltip) return { title: '', desc: '' };
  return props.getStatusTooltip(props.poke.spawnType);
});

const isEventShiny = computed(() => {
  return props.poke.isEventBoosted && props.poke.eventShinyMult && props.poke.eventShinyMult > 1;
});

const isEventRate = computed(() => {
  return props.poke.isEventBoosted && props.poke.eventRateMult && props.poke.eventRateMult > 1;
});

const isVisitorOrExclusive = computed(() => {
  return props.poke.spawnType === 'Visitante' || props.poke.spawnType === 'Exclusivo';
});

const multiplierClass = computed(() => {
  if (props.poke.multiplier === 0) return 'blocked';
  return props.poke.multiplier > 1 ? 'buffed' : 'debuffed';
});

const statusTagLabel = computed(() => {
  if (props.poke.isEventBoosted) {
    if (isEventShiny.value) return `✨ x${props.poke.eventShinyMult} Shiny`;
    if (isEventRate.value) return `🎯 x${props.poke.eventRateMult} Spawn`;
    return '🎉 Evento';
  }
  return props.poke.spawnType;
});

const multiplierDisplayText = computed(() => {
  if (isEventRate.value) return `🎯 x${props.poke.eventRateMult}`;
  if (isVisitorOrExclusive.value) return `${props.weatherEmoji} ${props.weatherLabel}`;
  if (props.poke.multiplier === 0) return 'Bloqueado';
  if (props.poke.multiplier !== 1) return `x${props.poke.multiplier}`;
  return '-';
});

const multiplierBadgeClass = computed(() => {
  if (isEventRate.value) return 'status-tag event-boosted';
  if (isVisitorOrExclusive.value) return `status-tag ${props.poke.statusClass}`;
  if (props.poke.multiplier === 0) return 'status-tag blocked';
  if (props.poke.multiplier !== 1) return `status-tag ${multiplierClass.value}`;
  return 'mult-value neutral-text';
});

function handleClick() {
  emit('select-pokemon', props.poke.id, props.poke.isSeen);
}
</script>

<template>
  <div
    class="report-row"
    :class="[poke.statusClass, { 'is-unseen': !poke.isSeen }]"
    :style="{ cursor: poke.isSeen ? 'pointer' : 'default' }"
    @click="handleClick"
  >
    <!-- Pokémon Info (Icon, Name, Caught) -->
    <div class="col-pokemon row-cell flex-align">
      <div class="mini-sprite-wrapper">
        <img
          v-if="poke.isSeen"
          :src="poke.sprite"
          :alt="poke.isSeen ? poke.name : 'Pokémon desconocido'"
          class="mini-sprite"
          :class="{ 'spawn-silhouette': !poke.isCaught }"
        >
        <div
          v-else
          class="unknown-placeholder"
        >
          ?
        </div>
      </div>
      <div class="poke-name-wrap">
        <span class="poke-name">{{ poke.name }}</span>
        <span
          v-if="!poke.isSeen"
          class="unseen-tag"
        >? NO VISTO</span>
      </div>
    </div>

    <!-- Types -->
    <div class="col-types row-cell flex-align">
      <template v-if="poke.isSeen && poke.types.length">
        <PokemonTypeTag
          v-for="t in poke.types"
          :key="t"
          :type="toPokemonType(t)"
          size="ssm"
        />
      </template>
      <span
        v-else
        class="hidden-info-placeholder"
      >???</span>
    </div>

    <!-- Spawn Status Type -->
    <div class="col-type row-cell flex-align">
      <PVTooltip
        v-if="getStatusTooltip"
        :title="tooltipInfo.title"
        :description="tooltipInfo.desc"
      >
        <span :class="['status-tag', poke.statusClass]">
          {{ statusTagLabel }}
        </span>
      </PVTooltip>
    </div>

    <!-- Climate Multiplier / Event -->
    <div class="col-multiplier row-cell flex-align text-center">
      <span :class="multiplierBadgeClass">
        {{ multiplierDisplayText }}
      </span>
    </div>

    <!-- Probability -->
    <div class="col-prob row-cell flex-align">
      <RouteSpawnsProbabilityBar
        :poke="poke"
        :get-spawn-tooltip="getSpawnTooltip"
      />
    </div>

    <!-- Base Stats -->
    <div class="col-stats row-cell flex-align text-center">
      <span
        v-if="poke.isSeen"
        class="stat-total-value"
      >
        {{ poke.totalStats }}
      </span>
      <span
        v-else
        class="hidden-info-placeholder"
      >???</span>
    </div>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_route-spawns-tables.scss"></style>
