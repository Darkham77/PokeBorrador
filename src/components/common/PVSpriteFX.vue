<script setup lang="ts">
/**
 * PVSpriteFX.vue
 * Componente centralizado para efectos visuales en sprites de Pokémon.
 * Soporta: Shiny Sparkles, Guardian Aura y es fácilmente extensible.
 */
import { computed, inject, type Ref, ref, watch, nextTick } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useBattleStore } from '@/stores/battle'
import { gsap } from 'gsap'
import { useParticleEngine } from '@/composables/useParticleEngine'

const battleStore = useBattleStore()

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
  hasSpikes: { type: Boolean, default: false },
  isIngrained: { type: Boolean, default: false },
  
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
  radius: { type: Number, default: 40 },

  // Escala absoluta del sprite para el tamaño de las partículas
  spriteScale: { type: Number, default: 1 }
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

const secondaryEffects = computed(() => [
  { active: props.isConfused, emoji: '💫', type: 'confused' },
  { active: props.isCursed, emoji: '👻', type: 'cursed' },
  { active: props.attracted, emoji: '💖', type: 'attracted' },
  { active: props.isSeeded, emoji: '🌱', type: 'seeded' },
  { active: props.isTrapped, emoji: '🕸️', type: 'trapped' },
  { active: props.isIngrained, emoji: '🌳', type: 'ingrained' }
].filter(e => e.active))

const tacticalEffects = computed(() => [
  { active: props.isProtected, emoji: '🛡️', type: 'protected' },
  { active: props.isEnduring, emoji: '✊', type: 'enduring' },
  { active: props.isFocusEnergy, emoji: '🎯', type: 'focus' },
  { active: props.isLockOn, emoji: '👁️', type: 'lockon' }
].filter(e => e.active))

const fieldEffects = computed(() => [
  { active: props.hasReflect, emoji: '🧱', type: 'reflect' },
  { active: props.hasLightScreen, emoji: '🕯️', type: 'lightscreen' },
  { active: props.hasSafeguard, emoji: '🛡️', type: 'safeguard' },
  { active: props.hasMist, emoji: '☁️', type: 'mist' },
  { active: props.hasSpikes, emoji: '🌵', type: 'spikes' }
].filter(e => e.active))

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
const spriteRef = ref<HTMLElement | null>(null)
const shinyRef = ref<HTMLElement | null>(null)

const baseScale = computed(() => props.spriteScale * 1.2)


const statusAreaRadius = computed(() => props.radius)
const { initSystem: initShinySystem, killAll: killShinyFX } = useParticleEngine()
const { initSystem: initStatusSystem, killAll: killStatusFX } = useParticleEngine()
const { initSystem: initUnifiedSystem, killAll: killUnifiedFX } = useParticleEngine()

let retryCount = 0
const activeTweens: gsap.core.Tween[] = []
const persistentTimelines: Record<string, gsap.core.Timeline> = {}

