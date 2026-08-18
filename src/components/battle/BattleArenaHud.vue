<script setup lang="ts">
import { gsap } from 'gsap'
import type { Pokemon } from '@/types/pokemon/pokemon'
import BattleInfoCard from './BattleInfoCard.vue'
import {
  HUD_TRANSITION_X_OFFSET_PX,
  HUD_TRANSITION_INITIAL_SCALE,
  HUD_TRANSITION_DURATION_SEC
} from '@/logic/constants/animations'

defineProps<{
  activeEnemyData: unknown
  activePlayerData: unknown
  isEnemyHudSuppressed: boolean
  isPlayerHudSuppressed: boolean
  shouldScrambleEnemyData: boolean
}>()

const onHudEnemyBeforeEnter = (el: Element) => {
  gsap.set(el, { opacity: 0, x: -HUD_TRANSITION_X_OFFSET_PX, scale: HUD_TRANSITION_INITIAL_SCALE })
}

const onHudEnemyEnter = (el: Element, done: () => void) => {
  gsap.to(el, { opacity: 1, x: 0, scale: 1, duration: HUD_TRANSITION_DURATION_SEC, ease: "power2.out", onComplete: done })
}

const onHudEnemyLeave = (el: Element, done: () => void) => {
  gsap.to(el, { opacity: 0, x: -HUD_TRANSITION_X_OFFSET_PX, scale: HUD_TRANSITION_INITIAL_SCALE, duration: HUD_TRANSITION_DURATION_SEC, ease: "power2.in", onComplete: done })
}

const onHudPlayerBeforeEnter = (el: Element) => {
  gsap.set(el, { opacity: 0, x: HUD_TRANSITION_X_OFFSET_PX, scale: HUD_TRANSITION_INITIAL_SCALE })
}

const onHudPlayerEnter = (el: Element, done: () => void) => {
  gsap.to(el, { opacity: 1, x: 0, scale: 1, duration: HUD_TRANSITION_DURATION_SEC, ease: "power2.out", onComplete: done })
}

const onHudPlayerLeave = (el: Element, done: () => void) => {
  gsap.to(el, { opacity: 0, x: HUD_TRANSITION_X_OFFSET_PX, scale: HUD_TRANSITION_INITIAL_SCALE, duration: HUD_TRANSITION_DURATION_SEC, ease: "power2.in", onComplete: done })
}
</script>

<template>
  <div class="battle-info-container">
    <template
      v-for="seat in [
        { id: 'p2', data: activeEnemyData, isSuppressed: isEnemyHudSuppressed, isPlayer: false, isScrambled: shouldScrambleEnemyData, beforeEnter: onHudEnemyBeforeEnter, enter: onHudEnemyEnter, leave: onHudEnemyLeave },
        { id: 'p1', data: activePlayerData, isSuppressed: isPlayerHudSuppressed, isPlayer: true, isScrambled: false, beforeEnter: onHudPlayerBeforeEnter, enter: onHudPlayerEnter, leave: onHudPlayerLeave }
      ]"
      :key="seat.id"
    >
      <Transition
        :css="false"
        @before-enter="seat.beforeEnter"
        @enter="seat.enter"
        @leave="seat.leave"
      >
        <div
          v-if="!seat.isSuppressed && seat.data"
          :key="`hud-seat-${seat.id}`"
          :class="['combatant-info-wrap', seat.isPlayer ? 'player-side' : 'enemy-side']"
        >
          <BattleInfoCard
            :pokemon="seat.data as Pokemon"
            :is-player="seat.isPlayer"
            :is-scrambled="seat.isScrambled"
          />
        </div>
      </Transition>
    </template>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_battle-arena-view.scss"></style>
