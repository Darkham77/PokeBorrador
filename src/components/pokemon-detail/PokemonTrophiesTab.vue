<script setup lang="ts">
import type { PokemonCompetitionTrophy } from '@/types/pokemon/pokemon'
import { GAME_TIMEZONE } from '@/logic/utils/timeUtils'
import { useEventStore } from '@/stores/events'
import { resolveTrophyDisplayName } from '@/logic/events/eventEngine'
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'

interface Props {
  trophies?: PokemonCompetitionTrophy[]
  speciesId?: PokemonSpeciesId
}

const props = withDefaults(defineProps<Props>(), {
  trophies: () => [],
  speciesId: undefined
})

const eventStore = useEventStore()

const resolveTrophyEventName = (trophy: PokemonCompetitionTrophy) => {
  return resolveTrophyDisplayName(trophy, eventStore.allEvents, props.speciesId)
}

const getRankBadge = (rank: string) => {
  if (rank === 'first') return { medal: '🥇', label: '1º LUGAR (ORO)', css: 'rank-gold' }
  if (rank === 'second') return { medal: '🥈', label: '2º LUGAR (PLATA)', css: 'rank-silver' }
  if (rank === 'third') return { medal: '🥉', label: '3º LUGAR (BRONCE)', css: 'rank-bronze' }
  return { medal: '🏆', label: 'GANADOR', css: 'rank-default' }
}

const formatDate = (timestamp: number) => {
  if (!timestamp) return ''
  try {
    const instant = Temporal.Instant.fromEpochMilliseconds(timestamp)
    const zdt = instant.toZonedDateTimeISO(GAME_TIMEZONE)
    const dd = String(zdt.day).padStart(2, '0')
    const mm = String(zdt.month).padStart(2, '0')
    const yyyy = zdt.year
    return `${dd}/${mm}/${yyyy}`
  } catch {
    return ''
  }
}
</script>

<template>
  <div class="pokemon-trophies-tab">
    <div
      v-if="!props.trophies || props.trophies.length === 0"
      class="trophies-empty-state"
    >
      <span class="emoji empty-icon">🏆</span>
      <p class="empty-title pixelated">
        SIN TROFEOS AÚN
      </p>
      <p class="empty-desc">
        Este Pokémon aún no ha ganado torneos o competencias globales. ¡Inscríbelo en los eventos activos para ganar trofeos y medallas!
      </p>
    </div>

    <div
      v-else
      class="trophies-list"
    >
      <div
        v-for="(trophy, idx) in props.trophies"
        :key="`${trophy.eventId}-${trophy.categoryId}-${trophy.awardedAt}-${idx}`"
        class="trophy-card"
        :class="getRankBadge(trophy.rank).css"
      >
        <div class="trophy-medal-box">
          <span class="medal-icon">{{ getRankBadge(trophy.rank).medal }}</span>
        </div>

        <div class="trophy-info-box">
          <div class="trophy-header-row">
            <span class="trophy-rank-badge pixelated">{{ getRankBadge(trophy.rank).label }}</span>
            <span
              v-if="trophy.awardedAt"
              class="trophy-date pixelated"
            >{{ formatDate(trophy.awardedAt) }}</span>
          </div>

          <h3 class="trophy-event-title">
            {{ resolveTrophyEventName(trophy) }}
          </h3>

          <div class="trophy-category-row">
            <span class="category-lbl pixelated">CATEGORÍA:</span>
            <span class="category-val pixelated">{{ trophy.categoryName }}</span>
          </div>

          <div
            v-if="trophy.score !== undefined"
            class="trophy-score-row"
          >
            <span class="score-lbl pixelated">PUNTUACIÓN / MARCA:</span>
            <span class="score-val pixelated">{{ trophy.score }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.pokemon-trophies-tab {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 0;

  .trophies-empty-state {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 36px 16px;
    border: 1px dashed Rgb(255 255 255 / 15%);
    border-radius: 8px;
    background: Rgb(0 0 0 / 25%);
    text-align: center;

    .empty-icon {
      font-size: 32px;
      opacity: 0.6;
      margin-bottom: 8px;
    }

    .empty-title {
      color: var(--yellow);
      font-size: 10px;
      margin-bottom: 6px;
    }

    .empty-desc {
      max-width: 320px;
      margin: 0;
      color: var(--gray);
      font-size: 11px;
      line-height: 1.4;
    }
  }

  .trophies-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .trophy-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    border: 1px solid Rgb(255 255 255 / 10%);
    border-radius: 8px;
    background: Rgb(0 0 0 / 35%);

    &.rank-gold {
      background: Linear-Gradient(135deg, Rgb(250 204 21 / 8%), Rgb(0 0 0 / 40%));
      border-color: Rgb(250 204 21 / 40%);
      box-shadow: 0 0 10px Rgb(250 204 21 / 5%);

      .trophy-rank-badge {
        border: 1px solid Rgb(250 204 21 / 30%);
        background: Rgb(250 204 21 / 15%);
        color: #fde047;
      }
    }

    &.rank-silver {
      background: Linear-Gradient(135deg, Rgb(226 232 240 / 8%), Rgb(0 0 0 / 40%));
      border-color: Rgb(226 232 240 / 40%);

      .trophy-rank-badge {
        border: 1px solid Rgb(226 232 240 / 30%);
        background: Rgb(226 232 240 / 15%);
        color: #f1f5f9;
      }
    }

    &.rank-bronze {
      background: Linear-Gradient(135deg, Rgb(217 119 6 / 8%), Rgb(0 0 0 / 40%));
      border-color: Rgb(217 119 6 / 40%);

      .trophy-rank-badge {
        border: 1px solid Rgb(217 119 6 / 30%);
        background: Rgb(217 119 6 / 15%);
        color: #fcd34d;
      }
    }

    .trophy-medal-box {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 42px;
      height: 42px;
      border-radius: 8px;
      background: Rgb(255 255 255 / 4%);
      font-size: 28px;
      flex-shrink: 0;
    }

    .trophy-info-box {
      display: flex;
      flex-direction: column;
      gap: 3px;
      flex: 1;

      .trophy-header-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .trophy-rank-badge {
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 7px;
        font-weight: bold;
      }

      .trophy-date {
        color: var(--gray);
        font-size: 7px;
      }

      .trophy-event-title {
        margin: 2px 0 0;
        color: var(--white);
        font-size: 12px;
        font-weight: bold;
      }

      .trophy-category-row,
      .trophy-score-row {
        display: flex;
        align-items: center;
        gap: 6px;

        .category-lbl,
        .score-lbl {
          color: var(--gray);
          font-size: 6px;
        }

        .category-val {
          color: #93c5fd;
          font-size: 7px;
        }

        .score-val {
          color: var(--green-bright);
          font-size: 7px;
        }
      }
    }
  }
}
</style>
