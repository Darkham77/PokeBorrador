// [PureVue-Ignore-Length]
<script setup lang="ts">


import { ref, computed, watch, watchEffect } from 'vue'
import { gsap } from 'gsap'

import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import VirtualEntity from './VirtualEntity.vue'
import CombatShadow from './CombatShadow.vue'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { useCombatShadowStore } from '@/stores/combatShadows'
import { gameBus } from '@/logic/gameBus'
import { WORLD_CONSTANTS } from '@/logic/combat/spatialCoordinator'

import type { Pokemon } from '@/types/pokemon'
import type { BattleStages } from '@/types/battle'

interface SparkleData {
  id: string | number
  tx: number
  ty: number
  tf: number
  scale: number
  delay: string
}

interface Props {
  side: 'player' | 'enemy'
  pokemon?: Pokemon | null
  position: { x: number; y: number }
  targetPosition?: { x: number; y: number } | null
  baseSize: number
  groundY?: string
  shadowKey?: string | null
  animState?: 'catching' | 'trapped' | 'releasing' | null
  ballId?: string
  isShaking?: boolean
  isBlinking?: boolean
  isSilhouette?: boolean
  isAttacking?: boolean
  activeMove?: { side: string; cat: 'physical' | 'special' | 'status'; name: string } | null
  showGuides?: boolean
  isCaptureSuccess?: boolean
  sparkles?: SparkleData[]
  isFainting?: boolean
  isEmerging?: boolean
  suppressFX?: boolean
  hidden?: boolean
  hasSeat?: boolean
  stages?: Partial<BattleStages>
}

const props = withDefaults(defineProps<Props>(), {
  pokemon: null,
  groundY: '90%',
  shadowKey: null,
  animState: null,
  ballId: 'pokeball',
  isShaking: false,
  isBlinking: false,
  isSilhouette: false,
  isAttacking: false,
  activeMove: null,
  showGuides: false,
  isCaptureSuccess: false,
  sparkles: () => [],
  isFainting: false,
  isEmerging: false,
  suppressFX: false,
  hidden: false,
  stages: () => ({}),
  targetPosition: null
})

const emit = defineEmits<{
  (e: 'load', size: { w: number; h: number }): void
  (e: 'animationEnd', type: 'attack' | 'faint' | 'damage'): void
}>()

const naturalSize = ref({ w: 0, h: 0 })
const idleWrapperRef = ref<HTMLElement | null>(null)
let idleTween: gsap.core.Tween | null = null


const isPlayer = computed(() => props.side === 'player')
const isEnemy = computed(() => props.side === 'enemy')

const imageUrl = computed(() => {
  if (!props.pokemon) return ''
  return getAssetUrl(ASSET_TYPES.POKEMON, props.pokemon.id, { 
    isShiny: !!props.pokemon.isShiny, 
    isBack: isPlayer.value 
  })
})

const isFloating = computed(() => {
  if (!props.pokemon) return false
  if (props.pokemon.isFloating !== undefined) return props.pokemon.isFloating
  const data = pokemonDataProvider.getPokemonData(props.pokemon.id)
  if (data?.isFloating) return true
  const types: string[] = []
  if (props.pokemon.type) types.push(props.pokemon.type.toLowerCase())
  if (props.pokemon.type2) types.push(props.pokemon.type2.toLowerCase())
  return types.includes('flying')
})

const initIdleAnim = () => {
  if (!idleWrapperRef.value || !props.pokemon) return
  if (idleTween) {
    idleTween.kill()
    idleTween = null
  }

  const status = props.pokemon.status?.toLowerCase() || ''
  const isFrozen = status === 'freeze' || status === '🧊'
  const isPara = status.includes('paraly') || status.includes('para') || status === '⚡'
  const isConfused = (props.pokemon.confused || 0) > 0
  const isTrapped = (props.animState as string) === 'trapped'
  const isCatching = props.animState === 'catching'
  
  console.log(`[IdleAnim] ${props.pokemon.name}: status=${status}, isPara=${isPara}, isFrozen=${isFrozen}`)

  if (isFrozen || isPara || isConfused || isTrapped || isCatching) {
    gsap.killTweensOf(idleWrapperRef.value)
    gsap.set(idleWrapperRef.value, { y: 0, rotation: 0, scaleX: 1, scaleY: 1 })
    return
  }

  if (isFloating.value) {
    // Floating Animation with Random Values per cycle using repeatRefresh
    idleTween = gsap.to(idleWrapperRef.value, {
      y: () => `-${10 + Math.random() * 6}%`,
      rotation: () => (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random() * 4),
      duration: () => 2 + Math.random() * 1,
      repeat: -1,
      yoyo: true,
      repeatRefresh: true,
      ease: 'sine.inOut'
    })
  } else {
    // Subtle Ground Animation
    idleTween = gsap.to(idleWrapperRef.value, {
      scaleX: () => 1.01 + Math.random() * 0.02,
      scaleY: () => 0.97 + Math.random() * 0.02,
      rotation: () => (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 1),
      duration: () => 1.5 + Math.random() * 0.5,
      repeat: -1,
      yoyo: true,
      repeatRefresh: true,
      ease: 'sine.inOut'
    })
  }
}

