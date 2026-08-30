<script setup lang="ts">
import { gsap } from 'gsap'
import { onGroundPopEnter } from '@/logic/combat/shadowHelpers'
import type { BattleSide, BattleStages } from '@/types/battle/battle'
import type { Pokemon } from '@/types/pokemon/pokemon'

defineProps<{
  pokemon: Pokemon
  side: BattleSide
  stages: Partial<BattleStages>
  localGroundY: string
}>()

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
        ><span class="icon">🌵</span></span>
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
        <span class="root-item"><span class="icon">🌳</span></span>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_battle-combatant.scss"></style>

