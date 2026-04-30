// [PureVue-Ignore-Length]
<script setup>
import { ref, computed, watch, onMounted, provide } from 'vue'
import { useBattleStore } from '@/stores/battle'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
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

const battleStore = useBattleStore()
const gameStore = useGameStore()
const mapStore = useMapStore()
const uiStore = useUIStore()

// Forzar Alta Fidelidad en el Combate (Ignorar modo performance de modales)
provide('forceHighFidelity', true)
provide('isModalPerformanceMode', computed(() => false))
const { getBackgroundUrl } = useBattleBackground()

const arenaRef = ref(null)
const { cameraStyles, worldStyles, entity1Styles, entity2Styles, showGuides } = useCombatCamera(arenaRef)

const bgData = computed(() => {
  return getBackgroundUrl(battle.value?.locationId || 'route1', mapStore.currentCycle)
})

const atmosphere = ref(null)

const gs = computed(() => gameStore.state)
const battle = computed(() => battleStore.state)
const enemy = computed(() => battle.value?.enemy)
const player = computed(() => battle.value?.player)

const isSearching = computed(() => battleStore.isSearching)
const isFinishing = computed(() => battleStore.isFinishing)
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

const activeEnemyData = computed(() => {
  // Obtenemos el enemigo oficial. Durante el estado final (isFinishing), lo mantenemos si sigue vivo.
  const officialEnemy = (battle.value && (!battle.value.over || (isFinishing.value && enemy.value?.hp > 0))) ? enemy.value : null

  // Durante búsqueda, el 'upcoming' es prioritario.
  if (isSearching.value) return upcomingPokemon.value
  
  // Durante animación de entrada o revelación:
  // Intentamos usar upcomingPokemon si existe (Fase 2 -> 3), 
  // si no (Fase 1 directa), usamos el enemigo real (si no está muerto)
  if (isWildEntryAnimation.value || isWildSilhouette.value || wildRevealActive.value) {
    return upcomingPokemon.value || officialEnemy
  }

  // Combate normal
  return officialEnemy || upcomingPokemon.value
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

// Animation state for energy effects
const playerAnimState = ref(null) // 'catching', 'releasing', null
const enemyAnimState = ref(null)

// Control global de animaciones de intro para el store
const isIntroInProgress = computed(() => {
  return isWildEntryAnimation.value || 
         wildRevealActive.value || 
         isEmerging.value || 
         upcomingIsEmerging.value || 
         playerAnimState.value !== null || 
         enemyAnimState.value !== null
})

const isShadowVisible = computed(() => {
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
  // Prioridad absoluta a las animaciones de revelación/búsqueda
  if (isSearching.value || isWildEntryAnimation.value || wildRevealActive.value) return true
  
  // Si el combate ya es oficial y activo (y NO estamos en la pantalla de finalización),
  // forzamos la ocultación de arbustos incluso si queda algún residuo en upcomingPokemon
  if (battleStore.isBattleActive && !isFinishing.value && !isWildEntryAnimation.value && !wildRevealActive.value) return false
  
  return !!upcomingPokemon.value
})

const skipBushesFade = ref(false)
const bushTransitionName = computed(() => {
  // Si es modo búsqueda (Escenario 2), siempre animamos la aparición
  if (isSearching.value) return 'fade'
  // Si es combate directo o transición (Escenario 1 o 3), instantáneo
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
    // Si empezamos a buscar, forzamos silueta
    isWildSilhouette.value = true
  } else if (oldVal && !newVal && isWildEncounter.value && isInitialLoad.value) {
    // Solo actuar si estamos en carga inicial y pasamos a falso (combate directo)
    isWildSilhouette.value = true
    isWildEntryAnimation.value = true
  }
})

watch(() => battleStore.upcomingPokemon, (newVal) => {
  if (newVal) {
    upcomingIsEmerging.value = true
    setTimeout(() => { upcomingIsEmerging.value = false }, 1200)
  }
}, { immediate: true })

// Animation state for energy effects
const playerAnimSeed = Math.random()
const enemyAnimSeed = Math.random()
const _animSeed = Math.random()

const effectiveFeetY = computed(() => {
  // If we are searching or seeing the upcoming preview, use the pre-calculated searching feet
  if (isSearching.value || upcomingPokemon.value) return searchingFeetY.value
  // During combat or wild entry (where the real enemy is already loaded), use the enemy feet
  return enemyFeetY.value
})

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

const isFlying = (pokemon) => {
  if (!pokemon || !pokemon.id) return false
  const data = pokemonDataProvider.getPokemonData(pokemon.id)
  return data?.isFloating || false
}
const playerFeetY = ref(0.9)
const enemyFeetY = ref(0.9)
const searchingFeetY = ref(0.9)

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

const p1ShadowStyle = computed(() => {
  if (p1NaturalSize.value.w === 0) return { top: '90%', width: '70%' }
  
  // Cálculo basado en sprite CENTRADO en caja de 400x400 con object-fit: contain
  const ratio = p1NaturalSize.value.w / p1NaturalSize.value.h
  let rW, rH
  if (ratio > 1) { 
    rW = 400; rH = 400 / ratio 
  } else { 
    rH = 400; rW = 400 * ratio 
  }
  
  const topOffset = (400 - rH) / 2
  const feetY = topOffset + (playerFeetY.value * rH)
  
  return {
    top: `${(feetY / 400) * 100}%`,
    width: `${(rW * 0.8 / 400) * 100}%`
  }
})

const p2ShadowStyle = computed(() => {
  if (p2NaturalSize.value.w === 0) return { top: '90%', width: '70%' }
  
  const ratio = p2NaturalSize.value.w / p2NaturalSize.value.h
  let rW, rH
  if (ratio > 1) { 
    rW = 400; rH = 400 / ratio 
  } else { 
    rH = 400; rW = 400 * ratio 
  }
  
  const topOffset = (400 - rH) / 2
  const feetY = topOffset + (effectiveFeetY.value * rH)
  
  return {
    top: `${(feetY / 400) * 100}%`,
    width: `${(rW * 0.8 / 400) * 100}%`
  }
})

const detectFeetYFromUrl = async (url, isFlying = false) => {
  if (!url) return 0.9
  if (isFlying) return 0.98
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas') // [PureVue-Ignore]
      const ctx = canvas.getContext('2d')
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      try {
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
        for (let y = canvas.height - 1; y >= 0; y--) {
          for (let x = 0; x < canvas.width; x++) {
            const alpha = data[(y * canvas.width + x) * 4 + 3]
            if (alpha > 50) {
              resolve(y / canvas.height)
              return
            }
          }
        }
      } catch (_err) { resolve(0.9) }
      resolve(0.9)
    }
    img.onerror = () => resolve(0.9)
    img.src = url
  })
}

