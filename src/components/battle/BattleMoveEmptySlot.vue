<script setup lang="ts">
import PVTooltip from '@/components/common/PVTooltip.vue'

defineProps<{
  index: number
}>()

const EMPTY_SLOT_TOOLTIP_DELAY = 300 as const
</script>

<template>
  <div class="empty-move-placeholder-wrap">
    <PVTooltip
      position="top"
      :delay="EMPTY_SLOT_TOOLTIP_DELAY"
    >
      <template #content>
        <div class="empty-slot-hint">
          Puedes organizar y aprender nuevos movimientos desde la ficha de información del Pokémon.
        </div>
      </template>
      <div class="empty-move-placeholder pixelated">
        <span class="slot-num">SLOT {{ index + 1 }}</span>
        <span class="empty-text">- VACÍO -</span>
      </div>
    </PVTooltip>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_battle-move-slot.scss"></style>
