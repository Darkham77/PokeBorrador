<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '@/stores/game'
import { useLivePvPStore } from '@/stores/livePvP'
import { useUIStore } from '@/stores/ui'
import type {
  BattleReplayRecord,
  BattleCode,
  ReplayCombatantSummary,
  ReplayChoiceStep
} from '@/types/battle/pvp'
import { isSeasonalThemeId } from '@/data/system/rankedData'
import type { SideID } from '@pkmn/sim'

interface Props {
  battleCode: string
}

const props = defineProps<Props>()

const gameStore = useGameStore()
const livePvPStore = useLivePvPStore()
const uiStore = useUIStore()

const loading = ref(false)

function parseJsonSafe<T>(val: unknown, fallback: T): T {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val) as T
    } catch {
      return fallback
    }
  }
  return (val as T) || fallback
}

async function handleWatch() {
  if (loading.value) return
  loading.value = true

  try {
    if (!gameStore.db) {
      uiStore.notify('Error de conexión a base de datos', '❌')
      return
    }

    const { data, error } = await gameStore.db
      .from('battle_replays')
      .select('*')
      .eq('battle_code', props.battleCode)
      .single()

    if (error || !data) {
      uiStore.notify(`No se encontró la repetición ${props.battleCode}`, '🔍')
      return
    }

    const raw = data as Record<string, unknown> // open-record: Generic key-value data dictionary container
    const defaultCombatant: ReplayCombatantSummary = {
      userId: '',
      username: '',
      tier: 'bronce',
      elo: 1000,
      team: []
    }
    const record: BattleReplayRecord = {
      id: String(raw.id || ''),
      battleCode: String(raw.battle_code || raw.battleCode || '') as BattleCode,
      seasonId: String(raw.season_id || raw.seasonId || ''),
      themeId: isSeasonalThemeId(raw.theme_id) ? raw.theme_id : (isSeasonalThemeId(raw.themeId) ? raw.themeId : 'masters_allstars'),
      p1: parseJsonSafe(raw.p1_data, (raw.p1 as ReplayCombatantSummary) || defaultCombatant),
      p2: parseJsonSafe(raw.p2_data, (raw.p2 as ReplayCombatantSummary) || defaultCombatant),
      turnsCount: Number(raw.turns_count ?? raw.turnsCount ?? 0),
      winnerSide: String(raw.winner_side || raw.winnerSide || 'p1') as SideID,
      choiceStream: parseJsonSafe(raw.choice_stream, (raw.choiceStream as ReplayChoiceStep[]) || []),
      initialSeed: parseJsonSafe(raw.initial_seed, (raw.initialSeed as [number, number, number, number]) || [0, 0, 0, 0]),
      isTop10Archived: Boolean(raw.is_top10_archived ?? raw.isTop10Archived),
      viewsCount: Number(raw.views_count ?? raw.viewsCount ?? 0),
      createdAt: String(raw.created_at || raw.createdAt || '')
    }

    livePvPStore.watchReplay(record)
  } catch {
    uiStore.notify('Error al cargar la repetición', '❌')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="chat-battle-code-badge">
    <div class="badge-code-info">
      <span class="swords-icon emoji">⚔️</span>
      <span class="code-text">{{ props.battleCode }}</span>
    </div>
    <button
      v-gsap-hover="'button'"
      class="watch-replay-btn"
      :disabled="loading"
      @click.stop="handleWatch"
    >
      <span v-if="loading">...</span>
      <span v-else>VER REPETICIÓN</span>
    </button>
  </div>
</template>

<style scoped lang="scss">
.chat-battle-code-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  padding: 4px 8px;
  background: Rgba(15, 23, 42, 0.9);
  border: 1px solid Rgba(234, 179, 8, 0.6);
  border-radius: 6px;
  font-family: 'Press Start 2P', monospace, sans-serif;
  font-size: 0.62rem;
  box-shadow: 0 2px 6px Rgba(0, 0, 0, 0.4);

  .badge-code-info {
    display: flex;
    align-items: center;
    gap: 4px;

    .swords-icon {
      font-size: 0.75rem;
    }

    .code-text {
      color: #fef08a;
      letter-spacing: 0.5px;
    }
  }

  .watch-replay-btn {
    padding: 3px 6px;
    background: linear-gradient(180deg, #3b82f6, #1d4ed8);
    border: 1px solid #60a5fa;
    border-radius: 4px;
    color: #ffffff;
    font-size: 0.55rem;
    font-family: inherit;
    font-weight: bold;
    cursor: pointer;

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}
</style>