watch(() => enemy.value?.id, async (newId) => {
  if (!enemy.value) return
  
  // Si el nuevo enemigo es el que estábamos previsualizando, heredamos sus pies
  // para evitar recálculos y garantizar paridad visual absoluta
  if (upcomingPokemon.value && upcomingPokemon.value.id === newId) {
    enemyFeetY.value = searchingFeetY.value
    return
  }

  enemyFeetY.value = 0.9 // Reset sincrónico para evitar saltos desde el poke anterior
  const url = getAssetUrl(ASSET_TYPES.POKEMON, enemy.value.id, { isShiny: enemy.value.isShiny, isBack: false })
  enemyFeetY.value = await detectFeetYFromUrl(url, isFlying(enemy.value))
}, { immediate: true })

watch(() => upcomingPokemon.value?.id, async () => {
  if (!upcomingPokemon.value) return
  searchingFeetY.value = 0.9 // Reset sincrónico para evitar saltos desde el poke anterior
  const url = getAssetUrl(ASSET_TYPES.POKEMON, upcomingPokemon.value.id, { isShiny: upcomingPokemon.value.isShiny })
  searchingFeetY.value = await detectFeetYFromUrl(url, isFlying(upcomingPokemon.value))
}, { immediate: true })

watch([() => player.value?.id, () => player.value?.hp], async () => {
  if (!player.value) return
  playerFeetY.value = 0.9 // Reset sincrónico para evitar saltos
  const url = player.value.hp <= 0 ? playerTrainerSpriteUrl.value : getAssetUrl(ASSET_TYPES.POKEMON, player.value.id, { isShiny: player.value.isShiny, isBack: true })
  const flying = player.value.hp > 0 && isFlying(player.value)
  playerFeetY.value = await detectFeetYFromUrl(url, flying)
}, { immediate: true })

