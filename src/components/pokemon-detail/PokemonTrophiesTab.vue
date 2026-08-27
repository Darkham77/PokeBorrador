<script setup lang="ts">
import type { PokemonCompetitionTrophy } from '@/types/pokemon/pokemon'

interface Props {
  trophies?: PokemonCompetitionTrophy[]
}

const props = withDefaults(defineProps<Props>(), {
  trophies: () => []
})

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
    const zdt = instant.toZonedDateTimeISO('America/Argentina/Buenos_Aires')
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
      <span class="empty-icon">🏆</span>
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
            {{ trophy.eventName }}
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
    align-items: center;
    justify-content: center;
    padding: 36px 16px;
    background: Rgba(0, 0, 0, 0.25);
    border: 1px dashed Rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    text-align: center;

    .empty-icon {
      font-size: 32px;
      margin-bottom: 8px;
      opacity: 0.6;
    }

    .empty-title {
      font-size: 10px;
      color: var(--yellow);
      margin-bottom: 6px;
    }

    .empty-desc {
      font-size: 11px;
      color: var(--gray);
      max-width: 320px;
      line-height: 1.4;
      margin: 0;
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
    border-radius: 8px;
    background: Rgba(0, 0, 0, 0.35);
    border: 1px solid Rgba(255, 255, 255, 0.1);

    &.rank-gold {
      border-color: Rgba(250, 204, 21, 0.4);
      background: linear-gradient(135deg, Rgba(250, 204, 21, 0.08), Rgba(0, 0, 0, 0.4));
      box-shadow: 0 0 10px Rgba(250, 204, 21, 0.05);

      .trophy-rank-badge {
        color: #fde047;
        background: Rgba(250, 204, 21, 0.15);
        border: 1px solid Rgba(250, 204, 21, 0.3);
      }
    }

    &.rank-silver {
      border-color: Rgba(226, 232, 240, 0.4);
      background: linear-gradient(135deg, Rgba(226, 232, 240, 0.08), Rgba(0, 0, 0, 0.4));

      .trophy-rank-badge {
        color: #f1f5f9;
        background: Rgba(226, 232, 240, 0.15);
        border: 1px solid Rgba(226, 232, 240, 0.3);
      }
    }

    &.rank-bronze {
      border-color: Rgba(217, 119, 6, 0.4);
      background: linear-gradient(135deg, Rgba(217, 119, 6, 0.08), Rgba(0, 0, 0, 0.4));

      .trophy-rank-badge {
        color: #fcd34d;
        background: Rgba(217, 119, 6, 0.15);
        border: 1px solid Rgba(217, 119, 6, 0.3);
      }
    }

    .trophy-medal-box {
      font-size: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 42px;
      height: 42px;
      background: Rgba(255, 255, 255, 0.04);
      border-radius: 8px;
      flex-shrink: 0;
    }

    .trophy-info-box {
      display: flex;
      flex-direction: column;
      gap: 3px;
      flex: 1;

      .trophy-header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .trophy-rank-badge {
        font-size: 7px;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: bold;
      }

      .trophy-date {
        font-size: 7px;
        color: var(--gray);
      }

      .trophy-event-title {
        font-size: 12px;
        font-weight: bold;
        color: var(--white);
        margin: 2px 0 0 0;
      }

      .trophy-category-row,
      .trophy-score-row {
        display: flex;
        align-items: center;
        gap: 6px;

        .category-lbl,
        .score-lbl {
          font-size: 6px;
          color: var(--gray);
        }

        .category-val {
          font-size: 7px;
          color: #93c5fd;
        }

        .score-val {
          font-size: 7px;
          color: var(--green-bright);
        }
      }
    }
  }
}
</style>
