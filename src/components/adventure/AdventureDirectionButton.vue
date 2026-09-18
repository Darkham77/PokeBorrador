<script setup lang="ts">
import { computed } from 'vue'
import { gsapHover as vGsapHover } from '@/directives/gsapHover'
import type { AdventureNodeId } from '../../../test aventura/kantoGraph.ts'
import type { CardinalDirection } from '@/types/system/game'
import type { DirectionConnectionItem } from './adventureDirectionTypes'

const props = withDefaults(defineProps<{
  direction: CardinalDirection
  conn: DirectionConnectionItem
  disabled?: boolean
  isMoMissing?: boolean
}>(), {
  disabled: false,
  isMoMissing: false
})

const emit = defineEmits<{
  (e: 'travel', target: AdventureNodeId): void
}>()

const dirIcon = computed(() => {
  switch (props.direction) {
    case 'left': return '⬅️'
    case 'top': return '⬆️'
    case 'bottom': return '⬇️'
    case 'right': return '➡️'
    default: return '➡️'
  }
})
</script>

<template>
  <button
    :id="`adv-direction-${direction}-btn-${conn.target}`"
    v-gsap-hover
    class="adv-manual-btn"
    :disabled="disabled"
    @click="emit('travel', conn.target)"
  >
    <span class="emoji dir-icon">{{ dirIcon }}</span>
    <span class="dir-label">{{ conn.label }}</span>
    <span
      v-if="conn.mo"
      class="dir-mo"
      :class="{ 'mo-missing': isMoMissing }"
    >
      {{ conn.mo }}
    </span>
  </button>
</template>

<style scoped lang="scss" src="@/views/adventure/AdventureTestView.styles.manual.scss"></style>
