<script setup lang="ts">
import { computed } from 'vue'
import TrainerAvatar from '@/components/profile/TrainerAvatar.vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { getEloTier } from '@/logic/pvp/rankedEngine'
import { useRankCardHover } from '@/composables/arena/useRankCardHover'
import { useUIStore } from '@/stores/ui'
import type { LeaderboardEntry } from '@/stores/social/social'
import type { RankingSortKey } from '@/types/system/game'

interface Props {
  player: LeaderboardEntry
  index: number
  activeSort: RankingSortKey
}

const props = defineProps<Props>()

const uiStore = useUIStore()
const { handleCardEnter, handleCardLeave } = useRankCardHover()

const getFactionColor = (faction?: string) => {
  const colors: Record<string, string> = {
    union: 'rgba(59, 130, 246, 1)',
    poder: 'rgba(239, 68, 68, 1)',
    rocket: 'rgba(148, 163, 184, 1)',
    magma: 'rgba(239, 68, 68, 1)',
    aqua: 'rgba(59, 130, 246, 1)',
    galactic: 'rgba(167, 139, 250, 1)'
  }
  return colors[faction?.toLowerCase() || ''] || 'rgba(156, 163, 175, 1)'
}

const getFactionLabel = (faction?: string) => {
  if (!faction || faction === 'null' || faction === 'NULL' || faction === 'undefined' || faction.trim() === '') return ''
  const labels: Record<string, string> = {
    union: 'Unión',
    poder: 'Poder',
    rocket: 'Rocket',
    magma: 'Magma',
    aqua: 'Aqua',
    galactic: 'Galactic'
  }
  return labels[faction?.toLowerCase() || ''] || faction
}

const openTrainerProfile = (userId: string) => {
  uiStore.open('TrainerProfile', { userId })
}

const isFactionVisible = computed(() => {
  const f = props.player.faction
  return Boolean(f && f !== 'null' && f !== 'NULL' && f !== 'undefined' && f.trim() !== '')
})

const playerClassText = computed(() => {
  const cls = props.player.playerClass
  return (cls && cls !== 'null' && cls !== 'Null' && cls !== 'NULL') ? cls : 'Entrenador'
})

const scoreText = computed(() => {
  if (props.activeSort === 'elo_rating') return `${props.player.elo} ELO`
  if (props.activeSort === 'trainer_level') return `Nv. ${props.player.level}`
  return `${props.player.badges} Medallas`
})

const eloTier = computed(() => {
  return getEloTier(props.player.elo)
})
</script>

<template>
  <div
    :id="`ranking-modal-card-${player.id}`"
    class="rank-card"
    :class="`rank-${index + 1}`"
    @click.stop="openTrainerProfile(player.id)"
    @mouseenter="handleCardEnter"
    @mouseleave="handleCardLeave"
  >
    <!-- Rank placement indicator -->
    <div class="rank-badge">
      <span
        v-if="index === 0"
        class="emoji crown"
      >🥇</span>
      <span
        v-else-if="index === 1"
        class="emoji crown"
      >🥈</span>
      <span
        v-else-if="index === 2"
        class="emoji crown"
      >🥉</span>
      <span
        v-else
        class="generic-rank text-outline"
      >
        {{ index + 1 }}
      </span>
      <img
        v-if="activeSort === 'elo_rating'"
        :src="getAssetUrl(ASSET_TYPES.RANK, eloTier.id)"
        :alt="eloTier.name"
        class="ranked-medal-mini"
        :title="`Rango: ${eloTier.name}`"
      >
    </div>

    <!-- Avatar -->
    <div class="avatar-container">
      <TrainerAvatar
        :profile="player"
        :size="38"
      >
        <template #overlay>
          <div
            class="status-dot"
            :class="{ online: player.isOnline }"
          />
        </template>
      </TrainerAvatar>
    </div>

    <!-- Player Details -->
    <div class="player-details">
      <div class="player-name-row">
        <span
          v-gsap-nick="player.nick_style || 'normal'"
          class="player-name-text text-outline"
          :class="player.nick_style || 'normal'"
        >
          {{ player.username }}
        </span>
        <span
          v-if="isFactionVisible"
          class="faction-tag-badge"
          :style="{ backgroundColor: getFactionColor(player.faction) }"
        >
          {{ getFactionLabel(player.faction) }}
        </span>
      </div>
      <div class="player-stats-row">
        <span class="player-class-info">{{ playerClassText }}</span>
        <span class="divider">•</span>
        <span class="player-level-info">Nv. {{ player.level }}</span>
      </div>
    </div>

    <!-- Score -->
    <div class="score-badge">
      <span class="score-value text-outline">
        {{ scoreText }}
      </span>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "./RankingPlayerRow.styles.scss" as *;
</style>
