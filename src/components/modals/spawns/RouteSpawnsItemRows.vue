<script setup lang="ts">
import RouteSpawnsItemRow from './RouteSpawnsItemRow.vue';
import type { ArchaeologyRewardData } from '@/composables/modals/useRouteSpawnsArchaeology';

interface Props {
  archaeologyItems: ArchaeologyRewardData[];
  getCategoryTooltip: (type: string) => { title: string; desc: string };
  getItemTooltip: (item: ArchaeologyRewardData) => Record<string, unknown>; // open-record: Generic key-value data dictionary container
}

defineProps<Props>();
</script>

<template>
  <RouteSpawnsItemRow
    v-for="reward in archaeologyItems"
    :key="reward.name"
    :reward="reward"
    :get-category-tooltip="getCategoryTooltip"
    :get-item-tooltip="getItemTooltip"
  />
</template>

<style scoped lang="scss" src="@/styles/components/_route-spawns-tables.scss"></style>

