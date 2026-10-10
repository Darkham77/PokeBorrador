<script setup lang="ts">
import { computed } from 'vue';
import { useClipboard } from '@vueuse/core';
import { usePvPStore } from '@/stores/pvp';
import { useLivePvPStore } from '@/stores/livePvP';
import { useUIStore } from '@/stores/ui';
import { useGameStore } from '@/stores/game';
import { parseBattleReplayRecord } from '@/logic/pvp/replayCodeGenerator';
import type { PersonalPvPMatchSummary } from '@/types/battle/pvp';
import ArenaMatchHistoryCard from './ArenaMatchHistoryCard.vue';

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
      <ArenaMatchHistoryCard
        v-for="item in history"
        :key="item.id || item.battleCode"
        :item="item"
        @watch-replay="watchReplay"
        @copy-code="copyBattleCode"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.arena-match-history-section {
  display: flex;
  flex-direction: column;
  gap: $spacing-md-alt;
  width: 100%;
}

.empty-history-box {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
  border: 1px dashed Rgb(255 255 255 / 10%);
  border-radius: $radius-2xl;
  background: Rgb(15 23 42 / 40%);
  text-align: center;

  .empty-icon {
    font-size: var(--font-32);
    margin-bottom: 8px;
  }

  .empty-title {
    margin: 0 0 6px;
    color: var(--yellow);
    font-family: $font-family-pokemon;
    font-size: var(--font-13);
  }

  .empty-desc {
    max-width: 320px;
    margin: 0;
    color: var(--gray, #94a3b8);
    font-size: var(--font-11);
  }
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}
</style>
