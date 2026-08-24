<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted, provide, ref, nextTick } from 'vue'
import { gsap } from 'gsap'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battle/battle'
import { useUIStore } from '@/stores/ui'
import { useMapStore } from '@/stores/map'
import { useAudioStore } from '@/stores/audio'
import { getRouteWeather } from '@/logic/weather/weatherUtils'
import { getWeatherAnimSeed } from '@/logic/weather/weatherMath.ts'
import { requireWeatherId, type WeatherId } from '@/logic/weather/weatherRegistry'
import { requireWeatherSeasonId } from '@/data/world/weather-tables'
import { requireMapRouteId } from '@/data/world/map-assets'
import { requireDayPhase } from '@/logic/utils/timeUtils'
import { useCombatCamera } from '@/composables/battle/useCombatCamera'
import { getCombatantPosition, WORLD_CONSTANTS } from '@/logic/combat/spatialCoordinator'
import { MAX_PRNG_SEED_RANGE } from '@/logic/constants/visuals'
import {
  GSAP_FAST_DURATION_SEC,
  ARENA_INITIAL_LOAD_DELAY_SEC
} from '@/logic/constants/animations'

// Composables
import { useBattleShadows } from '@/composables/battle/useBattleShadows'
import { useBattleAnimations } from '@/composables/battle/useBattleAnimations'
import { useBattleHud } from '@/composables/battle/useBattleHud'
import { useWeatherVisuals } from '@/composables/effects/useWeatherVisuals'
import { useBattleMinigames } from '@/composables/battle/useBattleMinigames'
import { useBattleArenaCoordinator } from '@/composables/battle/useBattleArenaCoordinator'
import { useBattleCombatants } from '@/composables/battle/useBattleCombatants'
import { useBattleTrainerVisuals } from '@/composables/battle/useBattleTrainerVisuals'
import { createBattleAnimationsBridge } from './helpers/battleAnimationsBridge.ts'

// Componentes
import VirtualSpace from './VirtualSpace.vue'
import VirtualEntity from './VirtualEntity.vue'
import BattleEnvironment from './BattleEnvironment.vue'
import BattleCombatant from './BattleCombatant.vue'
import CombatGrass from './CombatGrass.vue'
import AtmosphereLayer from '@/components/common/AtmosphereLayer.vue'
import CameraZoomControls from './CameraZoomControls.vue'
import BattleArenaHud from './BattleArenaHud.vue'
import BattleTrainerSpeechBubble from './BattleTrainerSpeechBubble.vue'
import BattleTrainerEntities from './BattleTrainerEntities.vue'
import { playTrainerAnimation } from './helpers/trainerEntranceAnims.ts'

const { BASE_ENTITY_SIZE_PLAYER, BASE_ENTITY_SIZE_ENEMY, OBJECT_SCALE } = WORLD_CONSTANTS

const battleStore = useBattleStore()
const { isSearching } = storeToRefs(battleStore)
const mapStore = useMapStore()
const uiStore = useUIStore()
const audioStore = useAudioStore()
const currentWeatherSeason = computed(() => requireWeatherSeasonId(mapStore.currentSeason.id))
const atmosphereSeed = computed(() => getWeatherAnimSeed(mapStore.currentMap))

// Forzar Alta Fidelidad en el Combate
provide('forceHighFidelity', true)
provide('isModalPerformanceMode', computed(() => false))

const arenaRef = ref<HTMLElement | null>(null)
const trainerEntitiesRef = ref<{ getTrainerElement: () => HTMLElement | null } | null>(null)
const { cameraStyles, worldStyles, showGuides } = useCombatCamera(arenaRef)

const showRivalAlert = ref(false)
const rivalFlickerRef = ref<HTMLElement | null>(null)
const rivalExclamationRef = ref<HTMLElement | null>(null)

const battle = computed(() => battleStore.state)
const enemy = computed(() => battle.value?.enemy)
const player = computed(() => battle.value?.player)
const p1Pos = computed(() => getCombatantPosition('player'))
const p2Pos = computed(() => getCombatantPosition('enemy'))

// Semilla única por encuentro: se regenera al inicio de cada combate para que
// los arbustos (CombatGrass) sean visualmente distintos en cada batalla.
const grassSeed = ref(Math.floor(Math.random() * MAX_PRNG_SEED_RANGE))
watch(() => battle.value?.enemy?.uid, (newUid, oldUid) => {
  if (newUid && newUid !== oldUid) {
    grassSeed.value = Math.floor(Math.random() * MAX_PRNG_SEED_RANGE)
  }
})

const { playerBackSpriteUrl, showStandingTrainers, trainerDialogText } = useBattleTrainerVisuals(battleStore, battle)

