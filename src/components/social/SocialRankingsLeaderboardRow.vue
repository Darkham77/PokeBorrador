<script setup lang="ts">
import TrainerAvatar from '@/components/profile/TrainerAvatar.vue'
import { getEloTier } from '@/logic/pvp/rankedEngine'
import type { LeaderboardEntry } from '@/stores/social/social'

const props = defineProps<{
  player: LeaderboardEntry
  index: number
  currentPlayerUid: string
}>()

const emit = defineEmits<{
  (e: 'challenge', player: LeaderboardEntry): void
}>()

const DEFAULT_FACTION_COLOR = 'rgba(156, 163, 175, 1)'

const FACTION_COLORS: Readonly<Record<string, string>> = {
  union: 'rgba(59, 130, 246, 1)',
  poder: 'rgba(239, 68, 68, 1)',
  rocket: 'rgba(148, 163, 184, 1)',
  magma: 'rgba(239, 68, 68, 1)',
  aqua: 'rgba(59, 130, 246, 1)',
  galactic: 'rgba(167, 139, 250, 1)'
}

const FACTION_LABELS: Readonly<Record<string, string>> = {
  union: 'Unión',
  poder: 'Poder',
  rocket: 'Rocket',
  magma: 'Magma',
  aqua: 'Aqua',
  galactic: 'Galactic'
}

const getFactionColor = (faction: string | undefined | null) => {
  if (!faction || faction === 'null' || faction === 'NULL' || faction === 'undefined' || faction.trim() === '') {
    return DEFAULT_FACTION_COLOR
  }
  return FACTION_COLORS[faction.toLowerCase()] || DEFAULT_FACTION_COLOR
}

const getFactionLabel = (faction: string | undefined | null) => {
  if (!faction || faction === 'null' || faction === 'NULL' || faction === 'undefined' || faction.trim() === '') {
    return ''
  }
  return FACTION_LABELS[faction.toLowerCase()] || faction
}

const isFactionValid = (faction: string | undefined | null) => {
  return !!(faction && faction !== 'null' && faction !== 'NULL' && faction !== 'undefined' && faction.trim() !== '' && faction.toLowerCase() !== 'none')
}
</script>

<template>
  <div
    class="rank-card"
    :class="[`rank-${Number(props.index) + 1}`, { 'is-me': props.player.id === props.currentPlayerUid }]"
  >
    <div class="rank-number">
      <span
        v-if="props.index === 0"
        class="medal-icon emoji"
      >🥇</span>
      <span
        v-else-if="props.index === 1"
        class="medal-icon emoji"
      >🥈</span>
      <span
        v-else-if="props.index === 2"
        class="medal-icon emoji"
      >🥉</span>
      <span
        v-else
        class="rank-digits"
      >{{ Number(props.index) + 1 }}</span>
    </div>

    <div class="rank-avatar">
      <TrainerAvatar
        :profile="props.player"
        :size="34"
      />
      <div
        v-if="props.player.isOnline"
        class="online-dot"
        title="Online"
      />
    </div>

    <div class="rank-info">
      <div class="player-name-row">
        <span
          v-gsap-nick="props.player.nick_style || 'normal'"
          class="player-name"
        >
          {{ props.player.username }}
        </span>
        <span
          v-if="props.player.id === props.currentPlayerUid"
          class="me-tag"
        >(TÚ)</span>
        <span
          v-if="isFactionValid(props.player.faction)"
          class="faction-tag"
          :style="{ backgroundColor: getFactionColor(props.player.faction) }"
        >
          {{ getFactionLabel(props.player.faction) }}
        </span>
      </div>
      <div class="player-meta">
        <span class="m-badge-level">Nv. {{ props.player.level }}</span> ·
        <span class="elo-val">{{ props.player.elo }} LP</span> ·
        <span class="tier-tag">{{ getEloTier(props.player.elo).name }}</span>
      </div>
    </div>

    <div class="rank-actions">
      <button
        v-if="props.player.id !== props.currentPlayerUid"
        :id="`btn-challenge-player-${props.player.id}`"
        v-gsap-hover="'button'"
        class="btn-challenge"
        title="Desafiar en PvP"
        @click="emit('challenge', props.player)"
      >
        <span class="emoji">⚔️</span>
      </button>
    </div>
  </div>
</template>

<style scoped src="./SocialRankings.styles.scss" lang="scss"></style>
