<script setup lang="ts">
import { computed } from 'vue'
import type { ResolvedSubCompetition, SubCompetitionConfig } from '@/logic/events/eventCompetitions'

const props = defineProps<{
  subCompetition: ResolvedSubCompetition | SubCompetitionConfig
  displayValue: string | number
}>()

const METRIC_ICONS: Record<string, string> = {
  total_ivs: '🧬',
  stat_iv: '🧬',
  weight: '⚖️',
  height: '📏',
  level: '📈',
  friendship: '💖'
}

const competitionMetricIcon = computed(() => {
  return METRIC_ICONS[props.subCompetition.metric] || '🏆'
})

const competitionLabel = computed(() => {
  const dirLabel = props.subCompetition.order === 'min' ? 'Menor' : 'Mayor'
  const m = props.subCompetition.metric
  if (m === 'weight') return `${dirLabel} Peso`
  if (m === 'height') return `${dirLabel} Altura`
  if (m === 'total_ivs') return 'IVs Totales'
  if (m === 'stat_iv' && props.subCompetition.targetStat) return `IV ${props.subCompetition.targetStat.toUpperCase()}`
  if (m === 'level') return `${dirLabel} Nivel`
  if (m === 'friendship') return `${dirLabel} Amistad`
  return props.subCompetition.name || 'Torneo'
})
</script>

<template>
  <div class="competition-item-meta">
    <div class="competition-meta-row">
      <div class="competition-metric-info">
        <span class="emoji competition-icon">{{ competitionMetricIcon }}</span>
        <span class="competition-label">{{ competitionLabel }}:</span>
        <span class="competition-value highlight">{{ displayValue }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped src="../PokemonSelectionItem.styles.scss" lang="scss"></style>
