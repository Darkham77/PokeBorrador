<script setup lang="ts">
import { ref, onUnmounted, watch } from 'vue'
import { gsap } from 'gsap'
import type { Pokemon } from '@/types/pokemon/pokemon'
import DaycareSlotFilled from './DaycareSlotFilled.vue'

const GSAP_ANIM_DURATION_SEC = 0.3
const SCALE_HOVER_PLUS = 1.1
const SCALE_HOVER_SPRITE = 1.05

interface Props {
  slotId: string
  pokemon?: Pokemon | null
  item?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  pokemon: null,
  item: null
})

const emit = defineEmits<{
  (e: 'deposit'): void
  (e: 'withdraw'): void
}>()

const slotRef = ref<HTMLElement | null>(null)

let slotBorderTween: gsap.core.Tween | null = null
let plusIconTween: gsap.core.Tween | null = null
let spriteBoxTween: gsap.core.Tween | null = null

const handleSlotMouseEnter = () => {
  if (!props.pokemon) {
    if (slotBorderTween) slotBorderTween.kill()
    if (slotRef.value) {
      slotBorderTween = gsap.to(slotRef.value, {
        borderColor: '#ffd700',
        duration: GSAP_ANIM_DURATION_SEC,
        ease: 'power2.out'
      })
    }

    const plusIcon = slotRef.value?.querySelector('.plus-icon')
    if (plusIcon) {
      if (plusIconTween) plusIconTween.kill()
      plusIconTween = gsap.to(plusIcon, {
        scale: SCALE_HOVER_PLUS,
        color: '#ffd700',
        duration: GSAP_ANIM_DURATION_SEC,
        ease: 'power2.out'
      })
    }
  } else {
    if (slotBorderTween) slotBorderTween.kill()
    if (slotRef.value) {
      slotBorderTween = gsap.to(slotRef.value, {
        borderColor: 'rgba(255, 255, 255, 0.15)',
        duration: GSAP_ANIM_DURATION_SEC,
        ease: 'power2.out'
      })
    }

    const spriteBox = slotRef.value?.querySelector('.sprite-box')
    if (spriteBox) {
      if (spriteBoxTween) spriteBoxTween.kill()
      spriteBoxTween = gsap.to(spriteBox, {
        scale: SCALE_HOVER_SPRITE,
        duration: GSAP_ANIM_DURATION_SEC,
        ease: 'power2.out'
      })
    }
  }
}

const handleSlotMouseLeave = () => {
  if (slotBorderTween) slotBorderTween.kill()
  if (slotRef.value) {
    slotBorderTween = gsap.to(slotRef.value, {
      borderColor: 'rgba(255, 255, 255, 0.06)',
      duration: GSAP_ANIM_DURATION_SEC,
      ease: 'power2.out'
    })
  }

  if (!props.pokemon) {
    const plusIcon = slotRef.value?.querySelector('.plus-icon')
    if (plusIcon) {
      if (plusIconTween) plusIconTween.kill()
      plusIconTween = gsap.to(plusIcon, {
        scale: 1,
        color: 'rgba(51, 65, 85, 1)',
        duration: GSAP_ANIM_DURATION_SEC,
        ease: 'power2.out'
      })
    }
  } else {
    const spriteBox = slotRef.value?.querySelector('.sprite-box')
    if (spriteBox) {
      if (spriteBoxTween) spriteBoxTween.kill()
      spriteBoxTween = gsap.to(spriteBox, {
        scale: 1,
        duration: GSAP_ANIM_DURATION_SEC,
        ease: 'power2.out'
      })
    }
  }
}

watch(() => props.pokemon, () => {
  if (slotBorderTween) slotBorderTween.kill()
  if (plusIconTween) plusIconTween.kill()
  if (spriteBoxTween) spriteBoxTween.kill()
  
  if (slotRef.value) {
    gsap.set(slotRef.value, { borderColor: 'rgba(255, 255, 255, 0.06)' })
    const plusIcon = slotRef.value.querySelector('.plus-icon')
    if (plusIcon) {
      gsap.set(plusIcon, { scale: 1, color: 'rgba(51, 65, 85, 1)' })
    }
    const spriteBox = slotRef.value.querySelector('.sprite-box')
    if (spriteBox) {
      gsap.set(spriteBox, { scale: 1 })
    }
  }
})

onUnmounted(() => {
  if (slotBorderTween) slotBorderTween.kill()
  if (plusIconTween) plusIconTween.kill()
  if (spriteBoxTween) spriteBoxTween.kill()
})
</script>

<template>
  <div
    ref="slotRef"
    class="daycare-slot-legacy"
    :class="{ empty: !pokemon }"
    @click.stop="!pokemon ? emit('deposit') : null"
    @mouseenter="handleSlotMouseEnter"
    @mouseleave="handleSlotMouseLeave"
  >
    <div class="slot-marker">
      RANURA {{ slotId.toUpperCase() }}
    </div>

    <!-- Empty State -->
    <div
      v-if="!pokemon"
      class="slot-empty"
    >
      <div class="plus-icon">
        +
      </div>
      <div class="hint">
        <span class="emoji">⚡</span> DEPOSITAR POKÉMON
      </div>
    </div>

    <!-- Occupied State -->
    <DaycareSlotFilled
      v-else
      :pokemon="pokemon"
      @withdraw="emit('withdraw')"
    />
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/daycare-slot";
</style>
