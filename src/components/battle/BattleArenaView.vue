// [PureVue-Ignore-Length]
<script setup>
import { ref, computed, watch, onMounted, onUnmounted, provide, nextTick } from 'vue'
import { useBattleStore } from '@/stores/battle'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { getItemByName } from '@/data/items'
import { useCombatShadowStore } from '@/stores/combatShadows'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { useBattleBackground } from '@/composables/useBattleBackground'
import { useMapStore } from '@/stores/map'
import { getRouteWeather } from '@/logic/weatherUtils'
import { PLAYER_CLASSES } from '@/data/playerClasses'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import BattleInfoCard from './BattleInfoCard.vue'
import AtmosphereLayer from '@/components/common/AtmosphereLayer.vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { gameBus } from '@/logic/gameBus'
import { useCombatCamera } from '@/composables/useCombatCamera'
import { getCombatantPosition, WORLD_CONSTANTS } from '@/logic/combat/spatialCoordinator'
const { ENTITY_SIZE_PLAYER, ENTITY_SIZE_ENEMY, BUSH_SIZE, PREVIEW_SIZE, SHADOW_WIDTH, SHADOW_HEIGHT, BASE_ENTITY_SIZE_PLAYER, BASE_ENTITY_SIZE_ENEMY } = WORLD_CONSTANTS
import VirtualSpace from './VirtualSpace.vue'
import VirtualEntity from './VirtualEntity.vue'
import CombatShadow from './CombatShadow.vue'

const battleStore = useBattleStore()
const gameStore = useGameStore()
const mapStore = useMapStore()
const uiStore = useUIStore()
const shadowStore = useCombatShadowStore()

// Forzar Alta Fidelidad en el Combate (Ignorar modo performance de modales)
provide('forceHighFidelity', true)
provide('isModalPerformanceMode', computed(() => false))
const { getBackgroundUrl } = useBattleBackground()

const isFlying = (pokemon) => {
  if (!pokemon || !pokemon.id) return false
  const data = pokemonDataProvider.getPokemonData(pokemon.id)
  return data?.isFloating || false
}

const arenaRef = ref(null)
const { cameraStyles, worldStyles, showGuides } = useCombatCamera(arenaRef)

const p1Pos = computed(() => getCombatantPosition('player'))
const p2Pos = computed(() => getCombatantPosition('enemy'))

const bgData = computed(() => {
  return getBackgroundUrl(battle.value?.locationId || 'route1', mapStore.currentCycle)
})

const atmosphere = ref(null)

const gs = computed(() => gameStore.state)
const battle = computed(() => battleStore.state)
const enemy = computed(() => battle.value?.enemy)
const player = computed(() => battle.value?.player)
const isFinishing = computed(() => {
  return isEncounterOver(battle.value, enemy.value, player.value)
})

// Módulos lógicos centralizados para evitar reescritura
const isEncounterOver = (b, e, p) => {
  if (!b?.over) return false
  const isDead = e?.hp <= 0 || p?.hp <= 0
  const isCaptured = isCaptureSequenceActive.value || battleStore.state?.isCapture
  return isDead || isCaptured
}

const isDefeated = (p) => {
  if (!p) return false
  // En este motor, un pokemon está fuera de combate si su HP es 0 
  // O si estamos en la secuencia visual de captura exitosa
  return p.hp <= 0 || (isCaptureSequenceActive.value && caughtPokemonSnapshot.value?.uid === p.uid)
}

const isSearching = computed(() => battleStore.isSearching)
const upcomingPokemon = computed(() => battleStore.upcomingPokemon)

const hasBinoculars = computed(() => {
  return (gameStore.state.inventory?.['binoculars'] > 0) || false
})

// Determinar si es un encuentro salvaje inicial para evitar parpadeos de color/posición
const isWildEncounter = computed(() => {
  // Es encuentro salvaje si el combate activo no es entrenador/gym, 
  // O si estamos buscando (que siempre es salvaje)
  if (isSearching.value) return true
  return battleStore.state && !battleStore.state.isTrainer && !battleStore.state.isGym
})

const isWildEntryAnimation = ref(false)
const isEmerging = ref(false)
const isWildSilhouette = ref(false)
const wildRevealActive = ref(false)
const upcomingIsEmerging = ref(false)
const isWildSilhouetteHalfway = ref(false)
const isInitialLoad = ref(true)
const isPreloadingFeet = ref(true)
const isEnemyShadowReady = ref(false) // Nueva flag de sincronización atómica
const caughtPokemonSnapshot = ref(null) 

const activeEnemyData = computed(() => {
  // El enemigo "oficial" viene del store o del snapshot si estamos capturando
  const storeEnemy = (battle.value && (!battle.value.over || isFinishing.value)) ? enemy.value : null
  const visualEnemy = (isCaptureSequenceActive.value && caughtPokemonSnapshot.value) ? caughtPokemonSnapshot.value : storeEnemy

  // Un pokemon está "finalizado" visualmente si está derrotado o capturado
  const isDone = isDefeated(visualEnemy)
  
  // El próximo solo es válido si no es el mismo que el visual (evitar falsas predicciones)
  const isNewUpcoming = upcomingPokemon.value && 
    (!visualEnemy || (upcomingPokemon.value.uid !== visualEnemy.uid && upcomingPokemon.value.id !== visualEnemy.id))

  // Prioridad 1: Búsqueda activa (siempre mostrar el próximo)
  if (isSearching.value) return upcomingPokemon.value

  // Prioridad 2: Enemigo visual mientras esté ACTIVO (HP > 0 y no capturado)
  if (visualEnemy && !isDone) return visualEnemy

  // Prioridad 3: El próximo (silueta en arbustos) si el actual ya terminó
  if (isNewUpcoming) return upcomingPokemon.value

  // Prioridad 4: El enemigo visual "finalizado" (para animaciones de fainted o persistencia de bola)
  if (visualEnemy) return visualEnemy

  // Fallback
  return upcomingPokemon.value
})

const activeEnemyImageUrl = computed(() => {
  const p = activeEnemyData.value
  if (!p) return ''
  return getAssetUrl(ASSET_TYPES.POKEMON, p.id, { isShiny: p.isShiny, isBack: false })
})

const activeEnemyIsFloating = computed(() => {
  const p = activeEnemyData.value
  return p ? isFlying(p) : false
})

const activePlayerIsFloating = computed(() => {
  const p = player.value
  return p ? isFlying(p) : false
})

const activeEnemyIsSilhouette = computed(() => {
  if (hasBinoculars.value) return false
  
  // Durante búsqueda o previsualización siempre es silueta
  if (isSearching.value || upcomingIsEmerging.value || !!upcomingPokemon.value) return true
  
  // Si las animaciones de intro terminaron y el combate es activo, forzar limpieza
  if (!isIntroInProgress.value && battleStore.isBattleActive && !isFinishing.value) return false

  // Durante la animación de entrada oficial
  if (isWildEntryAnimation.value || wildRevealActive.value) return true
  
  return isWildSilhouette.value
})

const revealWildPokemon = (isInstant = false) => {
  if (isInstant) {
    isWildSilhouette.value = false
    isWildEntryAnimation.value = false
    wildRevealActive.value = false
    return
  }

  wildRevealActive.value = true
  isWildSilhouette.value = true
  isWildEntryAnimation.value = true
  isEmerging.value = false 
  
  const duration = 600
  
  setTimeout(() => {
    isWildSilhouette.value = false
    isWildEntryAnimation.value = false
    wildRevealActive.value = false
  }, duration)
}

const triggerWildEmergence = () => {
  // Evitar disparar múltiples veces si ya está activa
  if (wildRevealActive.value) return

  isWildEntryAnimation.value = true
  isEmerging.value = true
  isWildSilhouette.value = true
  wildRevealActive.value = true
  isWildSilhouetteHalfway.value = false
  
  // La sombra aparece solo a mitad del salto (Fase 1)
  setTimeout(() => { isWildSilhouetteHalfway.value = true }, 1100)

  setTimeout(() => { 
    isWildEntryAnimation.value = false
    isEmerging.value = false
    isWildSilhouette.value = false 
    wildRevealActive.value = false
    isWildSilhouetteHalfway.value = false
  }, 2200)
}

