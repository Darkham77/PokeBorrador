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
import PVTooltip from '@/components/common/PVTooltip.vue'
import { NATURE_DATA } from '@/data/natures'
import { ABILITY_DATA } from '@/data/abilities'
import type { Pokemon, PokemonEgg } from '@/types/pokemon'
import { useGameStore } from '@/stores/game'

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

const getNatureInfo = (nature: string) => {
  if (!nature) return { desc: 'Sin datos de naturaleza.' }
  const data = NATURE_DATA as Record<string, { desc: string }>
  const entry = data[nature] || Object.entries(data).find(([k]) => k.toLowerCase() === nature.toLowerCase())?.[1]
  return entry || { desc: 'Naturaleza desconocida.' }
}

const getAbilityDesc = (ability: string) => {
  if (!ability) return 'Habilidad especial de este Pokémon.'
  const data = ABILITY_DATA as Record<string, string | { desc: string }>
  const entry = data[ability] || Object.entries(data).find(([k]) => k.toLowerCase() === ability.toLowerCase())?.[1]
  if (!entry) return 'Habilidad especial de este Pokémon.'
  return typeof entry === 'string' ? entry : (entry.desc || 'Habilidad especial de este Pokémon.')
}

const hintText = computed(() => {
  if (taps.value === 0) return '¡HAZ CLIC PARA ECLOSIONAR!'
  if (taps.value === 1) return '¡EL HUEVO SE ESTÁ AGRIETANDO!'
  return '¡YA CASI...! ¡UN TOQUE MÁS!'
})

const TYPE_AURA_COLORS: Record<string, { c1: string; c2: string }> = {
  normal: { c1: 'rgba(168, 168, 120, 0.95)', c2: 'rgba(120, 120, 90, 0.8)' },
  fire: { c1: 'rgba(240, 128, 48, 0.95)', c2: 'rgba(180, 70, 20, 0.85)' },
  water: { c1: 'rgba(104, 144, 240, 0.95)', c2: 'rgba(30, 70, 180, 0.85)' },
  grass: { c1: 'rgba(120, 200, 80, 0.95)', c2: 'rgba(40, 130, 30, 0.85)' },
  electric: { c1: 'rgba(248, 208, 48, 0.95)', c2: 'rgba(200, 140, 0, 0.85)' },
  ice: { c1: 'rgba(152, 216, 216, 0.95)', c2: 'rgba(70, 170, 180, 0.85)' },
  fighting: { c1: 'rgba(192, 48, 40, 0.95)', c2: 'rgba(120, 20, 20, 0.85)' },
  poison: { c1: 'rgba(160, 64, 160, 0.95)', c2: 'rgba(90, 20, 100, 0.85)' },
  ground: { c1: 'rgba(224, 192, 104, 0.95)', c2: 'rgba(160, 120, 50, 0.85)' },
  flying: { c1: 'rgba(168, 144, 240, 0.95)', c2: 'rgba(100, 70, 200, 0.85)' },
  psychic: { c1: 'rgba(248, 88, 136, 0.95)', c2: 'rgba(180, 20, 80, 0.85)' },
  bug: { c1: 'rgba(168, 184, 32, 0.95)', c2: 'rgba(100, 120, 10, 0.85)' },
  rock: { c1: 'rgba(184, 160, 56, 0.95)', c2: 'rgba(120, 100, 20, 0.85)' },
  ghost: { c1: 'rgba(112, 88, 152, 0.95)', c2: 'rgba(60, 40, 100, 0.85)' },
  dragon: { c1: 'rgba(112, 56, 248, 0.95)', c2: 'rgba(50, 20, 180, 0.85)' },
  dark: { c1: 'rgba(112, 88, 72, 0.95)', c2: 'rgba(60, 45, 35, 0.85)' },
  steel: { c1: 'rgba(184, 184, 208, 0.95)', c2: 'rgba(120, 120, 150, 0.85)' },
  fairy: { c1: 'rgba(240, 166, 178, 0.95)', c2: 'rgba(180, 90, 110, 0.85)' }
}

