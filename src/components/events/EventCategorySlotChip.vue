<script setup lang="ts">
import { computed } from 'vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import {
  resolveSubCompetitionDirection,
  getSubCompTitle,
  getSubCompDescription,
  getSubCompIcon,
  type ResolvedSubCompetition
} from '@/logic/events/eventEngine'
import type { CompetitionParticipant } from '@/types/system/stores'

interface Props {
  sub: ResolvedSubCompetition
  eventId: string
  participant: CompetitionParticipant | null
  idPrefix?: string
}

const props = withDefaults(defineProps<Props>(), {
  idPrefix: ''
})

const emit = defineEmits<{
  (e: 'click', sub: ResolvedSubCompetition): void
}>()

const metricLabel = computed<string>(() => {
  const sub = props.sub
  const dir = resolveSubCompetitionDirection(props.eventId, sub.id, sub.order)
  if (sub.metric === 'total_ivs') return 'Mayor IVs'
  if (sub.metric === 'stat_iv' && sub.targetStat) return `Mayor ${sub.targetStat.toUpperCase()}`
  if (sub.metric === 'weight') return dir === 'max' ? 'Mayor Peso' : 'Menor Peso'
  if (sub.metric === 'height') return dir === 'max' ? 'Mayor Altura' : 'Menor Altura'
  if (sub.metric === 'level') return dir === 'max' ? 'Mayor Nivel' : 'Menor Nivel'
  if (sub.metric === 'friendship') return dir === 'max' ? 'Mayor Amistad' : 'Menor Amistad'
  return sub.name
})
</script>

<template>
  <PVTooltip
    :title="getSubCompTitle(props.eventId, props.sub)"
    :description="getSubCompDescription(props.eventId, props.sub)"
    position="top"
  >
    <button
      :id="props.idPrefix + 'comp-slot-chip-' + props.eventId + '-' + props.sub.id"
      type="button"
      class="comp-slot-chip pixelated"
      :class="{ enrolled: Boolean(props.participant) }"
      @click.stop="emit('click', props.sub)"
    >
      <div class="chip-content">
        <!-- Metric Icon (🧬 Genética, ⚖️ Peso, 📏 Altura, etc.) -->
        <span class="chip-metric-icon">
          <span class="emoji">{{ props.sub.icon || getSubCompIcon(props.sub.metric) }}</span>
        </span>
        
        <!-- Clean Metric Name (IVs / Peso / Altura) -->
        <span class="chip-metric">{{ metricLabel }}</span>
      </div>

      <!-- Simple Status Badge (+ or ✓) -->
      <span class="chip-status-pill">
        <span class="emoji">{{ props.participant ? '✓' : '+' }}</span>
      </span>
    </button>
  </PVTooltip>
</template>

<style scoped src="./EventCardCategoryPreview.styles.scss" lang="scss"></style>