// Inicializar Composables
const {
  currentPlayerShadowKey, currentEnemyShadowKey,
  enemyGroundY, playerGroundY,
  syncEnemyShadow, syncPlayerShadow, preloadCombatCoords
} = useBattleShadows()

const animations = useBattleAnimations(battleStore, enemy)
const localAnimations = createBattleAnimationsBridge(animations)
battleStore.animations = localAnimations
const {
  isInitialLoad, isFaintInProgress, faintedPokemonSnapshot,
  playerAnimState, enemyAnimState, catchSparkles,
  isIntroInProgress, initListeners, cleanupListeners,
  trainerAnimState, isTrainerVisible, isGlobalFadeActive,
  isWildEntryAnimation, wildRevealActive, isEmerging, upcomingIsEmerging, isCaptureSequenceActive,
  resetAll, getPokemonAnimState, getPokemonBallId, getPokemonCaptureActive,
  getPokemonIsShaking, getPokemonIsBlinking, getPokemonIsHealing, silhouetteOpacity
} = animations

initListeners()

// Reactive z-index for front bush via VirtualEntity :z-index prop.
// Behind pokemon (+1) when emerging or in encounter intro phase; in front (+3) otherwise.
const frontBushZIndex = computed(() => {
  return bushIsBehind.value
    ? 'calc(var(--z-map-spawns) + 1)'
    : 'calc(var(--z-map-spawns) + 3)'
})

const {
  handleMinigameCancel,
  handleFishingSuccess,
  handleFishingFail,
  handleArchaeologySuccess,
  handleArchaeologyFail
} = useBattleMinigames(battleStore, mapStore, uiStore, enemy, resetAll)

const { playerCombatants, enemyCombatants } = useBattleCombatants(battleStore, player, enemy)

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

const effectiveBattleVisual = computed<string>(() => {
  // 1. Terrenos y efectos de campo activos en combate (máxima prioridad visual para iluminación de arena)
  if (battle.value?.fieldConditions) {
    const fieldKeys = Object.keys(battle.value.fieldConditions)
    const terrain = fieldKeys.find(k => ['electricterrain', 'grassyterrain', 'mistyterrain', 'psychicterrain', 'trickroom', 'gravity'].includes(k))
    if (terrain) return terrain
  }

  // 2. Efectos de bando activos como neblina (mist), stealthrock, toxicspikes
  const sideConds = { ...battle.value?.enemySideConditions, ...battle.value?.playerSideConditions }
  const sideField = Object.keys(sideConds).find(k => ['mist', 'stealthrock', 'toxicspikes'].includes(k))
  if (sideField) return sideField

  // 3. Si hay un clima temporal activo en el combate
  if (battle.value?.weather && battle.value.weather.type !== 'clear' && battle.value.weather.type !== 'none') {
    return battle.value.weather.visual || battle.value.weather.type
  }

  // 4. Bloquear clima natural en gimnasios
  if (battle.value?.isGym) return 'clear'

  // 5. De lo contrario, cae en el clima global o del mapa
  if (mapStore.globalWeather) return mapStore.globalWeather
  return getRouteWeather(
    requireMapRouteId(battle.value?.locationId || 'route1'),
    requireWeatherSeasonId(mapStore.currentSeason.id),
    mapStore.currentEpochHour,
    requireDayPhase(mapStore.currentCycle)
  )
})

const computedWeather = computed<WeatherId>(() => {
  // Si hay un clima temporal activo en el combate, esa es la fuente de verdad para partículas (incluso en gimnasios)
  if (battle.value?.weather && battle.value.weather.type !== 'clear' && battle.value.weather.type !== 'none') {
    return requireWeatherId(battle.value.weather.visual || battle.value.weather.type)
  }
  // Bloquear clima natural en gimnasios
  if (battle.value?.isGym) return 'clear'
  // De lo contrario, cae en el clima global o del mapa
  if (mapStore.globalWeather) return requireWeatherId(mapStore.globalWeather)
  return requireWeatherId(getRouteWeather(
    requireMapRouteId(battle.value?.locationId || 'route1'),
    requireWeatherSeasonId(mapStore.currentSeason.id),
    mapStore.currentEpochHour,
    requireDayPhase(mapStore.currentCycle)
  ))
})

const { atmosphereFilter, weatherOnlyFilter } = useWeatherVisuals({
  weather: effectiveBattleVisual,
  cycle: computed(() => battle.value?.isGym ? 'neutral' : mapStore.currentCycle)
})

