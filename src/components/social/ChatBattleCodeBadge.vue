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
      id="chat-battle-code-badge-btn-ver-repetici-n"
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
  gap: $spacing-sm;
  padding: 4px 8px;
  border: 1px solid Rgb(234 179 8 / 60%);
  border-radius: $radius-md;
  background: Rgb(15 23 42 / 90%);
  font-family: $font-family-pixel;
  font-size: var(--font-10);
  margin-top: 4px;
  box-shadow: var(--shadow-card);

  .badge-code-info {
    display: flex;
    align-items: center;
    gap: $spacing-xs;

    .swords-icon {
      font-size: var(--font-12);
    }

    .code-text {
      color: var(--yellow-light);
      letter-spacing: 0.5px;
    }
  }

  .watch-replay-btn {
    padding: 3px 6px;
    border: 1px solid var(--blue-400);
    border-radius: $radius-sm;
    background: Linear-Gradient(180deg, var(--blue-500), var(--blue-500));
    color: var(--white);
    font-family: inherit;
    font-size: var(--font-9);
    font-weight: bold;
    cursor: pointer;

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}
</style>