const computedWeather = computed(() => {
  if (mapStore.globalWeather) return mapStore.globalWeather
  return getRouteWeather(battle.value?.locationId || 'route1', mapStore.currentSeason.id, mapStore.currentEpochHour)
})

const shadowUrl = ref('')
const p1NaturalSize = ref({ w: 0, h: 0 })
const p2NaturalSize = ref({ w: 0, h: 0 })

const handleP1Load = (e) => {
  p1NaturalSize.value = { w: e.target.naturalWidth, h: e.target.naturalHeight }
}
const handleP2Load = (e) => {
  p2NaturalSize.value = { w: e.target.naturalWidth, h: e.target.naturalHeight }
}
const generatePixelShadow = (w = 21, h = 6) => {
  if (typeof document === 'undefined') return ''
  const canvas = document.createElement('canvas') // [PureVue-Ignore]
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'Rgba(0, 0, 0, 0.35)'
  ctx.beginPath()
  ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
  ctx.fill()
  return canvas.toDataURL('image/png')
}

let playerAnimTimeout = null
let enemyAnimTimeout = null

// Map external legacy commands to energy animations
const handleCatchRequest = (detail) => {
  const { side } = detail
  if (side === 'player') {
    playerAnimState.value = 'catching'
    clearTimeout(playerAnimTimeout)
    playerAnimTimeout = setTimeout(() => { playerAnimState.value = null }, 900)
  } else {
    enemyAnimState.value = 'catching'
    clearTimeout(enemyAnimTimeout)
    enemyAnimTimeout = setTimeout(() => { enemyAnimState.value = null }, 900)
  }
}

const handleReleaseRequest = (detail) => {
  const { side } = detail
  if (side === 'player') {
    playerAnimState.value = 'releasing'
    clearTimeout(playerAnimTimeout)
    playerAnimTimeout = setTimeout(() => { playerAnimState.value = null }, 900)
  } else {
    enemyAnimState.value = 'releasing'
    clearTimeout(enemyAnimTimeout)
    enemyAnimTimeout = setTimeout(() => { enemyAnimState.value = null }, 900)
  }
}

