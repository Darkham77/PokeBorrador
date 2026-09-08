<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useGameStore } from '@/stores/game';
import { useLivePvPStore } from '@/stores/livePvP';
import { useUIStore } from '@/stores/ui';
import type { BattleReplayRecord } from '@/types/battle/pvp';
import { parseBattleReplayRecord } from '@/logic/pvp/replayCodeGenerator';
import ArenaMatchHistorySection from './ArenaMatchHistorySection.vue';

const gameStore = useGameStore();
const livePvP = useLivePvPStore();
const ui = useUIStore();

type ReplaySubTab = 'my_matches' | 'community' | 'search';
const currentSubTab = ref<ReplaySubTab>('my_matches');

const searchBattleCode = ref('');
const isSearching = ref(false);
const recentReplays = ref<BattleReplayRecord[]>([]);
const activeLiveMatches = ref<{ id: string; p1Name: string; p2Name: string; turns: number }[]>([]);

async function loadReplays() {
  if (!gameStore.db) return;
  try {
    const { data } = await gameStore.db
      .from('battle_replays')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(6);
    if (data && Array.isArray(data)) {
      recentReplays.value = data.map(parseBattleReplayRecord);
    }
  } catch {
    // Ignore offline query errors
  }
}

async function searchByCode() {
  const code = searchBattleCode.value.trim().toUpperCase();
  if (!code) return;
  isSearching.value = true;
  try {
    if (!gameStore.db) {
      ui.notify('Base de datos no disponible.', '⚠️');
      return;
    }
    const { data, error } = await gameStore.db
      .from('battle_replays')
      .select('*')
      .eq('battle_code', code)
      .maybeSingle();

    if (error || !data) {
      ui.notify('Batalla no encontrada.', '🔍');
      return;
    }
    livePvP.watchReplay(parseBattleReplayRecord(data));
  } finally {
    isSearching.value = false;
  }
}

function handleWatchReplay(replay: BattleReplayRecord) {
  livePvP.watchReplay(replay);
}

function handleSpectateLive(matchId: string) {
  ui.notify('Conectando como espectador a la batalla...', '📺');
  livePvP.spectateMatch(matchId);
}

onMounted(() => {
  loadReplays();
});
</script>

