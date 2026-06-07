<script setup lang="ts">
import { gsap } from 'gsap'
import type { Pokemon } from '@/types/pokemon'
import type { BattleStages } from '@/types/battle'

interface Props {
  side: 'player' | 'enemy'
  pokemon: Pokemon
  stages: Partial<BattleStages>
  localGroundY: string
}

defineProps<Props>()

const onGroundPopEnter = (el: Element, done: () => void) => {
  const isSpikes = el.classList.contains('spikes')
  gsap.fromTo(el,
    { scale: 0, y: isSpikes ? 10 : 20, rotation: isSpikes ? -10 : 0, opacity: 0 },
    { 
      scale: 1, 
      y: isSpikes ? 0 : 5, 
      rotation: 0, 
      opacity: 1, 
      duration: isSpikes ? 0.4 : 0.6, 
      ease: 'back.out(1.7)', 
      onComplete: () => {
        done()
        if (isSpikes) {
           gsap.to(el.querySelectorAll('.spike-item'), {
             y: -10,
             scaleY: 1.1,
             scaleX: 0.9,
             duration: 0.8,
             yoyo: true,
             repeat: -1,
             ease: 'power1.inOut',
             stagger: 0.1
           })
        } else {
           gsap.to(el.querySelectorAll('.root-item'), {
             y: 2,
             scale: 1.03,
             filter: 'Brightness(1.2)',
             duration: 1.5,
             yoyo: true,
             repeat: -1,
             ease: 'power1.inOut'
           })
        }
      }
    }
  )
}

const onGroundPopLeave = (el: Element, done: () => void) => {
  gsap.to(el, { scale: 0, opacity: 0, duration: 0.3, onComplete: done })
}
</script>

<template>
  <div 
    class="ground-effects-container"
    :style="{ top: localGroundY }"
  >
    <!-- Púas -->
    <Transition
      :css="false"
      @enter="onGroundPopEnter"
      @leave="onGroundPopLeave"
    >
      <div
        v-if="(stages.spikes || 0) > 0"
        :key="`spikes-${side}-${stages.spikes || 0}`"
        class="ground-fx spikes"
      >
        <span
          v-for="i in 3"
          :key="i"
          class="spike-item"
        >🌵</span>
      </div>
    </Transition>
    
    <!-- Arraigo -->
    <Transition
      :css="false"
      @enter="onGroundPopEnter"
      @leave="onGroundPopLeave"
    >
      <div
        v-if="pokemon.ingrain"
        :key="`ingrain-${side}`"
        class="ground-fx ingrain"
      >
        <span class="root-item">🌳</span>
      </div>
    </Transition>
  </div>
</template>
