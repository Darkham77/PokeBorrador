<script setup lang="ts">
import { computed } from 'vue';
import { useClipboard } from '@vueuse/core';
import { usePvPStore } from '@/stores/pvp';
import { useLivePvPStore } from '@/stores/livePvP';
import { useUIStore } from '@/stores/ui';
import { useGameStore } from '@/stores/game';
import { parseBattleReplayRecord } from '@/logic/pvp/replayCodeGenerator';
import type { PersonalPvPMatchSummary } from '@/types/battle/pvp';

const pvpStore = usePvPStore();
const livePvPStore = useLivePvPStore();
const uiStore = useUIStore();
const gameStore = useGameStore();
const { copy } = useClipboard();

const history = computed(() => pvpStore.personalMatchHistory);

async function copyBattleCode(code: string) {
  await copy(code);
  uiStore.notify(`Código ${code} copiado al portapapeles.`, '📋');
}

async function watchReplay(match: PersonalPvPMatchSummary) {
  if (!gameStore.db) {
    uiStore.notify('Base de datos no disponible.', '⚠️');
    return;
  }
  uiStore.notify('Cargando repetición...', '⏳');
  try {
    const { data, error } = await gameStore.db
      .from('battle_replays')
      .select('*')
      .eq('battle_code', match.battleCode)
      .maybeSingle();

    if (error || !data) {
      uiStore.notify('Repetición no encontrada en el servidor.', '🔍');
      return;
    }
    livePvPStore.watchReplay(parseBattleReplayRecord(data as Record<string, unknown>)); // open-record: Generic key-value data dictionary container
  } catch {
    uiStore.notify('Error al cargar la repetición.', '❌');
  }
}
</script>

<template>
  <div class="arena-match-history-section">
    <div
      v-if="history.length === 0"
      class="empty-history-box"
    >
      <span class="empty-icon"><span class="emoji">⚔️</span></span>
      <h4 class="empty-title text-outline">
        SIN COMBATES REGISTRADOS
      </h4>
      <p class="empty-desc">
        Tus partidas clasificatorias y duelos amistosos aparecerán aquí automáticamente.
      </p>
    </div>

    <div
      v-else
      class="history-list"
    >
      <div
        v-for="item in history"
        :key="item.id || item.battleCode"
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
            v-gsap-hover="'button'"
            class="replay-btn"
            title="Reproducir combate"
            @click.stop="watchReplay(item)"
          >
            <span class="emoji">▶️</span>
            <span>VER</span>
          </button>
          <button
            v-gsap-hover="'button'"
            class="copy-code-btn"
            title="Copiar código de repetición"
            @click.stop="copyBattleCode(item.battleCode)"
          >
            <span class="emoji">📋</span>
            <span class="code-snippet">{{ item.battleCode }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.arena-match-history-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.empty-history-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  background: Rgba(15, 23, 42, 0.4);
  border: 1px dashed Rgba(255, 255, 255, 0.1);
  border-radius: 16px;

  .empty-icon {
    font-size: 32px;
    margin-bottom: 8px;
  }

  .empty-title {
    font-family: 'Pokemon FireRed LeafGreen', monospace;
    font-size: 13px;
    color: var(--yellow);
    margin: 0 0 6px;
  }

  .empty-desc {
    font-size: 11px;
    color: var(--gray, #94a3b8);
    margin: 0;
    max-width: 320px;
  }
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.match-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: Rgba(15, 23, 42, 0.7);
  border: 1px solid Rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  backdrop-filter: Blur(8px);

  &.victory {
    border-left: 4px solid #10b981;
  }

  &.defeat {
    border-left: 4px solid #ef4444;
  }

  &.draw {
    border-left: 4px solid #f59e0b;
  }
}

.match-badge-col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-width: 80px;

  .result-badge {
    font-family: 'Pokemon FireRed LeafGreen', monospace;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;

    &.victory {
      background: Rgba(16, 185, 129, 0.2);
      color: #34d399;
      border: 1px solid Rgba(16, 185, 129, 0.4);
    }

    &.defeat {
      background: Rgba(239, 68, 68, 0.2);
      color: #f87171;
      border: 1px solid Rgba(239, 68, 68, 0.4);
    }

    &.draw {
      background: Rgba(245, 158, 11, 0.2);
      color: #fbbf24;
      border: 1px solid Rgba(245, 158, 11, 0.4);
    }
  }

  .elo-delta {
    font-family: 'Pokemon FireRed LeafGreen', monospace;
    font-size: 9px;

    &.positive {
      color: #34d399;
    }

    &.negative {
      color: #f87171;
    }
  }
}

.match-info-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;

  .rival-row {
    display: flex;
    align-items: center;
    gap: 6px;

    .rival-label {
      font-family: 'Pokemon FireRed LeafGreen', monospace;
      font-size: 9px;
      color: var(--gray, #94a3b8);
    }

    .rival-name {
      font-family: 'Pokemon FireRed LeafGreen', monospace;
      font-size: 12px;
      color: #f8fafc;
    }
  }

  .meta-row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;

    .meta-pill {
      font-family: 'Pokemon FireRed LeafGreen', monospace;
      font-size: 8px;
      padding: 1px 5px;
      border-radius: 4px;
      background: Rgba(255, 255, 255, 0.08);
      color: var(--gray, #94a3b8);

      &.ranked {
        background: Rgba(234, 179, 8, 0.15);
        color: #fde047;
      }

      &.casual {
        background: Rgba(59, 130, 246, 0.15);
        color: #93c5fd;
      }
    }

    .meta-turns {
      font-size: 10px;
      color: var(--gray, #94a3b8);
    }
  }
}

.match-actions-col {
  display: flex;
  align-items: center;
  gap: 8px;

  .replay-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    background: linear-gradient(180deg, #2563eb, #1d4ed8);
    border: 1px solid #60a5fa;
    border-radius: 8px;
    font-family: 'Pokemon FireRed LeafGreen', monospace;
    font-size: 10px;
    color: #ffffff;
    cursor: pointer;
  }

  .copy-code-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 8px;
    background: Rgba(255, 255, 255, 0.06);
    border: 1px solid Rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    cursor: pointer;
    color: var(--gray, #94a3b8);

    .code-snippet {
      font-family: 'Pokemon FireRed LeafGreen', monospace;
      font-size: 9px;
    }
  }
}

@media (max-width: 600px) {
  .match-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .match-actions-col {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
