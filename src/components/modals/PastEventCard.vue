<script setup lang="ts">
import { gsap } from 'gsap'
import { GAME_TIMEZONE } from '@/logic/utils/timeUtils'
import type { PastEventHistoryItem } from '@/types/system/stores'

interface Props {
  item: PastEventHistoryItem
}

interface Emits {
  (e: 'claim', awardId: string): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const HOVER_ANIMATION_DURATION_SEC = 0.2
const HOVER_TRANSLATE_Y_PX = -2

const onBtnHover = (event: MouseEvent, isEntering: boolean) => {
  const btn = event.currentTarget as HTMLElement
  if (!btn || btn.hasAttribute('disabled')) return
  if (isEntering) {
    gsap.to(btn, {
      background: 'var(--green-bright)',
      y: HOVER_TRANSLATE_Y_PX,
      borderColor: 'var(--white)',
      duration: HOVER_ANIMATION_DURATION_SEC,
      ease: 'power2.out',
      overwrite: 'auto'
    })
  } else {
    gsap.to(btn, {
      background: 'var(--green)',
      y: 0,
      borderColor: 'var(--green-bright)',
      duration: HOVER_ANIMATION_DURATION_SEC,
      ease: 'power2.out',
      overwrite: 'auto',
      clearProps: 'transform,background,borderColor'
    })
  }
}

const formatDate = (isoString?: string): string => {
  if (!isoString) return ''
  try {
    const instant = Temporal.Instant.from(isoString)
    const zdt = instant.toZonedDateTimeISO(GAME_TIMEZONE)
    const day = String(zdt.day).padStart(2, '0')
    const month = String(zdt.month).padStart(2, '0')
    const hour = String(zdt.hour).padStart(2, '0')
    const minute = String(zdt.minute).padStart(2, '0')
    return `${day}/${month} · ${hour}:${minute} hs`
  } catch {
    return isoString
  }
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

const onClaimClick = (awardId?: string) => {
  if (!awardId) return
  emit('claim', awardId)
}
</script>

<template>
  <div
    class="past-event-card"
    :class="{ 'user-won': item.isWinner }"
  >
    <!-- Card Top Bar -->
    <div class="card-top">
      <div class="event-meta">
        <span class="event-icon">{{ item.event_icon }}</span>
        <div class="event-title-group">
          <h4 class="event-name">
            {{ item.event_name }}
          </h4>
          <span class="event-date">{{ formatDate(item.ended_at) }}</span>
        </div>
      </div>

      <!-- Claim Status / Button -->
      <div class="award-action-slot">
        <button
          v-if="item.hasUnclaimedAward && item.myAward?.id"
          :id="'claim-past-award-btn-' + (item.myAward?.id || item.id)"
          class="retro-btn claim-btn"
          @mouseenter="onBtnHover($event, true)"
          @mouseleave="onBtnHover($event, false)"
          @click.stop="onClaimClick(item.myAward.id)"
        >
          RECLAMAR PREMIO 🎁
        </button>

        <div
          v-else-if="item.isClaimed"
          class="claimed-badge"
        >
          ✓ RECLAMADA
        </div>

        <div
          v-else-if="item.isWinner"
          class="winner-badge"
        >
          🏆 GANADOR
        </div>
      </div>
    </div>

    <!-- Podium / Winners -->
    <div class="podium-box">
      <div class="podium-title">
        PODIO DE GANADORES
      </div>

      <div
        v-if="item.winners.length === 0"
        class="no-winners"
      >
        Sin participantes registrados en esta edición.
      </div>

      <div
        v-else
        class="winners-grid"
      >
        <div
          v-for="(w, idx) in item.winners"
          :key="w.player_id || idx"
          class="winner-item"
          :class="`rank-${w.rank || idx + 1}`"
        >
          <div class="rank-badge">
            <span class="medal">{{ getRankMedal(w.rank || idx + 1) }}</span>
            <span class="pos-text">{{ getRankLabel(w.rank || idx + 1) }}</span>
          </div>

          <div class="winner-info">
            <span class="player-name">{{ w.player_name || 'Entrenador' }}</span>
            <div
              v-if="w.entry_data?.name || w.score !== undefined"
              class="winner-score-tag"
            >
              <span
                v-if="w.entry_data?.name"
                class="entry-poke"
                :class="{ shiny: w.entry_data.is_shiny }"
              >
                {{ w.entry_data.is_shiny ? '✨ ' : '' }}{{ w.entry_data.nickname || w.entry_data.name }}
              </span>
              <span
                v-if="w.score !== undefined"
                class="score-val"
              >
                {{ w.score }} pts
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "@/styles/core/tools" as *;

.past-event-card {
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 12px 14px;

  &.user-won {
    background: Rgba(34, 197, 94, 0.04);
    border-color: Rgba(34, 197, 94, 0.3);
  }
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.event-meta {
  display: flex;
  align-items: center;
  gap: 10px;

  .event-icon {
    font-size: 20px;
  }

  .event-title-group {
    display: flex;
    flex-direction: column;
  }

  .event-name {
    @include pixelated;
    font-size: 10px;
    color: var(--white);
    margin: 0 0 2px 0;
    line-height: 1.2;
  }

  .event-date {
    font-size: 9px;
    color: var(--gray);
  }
}

.award-action-slot {
  display: flex;
  align-items: center;
}

.retro-btn {
  @include pixelated;
  font-size: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;

  &.claim-btn {
    background: var(--green);
    border: 2px solid var(--green-bright);
    color: var(--white);
    text-shadow: 0 1px 1px Rgba(0, 0, 0, 0.6);
    box-shadow: 0 0 8px Rgba(34, 197, 94, 0.3);
  }
}

.claimed-badge {
  @include pixelated;
  font-size: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  background: Rgba(34, 197, 94, 0.15);
  border: 1px solid Rgba(34, 197, 94, 0.4);
  color: var(--green-bright);
}

.winner-badge {
  @include pixelated;
  font-size: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  background: Rgba(255, 215, 0, 0.15);
  border: 1px solid Rgba(255, 215, 0, 0.4);
  color: var(--yellow);
}

.podium-box {
  background: Rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 8px 10px;
}

.podium-title {
  @include pixelated;
  font-size: 8px;
  color: var(--gray);
  margin-bottom: 6px;
  letter-spacing: 0.5px;
}

.no-winners {
  font-size: 9px;
  color: var(--gray);
  font-style: italic;
  padding: 4px 0;
}

.winners-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 8px;
}

.winner-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: Rgba(255, 255, 255, 0.02);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  padding: 6px 8px;
  border-radius: 6px;

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
  gap: 2px;

  .medal {
    font-size: 14px;
  }

  .pos-text {
    @include pixelated;
    font-size: 8px;
    color: var(--gray-light);
  }
}

.winner-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;

  .player-name {
    font-size: 10px;
    font-weight: bold;
    color: var(--white);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .winner-score-tag {
    display: flex;
    gap: 6px;
    font-size: 8px;
    color: var(--gray);
    margin-top: 1px;

    .entry-poke {
      color: var(--yellow);
    }

    .score-val {
      color: var(--green-bright);
    }
  }
}
</style>
