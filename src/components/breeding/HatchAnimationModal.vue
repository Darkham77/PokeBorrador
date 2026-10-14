<script setup lang="ts">
/**
 * HatchAnimationModal.vue
 * Premium fullscreen redesign for egg hatching.
 * 100% orchestrated with GSAP, without BaseModal and with high-fidelity auras.
 */
const HATCH_RING_MAX_SCALE = 3.5
const HATCH_REVEAL_ANIM_DUR_SEC = 0.6
const HATCH_AURA_ANIM_DUR_SEC = 2.2
const HATCH_STATS_CARD_ANIM_DUR_SEC = 0.5
const HATCH_STATS_CARD_ANIM_DELAY_SEC = 0.7
const HATCH_CONFIRM_BTN_ANIM_DELAY_SEC = 1.2
const GLOW_RING_PULSE_DURATION_SEC = 1.8
const GLOW_RING_COLLAPSE_DURATION_SEC = 1.3
const HATCH_WOBBLE_2_DURATION_SEC = 0.15
const HATCH_GLOW_RING_INITIAL_SCALE = 0.8
const HATCH_GLOW_RING_PULSE_OPACITY = 0.5
const HATCH_GLOW_RING_MAX_OPACITY = 1
const HATCH_HINT_MIN_OPACITY = 0.4
const HATCH_HINT_MAX_OPACITY = 0.9
const HATCH_HINT_PULSE_DURATION_SEC = 0.8
const HATCH_WOBBLE_1_REPEATS = 5
const HATCH_WOBBLE_2_REPEATS = 7
const HATCH_SHAKE_DURATION_SEC = 0.05
const HATCH_SPRITE_FINAL_SCALE = 1.0
const HATCH_RARE_AURA_MIN_SCALE = 0.8
const HATCH_RARE_AURA_MAX_SCALE = 2.4
const HATCH_RARE_AURA_MIN_OPACITY = 0.3
const HATCH_RARE_AURA_MAX_OPACITY = 0.95
const HATCH_STATS_CARD_INITIAL_Y_OFFSET = 15
const GLOW_RING_EXPAND_SCALE = 1.4;
import { OPACITY_ZERO } from '@/logic/constants/visuals'
import { ref, onMounted, onUnmounted, nextTick, watch, provide, computed } from 'vue'
import { gsap } from 'gsap'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import type { Pokemon, PokemonEgg } from '@/types/pokemon/pokemon'
import { useGameStore } from '@/stores/game'
import { getAuraStyles } from '@/logic/breeding/hatchAuras'
import HatchEggCrackStage from './HatchEggCrackStage.vue'
import HatchRevealContent from './HatchRevealContent.vue'
import {
  GSAP_FAST_DURATION_SEC,
  EGG_LEVITATION_Y_OFFSET,
  EGG_LEVITATION_DURATION_SEC,
  HATCH_SHAKE_REPEAT_COUNT,
  HATCH_FLASH_DURATION_SEC,
  HATCH_PARTICLE_MIN_DISTANCE_PX,
  HATCH_PARTICLE_MAX_SPREAD_PX,
  MAP_FACTION_PODER_MAX_SCALE
} from '@/logic/constants/animations'

interface Props {
  id?: string
  show?: boolean
  pokemon?: Pokemon | null
  egg?: PokemonEgg | null
}

