<script setup lang="ts">
import PVTooltip from '@/components/common/PVTooltip.vue'
import MoveTooltip from './MoveTooltip.vue'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'

const MOVE_TOOLTIP_DELAY_MS = 400

interface Props {
  move?: Move | null
  moveData?: Move | null
  playerInfo?: Pokemon | null
  isDragging?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  move: null,
  moveData: null,
  playerInfo: null,
  isDragging: false
})
</script>

<template>
  <template v-if="props.move">
    <PVTooltip
      :title="props.move.name"
      :delay="MOVE_TOOLTIP_DELAY_MS" 
      position="top"
      hide-on-click
      touch-instant
      class="info-tooltip-wrapper"
      :disabled="props.isDragging"
    >
      <template #content>
        <MoveTooltip 
          v-if="props.moveData"
          :move="props.moveData" 
          :player-info="props.playerInfo"
        />
      </template>
      
      <div 
        class="move-info-zone pixelated"
        @click.stop
      >
        ?
      </div>
    </PVTooltip>
  </template>
  <div
    v-else
    class="info-tooltip-wrapper is-empty-tab"
  />
</template>

<style scoped lang="scss" src="@/styles/components/_battle-move-slot.scss"></style>

