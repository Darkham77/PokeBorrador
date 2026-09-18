<script setup lang="ts">
import { computed } from 'vue'
import { gsap } from 'gsap'
import PVTooltip from '@/components/common/PVTooltip.vue'

const props = withDefaults(defineProps<{
  bonus: string
  technicalBonus?: string
  reqLevel?: number
  classLevel: number
}>(), {
  technicalBonus: '',
  reqLevel: 1
})

const DEFAULT_REQ_LEVEL = 1
const HOVER_DURATION_SEC = 0.2

const effectiveReqLevel = computed(() => props.reqLevel || DEFAULT_REQ_LEVEL)
const isLocked = computed(() => effectiveReqLevel.value > props.classLevel)
const showLevelBadge = computed(() => effectiveReqLevel.value > DEFAULT_REQ_LEVEL)
const tooltipText = computed(() => props.technicalBonus || 'Información no disponible.')

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
    class="ability-item"
    :class="{ locked: isLocked }"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <div class="ability-checkbox">
      <span class="emoji">{{ !isLocked ? '✅' : '🔒' }}</span>
    </div>
    <div class="ability-content">
      <p :class="{ 'text-locked': isLocked }">
        {{ bonus }}
      </p>
      <span
        v-if="isLocked"
        class="req-hint"
      >
        Requiere Nivel de Clase {{ effectiveReqLevel }}
      </span>
    </div>
    <div 
      v-if="showLevelBadge" 
      class="lv-badge"
    >
      NV. {{ effectiveReqLevel }}
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
