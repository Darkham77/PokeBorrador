<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import BaseModal from '@/components/common/BaseModal.vue'
import type { Pokemon } from '@/types/pokemon/pokemon'

interface Props {
  id?: string
  show?: boolean
  type: string // 'rival' or 'fishing' or 'archaeology'
  pokemon?: Pokemon | null
  rarity?: number | string
  onStart?: (() => void) | null
  onComplete?: (() => void) | null
}

const props = withDefaults(defineProps<Props>(), {
  id: '',
  show: false,
  pokemon: null,
  rarity: '',
  onStart: null,
  onComplete: null
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const FLICKER_DURATION_SEC = 0.07
const EXCLAMATION_DURATION_SEC = 0.2
const RIVAL_AUTO_CLOSE_DELAY_SEC = 1.2
const CARD_ENTRY_DURATION_SEC = 0.5
const ICON_FLOAT_DURATION_SEC = 0.75
const ICON_FLOAT_Y_PX = -20
const EXCLAMATION_MIN_SCALE = 0.8
const EXCLAMATION_MAX_SCALE = 1.2
const CARD_ENTRY_SCALE = 0.8
const CARD_ENTRY_Y_PX = 20

// Template Refs
const rivalFlicker = ref<HTMLElement | null>(null)
const rivalExclamation = ref<HTMLElement | null>(null)
const fishingCard = ref<HTMLElement | null>(null)
const fishingIcon = ref<HTMLElement | null>(null)

watch(() => props.show, async (newVal) => {
  if (newVal) {
    await nextTick()

    if (props.type === 'rival') {
      if (rivalFlicker.value) {
        gsap.to(rivalFlicker.value, {
          opacity: 0.3,
          duration: FLICKER_DURATION_SEC,
          repeat: -1,
          yoyo: true,
          ease: 'none'
        })
      }

      if (rivalExclamation.value) {
        gsap.fromTo(rivalExclamation.value, 
          { scale: EXCLAMATION_MIN_SCALE },
          { scale: EXCLAMATION_MAX_SCALE, duration: EXCLAMATION_DURATION_SEC, repeat: -1, yoyo: true, ease: 'back.out(2)' }
        )
      }

      gsap.delayedCall(RIVAL_AUTO_CLOSE_DELAY_SEC, () => {
        if (props.onComplete) props.onComplete()
        emit('close')
      })
    }

    if (props.type === 'fishing' || props.type === 'archaeology') {
      if (fishingCard.value) {
        gsap.from(fishingCard.value, {
          scale: CARD_ENTRY_SCALE,
          y: CARD_ENTRY_Y_PX,
          duration: CARD_ENTRY_DURATION_SEC,
          ease: 'back.out(1.7)'
        })
      }

      if (fishingIcon.value) {
        gsap.to(fishingIcon.value, {
          y: ICON_FLOAT_Y_PX,
          duration: ICON_FLOAT_DURATION_SEC,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        })
      }
    }
  }
}, { immediate: true })

const hasStarted = ref(false)

const handleFishingStart = () => {
  if (hasStarted.value) return
  hasStarted.value = true
  if (props.onStart) props.onStart()
  emit('close')
}

const handleArchaeologyStart = () => {
  if (hasStarted.value) return
  hasStarted.value = true
  if (props.onStart) props.onStart()
  emit('close')
}
</script>

<template>
  <!-- RIVAL SEQUENCE -->
  <template v-if="type === 'rival'">
    <BaseModal
      :show="show"
      hide-header
      :show-close-button="false"
      overlay="none"
      padding="raw"
      :show-border="false"
      max-width="100vw"
      max-height="100vh"
    >
      <div class="rival-sequence-wrapper">
        <div 
          ref="rivalFlicker" 
          class="rival-flicker" 
        />
        <div 
          ref="rivalExclamation" 
          class="rival-exclamation"
        >
          !
        </div>
      </div>
    </BaseModal>
  </template>

  <!-- FISHING INTRO -->
  <template v-else-if="type === 'fishing'">
    <BaseModal
      :show="show"
      hide-header
      :show-close-button="false"
      overlay="dark"
      padding="raw"
      :show-border="false"
      max-width="380px"
    >
      <div 
        ref="fishingCard" 
        class="fishing-card"
      >
        <div 
          ref="fishingIcon" 
          class="fishing-icon"
        >
          🎣
        </div>
        <div class="fishing-title">
          ¡ALGO PICÓ!
        </div>
        <div class="fishing-text">
          ¡Un Pokémon ha mordido el anzuelo!
        </div>
        <button 
          class="btn-fishing" 
          @click.stop="handleFishingStart"
        >
          <span class="icon">🎣</span> ¡MINIJUEGO DE PESCA!
        </button>
      </div>
    </BaseModal>
  </template>

  <!-- ARCHAEOLOGY INTRO -->
  <template v-else-if="type === 'archaeology'">
    <BaseModal
      :show="show"
      hide-header
      :show-close-button="false"
      overlay="dark"
      padding="raw"
      :show-border="false"
      max-width="380px"
    >
      <div
        ref="fishingCard"
        class="fishing-card"
        style="border-color: #eab308; box-shadow: 0 0 30px rgba(234, 179, 8, 0.4);"
      >
        <div 
          ref="fishingIcon" 
          class="fishing-icon"
        >
          ⛏️
        </div>
        <div
          class="fishing-title"
          style="color: #eab308;"
        >
          ¡FÓSIL DETECTADO!
        </div>
        <div class="fishing-text">
          ¡Se han encontrado rastros antiguos en la roca!
        </div>
        <button 
          class="btn-archaeology" 
          @click.stop="handleArchaeologyStart"
        >
          <span class="icon">⛏️</span> ¡MINIJUEGO DE ARQUEOLOGÍA!
        </button>
      </div>
    </BaseModal>
  </template>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use '@/styles/core/tools' as *;

.rival-sequence-wrapper {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.rival-flicker {
  position: fixed;
  inset: 0;
  background: var(--white);
  opacity: 0.1;
  pointer-events: none;
}

.rival-exclamation {
  position: relative;
  @include pixelated;
  font-size: 80px;
  color: Rgba(255, 59, 48, 1);
  text-shadow: 0 0 20px Rgba(255, 59, 48, 0.6);
}

/* Fishing Styles */
.fishing-card {
  @include card-premium;
  background: var(--card);
  border-radius: 24px;
  padding: 32px;
  max-width: 380px;
  width: 100%;
  border: 2px solid var(--blue);
  text-align: center;
  position: relative;
  box-shadow: 0 0 30px Rgba(10, 132, 255, 0.4);
}

.fishing-icon {
  font-size: 80px;
  margin-bottom: 20px;
}

.fishing-title {
  @include pixelated;
  font-size: 12px;
  color: var(--blue);
  margin-bottom: 16px;
}

.fishing-text {
  font-size: 14px;
  color: Rgba(238, 238, 238, 1);
  margin: 16px 0;
  line-height: 1.6;
}

.btn-fishing {
  @include btn-vicio('info', 'md', true);
  margin-top: 12px;
}

.btn-archaeology {
  @include btn-vicio('primary', 'md', true);
  margin-top: 12px;
}
</style>
