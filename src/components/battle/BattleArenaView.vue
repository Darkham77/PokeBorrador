<!-- [PureVue-Ignore-Length] -->
<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted, provide, ref, nextTick } from 'vue'
import { gsap } from 'gsap'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battle'
import { useUIStore } from '@/stores/ui'
import { useMapStore } from '@/stores/map'
import { useModalStore } from '@/stores/modals'
import { useGameStore } from '@/stores/game'
import { getRouteWeather } from '@/logic/weatherUtils'
import { getWeatherAnimSeed } from '@/logic/weather/weatherMath.ts'
import { useCombatCamera } from '@/composables/useCombatCamera'
import { getCombatantPosition, WORLD_CONSTANTS } from '@/logic/combat/spatialCoordinator'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { logger } from '@/logic/utils/logger'
import type { Pokemon } from '@/types/pokemon'
import { GYMS } from '@/data/gyms.ts'
import { usePlayerClassStore } from '@/stores/playerClass.ts'
import { POKEMON_FEET_DATABASE } from '@/data/pokemonFeetDatabase'

// Composables
import { useBattleShadows } from '@/composables/useBattleShadows'
import { useBattleAnimations } from '@/composables/useBattleAnimations'
import { useBattleHud } from '@/composables/useBattleHud'
import { useWeatherVisuals } from '@/composables/useWeatherVisuals'

// Componentes
import VirtualSpace from './VirtualSpace.vue'
import VirtualEntity from './VirtualEntity.vue'
import BattleEnvironment from './BattleEnvironment.vue'
import BattleCombatant from './BattleCombatant.vue'
import BattleInfoCard from './BattleInfoCard.vue'
import CombatGrass from './CombatGrass.vue'
import AtmosphereLayer from '@/components/common/AtmosphereLayer.vue'
import CameraZoomControls from './CameraZoomControls.vue'

const { BASE_ENTITY_SIZE_PLAYER, BASE_ENTITY_SIZE_ENEMY, OBJECT_SCALE } = WORLD_CONSTANTS

const battleStore = useBattleStore()
const { isSearching } = storeToRefs(battleStore)
const mapStore = useMapStore()
const uiStore = useUIStore()

// Forzar Alta Fidelidad en el Combate
provide('forceHighFidelity', true)
provide('isModalPerformanceMode', computed(() => false))

const arenaRef = ref<HTMLElement | null>(null)
const trainerRef = ref<HTMLElement | null>(null)
const { cameraStyles, worldStyles, showGuides } = useCombatCamera(arenaRef)

const battle = computed(() => battleStore.state)
const enemy = computed(() => battle.value?.enemy)
const player = computed(() => battle.value?.player)
const p1Pos = computed(() => getCombatantPosition('player'))
const p2Pos = computed(() => getCombatantPosition('enemy'))

const trainerShadowUrl = ref('')
onMounted(() => {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    canvas.width = 10
    canvas.height = 7
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
      ctx.beginPath()
      ctx.ellipse(5, 3.5, 5, 3.5, 0, 0, Math.PI * 2)
      ctx.fill()
      trainerShadowUrl.value = canvas.toDataURL('image/png')
    }
  }
})

const getTrainerShadowStyle = (spriteUrl: string, entitySize: number) => {
  let dbKey = spriteUrl || ''
  const base = import.meta.env.BASE_URL || '/'
  if (base !== '/' && dbKey.startsWith(base)) {
    dbKey = dbKey.slice(base.length - 1)
  }
  try {
    dbKey = decodeURIComponent(dbKey)
  } catch (_e) {
    // Ignore decode error
  }
  const cached = POKEMON_FEET_DATABASE[dbKey] || { feetY: 0.9, feetX: 0.5 }
  
  const widthPx = 0.7 * entitySize
  const heightPx = entitySize * 0.08
  const offsetX = (cached.feetX - 0.5) * entitySize

  return {
    position: 'absolute' as const,
    backgroundImage: `url(${trainerShadowUrl.value})`,
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat',
    left: `calc(50% + ${offsetX}px)`,
    top: `${cached.feetY * 100}%`,
    width: `${widthPx}px`,
    height: `${heightPx}px`,
    transform: 'translate(-50%, -75%)', // Shadow shifted 25% up
    zIndex: -1,
    pointerEvents: 'none' as const
  }
}

const classStore = usePlayerClassStore()
const gameStore = useGameStore()

