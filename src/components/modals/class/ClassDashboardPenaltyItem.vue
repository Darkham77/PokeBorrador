<script setup lang="ts">
import { computed } from 'vue'
import { gsap } from 'gsap'
import PVTooltip from '@/components/common/PVTooltip.vue'

const props = withDefaults(defineProps<{
  penalty: string
  technicalPenalty?: string
}>(), {
  technicalPenalty: ''
})

const HOVER_DURATION_SEC = 0.2
const tooltipText = computed(() => props.technicalPenalty || 'Información no disponible.')

const onMouseEnter = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  gsap.to(target, {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    duration: HOVER_DURATION_SEC,
    ease: 'power2.out',
    overwrite: 'auto'
  })
}

const onMouseLeave = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  gsap.to(target, {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    duration: HOVER_DURATION_SEC,
    ease: 'power2.out',
    overwrite: 'auto'
  })
}
</script>

<template>
  <div 
    class="ability-item limitation"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <div class="ability-checkbox">
      <span class="emoji">❌</span>
    </div>
    <div class="ability-content">
      <p>{{ penalty }}</p>
    </div>
    <PVTooltip
      :description="tooltipText"
      position="top"
      :delay="100"
      style="cursor: help;"
    >
      <span class="ability-help"><span class="emoji">❓</span></span>
    </PVTooltip>
  </div>
</template>

<style src="./ClassDashboard.styles.scss" scoped lang="scss"></style>
