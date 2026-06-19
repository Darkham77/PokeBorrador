<script setup lang="ts">
import { gsap } from 'gsap'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { BattleStages } from '@/types/battle/battle'
import { onGroundPopEnter } from '@/logic/combat/shadowHelpers'

interface Props {
  side: 'player' | 'enemy'
  pokemon: Pokemon
  stages: Partial<BattleStages>
  localGroundY: string
}

defineProps<Props>()

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
