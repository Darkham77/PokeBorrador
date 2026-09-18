<script setup lang="ts">
/**
 * src/components/map/MapCardCyclePill.vue
 * 
 * Environmental cycle and weather status pill for MapCard header.
 */
import { computed } from 'vue'
import PVTooltip from '@/components/common/PVTooltip.vue'

const props = defineProps<{
  isLocked: boolean
  lockDescription: string
  cycleName: string
  seasonName: string
  weatherName: string
  weatherModifiersDescription: string
  cycleEmoji: string
  seasonEmoji: string
  weatherEmoji: string
}>()

const tooltipClass = computed(() => ['location-tag', props.isLocked ? 'tag-locked' : 'tag-wild'])
const tooltipTitle = computed(() => (props.isLocked ? 'ZONA BLOQUEADA' : 'ESTADO AMBIENTAL'))
const tooltipDesc = computed(() => {
  if (props.isLocked) return props.lockDescription
  return `Ciclo: ${props.cycleName}\nEstación: ${props.seasonName}\nClima: ${props.weatherName}${props.weatherModifiersDescription}`
})
const pillEmoji = computed(() => {
  if (props.isLocked) return '🔒'
  return props.cycleEmoji + props.seasonEmoji + props.weatherEmoji
})
</script>

<template>
  <PVTooltip
    :class="tooltipClass"
    :title="tooltipTitle"
    :description="tooltipDesc"
    position="top"
  >
    <span class="emoji pill-content weather-emoji">
      {{ pillEmoji }}
    </span>
  </PVTooltip>
</template>

<style src="./MapCard.styles.scss" scoped lang="scss"></style>
