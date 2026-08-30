<script setup lang="ts">
import type { PastCompetitionWinner } from '@/types/system/stores'
import TrainerAvatar from '@/components/profile/TrainerAvatar.vue'
import { useUIStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { useChatCosmeticsStore } from '@/stores/social/chatCosmetics'
import { getTierFromTotalIvs } from '@/logic/pokemon/tierEngine'
import { getPhysicalDimensionTier } from '@/logic/pokemon/physicalDimensionsMath'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'

interface Props {
  winner: PastCompetitionWinner
  categoryId: string
  rankIndex: number
}

defineProps<Props>()

const uiStore = useUIStore()
const authStore = useAuthStore()
const gameStore = useGameStore()
const chatCosmetics = useChatCosmeticsStore()

const openTrainerProfile = (userId?: string) => {
  if (userId) {
    uiStore.open('TrainerProfile', { userId })
  }
}

const getWinnerProfile = (w: PastCompetitionWinner) => {
  if (authStore.user?.id && w.player_id === authStore.user.id) {
    return {
      playerClass: gameStore.state.playerClass || 'entrenador',
      level: gameStore.state.trainerLevel || 1,
      avatarStyle: gameStore.state.avatar_style || '',
      nick_style: gameStore.state.nick_style || '',
      gender: gameStore.state.gender || 'h'
    }
  }
  const cached = chatCosmetics.profileCosmetics[w.player_id]
  const entryData = w.entry_data
  return {
    playerClass: cached?.player_class || w.player_class || entryData?.player_class || 'entrenador',
    level: cached?.trainer_level || w.player_level || entryData?.trainer_level || 1,
    avatarStyle: cached?.avatar_style || w.avatar_style || entryData?.avatar_style || '',
    nick_style: cached?.nick_style || w.nick_style || entryData?.nick_style || '',
    gender: cached?.gender || w.gender || entryData?.gender || 'h'
  }
}

const getWinnerNickStyle = (w: PastCompetitionWinner): string => {
  if (authStore.user?.id && w.player_id === authStore.user.id) {
    return gameStore.state.nick_style || 'normal'
  }
  const cached = chatCosmetics.profileCosmetics[w.player_id]
  const entryData = w.entry_data
  return cached?.nick_style || w.nick_style || entryData?.nick_style || 'normal'
}

const getWinnerName = (w: PastCompetitionWinner): string => {
  if (authStore.user?.id && w.player_id === authStore.user.id) {
    return gameStore.state.trainer || w.player_name || 'Entrenador'
  }
  const cached = chatCosmetics.profileCosmetics[w.player_id]
  return cached?.username || w.player_name || 'Entrenador'
}

const formatWinnerMetric = (w: PastCompetitionWinner, catId: string): string => {
  const data = w.entry_data

  if (catId === 'ivs') {
    const score = Number(w.score ?? data?.total_ivs ?? 0)
    const tierLabel = data?.tier_label || getTierFromTotalIvs(score).tier
    return `${score} / 186 IVs (${tierLabel})`
  }

  if (catId === 'weight') {
    const score = Number(w.score ?? data?.weight ?? 0)
    const speciesId = data?.species ? String(data.species) : undefined
    const spec = speciesId ? pokemonDataProvider.getPokemonData(speciesId, true) : null
    const baseWeight = spec?.weight || null
    const tier = baseWeight ? getPhysicalDimensionTier(score, baseWeight) : null

    const maxTarget = baseWeight ? (baseWeight * 1.15).toFixed(1) : null
    const minTarget = baseWeight ? (baseWeight * 0.85).toFixed(1) : null
    const isMinCategory = (w.category_name || '').toLowerCase().includes('miniatura') || (w.category_id || '').toLowerCase().includes('min')
    const targetRef = isMinCategory ? minTarget : maxTarget

    const tierStr = tier ? ` (${tier.label} · ${tier.name})` : data?.tier_label ? ` (${data.tier_label})` : ''
    const targetStr = targetRef ? ` / ${targetRef} kg` : ''
    return `${score.toFixed(1)} kg${targetStr}${tierStr}`
  }

  if (catId === 'height') {
    const score = Number(w.score ?? data?.height ?? 0)
    const speciesId = data?.species ? String(data.species) : undefined
    const spec = speciesId ? pokemonDataProvider.getPokemonData(speciesId, true) : null
    const baseHeight = spec?.height || null
    const tier = baseHeight ? getPhysicalDimensionTier(score, baseHeight) : null

    const maxTarget = baseHeight ? (baseHeight * 1.15).toFixed(1) : null
    const minTarget = baseHeight ? (baseHeight * 0.85).toFixed(1) : null
    const isMinCategory = (w.category_name || '').toLowerCase().includes('miniatura') || (w.category_id || '').toLowerCase().includes('min')
    const targetRef = isMinCategory ? minTarget : maxTarget

    const tierStr = tier ? ` (${tier.label} · ${tier.name})` : data?.tier_label ? ` (${data.tier_label})` : ''
    const targetStr = targetRef ? ` / ${targetRef} m` : ''
    return `${score.toFixed(1)} m${targetStr}${tierStr}`
  }

  if (catId === 'level') {
    const score = Number(w.score ?? data?.level ?? 1)
    return `Nv. ${score} / 100`
  }

  if (data?.display_value) {
    return String(data.display_value)
  }
  if (data?.displayValue) {
    return String(data.displayValue)
  }

  return `${w.score ?? 0}`
}

const getRankMedal = (rank?: string | number): string => {
  if (rank === 'first' || rank === 1 || rank === '1') return '🥇'
  if (rank === 'second' || rank === 2 || rank === '2') return '🥈'
  if (rank === 'third' || rank === 3 || rank === '3') return '🥉'
  return '🎖️'
}

const getRankLabel = (rank?: string | number): string => {
  if (rank === 'first' || rank === 1 || rank === '1') return '1º'
  if (rank === 'second' || rank === 2 || rank === '2') return '2º'
  if (rank === 'third' || rank === 3 || rank === '3') return '3º'
  return `${rank}º`
}
</script>

<template>
  <div
    class="winner-item"
    :class="`rank-${winner.rank || rankIndex + 1}`"
  >
    <div class="rank-badge">
      <span class="medal">{{ getRankMedal(winner.rank || rankIndex + 1) }}</span>
      <span class="pos-text">{{ getRankLabel(winner.rank || rankIndex + 1) }}</span>
    </div>

    <!-- Clickable Avatar -->
    <div
      class="winner-avatar-wrap"
      :title="`Ver perfil de ${getWinnerName(winner)}`"
      @click.stop="openTrainerProfile(winner.player_id)"
    >
      <TrainerAvatar
        :profile="getWinnerProfile(winner)"
        :size="26"
      />
    </div>

    <!-- Clickable Player Name -->
    <div
      class="winner-player-wrap"
      :title="`Ver perfil de ${getWinnerName(winner)}`"
      @click.stop="openTrainerProfile(winner.player_id)"
    >
      <span
        v-gsap-nick="getWinnerNickStyle(winner)"
        class="player-name"
        :class="getWinnerNickStyle(winner)"
      >
        {{ getWinnerName(winner) }}
      </span>
    </div>

    <span
      v-if="winner.entry_data?.name || winner.score !== undefined"
      class="row-divider"
    >•</span>

    <!-- Pokemon & Metric Inline -->
    <div
      v-if="winner.entry_data?.name || winner.score !== undefined"
      class="winner-entry-inline"
    >
      <span
        v-if="winner.entry_data?.name"
        class="entry-poke"
        :class="{ shiny: winner.entry_data.is_shiny }"
      >
        <span
          v-if="winner.entry_data.is_shiny"
          class="emoji-inline"
        >✨</span> {{ winner.entry_data.nickname || winner.entry_data.name }}
      </span>
      <span
        v-if="winner.score !== undefined || winner.entry_data?.display_value"
        class="score-val"
      >
        {{ formatWinnerMetric(winner, categoryId) }}
      </span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "@/styles/core/tools" as *;

.winner-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: Rgba(255, 255, 255, 0.02);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  padding: 6px 12px;
  border-radius: 8px;
  min-height: 42px;
  box-sizing: border-box;

  &.rank-first,
  &.rank-1 {
    border-color: Rgba(255, 215, 0, 0.3);
    background: Rgba(255, 215, 0, 0.05);
  }

  &.rank-second,
  &.rank-2 {
    border-color: Rgba(192, 192, 192, 0.3);
    background: Rgba(192, 192, 192, 0.04);
  }

  &.rank-third,
  &.rank-3 {
    border-color: Rgba(205, 127, 50, 0.3);
    background: Rgba(205, 127, 50, 0.04);
  }
}

.rank-badge {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;

  .medal {
    font-size: 13px;
    line-height: 1;
  }

  .pos-text {
    @include pixelated;
    font-size: 8px;
    line-height: 1;
    color: var(--gray-light);
  }
}

.winner-avatar-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3px;
  flex-shrink: 0;
  cursor: pointer;
}

.winner-player-wrap {
  display: flex;
  align-items: center;
  cursor: pointer;
  flex-shrink: 0;

  .player-name {
    font-size: 10px;
    font-weight: bold;
    color: var(--white);
    white-space: nowrap;

    &:hover:not([class*="custom-"]) {
      color: var(--yellow);
      text-shadow: 0 0 6px Rgba(250, 204, 21, 0.3);
    }
  }
}

.row-divider {
  color: Rgba(255, 255, 255, 0.2);
  font-size: 10px;
  flex-shrink: 0;
}

.winner-entry-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 8.5px;
  white-space: nowrap;
  min-width: 0;

  .entry-poke {
    color: var(--yellow);
    font-weight: bold;
  }

  .score-val {
    color: var(--green-bright);
    text-shadow: 0 0 6px Rgba(74, 222, 128, 0.25);
  }
}
</style>