<template>
  <div class="arena-replays-panel">
    <!-- Sub Navigation Tabs -->
    <div class="replay-sub-nav">
      <button
        id="btn-replay-subtab-my-matches"
        v-gsap-hover="'button'"
        class="sub-tab-btn"
        :class="{ active: currentSubTab === 'my_matches' }"
        @click="currentSubTab = 'my_matches'"
      >
        <span class="emoji">📜</span> MIS COMBATES
      </button>
      <button
        id="btn-replay-subtab-community"
        v-gsap-hover="'button'"
        class="sub-tab-btn"
        :class="{ active: currentSubTab === 'community' }"
        @click="currentSubTab = 'community'"
      >
        <span class="emoji">📺</span> COMUNIDAD
      </button>
      <button
        id="btn-replay-subtab-search"
        v-gsap-hover="'button'"
        class="sub-tab-btn"
        :class="{ active: currentSubTab === 'search' }"
        @click="currentSubTab = 'search'"
      >
        <span class="emoji">🔍</span> BUSCAR CÓDIGO
      </button>
    </div>

    <!-- Personal Match History -->
    <ArenaMatchHistorySection v-if="currentSubTab === 'my_matches'" />

    <!-- Battle Code Direct Search Card -->
    <section
      v-else-if="currentSubTab === 'search'"
      class="replay-search-card"
    >
      <div class="card-header">
        <span class="header-icon"><span class="emoji">🔍</span></span>
        <div class="header-text">
          <h3 class="panel-subtitle text-outline">
            BUSCAR BATALLA POR CÓDIGO
          </h3>
          <p class="panel-desc">
            Introduce el código (ej: BTL-8821-490) para reproducir cualquier combate histórico
          </p>
        </div>
      </div>

      <div class="search-bar">
        <div class="search-input-wrap">
          <span class="input-prefix-icon"><span class="emoji">🏷️</span></span>
          <input
            id="input-replay-battle-code"
            v-model="searchBattleCode"
            type="text"
            placeholder="BTL-XXXX-YYY"
            class="code-input text-outline"
            @input="searchBattleCode = searchBattleCode.toUpperCase()"
            @keyup.enter="searchByCode"
          >
        </div>
        <button
          id="btn-search-battle-code"
          v-gsap-hover="'button'"
          class="search-btn"
          :disabled="!searchBattleCode.trim() || isSearching"
          @click="searchByCode"
        >
          <span class="emoji icon">▶️</span>
          {{ isSearching ? 'BUSCANDO...' : 'VER BATALLA' }}
        </button>
      </div>
    </section>

    <!-- Live Matches (Spectate) Card -->
    <section
      v-if="currentSubTab === 'community' && activeLiveMatches.length > 0"
      class="live-matches-card"
    >
      <div class="card-header live-header">
        <span class="header-icon"><span class="emoji">🔴</span></span>
        <div class="header-text">
          <h3 class="panel-subtitle live-subtitle text-outline">
            COMBATES EN DIRECTO
          </h3>
          <p class="panel-desc">
            Presencia partidas activas de la comunidad en tiempo real
          </p>
        </div>
      </div>

      <div class="live-grid">
        <div
          v-for="match in activeLiveMatches"
          :key="match.id"
          class="live-match-item"
        >
          <div class="match-info">
            <div class="trainers-row">
              <span class="trainer-name text-outline">{{ match.p1Name }}</span>
              <span class="vs-tag">vs</span>
              <span class="trainer-name text-outline">{{ match.p2Name }}</span>
            </div>
            <span class="turn-tag">Turno {{ match.turns }}</span>
          </div>
          <button
            :id="'btn-spectate-live-' + match.id"
            v-gsap-hover="'button'"
            class="spectate-btn"
            @click="handleSpectateLive(match.id)"
          >
            <span class="emoji">👁️</span> ESPECTAR
          </button>
        </div>
      </div>
    </section>

    <!-- Recent Replays Card -->
    <section
      v-if="currentSubTab === 'community'"
      class="recent-replays-card"
    >
      <div class="card-header">
        <span class="header-icon"><span class="emoji">📺</span></span>
        <div class="header-text">
          <h3 class="panel-subtitle text-outline">
            REPETICIONES RECIENTES
          </h3>
          <p class="panel-desc">
            Últimos enfrentamientos registrados en el coliseo
          </p>
        </div>
      </div>

      <div class="replays-content">
        <!-- Replay Items Grid -->
        <div
          v-if="recentReplays.length > 0"
          class="replays-grid"
        >
          <div
            v-for="replay in recentReplays"
            :key="replay.id"
            class="replay-item-card"
            @click="handleWatchReplay(replay)"
          >
            <div class="replay-top">
              <span class="code-badge text-outline">{{ replay.battleCode || 'BTL-HISTORIC' }}</span>
              <span class="turns-badge">{{ replay.turnsCount || 10 }} turnos</span>
            </div>
            <div class="replay-combatants">
              <span class="trainer p1 text-outline">{{ replay.p1?.username || 'Entrenador 1' }}</span>
              <span class="vs">vs</span>
              <span class="trainer p2 text-outline">{{ replay.p2?.username || 'Entrenador 2' }}</span>
            </div>
            <button
              :id="'btn-watch-replay-' + replay.id"
              v-gsap-hover="'button'"
              class="watch-replay-btn"
            >
              <span class="emoji">▶️</span> VER REPETICIÓN
            </button>
          </div>
        </div>

        <!-- Retro-Modern Empty State -->
        <div
          v-else
          class="empty-replays-box"
        >
          <div class="empty-icon-halo">
            <span class="emoji empty-icon">📺</span>
          </div>
          <h4 class="empty-title text-outline">
            SIN REPETICIONES REGISTRADAS
          </h4>
          <p class="empty-desc">
            ¡Participa en combates de la Arena o busca una partida por su código para revivir la acción aquí!
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped src="./ArenaReplaysPanel.styles.scss" lang="scss"></style>

