<script setup lang="ts">
import { gsap } from 'gsap'
import VirtualEntity from './VirtualEntity.vue'
import {
  HUD_TRANSITION_DURATION_SEC,
  DIALOG_ENTER_Y_OFFSET_PX,
  DIALOG_LEAVE_Y_OFFSET_PX,
  DIALOG_LEAVE_DURATION_SEC
} from '@/logic/constants/animations'

defineProps<{
  position: { x: number; y: number }
  baseSize: number
  visible: boolean
  trainerName: string
  dialogText: string
}>()

const onDialogBeforeEnter = (el: Element) => {
  gsap.set(el, { opacity: 0, y: DIALOG_ENTER_Y_OFFSET_PX })
}

const onDialogEnter = (el: Element, done: () => void) => {
  gsap.to(el, { opacity: 1, y: 0, duration: HUD_TRANSITION_DURATION_SEC, ease: "power2.out", onComplete: done })
}

const onDialogLeave = (el: Element, done: () => void) => {
  gsap.to(el, { opacity: 0, y: DIALOG_LEAVE_Y_OFFSET_PX, duration: DIALOG_LEAVE_DURATION_SEC, ease: "power2.in", onComplete: done })
}
</script>

<template>
  <VirtualEntity
    :x="position.x"
    :y="position.y"
    :w="baseSize"
    :h="baseSize"
    :z-index="'calc(var(--z-map-spawns) + 6)'"
    class="dialog-bubble-entity"
  >
    <Transition
      :css="false"
      appear
      @before-enter="onDialogBeforeEnter"
      @enter="onDialogEnter"
      @leave="onDialogLeave"
    >
      <div
        v-if="visible"
        class="speech-bubble"
      >
        <div class="bubble-speaker">
          {{ trainerName }}:
        </div>
        <div class="bubble-text">
          {{ dialogText }}
        </div>
        <div class="bubble-tail">
          <svg
            viewBox="0 0 120 100"
            preserveAspectRatio="none"
          >
            <path
              d="M -10 40 L 115 2 L -10 80 Z"
              fill="white"
            />
            <path
              d="M 0 40 L 120 0 L 0 80"
              fill="none"
              stroke="#141824"
              stroke-width="8"
            />
          </svg>
        </div>
      </div>
    </Transition>
  </VirtualEntity>
</template>

<style scoped lang="scss" src="@/styles/components/_battle-arena-view.scss"></style>