// Control de estados físicos (Poké Ball Cycle: catching -> trapped -> releasing)
const playerAnimState = ref(null) // 'catching', 'trapped', 'releasing', null
const enemyAnimState = ref(null)

// Identificadores únicos para las sombras activas
const currentPlayerShadowKey = ref(null)
const currentEnemyShadowKey = ref(null)

// Coordenadas base del suelo persistente
const stableEnemyGroundY = ref('90%')
const stablePlayerGroundY = ref('90%')

// Propiedades computadas inteligentes para el suelo (feetY si hay sombra, estable si no)
const enemyGroundY = computed(() => {
  const shadow = shadowStore.activeShadows.get(currentEnemyShadowKey.value)
  if (shadow && shadow.feetY !== undefined) {
    stableEnemyGroundY.value = `${shadow.feetY * 100}%`
  }
  return stableEnemyGroundY.value
})

const playerGroundY = computed(() => {
  const shadow = shadowStore.activeShadows.get(currentPlayerShadowKey.value)
  if (shadow && shadow.feetY !== undefined) {
    stablePlayerGroundY.value = `${shadow.feetY * 100}%`
  }
  return stablePlayerGroundY.value
})

// Propiedades computadas para que la Poké Ball siempre siga a la sombra del bando correspondiente
const playerTrappedCoords = computed(() => {
  const shadow = shadowStore.activeShadows.get(currentPlayerShadowKey.value)
  const feetX = shadow?.feetX !== undefined ? shadow.feetX * 100 : 50
  const feetY = shadow?.feetY !== undefined ? shadow.feetY * 100 : parseFloat(playerGroundY.value)
  return { top: `${feetY}%`, left: `${feetX}%` }
})

const enemyTrappedCoords = computed(() => {
  const shadow = shadowStore.activeShadows.get(currentEnemyShadowKey.value)
  const feetX = shadow?.feetX !== undefined ? shadow.feetX * 100 : 50
  const feetY = shadow?.feetY !== undefined ? shadow.feetY * 100 : parseFloat(enemyGroundY.value)
  return { top: `${feetY}%`, left: `${feetX}%` }
})

// Coordenadas "Sticky" para evitar teletransportes al desaparecer la sombra (ej: captura exitosa)
const stickyPlayerCoords = ref({ top: '90%', left: '50%' })
const stickyEnemyCoords = ref({ top: '90%', left: '50%' })

watch(playerTrappedCoords, (newVal) => {
  const shadow = shadowStore.activeShadows.get(currentPlayerShadowKey.value)
  if (shadow) {
    stickyPlayerCoords.value = newVal
  }
}, { immediate: true })

watch(enemyTrappedCoords, (newVal) => {
  const shadow = shadowStore.activeShadows.get(currentEnemyShadowKey.value)
  if (shadow) {
    stickyEnemyCoords.value = newVal
  }
}, { immediate: true })

// Refs para el tipo de Poké Ball visual
const playerTrappedBallId = ref('pokeball')
const enemyTrappedBallId = ref('pokeball')

// Refs para controlar las agitaciones (shakes) individuales
const playerIsShaking = ref(false)
const enemyIsShaking = ref(false)

// Partículas de éxito de captura (sparkles)
const catchSparkles = ref([])

// Generar sombra pixelada estándar para las pokéballs (10x7 pixels)
const pokeballShadowUrl = computed(() => {
  if (typeof document === 'undefined') return ''
  const w = 10, h = 7
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'Rgba(0, 0, 0, 0.45)'
  ctx.beginPath()
  ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
  ctx.fill()
  return `url(${canvas.toDataURL('image/png')})`
})

// Control global de animaciones de intro para el store
const isIntroInProgress = computed(() => {
  return isWildEntryAnimation.value || 
         wildRevealActive.value || 
         isEmerging.value || 
         upcomingIsEmerging.value || 
         playerAnimState.value !== null || 
         enemyAnimState.value !== null ||
         isCaptureSequenceActive.value
})

const isCaptureSequenceActive = ref(false)

const isShadowVisible = computed(() => {
  // Ocultar si está en la Poké Ball (Estado Atrapado)
  if (enemyAnimState.value === 'trapped') return false

  // Regla para Fase 2 (Búsqueda): No mostrar hasta que termine de emerger
  if (upcomingIsEmerging.value) return false
  
  // Regla para Fase 1 (Salto): No mostrar hasta la mitad de la animación
  if (isWildEntryAnimation.value && !isWildSilhouetteHalfway.value) return false
  
  // Ocultar durante búsqueda activa o si no hay datos
  if (isSearching.value || !activeEnemyData.value) return false

  // Ocultar si el bicho está debilitado (y no estamos en intro)
  if (activeEnemyData.value.hp <= 0 && !isWildEntryAnimation.value && !wildRevealActive.value) return false

  return true
})


// Watchers para asegurar que la coordenada del suelo se actualice instantáneamente durante intercambios
watch(() => currentEnemyShadowKey.value, (newKey) => {
  const shadow = shadowStore.activeShadows.get(newKey)
  if (shadow) stableEnemyGroundY.value = `${shadow.feetY * 100}%`
}, { immediate: true })

watch(() => shadowStore.activeShadows.get(currentEnemyShadowKey.value), (shadow) => {
  if (shadow) stableEnemyGroundY.value = `${shadow.feetY * 100}%`
}, { deep: true })

watch(() => currentPlayerShadowKey.value, (newKey) => {
  const shadow = shadowStore.activeShadows.get(newKey)
  if (shadow) stablePlayerGroundY.value = `${shadow.feetY * 100}%`
}, { immediate: true })

watch(() => shadowStore.activeShadows.get(currentPlayerShadowKey.value), (shadow) => {
  if (shadow) stablePlayerGroundY.value = `${shadow.feetY * 100}%`
}, { deep: true })

// Reset de coordenadas inteligente al cambiar de pokemon (Usar caché si existe para evitar saltos)
watch(() => activeEnemyData.value, async (newVal) => {
  if (newVal) {
    isEnemyShadowReady.value = false // Bloqueamos visibilidad hasta tener coordenadas
    const url = getAssetUrl(ASSET_TYPES.POKEMON, newVal.id, { isShiny: newVal.isShiny, isBack: false })
    
    // Disparar recálculo/petición de sombra inmediatamente
    const shadowId = getStableShadowId(newVal, 'enemy')
    currentEnemyShadowKey.value = shadowId
    
    await shadowStore.requestShadow(shadowId, {
      side: 'enemy',
      entityX: p2Pos.value.x,
      entityY: p2Pos.value.y,
      entitySize: ENTITY_SIZE_ENEMY,
      isFlying: isFlying(newVal),
      spriteUrl: url,
      visible: true
    })

    const cached = shadowStore.feetCache.get(url)
    if (cached) {
      stableEnemyGroundY.value = `${cached.feetY * 100}%`
    }
    
    isEnemyShadowReady.value = true // Desbloqueamos visibilidad
  }
}, { immediate: true })

watch(() => player.value, async (newVal) => {
  if (newVal) {
    const url = getAssetUrl(ASSET_TYPES.POKEMON, newVal.id, { isShiny: newVal.isShiny, isBack: true })
    const shadowId = getStableShadowId(newVal, 'player')
    currentPlayerShadowKey.value = shadowId

    await shadowStore.requestShadow(shadowId, {
      side: 'player',
      entityX: p1Pos.value.x,
      entityY: p1Pos.value.y,
      entitySize: ENTITY_SIZE_PLAYER,
      isFlying: isFlying(newVal),
      spriteUrl: url,
      visible: true
    })

    const cached = shadowStore.feetCache.get(url)
    if (cached) {
      stablePlayerGroundY.value = `${cached.feetY * 100}%`
    }
  }
}, { immediate: true })


