<script setup lang="ts">
import { computed } from 'vue'
import type { PastCompetitionWinner } from '@/types/system/stores'
import TrainerAvatar from '@/components/profile/TrainerAvatar.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { useUIStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { useModalStore } from '@/stores/modals'
import { useChatCosmeticsStore } from '@/stores/social/chatCosmetics'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'
import PastEventPodiumBadge from './PastEventPodiumBadge.vue'
import {
  formatWinnerMetric,
  getWinnerSpeciesId,
  resolveWinnerProfile,
  resolveWinnerName,
  resolveWinnerNickStyle
} from './pastEventMetricFormatter.ts'

interface Props {
  winner: PastCompetitionWinner
  categoryId: string
  rankIndex: number
}

const props = defineProps<Props>()

const uiStore = useUIStore()
const authStore = useAuthStore()
const gameStore = useGameStore()
const modalStore = useModalStore()
const chatCosmetics = useChatCosmeticsStore()

const openTrainerProfile = (userId?: string) => {
  if (userId) {
    uiStore.open('TrainerProfile', { userId })
  }
}

const getWinnerSpeciesName = (w: PastCompetitionWinner): string => {
  const speciesId = getWinnerSpeciesId(w)
  if (speciesId) {
    const data = pokemonDataProvider.getPokemonData(speciesId, true)
    if (data?.name) return data.name
  }
  return w.entry_data?.name || 'Pokémon'
}

const formatPokemonDisplayName = (w: PastCompetitionWinner): string => {
  const speciesName = getWinnerSpeciesName(w)
  const nickname = w.entry_data?.nickname
  if (nickname && nickname.trim().toLowerCase() !== speciesName.trim().toLowerCase()) {
    return `${nickname} (${speciesName})`
  }
  return speciesName
}

const winnerSpeciesId = computed<PokemonSpeciesId | null>(() => getWinnerSpeciesId(props.winner))
const winnerSpeciesName = computed<string>(() => getWinnerSpeciesName(props.winner))
const pokemonDisplayName = computed<string>(() => formatPokemonDisplayName(props.winner))

const openSpeciesDetail = (speciesId: PokemonSpeciesId) => {
  modalStore.open('PokedexDetail', {
    speciesId,
    context: 'pokedex'
  })
}

const winnerProfile = computed(() => {
  return resolveWinnerProfile(
    props.winner,
    authStore.user?.id,
    gameStore.state,
    chatCosmetics.profileCosmetics[props.winner.player_id]
  )
})

const winnerName = computed(() => {
  return resolveWinnerName(
    props.winner,
    authStore.user?.id,
    gameStore.state.trainer,
    chatCosmetics.profileCosmetics[props.winner.player_id]?.username
  )
})

const winnerNickStyle = computed(() => {
  return resolveWinnerNickStyle(
    props.winner,
    authStore.user?.id,
    gameStore.state.nick_style,
    chatCosmetics.profileCosmetics[props.winner.player_id]?.nick_style
  )
})

const rank = computed(() => props.winner.rank || props.rankIndex + 1)
const rankClass = computed(() => `rank-${rank.value}`)
const isShiny = computed(() => Boolean(props.winner.entry_data?.is_shiny))
const hasDetails = computed(() => Boolean(props.winner.entry_data?.name || props.winner.score !== undefined))
const hasScore = computed(() => props.winner.score !== undefined || Boolean(props.winner.entry_data?.display_value))
const showMetricSep = computed(() => Boolean(props.winner.entry_data?.name && hasScore.value))
const metricText = computed(() => formatWinnerMetric(props.winner, props.categoryId))
const spriteUrl = computed(() => {
  if (!winnerSpeciesId.value) return ''
  return getAssetUrl(ASSET_TYPES.POKEMON, winnerSpeciesId.value, { isShiny: isShiny.value })
})
const fallbackPokeName = computed(() => props.winner.entry_data?.nickname || props.winner.entry_data?.name || '')

</script>

