<script setup lang="ts">
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import {
  resolveSubCompetitionDirection,
  getSubCompIcon,
  getSubCompTitle,
  type Event as GameEvent,
  type SubCompetitionConfig,
  type ResolvedSubCompetition
} from '@/logic/events/eventEngine'
import type { CompetitionParticipant } from '@/types/system/stores'

interface Props {
  event: GameEvent
  sub: ResolvedSubCompetition | SubCompetitionConfig
  participant: CompetitionParticipant | null
  emptyText?: string
  isInner?: boolean
}

withDefaults(defineProps<Props>(), {
  emptyText: 'Sin Pokémon inscripto',
  isInner: false
})

const emit = defineEmits<{
  openParticipationModal: [sub: ResolvedSubCompetition | SubCompetitionConfig]
}>()

const getMetricDisplay = (sub: SubCompetitionConfig, p: CompetitionParticipant) => {
  const ivs = p.ivs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
  const totalIvs = (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0)

  if (sub.metric === 'total_ivs') {
    return {
      title: 'IVs TOTALES',
      value: p.displayValue || `${totalIvs} / 186 IVs`
    }
  }
  if (sub.metric === 'stat_iv' && sub.targetStat) {
    const statLabels: Record<string, string> = {
      hp: 'HP',
      atk: 'ATK',
      def: 'DEF',
      spa: 'SPA',
      spd: 'SPD',
      spe: 'SPE'
    }
    const statKey = statLabels[sub.targetStat] || sub.targetStat
    return {
      title: `IV EN ${statKey}`,
      value: p.displayValue || `${ivs[sub.targetStat] || 0} / 31 IV`
    }
  }
  if (sub.metric === 'weight') {
    return {
      title: 'PESO',
      value: p.displayValue || `${(p.weight || 0).toFixed(2)} kg`
    }
  }
  if (sub.metric === 'height') {
    return {
      title: 'ALTURA',
      value: p.displayValue || `${(p.height || 0).toFixed(2)} m`
    }
  }
  if (sub.metric === 'level') {
    return {
      title: 'NIVEL',
      value: `Nv. ${p.level ?? 1}`
    }
  }
  return {
    title: 'PUNTOS',
    value: p.displayValue || `${p.score ?? totalIvs} pts`
  }
}
</script>

<template>
  <div
    class="category-slot-card"
    :class="{
      'inner-species-slot': isInner,
      'has-participant': !!participant
    }"
  >
    <!-- Slot Header -->
    <div class="slot-header">
      <div class="slot-header-left">
        <span class="cat-icon">{{ sub.icon || getSubCompIcon(sub.metric) }}</span>
        <span class="cat-title pixelated">{{ getSubCompTitle(event.id, sub) }}</span>
      </div>
      <span class="cat-dir-badge pixelated">
        {{ resolveSubCompetitionDirection(event.id, sub.id, sub.order) === 'min' ? '▼ Menor' : '▲ Mayor' }}
      </span>
    </div>

    <!-- Slot Body: Enrolled Pokemon -->
    <div
      v-if="participant"
      class="slot-enrolled-body"
    >
      <div class="poke-avatar-box">
        <PVSpriteFX
          :is-shiny="participant.isShiny"
          :sparkle-count="2"
        >
          <img
            :src="getAssetUrl(ASSET_TYPES.POKEMON, participant.id, { isShiny: participant.isShiny })"
            alt=""
            class="pixelated poke-img"
            @error="(e: Event) => ((e.target as HTMLImageElement).style.display='none')"
          >
        </PVSpriteFX>
      </div>

      <div class="poke-meta-box">
        <div class="poke-name-row">
          <span class="poke-name-txt">{{ participant.nickname || participant.name }}</span>
          <span
            v-if="participant.isShiny"
            class="poke-shiny-badge"
          >✨</span>
          <span class="poke-lv-badge">Nv. {{ participant.level ?? 1 }}</span>
        </div>
        <div class="metric-highlight-row">
          <span class="metric-val-txt pixelated">{{ getMetricDisplay(sub, participant).value }}</span>
        </div>
      </div>

      <button
        :id="'event-change-btn-' + event.id + '-' + sub.id"
        class="btn-slot-action change pixelated"
        @click.stop="emit('openParticipationModal', sub)"
      >
        CAMBIAR
      </button>
    </div>

    <!-- Slot Body: Empty State -->
    <div
      v-else
      class="slot-empty-body"
      @click.stop="emit('openParticipationModal', sub)"
    >
      <div class="empty-info">
        <span class="empty-plus">+</span>
        <span class="empty-txt pixelated">{{ emptyText }}</span>
      </div>
      <button
        :id="'event-participate-btn-' + event.id + '-' + sub.id"
        class="btn-slot-action inscribe pixelated"
        @click.stop="emit('openParticipationModal', sub)"
      >
        INSCRIBIR
      </button>
    </div>
  </div>
</template>

<style scoped src="./_event_category_slots.scss" lang="scss"></style>
