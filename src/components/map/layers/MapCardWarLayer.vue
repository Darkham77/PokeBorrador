<script setup lang="ts">
import { computed } from 'vue'
import type { MapLocation } from '@/types/pokemon/encounters'
import type { DominanceInfo } from '@/types/system/stores'
import type { FactionId } from '@/types/system/game'

interface Props {
  map: MapLocation
  dominance?: DominanceInfo | null
  playerFaction?: FactionId | null
  isDisputeActive?: boolean
  isGuardianAvailable?: boolean
  hasGuardianCapturedToday?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  dominance: null,
  playerFaction: null,
  isDisputeActive: true,
  isGuardianAvailable: false,
  hasGuardianCapturedToday: false
})

const emit = defineEmits<{
  (e: 'action'): void
}>()

const unionPts = computed(() => props.dominance?.union || 0)
const poderPts = computed(() => props.dominance?.poder || 0)
const totalPts = computed(() => unionPts.value + poderPts.value)

const unionPct = computed(() => {
  if (totalPts.value === 0) return 50
  return Math.round((unionPts.value / totalPts.value) * 100)
})

const poderPct = computed(() => 100 - unionPct.value)

const leadingFaction = computed<FactionId | 'tie'>(() => {
  if (props.dominance?.winner) return props.dominance.winner
  if (unionPts.value > poderPts.value) return 'union'
  if (poderPts.value > unionPts.value) return 'poder'
  return 'tie'
})

const isWinningForPlayer = computed(() => {
  if (!props.playerFaction) return false
  return leadingFaction.value === props.playerFaction
})
</script>

