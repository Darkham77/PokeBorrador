<script setup lang="ts">
import { ref, watch } from 'vue'
import { gsap } from 'gsap'

import { useAudioStore } from '@/stores/audio'

interface Props {
  hp: number
  maxHp: number
  level: number
  exp?: number
  expNeeded?: number
  isPlayer?: boolean
  isScrambled?: boolean
  pokemonUid?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  exp: 0,
  expNeeded: 100,
  isPlayer: false,
  isScrambled: false,
  pokemonUid: null
})

const audioStore = useAudioStore()

const displayHp = ref(props.hp)
const displayExpPct = ref((props.exp / props.expNeeded) * 100)
const xpAnimationActive = ref(false)

watch(() => props.pokemonUid, () => {
  displayHp.value = props.hp
})

watch(() => props.hp, (newHp) => {
  gsap.to(displayHp, {
    value: newHp,
    duration: 0.6,
    ease: 'power2.out'
  })
})

watch(() => props.level, (newLevel, oldLevel) => {
  if (oldLevel && newLevel > oldLevel) {
    // Orquestación de barra de XP
    const tl = gsap.timeline()
    tl.to(displayExpPct, {
      value: 100,
      duration: 0.4,
      ease: 'power2.in',
      onComplete: () => {
        displayExpPct.value = 0
        audioStore.play('levelUp')
      }
    })
    .to(displayExpPct, {
      value: (props.exp / props.expNeeded) * 100,
      duration: 0.6,
      ease: 'power2.out'
    })
  }
}, { immediate: false })

watch(() => props.exp, (newExp) => {
  gsap.to(displayExpPct, {
    value: (newExp / props.expNeeded) * 100,
    duration: 0.5,
    ease: 'power2.out'
  })
})

const HP_PCT_GREEN_THRESHOLD = 50
const HP_PCT_YELLOW_THRESHOLD = 25

const getHpPct = (cur: number, max: number) => (cur / max) * 100
const getHpClass = (pct: number) => {
  if (pct > HP_PCT_GREEN_THRESHOLD) return 'hp-high'
  if (pct > HP_PCT_YELLOW_THRESHOLD) return 'hp-mid'
  return 'hp-low'
}
</script>

<template>
  <div class="hp-status">
    <div
      v-if="!isScrambled"
      class="hp-bar-outer"
    >
      <div
        class="hp-bar-inner"
        :class="getHpClass(getHpPct(displayHp, maxHp))"
        :style="{ width: getHpPct(displayHp, maxHp) + '%' }"
      />
    </div>
      
    <!-- EXP Bar only for player -->
    <div
      v-if="isPlayer"
      class="exp-bar-outer"
    >
      <div
        class="exp-bar-inner"
        :class="{ 'is-animating': xpAnimationActive }"
        :style="{ width: displayExpPct + '%' }"
      />
    </div>

    <div class="hp-values">
      HP: {{ isScrambled ? '???/???' : `${Math.max(0, Math.round(displayHp))}/${maxHp}` }}
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.hp-status {
  width: 100%;
}

.hp-bar-outer, .exp-bar-outer {
  width: 100%;
  height: 8px;
  background: Rgba(0,0,0,0.4);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 4px;
  box-shadow: inset 0 0 0 1px Rgba(255, 255, 255, 0.1);

  @media (max-width: 600px) {
    height: 6px;
    margin-bottom: 2px;
  }
}

.exp-bar-outer { height: 4px; @media (max-width: 600px) { height: 3px; } }
.hp-bar-inner { 
  height: 100%; 
  /* transition handled by GSAP */
  @include will-animate(width);
}
.exp-bar-inner { 
  height: 100%; 
  background: var(--blue); 
  width: 0;
  /* transition handled by GSAP */
  @include will-animate(width);
}

.hp-high { background: #10b981; }
.hp-mid { background: #f59e0b; }
.hp-low { background: #ef4444; }

.hp-values {
  @include pixelated;
  font-size: 8px;
  text-align: right;
  opacity: 1;
  text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;

  @media (max-width: 600px) {
    font-size: 7px;
  }
}
</style>
