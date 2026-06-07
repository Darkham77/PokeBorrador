<script setup lang="ts">
import { gsap } from 'gsap'

interface Props {
  show: boolean
  speaker: string
  text: string
}

defineProps<Props>()

const onDialogBeforeEnter = (el: Element) => {
  gsap.set(el, { opacity: 0, y: 15 })
}

const onDialogEnter = (el: Element, done: () => void) => {
  gsap.to(el, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out", onComplete: done })
}

const onDialogLeave = (el: Element, done: () => void) => {
  gsap.to(el, { opacity: 0, y: 10, duration: 0.3, ease: "power2.in", onComplete: done })
}
</script>

<template>
  <Transition
    :css="false"
    appear
    @before-enter="onDialogBeforeEnter"
    @enter="onDialogEnter"
    @leave="onDialogLeave"
  >
    <div
      v-if="show"
      class="speech-bubble"
    >
      <div class="bubble-speaker">
        {{ speaker }}:
      </div>
      <div class="bubble-text">
        {{ text }}
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
</template>