// URL del sprite de espalda del jugador con género dinámico
const playerBackSpriteUrl = computed(() => {
  const spriteId = classStore.currentClassDef?.avatarSpriteId || classStore.currentClassDef?.id || 'entrenador'
  const gender = gameStore.state.gender || 'h'
  return getAssetUrl(ASSET_TYPES.TRAINER, spriteId, { trainerSuffix: 'back', gender })
})


const showStandingTrainers = computed(() => {
  return battleStore.isBattleActive && 
         battleStore.currentFsmState !== 'FIRST_INTRO' && 
         battleStore.currentFsmState !== 'INITIALIZING' &&
         !battleStore.isSearching
})

const trainerDialogText = computed(() => {
  if (!battle.value) return ''
  if (battle.value.isGym && battle.value.gymId) {
    const gym = GYMS.find(g => g.id === battle.value?.gymId)
    if (gym) return gym.quote
  }
  if (battle.value.quote) return battle.value.quote
  return '¡Prepárate para combatir! ¡No te lo pondré fácil!'
})

// Inicializar Composables
const { 
  currentPlayerShadowKey, currentEnemyShadowKey, 
  enemyGroundY, playerGroundY, 
  syncEnemyShadow, syncPlayerShadow, preloadCombatCoords 
} = useBattleShadows()

const animations = useBattleAnimations(battleStore, enemy)
const localAnimations = {
  triggerSearchEncounter: animations.triggerSearchEncounter,
  revealWildPokemon: animations.revealWildPokemon,
  triggerWildEmergence: animations.triggerWildEmergence,
  triggerCatchSparkles: animations.triggerCatchSparkles,
  handleCatchRequest: animations.handleCatchRequest,
  handleReleaseRequest: animations.handleReleaseRequest,
  handleShakeRequest: animations.handleShakeRequest,
  handleFaintAnim: animations.handleFaintAnim,
  playCatchCelebration: animations.playCatchCelebration,
  playBallFadeOut: animations.playBallFadeOut,
  triggerTrainerEntry: animations.triggerTrainerEntry,
  triggerTrainerDialogs: animations.triggerTrainerDialogs,
  triggerTrainerRetreat: animations.triggerTrainerRetreat,
  triggerPokemonCall: animations.triggerPokemonCall,
  handleHealRequest: animations.handleHealRequest,
  handleBlinkRequest: animations.handleBlinkRequest,
  // Bridge de bloqueo de turnos: el motor espera la animación de ataque antes de continuar.
  awaitTween: animations.awaitTween,
  resetAll: animations.resetAll
}
battleStore.animations = localAnimations
const {
  isInitialLoad,
  isFaintInProgress, faintedPokemonSnapshot,
  playerAnimState,
  enemyAnimState,
  catchSparkles,
  isIntroInProgress, initListeners, cleanupListeners,
  trainerAnimState, isTrainerVisible, isGlobalFadeActive,
  resetAll,
  getPokemonAnimState,
  getPokemonBallId,
  getPokemonCaptureActive,
  getPokemonIsShaking,
  getPokemonIsBlinking,
  getPokemonIsHealing,
  silhouetteOpacity
} = animations

const playerCombatants = computed(() => {
  const list: Pokemon[] = []
  if (battleStore.exitingPlayer) {
    list.push(battleStore.exitingPlayer)
  }
  if (player.value) {
    list.push(player.value)
  }
  return list
})

const enemyCombatants = computed(() => {
  const list: Pokemon[] = []
  const isPreCombatTrainer = (battleStore.state?.isTrainer || battleStore.state?.isGym) && 
    (battleStore.currentFsmState === 'SEARCH_PHASE' || battleStore.currentFsmState === 'INITIALIZING');
    
  if (isPreCombatTrainer) {
    return list
  }

  if (battleStore.exitingEnemy) {
    list.push(battleStore.exitingEnemy)
  }
  if (enemy.value) {
    list.push(enemy.value)
  }
  return list
})


const {
  isEnemyHudSuppressed,
  isPlayerHudSuppressed,
  shouldScrambleEnemyData,
  activeEnemyData,
  activePlayerData,
  activeEnemyIsSilhouette,
  bushIsBehind,
  enemyIsJumping,
  isInstantBush,
  enemyIsFloating,
  isEnemyTechnicalHidden,
  isPlayerTechnicalHidden,
  shouldShowEncounterLayers
} = useBattleHud(animations, battleStore, enemy)

