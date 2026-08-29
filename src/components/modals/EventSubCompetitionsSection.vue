<script setup lang="ts">
import type { ResolvedSubCompetition, SubCompetitionConfig } from '@/logic/events/eventEngine'
import { resolveSubCompetitionDirection } from '@/logic/events/eventEngine'
import RewardPillsGroup from '@/components/shared/RewardPillsGroup.vue'

interface Prize extends Record<string, unknown> { // open-record
  type?: 'money' | 'bc' | 'item' | 'pokemon' | 'mixed'
  amount?: number
  qty?: number
  money?: number
  battleCoins?: number
  item?: string
  items?: Record<string, number>
  species?: string
  shiny?: boolean
  level?: number
}

interface Props {
  eventId: string
  subCompetitions: ResolvedSubCompetition[]
  prizes?: { first?: Prize, second?: Prize, third?: Prize } | null
}

const props = defineProps<Props>()

const getSubCompDefaultIcon = (catId: string) => {
  if (catId.startsWith('ivs')) return '🧬'
  if (catId.startsWith('weight')) return '⚖️'
  if (catId.startsWith('height')) return '📏'
  if (catId.startsWith('level')) return '📈'
  if (catId.startsWith('friendship')) return '💖'
  return '🏆'
}

const getSubCompTitle = (sub: ResolvedSubCompetition | SubCompetitionConfig) => {
  const dir = resolveSubCompetitionDirection(props.eventId, sub.id, sub.order)
  const speciesSuffix = ('targetSpecies' in sub && sub.targetSpecies) ? ` (${sub.targetSpecies})` : '' // domain-ok
  if (sub.metric === 'total_ivs') {
    return 'Mayor cantidad de IVs totales (0 a 186) · Todas las especies'
  }
  if (sub.metric === 'stat_iv' && sub.targetStat) {
    return `Mayor IV en ${sub.targetStat.toUpperCase()}${speciesSuffix}` // domain-ok
  }
  if (sub.metric === 'weight') {
    return dir === 'max' ? `Mayor Peso (Titán / XXL)${speciesSuffix}` : `Menor Peso (Miniatura / XXS)${speciesSuffix}`
  }
  if (sub.metric === 'height') {
    return dir === 'max' ? `Mayor Altura (Gran Salto / XXL)${speciesSuffix}` : `Menor Altura (Miniatura / XXS)${speciesSuffix}`
  }
  if (sub.metric === 'level') {
    return dir === 'max' ? `Mayor Nivel${speciesSuffix}` : `Menor Nivel${speciesSuffix}`
  }
  if (sub.metric === 'friendship') {
    return dir === 'max' ? `Mayor Amistad${speciesSuffix}` : `Menor Amistad${speciesSuffix}`
  }
  return sub.description || sub.name || 'Criterio de evaluación'
}

const getSubCompPrizes = (sub: SubCompetitionConfig): { first?: Prize, second?: Prize, third?: Prize } | null => {
  if (sub.prizes && (sub.prizes.first || sub.prizes.second || sub.prizes.third)) {
    return sub.prizes as { first?: Prize, second?: Prize, third?: Prize }
  }
  return props.prizes || null
}
</script>

<template>
  <!-- Sub-Competencias y Premios -->
  <div 
    v-if="subCompetitions.length" 
    class="event-section"
  >
    <div class="section-tag">
      🏆 SUB-COMPETENCIAS Y PREMIOS
    </div>
    <div class="sub-comp-rule-note">
      <span class="note-icon">⚠️</span>
      <span>Cada Pokémon solo puede participar en una única categoría por evento.</span>
    </div>
    <div class="sub-competitions-container">
      <div 
        v-for="sub in subCompetitions" 
        :key="sub.id"
        class="sub-competition-detail-card"
      >
        <div class="sub-comp-header">
          <span class="sub-comp-icon">{{ sub.icon || getSubCompDefaultIcon(sub.id) }}</span>
          <span class="sub-comp-name pixelated">{{ getSubCompTitle(sub) }}</span>
        </div>

        <!-- Prizes for this sub-competition -->
        <div 
          v-if="getSubCompPrizes(sub)" 
          class="sub-prizes-list"
        >
          <div 
            v-if="getSubCompPrizes(sub)?.first" 
            class="sub-prize-row gold"
          >
            <div class="rank-badge pixelated">
              🥇 1°
            </div>
            <RewardPillsGroup
              :prize="getSubCompPrizes(sub)!.first"
              size="sm"
            />
          </div>
          <div 
            v-if="getSubCompPrizes(sub)?.second" 
            class="sub-prize-row silver"
          >
            <div class="rank-badge pixelated">
              🥈 2°
            </div>
            <RewardPillsGroup
              :prize="getSubCompPrizes(sub)!.second"
              size="sm"
            />
          </div>
          <div 
            v-if="getSubCompPrizes(sub)?.third" 
            class="sub-prize-row bronze"
          >
            <div class="rank-badge pixelated">
              🥉 3°
            </div>
            <RewardPillsGroup
              :prize="getSubCompPrizes(sub)!.third"
              size="sm"
            />
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Premios Globales Simples (si no hay sub-competencias) -->
  <div 
    v-else-if="prizes" 
    class="event-section"
  >
    <div class="section-tag">
      🏆 PREMIOS DEL PODIO
    </div>
    <div class="prizes-container">
      <div 
        v-if="prizes.first" 
        class="sub-prize-row gold"
      >
        <div class="rank-badge pixelated">
          🥇 1°
        </div>
        <RewardPillsGroup
          :prize="prizes.first"
          size="sm"
        />
      </div>
      <div 
        v-if="prizes.second" 
        class="sub-prize-row silver"
      >
        <div class="rank-badge pixelated">
          🥈 2°
        </div>
        <RewardPillsGroup
          :prize="prizes.second"
          size="sm"
        />
      </div>
      <div 
        v-if="prizes.third" 
        class="sub-prize-row bronze"
      >
        <div class="rank-badge pixelated">
          🥉 3°
        </div>
        <RewardPillsGroup
          :prize="prizes.third"
          size="sm"
        />
      </div>
    </div>
  </div>
</template>
