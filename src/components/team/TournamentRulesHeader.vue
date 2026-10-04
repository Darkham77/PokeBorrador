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
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  border: 1px solid rgb(199 125 255 / 35%);
  border-radius: 12px;
  background: rgb(30 41 59 / 75%);
  margin-bottom: 12px;

  @media (width <= 600px) {
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
        @include pixelated;

        color: #fff;
        font-size: 9px;
        font-weight: bold;
        letter-spacing: 0.5px;
      }
    }

    .rules-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;

      .rule-badge {
        @include pixelated;

        padding: 2px 6px;
        border: 1px solid rgb(148 163 184 / 30%);
        border-radius: 4px;
        background: rgb(148 163 184 / 15%);
        color: var(--gray);
        font-size: 7px;

        &.little-cup {
          background: rgb(236 72 153 / 20%);
          color: #f472b6;
          border-color: rgb(236 72 153 / 40%);
        }

        &.types {
          background: rgb(168 85 247 / 20%);
          color: #c084fc;
          border-color: rgb(168 85 247 / 40%);
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