// Función para pre-detectar coordenadas antes de empezar la intro
const preloadCombatCoords = async () => {
  isPreloadingFeet.value = true
  const tasks = []
  
  if (player.value) {
    const shadowId = getStableShadowId(player.value, 'player')
    currentPlayerShadowKey.value = shadowId
    
    const url = getAssetUrl(ASSET_TYPES.POKEMON, player.value.id, { isShiny: player.value.isShiny, isBack: true })
    // requestShadow ya maneja la lógica de caché y detección interna
    tasks.push(shadowStore.requestShadow(shadowId, {
      side: 'player',
      entityX: p1Pos.value.x,
      entityY: p1Pos.value.y,
      entitySize: ENTITY_SIZE_PLAYER,
      isFlying: isFlying(player.value),
      spriteUrl: url,
      visible: true // Forzamos visibilidad inicial para que el computed de arbustos lo tome
    }))
  }
  
  if (activeEnemyData.value) {
    const shadowId = getStableShadowId(activeEnemyData.value, 'enemy')
    currentEnemyShadowKey.value = shadowId

    const url = activeEnemyImageUrl.value
    tasks.push(shadowStore.requestShadow(shadowId, {
      side: 'enemy',
      entityX: p2Pos.value.x,
      entityY: p2Pos.value.y,
      entitySize: ENTITY_SIZE_ENEMY,
      isFlying: isFlying(activeEnemyData.value),
      spriteUrl: url,
      visible: true
    }))
  }

  if (tasks.length > 0) {
    // Esperamos a que todos los detectFeetPoints (disparados por requestShadow) terminen
    await Promise.all(tasks).catch(err => console.warn('[BATTLE] Feet preloading failed:', err))
  }
  
  isPreloadingFeet.value = false
}

function getStableShadowId(pokemon, side) {
  if (!pokemon) return null
  
  // Prioridad absoluta al UID (Unique ID) de la instancia del pokemon.
  // Esto permite que si hay 2 Charizards en el mismo bando, cada uno tenga su propia sombra única.
  if (pokemon.uid) return `shadow_${pokemon.uid}`
  
  // Fallback para casos de debug o datos estáticos que no tengan UID.
  // Usamos el bando para evitar colisiones entre el jugador y el enemigo.
  return `${side}_${pokemon.id}`
}


// Sincronizar visibilidad de sombra enemiga con el store centralizado
watch([isShadowVisible, () => activeEnemyData.value, p2Pos, () => enemyAnimState.value], ([visible, data, pos, animState], oldValues) => {
  const oldData = oldValues ? oldValues[1] : null
  
  // Si el objeto Pokémon cambió (nueva instancia), matamos la sombra de la instancia anterior
  if (data !== oldData && oldData) {
    const oldId = getStableShadowId(oldData, 'enemy')
    if (oldId) {
      shadowStore.removeShadow(oldId)
    }
  }

  const shadowId = getStableShadowId(data, 'enemy')
  currentEnemyShadowKey.value = shadowId

  // Ocultar si: no es visible, no hay datos, está muerto O está en animación de captura/salida/atrapado
  if (!visible || !data || data.hp <= 0 || !!animState) {
    if (shadowId) shadowStore.hideShadow(shadowId)
    return
  }

  shadowStore.requestShadow(shadowId, {
    side: 'enemy',
    entityX: p2Pos.value.x,
    entityY: p2Pos.value.y,
    entitySize: ENTITY_SIZE_ENEMY,
    isFlying: isFlying(data),
    spriteUrl: getAssetUrl(ASSET_TYPES.POKEMON, data.id, { isShiny: data.isShiny, isBack: false }),
    precalculate: true,
    visible: true
  })
}, { immediate: true, deep: true })

// Sincronizar visibilidad de sombra del jugador
watch([() => player.value, p1Pos, () => playerAnimState.value], ([newVal, pos, animState], oldValues) => {
  const oldVal = oldValues ? oldValues[0] : null
  
  if (newVal !== oldVal && oldVal) {
    const oldId = getStableShadowId(oldVal, 'player')
    if (oldId) {
      shadowStore.removeShadow(oldId)
    }
  }

  const shadowId = getStableShadowId(newVal, 'player')
  currentPlayerShadowKey.value = shadowId

  if (!newVal || newVal.hp <= 0 || !!animState) {
    if (shadowId) shadowStore.hideShadow(shadowId)
    return
  }

  shadowStore.requestShadow(shadowId, {
    side: 'player',
    entityX: p1Pos.value.x,
    entityY: p1Pos.value.y,
    entitySize: ENTITY_SIZE_PLAYER,
    isFlying: isFlying(newVal),
    spriteUrl: getAssetUrl(ASSET_TYPES.POKEMON, newVal.id, { isShiny: newVal.isShiny, isBack: true }),
    precalculate: true,
    visible: true
  })
}, { immediate: true, deep: true })

// Limpiar estados de animación cuando el combate termina o se inicia una nueva búsqueda
watch([() => battle.value?.over, isSearching], ([isOver, searching]) => {
  if (isOver || searching) {
    isWildEntryAnimation.value = false
    isWildSilhouette.value = false
    wildRevealActive.value = false
    isEmerging.value = false
    upcomingIsEmerging.value = false
    isWildSilhouetteHalfway.value = false
  }
}, { immediate: true })

onMounted(async () => {
  shadowStore.clearAll()
  await preloadCombatCoords()
})

onUnmounted(() => {
  shadowStore.clearAll()
})

watch(isIntroInProgress, (val) => {
  battleStore.isIntroAnimating = val
}, { immediate: true })

// Watcher de seguridad para asegurar que la animación inicie si el combate carga después del mount
watch(() => battle.value, (newBattle) => {
  if (newBattle && !newBattle.over && !newBattle.isTrainer && !newBattle.isGym && !isSearching.value && !wildRevealActive.value) {
    triggerWildEmergence()
  }
}, { immediate: true })

const shouldShowEncounterLayers = computed(() => {
  // BLOQUEO: Durante la animación física de la bola, no mostramos arbustos
  if (enemyAnimState.value || isCaptureSequenceActive.value) return false

  // Prioridad: Fases de búsqueda y transición salvaje
  if (isSearching.value || isWildEntryAnimation.value || wildRevealActive.value || !!upcomingPokemon.value) return true
  
  // Usamos el módulo de finalización unificado
  if (isFinishing.value) return true
  
  return false
})

const skipBushesFade = ref(false)
const bushTransitionName = computed(() => {
  // Mantener el fade durante todo el proceso de búsqueda e intro salvaje para evitar parpadeos
  if (isSearching.value || !!upcomingPokemon.value || isWildEntryAnimation.value || wildRevealActive.value) return 'fade'
  return ''
})

watch([shouldShowEncounterLayers, isSearching], ([newLayers, newSearching], [oldLayers, oldSearching]) => {
  if ((newLayers && oldLayers && newSearching !== oldSearching) || (newLayers && !oldLayers)) {
    skipBushesFade.value = true
    setTimeout(() => { skipBushesFade.value = false }, 300)
  }
})

// Observar cambios en el modo búsqueda para sincronizar estados de silueta
watch(isSearching, (newVal, oldVal) => {
  if (newVal) {
    // Si empezamos a buscar, forzamos silueta y nos aseguramos de que no haya animaciones de entrada activas
    isWildSilhouette.value = true
    isWildEntryAnimation.value = false
    wildRevealActive.value = false
    isEmerging.value = false
    
    // Si se inicia una búsqueda, liberamos cualquier snapshot de captura previo
    caughtPokemonSnapshot.value = null
    isCaptureSequenceActive.value = false
  } else if (oldVal && !newVal && isWildEncounter.value && isInitialLoad.value) {
    // Solo actuar si estamos en carga inicial y pasamos a falso (combate directo)
    isWildSilhouette.value = true
    isWildEntryAnimation.value = true
  }
})

