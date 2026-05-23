<script setup lang="ts">
import { onMounted } from 'vue'
import { gsap } from 'gsap'
import type { Pokemon } from '@/types/pokemon'

interface Props {
  type: string // 'rival' or 'fishing'
  pokemon?: Pokemon | null
  rarity?: string
  onStart?: (() => void) | null
  onComplete?: (() => void) | null
}

const props = withDefaults(defineProps<Props>(), {
  pokemon: null,
  rarity: '',
  onStart: null,
  onComplete: null
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

onMounted(() => {
  if (props.type === 'rival') {
    // 1. Flicker animation
    gsap.to('.rival-flicker', {
      opacity: 0.3,
      duration: 0.07,
      repeat: -1,
      yoyo: true,
      ease: 'none'
    });

    // 2. Exclamation bounce
    gsap.fromTo('.rival-exclamation', 
      { scale: 0.8 },
      { scale: 1.2, duration: 0.2, repeat: -1, yoyo: true, ease: 'back.out(2)' }
    );

    // 3. Auto-close
    gsap.delayedCall(1.2, () => {
      if (props.onComplete) props.onComplete()
      emit('close')
    });
  }

  if (props.type === 'fishing') {
    gsap.from('.fishing-intro-overlay', {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.out'
    });
    
    gsap.from('.fishing-card', {
      scale: 0.8,
      y: 20,
      duration: 0.5,
      ease: 'back.out(1.7)'
    });

    gsap.to('.fishing-icon', {
      y: -20,
      duration: 0.75,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
  }
})

const handleFishingStart = () => {
  if (props.onStart) props.onStart()
  emit('close')
}
</script>

<template>
  <div class="encounter-sequence-container">
    <!-- RIVAL SEQUENCE -->
    <template v-if="type === 'rival'">
      <div class="rival-flicker" />
      <div class="rival-exclamation">
        !
      </div>
    </template>

    <!-- FISHING INTRO -->
    <template v-if="type === 'fishing'">
      <div class="fishing-intro-overlay">
        <div class="fishing-card">
          <div class="fishing-icon">
            🎣
          </div>
          <div class="fishing-title">
            ¡ALGO PICÓ!
          </div>
          <div class="fishing-text">
            ¡Un Pokémon ha mordido el anzuelo!
          </div>
          <button 
            class="fishing-btn" 
            @click.stop="handleFishingStart"
          >
            🎣 ¡MINIJUEGO DE PESCA!
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/core/tools' as *;

.encounter-sequence-container {
  position: fixed;
  inset: 0;
  z-index: var(--z-max);
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rival-flicker {
  position: fixed;
  inset: 0;
  background: var(--white);
  opacity: 0.1;
  pointer-events: none;
  z-index: calc(var(--z-max) + 1);
}

.rival-exclamation {
  position: relative;
  @include pixelated;
  font-size: 80px;
  color: Rgba(255, 59, 48, 1);
  text-shadow: 0 0 20px Rgba(255, 59, 48, 0.6);
  z-index: calc(var(--z-max) + 2);
}

/* Fishing Styles */
.fishing-intro-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-max);
  background: Rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  pointer-events: auto;
}

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
  @include pixelated;
}

.fishing-text {
  font-size: 14px;
  color: Rgba(238, 238, 238, 1);
  margin: 16px 0;
  line-height: 1.6;
}

.fishing-btn {
  @include pixelated;
  font-size: 10px;
  padding: 16px 32px;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  background: Linear-Gradient(135deg, var(--blue), Rgba(37, 99, 235, 1));
  color: var(--white);
  box-shadow: 0 4px 16px Rgba(59, 130, 246, 0.5);
  margin-top: 12px;
  width: 100%;
  transition: transform 0.2s;
  @include pixelated;

  &:hover {
    transform: Translatey(-2px);
    will-change: transform, filter, opacity;
  filter: Brightness(1.1);
  }
}
</style>
