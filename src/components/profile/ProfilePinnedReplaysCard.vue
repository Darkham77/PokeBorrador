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
  gap: $spacing-md;
  padding: 12px 14px;
  border: 1px dashed Rgb(148 163 184 / 20%);
  border-radius: $radius-lg;
  background: Rgb(15 23 42 / 40%);

  .empty-icon {
    font-size: var(--font-22);
    opacity: 0.6;
  }

  .empty-content {
    display: flex;
    flex-direction: column;
    gap: $spacing-xs-alt;
    text-align: left;
  }

  .empty-text {
    color: var(--slate-400);
    font-size: var(--font-13);
    font-style: italic;
  }

  .empty-sub {
    color: var(--slate-500);
    font-size: var(--font-10);
  }
}

.pinned-replays-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm-alt;
}

.pinned-replay-row {
  @include gpu-layer;

  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid Rgb(255 255 255 / 8%);
  border-radius: $radius-md;
  background: Rgb(15 23 42 / 60%);

  &:hover {
    border-color: Rgb(234 179 8 / 40%);
  }

  .replay-main-info {
    display: flex;
    align-items: center;
    gap: $spacing-md-alt;

    .result-badge {
      @include pixelated;

      display: flex;
      align-items: center;
      gap: $spacing-xs;
      padding: 3px 8px;
      border-radius: $radius-sm;
      font-size: var(--font-9);
      font-weight: bold;

      &.victoria {
        border: 1px solid Rgb(34 197 94 / 40%);
        background: Rgb(34 197 94 / 20%);
        color: var(--green-light);
      }

      &.derrota {
        border: 1px solid Rgb(239 68 68 / 40%);
        background: Rgb(239 68 68 / 20%);
        color: var(--rose);
      }
    }

    .matchup-text {
      display: flex;
      flex-direction: column;
      gap: $spacing-2xs;

      .rival-txt {
        color: var(--slate-100);
        font-size: var(--font-10);
        font-weight: bold;
      }

      .meta-txt {
        @include pixelated;

        color: var(--slate-400);
        font-size: var(--font-9);
      }
    }
  }

  .replay-actions {
    display: flex;
    align-items: center;
    gap: $spacing-sm-alt;

    .action-btn {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      width: 26px;
      height: 26px;
      border-radius: $radius-sm;
      font-family: inherit;
      font-size: var(--font-10);
      cursor: pointer;

      &.watch {
        border: 1px solid var(--blue-400);
        background: var(--blue-500);
        color: var(--white);
      }

      &.unpin {
        border: 1px solid var(--slate-500);
        background: var(--slate-600);
        color: var(--slate-300);
      }
    }
  }
}
</style>
