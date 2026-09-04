<script setup lang="ts">
/**
 * HatchAnimationModal.vue
 * Rediseño premium en pantalla completa para la eclosión de huevos.
 * Orquestado al 100% con GSAP, sin BaseModal y con auras de alta fidelidad.
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
import HatchStatsCard from '@/components/breeding/HatchStatsCard.vue'
import { getAuraStyles } from '@/logic/breeding/hatchAuras'
import EggSprite from '@/components/common/EggSprite.vue'
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

// Forzar el modo de alta fidelidad a todos los componentes inyectados (como PVSpriteFX)
provide('forceHighFidelity', true)

const gameStore = useGameStore()
const stage = ref<'egg' | 'shake' | 'reveal' | 'final'>('egg')
const taps = ref(0)
const showParticles = ref(false)
const showAuras = ref(false)
const resultPokemon = ref<Pokemon | null>(null)

// DOM Refs para animaciones de GSAP
const particlesRef = ref<HTMLElement[]>([])
const rareAuraRef = ref<HTMLElement | null>(null)
const atmosAuraRef = ref<HTMLElement | null>(null)

// Referencias de los activos de brillo premium
const flare1Url = getAssetUrl(ASSET_TYPES.FX, 'flare_1')
const flare2Url = getAssetUrl(ASSET_TYPES.FX, 'flare_2')

// Almacén de animaciones activas para limpieza limpia al desmontar
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

const prepareResult = async () => {
  if (props.pokemon) {
    resultPokemon.value = props.pokemon
    return
  }
  
  if (props.egg) {
    const { makePokemon, recalcPokemonStats } = await import('@/logic/pokemon/pokemonFactory')
    const { getEggSpecies } = await import('@/logic/breeding/breedingEngine')
    const rawSpeciesId = String(props.egg.pokemonId || props.egg.id || '')
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
  if (idleTimeline) {
    idleTimeline.kill()
    idleTimeline = null
  }
  activeTweens.forEach(t => t.kill())
  activeTweens.length = 0
  if (document.querySelector('.egg-stage-wrapper')) {
    gsap.set('.egg-stage-wrapper', { clearProps: 'all' })
  }
  if (document.querySelector('.egg-sprite')) {
    gsap.set('.egg-sprite', { clearProps: 'all' })
  }
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
  
  // Movimiento de levitación suave del huevo en reposo en el contenedor padre
  idleTimeline = gsap.timeline({ repeat: -1, yoyo: true })
  idleTimeline.to('.egg-stage-wrapper', {
    y: EGG_LEVITATION_Y_OFFSET,
    duration: EGG_LEVITATION_DURATION_SEC,
    ease: 'sine.inOut'
  })

  // Animar el anillo de brillo místico al rededor del huevo
  const glow = gsap.fromTo('.glow-ring', 
    { scale: HATCH_GLOW_RING_INITIAL_SCALE, opacity: HATCH_GLOW_RING_PULSE_OPACITY },
    { scale: GLOW_RING_EXPAND_SCALE, opacity: OPACITY_ZERO, duration: GLOW_RING_PULSE_DURATION_SEC, repeat: -1, ease: 'power1.out' }
  )
  activeTweens.push(glow)

  // Destello en el texto de invitación
  const hintPulse = gsap.fromTo('.hatch-hint',
    { opacity: HATCH_HINT_MIN_OPACITY },
    { opacity: HATCH_HINT_MAX_OPACITY, duration: HATCH_HINT_PULSE_DURATION_SEC, repeat: -1, yoyo: true, ease: 'sine.inOut' }
  )
  activeTweens.push(hintPulse)
}

const handleEggClick = () => {
  if (stage.value !== 'egg') return
  
  taps.value++
  
  if (taps.value === 1) {
    playSound('egg_crack')
    // wobble suave de toquecito
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
        x: 'random(-10, 10)', // no-magic: Explicit mathematical constant or threshold value
        rotation: 'random(-7, 7)', // no-magic: Explicit mathematical constant or threshold value
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

    // Temblor de eclosión creciente de alta frecuencia
    hatchTimeline.fromTo('.egg-sprite',
      { x: 0, rotation: 0 },
      {
        x: 'random(-14, 14)', // no-magic: Explicit mathematical constant or threshold value
        rotation: 'random(-10, 10)', // no-magic: Explicit mathematical constant or threshold value
        duration: HATCH_SHAKE_DURATION_SEC,
        repeat: HATCH_SHAKE_REPEAT_COUNT,
        yoyo: true,
        ease: 'none'
      }
    )

    // El anillo de brillo colapsa hacia el centro y estalla hacia afuera
    hatchTimeline.fromTo('.glow-ring',
      { scale: 1, opacity: 0.6 },
      { scale: HATCH_RING_MAX_SCALE, opacity: HATCH_GLOW_RING_MAX_OPACITY, duration: GLOW_RING_COLLAPSE_DURATION_SEC, ease: 'power2.inOut' },
      0
    )

    // Gran flash en pantalla completa justo al finalizar el temblor
    hatchTimeline.to('.hatch-backdrop', {
      backgroundColor: '#ffffff',
      duration: HATCH_FLASH_DURATION_SEC,
      ease: 'power1.in'
    }, '+=0.05')

    // En el pico del destello (pantalla 100% blanca), realizamos la eclosión
    hatchTimeline.call(() => {
      stage.value = 'reveal'
      showParticles.value = true
      showAuras.value = true
      playSound('evolution_complete')
      
      nextTick(() => {
        // Animación de entrada de la tarjeta de Stats y Pokémon
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

        // Animaciones de las auras concéntricas en contra-fase
        if (rareAuraRef.value && atmosAuraRef.value) {
          // Respiración concéntrica de escalas y opacidad (contra-fase)
          gsap.fromTo(rareAuraRef.value,
            { scale: HATCH_RARE_AURA_MIN_SCALE, opacity: HATCH_RARE_AURA_MIN_OPACITY },
            { scale: HATCH_RARE_AURA_MAX_SCALE, opacity: HATCH_RARE_AURA_MAX_OPACITY, duration: HATCH_AURA_ANIM_DUR_SEC, yoyo: true, repeat: -1, ease: 'sine.inOut' }
          )
          gsap.fromTo(atmosAuraRef.value,
            { scale: HATCH_RARE_AURA_MAX_SCALE, opacity: HATCH_RARE_AURA_MAX_OPACITY },
            { scale: HATCH_RARE_AURA_MIN_SCALE, opacity: HATCH_RARE_AURA_MIN_OPACITY, duration: HATCH_AURA_ANIM_DUR_SEC, yoyo: true, repeat: -1, ease: 'sine.inOut' }
          )
        }

        // Explosión de partículas
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
              duration: 'random(1.2, 2.0)', // no-magic: Explicit mathematical constant or threshold value
              delay: 'random(0, 0.25)', // no-magic: Explicit mathematical constant or threshold value
              ease: 'power2.out'
            }
          )
        })

        // Entrada suave de los stats
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

    // Desvanecer el flash blanco mientras se revela la nueva criatura
    hatchTimeline.to('.hatch-backdrop', {
      backgroundColor: '',
      duration: HATCH_REVEAL_ANIM_DUR_SEC,
      ease: 'power2.out'
    })

    // Fin de la animación completa
    hatchTimeline.eventCallback('onComplete', () => {
      stage.value = 'final'
    })
  }
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
      class="hatch-overlay"
    >
      <!-- Fondo Oscuro Inmersivo con soporte para Flash de Luz -->
      <div class="hatch-backdrop" />

      <!-- Contenedor Interactivo Principal -->
      <div
        id="hatch-container"
        class="hatch-container"
        :style="auraStyles"
        @click.stop="stage === 'egg' ? handleEggClick() : null"
      >
        <!-- Área de Enfoque Persistente (Huevo / Pokémon) -->
        <div class="hatch-focus-area">
          <!-- Fase de Huevo Interactiva -->
          <div
            v-if="stage === 'egg' || stage === 'shake'"
            class="egg-stage-wrapper"
          >
            <div class="egg-sprite">
              <EggSprite
                size="120"
                :tint="egg?.tint"
              />
            </div>
            <div class="glow-ring" />
          </div>

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
                class="pokemon-sprite"
                @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
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
            v-if="stage === 'egg' || stage === 'shake'"
            class="hatch-hint"
          >
            {{ hintText }}
          </div>

          <div
            v-else
            class="reveal-info-wrapper"
          >
            <div class="splash-text">
              ¡Ha nacido un <span class="highlight">{{ resultPokemon?.name }}</span>!
            </div>

            <!-- Tarjeta Premium de Stats -->
            <HatchStatsCard
              v-if="resultPokemon"
              :pokemon="resultPokemon"
            />

            <!-- Botón de Confirmación -->
            <button
              id="hatch-continue-btn"
              class="btn-confirm"
              @click.stop="handleClose"
            >
              CONTINUAR
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
@use "@/styles/components/hatch-animation-modal";
</style>
