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
  min-height: 42px;
  padding: 6px 12px;
  border: 1px solid rgb(255 255 255 / 5%);
  border-radius: 8px;
  background: rgb(255 255 255 / 2%);
  box-sizing: border-box;

  &.rank-1 {
    background: rgb(255 215 0 / 5%);
    border-color: rgb(255 215 0 / 30%);
  }

  &.rank-2 {
    background: rgb(192 192 192 / 4%);
    border-color: rgb(192 192 192 / 30%);
  }

  &.rank-3 {
    background: rgb(205 127 50 / 4%);
    border-color: rgb(205 127 50 / 30%);
  }
}

// Right Column (Flows inline by default, wraps to 2 lines on small screens)
.winner-content-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  min-width: 0;
  flex: 1;
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
  justify-content: center;
  align-items: center;
  padding: 2px;
  flex-shrink: 0;
  cursor: pointer;
}

.winner-player-wrap {
  display: flex;
  align-items: center;
  cursor: pointer;

  .player-name {
    color: var(--white);
    font-size: 10.5px;
    font-weight: bold;
    white-space: nowrap;

    &:hover:not([class*="custom-"]) {
      color: var(--yellow);
      text-shadow: 0 0 6px rgb(250 204 21 / 30%);
    }
  }
}

.entry-divider-dot {
  color: rgb(255 255 255 / 25%);
  font-size: 10px;
  flex-shrink: 0;
}

// Pokemon & Metric Details Group
.winner-details-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  min-width: 0;
  font-size: 8.5px;
  line-height: 1.35;

  .winner-poke-pill {
    display: inline-flex;
    align-items: center;
    min-width: 0;
  }

  .winner-poke-interactive {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 1px 4px 1px 2px;
    border: 1px solid rgb(255 255 255 / 8%);
    border-radius: 4px;
    background: rgb(255 255 255 / 4%);
    cursor: pointer;

    &:hover {
      background: rgb(255 215 0 / 8%);
      border-color: rgb(255 215 0 / 35%);

      .entry-poke {
        color: var(--white);
        text-shadow: 0 0 6px rgb(250 204 21 / 40%);
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
    color: rgb(255 255 255 / 25%);
    font-size: 9px;
  }

  .score-val {
    color: var(--green-bright);
    text-shadow: 0 0 6px rgb(74 222 128 / 25%);
    overflow-wrap: break-word;
  }
}

@media (width <= 480px) {
  .winner-item {
    align-items: flex-start;
    gap: 8px;
    padding: 6px 8px;
  }

  .rank-badge {
    min-width: 28px;
    padding-top: 4px;

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