const props = withDefaults(defineProps<Props>(), {
  id: '',
  show: false,
  pokemon: null,
  egg: null
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

// Force high fidelity mode for all injected components (such as PVSpriteFX)
provide('forceHighFidelity', true)

const gameStore = useGameStore()
const stage = ref<'egg' | 'shake' | 'reveal' | 'final'>('egg')
const taps = ref(0)
const showParticles = ref(false)
const showAuras = ref(false)
const resultPokemon = ref<Pokemon | null>(null)

// DOM Refs for GSAP animations
const modalRef = ref<HTMLElement | null>(null)
let ctx: gsap.Context | null = null
const particlesRef = ref<HTMLElement[]>([])
const rareAuraRef = ref<HTMLElement | null>(null)
const atmosAuraRef = ref<HTMLElement | null>(null)

// References for premium flare assets
const flare1Url = getAssetUrl(ASSET_TYPES.FX, 'flare_1')
const flare2Url = getAssetUrl(ASSET_TYPES.FX, 'flare_2')

// Active animations registry for clean teardown on unmount
const activeTweens: gsap.core.Tween[] = []
let idleTimeline: gsap.core.Timeline | null = null

const playSound = (soundName: string) => {
  (Reflect.get(window, 'playSound') as ((s: string) => void) | undefined)?.(soundName);
}

const getSprite = (id: string | number, isShiny: boolean) => {
  return getAssetUrl(ASSET_TYPES.POKEMON, id, { isShiny })
}

const hintText = computed(() => {
  if (taps.value === 0) return '¡HAZ CLIC PARA ECLOSIONAR!'
  if (taps.value === 1) return '¡EL HUEVO SE ESTÁ AGRIETANDO!'
  return '¡YA CASI...! ¡UN TOQUE MÁS!'
})

const auraStyles = computed(() => {
  return getAuraStyles(resultPokemon.value, flare1Url, flare2Url)
})

const isEggStage = computed(() => stage.value === 'egg' || stage.value === 'shake')

const handleContainerClick = () => {
  if (stage.value === 'egg') {
    handleEggClick()
  }
}

const prepareResult = async () => {
  if (props.pokemon) {
    resultPokemon.value = props.pokemon
    return
  }
  
  if (props.egg) {
    const { makePokemon, recalcPokemonStats } = await import('@/logic/pokemon/pokemonFactory')
    const { getEggSpecies } = await import('@/logic/breeding/breedingEngine')
    const rawSpeciesId = props.egg.pokemonId ?? props.egg.id
    const speciesId = getEggSpecies(rawSpeciesId)
    const isDebugMode = typeof window !== 'undefined' && Boolean(window.__VITE_DEBUG__ || window.location?.search?.includes('debug'))
    const p = makePokemon(speciesId, 1, {
      isShiny: Boolean(props.egg.isShiny),
      isGuardian: Boolean(props.egg.isGuardian),
      nature: props.egg.nature,
      abilitySlot: props.egg.abilitySlot,
      gender: props.egg.gender,
      obtainedMethod: 'egg',
      isNpcEgg: props.egg.isNpc,
      bypassWhitelist: isDebugMode
    })
    if (p) {
      if (props.egg.isAncestral) {
        p.isAncestral = true
        p.maxVigor = 0
        p.vigor = 0
      }
      if (props.egg.ivs) {
        p.ivs = { ...p.ivs, ...props.egg.ivs }
      }
      if (props.egg.movesAtBirth && props.egg.movesAtBirth.length > 0) {
        const { pokemonDataProvider } = await import('@/logic/providers/pokemonDataProvider')
        p.moves = props.egg.movesAtBirth.map(mId => {
          const mData = pokemonDataProvider.getMoveData(mId)
          return {
            id: mId,
            name: mData.name,
            pp: mData.pp,
            maxPP: mData.pp
          }
        })
      }
      recalcPokemonStats(p, isDebugMode)
      p.hp = p.maxHp
      resultPokemon.value = p
    }
  }
}

const cleanupAnimations = () => {
  if (ctx) {
    ctx.revert()
    ctx = null
  }
  if (idleTimeline) {
    idleTimeline.kill()
    idleTimeline = null
  }
  activeTweens.forEach(t => t.kill())
  activeTweens.length = 0
}

const initAnimations = async () => {
  cleanupAnimations()
  
  stage.value = 'egg'
  taps.value = 0
  showParticles.value = false
  showAuras.value = false
  resultPokemon.value = null
  
  await prepareResult()
  await nextTick()
  
  ctx = gsap.context(() => {
    // Gentle levitation motion of the idle egg in the parent container
    idleTimeline = gsap.timeline({ repeat: -1, yoyo: true })
    idleTimeline.to('.egg-stage-wrapper', {
      y: EGG_LEVITATION_Y_OFFSET,
      duration: EGG_LEVITATION_DURATION_SEC,
      ease: 'sine.inOut'
    })

    // Animate mystical glow ring around the egg
    const glow = gsap.fromTo('.glow-ring', 
      { scale: HATCH_GLOW_RING_INITIAL_SCALE, opacity: HATCH_GLOW_RING_PULSE_OPACITY },
      { scale: GLOW_RING_EXPAND_SCALE, opacity: OPACITY_ZERO, duration: GLOW_RING_PULSE_DURATION_SEC, repeat: -1, ease: 'power1.out' }
    )
    activeTweens.push(glow)

    // Pulse effect on invitation text
    const hintPulse = gsap.fromTo('.hatch-hint',
      { opacity: HATCH_HINT_MIN_OPACITY },
      { opacity: HATCH_HINT_MAX_OPACITY, duration: HATCH_HINT_PULSE_DURATION_SEC, repeat: -1, yoyo: true, ease: 'sine.inOut' }
    )
    activeTweens.push(hintPulse)
  }, modalRef.value ?? undefined)
}

const handleEggClick = () => {
  if (stage.value !== 'egg') return
  
  taps.value++
  
  ctx = gsap.context(() => {
    if (taps.value === 1) {
      playSound('egg_crack')
      // Gentle tap wobble
      const wobble = gsap.fromTo('.egg-sprite',
        { x: 0, rotation: 0 },
        {
          x: 'random(-6, 6)',
          rotation: 'random(-4, 4)',
          duration: GSAP_FAST_DURATION_SEC / 2,
          repeat: HATCH_WOBBLE_1_REPEATS,
          yoyo: true,
          ease: 'none',
          onComplete: () => {
            gsap.set('.egg-sprite', { clearProps: 'x,rotation' })
          }
        }
      )
      activeTweens.push(wobble)
      
      gsap.fromTo('.glow-ring', 
        { scale: 1, opacity: 0.6 }, 
        { scale: 1.3, opacity: 0.9, duration: HATCH_FLASH_DURATION_SEC, yoyo: true, repeat: 1 }
      )

    } else if (taps.value === 2) {
      playSound('egg_crack')
      // wobble de intensidad media
      const wobble = gsap.fromTo('.egg-sprite',
        { x: 0, rotation: 0 },
        {
          x: 'random(-10, 10)',
          rotation: 'random(-7, 7)',
          duration: GSAP_FAST_DURATION_SEC / 2,
          repeat: HATCH_WOBBLE_2_REPEATS,
          yoyo: true,
          ease: 'none',
          onComplete: () => {
            gsap.set('.egg-sprite', { clearProps: 'x,rotation' })
          }
        }
      )
      activeTweens.push(wobble)

      gsap.fromTo('.glow-ring', 
        { scale: 1, opacity: 0.6 }, 
        { scale: 1.6, opacity: HATCH_GLOW_RING_MAX_OPACITY, duration: HATCH_WOBBLE_2_DURATION_SEC, yoyo: true, repeat: 1 }
      )

    } else if (taps.value === 3) {
      // ECLOSIÓN DEFINITIVA
      stage.value = 'shake'
      cleanupAnimations()
      playSound('egg_crack')

      const hatchTimeline = gsap.timeline()

      // High-frequency rising hatch tremor
      hatchTimeline.fromTo('.egg-sprite',
        { x: 0, rotation: 0 },
        {
          x: 'random(-14, 14)',
          rotation: 'random(-10, 10)',
          duration: HATCH_SHAKE_DURATION_SEC,
          repeat: HATCH_SHAKE_REPEAT_COUNT,
          yoyo: true,
          ease: 'none'
        }
      )

      // The glow ring collapses toward center and bursts outwards
      hatchTimeline.fromTo('.glow-ring',
        { scale: 1, opacity: 0.6 },
        { scale: HATCH_RING_MAX_SCALE, opacity: HATCH_GLOW_RING_MAX_OPACITY, duration: GLOW_RING_COLLAPSE_DURATION_SEC, ease: 'power2.inOut' },
        0
      )

      // Fullscreen flash right at the end of the shake
      hatchTimeline.to('.hatch-backdrop', {
        backgroundColor: '#ffffff',
        duration: HATCH_FLASH_DURATION_SEC,
        ease: 'power1.in'
      }, '+=0.05')

      // At peak flash (100% white screen), perform the hatch reveal
      hatchTimeline.call(() => {
        stage.value = 'reveal'
        showParticles.value = true
        showAuras.value = true
        playSound('evolution_complete')
        
        nextTick(() => {
          // Entry animation for Stats card and Pokémon
          gsap.fromTo('.reveal-info-wrapper',
            { opacity: 0 },
            { opacity: 1, duration: HATCH_REVEAL_ANIM_DUR_SEC, ease: 'power2.out' }
          )

          gsap.fromTo('.pokemon-sprite-fx',
            { scale: 0 },
            { 
              scale: MAP_FACTION_PODER_MAX_SCALE, 
              duration: HATCH_REVEAL_ANIM_DUR_SEC,
              ease: 'back.out(1.5)', 
              onComplete: () => {
                gsap.to('.pokemon-sprite-fx', { scale: HATCH_SPRITE_FINAL_SCALE, duration: HATCH_FLASH_DURATION_SEC })
              }
            }
          )

          // Counter-phase animations for concentric auras
          if (rareAuraRef.value && atmosAuraRef.value) {
            // Concentric scale and opacity breathing (counter-phase)
            gsap.fromTo(rareAuraRef.value,
              { scale: HATCH_RARE_AURA_MIN_SCALE, opacity: HATCH_RARE_AURA_MIN_OPACITY },
              { scale: HATCH_RARE_AURA_MAX_SCALE, opacity: HATCH_RARE_AURA_MAX_OPACITY, duration: HATCH_AURA_ANIM_DUR_SEC, yoyo: true, repeat: -1, ease: 'sine.inOut' }
            )
            gsap.fromTo(atmosAuraRef.value,
              { scale: HATCH_RARE_AURA_MAX_SCALE, opacity: HATCH_RARE_AURA_MAX_OPACITY },
              { scale: HATCH_RARE_AURA_MIN_SCALE, opacity: HATCH_RARE_AURA_MIN_OPACITY, duration: HATCH_AURA_ANIM_DUR_SEC, yoyo: true, repeat: -1, ease: 'sine.inOut' }
            )
          }

          // Particle burst
          particlesRef.value.forEach((el) => {
            if (!el) return
            const angle = Math.random() * Math.PI * 2
            const distance = HATCH_PARTICLE_MIN_DISTANCE_PX + Math.random() * HATCH_PARTICLE_MAX_SPREAD_PX
            const tx = Math.cos(angle) * distance
            const ty = Math.sin(angle) * distance
            
            gsap.fromTo(el,
              { x: 0, y: 0, opacity: 1, scale: 1 },
              {
                x: tx,
                y: ty,
                opacity: 0,
                scale: 0,
                duration: 'random(1.2, 2.0)',
                delay: 'random(0, 0.25)',
                ease: 'power2.out'
              }
            )
          })

          // Smooth stats card entrance
          gsap.fromTo('.stats-card',
            { opacity: 0, y: HATCH_STATS_CARD_INITIAL_Y_OFFSET },
            { opacity: 1, y: 0, duration: HATCH_STATS_CARD_ANIM_DUR_SEC, delay: HATCH_STATS_CARD_ANIM_DELAY_SEC, ease: 'power2.out' }
          )

          gsap.fromTo('.btn-confirm',
            { opacity: 0, y: HATCH_STATS_CARD_INITIAL_Y_OFFSET },
            { opacity: 1, y: 0, duration: HATCH_STATS_CARD_ANIM_DUR_SEC, delay: HATCH_CONFIRM_BTN_ANIM_DELAY_SEC, ease: 'power2.out' }
          )
        })
      })

      // Fade out white flash while revealing new creature
      hatchTimeline.to('.hatch-backdrop', {
        backgroundColor: '',
        duration: HATCH_REVEAL_ANIM_DUR_SEC,
        ease: 'power2.out'
      })

      // End of full animation
      hatchTimeline.eventCallback('onComplete', () => {
        stage.value = 'final'
      })
    }
  }, modalRef.value ?? undefined)
}

const handleClose = async () => {
  cleanupAnimations()
  if (props.egg) {
    await gameStore.executeHatch(props.egg)
  }
  emit('close')
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
  <Teleport to="body">
    <div
      v-if="show"
      :id="id"
      ref="modalRef"
      class="hatch-overlay"
    >
      <!-- Fondo Oscuro Inmersivo con soporte para Flash de Luz -->
      <div class="hatch-backdrop" />

      <!-- Contenedor Interactivo Principal -->
      <div
        id="hatch-container"
        class="hatch-container"
        :style="auraStyles"
        @click.stop="handleContainerClick"
      >
        <!-- Área de Enfoque Persistente (Huevo / Pokémon) -->
        <div class="hatch-focus-area">
          <!-- Fase de Huevo Interactiva -->
          <HatchEggCrackStage
            v-if="isEggStage"
            :tint="egg?.tint"
          />

          <!-- Fase de Revelación del Pokémon recién nacido -->
          <div
            v-else
            class="sprite-glow-wrapper"
          >
            <!-- Auras Concéntricas combinadas con recursos flare (Cian/Oro/Plata) centradas detrás del Pokémon -->
            <div
              v-if="showAuras"
              class="auras-field"
            >
              <div
                ref="rareAuraRef"
                class="aura-layer rare-aura"
              />
              <div
                ref="atmosAuraRef"
                class="aura-layer atmospheric-aura"
              />
            </div>

            <PVSpriteFX
              :is-shiny="resultPokemon?.isShiny"
              :is-guardian="resultPokemon?.isGuardian"
              :sparkle-count="8"
              :radius="50"
              class="pokemon-sprite-fx"
            >
              <img
                v-if="resultPokemon"
                :src="getSprite(resultPokemon.id, !!resultPokemon.isShiny)"
                :alt="resultPokemon?.name || 'Pokémon eclosionado'"
                class="pokemon-sprite"
                width="32"
                height="32"
              >
            </PVSpriteFX>
          </div>

          <!-- Campo Dinámico de Partículas (centrado con el Huevo/Pokémon) -->
          <div
            v-if="showParticles"
            class="particles-field"
          >
            <div
              v-for="n in 25"
              :key="n"
              ref="particlesRef"
              class="particle"
            />
          </div>
        </div>

        <!-- Área de Información y Botones (Dinámica, se expande hacia abajo sin desplazar el foco) -->
        <div class="hatch-info-area">
          <div
            v-if="isEggStage"
            class="hatch-hint"
          >
            {{ hintText }}
          </div>

          <HatchRevealContent
            v-else
            :pokemon="resultPokemon"
            @confirm="handleClose"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
@use "@/styles/components/hatch-animation-modal";
</style>
