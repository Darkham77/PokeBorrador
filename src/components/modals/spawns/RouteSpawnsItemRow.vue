<script setup lang="ts">
/**
 * src/components/modals/spawns/RouteSpawnsItemRow.vue
 *
 * Atomic row component rendering a single archaeology reward entry in the route spawns table.
 */
import { computed } from 'vue';
import PVTooltip from '@/components/common/PVTooltip.vue';
import type { ArchaeologyRewardData } from '@/composables/modals/useRouteSpawnsArchaeology';
import { PROBABILITY_BAR_SCALE_FACTOR } from '@/logic/constants/encounters';

const DELTA_THRESHOLD = 0.05;

interface Props {
  reward: ArchaeologyRewardData;
  getCategoryTooltip: (type: string) => { title: string; desc: string };
  getItemTooltip: (item: ArchaeologyRewardData) => Record<string, unknown>; // open-record: Generic key-value data dictionary container
}

const props = defineProps<Props>();

const diff = computed(() => props.reward.percentage - props.reward.basePercentage);
const hasDelta = computed(() => Math.abs(diff.value) > DELTA_THRESHOLD);
const isPositiveDelta = computed(() => diff.value > 0);

const deltaText = computed(() => {
  const sign = isPositiveDelta.value ? '+' : '';
  return `(${sign}${diff.value.toFixed(1)}%)`;
});

const baseFillWidth = computed(() => {
  if (!hasDelta.value) {
    return `${props.reward.percentage * PROBABILITY_BAR_SCALE_FACTOR}%`;
  }
  return `${props.reward.basePercentage * PROBABILITY_BAR_SCALE_FACTOR}%`;
});

const extraFillWidth = computed(() => `${diff.value * PROBABILITY_BAR_SCALE_FACTOR}%`);
const reducedFillWidth = computed(() => `${props.reward.percentage * PROBABILITY_BAR_SCALE_FACTOR}%`);
const lostFillWidth = computed(() => `${Math.abs(diff.value) * PROBABILITY_BAR_SCALE_FACTOR}%`);
</script>

<template>
  <div
    class="report-row"
    :class="reward.statusClass"
  >
    <!-- Item Info -->
    <div class="col-pokemon row-cell flex-align">
      <div class="mini-sprite-wrapper">
        <img
          :src="reward.sprite"
          :alt="reward.name"
          class="mini-sprite"
          style="object-fit: contain; width: 24px; height: 24px;"
        >
      </div>
      <div class="poke-name-wrap">
        <span
          class="poke-name"
          style="font-size: 11px; line-height: 1.4;"
        >
          {{ reward.name }}
        </span>
      </div>
    </div>

    <!-- Category -->
    <div class="col-types row-cell flex-align">
      <PVTooltip
        v-if="getCategoryTooltip"
        :title="getCategoryTooltip(reward.type).title"
        :description="getCategoryTooltip(reward.type).desc"
      >
        <span
          class="status-tag"
          :class="reward.statusClass"
          style="font-size: 9px; padding: 2px 4px;"
        >
          {{ reward.type }}
        </span>
      </PVTooltip>
    </div>

    <!-- Details/Description -->
    <div
      class="col-multiplier row-cell flex-align"
      style="font-size: 9px; opacity: 0.8; white-space: normal; line-height: 1.2;"
    >
      {{ reward.description || 'Fósil desenterrable en la zona' }}
    </div>

    <!-- Probability -->
    <div class="col-prob row-cell flex-align">
      <PVTooltip
        v-bind="getItemTooltip(reward)"
        tag="div"
        style="width: 100%;"
      >
        <div class="prob-bar-wrapper">
          <div class="prob-numerical">
            <span class="active-prob">
              {{ reward.percentage.toFixed(1) }}%
            </span>
            <span
              v-if="hasDelta"
              class="delta-text"
              :class="isPositiveDelta ? 'positive' : 'negative'"
              style="font-size: 8px; margin-left: 4px;"
            >
              {{ deltaText }}
            </span>
          </div>
          <div class="prob-visual-progress">
            <template v-if="!hasDelta">
              <div
                class="fill base-fill"
                :style="{ width: baseFillWidth }"
              />
            </template>
            <template v-else>
              <div
                v-if="diff >= 0"
                class="fill base-fill"
                :style="{ width: baseFillWidth }"
              />
              <div
                v-if="isPositiveDelta"
                class="fill extra-fill"
                :style="{ width: extraFillWidth }"
              />
              <div
                v-if="!isPositiveDelta"
                class="fill base-fill-reduced"
                :style="{ width: reducedFillWidth }"
              />
              <div
                v-if="!isPositiveDelta"
                class="fill lost-fill"
                :style="{ width: lostFillWidth }"
              />
            </template>
          </div>
        </div>
      </PVTooltip>
    </div>

    <!-- Stats placeholder alignment -->
    <div class="col-stats row-cell flex-align text-center">
      <span class="neutral-text">-</span>
    </div>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_route-spawns-tables.scss"></style>