watch(() => battleStore.upcomingPokemon, (newVal) => {
  if (newVal) {
    upcomingIsEmerging.value = true
    setTimeout(() => { upcomingIsEmerging.value = false }, 100)
  }
}, { immediate: true })

// Animation state for energy effects
const playerAnimSeed = Math.random()
const enemyAnimSeed = Math.random()
const _animSeed = Math.random()

const grassIsBakedIn = ref(false)

const handleGrassLoad = (e) => {
  const src = e.target.src
  const cycleSuffixes = ['_noche', '_atardecer', '_amanecer', '_dia']
  grassIsBakedIn.value = cycleSuffixes.some(s => src.includes(s)) && !src.includes('tall-grass')
}

const handleGrassError = (e) => {
  const defaultUrl = getAssetUrl(ASSET_TYPES.ENVIRONMENT, 'tall-grass')
  if (e.target.src && !e.target.src.endsWith(defaultUrl)) {
    e.target.src = defaultUrl
    grassIsBakedIn.value = false
  }
}

const playerTrainerSpriteUrl = computed(() => {
  const classId = gameStore.state.playerClass || 'entrenador'
  const classDef = PLAYER_CLASSES[classId]
  const spriteId = classDef?.showdownSpriteId || 'red-lgpe'
  return getAssetUrl(ASSET_TYPES.TRAINER, spriteId)
})

const handleBackgroundError = (e) => {
  const currentSrc = e.target.src
  if (currentSrc.includes('_')) {
    const baseSrc = currentSrc.substring(0, currentSrc.lastIndexOf('_')) + '.webp'
    if (baseSrc !== currentSrc) {
      e.target.src = baseSrc
    }
  }
}

const getAttackAnimClass = (side) => {
  if (battleStore.attackerSide !== side || !battleStore.activeMove) return ''
  const move = battleStore.activeMove
  if (move.side !== side) return ''
  if (move.cat === 'physical') return 'atk-physical'
  if (move.cat === 'special') return 'atk-special'
  if (move.cat === 'status') return 'atk-status'
  return 'atk-default'
}


// OBJECT_SCALE se obtiene destructurado de useCombatCamera arriba

const p1VirtualStyle = computed(() => {
  // Ahora el Pokémon ocupa toda la zona roja (400x400)
  return {
    width: '100%',
    height: '100%'
  }
})

const p2VirtualStyle = computed(() => {
  return {
    width: '100%',
    height: '100%'
  }
})





const computedWeather = computed(() => {
  if (mapStore.globalWeather) return mapStore.globalWeather
  return getRouteWeather(battle.value?.locationId || 'route1', mapStore.currentSeason.id, mapStore.currentEpochHour)
})

const p1NaturalSize = ref({ w: 0, h: 0 })
const p2NaturalSize = ref({ w: 0, h: 0 })

const handleP1Load = (e) => {
  p1NaturalSize.value = { w: e.target.naturalWidth, h: e.target.naturalHeight }
}
const handleP2Load = (e) => {
  p2NaturalSize.value = { w: e.target.naturalWidth, h: e.target.naturalHeight }
}

let playerAnimTimeout = null
let enemyAnimTimeout = null

onMounted(() => {
  shadowStore.clearAll()
  catchSparkles.value = [] // Limpiar partículas residuales de combates previos
  preloadCombatCoords()

  // Listen for energy animation commands
  gameBus.on('PLAY_RELEASE_ENERGY', (e) => handleReleaseRequest(e.detail || e))
  gameBus.on('PLAY_CATCH_ENERGY', (e) => handleCatchRequest(e.detail || e))
  gameBus.on('CATCH_SHAKE', (e) => {
    const detail = e.detail || e
    const side = detail?.side || detail
    if (side === 'player') {
      playerIsShaking.value = false
      nextTick(() => { playerIsShaking.value = true })
      setTimeout(() => { playerIsShaking.value = false }, 600)
    } else {
      enemyIsShaking.value = false
      nextTick(() => { enemyIsShaking.value = true })
      setTimeout(() => { enemyIsShaking.value = false }, 600)
    }
  })
  gameBus.on('CATCH_SUCCESS', (e) => {
    const detail = e.detail || e
    const side = detail?.side || detail
    
    // Iniciar secuencia de éxito
    isCaptureSequenceActive.value = true
    caughtPokemonSnapshot.value = enemy.value ? { ...enemy.value } : null
    triggerCatchSparkles(side)
    
    // Esperar 1.2 segundos antes de limpiar y permitir modo preview
    setTimeout(() => {
      if (side === 'player') playerAnimState.value = null
      else enemyAnimState.value = null
      isCaptureSequenceActive.value = false
      caughtPokemonSnapshot.value = null // Liberar persistencia
    }, 1200)
  })
  gameBus.on('PLAY_WITHDRAW', (e) => handleCatchRequest(e.detail || e))
  gameBus.on('PLAY_SEND_OUT', (e) => handleReleaseRequest(e.detail || e))

  // Trigger for start battle
  gameBus.on('START_BATTLE', (e) => {
    const { isTrainer, isGym, animationPhase } = e.detail || e
    const wasAlreadySearching = animationPhase === 3 || (animationPhase === undefined && (isSearching.value || !!upcomingPokemon.value))
    
    // Player release: solo si no hay ya un pokemon activo (para evitar dobles animaciones en debug)
    if (!player.value || player.value.hp <= 0 || !wasAlreadySearching) {
      setTimeout(() => handleReleaseRequest({ side: 'player' }), 100)
    }
    
    if (isTrainer || isGym) {
      setTimeout(() => handleReleaseRequest({ side: 'enemy' }), 200)
    } else {
      // Si el evento pide Fase 3 o ya estábamos buscando, ejecutamos Fase 3 (revelación)
      if (wasAlreadySearching || animationPhase === 3) revealWildPokemon(false)
      // Si el evento pide Fase 1 o no hay estado previo, ejecutamos Fase 1 (salto)
      else triggerWildEmergence()
    }
  })

  gameBus.on('PLAY_WILD_EMERGENCE', () => triggerWildEmergence())

  // Initial check on mount
  if (battle.value && !battle.value.over) {
    const isTrainer = battle.value.isTrainer || battle.value.isGym
    handleReleaseRequest({ side: 'player' })
    if (isTrainer) handleReleaseRequest({ side: 'enemy' })
    else triggerWildEmergence()
  }

  // Allow transitions after initial mount
  setTimeout(() => { isInitialLoad.value = false }, 100)
})

const triggerCatchSparkles = (side) => {
  const count = 6 // Cantidad reducida para mayor elegancia
  const newSparkles = []
  
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2
    const dist = 60 + Math.random() * 40 // Radio reducido para que no sean gigantes
    newSparkles.push({
      id: Date.now() + i,
      tx: Math.cos(angle) * dist + 'px',
      ty: Math.sin(angle) * dist + 'px',
      delay: (Math.random() * 0.1) + 's',
      side
    })
  }
  
  catchSparkles.value = [...catchSparkles.value, ...newSparkles]
  setTimeout(() => {
    catchSparkles.value = catchSparkles.value.filter(s => !newSparkles.includes(s))
  }, 1000)
}