// Unified Style Orchestration to prevent reactivity breaks in templates
const arenaContentStyles = computed(() => {
  const isCave = !!(battle.value?.isCave || battle.value?.isCrystalCave)
  return {
    ...cameraStyles.value,
    '--atmosphere-filter': isCave ? 'none' : atmosphereFilter.value,
    '--weather-filter': isCave ? 'none' : weatherOnlyFilter.value
  }
})

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

useBattleArenaCoordinator({
  battleStore,
  battle,
  enemy,
  resetAll,
  handleFishingSuccess,
  handleFishingFail,
  handleArchaeologySuccess,
  handleArchaeologyFail,
  handleMinigameCancel
})


watch(isIntroInProgress, (val) => {
  battleStore.isIntroAnimating = val
  if (window.__VITE_DEBUG__?.isScriptedReplayMode) {
    window.__VITE_DEBUG__.certifiedReplayIntroDiagnostics = {
      isIntroInProgress: val,
      isWildEntryAnimation: isWildEntryAnimation.value,
      wildRevealActive: wildRevealActive.value,
      isEmerging: isEmerging.value,
      upcomingIsEmerging: upcomingIsEmerging.value,
      trainerAnimState: trainerAnimState.value,
      isCaptureSequenceActive: isCaptureSequenceActive.value
    }
  }
}, { immediate: true })

const triggerPreloadCoords = () => preloadCombatCoords(
  battle.value?.player || null,
  battle.value?.enemy || null,
  p1Pos.value,
  p2Pos.value,
  battle.value?.playerTeam || [],
  battle.value?.enemyTeam || []
)

