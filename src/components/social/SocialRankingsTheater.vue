<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useGameStore } from '@/stores/game'
import BaseRefreshButton from '@/components/common/BaseRefreshButton.vue'
import { useLivePvPStore } from '@/stores/livePvP'
import { useModalStore } from '@/stores/modals'
import { formatBattleCodeInput } from '@/logic/pvp/replayCodeGenerator'
import { isBattleCode, type BattleReplayRecord } from '@/types/battle/pvp'
import { parseReplayRow } from './socialTheaterHelper'
import { DEFAULT_FEATURED_REPLAYS_LIMIT } from '@/logic/pvp/rankedEngine'
import { logger } from '@/logic/utils/logger'

const emit = defineEmits<{
  (e: 'watch-replay', replay: BattleReplayRecord): void
}>()

const gameStore = useGameStore()
const livePvPStore = useLivePvPStore()
const modalStore = useModalStore()

const searchCodeInput = ref('')
const searchLoading = ref(false)
const searchError = ref<string | null>(null)
const featuredReplays = ref<BattleReplayRecord[]>([])
const listLoading = ref(false)

function onSearchInput(e: Event) {
  const target = e.target as HTMLInputElement
  searchCodeInput.value = formatBattleCodeInput(target.value)
}

async function handleSearch() {
  const code = searchCodeInput.value.trim().toUpperCase()
  if (!code) return
  if (!isBattleCode(code)) {
    searchError.value = 'Formato de código inválido (ej: BTL-ABCD-EFGH)'
    return
  }

  searchLoading.value = true
  searchError.value = null

  try {
    if (!gameStore.db) throw new Error('Base de datos no disponible')

    const { data, error } = await gameStore.db
      .from('battle_replays')
      .select('*')
      .eq('battle_code', code)
      .single() as { data: Record<string, unknown> | null; error: unknown }

    if (error || !data) {
      searchError.value = 'No se encontró ninguna repetición con ese código.'
      return
    }

    const replay = parseReplayRow(data)
    playReplay(replay)
  } catch (err) {
    logger.warn('SocialRankingsTheater', `Error buscando repetición: ${(err as Error).message}`)
    searchError.value = 'Error al buscar el combate.'
  } finally {
    searchLoading.value = false
  }
}

async function fetchFeaturedReplays() {
  if (!gameStore.db) return
  listLoading.value = true

  try {
    const { data, error } = await gameStore.db.rpc('fn_get_featured_replays', { p_limit: DEFAULT_FEATURED_REPLAYS_LIMIT }) as {
      data: Record<string, unknown>[] | null
      error: unknown
    }

    if (!error && Array.isArray(data)) {
      featuredReplays.value = data.map(r => parseReplayRow(r))
    }
  } catch (err) {
    logger.warn('SocialRankingsTheater', `Error cargando repeticiones destacadas: ${(err as Error).message}`)
  } finally {
    listLoading.value = false
  }
}


function playReplay(replay: BattleReplayRecord) {
  emit('watch-replay', replay)
  modalStore.close('Ranking')
  modalStore.close('Social')
  livePvPStore.watchReplay(replay)
}

onMounted(() => {
  fetchFeaturedReplays()
})
</script>

<template>
  <div class="theater-tab-root">
    <!-- SEARCH BAR SECTION -->
    <div class="search-banner-card">
      <div class="search-title-row">
        <span class="search-icon emoji">🔍</span>
        <span class="search-title">BUSCADOR DE REPETICIONES</span>
      </div>
      <p class="search-desc">
        Introduce un Battle Code para ver la repetición jugada a jugada con Niebla de Guerra auténtica.
      </p>

      <div class="search-input-group">
        <input
          id="input-battle-code-search"
          type="text"
          :value="searchCodeInput"
          placeholder="BTL-XXXX-XXXX"
          maxlength="14"
          class="pv-retro-input"
          @input="onSearchInput"
          @keyup.enter="handleSearch"
        >
        <button
          id="btn-search-replay"
          v-gsap-hover="'button'"
          class="pv-button-retro primary"
          :disabled="searchLoading || !searchCodeInput"
          @click="handleSearch"
        >
          {{ searchLoading ? 'BUSCANDO...' : 'VER COMBATE' }}
        </button>
      </div>

      <p
        v-if="searchError"
        class="search-error-msg"
      >
        <span class="emoji">⚠️</span> {{ searchError }}
      </p>
    </div>

    <!-- FEATURED REPLAYS FEED (TOP 10 & HIGHLIGHTS) -->
    <div class="featured-feed-section">
      <div class="feed-header">
        <span class="feed-title"><span class="emoji">🌟</span> COMBATES DESTACADOS DEL MES</span>
        <BaseRefreshButton
          id="btn-refresh-theater"
          variant="pill"
          :loading="listLoading"
          label="ACTUALIZAR"
          title="Actualizar Repeticiones"
          @click="fetchFeaturedReplays"
        />
      </div>

      <div
        v-if="listLoading"
        class="loading-state"
      >
        <span class="loading-spinner emoji">⏳</span>
        <span>Cargando repeticiones del Teatro...</span>
      </div>

      <div
        v-else-if="featuredReplays.length === 0"
        class="empty-state"
      >
        <span class="empty-icon emoji">🎭</span>
        <p>No hay combates archivados todavía este mes.</p>
        <span class="empty-sub">¡Los combates del Top 10 se archivarán aquí automáticamente!</span>
      </div>

      <div
        v-else
        id="theater-replays-list"
        class="replays-grid"
      >
        <div
          v-for="replay in featuredReplays"
          :key="replay.id"
          class="replay-card"
        >
          <div class="replay-card-header">
            <span class="replay-code">{{ replay.battleCode }}</span>
            <span
              v-if="replay.isTop10Archived"
              class="top10-badge"
            >TOP 10 <span class="emoji">👑</span></span>
          </div>

          <div class="combatants-matchup">
            <div
              class="combatant p1-side"
              :class="{ winner: replay.winnerSide === 'p1' }"
            >
              <span class="trainer-name">{{ replay.p1.username }}</span>
              <span class="trainer-meta">{{ replay.p1.tier }} · {{ replay.p1.elo }} ELO</span>
              <span
                v-if="replay.winnerSide === 'p1'"
                class="win-crown emoji"
              >🏆</span>
            </div>

            <span class="vs-divider">VS</span>

            <div
              class="combatant p2-side"
              :class="{ winner: replay.winnerSide === 'p2' }"
            >
              <span class="trainer-name">{{ replay.p2.username }}</span>
              <span class="trainer-meta">{{ replay.p2.tier }} · {{ replay.p2.elo }} ELO</span>
              <span
                v-if="replay.winnerSide === 'p2'"
                class="win-crown emoji"
              >🏆</span>
            </div>
          </div>

          <div class="replay-card-footer">
            <span class="turns-count"><span class="emoji">⏱️</span> {{ replay.turnsCount }} Turnos</span>
            <button
              :id="`btn-watch-replay-${replay.battleCode}`"
              v-gsap-hover="'button'"
              class="watch-btn"
              @click="playReplay(replay)"
            >
              <span class="emoji">▶</span> VER REPETICIÓN
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.theater-tab-root {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
  width: 100%;
}