const computedWeather = computed(() => {
  // Fuente de verdad visual: siempre usar el clima ACTUAL del mapa (igual que la vista del mapa).
  // El campo battle.weather.type sigue siendo la referencia mecánica para el motor de combate.
  // Prioridad: Clima global de eventos > Clima determinístico de la ruta actual
  if (mapStore.globalWeather) return mapStore.globalWeather
  return getRouteWeather(battle.value?.locationId || 'route1', mapStore.currentSeason.id, mapStore.currentEpochHour, mapStore.currentCycle)
})

const atmosphereSeed = computed(() => {
  return getWeatherAnimSeed(battle.value?.locationId || 'route1')
})

const { atmosphereFilter, weatherOnlyFilter } = useWeatherVisuals({
  weather: computedWeather,
  cycle: computed(() => mapStore.currentCycle)
})

// Unified Style Orchestration to prevent reactivity breaks in templates
const arenaContentStyles = computed(() => ({
  ...cameraStyles.value,
  '--atmosphere-filter': atmosphereFilter.value,
  '--weather-filter': weatherOnlyFilter.value
}))

// Watchers de Sincronización
// Watcher para sincronizar sombras (Jugador y Enemigo)
watch([enemy, p2Pos, () => enemyAnimState.value], ([data, pos, anim]) => {
  // El Pokémon es visible si el asiento está ocupado
  const visible = !!data
  syncEnemyShadow(visible, data || null, pos, anim)
}, { immediate: true, deep: true })

watch([player, p1Pos, () => playerAnimState.value], ([p, pos, anim]) => {
  syncPlayerShadow(p || null, pos, anim)
}, { immediate: true, deep: true })

// --- COORDINACIÓN DE PRESENTACIÓN (FSM) ---
// Orquesta FIRST_INTRO y SEARCH_PHASE según el diagrama del manual (Sección 7).
// Observa TANTO el estado principal como el substate para detectar la transición ENCOUNTER_ANIM.
watch(
  () => {
    const fsm = battleStore.fsm
    if (!fsm) return [null, null]
    return [fsm.currentState, fsm.currentSubState]
  },
  async ([newState, newSubState]) => {
    logger.debug('BattleArenaView', `FSM: ${newState} ${newSubState || ''}`)
    if (!newState) return

    // FIRST_INTRO: Gestión de visibilidad de componentes durante la entrada
    if (newState === 'FIRST_INTRO') {
      logger.info('BattleArenaView', 'Phase: FIRST_INTRO')
      // Ya no llamamos a battleStore.fsm.transition('ACTIVE_BATTLE') aquí.
      // La orquestación lógica ahora reside en el store para mayor precisión.
    }

    // REWARDS_PHASE + EMPTY_WAIT: Limpieza completa de rastros del Pokémon
    if (newState === 'REWARDS_PHASE' && newSubState === 'EMPTY_WAIT') {
      logger.info('BattleArenaView', '-> EMPTY_WAIT (REWARDS_PHASE)')
      resetAll()

      battleStore.attackerSide = null
      battleStore.activeMove = null
      battleStore.enemyStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }
    }

    // MINIGAME_CHECK: Activar modales tradicionales a través del store global de modales
    if (newSubState === 'MINIGAME_CHECK' && enemy.value) {
      const modalStore = useModalStore()
      if (battleStore.state?.isFishing) {
        modalStore.open('Fishing', {
          pokemon: enemy.value,
          rarity: battle.value?.rarity || 50,
          onWin: handleFishingSuccess,
          onFail: handleFishingFail,
          onCloseCallback: handleMinigameCancel
        })
      } else if (battleStore.state?.isArchaeology) {
        modalStore.open('Archaeology', {
          pokemon: enemy.value,
          rarity: battle.value?.rarity || 50,
          onWin: handleArchaeologySuccess,
          onFail: handleArchaeologyFail,
          onCloseCallback: handleMinigameCancel
        })
      }
    }
  },
  { immediate: true }
)

const handleMinigameCancel = async () => {
  logger.warn('BattleArenaView', 'Minigame CANCELLED by user')
  if (battleStore.state) {
    battleStore.state.isFishing = false
    battleStore.state.isArchaeology = false
  }
  resetAll()
  battleStore.attackerSide = null
  battleStore.activeMove = null
  battleStore.enemyStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }
  await battleStore.completeBattleFlow('map')
}

const handleFishingSuccess = async () => {
  logger.success('BattleArenaView', 'Fishing SUCCESS')
  if (battleStore.state) {
    battleStore.state.isFishing = false
    battleStore.state.isArchaeology = false
  }
  resetAll()
  await battleStore.startEncounter()
}