watchEffect(() => {
  // Rastreamos dependencias explícitamente para el watchEffect
  void props.pokemon?.status
  void props.pokemon?.confused
  void props.animState
  void isFloating.value
  
  if (idleWrapperRef.value) {
    initIdleAnim()
  }
})

watch(idleWrapperRef, (el) => {
  if (el) initIdleAnim()
})

const handleLoad = (e: Event) => {
  const target = e.target as HTMLImageElement
  naturalSize.value = { w: target.naturalWidth, h: target.naturalHeight }
  emit('load', naturalSize.value)
}

const getAttackAnimClass = computed(() => {
  if (!props.isAttacking || !props.activeMove) return ''
  const move = props.activeMove
  if (move.side !== props.side) return ''
  if (move.cat === 'physical') return 'atk-physical'
  if (move.cat === 'special') return 'atk-special'
  if (move.cat === 'status') return 'atk-status'
  return 'atk-default'
})

const virtualStyle = { width: '100%', height: '100%' }

const pokeballShadowUrl = computed(() => {
  if (typeof document === 'undefined') return ''
  const w = 10, h = 7
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.fillStyle = 'Rgba(0, 0, 0, 0.45)'
  ctx.beginPath()
  ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
  ctx.fill()
  return `url(${canvas.toDataURL('image/png')})`
})

const shadowStore = useCombatShadowStore()
const currentShadow = computed(() => props.shadowKey ? shadowStore.activeShadows.get(props.shadowKey) : null)

const localGroundY = computed(() => {
  const shadow = currentShadow.value
  if (shadow && shadow.feetY !== undefined) {
    return `${shadow.feetY * 100}%`
  }
  return props.groundY
})

const fxScale = computed(() => props.baseSize / 100)

const fxRadius = computed(() => {
  const shadow = currentShadow.value
  if (shadow && shadow.feetY !== undefined) {
    // Distancia del centro (0.5) a los pies (feetY) convertido a %
    const dist = Math.abs(shadow.feetY - 0.5)
    return Math.max(15, Math.min(80, dist * 100))
  }
  return 40
})

const stickyCoords = computed(() => {
  const shadow = currentShadow.value
  let left = '50%'
  let top = localGroundY.value
  
  if (shadow) {
    const scale = (WORLD_CONSTANTS as { OBJECT_SCALE: number }).OBJECT_SCALE || 2
    const entitySize = props.baseSize * scale

    if (shadow.feetX !== undefined) {
      const offsetX = (shadow.feetX - 0.5) * entitySize
      left = `calc(50% + ${offsetX}px)`
    }
  }
  
  return { top, left }
})

const isBallVisible = computed(() => {
  return props.animState === 'trapped' || 
         props.animState === 'catching' || 
         props.animState === 'releasing' || 
         props.isCaptureSuccess
})

const internalBallId = ref('pokeball')
const memorizedBallCoords = ref({ top: '90%', left: '50%' })

watch(isBallVisible, (visible) => {
  if (visible) {
    internalBallId.value = props.ballId || 'pokeball'
    memorizedBallCoords.value = { ...stickyCoords.value }
  }
}, { immediate: true })

const handleImageError = (e: Event) => {
  (e.target as HTMLImageElement).src = getAssetUrl(ASSET_TYPES.ENVIRONMENT, 'tall-grass')
}

const handleBallError = (e: Event) => {
  (e.target as HTMLImageElement).src = getAssetUrl(ASSET_TYPES.ITEM, 'pokeball')
}

// --- ANIMACIONES DE STATS ---
const statArrows = ref<{ id: number; dir: 'up' | 'down'; stat: string }[]>([])
watch(() => props.stages, (newS, oldS) => {
  if (!oldS) return
  
  const stats: (keyof BattleStages)[] = ['atk', 'def', 'spa', 'spd', 'spe', 'acc', 'eva']
  stats.forEach(s => {
    const diff = (newS[s] || 0) - (oldS[s] || 0)
    if (diff !== 0) {
      triggerStatArrow(String(s), diff > 0 ? 'up' : 'down')
      // Emitir sonido directamente desde la vista reactiva
      gameBus.emit('PLAY_SOUND', diff > 0 ? 'statRaise' : 'statLower')
    }
  })
}, { deep: true })

