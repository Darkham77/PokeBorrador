<script setup lang="ts">
import type { VisibleCardActions } from '@/components/pokemon/pokemonDisplayCardHelper.ts'

interface Props {
  pokemonUid: string
  index: number
  visibleActions: VisibleCardActions
  hasHeldItem: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  openItem: [index: number]
  unequipItem: [index: number]
  openDetail: [index: number]
  sendToBox: [index: number]
  select: [index: number]
}>()
</script>

<template>
  <div class="card-footer">
    <div class="pdc-action-grid">
      <button
        v-if="props.visibleActions.item"
        :id="`pokemon-use-item-${props.pokemonUid}`"
        class="footer-btn item-btn"
        @click.stop="emit('openItem', props.index)"
      >
        <span class="emoji">🎒</span> USAR OBJETO
      </button>
      <button
        v-if="props.visibleActions.item"
        class="footer-btn unequip-btn"
        :disabled="!props.hasHeldItem"
        @click.stop="emit('unequipItem', props.index)"
      >
        <span class="emoji">❌</span> QUITAR OBJETO
      </button>
      <button
        v-if="props.visibleActions.details"
        class="footer-btn data-btn"
        @click.stop="emit('openDetail', props.index)"
      >
        <span class="emoji">📊</span> DATOS
      </button>
      <button
        v-if="props.visibleActions.box"
        class="footer-btn box-btn"
        @click.stop="emit('sendToBox', props.index)"
      >
        <span class="emoji">📦</span> CAJA
      </button>
      <button
        v-if="props.visibleActions.replace"
        class="footer-btn replace-btn"
        @click.stop="emit('select', props.index)"
      >
        <span class="emoji">🔄</span> REEMPLAZAR
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/pokemon-display-card" as *;
</style>