onMounted(() => {
  shadowUrl.value = generatePixelShadow()
  
  // Listen for energy animation commands
  gameBus.on('PLAY_CATCH_ENERGY', (e) => handleCatchRequest(e.detail))
  gameBus.on('PLAY_WITHDRAW', (e) => handleCatchRequest(e.detail))
  
  gameBus.on('PLAY_RELEASE_ENERGY', (e) => handleReleaseRequest(e.detail))
  gameBus.on('PLAY_SEND_OUT', (e) => handleReleaseRequest(e.detail))

  // Trigger for start battle
  gameBus.on('START_BATTLE', (e) => {
    const wasAlreadySearching = isSearching.value || !!upcomingPokemon.value
    
    const { isTrainer, isGym } = e.detail || e
    
    // Player release: solo si no hay ya un pokemon activo (para evitar dobles animaciones en debug)
    if (!player.value || player.value.hp <= 0 || !wasAlreadySearching) {
      setTimeout(() => handleReleaseRequest({ side: 'player' }), 100)
    }
    
    if (isTrainer || isGym) {
      setTimeout(() => handleReleaseRequest({ side: 'enemy' }), 200)
    } else {
      // Si ya teníamos previsualización, ejecutamos la FASE 3 (transición suave)
      if (wasAlreadySearching) revealWildPokemon(false)
      // Si es un encuentro directo, ejecutamos la FASE 1 (salto)
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
      <div
        class="map-virtual-world"
        :style="worldStyles"
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
          <div
            class="combatant-sprite enemy-side-sprite"
            :style="entity2Styles"
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
                    :style="{ top: `calc(${p2ShadowStyle.top} - 3%)` }"
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
                  </div>
                </div>
              </div>
            </Transition>

            <!-- Unified Shadow Logic -->
            <div
              class="pv-shadow"
              :class="{ 'is-hidden': !isShadowVisible }"
              :style="{ backgroundImage: `url(${shadowUrl})`, ...p2ShadowStyle }"
            />

            <div
              class="sprite-animator"
              :class="[{ 'fainted': activeEnemyData?.hp <= 0 && !isSearching && !isWildEntryAnimation && !isWildSilhouette, 'is-attacking': battleStore.attackerSide === 'enemy', 'is-emerging': isEmerging }, getAttackAnimClass('enemy')]"
            >
              <div
                class="sprite-rotation-layer"
                :class="getAttackAnimClass('enemy')"
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
                  v-else-if="activeEnemyData"
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
                    '--shadow-y': p2ShadowStyle.top
                  }"
                >
                  <PVSpriteFX
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

            <!-- Encounter Layers - FRONT (in front of pokemon) -->
            <Transition :name="bushTransitionName">
              <div
                v-if="shouldShowEncounterLayers"
                class="encounter-layers-front"
                :style="grassIsBakedIn ? atmosphere?.weatherOnlyStyles : atmosphere?.atmosphereStyles"
              >
                <div
                  v-show="!activeEnemyIsFloating"
                  class="searching-bushes front"
                >
                  <div
                    class="bush-container-ground"
                    :style="{ top: `calc(${p2ShadowStyle.top} + 5%)` }"
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
                  </div>
                </div>
              </div>
            </Transition>
          </div>

          <!-- Player Side (Player 1) -->
          <div
            class="combatant-sprite player-side-sprite"
            :style="entity1Styles"
          >
            <div
              class="sprite-animator"
              :class="[{ 'fainted': player.hp <= 0, 'is-attacking': battleStore.attackerSide === 'player' }, getAttackAnimClass('player')]"
            >
              <div
                class="pv-shadow"
                :style="{ backgroundImage: `url(${shadowUrl})`, ...p1ShadowStyle }"
              />
              <div
                class="sprite-rotation-layer"
                :class="getAttackAnimClass('player')"
              >
                <div
                  v-if="player.hp <= 0"
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
                  :class="[{ 'combatant-idle-subtle': !playerAnimState, 'is-floating-species': isFlying(player), 'energy-catching': playerAnimState === 'catching', 'energy-releasing': playerAnimState === 'releasing' }]"
                  :style="{ animationDelay: `calc(${playerAnimSeed} * -3s)`, '--idle-dist': isFlying(player) ? '-12px' : '-3px', '--shadow-y': p1ShadowStyle.top }"
                >
                  <PVSpriteFX
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
          </div>
        </div>

        <!-- Debug Guides Layer -->
        <div
          v-if="showGuides"
          class="camera-debug-guides"
        >
          <div class="map-border" />
          <div class="safe-zone-box" />
          <div class="entity-anchor p1" />
          <div class="entity-anchor p2" />
        </div>
      </div>
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
      <div class="combatant-info-wrap enemy-side">
        <BattleInfoCard :pokemon="enemy" />
      </div>
      <div class="combatant-info-wrap player-side">
        <BattleInfoCard
          :pokemon="player"
          :is-player="true"
          :nick-style="gs.nick_style"
        />
      </div>
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
  justify-content: space-between;
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
  height: calc(var(--obj-scale, 1) * 6px); 
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

.is-floating-species { margin-bottom: 25px; @media (max-width: 690px) { margin-bottom: 12px; } }

@keyframes combatant-idle-subtle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(var(--idle-dist, -6px)); } }

@keyframes attack-dash-player { 0% { transform: Translate(0, 0); } 25% { transform: Translate(50px, -50px); } 100% { transform: Translate(0, 0); } }
@keyframes attack-dash-enemy { 0% { transform: Translate(0, 0); } 25% { transform: Translate(-50px, 50px); } 100% { transform: Translate(0, 0); } }
@keyframes attack-pulse-player { 0% { transform: Scale(1); } 30% { transform: Scale(1.15) Translate(10px, -10px); filter: Brightness(1.3); } 100% { transform: Scale(1); } }
@keyframes attack-pulse-enemy { 0% { transform: Scale(1); } 30% { transform: Scale(1.15) Translate(-10px, 10px); filter: Brightness(1.3); } 100% { transform: Scale(1); } }
@keyframes attack-status-player { 0% { transform: Rotate(0deg); } 30% { transform: Rotate(10deg) Scale(1.1); } 100% { transform: Rotate(0deg); } }
@keyframes attack-status-enemy { 0% { transform: Rotate(0deg); } 30% { transform: Rotate(-10deg) Scale(1.1); } 100% { transform: Rotate(0deg); } }

.enemy-side { align-self: flex-start; }
.player-side { align-self: flex-end; }

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
    transform: TranslateX(-50%) TranslateY(-50%);
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
  width: calc(var(--obj-scale, 1) * 60px);
  height: calc(var(--obj-scale, 1) * 60px);
  image-rendering: pixelated;
  
  &.bush-front-1 { left: 25%; bottom: 0; z-index: calc(var(--z-map-spawns) + 1); --bs: 1.2; animation: bush-wiggle 1.2s infinite ease-in-out; }
  &.bush-front-2 { right: 25%; bottom: 0; z-index: calc(var(--z-map-spawns) + 1); --bs: 1.0; animation: bush-wiggle 1.5s infinite ease-in-out -0.4s; }
  &.bush-back-1 { left: 10%; bottom: 0; z-index: calc(var(--z-map-spawns) - 1); --bs: 0.9; animation: bush-wiggle 1.8s infinite ease-in-out -0.8s; }
  &.bush-back-2 { right: 10%; bottom: 0; z-index: calc(var(--z-map-spawns) - 1); --bs: 1.1; animation: bush-wiggle 2.1s infinite ease-in-out -0.2s; }
  
  transform: Scale(var(--bs));
}

.upcoming-preview {
  position: absolute; inset: 0; display: flex; align-items: flex-end; justify-content: center; z-index: calc(var(--z-base) + 11); pointer-events: none;
  .upcoming-image { width: 38cqw; height: 38cqw; max-width: 190px; max-height: 190px; object-fit: contain; object-position: bottom; image-rendering: pixelated; transition: filter 0.3s ease;
    &.is-silhouette { filter: Brightness(0) Drop-Shadow(0 0 2px Rgba(255, 255, 255, 0.8)) !important; }
    backface-visibility: hidden;
  }
}

.pixel-bush { width: 100%; height: 100%; object-fit: contain; backface-visibility: hidden; }

@keyframes bush-wiggle { 
  0%, 100% { transform: Scale(var(--bs)) Rotate(0); } 
  50% { transform: Scale(var(--bs)) Rotate(5deg); } 
}

@keyframes emerge-bounce {
  0% { transform: translateY(15px) Scale(0.8); }
  60% { transform: translateY(-10px) Scale(1.05); }
  100% { transform: translateY(0) Scale(1); }
}

.fade-enter-active, .fade-leave-active { transition: opacity 1s ease-in-out; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

</style>