const triggerStatArrow = (stat: string, dir: 'up' | 'down') => {
  const id = Temporal.Now.instant().epochMilliseconds + Math.random()
  statArrows.value.push({ id, dir, stat })
  gsap.delayedCall(1.2, () => {
    statArrows.value = statArrows.value.filter(a => a.id !== id)
  })
}

const spriteRef = ref<HTMLElement | null>(null)
const spriteRotationRef = ref<HTMLElement | null>(null)
const shadowWrapperRef = ref<HTMLElement | null>(null)

watch(() => props.isEmerging, (val) => {
  if (val && spriteRef.value) {
    const tl = gsap.timeline()
    tl.to(spriteRef.value, { y: 8, scaleX: 1.2, scaleY: 0.75, duration: 0.1, ease: "power1.in" })
      .to(spriteRef.value, { y: -60, scaleX: 0.85, scaleY: 1.2, duration: 0.3, ease: "power2.out" })
      .to(spriteRef.value, { y: 0, scaleX: 1.1, scaleY: 0.9, duration: 0.2, ease: "bounce.out" })
      .to(spriteRef.value, { scaleX: 1, scaleY: 1, duration: 0.1 })
  }
})

watch(() => props.isFainting, (val) => {
  if (val && spriteRef.value) {
    const tl = gsap.timeline()
    
    // Desactivamos la transition CSS nativa de .sprite-animator (que era de 0.8s y causaba el fade en vez del parpadeo)
    gsap.set(spriteRef.value, { transition: "none" })
    
    // 1. Ocultar la sombra instantáneamente
    if (shadowWrapperRef.value) {
      gsap.set(shadowWrapperRef.value, { display: "none" })
    }

    // Marca de inicio de caída
    tl.addLabel("fallStart")

    // 2. Caer
    tl.to(spriteRef.value, { 
      y: 60, 
      duration: 1.0, 
      ease: "power2.in" 
    }, "fallStart") 
    
    // 3. Patrón de parpadeos de frecuencia constante
    const blinkPattern = [
      { t: 0.05, op: 0 }, { t: 0.13, op: 1 },
      { t: 0.21, op: 0 }, { t: 0.29, op: 1 },
      { t: 0.37, op: 0 }, { t: 0.45, op: 1 },
      { t: 0.53, op: 0 }, { t: 0.61, op: 1 },
      { t: 0.69, op: 0 }, { t: 0.77, op: 1 },
      { t: 0.85, op: 0 }, { t: 0.93, op: 1 },
      { t: 0.98, op: 0 } // Queda totalmente invisible al terminar la caída
    ]

    blinkPattern.forEach(b => {
      tl.set(spriteRef.value, { opacity: b.op }, `fallStart+=${b.t}`)
    })
  } else if (!val && spriteRef.value) {
    // Al finalizar el estado de debilitamiento, limpiamos todo (incluyendo la anulación de transition)
    gsap.set(spriteRef.value, { clearProps: "opacity,y,transition" })
    if (shadowWrapperRef.value) {
      gsap.set(shadowWrapperRef.value, { clearProps: "display" })
    }
  }
})

watch(() => props.animState, (val) => {
  if (!spriteRef.value) return
  if (val === 'catching') {
    gsap.to(spriteRef.value, {
      scale: 0,
      opacity: 0,
      filter: "Brightness(0) Invert(1) Drop-Shadow(0 0 20px #00ccff)",
      duration: 0.8,
      ease: "power2.inOut"
    })
  } else if (val === 'releasing') {
    gsap.fromTo(spriteRef.value, 
      { scale: 0, opacity: 1, filter: "Brightness(0) Invert(1) Drop-Shadow(0 0 20px #00ccff)" },
      { scale: 1, opacity: 1, filter: "none", duration: 0.8, ease: "back.out(1.7)" }
    )
  }
})

