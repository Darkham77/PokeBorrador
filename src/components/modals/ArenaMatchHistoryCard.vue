<script setup lang="ts">
import type { PersonalPvPMatchSummary } from '@/types/battle/pvp';

defineProps<{
  item: PersonalPvPMatchSummary;
}>();

const emit = defineEmits<{
  (e: 'watch-replay', match: PersonalPvPMatchSummary): void;
  (e: 'copy-code', code: string): void;
}>();
</script>

<template>
  <div
    class="match-card"
    :class="item.result"
  >
    <div class="match-badge-col">
      <span
        class="result-badge text-outline"
        :class="item.result"
      >
        {{ item.result === 'victory' ? 'VICTORIA' : (item.result === 'defeat' ? 'DERROTA' : 'EMPATE') }}
      </span>
      <span
        v-if="item.deltaElo !== undefined && item.deltaElo !== 0"
        class="elo-delta text-outline"
        :class="{ positive: item.deltaElo > 0, negative: item.deltaElo < 0 }"
      >
        {{ item.deltaElo > 0 ? `+${item.deltaElo}` : item.deltaElo }} ELO
      </span>
    </div>

    <div class="match-info-col">
      <div class="rival-row">
        <span class="rival-label">VS</span>
        <span class="rival-name text-outline">{{ item.opponentName }}</span>
      </div>
      <div class="meta-row">
        <span class="meta-pill text-outline">{{ item.format === '6v6' ? '6V6' : '3V3' }}</span>
        <span
          v-if="item.isRanked"
          class="meta-pill ranked text-outline"
        >RANKED</span>
        <span
          v-else
          class="meta-pill casual text-outline"
        >AMISTOSO</span>
        <span class="meta-turns">{{ item.turnsCount }} turnos</span>
      </div>
    </div>

    <div class="match-actions-col">
      <button
        id="arena-match-history-card-btn-ver"
        v-gsap-hover="'button'"
        class="replay-btn"
        title="Reproducir combate"
        @click.stop="emit('watch-replay', item)"
      >
        <span class="emoji">▶️</span>
        <span>VER</span>
      </button>
      <button
        id="arena-match-history-card-btn-item-battlecode"
        v-gsap-hover="'button'"
        class="copy-code-btn"
        title="Copiar código de repetición"
        @click.stop="emit('copy-code', item.battleCode)"
      >
        <span class="emoji">📋</span>
        <span class="code-snippet">{{ item.battleCode }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.match-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-md;
  padding: 12px 16px;
  border: 1px solid Rgb(255 255 255 / 8%);
  border-radius: $radius-xl;
  background: Rgb(15 23 42 / 70%);
  backdrop-filter: Blur(8px);

  &.victory {
    border-left: 4px solid var(--emerald-500);
  }

  &.defeat {
    border-left: 4px solid var(--red-light);
  }

  &.draw {
    border-left: 4px solid var(--amber-dark);
  }
}

.match-badge-col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: $spacing-xs;
  min-width: 80px;

  .result-badge {
    padding: 2px 6px;
    border-radius: $radius-sm;
    font-family: $font-family-pokemon;
    font-size: var(--font-10);

    &.victory {
      border: 1px solid Rgb(16 185 129 / 40%);
      background: Rgb(16 185 129 / 20%);
      color: var(--emerald-400);
    }

    &.defeat {
      border: 1px solid Rgb(239 68 68 / 40%);
      background: Rgb(239 68 68 / 20%);
      color: var(--rose);
    }

    &.draw {
      border: 1px solid Rgb(245 158 11 / 40%);
      background: Rgb(245 158 11 / 20%);
      color: var(--amber);
    }
  }

  .elo-delta {
    font-family: $font-family-pokemon;
    font-size: var(--font-9);

    &.positive {
      color: var(--emerald-400);
    }

    &.negative {
      color: var(--rose);
    }
  }
}

.match-info-col {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  flex: 1;

  .rival-row {
    display: flex;
    align-items: center;
    gap: $spacing-sm-alt;

    .rival-label {
      color: var(--gray, #94a3b8);
      font-family: $font-family-pokemon;
      font-size: var(--font-9);
    }

    .rival-name {
      color: var(--slate-50);
      font-family: $font-family-pokemon;
      font-size: var(--font-12);
    }
  }

  .meta-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: $spacing-sm-alt;

    .meta-pill {
      padding: 1px 5px;
      border-radius: $radius-sm;
      background: Rgb(255 255 255 / 8%);
      color: var(--gray, #94a3b8);
      font-family: $font-family-pokemon;
      font-size: var(--font-8);

      &.ranked {
        background: Rgb(234 179 8 / 15%);
        color: var(--amber-300);
      }

      &.casual {
        background: Rgb(59 130 246 / 15%);
        color: var(--blue-300);
      }
    }

    .meta-turns {
      color: var(--gray, #94a3b8);
      font-size: var(--font-10);
    }
  }
}

.match-actions-col {
  display: flex;
  align-items: center;
  gap: $spacing-sm;

  .replay-btn {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    padding: 6px 10px;
    border: 1px solid var(--blue-400);
    border-radius: $radius-lg;
    background: Linear-Gradient(180deg, #2563eb, #1d4ed8);
    color: var(--white);
    font-family: $font-family-pokemon;
    font-size: var(--font-10);
    cursor: pointer;
  }

  .copy-code-btn {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    padding: 6px 8px;
    border: 1px solid Rgb(255 255 255 / 12%);
    border-radius: $radius-lg;
    background: Rgb(255 255 255 / 6%);
    color: var(--gray, #94a3b8);
    cursor: pointer;

    .code-snippet {
      font-family: $font-family-pokemon;
      font-size: var(--font-9);
    }
  }
}

@media (width <= 600px) {
  .match-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .match-actions-col {
    justify-content: flex-end;
    width: 100%;
  }
}
</style>
