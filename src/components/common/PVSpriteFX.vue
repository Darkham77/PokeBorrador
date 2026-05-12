<script setup lang="ts">
/**
 * PVSpriteFX.vue
 * Componente centralizado para efectos visuales en sprites de Pokémon.
 * Soporta: Shiny Sparkles, Guardian Aura y es fácilmente extensible.
 */
import { computed, inject, type Ref, ref, watch, nextTick } from 'vue'
import { useUIStore } from '@/stores/ui'
import { gsap } from 'gsap'
import { useParticleEngine } from '@/composables/useParticleEngine'

const props = defineProps({
  // Estado base
  isShiny: { type: Boolean, default: false },
  isGuardian: { type: Boolean, default: false },
  
  // Estados Alterados
  status: { type: String, default: null }, 
  isConfused: { type: Boolean, default: false },
  isCursed: { type: Boolean, default: false },
  isSeeded: { type: Boolean, default: false },
  isTrapped: { type: Boolean, default: false },
  attracted: { type: Boolean, default: false },
  isFocusEnergy: { type: Boolean, default: false },
  isProtected: { type: Boolean, default: false },
  isEnduring: { type: Boolean, default: false },
  isLockOn: { type: Boolean, default: false },
  hasReflect: { type: Boolean, default: false },
  hasLightScreen: { type: Boolean, default: false },
  hasSafeguard: { type: Boolean, default: false },
  hasMist: { type: Boolean, default: false },
  
  // Identidad (para re-randomizar efectos al cambiar de bicho)
  pokeId: { type: [String, Number], default: null },

  // Configuración de brillo
  sparkleCount: { type: Number, default: 5 },
  
  // Control de performance
  enabled: { type: Boolean, default: true },

  // Estilo visual
  vibrant: { type: Boolean, default: false },
  
  // Metadata para futuras herramientas de testing/debug
  metadata: { type: Object, default: () => ({}) },
  
  // Fuerza modo simplificado para siluetas
  isSilhouette: { type: Boolean, default: false },

  // Radio de dispersión relativo al centro (en %)
  radius: { type: Number, default: 40 }
})

const uiStore = useUIStore()
const isModalPerformance = inject<Ref<boolean> | null>('isModalPerformanceMode', null)
const forceHighFidelity = inject<boolean>('forceHighFidelity', false)

const isSimplified = computed(() => {
  // 0. Silhouette forces simplified mode (Hides FX)
  if (props.isSilhouette) return true

  // 0.1 Force High Fidelity (Combat/Special contexts)
  if (forceHighFidelity) return false
  
  // 1. Force off if debug or manual override
  if (!props.enabled || uiStore.isSimplifiedModalsMode) return true
  
  // 2. Logic depends on context (In Modal vs On Map)
  if (isModalPerformance !== null) {
    // Inside a modal: only simplify if this modal is "below" the principal one
    return isModalPerformance.value
  } else {
    // On the map: simplify if ANY obscuring modal is open
    return uiStore.isAnyBlockingModalOpen
  }
})

// Generar una semilla aleatoria para desincronizar animaciones
const animSeed = Math.random()

const wrapperClasses = computed(() => ({
  'pv-fx-wrapper': true,
  'is-vibrant': props.vibrant && !isSimplified.value,
  'is-simplified': isSimplified.value,
  [`status-${props.status}`]: !!props.status && !isSimplified.value,
  'is-confused': props.isConfused && !isSimplified.value,
  'is-cursed': props.isCursed && !isSimplified.value,
  'is-seeded': props.isSeeded && !isSimplified.value,
  'is-trapped': props.isTrapped && !isSimplified.value,
  'is-focus-energy': props.isFocusEnergy && !isSimplified.value,
  'is-protected': props.isProtected && !isSimplified.value,
  'is-enduring': props.isEnduring && !isSimplified.value,
  'is-lock-on': props.isLockOn && !isSimplified.value
}))

const statusEmoji = computed(() => {
  const map: Record<string, string> = {
    burn: '🔥',
    poison: '☠️',
    sleep: '💤',
    paralysis: '⚡',
    freeze: '🧊'
  }
  return (props.status ? (map as Record<string, string>)[props.status] : null) || null
})

