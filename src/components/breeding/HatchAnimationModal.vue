<script setup lang="ts">
/**
 * HatchAnimationModal
 * Standardized full-screen animation for egg hatching.
 */
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { gsap } from 'gsap'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import BaseModal from '@/components/common/BaseModal.vue'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'

import type { Pokemon, PokemonEgg } from '@/types/pokemon'
import { useGameStore } from '@/stores/game'

interface Props {
  show?: boolean
  pokemon?: Pokemon | null
  egg?: PokemonEgg | null
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  pokemon: null,
  egg: null
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const gameStore = useGameStore()
const stage = ref<'egg' | 'crack' | 'reveal'>('egg')
const showParticles = ref(false)
const resultPokemon = ref<Pokemon | null>(null)
const particlesRef = ref<HTMLElement[]>([])

// GSAP References
let idleTimeline: gsap.core.Timeline | null = null
let glowTween: gsap.core.Tween | null = null
let hintTween: gsap.core.Tween | null = null
let shimmerTween: gsap.core.Timeline | gsap.core.Tween | null = null
const activeTweens: gsap.core.Tween[] = []

const prepareResult = async () => {
  if (props.pokemon) {
    resultPokemon.value = props.pokemon
    return
  }
  
  if (props.egg) {
    const { makePokemon, recalcPokemonStats } = await import('@/logic/pokemonFactory')
    const p = makePokemon(props.egg.id || '', 1, {
      isShiny: !!props.egg.isShiny,
      isGuardian: !!props.egg.isGuardian,
      nature: props.egg.nature
    })
    if (p) {
      if (props.egg.ivs) {
        p.ivs = { ...p.ivs, ...props.egg.ivs }
      }
      recalcPokemonStats(p)
      resultPokemon.value = p
    }
  }
}

const handleClose = async () => {
  if (props.egg) {
    await gameStore.executeHatch(props.egg)
  }
  emit('close')
}

const getSprite = (id: string | number, isShiny: boolean) => {
  return getAssetUrl(ASSET_TYPES.POKEMON, id, { isShiny })
}

const cleanupAnimations = () => {
  if (idleTimeline) {
    idleTimeline.kill()
    idleTimeline = null
  }
  if (glowTween) {
    glowTween.kill()
    glowTween = null
  }
  if (hintTween) {
    hintTween.kill()
    hintTween = null
  }
  if (shimmerTween) {
    shimmerTween.kill()
    shimmerTween = null
  }
  activeTweens.forEach(t => t.kill())
  activeTweens.length = 0
}

const initAnimations = async () => {
  cleanupAnimations()
  
  stage.value = 'egg'
  showParticles.value = false
  resultPokemon.value = null
  
  await prepareResult()
  await nextTick()
  
  // Start idle animation
  idleTimeline = gsap.timeline({ repeat: -1 })
  idleTimeline.to('.egg-sprite', {
    y: -15,
    duration: 1,
    yoyo: true,
    ease: 'sine.inOut'
  })

  glowTween = gsap.fromTo('.glow-ring', 
    { scale: 0.8, opacity: 0.8 },
    { scale: 1.5, opacity: 0, duration: 2, repeat: -1, ease: 'none' }
  )

  hintTween = gsap.fromTo('.hatch-hint',
    { opacity: 0.3 },
    { opacity: 0.8, duration: 0.75, repeat: -1, yoyo: true, ease: 'sine.inOut' }
  )
}

const handleEggClick = () => {
  if (stage.value !== 'egg') return
  
  stage.value = 'crack'
  cleanupAnimations()

  const win = window as unknown as { playSound?: (s: string) => void }
  win.playSound?.('egg_crack')
  
  // 1. Shake animation
  const shakeTween = gsap.to('.egg-sprite', {
    x: 'random(-5, 5)',
    rotation: 'random(-5, 5)',
    duration: 0.1,
    repeat: 10,
    yoyo: true,
    ease: 'none'
  })
  activeTweens.push(shakeTween)

  // 2. Final reveal
  gsap.delayedCall(1.2, () => {
    stage.value = 'reveal'
    showParticles.value = true
    win.playSound?.('evolution_complete')
    
    nextTick(() => {
      // Reveal animations
      const revealTween = gsap.from('.reveal-visual', {
        opacity: 0,
        scale: 0.9,
        duration: 0.8,
        ease: 'power2.out'
      })
      activeTweens.push(revealTween)

      // Pop-in animation for pokemon sprite
      const popTween = gsap.fromTo('.pokemon-sprite',
        { scale: 0 },
        { scale: 1.2, duration: 0.5, ease: 'back.out(1.7)' }
      )
      activeTweens.push(popTween)

      shimmerTween = gsap.to('.shimmer-bg', {
        rotation: 360,
        duration: 10,
        repeat: -1,
        ease: 'none'
      })

      // Explode particles
      particlesRef.value.forEach((el) => {
        if (!el) return
        const tx = (Math.random() - 0.5) * 300
        const ty = (Math.random() - 0.5) * 300
        const pTween = gsap.fromTo(el,
          { x: 0, y: 0, opacity: 1, scale: 1 },
          {
            x: tx,
            y: ty,
            opacity: 0,
            scale: 0,
            duration: 1.5,
            delay: Math.random() * 0.5,
            ease: 'power2.out'
          }
        )
        activeTweens.push(pTween)
      })
    })
  })
}

watch(() => props.show, (newShow) => {
  if (newShow) {
    initAnimations()
  } else {
    cleanupAnimations()
  }
})

onMounted(() => {
  if (props.show) {
    initAnimations()
  }
})

onUnmounted(() => {
  cleanupAnimations()
})
</script>

<template>
  <BaseModal
    :show="show"
    max-width="100dvw"
    padding="raw"
    variant="modern"
    overlay="dark"
    hide-header
    :show-close-button="false"
    :prevent-close="stage !== 'reveal'"
    @close="handleClose"
  >
    <div
      class="hatch-immersion-container"
      :class="stage"
      @click.stop="stage === 'egg' ? handleEggClick() : null"
    >
      <!-- Egg Phase -->
      <div
        v-if="stage !== 'reveal'"
        class="egg-visual"
      >
        <img
          :src="getAssetUrl(ASSET_TYPES.ITEM, 'egg')"
          class="egg-sprite"
          @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
        >
        <div class="glow-ring" />
        <div class="hatch-hint">
          ¡HAZ CLIC PARA ECLOSIONAR!
        </div>
      </div>

