<script setup lang="ts">
import type { PvpTeamTab } from '@/types/battle/pvp'

interface Props {
  themeName: string
  levelCap?: number | null
  isLittleCup?: boolean
  allowedTypes?: string | null
  mode: PvpTeamTab
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'autoAdjust', mode: PvpTeamTab): void
}>()
</script>

<template>
  <div class="tournament-rules-header">
    <div class="rules-info">
      <div class="rules-title">
        <span class="emoji">🏆</span>
        <span class="theme-name text-outline">{{ themeName }}</span>
      </div>
      <div class="rules-badges">
        <span
          v-if="levelCap"
          class="rule-badge text-outline"
        >
          Nv. Máx {{ levelCap }}
        </span>
        <span
          v-if="isLittleCup"
          class="rule-badge little-cup text-outline"
        >
          <span class="emoji">🍼</span> Little Cup
        </span>
        <span
          v-if="allowedTypes"
          class="rule-badge types text-outline"
        >
          Tipos: {{ allowedTypes }}
        </span>
      </div>
    </div>
    <button
      v-gsap-hover
      class="auto-adjust-btn"
      @click="emit('autoAdjust', mode)"
    >
      <span class="emoji">⚡</span>
      <span>AUTO-AJUSTAR</span>
    </button>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.tournament-rules-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: Rgba(30, 41, 59, 0.75);
  border: 1px solid Rgba(199, 125, 255, 0.35);
  border-radius: 12px;
  padding: 8px 14px;
  margin-bottom: 12px;

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 8px 10px;
  }

  .rules-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;

    .rules-title {
      display: flex;
      align-items: center;
      gap: 6px;

      .emoji {
        font-size: 13px;
      }

      .theme-name {
        font-size: 9px;
        color: #ffffff;
        font-weight: bold;
        letter-spacing: 0.5px;
        @include pixelated;
      }
    }

    .rules-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;

      .rule-badge {
        font-size: 7px;
        padding: 2px 6px;
        border-radius: 4px;
        background: Rgba(148, 163, 184, 0.15);
        color: var(--gray);
        border: 1px solid Rgba(148, 163, 184, 0.3);
        @include pixelated;

        &.little-cup {
          background: Rgba(236, 72, 153, 0.2);
          color: #f472b6;
          border-color: Rgba(236, 72, 153, 0.4);
        }

        &.types {
          background: Rgba(168, 85, 247, 0.2);
          color: #c084fc;
          border-color: Rgba(168, 85, 247, 0.4);
        }
      }
    }
  }

  .auto-adjust-btn {
    @include btn-vicio('primary', 'sm', false);
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    font-size: 8px;
    white-space: nowrap;
    flex-shrink: 0;

    .emoji {
      font-size: 11px;
    }
  }
}
</style>
