<script setup lang="ts">
/**
 * HatchAnimationModal.vue
 * Rediseño premium en pantalla completa para la eclosión de huevos.
 * Orquestado al 100% con GSAP, sin BaseModal y con auras de alta fidelidad.
 */
import { ref, onMounted, onUnmounted, nextTick, watch, provide, computed } from 'vue'
import { gsap } from 'gsap'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import type { Pokemon, PokemonEgg } from '@/types/pokemon/pokemon'
import { useGameStore } from '@/stores/game'
import HatchStatsCard from '@/components/breeding/HatchStatsCard.vue'
import { getAuraStyles } from '@/logic/breeding/hatchAuras'
import EggSprite from '@/components/common/EggSprite.vue'

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
  const win = window as unknown as { playSound?: (s: string) => void }
  win.playSound?.(soundName)
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
    const p = makePokemon(String(props.egg.pokemonId || props.egg.id || ''), 1, {
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
    y: -12,
    duration: 1.2,
    ease: 'sine.inOut'
  })

  // Animar el anillo de brillo místico al rededor del huevo
  const glow = gsap.fromTo('.glow-ring', 
    { scale: 0.8, opacity: 0.5 },
    { scale: 1.4, opacity: 0, duration: 1.8, repeat: -1, ease: 'power1.out' }
  )
  activeTweens.push(glow)

  // Destello en el texto de invitación
  const hintPulse = gsap.fromTo('.hatch-hint',
    { opacity: 0.4 },
    { opacity: 0.9, duration: 0.8, repeat: -1, yoyo: true, ease: 'sine.inOut' }
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
        duration: 0.08,
        repeat: 5,
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
      { scale: 1.3, opacity: 0.9, duration: 0.2, yoyo: true, repeat: 1 }
    )

  } else if (taps.value === 2) {
    playSound('egg_crack')
    // wobble de intensidad media
    const wobble = gsap.fromTo('.egg-sprite',
      { x: 0, rotation: 0 },
      {
        x: 'random(-10, 10)',
        rotation: 'random(-7, 7)',
        duration: 0.07,
        repeat: 7,
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
      { scale: 1.6, opacity: 1, duration: 0.15, yoyo: true, repeat: 1 }
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
        x: 'random(-14, 14)',
        rotation: 'random(-10, 10)',
        duration: 0.05,
        repeat: 26,
        yoyo: true,
        ease: 'none'
      }
    )

    // El anillo de brillo colapsa hacia el centro y estalla hacia afuera
    hatchTimeline.fromTo('.glow-ring',
      { scale: 1, opacity: 0.6 },
      { scale: 3.5, opacity: 1, duration: 1.3, ease: 'power2.inOut' },
      0
    )

    // Gran flash en pantalla completa justo al finalizar el temblor
    hatchTimeline.to('.hatch-backdrop', {
      backgroundColor: '#ffffff',
      duration: 0.2,
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
          { opacity: 1, duration: 0.6, ease: 'power2.out' }
        )

        gsap.fromTo('.pokemon-sprite-fx',
          { scale: 0 },
          { 
            scale: 1.15, 
            duration: 0.6, 
            ease: 'back.out(1.5)', 
            onComplete: () => {
              gsap.to('.pokemon-sprite-fx', { scale: 1.0, duration: 0.2 })
            }
          }
        )

        // Animaciones de las auras concéntricas en contra-fase
        if (rareAuraRef.value && atmosAuraRef.value) {
          // Respiración concéntrica de escalas y opacidad (contra-fase)
          gsap.fromTo(rareAuraRef.value,
            { scale: 0.8, opacity: 0.3 },
            { scale: 2.4, opacity: 0.95, duration: 2.2, yoyo: true, repeat: -1, ease: 'sine.inOut' }
          )
          gsap.fromTo(atmosAuraRef.value,
            { scale: 2.4, opacity: 0.95 },
            { scale: 0.8, opacity: 0.3, duration: 2.2, yoyo: true, repeat: -1, ease: 'sine.inOut' }
          )
        }

        // Explosión de partículas
        particlesRef.value.forEach((el) => {
          if (!el) return
          const angle = Math.random() * Math.PI * 2
          const distance = 80 + Math.random() * 140
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

        // Entrada suave de los stats
        gsap.fromTo('.stats-card',
          { opacity: 0, y: 15 },
          { opacity: 1, y: 0, duration: 0.5, delay: 0.7, ease: 'power2.out' }
        )

        gsap.fromTo('.btn-confirm',
          { opacity: 0, y: 15 },
          { opacity: 1, y: 0, duration: 0.5, delay: 1.2, ease: 'power2.out' }
        )
      })
    })

    // Desvanecer el flash blanco mientras se revela la nueva criatura
    hatchTimeline.to('.hatch-backdrop', {
      backgroundColor: '',
      duration: 0.6,
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