onMounted(async () => {
  await triggerPreloadCoords()
  const tl = gsap.timeline()
  tl.to({}, { duration: ARENA_INITIAL_LOAD_DELAY_SEC })
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
  const el = trainerEntitiesRef.value?.getTrainerElement()
  if (!el || !(el instanceof HTMLElement)) return
  playTrainerAnimation(
    newState,
    el,
    !!battle.value?.isRival,
    showRivalAlert,
    rivalFlickerRef,
    rivalExclamationRef,
    audioStore
  )
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
    tl.to({}, { duration: GSAP_FAST_DURATION_SEC })
    tl.add(() => {
      if (arenaRef.value) {
        window.dispatchEvent(new Event('resize'))
      }
    })
  }
})

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
            class="back-bush-entity"
            :x="p2Pos.x"
            :y="p2Pos.y"
            :w="BASE_ENTITY_SIZE_ENEMY"
            :h="BASE_ENTITY_SIZE_ENEMY"
          >
            <CombatGrass
              layer="back"
              :location-id="battle?.locationId"
              :ground-y="enemyGroundY"
              :seed="grassSeed"
              :visible="shouldShowEncounterLayers && !enemyIsFloating"
              :instant="isInstantBush"
              :hide-instant="enemyIsFloating"
            />
          </VirtualEntity>

          <!-- Entidades de Entrenadores (Intro, Rival de pie, Jugador de pie) -->
          <BattleTrainerEntities
            ref="trainerEntitiesRef"
            :is-trainer-visible="isTrainerVisible"
            :show-standing-trainers="showStandingTrainers"
            :show-guides="showGuides"
            :p2-pos="p2Pos"
            :base-entity-size-enemy="BASE_ENTITY_SIZE_ENEMY"
            :base-entity-size-player="BASE_ENTITY_SIZE_PLAYER"
            :object-scale="OBJECT_SCALE"
            :is-trainer-or-gym="!!(battle?.isTrainer || battle?.isGym)"
            :is-pv-p="!!battle?.isPvP"
            :trainer-sprite="battle?.trainerSprite"
            :trainer-name="battle?.trainerName"
            :player-back-sprite-url="playerBackSpriteUrl"
          />

          <!-- Enemigo -->
          <BattleCombatant
            v-for="p in enemyCombatants"
            :key="`enemy-seat-${p.uid || 'active'}`"
            side="enemy"
            :pokemon="p"
            :position="p2Pos"
            :target-position="p1Pos"
            :base-size="BASE_ENTITY_SIZE_ENEMY"
            :ground-y="enemyGroundY"
            :shadow-key="currentEnemyShadowKey"
            :z-index="'calc(var(--z-map-spawns) + 2)'"
            :anim-state="getPokemonAnimState('enemy', p)"
            :ball-id="getPokemonBallId('enemy', p)"
            :is-shaking="getPokemonIsShaking('enemy', p)"
            :is-blinking="getPokemonIsBlinking('enemy', p)"
            :is-healing="getPokemonIsHealing('enemy', p)"
            :is-silhouette="activeEnemyIsSilhouette && p.uid === activeEnemyData?.uid"
            :is-attacking="battleStore.attackerSide === 'enemy' && p.uid === enemy?.uid"
            :active-move="battleStore.activeMove ? { side: battleStore.activeMove.side || 'enemy', cat: battleStore.activeMove.cat || 'physical', name: battleStore.activeMove.name, selfKO: battleStore.activeMove.selfKO, recoil: battleStore.activeMove.recoil } : null"
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

          <!-- Arbustos Adelante -->
          <VirtualEntity
            class="front-bush-entity"
            :z-index="frontBushZIndex"
            :x="p2Pos.x"
            :y="p2Pos.y"
            :w="BASE_ENTITY_SIZE_ENEMY"
            :h="BASE_ENTITY_SIZE_ENEMY"
          >
            <CombatGrass
              layer="front"
              :location-id="battle?.locationId"
              :ground-y="enemyGroundY"
              :seed="grassSeed"
              :visible="shouldShowEncounterLayers && !enemyIsFloating"
              :instant="isInstantBush"
              :hide-instant="enemyIsFloating"
            />
          </VirtualEntity>

          <!-- Jugador -->
          <BattleCombatant
            v-for="p in playerCombatants"
            :key="`player-seat-${p.uid || 'active'}`"
            side="player"
            :pokemon="p"
            :position="p1Pos"
            :target-position="p2Pos"
            :base-size="BASE_ENTITY_SIZE_PLAYER"
            :ground-y="playerGroundY"
            :shadow-key="currentPlayerShadowKey"
            :z-index="'calc(var(--z-map-spawns) + 4)'"
            :anim-state="getPokemonAnimState('player', p)"
            :ball-id="getPokemonBallId('player', p)"
            :is-shaking="getPokemonIsShaking('player', p)"
            :is-blinking="getPokemonIsBlinking('player', p)"
            :is-healing="getPokemonIsHealing('player', p)"
            :is-attacking="battleStore.attackerSide === 'player' && p.uid === player?.uid"
            :active-move="battleStore.activeMove ? { side: battleStore.activeMove.side || 'player', cat: battleStore.activeMove.cat || 'physical', name: battleStore.activeMove.name, selfKO: battleStore.activeMove.selfKO, recoil: battleStore.activeMove.recoil } : null"
            :show-guides="showGuides"
            :is-capture-success="getPokemonCaptureActive('player', p)"
            :sparkles="catchSparkles.filter(s => s.side === 'player')"
            :stages="battleStore.playerStages"
            :is-fainting="false"
            :hidden="isPlayerTechnicalHidden && p.uid === player?.uid"
            :has-seat="true"
          />
          <!-- Globo de diálogo en la zona del jugador (P1 ANCHOR) -->
          <BattleTrainerSpeechBubble
            :position="p1Pos"
            :base-size="BASE_ENTITY_SIZE_PLAYER"
            :visible="!!((battle?.isTrainer || battle?.isGym) && (
              (battleStore.currentFsmState === 'FIRST_INTRO' && (
                battleStore.currentSubState === 'SHOW_DIALOGS'
              )) ||
              (battleStore.currentFsmState === 'SEARCH_PHASE' && (
                battleStore.currentSubState === 'COMBAT_OR_FLEE'
              ))
            ))"
            :trainer-name="battle?.trainerName || 'Entrenador'"
            :dialog-text="trainerDialogText"
          />
        </div>
      </VirtualSpace>
    </div>

    <!-- Atmósfera -->
    <AtmosphereLayer
      :weather="computedWeather"
      :cycle="mapStore.currentCycle"
      :season="currentWeatherSeason"
      :is-performance-mode="uiStore.isPerformanceMode"
      :z-index="'calc(var(--z-base) + 20)'"
      :anim-seed="atmosphereSeed"
      :is-visible="true"
    />

    <!-- HUD Genérico (4-Seat Compatible) -->
    <BattleArenaHud
      :active-enemy-data="activeEnemyData"
      :active-player-data="activePlayerData"
      :is-enemy-hud-suppressed="isEnemyHudSuppressed"
      :is-player-hud-suppressed="isPlayerHudSuppressed"
      :should-scramble-enemy-data="shouldScrambleEnemyData"
    />

    <!-- Los minijuegos de Pesca y Arqueología se disparan como modales tradicionales mediante ModalRegistry en el watcher FSM -->

    <!-- Controles de Zoom de Cámara -->
    <CameraZoomControls />

    <!-- Rival Special Presentation Alert -->
    <div
      v-show="showRivalAlert"
      class="rival-alert-overlay"
    >
      <div
        ref="rivalFlickerRef"
        class="rival-alert-flicker"
      />
      <div
        ref="rivalExclamationRef"
        class="rival-alert-exclamation"
      >
        !
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_battle-arena-view.scss"></style>