const killAllTimelines = () => {
  Object.values(persistentTimelines).forEach(tl => tl.kill())
  activeTweens.forEach(t => t.kill())
  activeTweens.length = 0
  killShinyFX()
  killStatusFX()
  killUnifiedFX()
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
  if (target) {
    gsap.killTweensOf(target)
    gsap.set(target, { clearProps: 'filter,x,y,rotation' })
  }
  if (spriteRef.value) {
    gsap.killTweensOf(spriteRef.value)
    gsap.set(spriteRef.value, { clearProps: 'filter' })
  }
  
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

  // 10. Aura Guardian (Aplicado al CONTENEDOR para permitir apilamiento de filtros)
  if (props.isGuardian) {
    const isVibrant = props.vibrant
    const baseFilter = isVibrant 
      ? 'Drop-Shadow(0 0 15px white) Drop-Shadow(0 0 8px Rgba(255, 255, 255, 0.8))'
      : 'Drop-Shadow(0 0 8px Rgba(255, 255, 255, 0.8))'
    const pulseFilter = isVibrant
      ? 'Drop-Shadow(0 0 40px white) Drop-Shadow(0 0 15px Rgba(255, 255, 255, 0.9))'
      : 'Drop-Shadow(0 0 12px Rgba(255, 255, 255, 0.8))'

    activeTweens.push(gsap.fromTo(spriteRef.value,
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

// --- LÓGICA DE CONFIGURACIÓN MODULARIZADA ---
/**
 * Centraliza las reglas visuales para todos los efectos de partículas.
 * Esto evita repetir la lógica de offset y área en múltiples motores.
 */
const resolveEffectSettings = (type: string, ar: number, options: { isField?: boolean } = {}) => {
  const isHeadEffect = type === 'sleep' || type === 'confusion' || type === 'confused'
  const isField = options.isField || false
  
  // 1. Cálculo de Offset (Desplazamiento a la cabeza: 75% del radio hacia arriba)
  const offset = isHeadEffect ? { x: 0, y: -ar * 0.75 } : undefined
  
  // 2. Cálculo de Área (Dispersión proporcional)
  // Factor 0.4 para efectos de cabeza (órbita expansiva), 1.0 para el resto
  const factor = isHeadEffect ? 0.4 : 1.0
  const areaRange: [number, number] = isField ? [10, 90] : [50 - ar * factor, 50 + ar * factor]
  
  // 3. Rango de partículas activas según la intensidad del estado
  let activeRange: [number, number] = [2, 4]
  if (isField) activeRange = [3, 6]
  else if (type === 'burn') activeRange = [8, 12]
  else if (type === 'poison') activeRange = [4, 8]
  else if (isHeadEffect) activeRange = [1, 2]
  
  return {
    offset,
    area: { x: areaRange, y: areaRange },
    activeRange
  }
}

/**
 * Motor Unificado para Efectos Secundarios, Tácticos y de Campo
 */
const initUnifiedSystems = () => {
  if (isSimplified.value) return

  const container = spriteRef.value?.closest('.pv-fx-wrapper')
  if (!container) return

  const containers = container.querySelectorAll('.secondary-container, .tactical-container, .field-container')
  containers.forEach(group => {
    const type = group.getAttribute('data-fx-type')
    if (!type) return

    const particles = Array.from(group.querySelectorAll('.status-particle')) as HTMLElement[]
    if (particles.length === 0) return

    const isTactical = group.classList.contains('tactical-container')
    const isField = group.classList.contains('field-container')
    const isConfused = type === 'confusion'

    const settings = resolveEffectSettings(type, props.radius, { 
      isField: isField 
    })
    
    initUnifiedSystem(particles, {
      seed: animSeed + (type?.length || 0),
      ...settings,
      createTweens: (el, index, delay) => {
        // Configuraciones de ritmo según el tipo de efecto
        const duration = isTactical ? 0.8 : (isField ? 4.0 : 2.0)
        const targetScale = baseScale.value * (isTactical ? 0.4 : (isField ? 0.3 : 0.25))
        
        // Desincronización agresiva para confusión
        const staggerDelay = isConfused ? (index * 1.5) : 0
        const finalDelay = delay + staggerDelay
        // Variación de repetición para que no se sincronicen nunca
        const finalRepeatDelay = duration + (isConfused ? Math.random() * 2 : 0)

        return [
          // 1. Nacimiento y Ascenso
          gsap.fromTo(el,
            { opacity: 0, y: '5%', scale: 0, xPercent: -50, yPercent: -50 },
            {
              opacity: 1,
              y: isTactical ? '-5%' : '-15%',
              scale: targetScale,
              duration: duration,
              repeat: -1,
              repeatDelay: finalRepeatDelay,
              delay: finalDelay,
              ease: isTactical ? 'back.out(1.7)' : 'sine.inOut',
              onStart: () => {
                // Calidad Premium: Super-sampling para nitidez absoluta
                gsap.set(el, { imageRendering: 'auto', webkitFontSmoothing: 'none' })
              }
            }
          ),
          // 2. Muerte y Desvanecimiento
          gsap.to(el, {
            opacity: 0,
            y: isTactical ? '-10%' : '-30%',
            scale: targetScale * 0.5,
            duration: duration,
            repeat: -1,
            repeatDelay: finalRepeatDelay,
            delay: finalDelay + duration,
            ease: 'sine.in'
          })
        ]
      }
    })
  })
}

/**
 * Animaciones persistentes para elementos de pantalla (Reflejo / Pantalla Luz)
 */
const initScreenAuraFX = () => {
  const container = spriteRef.value?.closest('.pv-fx-wrapper')
  if (!container) return

  const screens = container.querySelectorAll('.pv-fx-screen-overlay')
  screens.forEach(el => {
    gsap.killTweensOf(el)
    gsap.fromTo(el, 
      { scale: 0.95, opacity: 0.4 }, 
      { scale: 1.05, opacity: 0.7, duration: 2, yoyo: true, repeat: -1, ease: 'sine.inOut' }
    )
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
        })
      ]
    }
  })
}