watch(() => props.isAttacking, (val) => {
  if (val && spriteRef.value && props.activeMove) {
    const isPlayerSide = props.side === 'player'
    const cat = props.activeMove.cat
    const tl = gsap.timeline()
    
    // Calcular vector hacia el objetivo (si no hay objetivo, usar dirección lateral por defecto)
    let nx = isPlayerSide ? 1 : -1
    let ny = isPlayerSide ? -0.5 : 0.5
    
    if (props.targetPosition) {
      const scale = (WORLD_CONSTANTS as { OBJECT_SCALE: number }).OBJECT_SCALE || 2
      const mySize = props.baseSize * scale
      // Deducimos el tamaño base del objetivo usando las constantes
      const targetBase = isPlayerSide ? (WORLD_CONSTANTS as { BASE_ENTITY_SIZE_ENEMY: number }).BASE_ENTITY_SIZE_ENEMY : (WORLD_CONSTANTS as { BASE_ENTITY_SIZE_PLAYER: number }).BASE_ENTITY_SIZE_PLAYER
      const targetSize = targetBase * scale
      
      const myCenterX = props.position.x + (mySize / 2)
      const myCenterY = props.position.y + (mySize / 2)
      
      const targetCenterX = props.targetPosition.x + (targetSize / 2)
      const targetCenterY = props.targetPosition.y + (targetSize / 2)

      const dx = targetCenterX - myCenterX
      const dy = targetCenterY - myCenterY
      const length = Math.sqrt(dx * dx + dy * dy)
      if (length > 0) {
        nx = dx / length
        ny = dy / length
      }
    }
    
    if (cat === 'physical' || !cat) {
      const dashDist = 60
      const prepDist = -15
      
      tl.to(spriteRef.value, { x: nx * prepDist, y: ny * prepDist, duration: 0.1 })
        .to(spriteRef.value, { x: nx * dashDist, y: ny * dashDist, scale: 1.1, duration: 0.15, ease: "power2.out" })
        .to(spriteRef.value, { x: 0, y: 0, scale: 1, duration: 0.15, ease: "power1.inOut" })
    } else if (cat === 'special') {
      const pulseDist = 15
      tl.fromTo(spriteRef.value, 
        { filter: "Brightness(1)", x: 0, y: 0, scale: 1 },
        { 
          x: nx * pulseDist, 
          y: ny * pulseDist, 
          scale: 1.15, 
          filter: "Brightness(1.4)", 
          duration: 0.2, 
          yoyo: true, 
          repeat: 1,
          ease: "power2.out"
        }
      )
    } else if (cat === 'status') {
      // Calculamos la rotación según la inclinación del vector para que parezca apuntar al objetivo
      const rot = isPlayerSide ? 12 : -12
      tl.fromTo(spriteRotationRef.value, 
        { filter: "Brightness(1)", rotation: 0, scale: 1 },
        { 
          rotation: rot, 
          scale: 1.1, 
          filter: "Brightness(1.2)", 
          duration: 0.2, 
          yoyo: true, 
          repeat: 1,
          ease: "power2.out"
        }
      )
    }
  }
})

// --- ANIMACIONES DE ESTADO (FLASH) ---
watch(() => props.pokemon?.status, (newS, oldS) => {
  if (!spriteRotationRef.value) return

  if (newS && newS !== oldS) {
    const statusColors: Record<string, string> = {
      burn: '#ff4500',
      poison: '#9400d3',
      paralysis: '#ffd700',
      freeze: '#00ffff',
      sleep: '#ffffff'
    }
    const color = statusColors[newS] || '#ffffff'
    
    // Matamos cualquier flash previo antes de iniciar uno nuevo
    gsap.killTweensOf(spriteRotationRef.value, "filter")
    
    gsap.fromTo(spriteRotationRef.value,
      { filter: `Drop-Shadow(0 0 0px ${color}) Brightness(1)` },
      { 
        filter: `Drop-Shadow(0 0 20px ${color}) Brightness(2)`, 
        duration: 0.25, 
        yoyo: true, 
        repeat: 3, 
        ease: "power1.inOut",
        onComplete: () => {
          gsap.set(spriteRotationRef.value, { clearProps: "filter" })
        }
      }
    )
  } else if (!newS && oldS) {
    // Si se quita el estado, limpiamos el filtro inmediatamente para evitar contaminación
    gsap.killTweensOf(spriteRotationRef.value, "filter")
    gsap.set(spriteRotationRef.value, { clearProps: "filter" })
  }
})


// Pokéball & Captures GSAP
const pokeballImgRef = ref<HTMLImageElement | null>(null)
let successBlinkTween: gsap.core.Tween | null = null