const handleCatchRequest = (detail) => {
  const side = detail?.side || (typeof detail === 'string' ? detail : null)
  if (!side) return

  // Limpiar partículas previas para este bando al iniciar nuevo intento
  catchSparkles.value = catchSparkles.value.filter(s => s.side !== side)

  // Resolver el ID del sprite usando la base de datos de ítems
  const rawBallId = detail?.ballId || 'pokeball'
  const itemData = getItemByName(rawBallId)
  const ballId = itemData?.sprite || rawBallId.toLowerCase().replace(/\s/g, '')

  if (side === 'player') {
    playerAnimState.value = 'catching'
    playerTrappedBallId.value = ballId
    clearTimeout(playerAnimTimeout)
    playerAnimTimeout = setTimeout(() => { playerAnimState.value = 'trapped' }, 800)
  } else {
    enemyAnimState.value = 'catching'
    enemyTrappedBallId.value = ballId
    clearTimeout(enemyAnimTimeout)
    enemyAnimTimeout = setTimeout(() => { 
      enemyAnimState.value = 'trapped' 
      // Nota: No quitamos el estado trapped automáticamente aquí si es captura exitosa,
      // ya que battleItems se encarga de la secuencia de shakes y el resultado final.
    }, 800)
  }
}

const handleReleaseRequest = (detail) => {
  const side = detail?.side || (typeof detail === 'string' ? detail : null)
  if (!side) return

  // Resolver el ID del sprite de la Poké Ball para la animación de salida
  // Fallback: Si no viene en el evento, intentamos usar la que ya estaba "trapped" (útil para escapes)
  const currentTrapped = side === 'player' ? playerTrappedBallId.value : enemyTrappedBallId.value
  const rawBallId = detail?.ballId || currentTrapped || 'pokeball'
  const itemData = getItemByName(rawBallId)
  const ballId = itemData?.sprite || rawBallId.toLowerCase().replace(/\s/g, '')

  // Intentar pre-posicionar la bola si tenemos datos en caché
  const pokemon = side === 'player' ? player.value : activeEnemyData.value
  if (pokemon) {
    const url = getAssetUrl(ASSET_TYPES.POKEMON, pokemon.id, { isShiny: pokemon.isShiny, isBack: side === 'player' })
    const cached = shadowStore.feetCache?.get?.(url)
    if (cached) {
      const coords = { 
        top: `${cached.feetY * 100}%`, 
        left: `${cached.feetX * 100}%` 
      }
      if (side === 'player') stickyPlayerCoords.value = coords
      else stickyEnemyCoords.value = coords
    }
  }

  if (side === 'player') {
    playerAnimState.value = 'releasing'
    playerTrappedBallId.value = ballId // Asignar la bola específica del pokemon que sale
    clearTimeout(playerAnimTimeout)
    playerAnimTimeout = setTimeout(() => { playerAnimState.value = null }, 800)
  } else {
    enemyAnimState.value = 'releasing'
    enemyTrappedBallId.value = ballId // Asignar la bola específica del pokemon que sale
    clearTimeout(enemyAnimTimeout)
    enemyAnimTimeout = setTimeout(() => { enemyAnimState.value = null }, 800)
  }
}

</script>

