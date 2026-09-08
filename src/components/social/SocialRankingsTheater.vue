<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useGameStore } from '@/stores/game'
import BaseRefreshButton from '@/components/common/BaseRefreshButton.vue'
import { useLivePvPStore } from '@/stores/livePvP'
import { useModalStore } from '@/stores/modals'
import { formatBattleCodeInput } from '@/logic/pvp/replayCodeGenerator'
import { isBattleCode, type BattleReplayRecord, type BattleCode } from '@/types/battle/pvp'
import { isSeasonalThemeId } from '@/data/system/rankedData'
import type { SideID } from '@pkmn/sim'
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
    const { data, error } = await gameStore.db.rpc('fn_get_featured_replays', { p_limit: 10 }) as {
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

function parseReplayRow(r: Record<string, unknown>): BattleReplayRecord {
  const p1 = typeof r.p1_data === 'string' ? JSON.parse(r.p1_data) : (r.p1 || r.p1_data || {})
  const p2 = typeof r.p2_data === 'string' ? JSON.parse(r.p2_data) : (r.p2 || r.p2_data || {})
  const choiceStream = typeof r.choice_stream === 'string' ? JSON.parse(r.choice_stream) : (r.choiceStream || r.choice_stream || [])
  const initialSeed = typeof r.initial_seed === 'string' ? JSON.parse(r.initial_seed) : (r.initialSeed || r.initial_seed || [0, 0, 0, 0])

  return {
    id: String(r.id || ''),
    battleCode: String(r.battleCode || r.battle_code || '') as BattleCode,
    seasonId: String(r.seasonId || r.season_id || ''),
    themeId: isSeasonalThemeId(r.themeId) ? r.themeId : (isSeasonalThemeId(r.theme_id) ? r.theme_id : 'masters_allstars'),
    p1,
    p2,
    turnsCount: Number(r.turnsCount ?? r.turns_count ?? 0),
    winnerSide: String(r.winnerSide || r.winner_side || 'p1') as SideID,
    choiceStream,
    initialSeed,
    isTop10Archived: Boolean(r.isTop10Archived ?? r.is_top10_archived),
    viewsCount: Number(r.viewsCount ?? r.views_count ?? 0),
    createdAt: String(r.createdAt || r.created_at || '')
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
  gap: 16px;
  width: 100%;
}

.search-banner-card {
  padding: 16px;
  background: Rgba(30, 41, 59, 0.7);
  border: 1px solid Rgba(234, 179, 8, 0.3);
  border-radius: 8px;

  .search-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.8rem;
    font-weight: bold;
    color: #facc15;
    margin-bottom: 6px;
  }

  .search-desc {
    font-size: 0.65rem;
    color: #94a3b8;
    margin-bottom: 12px;
    line-height: 1.4;
  }

  .search-input-group {
    display: flex;
    gap: 10px;

    .pv-retro-input {
      flex: 1;
      padding: 8px 12px;
      background: #0f172a;
      border: 1px solid #475569;
      border-radius: 4px;
      color: #f8fafc;
      font-family: inherit;
      font-size: 0.75rem;
      letter-spacing: 1px;

      &:focus {
        border-color: #eab308;
        outline: none;
      }
    }

    .pv-button-retro {
      padding: 8px 16px;
      font-size: 0.7rem;
      cursor: pointer;
    }
  }

  .search-error-msg {
    margin-top: 8px;
    font-size: 0.65rem;
    color: #f87171;
  }
}

.featured-feed-section {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .feed-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .feed-title {
      font-size: 0.75rem;
      color: #e2e8f0;
      font-weight: bold;
    }


  }

  .loading-state, .empty-state {
    padding: 32px 16px;
    text-align: center;
    color: #94a3b8;
    font-size: 0.7rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;

    .empty-icon {
      font-size: 2rem;
    }

    .empty-sub {
      font-size: 0.6rem;
      color: #64748b;
    }
  }

  .replays-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
  }

  .replay-card {
    padding: 12px;
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    gap: 10px;

    .replay-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .replay-code {
        font-size: 0.7rem;
        color: #facc15;
        font-weight: bold;
      }

      .top10-badge {
        font-size: 0.55rem;
        padding: 2px 6px;
        background: #854d0e;
        border-radius: 4px;
        color: #fef08a;
      }
    }

    .combatants-matchup {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px;
      background: #1e293b;
      border-radius: 4px;

      .combatant {
        display: flex;
        flex-direction: column;
        flex: 1;
        font-size: 0.65rem;

        .trainer-name {
          font-weight: bold;
          color: #f1f5f9;
        }

        .trainer-meta {
          font-size: 0.55rem;
          color: #94a3b8;
          text-transform: uppercase;
        }

        &.winner .trainer-name {
          color: #22c55e;
        }
      }

      .vs-divider {
        font-size: 0.6rem;
        color: #64748b;
        font-weight: bold;
      }
    }

    .replay-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .turns-count {
        font-size: 0.6rem;
        color: #94a3b8;
      }

      .watch-btn {
        padding: 6px 10px;
        background: #3b82f6;
        border: 1px solid #60a5fa;
        color: #ffffff;
        font-family: inherit;
        font-size: 0.6rem;
        border-radius: 4px;
        cursor: pointer;
      }
    }
  }
}
</style>
