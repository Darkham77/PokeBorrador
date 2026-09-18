<script setup lang="ts">
import { ref, shallowRef, computed, watch } from 'vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BattleTacticalReplayer from './BattleTacticalReplayer.vue'
import BattleReplayCombatantPod from './BattleReplayCombatantPod.vue'
import { TacticalReplayEngine } from '@/logic/battle/replay/tacticalReplayEngine.ts'
import { useLivePvPStore } from '@/stores/livePvP.ts'
import { useModalStore } from '@/stores/modals.ts'
import type { BattleReplayRecord } from '@/types/battle/pvp.ts'

interface Props {
  show?: boolean
  replay?: BattleReplayRecord | null
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  replay: null
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const livePvPStore = useLivePvPStore()
const modalStore = useModalStore()

const currentReplay = computed(() => props.replay || livePvPStore.activeReplay)

const engine = shallowRef<TacticalReplayEngine | null>(null)
const currentTurn = ref(0)

watch(currentReplay, (newVal) => {
  if (newVal) {
    engine.value = new TacticalReplayEngine(newVal)
    currentTurn.value = 0
  } else {
    engine.value = null
  }
}, { immediate: true })

function onTurnChange(turn: number) {
  currentTurn.value = turn
}

const p1State = computed(() => engine.value?.getFogOfWarState('p1') ?? null)
const p2State = computed(() => engine.value?.getFogOfWarState('p2') ?? null)
const currentLogs = computed(() => engine.value?.getLogsForCurrentTurn() ?? [])
const isOver = computed(() => engine.value?.isOver() ?? false)
const winnerText = computed(() => {
  if (!engine.value || !isOver.value) return ''
  const side = engine.value.getWinnerSide()
  const name = side === 'p1' ? p1State.value?.username : p2State.value?.username
  return `¡VICTORIA PARA ${name || 'JUGADOR'}!`
})

function handleClose() {
  livePvPStore.activeReplay = null
  emit('close')
  modalStore.close('BattleReplay')
}
</script>

<template>
  <BaseModal
    id="battle-replay-modal"
    :show="show || !!currentReplay"
    type="fullscreen"
    max-width="100dvw"
    height="100dvh"
    variant="modern"
    overlay="dark"
    close-button-variant="yellow-solid"
    :show-close-button="false"
    :close-on-click-outside="false"
    :hide-header="true"
    padding="raw"
    custom-class="battle-replay-modal"
    @close="handleClose"
  >
    <div
      v-if="engine && p1State && p2State"
      class="replay-spectator-arena"
    >
      <!-- HEADER STATUS BAR -->
      <div class="replay-top-bar">
        <div class="header-side p1-info">
          <span class="trainer-name">{{ p1State.username }}</span>
          <span class="trainer-tag elo">{{ p1State.elo }} ELO</span>
          <span class="trainer-tag tier">{{ p1State.tier }}</span>
        </div>

        <div class="header-center">
          <span class="vs-badge">VS</span>
        </div>

        <div class="header-side p2-info">
          <span class="trainer-tag tier">{{ p2State.tier }}</span>
          <span class="trainer-tag elo">{{ p2State.elo }} ELO</span>
          <span class="trainer-name">{{ p2State.username }}</span>
        </div>
      </div>

      <!-- MAIN ARENA STAGE -->
      <div class="replay-battlefield">
        <!-- P2 (Opponent / Top Right) -->
        <BattleReplayCombatantPod
          :state="p2State"
          :is-player="false"
        />

        <!-- P1 (Challenger / Bottom Left) -->
        <BattleReplayCombatantPod
          :state="p1State"
          :is-player="true"
        />

        <!-- TURN LOGS PANEL -->
        <div class="turn-logs-box custom-scrollbar">
          <div class="logs-header">
            <span class="logs-title">REGISTRO DE ACCIONES (TURNO {{ currentTurn }})</span>
          </div>
          <div
            v-if="currentLogs.length === 0"
            class="logs-empty"
          >
            <span>Esperando acción inicial del combate...</span>
          </div>
          <div
            v-else
            class="logs-list"
          >
            <div
              v-for="(line, lIdx) in currentLogs"
              :key="lIdx"
              class="log-entry"
            >
              {{ line }}
            </div>
          </div>
        </div>

        <!-- MATCH OVER OVERLAY -->
        <div
          v-if="isOver"
          class="match-over-banner"
        >
          <span class="trophy emoji">🏆</span>
          <span class="winner-title">{{ winnerText }}</span>
        </div>
      </div>

      <!-- BOTTOM STEPPER BAR -->
      <BattleTacticalReplayer
        :engine="engine"
        @close="handleClose"
        @turn-change="onTurnChange"
      />
    </div>
  </BaseModal>
</template>

<style scoped src="./BattleReplayModal.styles.scss" lang="scss"></style>