<template>
  <div
    ref="arenaRef"
    class="battle-arena"
  >
    <div
      class="camera-frame"
      :style="cameraStyles"
    >
      <VirtualSpace
        :show-guides="showGuides"
        :world-styles="worldStyles"
      >
        <!-- Background Layer -->
        <div class="battle-arena-content">
          <img
            :src="bgData.url"
            class="arena-bg"
            :style="bgData.isBakedIn ? atmosphere?.weatherOnlyStyles : atmosphere?.atmosphereStyles"
            alt="Battle Background"
            @error="handleBackgroundError"
          >
        </div>

        <!-- Sprites Layer -->
        <div class="battle-sprites">
          <!-- Enemy Side (Player 2) -->
          <VirtualEntity
            class="combatant-sprite enemy-side-sprite"
            :x="p2Pos.x"
            :y="p2Pos.y"
            :w="BASE_ENTITY_SIZE_ENEMY"
            :h="BASE_ENTITY_SIZE_ENEMY"
          >
            <!-- Encounter Layers - BACK (behind pokemon) -->
            <Transition :name="bushTransitionName">
              <div
                v-if="shouldShowEncounterLayers"
                class="encounter-layers-back"
                :style="grassIsBakedIn ? atmosphere?.weatherOnlyStyles : atmosphere?.atmosphereStyles"
              >
                <div
                  v-show="!activeEnemyIsFloating"
                  class="searching-bushes back"
                >
                  <div
                    class="bush-container-ground"
                    :style="{ top: enemyGroundY }"
                  >
                    <div class="bush-wrapper bush-back-1">
                      <img
                        :src="getAssetUrl(ASSET_TYPES.ENVIRONMENT, `${battle.locationId}_tallgrass`)"
                        class="pixel-bush"
                        @load="handleGrassLoad"
                        @error="handleGrassError"
                      >
                    </div>
                    <div class="bush-wrapper bush-back-2">
                      <img
                        :src="getAssetUrl(ASSET_TYPES.ENVIRONMENT, `${battle.locationId}_tallgrass`)"
                        class="pixel-bush"
                        @load="handleGrassLoad"
                        @error="handleGrassError"
                      >
                    </div>
                    <div class="bush-wrapper bush-back-3">
                      <img
                        :src="getAssetUrl(ASSET_TYPES.ENVIRONMENT, `${battle.locationId}_tallgrass`)"
                        class="pixel-bush"
                        @load="handleGrassLoad"
                        @error="handleGrassError"
                      >
                    </div>
                    <div class="bush-wrapper bush-back-4">
                      <img
                        :src="getAssetUrl(ASSET_TYPES.ENVIRONMENT, `${battle.locationId}_tallgrass`)"
                        class="pixel-bush"
                        @load="handleGrassLoad"
                        @error="handleGrassError"
                      >
                    </div>
                    <div class="bush-wrapper bush-back-5">
                      <img
                        :src="getAssetUrl(ASSET_TYPES.ENVIRONMENT, `${battle.locationId}_tallgrass`)"
                        class="pixel-bush"
                        @load="handleGrassLoad"
                        @error="handleGrassError"
                      >
                    </div>
                  </div>
                </div>
              </div>
            </Transition>


            <div
              class="sprite-animator"
              :class="[{ 
                'fainted': isDefeated(activeEnemyData) && !isSearching && !isWildEntryAnimation && !isWildSilhouette && isWildEncounter, 
                'is-attacking': battleStore.attackerSide === 'enemy', 
                'is-emerging': isEmerging
              }, getAttackAnimClass('enemy')]"
            >
              <!-- Sombra individual integrada en el animador para seguir ataques -->
              <CombatShadow 
                v-if="currentEnemyShadowKey" 
                :shadow-id="currentEnemyShadowKey" 
                :style="{ '--shadow-y': enemyGroundY }"
              />


              <div
                class="sprite-rotation-layer"
                :class="[getAttackAnimClass('enemy'), { 'is-floating-species': activeEnemyIsFloating }]"
              >
                <div
                  v-if="enemy?.hp <= 0 && battle.isTrainer"
                  class="trainer-battle-sprite"
                >
                  <img
                    :src="enemyTrainerSpriteUrl"
                    class="trainer-image"
                    @error="e => e.target.style.display = 'none'"
                  >
                </div>

                <div
                   v-else-if="activeEnemyData && isEnemyShadowReady"
                  class="sprite-idle-wrapper" 
                  :class="[{ 
                    'combatant-idle-subtle': !enemyAnimState, 
                    'is-floating-species': activeEnemyIsFloating, 
                    'energy-catching': enemyAnimState === 'catching', 
                    'energy-releasing': enemyAnimState === 'releasing' 
                  }]" 
                  :style="{ 
                    animationDelay: `calc(${enemyAnimSeed} * -3s)`, 
                    '--idle-dist': activeEnemyIsFloating ? '-12px' : '-3px',
                    '--shadow-y': enemyGroundY
                  }"
                >
                  <PVSpriteFX
                    v-if="enemyAnimState !== 'trapped'"
                    :is-shiny="activeEnemyData.isShiny"
                    :is-guardian="activeEnemyData.isGuardian"
                    :vibrant="true"
                    :style="p2VirtualStyle"
                  >
                    <img
                      :key="activeEnemyData.id" 
                      class="pokemon-combat-image"
                      :class="{ 
                        'is-silhouette': activeEnemyIsSilhouette,
                        'is-emerging-anim': upcomingIsEmerging || isEmerging
                      }" 
                      :src="activeEnemyImageUrl" 
                      @load="handleP2Load"
                      @error="e => e.target.style.display = 'none'"
                    >
                  </PVSpriteFX>
                  
                  <!-- Guía de tamaño real (Debug) -->
                  <div 
                    v-if="showGuides && p2NaturalSize.w > 0" 
                    class="guide-real-size"
                    :style="{ width: p2NaturalSize.w + 'px', height: p2NaturalSize.h + 'px' }"
                  >
                    <span>{{ p2NaturalSize.w }}x{{ p2NaturalSize.h }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Poké Ball visual as independent world object (Fixed to ground) -->
            <Transition name="ball-fade">
              <div
                v-if="enemyAnimState === 'trapped' || enemyAnimState === 'catching' || enemyAnimState === 'releasing' || enemyAnimState === 'capturando'"
                :key="`ball-enemy-${battle?.enemy?.uid || battle?.enemy?.id}`"
                class="trapped-pokeball"
                :class="{ 'is-shaking': enemyIsShaking }"
                :style="stickyEnemyCoords"
              >
                <img :src="getAssetUrl(ASSET_TYPES.ITEM, enemyTrappedBallId)" alt="Pokeball">
                
                <!-- Shadow for the ball -->
                <div class="pokeball-shadow" :style="{ backgroundImage: pokeballShadowUrl }"></div>

                <!-- Success Sparkles -->
                <div v-if="catchSparkles.some(s => s.side === 'enemy')" class="catch-success-sparkles">
                  <span
                    v-for="s in catchSparkles.filter(s => s.side === 'enemy')"
                    :key="s.id"
                    class="sparkle"
                    :style="{ '--tx': s.tx, '--ty': s.ty, 'animation-delay': s.delay }"
                  >✨</span>
                </div>
              </div>
            </Transition>


            <!-- Encounter Layers - FRONT (in front of pokemon) -->
            <Transition :name="bushTransitionName">
              <div
                v-if="shouldShowEncounterLayers && isEnemyShadowReady"
                class="encounter-layers-front"
                :style="grassIsBakedIn ? atmosphere?.weatherOnlyStyles : atmosphere?.atmosphereStyles"
              >
                <div
                  v-show="!activeEnemyIsFloating"
                  class="searching-bushes front"
                >
                  <div
                    class="bush-container-ground"
                    :style="{ top: enemyGroundY }"
                  >
                    <div class="bush-wrapper bush-front-1">
                      <img
                        :src="getAssetUrl(ASSET_TYPES.ENVIRONMENT, `${battle.locationId}_tallgrass`)"
                        class="pixel-bush"
                        @load="handleGrassLoad"
                        @error="handleGrassError"
                      >
                    </div>
                    <div class="bush-wrapper bush-front-2">
                      <img
                        :src="getAssetUrl(ASSET_TYPES.ENVIRONMENT, `${battle.locationId}_tallgrass`)"
                        class="pixel-bush"
                        @load="handleGrassLoad"
                        @error="handleGrassError"
                      >
                    </div>
                    <div class="bush-wrapper bush-front-3">
                      <img
                        :src="getAssetUrl(ASSET_TYPES.ENVIRONMENT, `${battle.locationId}_tallgrass`)"
                        class="pixel-bush"
                        @load="handleGrassLoad"
                        @error="handleGrassError"
                      >
                    </div>
                  </div>
                </div>
              </div>
            </Transition>
          </VirtualEntity>

          <!-- Player Side (Player 1) -->
          <VirtualEntity
            class="combatant-sprite player-side-sprite"
            :x="p1Pos.x"
            :y="p1Pos.y"
            :w="BASE_ENTITY_SIZE_PLAYER"
            :h="BASE_ENTITY_SIZE_PLAYER"
          >
            <div
              class="sprite-animator"
              :class="[{ 
                'fainted': player.hp <= 0 && isWildEncounter && false, // Jugador nunca hace faint salvaje
                'is-attacking': battleStore.attackerSide === 'player' 
              }, getAttackAnimClass('player')]"
            >
              <!-- Sombra individual integrada para seguir ataques -->
              <CombatShadow 
                v-if="currentPlayerShadowKey" 
                :shadow-id="currentPlayerShadowKey" 
                :style="{ '--shadow-y': playerGroundY }"
              />

              <div
                class="sprite-rotation-layer"
                :class="[getAttackAnimClass('player'), { 'is-floating-species': activePlayerIsFloating }]"
              >
                <div
                  v-if="player.hp <= 0 && false"
                  class="trainer-battle-sprite"
                >
                  <img
                    :src="playerTrainerSpriteUrl"
                    class="trainer-image"
                    @error="e => e.target.style.display = 'none'"
                  >
                </div>
                <div
                  v-else
                  class="sprite-idle-wrapper"
                  :class="[{ 
                    'combatant-idle-subtle': !playerAnimState, 
                    'is-floating-species': isFlying(player), 
                    'energy-catching': playerAnimState === 'catching' || player.hp <= 0, 
                    'energy-releasing': playerAnimState === 'releasing' 
                  }]"
                  :style="{ animationDelay: `calc(${playerAnimSeed} * -3s)`, '--idle-dist': isFlying(player) ? '-12px' : '-3px', '--shadow-y': playerGroundY }"
                >
                  <PVSpriteFX
                    v-if="playerAnimState !== 'trapped'"
                    :is-shiny="player.isShiny"
                    :is-guardian="player.isGuardian"
                    :vibrant="true"
                    :sparkle-count="8"
                    :style="p1VirtualStyle"
                  >
                    <img
                      class="pokemon-combat-image"
                      :src="getAssetUrl(ASSET_TYPES.POKEMON, player.id, { isShiny: player.isShiny, isBack: true })"
                      @load="handleP1Load"
                      @error="e => e.target.style.display = 'none'"
                    >
                  </PVSpriteFX>

                  <!-- Guía de tamaño real (Debug) -->
                  <div 
                    v-if="showGuides && p1NaturalSize.w > 0" 
                    class="guide-real-size"
                    :style="{ width: p1NaturalSize.w + 'px', height: p1NaturalSize.h + 'px' }"
                  >
                    <span>{{ p1NaturalSize.w }}x{{ p1NaturalSize.h }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Poké Ball visual as independent world object -->
            <Transition name="ball-fade">
              <div
                v-if="playerAnimState === 'trapped' || playerAnimState === 'catching' || playerAnimState === 'releasing' || playerAnimState === 'capturando'"
                :key="`ball-player-${player?.uid || player?.id}`"
                class="trapped-pokeball"
                :class="{ 'is-shaking': playerIsShaking }"
                :style="stickyPlayerCoords"
              >
                <img :src="getAssetUrl(ASSET_TYPES.ITEM, playerTrappedBallId)" alt="Pokeball">
                
                <!-- Shadow for the ball -->
                <div class="pokeball-shadow" :style="{ backgroundImage: pokeballShadowUrl }"></div>
              </div>
            </Transition>

          </VirtualEntity>
        </div>
      </VirtualSpace>
    </div>

    <!-- Atmosphere remains relative to battle-arena (Viewport) or camera-frame? 
         Documentation says MAP covers the atmosphere. But AtmosphereLayer usually has its own fixed/absolute positioning.
         I'll keep it outside the virtual world to ensure it scales with the viewport if needed, 
         or inside if it should follow the camera. 
         Atmosphere is usually "fullscreen" relative to the arena.
    -->
    <AtmosphereLayer
      ref="atmosphere"
      :weather="computedWeather"
      :cycle="mapStore.currentCycle"
      :season="mapStore.currentSeason.id"
      :is-performance-mode="uiStore.isPerformanceMode"
      :z-index="'calc(var(--z-base) + 20)'"
      :seed="(battle?.locationId || 'route1').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)"
    />

    <!-- HUD Layer (Fixed to Viewport) -->
    <div class="battle-info-container">
      <Transition name="hud-fade">
        <div 
          v-if="enemy && enemy.hp > 0 && isEnemyShadowReady && !isSearching && enemyAnimState !== 'trapped' && enemyAnimState !== 'catching' && enemyAnimState !== 'capturando' && !battleStore.state?.isCapture" 
          class="combatant-info-wrap enemy-side"
          :key="enemy.uid || enemy.id"
        >
          <BattleInfoCard :pokemon="enemy" />
        </div>
      </Transition>

      <Transition name="hud-fade">
        <div 
          v-if="player && player.hp > 0" 
          class="combatant-info-wrap player-side"
          :key="player.uid || player.id"
        >
          <BattleInfoCard
            :pokemon="player"
            :is-player="true"
            :nick-style="gs.nick_style"
          />
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.battle-arena {
  position: relative;
  width: 100%;
  flex: 1;
  width: 100%;
  background: $black;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 30px Rgba(0,0,0,0.5);

  @media (min-width: 1360px) {
    grid-area: arena;
    height: 100%;
  }
}

.battle-arena-content {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.arena-bg {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  object-fit: cover;
  z-index: calc(var(--z-base) + 1);
  image-rendering: pixelated !important;
}

.battle-sprites {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: calc(var(--z-base) + 10);
  overflow: visible;
}

.battle-info-container {
  position: absolute;
  inset: 0;
  z-index: calc(var(--z-base) + 30);
  padding: 4cqw;
  display: flex;
  flex-direction: column;
  pointer-events: none;

  @media (max-width: 600px) { padding: 2cqw; }
}

.combatant-info-wrap { pointer-events: auto; }

.combatant-sprite {
  display: Flex;
  align-items: flex-end;
  justify-content: Center;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  image-rendering: pixelated;
  overflow: visible;

  // Garantizar que todas las capas internas llenen el contenedor 400x400
  .sprite-animator, 
  .sprite-rotation-layer, 
  .sprite-idle-wrapper,
  :deep(.pv-fx-wrapper) {
    width: 100% !important;
    height: 100% !important;
    display: flex;
    align-items: center; // Cambiado a center por solicitud de usuario
    justify-content: center;
  }

  .pokemon-combat-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: center; // Cambiado a center
    transition: filter 0.3s ease;
    image-rendering: pixelated;
    &.is-silhouette { filter: Brightness(0) Drop-Shadow(0 0 2px Rgba(255, 255, 255, 0.8)) !important; }
  }
}

.guide-real-size {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: TranslateX(-50%);
  border: 1px dashed Rgba(255, 255, 255, 0.5);
  background: Rgba(255, 255, 255, 0.1);
  pointer-events: none;
  z-index: var(--z-hud);
  display: flex;
  align-items: center;
  justify-content: center;

  span {
    @include pixelated;
    font-size: 8px;
    color: white;
    background: black;
    padding: 2px;
    opacity: 0.8;
  }
}

.sprite-animator {
  position: relative;
  z-index: var(--z-map-spawns);
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: visible;

  &.atk-default.is-attacking, &.atk-physical.is-attacking { animation: attack-dash-enemy 0.4s ease-out; }
  &.atk-special.is-attacking { animation: attack-pulse-enemy 0.4s ease-out; }

  .player-side-sprite & {
    &.atk-default.is-attacking, &.atk-physical.is-attacking { animation: attack-dash-player 0.4s ease-out; }
    &.atk-special.is-attacking { animation: attack-pulse-player 0.4s ease-out; }
  }

  &.fainted {
    .sprite-idle-wrapper {
      opacity: 0;
      transform: TranslateY(20px);
      transition: all 0.5s;
      filter: Grayscale(1) Brightness(0.5);
      pointer-events: none;
    }
  }

  &.is-emerging, .is-emerging-anim {
    animation: emerge-bounce 1.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
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
    margin-bottom: 25px; 
    @media (max-width: 690px) { margin-bottom: 12px; } 
  }

  &.atk-status { 
    animation: attack-status-enemy 0.4s ease-out; 
    .player-side-sprite & { animation: attack-status-player 0.4s ease-out; }
  }
}

// --- ENERGY ANIMATIONS (GENERALIZED) ---
.energy-catching {
  animation: energy-catch 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
  transform-origin: 50% var(--shadow-y, 90%);
  pointer-events: none;
}

.energy-releasing {
  animation: energy-release 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards !important;
  transform-origin: 50% var(--shadow-y, 90%);
}

@keyframes energy-catch {
  0% { filter: none; transform: Scale(1); opacity: 1; }
  25% { filter: Brightness(0) Invert(1) Drop-Shadow(0 0 10px #00ccff); transform: Scale(1.05); }
  100% { filter: Brightness(0) Invert(1) Drop-Shadow(0 0 20px #00ccff); transform: Scale(0); opacity: 1; }
}

@keyframes energy-release {
  0% { filter: Brightness(0) Invert(1) Drop-Shadow(0 0 20px #00ccff); transform: Scale(0); opacity: 1; }
  75% { filter: Brightness(0) Invert(1) Drop-Shadow(0 0 10px #00ccff); transform: Scale(1.1); }
  100% { filter: none; transform: Scale(1); opacity: 1; }
}

.trainer-battle-sprite {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 2%;
  animation: trainer-emerge 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  .trainer-image { width: 100%; height: 100%; object-fit: contain; object-position: bottom; image-rendering: pixelated; }
}

@keyframes trainer-emerge { 0% { transform: TranslateY(20px); opacity: 0; } 100% { transform: TranslateY(0); opacity: 1; } }

.pv-shadow {
  position: absolute;
  left: 50%;
  transform: TranslateX(-50%) TranslateY(-50%);
  width: 70%; 
  height: calc(var(--obj-scale, 1) * 15px); 
  z-index: calc(var(--z-base) - 1);
  pointer-events: none;
  background-size: 100% 100%; 
  background-repeat: no-repeat; 
  background-position: center;
  image-rendering: pixelated;
  filter: none;
  // La posición top se inyecta inline vía pXShadowStyle
}

.sprite-idle-wrapper { width: 100%; height: 100%; display: Flex; align-items: flex-end; justify-content: Center; }

.combatant-idle-subtle { animation: combatant-idle-subtle 3s infinite ease-in-out !important; }

@keyframes combatant-idle-subtle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(var(--idle-dist, -6px)); } }

@keyframes attack-dash-player { 0% { transform: Translate(0, 0); } 25% { transform: Translate(50px, -50px); } 100% { transform: Translate(0, 0); } }
@keyframes attack-dash-enemy { 0% { transform: Translate(0, 0); } 25% { transform: Translate(-50px, 50px); } 100% { transform: Translate(0, 0); } }
@keyframes attack-pulse-player { 0% { transform: Scale(1); } 30% { transform: Scale(1.15) Translate(10px, -10px); filter: Brightness(1.3); } 100% { transform: Scale(1); } }
@keyframes attack-pulse-enemy { 0% { transform: Scale(1); } 30% { transform: Scale(1.15) Translate(-10px, 10px); filter: Brightness(1.3); } 100% { transform: Scale(1); } }
@keyframes attack-status-player { 0% { transform: Rotate(0deg); } 30% { transform: Rotate(10deg) Scale(1.1); } 100% { transform: Rotate(0deg); } }
@keyframes attack-status-enemy { 0% { transform: Rotate(0deg); } 30% { transform: Rotate(-10deg) Scale(1.1); } 100% { transform: Rotate(0deg); } }

.enemy-side { align-self: flex-start; }
.player-side { align-self: flex-end; margin-top: auto; }

.encounter-layers-back, .encounter-layers-front, .upcoming-preview-container {
  position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible;
}

.encounter-layers-back { z-index: calc(var(--z-map-spawns) - 5); }
.encounter-layers-front { z-index: calc(var(--z-map-spawns) + 5); }
.upcoming-preview-container { z-index: var(--z-map-spawns); }

.searching-bushes, .upcoming-preview {
  position: absolute; inset: 0; display: flex; align-items: flex-end; justify-content: center; pointer-events: none;
  overflow: visible;
}

.searching-bushes {
  &.back { opacity: 1; }
  &.front { }
  
  .bush-container-ground {
    position: absolute;
    left: 50%;
    transform: TranslateX(-50%) TranslateY(-85%);
    width: 100%;
    height: 0;
    pointer-events: none;
    display: flex;
    justify-content: center;
    align-items: flex-end;
  }
}

.bush-wrapper {
  position: absolute; 
  width: calc(var(--bush-size, 60px) * 1px);
  height: calc(var(--bush-size, 60px) * 1px);
  image-rendering: pixelated;
  
  &.bush-front-1 { transform: Translate(calc(-60 * var(--obj-scale) * 1px), calc(10 * var(--obj-scale) * 1px)) Scale(1.3); z-index: calc(var(--z-map-spawns) + 1); --ad: 1.2s; --ay: 0s; }
  &.bush-front-2 { transform: Translate(calc(60 * var(--obj-scale) * 1px), calc(10 * var(--obj-scale) * 1px)) Scale(1.1); z-index: calc(var(--z-map-spawns) + 1); --ad: 1.5s; --ay: -0.4s; }
  &.bush-front-3 { transform: Translate(0px, calc(22 * var(--obj-scale) * 1px)) Scale(1.2); z-index: calc(var(--z-map-spawns) + 2); --ad: 1.8s; --ay: -0.2s; }
  
  &.bush-back-1 { transform: Translate(calc(-80 * var(--obj-scale) * 1px), calc(-10 * var(--obj-scale) * 1px)) Scale(1.0); z-index: calc(var(--z-map-spawns) - 1); --ad: 1.8s; --ay: -0.8s; }
  &.bush-back-2 { transform: Translate(calc(80 * var(--obj-scale) * 1px), calc(-10 * var(--obj-scale) * 1px)) Scale(1.2); z-index: calc(var(--z-map-spawns) - 1); --ad: 2.1s; --ay: -0.2s; }
  &.bush-back-3 { transform: Translate(0px, calc(-22 * var(--obj-scale) * 1px)) Scale(0.9); z-index: calc(var(--z-map-spawns) - 2); --ad: 1.6s; --ay: -0.5s; }
  &.bush-back-4 { transform: Translate(calc(-40 * var(--obj-scale) * 1px), calc(-17 * var(--obj-scale) * 1px)) Scale(1.1); z-index: calc(var(--z-map-spawns) - 1); --ad: 1.9s; --ay: -0.1s; }
  &.bush-back-5 { transform: Translate(calc(40 * var(--obj-scale) * 1px), calc(-17 * var(--obj-scale) * 1px)) Scale(0.95); z-index: calc(var(--z-map-spawns) - 1); --ad: 1.7s; --ay: -0.3s; }
}

.upcoming-preview {
  position: absolute; inset: 0; display: flex; align-items: flex-end; justify-content: center; z-index: calc(var(--z-base) + 11); pointer-events: none;
  .upcoming-image { 
    width: calc(var(--preview-size, 190px) * 1px);
    height: calc(var(--preview-size, 190px) * 1px);
    object-fit: contain; 
    object-position: bottom; 
    image-rendering: pixelated; 
    transition: filter 0.3s ease;
    &.is-silhouette { filter: Brightness(0) Drop-Shadow(0 0 2px Rgba(255, 255, 255, 0.8)) !important; }
    backface-visibility: hidden;
  }
}

.pixel-bush { 
  width: 100%; height: 100%; object-fit: contain; backface-visibility: hidden;
  animation: bush-wiggle var(--ad, 1.5s) infinite ease-in-out var(--ay, 0s);
  transform-origin: bottom center;
}

@keyframes bush-wiggle { 
  0%, 100% { transform: Rotate(0deg); } 
  50% { transform: Rotate(5deg); } 
}

@keyframes emerge-bounce {
  0% { transform: translateY(15px) Scale(0.8); }
  60% { transform: translateY(-10px) Scale(1.05); }
  100% { transform: translateY(0) Scale(1); }
}

.trapped-pokeball {
  position: absolute;
  left: 50%;
  transform: translateX(-50%) translateY(-85%); // Anclaje físico en la base de la bola
  width: calc(var(--obj-scale) * 40px);
  height: calc(var(--obj-scale) * 40px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-map-ui); // Estándar de capa interactiva (+10 sobre el sprite)
  pointer-events: none;
  image-rendering: pixelated;
  overflow: visible; // Permite que los sparkles salgan de la caja de 40x40

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    transform-origin: 50% 70%; // Pivote en la base de la esfera (x15 y21 para un sprite de 30x30)
  }

  &.is-shaking img {
    animation: pokeball-wobble 0.6s ease-in-out;
  }
}

.pokeball-shadow {
  position: absolute;
  top: 85%; // Sincronizado con la base de la bola
  left: 50%;
  transform: TranslateX(-50%) TranslateY(-50%);
  width: 70%;
  height: 15%; // Más aplastada verticalmente
  background-size: 100% 100%;
  background-repeat: no-repeat;
  image-rendering: pixelated;
  z-index: -1;
  pointer-events: none;
  opacity: 0.8;
}

.catch-success-sparkles {
  position: absolute;
  top: 50%;
  left: 50%;
  pointer-events: none;
  z-index: 50; // Asegurar por encima de la bola
  overflow: visible;

  .sparkle {
    position: absolute;
    top: 50%;
    left: 50%;
    font-size: calc(var(--obj-scale) * 12px); // Tamaño reducido a la mitad para mayor sutileza
    transform: Translate(-50%, -50%);
    animation: catch-sparkle-out 0.8s ease-out forwards;
    @include pixelated; // Forzar estética Retro-Modern
    text-shadow: 
      0 0 10px Rgba(255, 215, 0, 1),
      0 0 20px Rgba(255, 255, 255, 0.8),
      0 0 30px Rgba(255, 215, 0, 0.5);
    filter: Drop-Shadow(0 0 5px white);
  }
}

@keyframes catch-sparkle-out {
  0% {
    transform: Translate(-50%, -50%) Scale(0);
    opacity: 1;
  }
  20% {
    transform: Translate(-50%, -50%) Scale(2.5);
    opacity: 1;
  }
  100% {
    transform: Translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) Scale(1.2);
    opacity: 0;
  }
}

.ball-fade-enter-active, .ball-fade-leave-active { transition: opacity 0.2s ease-in-out; }
.ball-fade-enter-from, .ball-fade-leave-to { opacity: 0; }

@keyframes pokeball-wobble {
  0%, 100% { transform: Rotate(0deg); }
  25% { transform: Rotate(-20deg); }
  75% { transform: Rotate(20deg); }
}

.fade-enter-active, .fade-leave-active { transition: opacity 1s ease-in-out; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* HUD Transitions */
.hud-fade-enter-active, .hud-fade-leave-active {
  transition: opacity 0.3s ease-in-out;
}
.hud-fade-leave-active {
  position: absolute;
  // Asegurar que mantenga su alineación lateral durante la salida absoluta
  &.enemy-side { top: 4cqw; left: 4cqw; }
  &.player-side { bottom: 4cqw; right: 4cqw; }

  @media (max-width: 600px) {
    &.enemy-side { top: 2cqw; left: 2cqw; }
    &.player-side { bottom: 2cqw; right: 2cqw; }
  }
}
.hud-fade-enter-from, .hud-fade-leave-to {
  opacity: 0;
}

</style>
