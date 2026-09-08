<script setup lang="ts">
import type { BattleReplayRecord } from '@/types/battle/pvp.ts'
import { useStatHover } from '@/composables/ui/useStatHover'

interface Props {
  pinnedReplays?: BattleReplayRecord[]
  isOwnProfile?: boolean
  userId?: string
}

const props = withDefaults(defineProps<Props>(), {
  pinnedReplays: () => [],
  isOwnProfile: false,
  userId: undefined
})

const emit = defineEmits<{
  (e: 'watch-replay', replay: BattleReplayRecord): void
  (e: 'unpin-replay', replayUid: string): void // uuid-ok: Dynamic replay record UUID
}>()

const { handleStatEnter, handleStatLeave } = useStatHover()

function isUserP1(replay: BattleReplayRecord): boolean {
  if (props.userId && replay.p2.userId === props.userId) {
    return false
  }
  return true
}

function getRival(replay: BattleReplayRecord) {
  return isUserP1(replay) ? replay.p2 : replay.p1
}

function getResultText(replay: BattleReplayRecord) {
  const isP1 = isUserP1(replay)
  const won = (isP1 && replay.winnerSide === 'p1') || (!isP1 && replay.winnerSide === 'p2')
  return won ? 'VICTORIA' : 'DERROTA'
}

function getResultIcon(replay: BattleReplayRecord) {
  const isP1 = isUserP1(replay)
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
      <div class="empty-content">
        <span class="empty-text">Sin combates fijados en el perfil.</span>
        <span
          v-if="props.isOwnProfile"
          class="empty-sub"
        >
          Fija tus victorias más épicas desde la pantalla de resultados PvP.
        </span>
      </div>
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
            :class="getResultText(replay).toLowerCase()"
          >
            <span class="emoji">{{ getResultIcon(replay) }}</span>
            <span class="result-txt">{{ getResultText(replay) }}</span>
          </div>

          <div class="matchup-text">
            <span class="rival-txt">vs {{ getRival(replay).username }} ({{ getRival(replay).elo }} LP)</span>
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
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;
@use "@/styles/components/_profile-shared.scss" as *;

.pinned-replays-card {
  margin-top: 10px;
}

.empty-pinned-replays {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: Rgba(15, 23, 42, 0.4);
  border-radius: 8px;
  border: 1px dashed Rgba(148, 163, 184, 0.2);

  .empty-icon {
    font-size: 1.4rem;
    opacity: 0.6;
  }

  .empty-content {
    display: flex;
    flex-direction: column;
    gap: 3px;
    text-align: left;
  }

  .empty-text {
    font-size: 0.8rem;
    color: #94a3b8;
    font-style: italic;
  }

  .empty-sub {
    font-size: 0.65rem;
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
  padding: 8px 12px;
  background: Rgba(15, 23, 42, 0.6);
  border: 1px solid Rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  @include gpu-layer;

  &:hover {
    border-color: Rgba(234, 179, 8, 0.4);
  }

  .replay-main-info {
    display: flex;
    align-items: center;
    gap: 10px;

    .result-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.55rem;
      font-weight: bold;
      @include pixelated;

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
      gap: 2px;

      .rival-txt {
        font-size: 0.65rem;
        color: #f1f5f9;
        font-weight: bold;
      }

      .meta-txt {
        font-size: 0.55rem;
        color: #94a3b8;
        @include pixelated;
      }
    }
  }

  .replay-actions {
    display: flex;
    align-items: center;
    gap: 6px;

    .action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border-radius: 4px;
      font-size: 0.65rem;
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
