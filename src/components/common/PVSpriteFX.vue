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
  spriteScale: { type: Number, default: 1 },

  // Estado de animación (para inmovilización)
  animState: { type: String, default: null }
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
    freeze: '❄️'
  }
  return (props.status ? (map as Record<string, string>)[props.status] : null) || null
})

const activeStatusEffects = computed(() => {
  if (!props.status || isSimplified.value) return []
  return [{ type: props.status, emoji: statusEmoji.value }]
})

// GSAP Logic for particles and persistent effects
const spriteLayerRef = ref<HTMLElement | null>(null)
const shinyRef = ref<HTMLElement | null>(null)

const baseScale = computed(() => props.spriteScale)


const statusAreaRadius = computed(() => props.radius)
const { initSystem: initShinySystem, killAll: killShinyFX } = useParticleEngine()
const { initSystem: initStatusSystem, killAll: killStatusFX } = useParticleEngine()

const engines = new Map<string, ReturnType<typeof useParticleEngine>>()
const activeUnifiedTypes = new Map<string, number>()

const allUnifiedTypes = [
  'confused', 'cursed', 'attracted', 'seeded', 'trapped', 'ingrained',
  'protected', 'enduring', 'focus', 'lockon',
  'reflect', 'lightscreen', 'safeguard', 'mist', 'spikes'
]

allUnifiedTypes.forEach(type => {
  engines.set(type, useParticleEngine())
})

const getEngine = (type: string) => engines.get(type)!

const activeTweens: gsap.core.Tween[] = []
const persistentTimelines: Record<string, gsap.core.Timeline> = {}

const killAllTimelines = () => {
  Object.values(persistentTimelines).forEach(tl => tl.kill())
  activeTweens.forEach(t => t.kill())
  activeTweens.length = 0
  killShinyFX()
  killStatusFX()
  engines.forEach(engine => engine.killAll())
}

