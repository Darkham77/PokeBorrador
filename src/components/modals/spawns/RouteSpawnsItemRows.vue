<script setup lang="ts">
import PVTooltip from '@/components/common/PVTooltip.vue';
import type { ArchaeologyRewardData } from '@/composables/modals/useRouteSpawnsArchaeology';

interface Props {
  archaeologyItems: ArchaeologyRewardData[];
  getCategoryTooltip: (type: string) => { title: string; desc: string };
  getItemTooltip: (item: ArchaeologyRewardData) => Record<string, unknown>; // open-record
}

defineProps<Props>();
</script>

<template>
  <div
    v-for="reward in archaeologyItems"
    :key="reward.name"
    class="report-row"
    :class="reward.statusClass"
  >
    <!-- Item Info -->
    <div class="col-pokemon row-cell flex-align">
      <div class="mini-sprite-wrapper">
        <img
          :src="reward.sprite"
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
              v-if="Math.abs(reward.percentage - reward.basePercentage) > 0.05"
              class="delta-text"
              :class="reward.percentage > reward.basePercentage ? 'positive' : 'negative'"
              style="font-size: 8px; margin-left: 4px;"
            >
              ({{ (reward.percentage > reward.basePercentage ? '+' : '') }}{{ (reward.percentage - reward.basePercentage).toFixed(1) }}%)
            </span>
          </div>
          <div class="prob-visual-progress">
            <template v-if="Math.abs(reward.percentage - reward.basePercentage) < 0.05">
              <div
                class="fill base-fill"
                :style="{ width: `${reward.percentage * 2.5}%` }"
              />
            </template>
            <template v-else>
              <div
                v-if="reward.percentage >= reward.basePercentage"
                class="fill base-fill"
                :style="{ width: `${reward.basePercentage * 2.5}%` }"
              />
              <div
                v-if="reward.percentage > reward.basePercentage"
                class="fill extra-fill"
                :style="{ width: `${(reward.percentage - reward.basePercentage) * 2.5}%` }"
              />
              <div
                v-if="reward.percentage < reward.basePercentage"
                class="fill base-fill-reduced"
                :style="{ width: `${reward.percentage * 2.5}%` }"
              />
              <div
                v-if="reward.percentage < reward.basePercentage"
                class="fill lost-fill"
                :style="{ width: `${(reward.basePercentage - reward.percentage) * 2.5}%` }"
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
