<script setup lang="ts">
import type { NpcChanceInfo } from '@/logic/weather/weatherUtils';
import RouteSpawnsNpcRow from './RouteSpawnsNpcRow.vue';

interface Props {
  npcItems: NpcChanceInfo[];
}

defineProps<Props>();
</script>

<template>
  <RouteSpawnsNpcRow
    v-for="npc in npcItems"
    :key="npc.type"
    :npc="npc"
  />
</template>

<style scoped lang="scss" src="@/styles/components/_route-spawns-tables.scss"></style>
