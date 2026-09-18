<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '@/stores/game'
import { useLivePvPStore } from '@/stores/livePvP'
import { useUIStore } from '@/stores/ui'
import { mapDbRecordToBattleReplay } from './chatBattleCodeHelper'

interface Props {
  battleCode: string
}

const props = defineProps<Props>()

const gameStore = useGameStore()
const livePvPStore = useLivePvPStore()
const uiStore = useUIStore()

const loading = ref(false)

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

    const record = mapDbRecordToBattleReplay(data)
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