const auraStyles = computed(() => {
  let c1 = 'rgba(0, 255, 255, 0.85)' // Cian brillante por defecto
  let c2 = 'rgba(0, 190, 255, 0.75)' // Azul profundo por defecto

  if (resultPokemon.value) {
    const primaryType = resultPokemon.value.type?.toLowerCase() || 'normal'
    const colors = TYPE_AURA_COLORS[primaryType] ?? TYPE_AURA_COLORS.normal ?? { c1: 'rgba(0, 255, 255, 0.85)', c2: 'rgba(0, 190, 255, 0.75)' }
    c1 = colors.c1
    c2 = colors.c2

    // Si es shiny o guardián, sobreescribir con los colores de rareza premium
    if (resultPokemon.value.isShiny) {
      c1 = 'rgba(255, 215, 0, 0.95)' // Oro brillante
      c2 = 'rgba(255, 140, 0, 0.85)' // Naranja fuego
    } else if (resultPokemon.value.isGuardian) {
      c1 = 'rgba(255, 255, 255, 0.95)' // Blanco puro
      c2 = 'rgba(173, 216, 230, 0.85)' // Plateado / Celeste suave
    }
  }

  return {
    '--flare-1-url': `url('${flare1Url}')`,
    '--flare-2-url': `url('${flare2Url}')`,
    '--aura-color-1': c1,
    '--aura-color-2': c2,
    '--particle-color': c1
  }
})

const prepareResult = async () => {
  if (props.pokemon) {
    resultPokemon.value = props.pokemon
    return
  }
  
  if (props.egg) {
    const { makePokemon, recalcPokemonStats } = await import('@/logic/pokemonFactory')
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
  
  // Movimiento de levitación suave del huevo en reposo
  idleTimeline = gsap.timeline({ repeat: -1, yoyo: true })
  idleTimeline.to('.egg-sprite', {
    y: -12,
    duration: 1.2,
    ease: 'sine.inOut'
  })

  // Animar el anillo de brillo místico alrededor del huevo
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

    const hatchTimeline = gsap.timeline({
      onComplete: () => {
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
            // Rotaciones opuestas continuas
            gsap.to(rareAuraRef.value, {
              rotation: 360,
              duration: 15,
              repeat: -1,
              ease: 'none'
            })
            gsap.to(atmosAuraRef.value, {
              rotation: -360,
              duration: 15,
              repeat: -1,
              ease: 'none'
            })

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

          // Explosión tridimensional de partículas
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

          // Entrada suave de elementos informativos y botón de confirmación
          gsap.fromTo('.stats-card',
            { opacity: 0, y: 15 },
            { opacity: 1, y: 0, duration: 0.5, delay: 0.7, ease: 'power2.out' }
          )

          gsap.fromTo('.btn-confirm',
            { opacity: 0, y: 15 },
            { opacity: 1, y: 0, duration: 0.5, delay: 1.2, ease: 'power2.out' }
          )

          stage.value = 'final'
        })
      }
    })

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

    hatchTimeline.to('.hatch-backdrop', {
      backgroundColor: '',
      duration: 0.6,
      ease: 'power2.out'
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
            <div class="egg-sprite egg-sprite-emoji">
              🥚
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
            <div
              v-if="resultPokemon"
              class="stats-card"
            >
              <div class="stat-row">
                <span class="label">Naturaleza:</span>
                <PVTooltip
                  title="NATURALEZA"
                  :description="getNatureInfo(resultPokemon.nature).desc"
                  position="top"
                >
                  <span class="val interactive-val m-interactive-label">{{ resultPokemon.nature }}</span>
                </PVTooltip>
              </div>
              <div class="stat-row">
                <span class="label">Habilidad:</span>
                <PVTooltip
                  title="HABILIDAD"
                  :description="getAbilityDesc(resultPokemon.ability || 'Común')"
                  position="top"
                >
                  <span class="val interactive-val m-interactive-label">{{ resultPokemon.ability || 'Común' }}</span>
                </PVTooltip>
              </div>
              <div class="stat-row ivs-row">
                <span class="label">IVs:</span>
                <span class="val ivs-grid">
                  <span>HP: {{ resultPokemon.ivs?.hp }}</span>
                  <span>ATK: {{ resultPokemon.ivs?.atk }}</span>
                  <span>DEF: {{ resultPokemon.ivs?.def }}</span>
                  <span>SPA: {{ resultPokemon.ivs?.spa }}</span>
                  <span>SPD: {{ resultPokemon.ivs?.spd }}</span>
                  <span>SPE: {{ resultPokemon.ivs?.spe }}</span>
                </span>
              </div>
            </div>

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
