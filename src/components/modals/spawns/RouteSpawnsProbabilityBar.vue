<script setup lang="ts">
/**
 * src/components/modals/spawns/RouteSpawnsProbabilityBar.vue
 * 
 * Visual probability and progress bar for route spawn items.
 */

import { computed } from 'vue';
import type { RouteSpawnMappedItem } from '@/logic/utils/routeSpawnHelpers.ts';
import PVTooltip from '@/components/common/PVTooltip.vue';
import { PROBABILITY_BAR_SCALE_FACTOR } from '@/logic/constants/encounters';

const props = defineProps<{
  poke: RouteSpawnMappedItem;
  getSpawnTooltip: (item: RouteSpawnMappedItem) => Record<string, unknown>; // open-record: Generic key-value data dictionary container
}>();

const diffPositive = computed(() => props.poke.diff > 0);
const diffNegative = computed(() => props.poke.diff < 0);

const baseFillWidth = computed(() => {
  if (props.poke.spawnType === 'Común') {
    return `${props.poke.percentage * PROBABILITY_BAR_SCALE_FACTOR}%`;
  }
  return `${props.poke.basePercentage * PROBABILITY_BAR_SCALE_FACTOR}%`;
});

const extraFillWidth = computed(() => `${props.poke.diff * PROBABILITY_BAR_SCALE_FACTOR}%`);
const reducedFillWidth = computed(() => `${props.poke.percentage * PROBABILITY_BAR_SCALE_FACTOR}%`);
const lostFillWidth = computed(() => `${Math.abs(props.poke.diff) * PROBABILITY_BAR_SCALE_FACTOR}%`);
</script>

<template>
  <PVTooltip
    v-bind="getSpawnTooltip(poke)"
    tag="div"
    style="width: 100%;"
  >
    <div class="prob-bar-wrapper">
      <div class="prob-numerical">
        <span class="active-prob">
          {{ poke.percentage.toFixed(1) }}%
          <span
            v-if="poke.diff !== 0 && poke.spawnType !== 'Común'"
            :class="['diff-text', diffPositive ? 'boosted' : 'debuffed']"
          >
            ({{ diffPositive ? '+' : '' }}{{ poke.diff.toFixed(1) }}%)
          </span>
        </span>
      </div>
      <div class="prob-visual-progress">
        <template v-if="poke.spawnType === 'Común'">
          <div
            class="fill base-fill"
            :style="{ width: baseFillWidth }"
          />
        </template>
        <template v-else>
          <div
            v-if="poke.diff >= 0"
            class="fill base-fill"
            :style="{ width: baseFillWidth }"
          />
          <div
            v-if="diffPositive"
            class="fill extra-fill"
            :style="{ width: extraFillWidth }"
          />
          <div
            v-if="diffNegative"
            class="fill base-fill-reduced"
            :style="{ width: reducedFillWidth }"
          />
          <div
            v-if="diffNegative"
            class="fill lost-fill"
            :style="{ width: lostFillWidth }"
          />
        </template>
      </div>
    </div>
  </PVTooltip>
</template>

<style scoped lang="scss" src="@/styles/components/_route-spawns-tables.scss"></style>