watch(() => [props.isShaking, props.isBlinking], ([shaking, blinking]) => {
  // Si hay una Pokebola visible, la animamos a ella
  if (pokeballImgRef.value) {
    if (shaking) {
      gsap.to(pokeballImgRef.value, {
        keyframes: [
          { rotation: 18, duration: 0.08, ease: 'power1.out' },
          { rotation: -18, duration: 0.16, ease: 'power1.inOut' },
          { rotation: 12, duration: 0.14, ease: 'power1.inOut' },
          { rotation: -12, duration: 0.14, ease: 'power1.inOut' },
          { rotation: 0, duration: 0.08, ease: 'power1.in' }
        ]
      })
    }
    if (blinking) {
      gsap.fromTo(pokeballImgRef.value,
        { filter: 'Brightness(1)' },
        { filter: 'Brightness(2) Hue-Rotate(10deg)', duration: 0.2, yoyo: true, repeat: 1, ease: 'power1.inOut' }
      )
    }
  } 
  // Si NO hay Pokebola, animamos al Sprite del Pokémon (Daño en combate)
  else if (!props.isCaptureSuccess) {
    if (shaking && spriteRotationRef.value) {
      const shakeDist = props.side === 'player' ? -10 : 10
      // Usamos spriteRotationRef para que la sombra (que está fuera) NO parpadee ni se mueva
      gsap.set(spriteRotationRef.value, { transition: "none" })
      
      // Movimiento físico
      gsap.fromTo(spriteRotationRef.value,
        { x: 0 },
        { 
          x: shakeDist, 
          duration: 0.08, 
          yoyo: true, 
          repeat: 5, 
          ease: 'power1.inOut',
          onComplete: () => gsap.set(spriteRotationRef.value, { clearProps: "x,opacity,transition" })
        }
      )

      // Flicker de daño (como debilitamiento pero más corto)
      const tl = gsap.timeline()
      const blinkPattern = [
        { t: 0.00, op: 0 }, { t: 0.08, op: 1 },
        { t: 0.16, op: 0 }, { t: 0.24, op: 1 },
        { t: 0.32, op: 0 }, { t: 0.40, op: 1 },
        { t: 0.48, op: 1 }
      ]
      blinkPattern.forEach(b => {
        tl.set(spriteRotationRef.value, { opacity: b.op }, b.t)
      })
    }
    if (blinking && spriteRotationRef.value) {
      const shakeDist = props.side === 'player' ? -10 : 10
      gsap.set(spriteRotationRef.value, { transition: "none" })
      gsap.fromTo(spriteRotationRef.value,
        { x: 0, filter: 'Brightness(1)' },
        { 
          x: shakeDist,
          filter: 'Brightness(2)', 
          duration: 0.08, 
          yoyo: true, 
          repeat: 5, 
          ease: 'power1.inOut',
          onComplete: () => gsap.set(spriteRotationRef.value, { clearProps: "x,filter,transition" })
        }
      )
    }
  }
})

watch(() => props.isCaptureSuccess, (success) => {
  if (!pokeballImgRef.value) return
  if (success) {
    successBlinkTween = gsap.fromTo(pokeballImgRef.value,
      { filter: 'Brightness(1)' },
      { filter: 'Brightness(1.8) Sepia(0.5) Hue-Rotate(-10deg)', duration: 0.25, yoyo: true, repeat: -1, ease: 'power1.inOut' }
    )
  } else {
    if (successBlinkTween) {
      successBlinkTween.kill()
      successBlinkTween = null
    }
    gsap.to(pokeballImgRef.value, { filter: 'Brightness(1)', duration: 0.1 })
  }
})

const onSparkleEnter = (el: Element, done: () => void) => {
  const htmlEl = el as HTMLElement
  const tx = parseFloat(htmlEl.dataset.tx || '0')
  const ty = parseFloat(htmlEl.dataset.ty || '0')
  const tf = parseFloat(htmlEl.dataset.tf || '0')
  const delay = parseFloat((htmlEl.dataset.delay || '0s').replace('s', ''))
  const scale = parseFloat(htmlEl.dataset.scale || '1')

  // Reset inicial forzado para evitar flashes o estados quietos
  gsap.set(htmlEl, { 
    x: 0, 
    y: 0, 
    xPercent: -50, 
    yPercent: -50, 
    scale: 0, 
    opacity: 1,
    rotation: 0
  })

  // Animación Horizontal y Rotación (Toda la duración)
  gsap.to(htmlEl, {
    x: tx,
    rotation: 720,
    duration: 0.8,
    delay: delay,
    ease: 'power1.out'
  })

  // Fase 1: Salto hacia arriba (Fountain Up)
  gsap.to(htmlEl, {
    y: ty,
    scale: scale,
    duration: 0.3,
    delay: delay,
    ease: 'power2.out',
    onComplete: () => {
      // Fase 2: Caída y desvanecimiento (Fountain Down)
      gsap.to(htmlEl, {
        y: tf,
        opacity: 0,
        duration: 0.5,
        ease: 'power2.in',
        onComplete: done
      })
    }
  })
}

const onStatArrowEnter = (el: Element, done: () => void) => {
  gsap.fromTo(el, 
    { y: 20, opacity: 0, scale: 0.5 },
    {
      y: -60,
      opacity: 0,
      scale: 1,
      duration: 1,
      ease: "power1.out",
      onStart: () => {
        gsap.to(el, { opacity: 1, duration: 0.2 })
        gsap.to(el, { scale: 1.2, duration: 0.2 })
      },
      onComplete: done
    }
  )
}