const handleFishingFail = async () => {
  logger.warn('BattleArenaView', 'Fishing FAIL')
  const uiStore = useUIStore()
  uiStore.notify('El Pokémon escapó...', '💨')
  battleStore.addLog('El Pokémon escapó...', 'log-info')

  // Limpiar flags de minijuego y estado visual ANTES de la transición FSM
  if (battleStore.state) {
    battleStore.state.isFishing = false
    battleStore.state.isArchaeology = false
  }
  resetAll()
  battleStore.attackerSide = null
  battleStore.activeMove = null
  battleStore.enemyStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }

  // Volver al bucle de búsqueda (searchLoop genera el próximo encuentro internamente)
  await battleStore.completeBattleFlow('search')
}

const handleArchaeologySuccess = async (difficulty: string) => {
  logger.success('BattleArenaView', `Archaeology SUCCESS: ${difficulty}`)
  
  const locId = battleStore.state?.locationId || 'route1'
  await mapStore.triggerArchaeologyRewards(locId, difficulty)
  
  // Limpiar flags de minijuego y estado visual ANTES de la transición FSM
  if (battleStore.state) {
    battleStore.state.isArchaeology = false
    battleStore.state.isFishing = false
  }
  resetAll()
  battleStore.attackerSide = null
  battleStore.activeMove = null
  battleStore.enemyStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }

  // Volver al bucle de búsqueda (searchLoop genera el próximo encuentro internamente)
  await battleStore.completeBattleFlow('search')
}

const handleArchaeologyFail = async () => {
  logger.warn('BattleArenaView', 'Archaeology FAIL')
  
  let fossilName = 'Ámbar Viejo'
  let emoji = '💎'
  if (enemy.value?.id === 'kabuto') {
    fossilName = 'Fósil Domo'
    emoji = '🛡'
  } else if (enemy.value?.id === 'omanyte') {
    fossilName = 'Fósil Hélix'
    emoji = '🐚'
  }
  
  const { SHOP_ITEMS } = await import('@/data/items')
  const itemData = SHOP_ITEMS.find(i => i.name.toLowerCase() === fossilName.toLowerCase())
  const itemSprite = itemData ? getAssetUrl(ASSET_TYPES.ITEM, itemData.sprite) : emoji

  const uiStore = useUIStore()
  uiStore.notify(`El ${fossilName} se desmoronó...`, itemSprite)
  battleStore.addLog(`El ${fossilName} se desmoronó...`, 'log-info', fossilName)

  // Limpiar flags de minijuego y estado visual ANTES de la transición FSM
  if (battleStore.state) {
    battleStore.state.isArchaeology = false
    battleStore.state.isFishing = false
  }
  resetAll()
  battleStore.attackerSide = null
  battleStore.activeMove = null
  battleStore.enemyStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }

  // Volver al bucle de búsqueda (searchLoop genera el próximo encuentro internamente)
  await battleStore.completeBattleFlow('search')
}


watch(isIntroInProgress, (val) => { battleStore.isIntroAnimating = val }, { immediate: true })

const triggerPreloadCoords = () => preloadCombatCoords(
  battle.value?.player || null,
  battle.value?.enemy || null,
  p1Pos.value,
  p2Pos.value,
  battle.value?.playerTeam || [],
  battle.value?.enemyTeam || []
)

onMounted(async () => {
  initListeners()
  await triggerPreloadCoords()
  const tl = gsap.timeline()
  tl.to({}, { duration: 0.5 })
  tl.add(() => { isInitialLoad.value = false })
})

onUnmounted(() => {
  if (battleStore.animations === localAnimations) {
    battleStore.animations = undefined
  }
  cleanupListeners()
})

// GSAP: Animación de Entrenador
watch(trainerAnimState, async (newState) => {
  if (!newState) return
  await nextTick()
  const el = trainerRef.value && '$el' in trainerRef.value ? (trainerRef.value as unknown as { $el: HTMLElement }).$el : (trainerRef.value as HTMLElement | null)
  if (!el) return
  gsap.killTweensOf(el)
  if (newState === 'entering') {
    gsap.fromTo(el, { x: '150%', scale: 0.8, opacity: 0 }, { x: '0%', scale: 1, opacity: 1, duration: 0.8, ease: 'back.out(1.2)' })
  } else if (newState === 'retreating') {
    // Mover al entrenador a su lugar designado (300, -10) en unidades virtuales
    gsap.to(el, { x: 300, y: -10, scale: 0.8, opacity: 0.85, duration: 0.8, ease: 'power2.inOut' })
  }
})