const initParticleAnim = () => {
  if (isSimplified.value || !statusEmoji.value || !spriteRef.value) return
  
  const container = spriteRef.value.closest('.pv-fx-wrapper')
  if (!container) return
  
  const isConfusedState = props.status === 'confusion' || props.status === 'confused'
  const particleEls = (isConfusedState) ? [] : Array.from(
    container.querySelectorAll('.status-particle:not(.secondary-status)')
  ) as HTMLElement[]
  
  if (particleEls.length === 0) return

  const ar = statusAreaRadius.value
  const statusType = props.status || ''
  
  initStatusSystem(particleEls, {
    seed: animSeed,
    ...resolveEffectSettings(statusType, ar),
    createTweens: (el, _i, delay) => {
      const isPara = statusType === 'paralysis'
      // Restauración de ritmos originales: Parálisis 0.15s, Fuego 0.6s, Otros 1.5s
      const duration = isPara ? 0.15 : (statusType === 'burn' ? 0.6 : 1.5)
      
      // Variación orgánica: factor de 0.3 a 1.0 para el fuego
      const randomFactor = statusType === 'burn' ? (0.3 + Math.random() * 0.7) : 1.0
      const targetScale = baseScale.value * (statusType === 'burn' ? 0.6 : 0.3) * randomFactor
      
      return [
        // 1. Nacimiento y Ascenso inicial (Rápido)
        gsap.fromTo(el,
          { opacity: 0, y: '10%', scale: 0, xPercent: -50, yPercent: -50, x: 0 },
          {
            opacity: 1,
            y: isPara ? '0%' : '-10%',
            x: isPara ? () => (Math.random() - 0.5) * 10 : 0, // Jitter eléctrico
            scale: targetScale,
            duration: isPara ? 0.05 : duration,
            repeat: -1,
            repeatDelay: isPara ? 0.1 : duration,
            delay,
            ease: isPara ? 'none' : 'power1.out',
            onStart: () => {
               gsap.set(el, { 
                 imageRendering: 'auto',
                 webkitFontSmoothing: 'none',
                 filter: statusType === 'burn' ? 'none' : (statusType === 'freeze' ? 'Drop-Shadow(0 0 8px cyan) Brightness(2)' : 'none')
               })
            }
          }
        ),
        // 2. Muerte y Desvanecimiento
        gsap.to(el, {
          opacity: 0,
          y: isPara ? '0%' : '-30%',
          scale: isPara ? targetScale : targetScale * 0.5,
          // Aura sólida para congelado en la segunda fase
          filter: statusType === 'freeze' ? 'Drop-Shadow(0 0 15px #00ffff) Drop-Shadow(0 0 5px white) Brightness(2.5)' : undefined,
          backgroundColor: statusType === 'freeze' ? 'rgba(0, 255, 255, 0.8)' : undefined,
          duration: isPara ? 0.05 : duration,
          repeat: -1,
          repeatDelay: isPara ? 0.1 : duration,
          delay: delay + (isPara ? 0.1 : duration),
          ease: isPara ? 'none' : 'power1.in'
        })
      ]
    }
  })
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
    initUnifiedSystems()
    refreshPersistentFX()
    initScreenAuraFX()
    initShinyFX()
  })
}, { immediate: true })


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
        'is-vibrant': vibrant && !isSimplified,
        'is-freeze': status === 'freeze' && !isSimplified
      }"
    >
      <slot />
    </div>

    <!-- GUIAS DE DEBUG (Solo visibles con VITE_DEBUG_ACTIVE) -->
    <div v-if="battleStore.debugShowPokeRadius" class="debug-guide debug-poke-radius" :style="{ width: (props.radius * 2) + '%', height: (props.radius * 2) + '%' }">
      <span class="label">POKE (Radio: {{ props.radius.toFixed(1) }}% | Diám: {{ (props.radius * 2).toFixed(1) }}%)</span>
    </div>

    <div 
      v-if="battleStore.debugShowFxRadius && (status || isConfused)" 
      class="debug-guide debug-fx-radius" 
      :style="{ 
        width: (props.radius * ((status === 'sleep' || status === 'confused' || status === 'confusion' || isConfused) ? 0.8 : 2)) + '%', 
        height: (props.radius * ((status === 'sleep' || status === 'confused' || status === 'confusion' || isConfused) ? 0.8 : 2)) + '%',
        top: ((status === 'sleep' || status === 'confused' || status === 'confusion' || isConfused) ? (50 - props.radius * 0.75) : 50) + '%'
      }"
    >
      <span class="label">
        FX AREA (Orbit Width: {{ (props.radius * ((status === 'sleep' || status === 'confused' || status === 'confusion' || isConfused) ? 0.8 : 2)).toFixed(1) }}% 
        | Offset: {{ (status === 'sleep' || status === 'confused' || status === 'confusion' || isConfused) ? '-75%' : '0%' }})
      </span>
    </div>

    <!-- BRILLOS SHINY (SIEMPRE DISPONIBLES) -->
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
      class="pv-fx-status-overlay"
      :style="{ display: (statusEmoji && !isSimplified) ? 'block' : 'none' }"
    >
      <span 
        v-for="i in 12" 
        :key="'status-'+i" 
        class="status-particle"
        :class="{ 'is-freeze': status === 'freeze' }"
      >
        {{ status === 'freeze' ? '' : statusEmoji }}
      </span>
    </div>

    <!-- 2. Capas de Partículas Secundarias (Confusión, Atracción, etc) -->
    <div
      v-for="fx in secondaryEffects"
      :key="'sec-'+fx.type"
      class="pv-fx-status-overlay secondary-container"
      :data-fx-type="fx.type"
      :style="{ display: !isSimplified ? 'block' : 'none' }"
    >
      <span
        v-for="i in (fx.type === 'confusion' ? 2 : 4)"
        :key="i"
        class="status-particle secondary-status"
      >{{ fx.emoji }}</span>
    </div>

    <!-- 3. Capas de Partículas Tácticas (Protección, Aguante, etc) -->
    <div
      v-for="fx in tacticalEffects"
      :key="'tact-'+fx.type"
      class="pv-fx-status-overlay tactical-container"
      :data-fx-type="fx.type"
      :style="{ display: !isSimplified ? 'block' : 'none' }"
    >
      <span
        v-for="i in 3"
        :key="i"
        class="status-particle tactical-status"
      >{{ fx.emoji }}</span>
    </div>

    <!-- 4. Capas de Partículas de Campo (Reflejo, Neblina, etc) -->
    <div
      v-for="fx in fieldEffects"
      :key="'field-'+fx.type"
      class="pv-fx-status-overlay field-container"
      :data-fx-type="fx.type"
      :style="{ display: !isSimplified ? 'block' : 'none' }"
    >
      <span
        v-for="i in 6"
        :key="i"
        class="status-particle field-status"
      >{{ fx.emoji }}</span>
    </div>

    <!-- Capas de Caparazones Tácticos (Grandes envolventes) -->
    <div
      v-if="hasReflect && !isSimplified"
      class="pv-fx-screen-overlay reflect"
    />
    <div
      v-if="hasLightScreen && !isSimplified"
      class="pv-fx-screen-overlay light-screen"
    />

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

/* --- DEBUG GUIDES --- */
.debug-guide {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: Translate(-50%, -50%);
  border: 1px dashed;
  border-radius: 50%;
  pointer-events: none;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  @include pixelated;

  .label {
    position: absolute;
    top: -12px;
    background: Rgba(0, 0, 0, 0.8);
    color: white;
    font-size: 6px;
    padding: 1px 4px;
    border-radius: 2px;
    white-space: nowrap;
  }

  &.debug-poke-radius {
    border-color: #00ffff;
    background: Rgba(0, 255, 255, 0.15);
    border: 2px solid #00ffff;
    .label { border: 1px solid #00ffff; background: Rgba(0, 50, 50, 0.9); }
  }

  &.debug-fx-radius {
    border-color: #ff9900;
    background: Rgba(255, 153, 0, 0.15);
    border: 2px solid #ff9900;
    .label { border: 1px solid #ff9900; background: Rgba(50, 30, 0, 0.9); }
  }
}
</style>
