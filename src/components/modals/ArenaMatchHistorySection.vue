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
</style>
