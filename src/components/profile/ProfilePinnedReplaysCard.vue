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
  border: 1px dashed rgb(148 163 184 / 20%);
  border-radius: 8px;
  background: rgb(15 23 42 / 40%);

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
    color: #94a3b8;
    font-size: 0.8rem;
    font-style: italic;
  }

  .empty-sub {
    color: #64748b;
    font-size: 0.65rem;
  }
}

.pinned-replays-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pinned-replay-row {
  @include gpu-layer;

  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid rgb(255 255 255 / 8%);
  border-radius: 6px;
  background: rgb(15 23 42 / 60%);

  &:hover {
    border-color: rgb(234 179 8 / 40%);
  }

  .replay-main-info {
    display: flex;
    align-items: center;
    gap: 10px;

    .result-badge {
      @include pixelated;

      display: flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.55rem;
      font-weight: bold;

      &.victoria {
        border: 1px solid rgb(34 197 94 / 40%);
        background: rgb(34 197 94 / 20%);
        color: #4ade80;
      }

      &.derrota {
        border: 1px solid rgb(239 68 68 / 40%);
        background: rgb(239 68 68 / 20%);
        color: #f87171;
      }
    }

    .matchup-text {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .rival-txt {
        color: #f1f5f9;
        font-size: 0.65rem;
        font-weight: bold;
      }

      .meta-txt {
        @include pixelated;

        color: #94a3b8;
        font-size: 0.55rem;
      }
    }
  }

  .replay-actions {
    display: flex;
    align-items: center;
    gap: 6px;

    .action-btn {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      width: 26px;
      height: 26px;
      border-radius: 4px;
      font-family: inherit;
      font-size: 0.65rem;
      cursor: pointer;

      &.watch {
        border: 1px solid #60a5fa;
        background: #3b82f6;
        color: #fff;
      }

      &.unpin {
        border: 1px solid #64748b;
        background: #475569;
        color: #cbd5e1;
      }
    }
  }
}
</style>