      <!-- Result Phase -->
      <div
        v-else
        class="reveal-visual"
      >
        <div class="shimmer-bg" />
        <div
          class="pokemon-display"
        >
          <PVSpriteFX
            :is-shiny="resultPokemon?.isShiny"
            :is-guardian="resultPokemon?.isGuardian"
            :sparkle-count="8"
          >
            <img
              v-if="resultPokemon"
              :src="getSprite(resultPokemon.id, !!resultPokemon.isShiny)"
              class="pokemon-sprite"
              @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
            >
          </PVSpriteFX>
          <div class="splash-text">
            ¡Ha nacido un {{ resultPokemon?.name }}!
          </div>
        </div>

        
        <div
          v-if="resultPokemon"
          class="stats-card"
        >
          <div class="stat-row">
            <span class="label">Naturaleza:</span>
            <span class="val">{{ resultPokemon.nature }}</span>
          </div>
          <div class="stat-row">
            <span class="label">IVs:</span>
            <span class="val">{{ resultPokemon.ivs?.hp }}/{{ resultPokemon.ivs?.atk }}/{{ resultPokemon.ivs?.def }}/{{ resultPokemon.ivs?.spa }}/{{ resultPokemon.ivs?.spd }}/{{ resultPokemon.ivs?.spe }}</span>
          </div>
        </div>

        <button
          class="btn-vicio-primary btn-vicio-full"
          style="max-width: 200px; margin-top: 40px;"
          @click.stop="handleClose"
        >
          CONTINUAR
        </button>
      </div>

      <!-- Particles -->
      <div
        v-if="showParticles"
        class="particles-field"
      >
        <div
          v-for="n in 20"
          :key="n"
          ref="particlesRef"
          class="particle"
        />
      </div>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/components/hatch-animation-modal";
</style>
