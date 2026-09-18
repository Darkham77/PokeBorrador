<script setup lang="ts">
import { computed } from 'vue'
import type { FogOfWarSideState } from '@/logic/battle/replay/tacticalReplayEngine.ts'

const props = defineProps<{
  pokemon?: FogOfWarSideState['activePokemon'] | null
}>()

const DEFAULT_MOVES_COUNT = 4

const revealedMoves = computed(() => {
  const moves = props.pokemon?.revealedMoves || []
  return Array.from({ length: DEFAULT_MOVES_COUNT }, (_, idx) => moves[idx] || '???')
})
</script>

<template>
  <div class="fog-inspect-card">
    <div class="fog-detail-row">
      <span class="fog-lbl">OBJETO:</span>
      <span class="fog-val">{{ pokemon?.revealedItem || '???' }}</span>
    </div>
    <div class="fog-detail-row">
      <span class="fog-lbl">HABILIDAD:</span>
      <span class="fog-val">{{ pokemon?.revealedAbility || '???' }}</span>
    </div>
    <div class="fog-moves-grid">
      <span
        v-for="(moveName, mIdx) in revealedMoves"
        :key="mIdx"
        class="revealed-move-chip"
        :class="{ unknown: moveName === '???' }"
      >
        {{ moveName }}
      </span>
    </div>
  </div>
</template>

<style scoped src="./BattleReplayModal.styles.scss" lang="scss"></style>