const onGroundPopEnter = (el: Element, done: () => void) => {
  const isSpikes = el.classList.contains('spikes')
  gsap.fromTo(el,
    { scale: 0, y: isSpikes ? 10 : 20, rotation: isSpikes ? -10 : 0, opacity: 0 },
    { 
      scale: 1, 
      y: isSpikes ? 0 : 5, 
      rotation: 0, 
      opacity: 1, 
      duration: isSpikes ? 0.4 : 0.6, 
      ease: 'back.out(1.7)', 
      onComplete: () => {
        done()
        if (isSpikes) {
           gsap.to(el.querySelectorAll('.spike-item'), {
             y: -10,
             scaleY: 1.1,
             scaleX: 0.9,
             duration: 0.8,
             yoyo: true,
             repeat: -1,
             ease: 'power1.inOut',
             stagger: 0.1
           })
        } else {
           gsap.to(el.querySelectorAll('.root-item'), {
             y: 2,
             scale: 1.03,
             filter: 'Brightness(1.2)',
             duration: 1.5,
             yoyo: true,
             repeat: -1,
             ease: 'power1.inOut'
           })
        }
      }
    }
  )
}

const onGroundPopLeave = (el: Element, done: () => void) => {
  gsap.to(el, { scale: 0, opacity: 0, duration: 0.3, onComplete: done })
}

const onBallEnter = (el: Element, done: () => void) => {
  gsap.fromTo(el, 
    { opacity: 0, scale: 0.5 }, 
    { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.7)', onComplete: done }
  )
}

const onBallLeave = (el: Element, done: () => void) => {
  gsap.to(el, { 
    opacity: 0, 
    scale: 0.8, 
    duration: 0.3,
    ease: 'power2.in', 
    onComplete: done 
  })
}
</script>