<template>
  <div
    class="map-card-war-layer"
    :class="[`faction-${leadingFaction}`, { 'is-winning': isWinningForPlayer }]"
  >
    <!-- Header de Guerra -->
    <div class="war-layer-header">
      <div class="war-status-badge">
        <span class="war-badge-icon">⚔️</span>
        <span class="war-badge-text">
          {{ isDisputeActive ? 'FASE DE DISPUTA' : 'TERRITORIO CONQUISTADO' }}
        </span>
      </div>
      <div
        v-if="!isDisputeActive && dominance?.winner"
        class="war-winner-tag"
        :class="`winner-${dominance.winner}`"
      >
        <span class="emoji-inline">{{ dominance.winner === 'union' ? '⚪' : '⚫' }}</span>
        <span>{{ dominance.winner === 'union' ? ' TEAM UNIÓN' : ' TEAM PODER' }}</span>
      </div>
    </div>

    <!-- Barra de Dominancia Territorial -->
    <div class="war-progress-section">
      <div class="war-progress-labels">
        <span class="label-union"><span class="emoji-inline">⚪</span> Unión {{ unionPct }}%</span>
        <span class="label-poder">{{ poderPct }}% Poder <span class="emoji-inline">⚫</span></span>
      </div>
      <div class="war-progress-bar-track">
        <div
          class="war-bar-fill union-fill"
          :style="{ width: `${unionPct}%` }"
        />
        <div
          class="war-bar-fill poder-fill"
          :style="{ width: `${poderPct}%` }"
        />
      </div>
      <div class="war-points-detail">
        <span>PT: {{ unionPts }} vs {{ poderPts }}</span>
      </div>
    </div>

    <!-- Bono de Fin de Semana si aplica -->
    <div
      v-if="!isDisputeActive && isWinningForPlayer"
      class="war-weekend-bonus-banner"
    >
      <span class="bonus-sparkle emoji-inline">✨</span>
      <span class="bonus-text">BONO DOMINANCIA: +30% EXP & SHINY</span>
    </div>

    <!-- Botón Táctico de Acción -->
    <div class="war-action-section">
      <button
        type="button"
        class="war-tactical-action-btn"
        :class="{ 'btn-guardian': isGuardianAvailable && !hasGuardianCapturedToday }"
        @click.stop="emit('action')"
      >
        <span class="btn-icon">
          {{ isGuardianAvailable && !hasGuardianCapturedToday ? '👑' : '⚔️' }}
        </span>
        <span class="btn-text">
          {{ isGuardianAvailable && !hasGuardianCapturedToday ? 'COMBATIR GUARDIÁN (+PT)' : 'DISPUTAR RUTA (+PT)' }}
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.map-card-war-layer {
  @include pixelated;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 10px;
  background: linear-gradient(180deg, Rgba(15, 23, 42, 0.95) 0%, Rgba(10, 15, 29, 0.98) 100%);
  border-radius: 8px;
  border: 1.5px solid #475569;
  box-shadow: inset 0 1px 0 Rgba(255, 255, 255, 0.1), 0 4px 12px Rgba(0, 0, 0, 0.5);
  box-sizing: border-box;
  width: 100%;

  &.faction-union {
    border-color: #93c5fd;
    box-shadow: 0 0 12px Rgba(147, 197, 253, 0.25);
  }

  &.faction-poder {
    border-color: #c084fc;
    box-shadow: 0 0 12px Rgba(192, 132, 252, 0.25);
  }

  .war-layer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;

    .war-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: Rgba(255, 255, 255, 0.08);
      padding: 3px 6px;
      border-radius: 4px;
      border: 1px solid Rgba(255, 255, 255, 0.1);

      .war-badge-icon {
        font-size: 10px;
      }

      .war-badge-text {
        font-size: 8px;
        font-weight: bold;
        color: #f59e0b;
        letter-spacing: 0.5px;
      }
    }

    .war-winner-tag {
      font-size: 7.5px;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 3px;

      &.winner-union {
        background: #1e3a8a;
        color: #93c5fd;
        border: 1px solid #3b82f6;
      }

      &.winner-poder {
        background: #581c87;
        color: #e9d5ff;
        border: 1px solid #a855f7;
      }
    }
  }

  .war-progress-section {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .war-progress-labels {
      display: flex;
      justify-content: space-between;
      font-size: 8px;
      font-weight: bold;

      .label-union {
        color: #93c5fd;
      }

      .label-poder {
        color: #e9d5ff;
      }
    }

    .war-progress-bar-track {
      display: flex;
      height: 8px;
      width: 100%;
      background: #0f172a;
      border-radius: 4px;
      overflow: hidden;
      border: 1px solid #334155;

      .war-bar-fill {
        height: 100%;

        &.union-fill {
          background: linear-gradient(90deg, #3b82f6, #60a5fa);
        }

        &.poder-fill {
          background: linear-gradient(90deg, #a855f7, #c084fc);
        }
      }
    }

    .war-points-detail {
      text-align: center;
      font-size: 7px;
      color: #64748b;
    }
  }

  .war-weekend-bonus-banner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: linear-gradient(90deg, Rgba(234, 179, 8, 0.15), Rgba(234, 179, 8, 0.25), Rgba(234, 179, 8, 0.15));
    border: 1px solid #eab308;
    border-radius: 4px;
    padding: 4px;

    .bonus-sparkle {
      font-size: 10px;
    }

    .bonus-text {
      font-size: 7.5px;
      font-weight: bold;
      color: #fef08a;
      letter-spacing: 0.5px;
    }
  }

  .war-action-section {
    display: flex;
    justify-content: center;

    .war-tactical-action-btn {
      @include pixelated;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: linear-gradient(135deg, #b91c1c, #991b1b);
      border: 1px solid #ef4444;
      border-radius: 6px;
      padding: 7px 12px;
      color: #ffffff;
      font-size: 9px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 2px 8px Rgba(185, 28, 28, 0.4);

      &:hover {
        background: linear-gradient(135deg, #ef4444, #b91c1c);
        transform: Translatey(-1px);
        box-shadow: 0 4px 12px Rgba(239, 68, 68, 0.5);
      }

      &.btn-guardian {
        background: linear-gradient(135deg, #d97706, #b45309);
        border-color: #fbbf24;
        box-shadow: 0 2px 8px Rgba(217, 119, 6, 0.4);

        &:hover {
          background: linear-gradient(135deg, #fbbf24, #d97706);
          box-shadow: 0 4px 12px Rgba(251, 191, 36, 0.5);
        }
      }

      .btn-icon {
        font-size: 11px;
      }
    }
  }
}
</style>