<template>
  <div
    class="winner-item"
    :class="rankClass"
  >
    <!-- Column 1: Rank Badge / Medal (Standalone) -->
    <PastEventPodiumBadge :rank="rank" />

    <!-- Column 2: Content (1 line on wide screens, 2 lines on small screens) -->
    <div class="winner-content-wrap">
      <!-- Trainer Profile -->
      <div class="winner-trainer-group">
        <PVTooltip
          :title="`Ver perfil de ${winnerName}`"
          position="top"
        >
          <div
            class="winner-avatar-wrap"
            role="button"
            tabindex="0"
            @click.stop="openTrainerProfile(winner.player_id)"
            @keydown.enter.stop="openTrainerProfile(winner.player_id)"
          >
            <TrainerAvatar
              :profile="winnerProfile"
              :size="26"
            />
          </div>
        </PVTooltip>

        <PVTooltip
          :title="`Ver perfil de ${winnerName}`"
          position="top"
        >
          <div
            class="winner-player-wrap"
            role="button"
            tabindex="0"
            @click.stop="openTrainerProfile(winner.player_id)"
            @keydown.enter.stop="openTrainerProfile(winner.player_id)"
          >
            <span
              v-gsap-nick="winnerNickStyle"
              class="player-name"
              :class="winnerNickStyle"
            >
              {{ winnerName }}
            </span>
          </div>
        </PVTooltip>
      </div>

      <!-- Divider (visible when inline on same row) -->
      <span
        v-if="hasDetails"
        class="entry-divider-dot"
      >•</span>

      <!-- Pokemon & Metric Details -->
      <div
        v-if="hasDetails"
        class="winner-details-group"
      >
        <!-- Pokemon Sprite & Name Pill -->
        <div class="winner-poke-pill">
          <PVTooltip
            v-if="winnerSpeciesId"
            :title="`Ver información de Pokédex de ${winnerSpeciesName}`"
            position="top"
          >
            <div
              class="winner-poke-interactive clickable"
              role="button"
              tabindex="0"
              @click.stop="openSpeciesDetail(winnerSpeciesId)"
              @keydown.enter.stop="openSpeciesDetail(winnerSpeciesId)"
            >
              <img
                :src="spriteUrl"
                :alt="winnerSpeciesName"
                draggable="false"
                class="winner-poke-sprite pixelated"
              >
              <span
                class="entry-poke"
                :class="{ shiny: isShiny }"
              >
                <span
                  v-if="isShiny"
                  class="emoji"
                >✨</span> {{ pokemonDisplayName }}
              </span>
            </div>
          </PVTooltip>

          <span
            v-else-if="winner.entry_data?.name"
            class="entry-poke"
            :class="{ shiny: isShiny }"
          >
            <span
              v-if="isShiny"
              class="emoji"
            >✨</span> {{ fallbackPokeName }}
          </span>
        </div>

        <span
          v-if="showMetricSep"
          class="entry-metric-sep"
        >·</span>

        <span
          v-if="hasScore"
          class="score-val"
        >
          {{ metricText }}
        </span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "@/styles/core/tools" as *;

.winner-item {
  display: flex;
  align-items: center;
  gap: 10px;
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

// Right Column (Flows inline by default, wraps to 2 lines on small screens)
.winner-content-wrap {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 8px;
  flex: 1;
  min-width: 0;
}

// Trainer Profile Group (Avatar + Name)
.winner-trainer-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.winner-avatar-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  flex-shrink: 0;
  cursor: pointer;
}

.winner-player-wrap {
  display: flex;
  align-items: center;
  cursor: pointer;

  .player-name {
    font-size: 10.5px;
    font-weight: bold;
    color: var(--white);
    white-space: nowrap;

    &:hover:not([class*="custom-"]) {
      color: var(--yellow);
      text-shadow: 0 0 6px Rgba(250, 204, 21, 0.3);
    }
  }
}

.entry-divider-dot {
  color: Rgba(255, 255, 255, 0.25);
  font-size: 10px;
  flex-shrink: 0;
}

// Pokemon & Metric Details Group
.winner-details-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 6px;
  font-size: 8.5px;
  line-height: 1.35;
  min-width: 0;

  .winner-poke-pill {
    display: inline-flex;
    align-items: center;
    min-width: 0;
  }

  .winner-poke-interactive {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    border-radius: 4px;
    padding: 1px 4px 1px 2px;
    background: Rgba(255, 255, 255, 0.04);
    border: 1px solid Rgba(255, 255, 255, 0.08);

    &:hover {
      background: Rgba(255, 215, 0, 0.08);
      border-color: Rgba(255, 215, 0, 0.35);

      .entry-poke {
        color: var(--white);
        text-shadow: 0 0 6px Rgba(250, 204, 21, 0.4);
      }
    }
  }

  .winner-poke-sprite {
    width: 20px;
    height: 20px;
    object-fit: contain;
    flex-shrink: 0;
  }

  .entry-poke {
    color: var(--yellow);
    font-weight: bold;
    white-space: nowrap;
  }

  .entry-metric-sep {
    color: Rgba(255, 255, 255, 0.25);
    font-size: 9px;
  }

  .score-val {
    color: var(--green-bright);
    text-shadow: 0 0 6px Rgba(74, 222, 128, 0.25);
    word-break: break-word;
  }
}

@media (max-width: 480px) {
  .winner-item {
    padding: 6px 8px;
    gap: 8px;
    align-items: flex-start;
  }

  .rank-badge {
    padding-top: 4px;
    min-width: 28px;

    .medal {
      font-size: 13px;
    }

    .pos-text {
      font-size: 7.5px;
    }
  }

  .winner-content-wrap {
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
  }

  .entry-divider-dot {
    display: none;
  }

  .winner-details-group {
    font-size: 8px;
  }
}
</style>