watch(showStandingTrainers, (show) => {
  if (show) {
    isTrainerVisible.value = false
    trainerAnimState.value = null
  }
})

watch(() => battleStore.currentSubState, async (sub) => {
  if (sub === 'PRELOAD_FINAL_COORDS') await triggerPreloadCoords()
})

// Forzar actualización de cámara cuando el combate se activa para evitar el glitch de "pantalla negra"
watch(() => battleStore.isBattleActive, (active) => {
  if (active) {
    const tl = gsap.timeline()
    tl.to({}, { duration: 0.1 })
    tl.add(() => {
      if (arenaRef.value) {
        window.dispatchEvent(new Event('resize'))
      }
    })
  }
})

// GSAP HUD Transitions complying with the project mandate
// @before-enter: sets initial state synchronously before the first rendered frame
// to prevent the 1-2 frame flash at opacity:1 (CSS default) before GSAP takes over.
const onHudEnemyBeforeEnter = (el: Element) => {
  gsap.set(el, { opacity: 0, x: -20, scale: 0.98 })
}

const onHudEnemyEnter = (el: Element, done: () => void) => {
  gsap.to(el, { opacity: 1, x: 0, scale: 1, duration: 0.4, ease: "power2.out", onComplete: done })
}

const onHudEnemyLeave = (el: Element, done: () => void) => {
  gsap.to(el, { opacity: 0, x: -20, scale: 0.98, duration: 0.4, ease: "power2.in", onComplete: done })
}

const onHudPlayerBeforeEnter = (el: Element) => {
  gsap.set(el, { opacity: 0, x: 20, scale: 0.98 })
}

const onHudPlayerEnter = (el: Element, done: () => void) => {
  gsap.to(el, { opacity: 1, x: 0, scale: 1, duration: 0.4, ease: "power2.out", onComplete: done })
}

const onHudPlayerLeave = (el: Element, done: () => void) => {
  gsap.to(el, { opacity: 0, x: 20, scale: 0.98, duration: 0.4, ease: "power2.in", onComplete: done })
}

const onDialogBeforeEnter = (el: Element) => {
  gsap.set(el, { opacity: 0, y: 15 })
}

