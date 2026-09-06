<script setup lang="ts">
import type { BattleReplayRecord } from '@/types/battle/pvp.ts'
import { useStatHover } from '@/composables/ui/useStatHover'

interface Props {
  pinnedReplays?: BattleReplayRecord[]
  isOwnProfile?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  pinnedReplays: () => [],
  isOwnProfile: false
})

const emit = defineEmits<{
  (e: 'watch-replay', replay: BattleReplayRecord): void
  (e: 'unpin-replay', replayUid: string): void // uuid-ok: Dynamic replay record UUID
}>()

const { handleStatEnter, handleStatLeave } = useStatHover()

function getResultText(replay: BattleReplayRecord, isP1: boolean) {
  const won = (isP1 && replay.winnerSide === 'p1') || (!isP1 && replay.winnerSide === 'p2')
  return won ? 'VICTORIA' : 'DERROTA'
}

function getResultIcon(replay: BattleReplayRecord, isP1: boolean) {
  const won = (isP1 && replay.winnerSide === 'p1') || (!isP1 && replay.winnerSide === 'p2')
  return won ? '🏆' : '💀'
}
</script>

<template>
  <div class="profile-section-card pinned-replays-card">
    <div class="section-label">
      REPETICIONES FIJADAS ({{ props.pinnedReplays.length }} / 5)
    </div>

    <!-- Empty State -->
    <div
      v-if="props.pinnedReplays.length === 0"
      class="empty-pinned-replays"
    >
      <span class="emoji empty-icon">🎬</span>
      <span class="empty-text">Sin combates fijados en el perfil.</span>
      <span
        v-if="props.isOwnProfile"
        class="empty-sub"
      >
        Fija tus victorias más épicas desde la pantalla de resultados PvP.
      </span>
    </div>

    <!-- Replays List -->
    <div
      v-else
      class="pinned-replays-list"
    >
      <div
        v-for="replay in props.pinnedReplays"
        :key="replay.id"
        class="pinned-replay-row"
        @mouseenter="handleStatEnter"
        @mouseleave="handleStatLeave"
      >
        <div class="replay-main-info">
          <div
            class="result-badge"
            :class="getResultText(replay, true).toLowerCase()"
          >
            <span class="emoji">{{ getResultIcon(replay, true) }}</span>
            <span class="result-txt">{{ getResultText(replay, true) }}</span>
          </div>

          <div class="matchup-text">
            <span class="rival-txt">vs {{ replay.p2.username }} ({{ replay.p2.elo }} LP)</span>
            <span class="meta-txt">{{ replay.battleCode }} · {{ replay.turnsCount }}T</span>
          </div>
        </div>

        <div class="replay-actions">
          <button
            :id="`btn-profile-watch-${replay.battleCode}`"
            v-gsap-hover="'button'"
            class="action-btn watch"
            title="Ver repetición"
            @click="emit('watch-replay', replay)"
          >
            <span class="emoji">▶</span>
          </button>
          <button
            v-if="props.isOwnProfile"
            :id="`btn-profile-unpin-${replay.id}`"
            v-gsap-hover="'button'"
            class="action-btn unpin"
            title="Desfijar de perfil"
            @click="emit('unpin-replay', replay.id)"
          >
            <span class="emoji">✕</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.pinned-replays-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-pinned-replays {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 10px;
  gap: 4px;
  text-align: center;
  background: Rgba(0, 0, 0, 0.2);
  border-radius: 6px;

  .empty-icon {
    font-size: 1.5rem;
    filter: Grayscale(0.5);
  }

  .empty-text {
    font-size: 0.65rem;
    color: #94a3b8;
    font-family: inherit;
  }

  .empty-sub {
    font-size: 0.55rem;
    color: #64748b;
  }
}

.pinned-replays-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pinned-replay-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: Rgba(15, 23, 42, 0.6);
  border: 1px solid Rgba(255, 255, 255, 0.08);
  border-radius: 6px;

  &:hover {
    border-color: Rgba(234, 179, 8, 0.4);
  }

  .replay-main-info {
    display: flex;
    align-items: center;
    gap: 8px;

    .result-badge {
      display: flex;
      align-items: center;
      gap: 3px;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.55rem;
      font-weight: bold;

      &.victoria {
        background: Rgba(34, 197, 94, 0.2);
        color: #4ade80;
        border: 1px solid Rgba(34, 197, 94, 0.4);
      }

      &.derrota {
        background: Rgba(239, 68, 68, 0.2);
        color: #f87171;
        border: 1px solid Rgba(239, 68, 68, 0.4);
      }
    }

    .matchup-text {
      display: flex;
      flex-direction: column;

      .rival-txt {
        font-size: 0.62rem;
        color: #f1f5f9;
        font-weight: bold;
      }

      .meta-txt {
        font-size: 0.52rem;
        color: #94a3b8;
      }
    }
  }

  .replay-actions {
    display: flex;
    align-items: center;
    gap: 4px;

    .action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      font-size: 0.6rem;
      cursor: pointer;
      font-family: inherit;

      &.watch {
        background: #3b82f6;
        border: 1px solid #60a5fa;
        color: #ffffff;
      }

      &.unpin {
        background: #475569;
        border: 1px solid #64748b;
        color: #cbd5e1;
      }
    }
  }
}
</style>