.search-banner-card {
  padding: 16px;
  border: 1px solid Rgb(234 179 8 / 30%);
  border-radius: $radius-lg;
  background: Rgb(30 41 59 / 70%);

  .search-title-row {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    color: var(--amber-400);
    font-size: var(--font-13);
    font-weight: bold;
    margin-bottom: 6px;
  }

  .search-desc {
    color: var(--slate-400);
    font-size: var(--font-10);
    line-height: 1.4;
    margin-bottom: 12px;
  }

  .search-input-group {
    display: flex;
    gap: $spacing-md-alt;

    .pv-retro-input {
      padding: 8px 12px;
      border: 1px solid var(--slate-600);
      border-radius: $radius-sm;
      background: var(--slate-900);
      color: var(--slate-50);
      font-family: inherit;
      font-size: var(--font-12);
      flex: 1;
      letter-spacing: 1px;

      &:focus {
        border-color: var(--amber-dark);
        outline: none;
      }
    }

    .pv-button-retro {
      padding: 8px 16px;
      font-size: var(--font-11);
      cursor: pointer;
    }
  }

  .search-error-msg {
    color: var(--rose);
    font-size: var(--font-10);
    margin-top: 8px;
  }
}

.featured-feed-section {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;

  .feed-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .feed-title {
      color: var(--slate-200);
      font-size: var(--font-12);
      font-weight: bold;
    }


  }

  .loading-state, .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-sm;
    padding: 32px 16px;
    color: var(--slate-400);
    font-size: var(--font-11);
    text-align: center;

    .empty-icon {
      font-size: var(--font-32);
    }

    .empty-sub {
      color: var(--slate-500);
      font-size: var(--font-10);
    }
  }

  .replays-grid {
    display: grid;
    gap: $spacing-md;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }

  .replay-card {
    display: flex;
    flex-direction: column;
    gap: $spacing-md-alt;
    padding: 12px;
    border: 1px solid var(--slate-800);
    border-radius: $radius-md;
    background: var(--slate-900);

    .replay-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .replay-code {
        color: var(--amber-400);
        font-size: var(--font-11);
        font-weight: bold;
      }

      .top10-badge {
        padding: 2px 6px;
        border-radius: $radius-sm;
        background: #854d0e;
        color: var(--yellow-light);
        font-size: var(--font-9);
      }
    }

    .combatants-matchup {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: $spacing-sm;
      padding: 8px;
      border-radius: $radius-sm;
      background: var(--slate-800);

      .combatant {
        display: flex;
        flex-direction: column;
        font-size: var(--font-10);
        flex: 1;

        .trainer-name {
          color: var(--slate-100);
          font-weight: bold;
        }

        .trainer-meta {
          color: var(--slate-400);
          font-size: var(--font-9);
          text-transform: uppercase;
        }

        &.winner .trainer-name {
          color: var(--emerald);
        }
      }

      .vs-divider {
        color: var(--slate-500);
        font-size: var(--font-10);
        font-weight: bold;
      }
    }

    .replay-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .turns-count {
        color: var(--slate-400);
        font-size: var(--font-10);
      }

      .watch-btn {
        padding: 6px 10px;
        border: 1px solid var(--blue-400);
        border-radius: $radius-sm;
        background: var(--blue-500);
        color: var(--white);
        font-family: inherit;
        font-size: var(--font-10);
        cursor: pointer;
      }
    }
  }
}
</style>
