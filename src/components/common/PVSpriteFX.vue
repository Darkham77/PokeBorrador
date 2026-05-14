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

  // 10. Aura Guardian (Solo si NO hay estado activo - VFX Integrity Rule)
  if (props.isGuardian && !props.status) {
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
interface ParticleArea {
  x: [number, number]
  y?: [number, number]
}

interface EffectSettings {
  offset?: { x: number; y: number }
  area: ParticleArea
  activeRange: [number, number]
  shape: 'circle' | 'rect'
  stagger?: number
  wobble?: { x: number; rotation: number; duration: number }
}

/**
 * Centraliza las reglas visuales para todos los efectos de partículas.
 * Esto evita repetir la lógica de offset y área en múltiples motores.
 */
const resolveEffectSettings = (type: string, ar: number, options: { isField?: boolean } = {}): EffectSettings => {
  const typeKey = type.toLowerCase().replace('_', '-')
  const isHeadEffect = typeKey === 'sleep' || typeKey === 'confusion' || typeKey === 'confused' || typeKey === 'dizzy'
  const isFeetEffect = typeKey.includes('leech') || typeKey.includes('seed') || typeKey.includes('seeded') || typeKey === 'trapped' || typeKey === 'bound' || typeKey.includes('ingrain')
  const isField = options.isField || false
  
  // 1. Cálculo de Offset (Cabeza vs Pies)
  let offset: { x: number; y: number } | undefined = undefined
  if (isHeadEffect) offset = { x: 0, y: -ar * 0.75 }
  else if (isFeetEffect) offset = { x: 0, y: ar * 0.35 } // Un poco más arriba para que la caja respire
  
  // 2. Cálculo de Área y Forma
  const factor = isHeadEffect ? 0.4 : 1.0
  const maxRadius = isField ? 45 : ar * factor
  
  const shape = isFeetEffect ? 'rect' : 'circle'
  const area: ParticleArea = shape === 'circle' 
    ? { x: [0, maxRadius] } 
    : { x: [-40, 40], y: [0, 15] } // Caja plana relativa al centro del offset
  
  // 3. Rango de partículas activas según la intensidad del estado
  let activeRange: [number, number] = [2, 4]
  if (typeKey === 'reflect') activeRange = [1, 1]
  else if (typeKey === 'safeguard' || typeKey === 'lightscreen') activeRange = [1, 2]
  else if (isField) activeRange = [6, 12]
  else if (typeKey === 'protected' || typeKey === 'enduring' || typeKey === 'focus' || typeKey === 'lockon') activeRange = [1, 1]
  else if (typeKey === 'burn') activeRange = [8, 12]
  else if (typeKey === 'poison') activeRange = [2, 4]
  else if (isHeadEffect) activeRange = [1, 2]
  
  // 4. Parámetros estéticos según el tipo de efecto (Wobble y Stagger)
  let extraSettings: Partial<EffectSettings> = {}
  
  switch (type) {
    case 'confusion':
    case 'confused':
      extraSettings = {
        stagger: 0.4,
        wobble: { x: 30, rotation: 10, duration: 0.12 }
      }
      break
    case 'attraction':
    case 'infatuation':
      extraSettings = {
        stagger: 0.6,
        wobble: { x: 15, rotation: 5, duration: 0.4 } // Suave y romántico
      }
      break
    case 'trapped':
      extraSettings = {
        stagger: 0.2,
        wobble: { x: 5, rotation: 0, duration: 0.2 }
      }
      break
    case 'mist':
      extraSettings = {
        stagger: 0.1
      }
      break
  }

  return {
    offset,
    area,
    activeRange,
    ...extraSettings,
    shape
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
      const type = group.getAttribute('data-fx-type') || 'generic'
      const particles = Array.from(group.querySelectorAll('.status-particle')) as HTMLElement[]
      if (particles.length === 0) return

      const isTactical = group.classList.contains('tactical-container')
      const isField = group.classList.contains('field-container')
      
      // Tipado dinámico para evitar errores de TS
      const settings = resolveEffectSettings(type, props.radius, { isField })
      if (battleStore.debugShowPokeRadius) {
        console.log(`[FX Debug] Type: ${type} | Shape: ${settings.shape} | Area:`, settings.area)
      }
      
        initUnifiedSystem(particles, {
        seed: animSeed + type.length,
        ...settings,
        createTweens: (el, index, delay) => {
          const duration = isTactical ? 0.8 : (isField ? 4.0 : 2.0)
          
          // Variación de tamaño orgánica (Más agresiva para efectos de campo como la niebla)
          const randomFactor = isField ? (0.7 + Math.random() * 0.6) : (0.8 + ((index % 4) / 10))
          const targetScale = baseScale.value * (isField ? 0.35 : 0.25) * randomFactor
          
          const finalDelay = delay + (settings.stagger ? (index * settings.stagger) : 0)
          
          const birthDuration = duration * 0.4
          const deathDuration = duration * 0.6

          // 1. TWEEN DE NACIMIENTO (Trayectoria + Fade)
          const birth = gsap.fromTo(el,
            { opacity: 0, scale: targetScale, y: '5%', xPercent: -50, yPercent: -50 },
            {
              opacity: 1,
              y: '-15%',
              duration: birthDuration,
              repeat: -1,
              repeatDelay: deathDuration,
              delay: finalDelay,
              ease: 'power1.out'
            }
          )

          // 2. TWEEN DE MUERTE (Fade Out)
          const death = gsap.fromTo(el,
            { opacity: 1, y: '-15%' },
            {
              opacity: 0,
              y: isTactical ? '-15%' : '-30%',
              duration: deathDuration,
              repeat: -1,
              repeatDelay: birthDuration,
              delay: finalDelay + birthDuration,
              ease: 'power2.in'
            }
          )

          const results: gsap.core.Animation[] = [birth, death]

          // 3. TWEEN DE WOBBLE (Independiente y Rápido)
          if (settings.wobble) {
            const w = settings.wobble
            results.push(gsap.fromTo(el,
              { xPercent: -50 - w.x, rotation: -w.rotation },
              {
                xPercent: -50 + w.x,
                rotation: w.rotation,
                duration: w.duration,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut'
              }
            ))
          }

          return results
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
  
  const shinyRadius = props.radius * 1.25

  initShinySystem(sparkles, {
    seed: animSeed,
    shape: 'circle',
    area: { x: [0, shinyRadius] }, // Órbita circular proporcional al tamaño del bicho
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
      const isFreeze = statusType === 'freeze'
      const statusMultiplier = statusType === 'burn' ? 0.6 : (isFreeze ? 0.8 : 0.3)
      const targetScale = baseScale.value * statusMultiplier * randomFactor
      
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
          filter: statusType === 'freeze' ? 'Drop-Shadow(0 0 6px cyan) Brightness(1.5)' : undefined,
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





// --- VIGILANCIA AUTOMATIZADA DE ESTADOS ---
/**
 * En lugar de vigilar cada prop a mano, vigilamos los computados que ya filtran los estados activos.
 * Si se añade un nuevo estado a las listas de arriba, este watch lo detectará automáticamente.
 */
watch([
  () => props.status,
  () => props.radius,
  () => props.isShiny,
  () => props.isGuardian,
  () => props.pokeId,
  isSimplified,
  secondaryEffects, // Vigilancia automática de estados secundarios
  tacticalEffects,  // Vigilancia automática de estados tácticos
  fieldEffects      // Vigilancia automática de efectos de campo
], () => {
  nextTick(() => {
    killAllTimelines()
    initParticleAnim()
    initUnifiedSystems()
    refreshPersistentFX()
    initScreenAuraFX()
    initShinyFX()
  })
}, { deep: true, immediate: true })

// --- SISTEMA DE DEBUG VISUAL AUTOMATIZADO ---
const allActiveFXDebug = computed(() => {
  if (!battleStore.debugShowFxRadius) return []
  
  const effects: Array<{ type: string; isField: boolean }> = []
  
  // 1. Recolectar todos los estados activos de forma automática
  if (props.status) effects.push({ type: props.status, isField: false })
  secondaryEffects.value.forEach(fx => effects.push({ type: fx.type, isField: false }))
  tacticalEffects.value.forEach(fx => effects.push({ type: fx.type, isField: false }))
  fieldEffects.value.forEach(fx => effects.push({ type: fx.type, isField: true }))
  
  // 2. Mapear cada efecto a su representación visual de debug
  return effects.map(fx => {
    const settings = resolveEffectSettings(fx.type, props.radius, { isField: fx.isField })
    const shape = settings.shape
    const offset = settings.offset || { x: 0, y: 0 }
    const area = settings.area as { x: [number, number]; y?: [number, number] }
    
    let style: Record<string, string> = {
      position: 'absolute',
      border: '1px solid ' + (shape === 'circle' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 165, 0, 0.8)'),
      pointerEvents: 'none',
      zIndex: '99',
      borderRadius: shape === 'circle' ? '50%' : '2px'
    }
    
    if (shape === 'circle') {
      const radius = area.x[1]
      style.width = `${radius * 2}%`
      style.height = `${radius * 2}%`
      style.top = `${50 + offset.y}%`
      style.left = `${50 + offset.x}%`
      style.transform = 'translate(-50%, -50%)'
    } else {
      const xRange = area.x
      const yRange = area.y || [-10, 10]
      const width = xRange[1] - xRange[0]
      const height = yRange[1] - yRange[0]
      style.width = `${width}%`
      style.height = `${height}%`
      style.left = `${50 + (xRange[0] + xRange[1]) / 2 + offset.x}%`
      style.top = `${50 + (yRange[0] + yRange[1]) / 2 + offset.y}%`
      style.transform = 'translate(-50%, -50%)'
    }
    
    return {
      id: fx.type,
      style,
      label: `${fx.type.toUpperCase()} (${shape})`
    }
  })
})

const shinyDebug = computed(() => {
  if (!battleStore.debugShowFxRadius || !props.isShiny) return null
  const radius = props.radius * 1.25
  const size = radius * 2
  return {
    style: {
      width: `${size}%`,
      height: `${size}%`,
      top: '50%',
      left: '50%',
      borderRadius: '50%',
      borderColor: '#ffd700',
      borderStyle: 'dashed',
      borderWidth: '2px',
      background: 'rgba(255, 215, 0, 0.25)'
    },
    label: 'SHINY (circle)'
  }
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
        'is-guardian': isGuardian && !status && !isSimplified,
        'is-vibrant': vibrant && !isSimplified,
        'is-freeze': status === 'freeze' && !isSimplified
      }"
    >
      <slot />
    </div>

    <!-- GUIAS DE DEBUG (Solo visibles con VITE_DEBUG_ACTIVE) -->
    <div 
      v-if="battleStore.debugShowPokeRadius" 
      class="debug-guide debug-poke-radius" 
      :style="{ width: (props.radius * 2) + '%', height: (props.radius * 2) + '%', borderRadius: '50%' }"
    >
      <span class="label">POKE (Radius: {{ props.radius.toFixed(0) }}%)</span>
    </div>

    <div 
      v-for="debug in allActiveFXDebug"
      :key="'debug-'+debug.id"
      class="debug-guide debug-fx-radius" 
      :style="debug.style"
    >
      <span class="label">{{ debug.label }}</span>
    </div>

    <div 
      v-if="shinyDebug" 
      class="debug-guide" 
      :style="shinyDebug.style"
    >
      <span
        class="label"
        style="background: gold; color: black; border-color: gold;"
      >{{ shinyDebug.label }}</span>
    </div>

    <!-- BRILLOS SHINY (DISPONIBLES SI NO ESTÁ SIMPLIFICADO O ES FOREGROUND) -->
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
      :class="'fx-type-' + fx.type"
      :data-fx-type="fx.type"
      :style="{ display: !isSimplified ? 'block' : 'none' }"
    >
      <div
        v-if="battleStore.debugShowPokeRadius"
        class="fx-debug-label"
      >
        {{ fx.emoji }} {{ fx.type.toUpperCase() }} ({{ resolveEffectSettings(fx.type, props.radius).shape }})
      </div>
      <span
        v-for="i in (fx.type === 'confusion' || fx.type === 'confused' ? 2 : 4)"
        :key="i"
        class="status-particle secondary-status"
      >
        <span :class="{ 'wobble-content': fx.type === 'confusion' || fx.type === 'confused' }">
          {{ fx.emoji }}
        </span>
      </span>
    </div>

    <!-- 3. Capas de Partículas Tácticas (Protección, Aguante, etc) -->
    <div
      v-for="fx in tacticalEffects"
      :key="'tact-'+fx.type"
      class="pv-fx-status-overlay tactical-container"
      :class="'fx-type-' + fx.type"
      :data-fx-type="fx.type"
      :style="{ display: !isSimplified ? 'block' : 'none' }"
    >
      <span
        v-for="i in resolveEffectSettings(fx.type, props.radius).activeRange[1]"
        :key="i"
        class="status-particle tactical-status"
      >{{ fx.emoji }}</span>
    </div>

    <!-- 4. Capas de Partículas de Campo (Reflejo, Neblina, etc) -->
    <div
      v-for="fx in fieldEffects"
      :key="'field-'+fx.type"
      class="pv-fx-status-overlay field-container"
      :class="'fx-type-' + fx.type"
      :data-fx-type="fx.type"
      :style="{ display: !isSimplified ? 'block' : 'none' }"
    >
      <span
        v-for="i in resolveEffectSettings(fx.type, props.radius, { isField: true }).activeRange[1]"
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
    background: Rgba(0, 255, 255, 0.35);
    border: 3px solid #00ffff;
    .label { border: 1px solid #00ffff; background: Rgba(0, 50, 50, 0.9); }
  }

  &.debug-fx-radius {
    border-color: #ff9900;
    background: Rgba(255, 153, 0, 0.35);
    border: 3px solid #ff9900;
    .label { border: 1px solid #ff9900; background: Rgba(50, 30, 0, 0.9); }
  }
}

</style>