<template>
  <VirtualEntity
    v-if="pokemon"
    :class="['combatant-sprite', `${side}-side-sprite`]"
    :x="position.x"
    :y="position.y"
    :w="baseSize"
    :h="baseSize"
  >
    <div
      v-if="hasSeat && animState !== 'trapped' && !isCaptureSuccess"
      ref="spriteRef"
      class="sprite-animator"
      :style="{ '--fx-scale': fxScale }"
      :class="[{ 
        'is-attacking': isAttacking,
        'is-technical-hidden': hidden
      }, getAttackAnimClass]"
    >
      <!-- Sombra integrada (Sigue el dash pero no el flotado) -->
      <div
        ref="shadowWrapperRef"
        class="combat-shadow-wrapper"
      >
        <CombatShadow 
          v-if="shadowKey" 
          :shadow-id="shadowKey" 
          :style="{ '--shadow-y': localGroundY }"
        />
      </div>

      <!-- Capa de Efectos de Suelo (Sigue la sombra, ignora el float) -->
      <div 
        class="ground-effects-container"
        :style="{ top: localGroundY }"
      >
        <!-- Púas -->
        <Transition
          :css="false"
          @enter="onGroundPopEnter"
          @leave="onGroundPopLeave"
        >
          <div
            v-if="(stages.spikes || 0) > 0"
            :key="`spikes-${side}-${stages.spikes || 0}`"
            class="ground-fx spikes"
          >
            <span
              v-for="i in 3"
              :key="i"
              class="spike-item"
            >🌵</span>
          </div>
        </Transition>
        
        <!-- Arraigo -->
        <Transition
          :css="false"
          @enter="onGroundPopEnter"
          @leave="onGroundPopLeave"
        >
          <div
            v-if="pokemon.ingrain"
            :key="`ingrain-${side}`"
            class="ground-fx ingrain"
          >
            <span class="root-item">🌳</span>
          </div>
        </Transition>
      </div>

      <div
        ref="spriteRotationRef"
        class="sprite-rotation-layer"
        :class="[getAttackAnimClass, { 'is-floating-species': isFloating }]"
      >
        <div
          ref="idleWrapperRef"
          class="sprite-idle-wrapper"
          :class="[{ 
            'is-floating-species': isFloating, 
            'energy-catching': animState === 'catching', 
            'energy-releasing': animState === 'releasing'
          }]"
          :style="{ 
            '--shadow-y': localGroundY,
            '--side-dir': isEnemy ? '-1' : '1'
          }"
        >
          <PVSpriteFX
            :poke-id="pokemon.uid || pokemon.id"
            :is-shiny="pokemon.isShiny"
            :is-guardian="pokemon.isGuardian"
            :is-silhouette="isSilhouette"
            :status="pokemon.status || undefined"
            :is-confused="(pokemon.confused || 0) > 0"
            :is-cursed="pokemon.cursed"
            :is-seeded="pokemon.seeded"
            :is-trapped="!!(pokemon.trapped || (pokemon.bound && pokemon.bound > 0))"
            :attracted="pokemon.attracted"
            :is-focus-energy="pokemon.focusEnergy"
            :is-protected="(pokemon.protect || pokemon.detect)"
            :is-enduring="pokemon.endure"
            :is-lock-on="pokemon.lockOn"
            :has-reflect="(stages.reflect || 0) > 0"
            :has-light-screen="(stages.lightScreen || 0) > 0"
            :has-safeguard="(stages.safeguard || 0) > 0"
            :has-mist="(stages.mist || 0) > 0"
            :vibrant="true"
            :sparkle-count="8"
            :radius="fxRadius"
            :sprite-scale="fxScale"
            :style="virtualStyle"
            :is-battle="true"
          >
            <div 
              class="pokemon-atmosphere-wrapper"
              :style="{ filter: isSilhouette ? 'none' : 'var(--atmosphere-filter)' }"
            >
              <img
                class="pokemon-combat-image"
                :class="{ 'is-silhouette': isSilhouette }"
                :src="imageUrl"
                @load="handleLoad"
                @error="handleImageError"
              >
            </div>
          </PVSpriteFX>

          <!-- Guía de tamaño real (Debug) -->
          <div 
            v-if="showGuides && naturalSize.w > 0" 
            class="guide-real-size"
            :style="{ width: naturalSize.w + 'px', height: naturalSize.h + 'px' }"
          >
            <span>{{ naturalSize.w }}x{{ naturalSize.h }}</span>
          </div>
          <!-- NOTE: guide-real-size must be position:absolute (see styles) to avoid flex layout shifts -->
          
          <!-- Flechas de Stats -->
          <div class="stat-arrows-container">
            <TransitionGroup
              :css="false"
              @enter="onStatArrowEnter"
            >
              <div 
                v-for="a in statArrows" 
                :key="a.id"
                :class="['stat-arrow', a.dir]"
              >
                {{ a.dir === 'up' ? '▲' : '▼' }}
              </div>
            </TransitionGroup>
          </div>
        </div>
      </div>
    </div>

    <!-- Poké Ball visual -->
    <Transition 
      :css="false"
      @enter="onBallEnter" 
      @leave="onBallLeave"
    >
      <div
        v-if="isBallVisible"
        :key="`ball-${side}-${pokemon.uid || pokemon.id}`"
        class="trapped-pokeball"
        :style="memorizedBallCoords"
      >
        <img
          ref="pokeballImgRef"
          :src="getAssetUrl(ASSET_TYPES.ITEM, internalBallId)"
          alt="Pokeball"
          @error="handleBallError"
        >
        
        <div
          class="pokeball-shadow"
          :style="{ backgroundImage: pokeballShadowUrl }"
        />

        <!-- Success Sparkles (Centradas en la bola) -->
        <TransitionGroup 
          tag="div"
          class="catch-success-sparkles"
          :css="false"
          @enter="onSparkleEnter"
        >
          <span
            v-for="s in sparkles"
            :key="s.id"
            class="sparkle"
            :data-tx="s.tx"
            :data-ty="s.ty"
            :data-tf="s.tf"
            :data-scale="s.scale"
            :data-delay="s.delay"
          >✨</span>
        </TransitionGroup>
      </div>
    </Transition>
  </VirtualEntity>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.combatant-sprite {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  @include pixelated;
  overflow: visible;

  .sprite-animator, 
  .sprite-rotation-layer, 
  .sprite-idle-wrapper,
  :deep(.pv-fx-wrapper) {
    width: 100% !important;
    height: 100% !important;
    display: flex;
    align-items: center;
    justify-content: center;
    transform-origin: bottom center;
  }

  // Las sparkles shiny son hijos del sprite-idle-wrapper, que tiene scaleX/scaleY asincrónicos
  // en la animación idle. Esto distorsiona las estrellas. Usamos isolation para crear un
  // contexto de apilamiento propio que neutraliza el scale heredado del padre.
  :deep(.pv-fx-shiny-overlay) {
    isolation: isolate;
  }

  :deep(.pv-fx-shiny-overlay .sparkle) {
    transform-origin: center center !important;
  }

  .pokemon-atmosphere-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: visible;
  }

    .pokemon-combat-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: center;
      @include pixelated;
      &.is-silhouette { 
        @include pokemon-silhouette;
      }
    }
}

// Overlay de debug que NO debe afectar el layout del flex container
.guide-real-size {
  position: absolute;
  top: 0;
  left: 0;
  border: 1px dashed Rgba(255, 100, 0, 0.7);
  pointer-events: none;
  z-index: var(--z-navigation);

  span {
    position: absolute;
    bottom: 2px;
    right: 4px;
    font-size: 9px;
    color: Rgba(255, 180, 0, 1);
    background: Rgba(0, 0, 0, 0.6);
    padding: 1px 3px;
    @include pixelated;
  }
}

