import { ref, computed, watch, onMounted, onUnmounted, toValue } from 'vue'
import gsap from 'gsap'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { useCombatShadowStore } from '@/stores/combatShadows'
import { useBattleStore } from '@/stores/battle'
import { gameBus } from '@/logic/gameBus'
import { WORLD_CONSTANTS } from '@/logic/combat/spatialCoordinator'
import type { Pokemon } from '@/types/pokemon'
import type { BattleStages } from '@/types/battle'

export interface SparkleData {
  id: string | number
  tx: number
  ty: number
  tf: number
  scale: number
  delay: string
}

export interface BattleCombatantProps {
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
  isHealing?: boolean
  isSilhouette?: boolean
  isAttacking?: boolean
  activeMove?: { side: string; cat: 'physical' | 'special' | 'status' | 'selfKO'; name: string; selfKO?: boolean } | null
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

interface SmokeParticle {
  id: string | number
  x: number
  y: number
  vx: number
  vy: number
  scale: number
  opacity: number
}

// Persistent cache for Pokéball coordinates and raw coordinates
const pokeballCoordsCache = new Map<string, { top: string; left: string }>()
const rawCoordsCache = new Map<string, { x: number; y: number }>()

export function useBattleCombatantState(
  props: BattleCombatantProps,
  emit: (e: 'load', size: { w: number; h: number }) => void,
  spriteRef: { value: HTMLElement | null }
) {
  const naturalSize = ref({ w: 0, h: 0 })
  const seatKey = computed(() => `${props.side}-${props.position.x}-${props.position.y}`)
  const cacheKey = computed(() => {
    if (props.pokemon) {
      return props.pokemon.uid || `${props.side}-${props.pokemon.id}`
    }
    return seatKey.value
  })

  const isFloating = computed(() => {
    if (!props.pokemon) return false
    const data = pokemonDataProvider.getPokemonData(props.pokemon.id)
    if (!data) return false
    if (data.isFloating !== undefined) return data.isFloating
    const types: string[] = []
    if (data.type) types.push(data.type.toLowerCase())
    if (data.type2) types.push(data.type2.toLowerCase())
    return types.includes('flying')
  })

  const isPlayer = computed(() => props.side === 'player')
  const isEnemy = computed(() => props.side === 'enemy')

  const imageUrl = computed(() => {
    if (!props.pokemon) return ''
    return getAssetUrl(ASSET_TYPES.POKEMON, props.pokemon.id, { 
      isShiny: !!props.pokemon.isShiny, 
      isBack: isPlayer.value 
    })
  })

  const getAttackAnimClass = computed(() => {
    if (!props.isAttacking || !props.activeMove) return ''
    const move = props.activeMove
    if (move.side !== props.side) return ''
    if (move.cat === 'physical') return 'atk-physical'
    if (move.cat === 'special') return 'atk-special'
    if (move.cat === 'status') return 'atk-status'
    return 'atk-default'
  })

  const pokeballShadowUrl = computed(() => {
    if (typeof document === 'undefined') return ''
    const w = 10, h = 7
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
    ctx.beginPath()
    ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
    ctx.fill()
    return `url(${canvas.toDataURL('image/png')})`
  })

  const shadowStore = useCombatShadowStore()
  const battleStore = useBattleStore()
  const currentShadow = computed(() => props.shadowKey ? shadowStore.activeShadows.get(props.shadowKey) : null)

  const localGroundY = computed(() => {
    const shadow = currentShadow.value
    if (shadow && shadow.feetY !== undefined) {
      return `${shadow.feetY * 100}%`
    }
    const cached = pokeballCoordsCache.get(cacheKey.value)
    if (cached) return cached.top
    return props.groundY || '90%'
  })

  const fxScale = computed(() => props.baseSize / 100)

  const fxRadius = computed(() => {
    const shadow = currentShadow.value
    if (shadow && shadow.feetY !== undefined) {
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
    } else {
      const cached = pokeballCoordsCache.get(cacheKey.value)
      if (cached) {
        left = cached.left
        top = cached.top
      }
    }
    
    return { top, left }
  })

  const isBallVisible = computed(() => {
    return props.animState === 'trapped' || 
           props.animState === 'catching' || 
           props.animState === 'releasing' || 
           !!props.isCaptureSuccess
  })

  const wasCaptured = ref(false)
  const internalBallId = ref('pokeball')
  const memorizedBallCoords = ref({ top: '90%', left: '50%' })

  const getSpriteFeetOrigin = () => {
    const shadow = currentShadow.value
    const scale = (WORLD_CONSTANTS as { OBJECT_SCALE: number }).OBJECT_SCALE || 2
    const entitySize = props.baseSize * scale
    const feetX = shadow?.feetX ?? 0.5
    const offsetX = (feetX - 0.5) * entitySize
    
    let floatOffset = 0
    if (isFloating.value) {
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 690
      floatOffset = isMobile ? 18 : 40
    }
    
    return `calc(50% + ${offsetX}px) calc(${localGroundY.value} - ${floatOffset}px)`
  }

  const getBallTargetCoords = () => {
    const scale = (WORLD_CONSTANTS as { OBJECT_SCALE: number }).OBJECT_SCALE || 2
    const containerHeight = props.baseSize * scale
    
    let floatOffset = 0
    if (isFloating.value) {
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 690
      floatOffset = isMobile ? 18 : 40
    }
    
    const ballHeight = 40 * scale
    const groundPct = parseFloat(localGroundY.value) / 100
    const groundOffsetFromBottom = containerHeight * (groundPct - 1)
    
    const shadow = currentShadow.value
    let targetX = 0
    if (shadow && shadow.feetX !== undefined) {
      targetX = (shadow.feetX - 0.5) * (props.baseSize * scale)
    }
    
    const targetY = groundOffsetFromBottom - (ballHeight * 0.35) + floatOffset
    
    return { x: targetX, y: targetY }
  }

  watch(() => [isBallVisible.value, stickyCoords.value] as const, ([visible]) => {
    if (visible) {
      internalBallId.value = props.ballId || 'pokeball'
      const newCoords = { ...stickyCoords.value }
      memorizedBallCoords.value = newCoords
      pokeballCoordsCache.set(cacheKey.value, newCoords)
      rawCoordsCache.set(cacheKey.value, getBallTargetCoords())
    } else {
      const cached = pokeballCoordsCache.get(cacheKey.value)
      if (cached) {
        memorizedBallCoords.value = { ...cached }
      }
    }
  }, { immediate: true, deep: true })

  const handleImageError = (e: Event) => {
    (e.target as HTMLImageElement).src = getAssetUrl(ASSET_TYPES.ENVIRONMENT, 'bush-1')
  }

  const handleBallError = (e: Event) => {
    (e.target as HTMLImageElement).src = getAssetUrl(ASSET_TYPES.ITEM, 'pokeball')
  }

  const handleLoad = (e: Event) => {
    const target = e.target as HTMLImageElement
    naturalSize.value = { w: target.naturalWidth, h: target.naturalHeight }
    emit('load', naturalSize.value)
  }

  // Escape Smoke Particles
  const smokeParticles = ref<SmokeParticle[]>([])

  const runEscapeAnimation = (type: 'teleport' | 'flee') => {
    if (!spriteRef.value) return

    if (type === 'teleport') {
      gameBus.emit('PLAY_SOUND', 'flee')
      
      const tl = gsap.timeline()
      const tween = tl.to(spriteRef.value, {
        scaleY: 2.0,
        scaleX: 0.1,
        opacity: 0,
        filter: 'brightness(3) contrast(1.5)',
        duration: 0.4,
        ease: 'power3.in',
        onComplete: () => {
          if (spriteRef.value) {
            gsap.set(spriteRef.value, { clearProps: 'scale,transform,filter' })
          }
        }
      })
      const animKey = `escape-${props.side}`
      gameBus.emit('REGISTER_TWEEN', { key: animKey, tween })
    } else {
      gameBus.emit('PLAY_SOUND', 'flee')
      
      const count = 15
      const list: SmokeParticle[] = []
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 1.5 + Math.random() * 3
        list.push({
          id: `smoke-${Temporal.Now.instant().epochMilliseconds}-${i}-${Math.random()}`,
          x: 0,
          y: -10,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5,
          scale: 1.0 + Math.random() * 1.5,
          opacity: 0.9
        })
      }
      smokeParticles.value = list

      const updateTicker = () => {
        let active = false
        smokeParticles.value.forEach(p => {
          p.x += p.vx
          p.y += p.vy
          p.opacity -= 0.03
          p.scale += 0.02
          if (p.opacity > 0) active = true
        })
        
        if (active) {
          requestAnimationFrame(updateTicker)
        } else {
          smokeParticles.value = []
        }
      }
      requestAnimationFrame(updateTicker)

      const tween = gsap.to(spriteRef.value, {
        x: 400,
        opacity: 0,
        scale: 0.7,
        duration: 0.45,
        ease: 'power2.in',
        onComplete: () => {
          if (spriteRef.value) {
            gsap.set(spriteRef.value, { clearProps: 'scale,transform,x' })
          }
        }
      })
      const animKey = `escape-${props.side}`
      gameBus.emit('REGISTER_TWEEN', { key: animKey, tween })
    }
  }

  const handleEscapeEvent = (e: Event) => {
    const data = (e as CustomEvent).detail
    if (data.side === props.side && (!data.pokemon || data.pokemon.uid === props.pokemon?.uid)) {
      const stateVal = toValue(battleStore.state)
      const isTrainerCombat = !!stateVal?.isTrainer || !!stateVal?.isGym
      if (isTrainerCombat) return
      runEscapeAnimation(data.type)
    }
  }

  onMounted(() => {
    gameBus.on('TRIGGER_COMBATANT_ESCAPE', handleEscapeEvent)
  })

  onUnmounted(() => {
    gameBus.off('TRIGGER_COMBATANT_ESCAPE', handleEscapeEvent)
  })

  return {
    naturalSize,
    cacheKey,
    isFloating,
    isPlayer,
    isEnemy,
    imageUrl,
    getAttackAnimClass,
    pokeballShadowUrl,
    localGroundY,
    fxScale,
    fxRadius,
    isBallVisible,
    wasCaptured,
    internalBallId,
    memorizedBallCoords,
    getSpriteFeetOrigin,
    getBallTargetCoords,
    rawCoordsCache,
    handleImageError,
    handleBallError,
    handleLoad,
    smokeParticles
  }
}