// GSAP Logic for particles and persistent effects
const statusParticlesRef = ref<HTMLElement[]>([])
const secondaryParticlesRef = ref<HTMLElement[]>([])
const spriteRef = ref<HTMLElement | null>(null)
const shinyRef = ref<HTMLElement | null>(null)
const tacticalRefs = ref<HTMLElement[]>([])
const screenRefs = ref<HTMLElement[]>([])
const auraRefs = ref<HTMLElement[]>([])

const baseScale = computed(() => (props.radius / 40) * 1.2)

const statusScaleRange = computed<[number, number]>(() => {
  const b = baseScale.value
  if (props.status === 'burn') return [b * 2.5, b * 4.5]
  if (props.status === 'paralysis') return [b * 2.0, b * 2.5]
  if (props.status === 'sleep') return [b * 1.8, b * 2.8]
  if (props.status === 'freeze') return [b * 1.5, b * 3.5]
  return [b * 0.9, b * 1.1]
})

const statusAreaRadius = computed(() => {
  if (props.status === 'sleep') return props.radius * 2
  return props.radius
})

const { initSystem: initShinySystem, killAll: killShinyFX } = useParticleEngine()
const { initSystem: initStatusSystem, killAll: killStatusFX } = useParticleEngine()
const { initSystem: initSecondarySystem, killAll: killSecondaryFX } = useParticleEngine()
const { initSystem: initTacticalSystem, killAll: killTacticalFX } = useParticleEngine()

let retryCount = 0
const activeTweens: gsap.core.Tween[] = []
const persistentTimelines: Record<string, gsap.core.Timeline> = {}

const killAllTimelines = () => {
  Object.values(persistentTimelines).forEach(tl => tl.kill())
  activeTweens.forEach(t => t.kill())
  activeTweens.length = 0
  killShinyFX()
  killStatusFX()
  killSecondaryFX()
  killTacticalFX()
}

const refreshPersistentFX = () => {
  if (!spriteRef.value) return
  
  // Usar nextTick para asegurar que el slot esté renderizado
  const target = spriteRef.value.querySelector('img')
  
  if (props.status) {
    console.log(`[PVSpriteFX] Persistent FX: status=${props.status}, target=${!!target}`)
  }
  
  if (!target && retryCount < 3) {
    retryCount++
    setTimeout(refreshPersistentFX, 100)
    return
  }

  retryCount = 0
  
  // Clean previous
  if (target) gsap.killTweensOf(target)
  activeTweens.forEach(t => t.kill())
  activeTweens.length = 0
  
  if (!target) return

  // 0. Reset previous state
  gsap.set(target, { clearProps: 'filter,x,y,rotation' })

  // 1. Cursed Aura (Pulse purple drop-shadow)
  if (props.isCursed) {
    activeTweens.push(gsap.to(target, {
      filter: 'Drop-Shadow(0 0 15px Rgba(75, 0, 130, 0.8)) Brightness(0.6) contrast(1.2) Saturate(0.5)',
      duration: 1.25,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut'
    }))
  }

  // 2. Confused Wobble (Fast jitter)
  if (props.isConfused) {
    activeTweens.push(gsap.to(target, {
      x: 2,
      rotation: 1,
      duration: 0.15,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut'
    }))
  }

  // 3. Focus Energy Pulse (Red glow)
  if (props.isFocusEnergy) {
    activeTweens.push(gsap.to(target, {
      filter: 'Drop-Shadow(0 0 10px Rgba(255, 0, 0, 0.7)) Brightness(1.3)',
      duration: 0.75,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut'
    }))
  }

  // 4. Ingrain / Enduring (Vertical float)
  if (props.isEnduring || props.isSeeded) { // Reusing for seeded too
    activeTweens.push(gsap.to(target, {
      y: -3,
      duration: 1.5,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut'
    }))
  }

  // --- MIGRATED STATUS EFFECTS ---
  
  // 5. Burn (Red/Orange Pulse)
  if (props.status === 'burn') {
    activeTweens.push(gsap.fromTo(target, 
      { filter: 'Drop-Shadow(0 0 5px #ff4500) Brightness(1) Saturate(1.2)' },
      {
        filter: 'Drop-Shadow(0 0 15px #ff8c00) Brightness(1.3) Saturate(1.8)',
        duration: 1.0,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut'
      }
    ))
  }

  // 6. Poison (Purple Glow)
  if (props.status === 'poison') {
    activeTweens.push(gsap.fromTo(target, 
      { filter: 'Drop-Shadow(0 0 2px #9400d3) Brightness(1) Saturate(1)' },
      {
        filter: 'Drop-Shadow(0 0 12px #9400d3) Brightness(0.8) Saturate(1.4) hue-rotate(10deg)',
        duration: 2.0,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut'
      }
    ))
  }

  // 7. Paralyze (Yellow Jitter)
  if (props.status === 'paralysis') {
    activeTweens.push(gsap.fromTo(target,
      { filter: 'Drop-Shadow(0 0 2px #ffd700) Brightness(1.2)' },
      {
        filter: 'Drop-Shadow(0 0 8px #ffd700) Brightness(1.4) contrast(1.2)',
        duration: 0.05,
        x: 1,
        yoyo: true,
        repeat: -1,
        ease: 'none'
      }
    ))
  }

  // 8. Freeze (Ice Blue / Cyan)
  if (props.status === 'freeze') {
    activeTweens.push(gsap.set(target, {
      filter: 'Drop-Shadow(0 0 20px #00ffff) Brightness(1.6) contrast(0.7) Saturate(0.3)'
    }))
  }

  // 9. Sleep (Dark/Dim)
  if (props.status === 'sleep') {
    activeTweens.push(gsap.fromTo(target,
      { filter: 'Brightness(1) Saturate(1)' },
      {
        filter: 'Brightness(0.5) contrast(0.8) Saturate(0.5)',
        duration: 2.0,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut'
      }
    ))
  }

  // 10. Aura Guardian (Replaces CSS pulse-aura)
  if (props.isGuardian) {
    const isVibrant = props.vibrant
    const baseFilter = isVibrant 
      ? 'Drop-Shadow(0 0 15px white) Drop-Shadow(0 0 8px Rgba(255, 255, 255, 0.8))'
      : 'Drop-Shadow(0 0 8px Rgba(255, 255, 255, 0.8))'
    const pulseFilter = isVibrant
      ? 'Drop-Shadow(0 0 40px white) Drop-Shadow(0 0 15px Rgba(255, 255, 255, 0.9))'
      : 'Drop-Shadow(0 0 12px Rgba(255, 255, 255, 0.8))'

    activeTweens.push(gsap.fromTo(target,
      { filter: baseFilter },
      {
        filter: pulseFilter,
        duration: 2.0,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        delay: animSeed * -2
      }
    ))
  }
}