.sprite-animator {
  // Las transiciones de transform deben estar desactivadas por defecto
  // para evitar que el posicionamiento inicial parezca un salto.
  transition: opacity 0.8s ease-in-out, transform 0s; 
  
  &.is-jumping { 
    animation: pokemon-jump 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; 
    transition: none !important; 
    z-index: calc(var(--z-map-spawns) + 10); 
  }
  position: relative;
  z-index: var(--z-map-spawns);
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: visible;

  &.fainted {
    .sprite-idle-wrapper {
      pointer-events: none;
    }
  }

  &.is-technical-hidden {
    opacity: 0 !important;
    pointer-events: none;
    transition: none !important;
  }
}

.sprite-rotation-layer {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: visible;
  z-index: var(--z-map-spawns);

  &.is-floating-species { 
    margin-bottom: 40px; 
    @media (max-width: 690px) { margin-bottom: 18px; } 
  }
}

.energy-catching {
  animation: energy-catch 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
  transform-origin: 50% var(--shadow-y, 90%);
  pointer-events: none;
}

.energy-releasing {
  animation: energy-release 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards !important;
  transform-origin: 50% var(--shadow-y, 90%);
}

.ball-fade-enter-active, .ball-fade-leave-active { transition: opacity 0.3s ease-in-out !important; }
.ball-fade-enter-from, .ball-fade-leave-to { opacity: 0 !important; }

.trapped-pokeball {
  position: absolute;
  left: 50%;
  transform: Translatex(-50%) Translatey(-85%);
  width: calc(var(--obj-scale, 1) * 40px);
  height: calc(var(--obj-scale, 1) * 40px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-map-ui);
  pointer-events: none;
  @include pixelated;
  overflow: visible;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    transform-origin: 50% 70%;
  }
}

.pokeball-shadow {
  position: absolute;
  top: 85%;
  left: 50%;
  transform: Translatex(-50%) Translatey(-50%);
  width: 70%;
  height: 15%;
  background-size: 100% 100%;
  background-repeat: no-repeat;
  @include pixelated;
  z-index: calc(var(--z-base) - 1);
  pointer-events: none;
  opacity: 0.8;
}

.catch-success-sparkles {
  position: absolute;
  top: 50%;
  left: 50%;
  pointer-events: none;
  z-index: var(--z-low);
  overflow: visible;

  .sparkle {
    position: absolute;
    top: 50%;
    left: 50%;
    display: block;
    font-size: calc(var(--obj-scale, 1) * 12px);
    @include pixelated;
    text-shadow: 0 0 5px Rgba(255, 215, 0, 0.8);
    will-change: transform, filter, opacity;
  filter: Drop-Shadow(0 0 2px white);
  }
}

.ground-effects-container {
  position: absolute;
  left: 50%;
  transform: Translatex(-50%) Translatey(-50%);
  width: 100%;
  height: 20px;
  pointer-events: none;
  z-index: calc(var(--z-map-spawns) + 5); 
  display: flex;
  justify-content: center;
  align-items: center;
}

.ground-fx {
  position: absolute;
  display: flex;
  gap: 8px;
  
  &.spikes {
    .spike-item {
      font-size: calc(var(--fx-scale, 1) * 28px);
      display: inline-block;
      animation: 
        ground-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards,
        ground-item-jump 2s infinite ease-in-out 0.4s;
      will-change: transform, filter, opacity;
  filter: Drop-Shadow(0 2px 2px Rgba(0,0,0,0.3));
      
      &:nth-child(2) { animation-delay: 0.1s, 0.7s; }
      &:nth-child(3) { animation-delay: 0.2s, 1s; }
    }
  }
  
  &.ingrain {
    .root-item {
      font-size: calc(var(--fx-scale, 1) * 42px);
      display: inline-block;
      transform: Translatey(5px);
      animation: 
        ground-grow 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards,
        ground-item-pulse 3s infinite ease-in-out 0.6s;
    }
  }
}

.ground-fx-pop-enter-active {
  animation: ground-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

.ground-fx-pop-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
  opacity: 0;
  transform: Scale(0);
}

.stat-arrows-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-low);
}

.stat-arrow {
  position: absolute;
  font-size: calc(var(--fx-scale, 1) * 40px);
  font-weight: bold;
  text-shadow: 0 0 10px Rgba(0,0,0,0.5);
  
  &.up { color: #4ade80; }
  &.down { color: #f87171; }
}

</style>