const refreshPersistentFX = (retryCount = 0) => {
  if (!spriteLayerRef.value) return
  
  // El slot puede tardar un ciclo en estar listo
  const target = spriteLayerRef.value.querySelector('img')
  
  if (!target && retryCount < 3) {
    setTimeout(() => refreshPersistentFX(retryCount + 1), 100)
    return
  }

  // 0. Limpiar solo los tweens internos gestionados por este componente
  // NUNCA usar killTweensOf(target) ni clearProps masivo, 
  // ya que eso mata las animaciones idle del Pokémon (respiración/flotación).
  activeTweens.forEach(t => t.kill())
  activeTweens.length = 0
  
  if (!target) return

  // 0. Reset suave: limpiamos solo lo que ensuciamos, respetando las clases CSS del padre
  gsap.set(target, { filter: '', x: 0, y: 0, rotation: 0 })
  gsap.set(spriteLayerRef.value, { filter: '' })

  const isImmobilized = props.status === 'freeze' || props.isTrapped || props.animState === 'catching'

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

  // 2. Confused Wobble (Fast jitter) - Solo si NO está inmovilizado
  if (props.isConfused && !isImmobilized) {
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

  // 7. Paralyze (Yellow Jitter / Electro-shake) - Solo si NO está inmovilizado
  const isParaStatus = props.status === 'paralysis' || props.status === 'paralyze' || props.status === '⚡'
  if (isParaStatus && !isImmobilized) {
    // Sacudimos tanto el target como el contenedor para máxima visibilidad
    activeTweens.push(gsap.fromTo(target,
      { 
        filter: 'Drop-Shadow(0 0 2px #ffd700) Brightness(1.2)',
        x: -3 
      },
      {
        filter: 'Drop-Shadow(0 0 10px #ffd700) Brightness(1.5) contrast(1.3)',
        x: 3,
        duration: 0.04,
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

  // 10. Aura Guardian (Identidad permanente, coexiste con estados - VFX Integrity Rule)
  if (props.isGuardian && !props.status) {
    const isVibrant = props.vibrant
    const baseFilter = isVibrant 
      ? 'Drop-Shadow(0 0 15px white) Drop-Shadow(0 0 8px Rgba(255, 255, 255, 0.8))'
      : 'Drop-Shadow(0 0 8px Rgba(255, 255, 255, 0.8))'
    const pulseFilter = isVibrant
      ? 'Drop-Shadow(0 0 40px white) Drop-Shadow(0 0 15px Rgba(255, 255, 255, 0.9))'
      : 'Drop-Shadow(0 0 12px Rgba(255, 255, 255, 0.8))'

    activeTweens.push(gsap.fromTo(spriteLayerRef.value,
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
  shape: 'circle' | 'rect'
  area: ParticleArea
  offset: { x: number; y: number }
  activeRange: [number, number]
  mult: number
  useFade: boolean
  wobble: any
  stagger: number
  duration?: number
  targetOpacity?: number
  randomizeVars?: boolean | { min: number, max: number }
  growDuration?: number
}

/**
 * Centraliza las reglas visuales para todos los efectos de partículas.
 * Esto evita repetir la lógica de offset y área en múltiples motores.
 */
const resolveEffectSettings = (typeKey: string, ar: number, options: { isField?: boolean } = {}): EffectSettings => {
  const isField = options.isField || ['reflect', 'lightscreen', 'safeguard', 'mist', 'spikes'].includes(typeKey)
  const isFeetEffect = ['seed', 'trapped', 'bound', 'ingrain'].includes(typeKey)
  const isHeadEffect = ['sleep', 'confusion', 'attract', 'confused'].includes(typeKey)

  // 1. Helper para rango dinámico basado en radio
  const getDynamicRange = (base: [number, number]) => {
    const ratio = ar / 40
    const scaleFactor = Math.max(0.15, Math.min(1.5, Math.pow(ratio, 2)))
    return [
      Math.max(1, Math.round(base[0] * scaleFactor)),
      Math.max(1, Math.round(base[1] * scaleFactor))
    ] as [number, number]
  }

  // 2. CONFIGURACIÓN CENTRALIZADA E INDEPENDIENTE
  const configs: Record<string, Partial<EffectSettings>> = {
    burn: { mult: 1.0, activeRange: getDynamicRange([12, 18]), useFade: false, duration: 1.2, randomizeVars: { min: 0.6, max: 2.0 } },
    freeze: { mult: 0.4, activeRange: getDynamicRange([4, 6]), useFade: false, duration: 3.0 , randomizeVars: { min: 1.0, max: 2.0 } },
    sleep: { mult: 1.0, activeRange: getDynamicRange([1, 2]), useFade: true, duration: 3.0, randomizeVars: { min: 1.0, max: 2.0 } },
    paralysis: { mult: 1.0, activeRange: getDynamicRange([6, 10]), useFade: true, duration: 0.3, randomizeVars: { min: 1.0, max: 2.0 } },
    poison: { mult: 0.8, activeRange: getDynamicRange([4, 6]), useFade: true, duration: 3.0, randomizeVars: { min: 1.0, max: 2.0 } },
    toxic: { mult: 0.8, activeRange: getDynamicRange([4, 6]), useFade: true, duration: 3.0 },
    confusion: { mult: 0.8, activeRange: getDynamicRange([1, 2]), useFade: true, wobble: true, duration: 6.0 },
    confused: { mult: 0.8, activeRange: getDynamicRange([1, 2]), useFade: true, wobble: true, duration: 6.0 },
    attracted: { mult: 0.8, activeRange: getDynamicRange([4, 6]), useFade: true, duration: 4.0, randomizeVars: { min: 1.0, max: 2.0 } },
    cursed: { mult: 0.8, activeRange: getDynamicRange([2, 3]), useFade: true, duration: 3.0 },
    seeded: { mult: 0.8, activeRange: getDynamicRange([6, 10]), useFade: true, duration: 5.0, randomizeVars: true },
    seed: { mult: 0.8, activeRange: getDynamicRange([6, 10]), useFade: true, duration: 5.0, randomizeVars: true },
    trapped: { mult: 1.4, activeRange: getDynamicRange([6, 10]), useFade: true, duration: 5.0, growDuration: 0.5, randomizeVars: true },
    ingrained: { mult: 0.8, activeRange: getDynamicRange([6, 10]), useFade: true, duration: 1.5, randomizeVars: true },
    
    // Tactical
    protected: { mult: 1.0, activeRange: getDynamicRange([4, 6]), useFade: true, duration: 1.5 },
    enduring: { mult: 1.6, activeRange: getDynamicRange([1, 1]), useFade: false, duration: 1.2, growDuration: 0.3 },
    focus: { mult: 1.0, activeRange: getDynamicRange([1, 1]), useFade: false, duration: 0.8, growDuration: 0.2 },
    lockon: { mult: 1.0, activeRange: getDynamicRange([1, 1]), useFade: false, duration: 1.0, growDuration: 0.25 },

    // Field
    reflect: { mult: 1.5, activeRange: getDynamicRange([1, 1]), useFade: true, duration: 4.0, targetOpacity: 1.0 },
    safeguard: { mult: 0.5, activeRange: getDynamicRange([1, 3]), useFade: true, duration: 3.0 , targetOpacity: 1.0 },
    lightscreen: { mult: 1.5, activeRange: getDynamicRange([1, 1]), useFade: true, duration: 3.0, targetOpacity: 1.0 },
    mist: { mult: 1.5, activeRange: getDynamicRange([14, 20]), useFade: true, duration: 5.0, randomizeVars: { min: 0.6, max: 2.5 }, targetOpacity: 0.9 },
    spikes: { mult: 0.5, activeRange: getDynamicRange([4, 8]), useFade: true, duration: 2.5 }
  }

  const base = configs[typeKey] || { 
    mult: 0.5, 
    activeRange: getDynamicRange([2, 4]), 
    useFade: true, 
    duration: isField ? 3.0 : 1.5 
  }
  
  // 3. Parámetros de Wobble exactos (Martes 12)
  let wobbleConfig: any = false
  if (typeKey === 'confusion' || typeKey === 'confused') {
    wobbleConfig = { x: 30, rotation: 10, duration: 0.12 }
  } else if (typeKey === 'attract' || typeKey === 'attraction') {
    wobbleConfig = { x: 15, rotation: 5, duration: 0.4 }
  } else if (typeKey === 'trapped') {
    wobbleConfig = { x: 5, rotation: 0, duration: 0.2 }
  }
  
  // 4. Área de dispersión (Órbita perimétrica para no tapar el centro)
  const isClose = ['burn', 'poison', 'toxic', 'mist'].includes(typeKey)
  const factor = (typeKey === 'paralysis') ? 1.3 : (isHeadEffect ? 0.4 : (isClose ? 0.7 : 1.0))
  const maxRadius = isField ? (typeKey === 'mist' ? 25 : 45) : ar * factor
  
  const area: ParticleArea = (isFeetEffect) 
    ? { x: [-40, 40], y: [0, 15] }
    : { x: [maxRadius * 0.2, maxRadius] }

  // 4. Offset dinámico exacto (Martes 12)
  let offset: { x: number; y: number } = { x: 0, y: 0 }
  if (isHeadEffect) offset = { x: 0, y: -ar * 0.75 }
  else if (isFeetEffect) offset = { x: 0, y: ar * 0.35 }

  const isPrimary = ['burn', 'freeze', 'sleep', 'paralysis', 'poison', 'toxic'].includes(typeKey)
  const isTactical = ['protected', 'enduring', 'focus', 'lockon'].includes(typeKey)
  
  const targetOpacity = base.targetOpacity ?? (isField ? 0.6 : (isTactical ? 1.0 : 1.0))
  const duration = base.duration || (isField ? 2.0 : (isTactical ? 1.2 : 0.8))

  return {
    shape: isFeetEffect ? 'rect' : 'circle',
    area,
    offset,
    activeRange: base.activeRange || [2, 4],
    mult: base.mult || 0.5,
    useFade: base.useFade ?? true,
    wobble: wobbleConfig,
    stagger: base.stagger || 0,
    duration,
    targetOpacity,
    randomizeVars: base.randomizeVars ?? isPrimary,
    growDuration: base.growDuration
  }
}


/**
 * Animaciones persistentes para elementos de pantalla (Reflejo / Pantalla Luz)
 */
const initScreenAuraFX = () => {
  const container = spriteLayerRef.value?.closest('.pv-fx-wrapper')
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
  
  const shinyRadius = props.radius * 1.1

  initShinySystem(sparkles, {
    seed: animSeed,
    shape: 'circle',
    area: { x: [0, shinyRadius] },
    onRepeat: (el) => {
      gsap.set(el, { filter: `Drop-Shadow(0 0 2px black) Drop-Shadow(0 0 4px gold)` })
    },
    createTweens: (el, _i, delay) => {
      const maxScale = baseScale.value * gsap.utils.random(0.3, 0.6) * 0.4
      const duration = gsap.utils.random(1.0, 1.5)

      return [
        gsap.fromTo(el, 
          { autoAlpha: 1, opacity: 1, y: 0, scale: 0, rotation: 0, xPercent: -50, yPercent: -50 },
          {
            scale: maxScale,
            rotation: 180,
            duration: duration,
            repeat: -1,
            repeatDelay: 1.3,
            delay,
            ease: 'power1.out'
          }
        ),
        gsap.to(el, {
          scale: 0,
          rotation: 360,
          duration: duration + 0.1,
          repeat: -1,
          repeatDelay: 1.2,
          delay: delay + duration,
        })
      ]
    }
  })
}

const applyGenericParticleSystem = (els: HTMLElement[], typeKey: string, engineInit: Function, options: { isField?: boolean, seed?: number, radius: number }) => {
  if (!els || els.length === 0) return
  
  const settings = resolveEffectSettings(typeKey, options.radius, { isField: options.isField })
  
  engineInit(els, {
    seed: options.seed,
    ...settings,
    disableRandomizeOnRepeat: false,
    createTweens: (el: HTMLElement, index: number, delay: number) => {
      const finalDelay = delay + (settings.stagger ? (index * settings.stagger) : 0)
      const tl = gsap.timeline({ repeat: -1, delay: finalDelay, repeatRefresh: true })
      
      const totalDur = settings.duration || 0.8
      const baseGrowDur = settings.growDuration || (totalDur / 2)
      const baseShrinkDur = totalDur - baseGrowDur

      const growDur = settings.randomizeVars ? () => gsap.utils.random(baseGrowDur * 0.8, baseGrowDur * 1.2) : baseGrowDur
      const shrinkDur = settings.randomizeVars ? () => gsap.utils.random(baseShrinkDur * 0.8, baseShrinkDur * 1.2) : baseShrinkDur
      
      const maxScale = baseScale.value * settings.mult

      // Initial state
      gsap.set(el, { 
        opacity: settings.useFade ? 0 : settings.targetOpacity, 
        y: '10%', 
        scale: 0.05, 
        xPercent: -50, 
        yPercent: -50, 
        x: 0,
        imageRendering: 'auto',
        webkitFontSmoothing: 'none',
        filter: typeKey === 'freeze' ? 'Drop-Shadow(0 0 8px cyan) Brightness(2)' : 'none'
      })

      const growScale = settings.randomizeVars 
        ? () => {
            const range = typeof settings.randomizeVars === 'object' ? settings.randomizeVars : { min: 0.6, max: 1.3 }
            return (maxScale * gsap.utils.random(range.min, range.max))
          } 
        : maxScale
      const growEase = settings.growDuration ? 'power4.out' : (typeKey === 'paralysis' ? 'none' : 'sine.inOut')
      const shrinkEase = settings.growDuration ? 'power1.inOut' : (typeKey === 'paralysis' ? 'none' : 'sine.inOut')

      const growDurVal = typeof growDur === 'function' ? (growDur as any)() : growDur
      const shrinkDurVal = typeof shrinkDur === 'function' ? (shrinkDur as any)() : shrinkDur

      // Explicit reset at the start of each loop
      tl.set(el, { 
        scale: 0.05, 
        opacity: settings.useFade ? 0 : settings.targetOpacity,
        xPercent: -50,
        yPercent: -50,
        y: '10%'
      })

      tl.to(el, {
        opacity: settings.targetOpacity,
        scale: growScale,
        duration: growDurVal,
        ease: growEase
      })
      
      tl.to(el, {
        scale: 0.05,
        opacity: settings.useFade ? 0 : settings.targetOpacity,
        duration: shrinkDurVal,
        ease: shrinkEase
      })

      if (settings.wobble && typeof settings.wobble === 'object') {
        const w = settings.wobble as { x: number, rotation: number, duration: number }
        gsap.fromTo(el,
          { xPercent: -50 - w.x, rotation: -w.rotation },
          { xPercent: -50 + w.x, rotation: w.rotation, duration: w.duration, repeat: -1, yoyo: true, ease: 'sine.inOut' }
        )
      }
      
      return [tl]
    }
  })
}

const initParticleAnim = () => {
  if (isSimplified.value || !spriteLayerRef.value) return
  const container = spriteLayerRef.value.closest('.pv-fx-wrapper')
  if (!container) return
  
  const statusType = props.status || ''
  if (statusEmoji.value && !['confusion', 'confused'].includes(statusType)) {
    const els = Array.from(container.querySelectorAll('.status-particle:not(.secondary-status):not(.tactical-status):not(.field-status)')) as HTMLElement[]
    applyGenericParticleSystem(els, statusType, initStatusSystem, { radius: statusAreaRadius.value, seed: animSeed })
  }
}

const syncUnifiedSystems = (forceReset = false) => {
  if (forceReset) {
    activeUnifiedTypes.forEach((_, type) => getEngine(type).killAll())
    activeUnifiedTypes.clear()
  }

  if (isSimplified.value || !spriteLayerRef.value) {
    activeUnifiedTypes.forEach((_, type) => getEngine(type).killAll())
    activeUnifiedTypes.clear()
    return
  }

  const container = spriteLayerRef.value.closest('.pv-fx-wrapper')
  if (!container) return

  const allActiveFX = [
    ...secondaryEffects.value.map(fx => ({ ...fx, category: 'secondary-container', isField: false })),
    ...tacticalEffects.value.map(fx => ({ ...fx, category: 'tactical-container', isField: false })),
    ...fieldEffects.value.map(fx => ({ ...fx, category: 'field-container', isField: true }))
  ]

  const currentTypes = allActiveFX.map(fx => fx.type)

  // 1. Matar solo los efectos que ya no están activos
  for (const type of activeUnifiedTypes.keys()) {
    if (!currentTypes.includes(type)) {
      getEngine(type).killAll()
      activeUnifiedTypes.delete(type)
    }
  }

  // 2. Inicializar efectos nuevos o con cambio de cantidad
  allActiveFX.forEach(fx => {
    const els = Array.from(container.querySelectorAll(`.pv-fx-status-overlay.${fx.category}.fx-type-${fx.type} .status-particle`)) as HTMLElement[]
    const currentCount = activeUnifiedTypes.get(fx.type)

    if (currentCount === undefined || currentCount !== els.length) {
      activeUnifiedTypes.set(fx.type, els.length)
      applyGenericParticleSystem(els, fx.type, getEngine(fx.type).initSystem, { radius: props.radius, seed: animSeed, isField: fx.isField })
    }
  })
}

// --- VIGILANCIA AUTOMATIZADA DE ESTADOS ---

/**
 * Reinicio total de sistemas visuales
 */
const initAllFX = () => {
  killAllTimelines()
  initParticleAnim()
  syncUnifiedSystems(true)
  refreshPersistentFX()
  initScreenAuraFX()
  initShinyFX()
}

// Vigilancia de estados críticos (Requieren reinicio inmediato y total)
watch([
  () => props.status,
  () => props.isShiny,
  () => props.isGuardian,
  () => props.pokeId,
  isSimplified
], () => {
  nextTick(() => {
    initAllFX()
  })
}, { deep: true, immediate: true })

// Vigilancia inteligente de arrays secundarios (No reinician todo el componente)
watch([
  secondaryEffects,
  tacticalEffects,
  fieldEffects
], () => {
  nextTick(() => {
    syncUnifiedSystems(false)
    refreshPersistentFX()
  })
}, { deep: true })

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
  if (!battleStore.debugShowPokeRadius || !props.isShiny) return null
  const size = props.radius * 2
  return {
    style: {
      width: `${size}%`,
      height: `${size}%`,
      borderColor: 'gold',
      color: 'gold'
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
    <div 
      ref="spriteLayerRef"
      class="pv-fx-sprite-layer"
      :class="{ 
        'is-guardian': isGuardian && !status && !isSimplified,
        'is-vibrant': vibrant && !isSimplified,
        'is-freeze': status === 'freeze' && !isSimplified
      }"
    >
      <slot>
        <!-- Fallback por si no pasan slot (Oculto por defecto para evitar broken images) -->
        <img v-if="metadata.spriteUrl" :src="metadata.spriteUrl" class="pokemon-sprite-internal" />
      </slot>
    </div>

    <!-- BRILLOS SHINY (SE MUESTRAN SI ESTÁ HABILITADO, IGNORANDO MODO SIMPLIFICADO) -->
    <div
      v-if="isShiny && props.enabled"
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

    <!-- 1. Capas de Partículas de Estado (Quemado, Veneno, etc) -->
    <div
      v-for="fx in activeStatusEffects"
      :key="'status-'+fx.type"
      class="pv-fx-status-overlay"
      :class="'fx-type-' + fx.type"
      :data-fx-type="fx.type"
    >
      <div
        v-if="battleStore.debugShowFxRadius"
        class="fx-debug-label"
      >
        {{ fx.emoji }} {{ fx.type.toUpperCase() }} ({{ resolveEffectSettings(fx.type, props.radius).shape }})
      </div>
      <span
        v-for="n in 24"
        :key="n"
        class="status-particle"
      >{{ fx.emoji }}</span>
    </div>

    <!-- 2. Capas de Partículas Secundarias (Confusión, Atracción, etc) -->
    <div
      v-for="fx in secondaryEffects"
      :key="'sec-'+fx.type"
      class="pv-fx-status-overlay secondary-container"
      :class="'fx-type-' + fx.type"
      :data-fx-type="fx.type"
    >
      <div
        v-if="battleStore.debugShowFxRadius"
        class="fx-debug-label"
      >
        {{ fx.emoji }} {{ fx.type.toUpperCase() }} ({{ resolveEffectSettings(fx.type, props.radius).shape }})
      </div>
      <span
        v-for="i in resolveEffectSettings(fx.type, props.radius).activeRange[1]"
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
        v-for="i in 8"
        :key="i"
        class="status-particle field-status"
      >{{ fx.emoji }}</span>
    </div>

    <!-- GUÍAS DE DEBUG (INDependientes y precisas) -->
    <template v-if="battleStore.debugShowPokeRadius">
      <div 
        class="debug-guide debug-poke-radius"
        :style="{ width: (props.radius * 2) + '%', height: (props.radius * 2) + '%' }"
      >
        <span class="label">POKE (Radius: {{ props.radius.toFixed(1) }}%)</span>
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
    </template>

    <!-- 6. Sistema de Debug Visual (Para todos los estados activos) -->
    <template v-if="battleStore.debugShowFxRadius">
      <div 
        v-for="fx in allActiveFXDebug"
        :key="fx.id"
        class="debug-guide debug-fx-radius"
        :style="fx.style"
      >
        <span class="label">{{ fx.label }}</span>
      </div>
    </template>

    <slot name="overlay" />
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

// Los estilos base vienen del core/fx.scss
// Aquí solo añadimos ajustes específicos de layout si fuera necesario
.pv-sprite-internal {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  pointer-events: none;
}

.pv-fx-wrapper {
  width: fit-content;
  height: fit-content;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  @include pixelated;
}

.pv-fx-sprite-layer {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: calc(var(--z-map-spawns, 10) + 2);
  will-change: transform, filter, opacity;
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

.pv-fx-shiny-overlay {
  .sparkle {
    animation: none !important;
  }
}

.sparkle,
.status-particle {
  position: absolute;
  font-size: 32px !important;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  font-family: "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif;
  -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: unset;
  font-smooth: never;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: Scale(0);
  /* Fix para el bug del color negro: Forzar capa 3D */
  transform-style: preserve-3d;
  backface-visibility: hidden;
  perspective: 1000px;
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
  user-select: none;
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
