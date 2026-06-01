<!-- [PureVue-Ignore-Length] -->
<script setup lang="ts">
import { computed, watch, onMounted, provide, ref } from 'vue'
import { gsap } from 'gsap'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battle'
import { useUIStore } from '@/stores/ui'
import { useMapStore } from '@/stores/map'
import { useModalStore } from '@/stores/modals'
import { getRouteWeather } from '@/logic/weatherUtils'
import { getWeatherAnimSeed } from '@/logic/weather/weatherMath.ts'
import { useCombatCamera } from '@/composables/useCombatCamera'
import { getCombatantPosition, WORLD_CONSTANTS } from '@/logic/combat/spatialCoordinator'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { logger } from '@/logic/utils/logger'
import type { Pokemon } from '@/types/pokemon'

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

const { BASE_ENTITY_SIZE_PLAYER, BASE_ENTITY_SIZE_ENEMY } = WORLD_CONSTANTS

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

// Inicializar Composables
const { 
  currentPlayerShadowKey, currentEnemyShadowKey, 
  enemyGroundY, playerGroundY, 
  syncEnemyShadow, syncPlayerShadow, preloadCombatCoords 
} = useBattleShadows()

const animations = useBattleAnimations(battleStore, enemy)
battleStore.animations = {
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
  // Bridge de bloqueo de turnos: el motor espera la animación de ataque antes de continuar.
  awaitTween: animations.awaitTween
}
const {
  isInitialLoad,
  isFaintInProgress, faintedPokemonSnapshot,
  playerAnimState,
  enemyAnimState,
  catchSparkles,
  isIntroInProgress, initListeners,
  trainerAnimState, isTrainerVisible, isGlobalFadeActive,
  resetAll,
  getPokemonAnimState,
  getPokemonBallId,
  getPokemonCaptureActive,
  getPokemonIsShaking,
  getPokemonIsBlinking,
  getPokemonIsHealing
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
  const locId = battleStore.state?.locationId || 'route1'
  if (battleStore.state) {
    battleStore.state.isFishing = false
    battleStore.state.isArchaeology = false
  }
  resetAll()
  await battleStore.initBattle(locId, false, '', false, '', true)
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

// GSAP: Animación de Entrenador
watch(trainerAnimState, (newState) => {
  if (!trainerRef.value) return
  gsap.killTweensOf(trainerRef.value)
  if (newState === 'entering') {
    gsap.fromTo(trainerRef.value, { x: '150%', scale: 0.8, opacity: 0 }, { x: '0%', scale: 1, opacity: 1, duration: 0.8, ease: 'back.out(1.2)' })
  } else if (newState === 'retreating') {
    gsap.to(trainerRef.value, { x: '150%', scale: 0.8, opacity: 0, duration: 0.8, ease: 'power2.in' })
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
            />
          </VirtualEntity>

          <!-- Entrenador Rival (Solo en modo Trainer/Gym) -->
          <VirtualEntity
            v-if="isTrainerVisible && (battle?.isTrainer || battle?.isGym)"
            ref="trainerRef"
            :x="p2Pos.x"
            :y="p2Pos.y"
            :w="BASE_ENTITY_SIZE_ENEMY"
            :h="BASE_ENTITY_SIZE_ENEMY"
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