const initTacticalFX = () => {
  if (isSimplified.value) return

  initTacticalSystem(tacticalRefs.value, {
    seed: animSeed,
    disableInitialRandomize: true,
    disableRandomizeOnRepeat: true,
    createTweens: (el) => {
      const type = el.getAttribute('data-fx-tact')
      const tweens: gsap.core.Tween[] = []
      
      if (type === 'protected') {
        tweens.push(gsap.to(el, { scale: 1.2, opacity: 1, duration: 0.5, yoyo: true, repeat: -1, ease: 'sine.inOut' }))
      } else if (type === 'enduring') {
        tweens.push(gsap.fromTo(el, { scale: 0, rotation: -45, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' }))
      } else if (type === 'focus') {
        tweens.push(gsap.to(el, { rotation: 360, duration: 2, repeat: -1, ease: 'none' }))
      } else if (type === 'lockon') {
        tweens.push(gsap.fromTo(el, { scaleY: 1, opacity: 1 }, { scaleY: 0.1, opacity: 0.3, duration: 0.2, yoyo: true, repeat: -1, repeatDelay: 1.8, ease: 'sine.inOut' }))
      }
      
      return tweens
    }
  })
}

const initScreenAuraFX = () => {
  screenRefs.value.forEach(el => {
    if (!el) return
    gsap.killTweensOf(el)
    gsap.fromTo(el, { scale: 1, opacity: 0.3 }, { scale: 1.1, opacity: 0.7, duration: 2, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  })

  auraRefs.value.forEach(el => {
    if (!el) return
    gsap.killTweensOf(el)
    const isMist = el.classList.contains('mist')
    if (isMist) {
      gsap.fromTo(el, { x: -10, opacity: 0.4 }, { x: 10, y: -5, opacity: 0.8, duration: 4, yoyo: true, repeat: -1, ease: 'none' })
    } else {
      gsap.fromTo(el, { x: 0, y: 0, scale: 1 }, { x: 2, y: -2, scale: 1.05, duration: 4, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    }
  })
}

const initShinyFX = () => {
  if (!shinyRef.value) return
  const sparkles = Array.from(shinyRef.value.querySelectorAll('.sparkle')) as HTMLElement[]
  
  initShinySystem(sparkles, {
    seed: animSeed,
    area: { x: [10, 90], y: [10, 90] },
    scaleRange: [baseScale.value * 0.7, baseScale.value * 1.3],
    onRepeat: (el) => {
      gsap.set(el, { filter: `Drop-Shadow(0 0 2px black) Drop-Shadow(0 0 4px gold)` })
    },
    createTweens: (el, _i, delay) => {
      return [
        gsap.fromTo(el, 
          { opacity: 0, y: 0, scale: 0, rotation: 0, xPercent: -50, yPercent: -50 },
          {
            autoAlpha: 1,
            opacity: 1,
            y: '-12%',
            scale: 1.2,
            rotation: 180,
            duration: 1.2,
            repeat: -1,
            repeatDelay: 1.3,
            delay,
            ease: 'power1.out'
          }
        ),
        gsap.to(el, {
          opacity: 0,
          y: '-25%',
          scale: 0,
          rotation: 360,
          duration: 1.3,
          repeat: -1,
          repeatDelay: 1.2,
          delay: delay + 1.2,
          ease: 'power1.in'
        })
      ]
    }
  })
}

const initParticleAnim = () => {
  if (isSimplified.value) return

  // 1. Primary Status Particles (Circular Orbit + Specific Motion)
  if (statusEmoji.value) {
    const rX = props.radius * 0.85
    const rY = props.radius * 0.35
    const statusType = props.status
    const ar = statusAreaRadius.value
    
    initStatusSystem(statusParticlesRef.value, {
      seed: animSeed,
      area: { x: [50 - ar, 50 + ar], y: [50 - ar, 50 + ar] },
      scaleRange: statusScaleRange.value,
      activeRange: props.status === 'burn' ? [3, 6] : (props.status === 'sleep' ? [1, 2] : [2, 4]),
      onInit: (el) => {
        gsap.set(el, { opacity: 0 })
      },
      createTweens: (_el, _i, seedOffset) => {
        const tweens: gsap.core.Tween[] = []
        const personalityProps = { repeat: -1, yoyo: true, delay: seedOffset }
        
        // 1.A Specific Status "Personality" (Master of Lifecycle)
        // Definimos la duración base (ciclo completo con yoyo)
        let cycleDuration = 2.5
        
        if (statusType === 'burn') {
          cycleDuration = 0.6
          tweens.push(gsap.to(_el, { ...personalityProps, y: '-=5', opacity: 1, duration: 0.3, ease: 'sine.inOut' }))
        } else if (statusType === 'paralysis') {
          cycleDuration = 0.1
          tweens.push(gsap.to(_el, { ...personalityProps, x: '+=2', y: '+=2', opacity: 1, duration: 0.05, ease: 'none' }))
        } else if (statusType === 'poison') {
          cycleDuration = 2.4
          tweens.push(gsap.to(_el, { ...personalityProps, scale: 1.2, opacity: 1, duration: 1.2, ease: 'power1.inOut' }))
        } else if (statusType === 'sleep') {
          cycleDuration = 4
          tweens.push(gsap.to(_el, { ...personalityProps, opacity: 0.6, duration: 2 }))
        } else if (statusType === 'freeze') {
          cycleDuration = 3
          tweens.push(gsap.fromTo(_el, 
            { scale: 0, opacity: 1 },
            { 
              ...personalityProps,
              scale: 1.2, 
              duration: 1.5, 
              opacity: 1,
              immediateRender: true,
              ease: 'sine.inOut' 
            }
          ))
        }

        // 1.B Base Orbit (Synchronized with cycleDuration)
        tweens.push(gsap.to(_el, {
          duration: cycleDuration,
          repeat: -1,
          ease: 'none',
          delay: seedOffset,
          modifiers: {
            x: () => `${Math.cos(((gsap.globalTimeline.time() + seedOffset) * (Math.PI * 2)) / cycleDuration) * rX}%`,
            y: () => `${Math.sin(((gsap.globalTimeline.time() + seedOffset) * (Math.PI * 2)) / cycleDuration) * rY - 15}%`,
            zIndex: () => Math.sin(((gsap.globalTimeline.time() + seedOffset) * (Math.PI * 2)) / cycleDuration) > 0 ? 10 : 1
          }
        }))

        return tweens
      }
    })

    // 1.1 Special Shine for Freeze particles
    if (props.status === 'freeze') {
      const { randomizePosition } = useParticleEngine()
      statusParticlesRef.value.forEach((el, i) => {
        activeTweens.push(gsap.to(el, {
          filter: 'Drop-Shadow(0 0 8px cyan) Brightness(2)',
          scale: 1.2,
          duration: 0.75,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.2,
          onRepeat: () => {
            randomizePosition(el, { x: [10, 90], y: [10, 90] })
          }
        }))
      })
    }
  }

  // 2. Secondary Status Particles (Floating)
  const hasSecondary = props.isConfused || props.isCursed || props.attracted || props.isSeeded || props.isTrapped
  if (hasSecondary) {
    const r = props.radius
    initSecondarySystem(secondaryParticlesRef.value, {
      seed: animSeed,
      area: { x: [50 - r, 50 + r], y: [50 - r, 50 + r] },
      scaleRange: [baseScale.value * 0.8, baseScale.value * 1.2],
      activeRange: [1, 3],
      createTweens: (el, _i, delay) => {
        const tweens: gsap.core.Tween[] = []
        
        // Base Float
        tweens.push(gsap.fromTo(el,
          { y: 0, opacity: 0 },
          {
            y: '-18%',
            opacity: 1,
            duration: 1 + Math.random(),
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            delay: delay
          }
        ))

        // Confused / Cursed Wobble
        if (props.isConfused || props.isCursed) {
          tweens.push(gsap.to(el, { x: '+=3', duration: 0.1, repeat: -1, yoyo: true, delay }))
        }

        return tweens
      }
    })
  }
}

watch([
  () => props.status, 
  () => props.pokeId, 
  () => props.isConfused, 
  () => props.isCursed,
  () => props.isFocusEnergy,
  () => props.isEnduring,
  () => props.isShiny,
  () => props.isGuardian,
  () => props.isProtected,
  () => props.isLockOn,
  () => props.hasReflect,
  () => props.hasLightScreen,
  () => props.hasSafeguard,
  () => props.hasMist,
  () => props.radius,
  isSimplified
], () => {
  nextTick(() => {
    killAllTimelines()
    initParticleAnim()
    refreshPersistentFX()
    initTacticalFX()
    initScreenAuraFX()
    initShinyFX()
  })
}, { immediate: true })

const particles = computed(() => {
  if (!statusEmoji.value) return []
  const result = []
  for (let i = 0; i < 8; i++) {
    result.push({
      id: i,
      top: `${20 + Math.random() * 60}%`,
      left: `${20 + Math.random() * 60}%`
    })
  }
  return result
})
</script>

<template>
  <div 
    :class="wrapperClasses"
    :style="{ '--fx-seed': animSeed, '--fx-radius': radius }"
  >
    <!-- Capa de Sprite con efectos persistentes (Aura Guardian) -->
    <div 
      ref="spriteRef"
      class="pv-fx-sprite-layer"
      :class="{ 
        'is-guardian': isGuardian && !isSimplified,
        'is-vibrant': vibrant && !isSimplified 
      }"
    >
      <slot />
    </div>

    <!-- Capa de Brillos (Shiny) -->
    <div
      v-if="isShiny && !isSimplified"
      ref="shinyRef"
      class="pv-fx-shiny-overlay"
      data-fx-type="shiny"
    >
      <div
        v-for="i in sparkleCount"
        :key="i"
        class="sparkle"
      />
    </div>

    <!-- Capa de Partículas de Estado -->
    <div 
      v-if="statusEmoji && !isSimplified"
      class="pv-fx-status-overlay"
    >
      <span 
        v-for="p in particles" 
        :key="p.id" 
        ref="statusParticlesRef"
        class="status-particle"
        :class="{ 'is-freeze': status === 'freeze' }"
      >
        {{ status === 'freeze' ? '' : statusEmoji }}
      </span>
    </div>

    <div
      v-if="(isConfused || isCursed) && !isSimplified"
      class="pv-fx-status-overlay"
    >
      <span
        v-if="isConfused"
        ref="secondaryParticlesRef"
        class="status-particle secondary-status"
      >💫</span>
      <span
        v-if="isCursed"
        ref="secondaryParticlesRef"
        class="status-particle secondary-status is-cursed"
      >👻</span>
    </div>

    <!-- Capa de Atracción -->
    <div
      v-if="props.attracted && !isSimplified"
      class="pv-fx-status-overlay"
    >
      <span
        v-for="i in 2"
        :key="'attr-'+i"
        ref="secondaryParticlesRef"
        class="status-particle secondary-status"
      >❤️</span>
    </div>

    <div
      v-if="(isSeeded || isTrapped) && !isSimplified"
      class="pv-fx-status-overlay"
    >
      <template v-if="isSeeded">
        <span
          v-for="i in 3"
          :key="'seed-'+i"
          ref="secondaryParticlesRef"
          class="status-particle secondary-status"
        >🌱</span>
      </template>
      <template v-if="isTrapped">
        <span
          v-for="i in 2"
          :key="'trap-'+i"
          ref="secondaryParticlesRef"
          class="status-particle secondary-status"
        >⛓️</span>
      </template>
    </div>

    <!-- Capa de Combate Táctico (Protección, Aguante, Foco, Lock-On) -->
    <div
      v-if="(isProtected || isEnduring || isFocusEnergy || isLockOn) && !isSimplified"
      class="pv-fx-status-overlay"
    >
      <span
        v-if="isProtected"
        ref="tacticalRefs"
        data-fx-tact="protected"
        class="status-particle tact-fx"
        style="top: 40%; left: 50%;"
      >🛡️</span>
      <span
        v-if="isEnduring"
        ref="tacticalRefs"
        data-fx-tact="enduring"
        class="status-particle tact-fx"
        style="top: 30%; left: 20%;"
      >👊</span>
      <span
        v-if="isFocusEnergy"
        ref="tacticalRefs"
        data-fx-tact="focus"
        class="status-particle tact-fx"
        style="top: 20%; left: 50%;"
      >🎯</span>
      <span
        v-if="isLockOn"
        ref="tacticalRefs"
        data-fx-tact="lockon"
        class="status-particle tact-fx"
        style="top: 50%; left: 50%;"
      >👁️</span>
    </div>

    <!-- Capas de Pantallas (Screens) -->
    <div
      v-if="hasReflect && !isSimplified"
      ref="screenRefs"
      class="pv-fx-screen-overlay reflect"
    />
    <div
      v-if="hasLightScreen && !isSimplified"
      ref="screenRefs"
      class="pv-fx-screen-overlay light-screen"
    />
    <!-- Capas de Aura (Safeguard / Mist) -->
    <div
      v-if="hasSafeguard && !isSimplified"
      ref="auraRefs"
      class="pv-fx-aura-overlay safeguard"
    />
    <div
      v-if="hasMist && !isSimplified"
      ref="auraRefs"
      class="pv-fx-aura-overlay mist"
    />

    <!-- Espacio para futuras capas de efectos (ej. Veneno, Quemadura, etc) -->
    <slot name="overlay" />
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

// Los estilos base vienen del core/fx.scss
// Aquí solo añadimos ajustes específicos de layout si fuera necesario
.pv-fx-wrapper {
  width: fit-content;
  height: fit-content;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  @include pixelated;
}

.pv-fx-screen-overlay {
  position: absolute;
  inset: -10%;
  pointer-events: none;
  z-index: calc(var(--z-map-spawns, 10) + 4);
  border-radius: 50%;
  opacity: 0.6;
  mix-blend-mode: color-dodge;
  
  &.reflect {
    background: Radial-Gradient(circle, Transparent 40%, #ff8c00 100%);
    border: 2px solid #ff8c00;
  }
  
  &.light-screen {
    background: Radial-Gradient(circle, Transparent 40%, $coin-gold 100%);
    border: 2px solid $coin-gold;
  }
}

.pv-fx-aura-overlay {
  position: absolute;
  inset: -5%;
  pointer-events: none;
  z-index: calc(var(--z-map-spawns, 10) + 4);
  border-radius: 40%;
  opacity: 0.4;
  
  &.safeguard {
    background: Radial-Gradient(circle, #50fa7b 0%, Transparent 70%);
    mix-blend-mode: screen;
  }
  
  &.mist {
    background: Radial-Gradient(circle, #e0f7fa 20%, Transparent 80%);
    opacity: 0.8;
  }
}

.status-particle {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: Scale(0);
}
</style>