const onDialogEnter = (el: Element, done: () => void) => {
  gsap.to(el, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out", onComplete: done })
}

const onDialogLeave = (el: Element, done: () => void) => {
  gsap.to(el, { opacity: 0, y: 10, duration: 0.3, ease: "power2.in", onComplete: done })
}

// Zoom controls are now managed by CameraZoomControls component
</script>

<template>
  <div
    ref="arenaRef"
    class="battle-arena"
    :class="{ 'is-fading': isGlobalFadeActive }"
  >
    <!-- Overlay de Transición Global (The Void / Exit) -->
    <Transition name="fade-overlay">
      <div
        v-if="isGlobalFadeActive"
        class="global-transition-overlay"
      />
    </Transition>
    <div
      class="battle-arena-content"
      :style="arenaContentStyles"
    >
      <VirtualSpace
        :show-guides="showGuides"
        :world-styles="worldStyles"
      >
        <!-- Entorno (Solo fondo) -->
        <BattleEnvironment
          :location-id="battle?.locationId"
          :current-cycle="mapStore.currentCycle"
        />

        <div class="battle-sprites">
          <!-- Arbustos Atrás -->
          <VirtualEntity
            :x="p2Pos.x"
            :y="p2Pos.y"
            :w="BASE_ENTITY_SIZE_ENEMY"
            :h="BASE_ENTITY_SIZE_ENEMY"
          >
            <CombatGrass
              layer="back"
              :location-id="battle?.locationId"
              :ground-y="enemyGroundY"
              :visible="shouldShowEncounterLayers && !enemyIsFloating"
              :instant="isInstantBush"
              :hide-instant="enemyIsFloating"
            />
          </VirtualEntity>

          <!-- Entrenador Rival (Solo en modo Trainer/Gym) -->
          <VirtualEntity
            v-if="isTrainerVisible && (battle?.isTrainer || battle?.isGym)"
            ref="trainerRef"
            :x="p2Pos.x"
            :y="p2Pos.y"
            :w="BASE_ENTITY_SIZE_ENEMY * 0.8"
            :h="BASE_ENTITY_SIZE_ENEMY * 0.8"
            class="trainer-entity"
          >
            <div class="trainer-sprite-wrapper">
              <div 
                class="pokemon-atmosphere-wrapper"
                :style="{ filter: 'var(--atmosphere-filter)' }"
              >
                <img 
                  :src="getAssetUrl(ASSET_TYPES.TRAINER, battle?.trainerSprite || battle?.trainerName || 'entrenador')" 
                  class="trainer-image"
                  @error="(e: Event) => (e.target as HTMLImageElement).src = getAssetUrl(ASSET_TYPES.TRAINER, 'entrenador')"
                >
              </div>
            </div>
            <!-- Floor Shadow (same technique as pokemon) -->
            <div 
              class="trainer-shadow"
              :style="getTrainerShadowStyle(getAssetUrl(ASSET_TYPES.TRAINER, battle?.trainerSprite || battle?.trainerName || 'entrenador'), BASE_ENTITY_SIZE_ENEMY * 0.8 * (OBJECT_SCALE || 2))"
            />
            <!-- Cyan box overlay when guides are active -->
            <div
              v-if="showGuides"
              class="debug-trainer-guide"
            >
              <span>{{ Math.round(BASE_ENTITY_SIZE_ENEMY * 0.8 * (OBJECT_SCALE || 2)) }}x{{ Math.round(BASE_ENTITY_SIZE_ENEMY * 0.8 * (OBJECT_SCALE || 2)) }}</span>
            </div>
          </VirtualEntity>
 
          <!-- Standing Enemy Trainer (During active combat) -->
          <VirtualEntity
            v-if="showStandingTrainers && (battle?.isTrainer || battle?.isGym || battle?.isPvP)"
            :x="p2Pos.x + 300"
            :y="p2Pos.y - 10"
            :w="BASE_ENTITY_SIZE_ENEMY * 0.8"
            :h="BASE_ENTITY_SIZE_ENEMY * 0.8"
            class="standing-trainer enemy-trainer"
          >
            <div class="trainer-sprite-wrapper">
              <div 
                class="pokemon-atmosphere-wrapper"
                :style="{ filter: 'var(--atmosphere-filter)' }"
              >
                <img 
                  :src="getAssetUrl(ASSET_TYPES.TRAINER, battle?.trainerSprite || battle?.trainerName || 'entrenador')" 
                  class="trainer-image"
                  @error="(e: Event) => (e.target as HTMLImageElement).src = getAssetUrl(ASSET_TYPES.TRAINER, 'entrenador')"
                >
              </div>
            </div>
            <!-- Floor Shadow (same technique as pokemon) -->
            <div 
              class="trainer-shadow"
              :style="getTrainerShadowStyle(getAssetUrl(ASSET_TYPES.TRAINER, battle?.trainerSprite || battle?.trainerName || 'entrenador'), BASE_ENTITY_SIZE_ENEMY * 0.8 * (OBJECT_SCALE || 2))"
            />
            <!-- Cyan box overlay when guides are active -->
            <div
              v-if="showGuides"
              class="debug-trainer-guide"
            >
              <span>{{ Math.round(BASE_ENTITY_SIZE_ENEMY * 0.8 * (OBJECT_SCALE || 2)) }}x{{ Math.round(BASE_ENTITY_SIZE_ENEMY * 0.8 * (OBJECT_SCALE || 2)) }}</span>
            </div>
          </VirtualEntity>

          <!-- Standing Player Trainer (_back) - Siempre visible. Escalado al tamaño del juego usando BASE_ENTITY_SIZE_PLAYER como referencia de altura, proporción 65:165. -->
          <VirtualEntity
            :x="WORLD_CONSTANTS.SAFE_ZONE_X - Math.round(BASE_ENTITY_SIZE_PLAYER * 65 / 165) * OBJECT_SCALE"
            :y="WORLD_CONSTANTS.SAFE_ZONE_Y + WORLD_CONSTANTS.SAFE_ZONE_HEIGHT - BASE_ENTITY_SIZE_PLAYER"
            :w="Math.round(BASE_ENTITY_SIZE_PLAYER * 65 / 165)"
            :h="BASE_ENTITY_SIZE_PLAYER"
            class="standing-trainer player-trainer"
          >
            <div class="trainer-sprite-wrapper">
              <div 
                class="pokemon-atmosphere-wrapper"
                :style="{ filter: 'var(--atmosphere-filter)' }"
              >
                <img 
                  :src="playerBackSpriteUrl"
                  class="trainer-image player-trainer-image"
                  @error="(e: Event) => { (e.target as HTMLImageElement).src = getAssetUrl(ASSET_TYPES.TRAINER, 'entrenador', { trainerSuffix: 'back', gender: gameStore.state.gender || 'h' }) }"
                >
              </div>
            </div>
            <!-- Floor Shadow: CENTER del sprite de sombra anclado en (feetX, feetY) del sprite -->
            <div 
              class="trainer-shadow"
              :style="getTrainerShadowStyle(playerBackSpriteUrl, Math.round(BASE_ENTITY_SIZE_PLAYER * 65 / 165) * OBJECT_SCALE * 2.5)"
            />
            <!-- Cyan box overlay when guides are active -->
            <div
              v-if="showGuides"
              class="debug-trainer-guide"
            >
              <span>{{ Math.round(BASE_ENTITY_SIZE_PLAYER * 65 / 165) * OBJECT_SCALE }}x{{ BASE_ENTITY_SIZE_PLAYER * OBJECT_SCALE }}</span>
            </div>
          </VirtualEntity>

          <!-- Enemigo -->
          <BattleCombatant
            v-for="p in enemyCombatants"
            :key="`enemy-${p.uid || p.id}`"
            side="enemy"
            :pokemon="p"
            :position="p2Pos"
            :target-position="p1Pos"
            :base-size="BASE_ENTITY_SIZE_ENEMY"
            :ground-y="enemyGroundY"
            :shadow-key="currentEnemyShadowKey"
            :anim-state="getPokemonAnimState('enemy', p)"
            :ball-id="getPokemonBallId('enemy', p)"
            :is-shaking="getPokemonIsShaking('enemy', p)"
            :is-blinking="getPokemonIsBlinking('enemy', p)"
            :is-healing="getPokemonIsHealing('enemy', p)"
            :is-silhouette="activeEnemyIsSilhouette && p.uid === activeEnemyData?.uid"
            :is-attacking="battleStore.attackerSide === 'enemy' && p.uid === enemy?.uid"
            :active-move="battleStore.activeMove ? { side: battleStore.activeMove.side || 'enemy', cat: battleStore.activeMove.cat || 'physical', name: battleStore.activeMove.name, selfKO: battleStore.activeMove.selfKO } : null"
            :show-guides="showGuides"
            :is-capture-success="getPokemonCaptureActive('enemy', p)"
            :sparkles="catchSparkles.filter(s => s.side === 'enemy')"
            :is-fainting="isFaintInProgress && faintedPokemonSnapshot?.side === 'enemy' && !(battle?.isTrainer || battle?.isGym) && faintedPokemonSnapshot?.uid === p.uid"
            :is-emerging="enemyIsJumping && p.uid === activeEnemyData?.uid"
            :suppress-fx="isSearching || isIntroInProgress"
            :stages="battleStore.enemyStages"
            :hidden="isEnemyTechnicalHidden && p.uid === activeEnemyData?.uid"
            :has-seat="true"
            :style="{ opacity: activeEnemyIsSilhouette && p.uid === activeEnemyData?.uid ? silhouetteOpacity : 1 }"
          />

          <!-- Arbustos Adelante --
          Paso BUSHES_BACK del manual: cuando isEmerging=true, los arbustos frontales
          se mueven detrás del Pokémon (force-behind) pero siguen siendo visibles.
          Esto permite que el sprite salte POR ENCIMA de los arbustos. -->
          <VirtualEntity
            :x="p2Pos.x"
            :y="p2Pos.y"
            :w="BASE_ENTITY_SIZE_ENEMY"
            :h="BASE_ENTITY_SIZE_ENEMY"
          >
            <CombatGrass
              layer="front"
              :location-id="battle?.locationId"
              :ground-y="enemyGroundY"
              :visible="shouldShowEncounterLayers && !enemyIsFloating"
              :instant="isInstantBush"
              :force-behind="bushIsBehind"
              :hide-instant="enemyIsFloating"
            />
          </VirtualEntity>

          <!-- Jugador -->
          <BattleCombatant
            v-for="p in playerCombatants"
            :key="`player-${p.uid || p.id}`"
            side="player"
            :pokemon="p"
            :position="p1Pos"
            :target-position="p2Pos"
            :base-size="BASE_ENTITY_SIZE_PLAYER"
            :ground-y="playerGroundY"
            :shadow-key="currentPlayerShadowKey"
            :anim-state="getPokemonAnimState('player', p)"
            :ball-id="getPokemonBallId('player', p)"
            :is-shaking="getPokemonIsShaking('player', p)"
            :is-blinking="getPokemonIsBlinking('player', p)"
            :is-healing="getPokemonIsHealing('player', p)"
            :is-attacking="battleStore.attackerSide === 'player' && p.uid === player?.uid"
            :active-move="battleStore.activeMove ? { side: battleStore.activeMove.side || 'player', cat: battleStore.activeMove.cat || 'physical', name: battleStore.activeMove.name, selfKO: battleStore.activeMove.selfKO } : null"
            :show-guides="showGuides"
            :is-capture-success="getPokemonCaptureActive('player', p)"
            :sparkles="catchSparkles.filter(s => s.side === 'player')"
            :stages="battleStore.playerStages"
            :is-fainting="false"
            :hidden="isPlayerTechnicalHidden && p.uid === player?.uid"
            :has-seat="true"
          />
          <!-- Globo de diálogo en la zona del jugador (P1 ANCHOR) -->
          <VirtualEntity
            :x="p1Pos.x"
            :y="p1Pos.y"
            :w="BASE_ENTITY_SIZE_PLAYER"
            :h="BASE_ENTITY_SIZE_PLAYER"
            class="dialog-bubble-entity"
          >
            <Transition
              :css="false"
              appear
              @before-enter="onDialogBeforeEnter"
              @enter="onDialogEnter"
              @leave="onDialogLeave"
            >
              <div
                v-if="(battle?.isTrainer || battle?.isGym) && (
                  (battleStore.currentFsmState === 'FIRST_INTRO' && (
                    battleStore.currentSubState === 'SHOW_DIALOGS'
                  )) ||
                  (battleStore.currentFsmState === 'SEARCH_PHASE' && (
                    battleStore.currentSubState === 'COMBAT_OR_FLEE'
                  ))
                )"
                class="speech-bubble"
              >
                <div class="bubble-speaker">
                  {{ battle?.trainerName || 'Entrenador' }}:
                </div>
                <div class="bubble-text">
                  {{ trainerDialogText }}
                </div>
                <div class="bubble-tail">
                  <svg
                    viewBox="0 0 120 100"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M -10 40 L 115 2 L -10 80 Z"
                      fill="white"
                    />
                    <path
                      d="M 0 40 L 120 0 L 0 80"
                      fill="none"
                      stroke="#141824"
                      stroke-width="8"
                    />
                    />
                  </svg>
                </div>
              </div>
            </Transition>
          </VirtualEntity>
        </div>
      </VirtualSpace>
    </div>

    <!-- Atmósfera -->
    <AtmosphereLayer
      :weather="computedWeather"
      :cycle="mapStore.currentCycle"
      :season="mapStore.currentSeason.id"
      :is-performance-mode="uiStore.isPerformanceMode"
      :z-index="'calc(var(--z-base) + 20)'"
      :anim-seed="atmosphereSeed"
      :is-visible="true"
    />

    <!-- HUD -->
    <div class="battle-info-container">
      <Transition
        :css="false"
        @before-enter="onHudEnemyBeforeEnter"
        @enter="onHudEnemyEnter"
        @leave="onHudEnemyLeave"
      >
        <div
          v-if="!isEnemyHudSuppressed && activeEnemyData"
          :key="`hud-enemy-seat`"
          class="combatant-info-wrap enemy-side"
        >
          <BattleInfoCard 
            :pokemon="activeEnemyData as Pokemon" 
            :is-scrambled="shouldScrambleEnemyData"
          />
        </div>
      </Transition>
      <Transition
        :css="false"
        @before-enter="onHudPlayerBeforeEnter"
        @enter="onHudPlayerEnter"
        @leave="onHudPlayerLeave"
      >
        <div
          v-if="!isPlayerHudSuppressed && activePlayerData"
          :key="`hud-player-seat`"
          class="combatant-info-wrap player-side"
        >
          <BattleInfoCard
            :pokemon="activePlayerData as Pokemon"
            :is-player="true"
          />
        </div>
      </Transition>
    </div>

    <!-- Los minijuegos de Pesca y Arqueología se disparan como modales tradicionales mediante ModalRegistry en el watcher FSM -->

    <!-- Controles de Zoom de Cámara -->
    <CameraZoomControls />
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_battle-arena-view.scss"></style>
