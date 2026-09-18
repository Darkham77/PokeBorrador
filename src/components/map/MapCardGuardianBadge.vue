<script setup lang="ts">
/**
 * src/components/map/MapCardGuardianBadge.vue
 * 
 * Renders the top-left route guardian Pokémon status badge in MapCard.
 */

import { computed } from 'vue';
import PVTooltip from '@/components/common/PVTooltip.vue';

interface ProcessedGuardianInfo {
  id: string;
  isSeen: boolean;
  isCaught: boolean;
  name: string;
  typeInfo: string;
  captured: boolean;
  sprite: string;
  seed: number;
}

const props = defineProps<{
  guardian: ProcessedGuardianInfo;
  processedSprite?: string | null;
}>();

const tooltipTitle = computed(() => {
  if (!props.guardian.isSeen) return 'POKÉMON DESCONOCIDO';
  return props.guardian.captured ? 'GUARDIÁN DERROTADO' : 'POKÉMON GUARDIÁN';
});

const tooltipDesc = computed(() => {
  if (props.guardian.captured) {
    return 'El protector de esta ruta ha sido vencido, permitiendo que una facción tome el control total.';
  }
  const seenSnippet = props.guardian.isSeen
    ? `Es un ${props.guardian.name} (${props.guardian.typeInfo}). `
    : '';
  return `Un Pokémon poderoso que protege la ruta. ${seenSnippet}Derrótalo para liberar la zona y permitir que tu facción la domine, activando bonus de captura.`;
});

const effectiveSprite = computed(() => {
  return props.processedSprite || props.guardian.sprite;
});
</script>

<template>
  <PVTooltip
    class="guardian-status-badge"
    :title="tooltipTitle"
    :description="tooltipDesc"
    position="top"
  >
    <div class="spawn-atmosphere-wrapper">
      <img 
        :src="effectiveSprite" 
        :alt="guardian.isSeen ? guardian.name : 'Pokémon Guardián'"
        class="guardian-mini-sprite" 
        :class="{ 
          captured: guardian.captured, 
          'spawn-silhouette': !processedSprite && !guardian.isCaught,
          'is-pre-rendered': !!processedSprite 
        }"
        :style="{ '--spawn-seed': guardian.seed }"
        @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
      >
    </div>
    <span :class="['guardian-label', { captured: guardian.captured }]">
      {{ guardian.captured ? 'DERROTADO' : 'GUARDIÁN' }}
    </span>
  </PVTooltip>
</template>

<style scoped src="./MapCard.styles.scss" lang="scss"></style>
