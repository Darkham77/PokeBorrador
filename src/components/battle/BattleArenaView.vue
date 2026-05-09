<script setup lang="ts">

import { computed, watch, onMounted, provide, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battle'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useMapStore } from '@/stores/map'
import { getVisualWeather } from '@/logic/battle/weatherMapper'
import { useCombatCamera } from '@/composables/useCombatCamera'
import { getCombatantPosition, WORLD_CONSTANTS } from '@/logic/combat/spatialCoordinator'
import { getRouteWeather } from '@/logic/weatherUtils'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { logger } from '@/logic/utils/logger'
import type { Pokemon } from '@/types/pokemon'

// Composables
import { useBattleShadows } from '@/composables/useBattleShadows'
import { useBattleAnimations } from '@/composables/useBattleAnimations'
import { useBattleHud } from '@/composables/useBattleHud'

// Componentes
import VirtualSpace from './VirtualSpace.vue'
import VirtualEntity from './VirtualEntity.vue'
import BattleEnvironment from './BattleEnvironment.vue'
import BattleCombatant from './BattleCombatant.vue'
import BattleInfoCard from './BattleInfoCard.vue'
import CombatGrass from './CombatGrass.vue'
import AtmosphereLayer from '@/components/common/AtmosphereLayer.vue'
import FishingMinigame from './FishingMinigame.vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'

const { BASE_ENTITY_SIZE_PLAYER, BASE_ENTITY_SIZE_ENEMY } = WORLD_CONSTANTS

const battleStore = useBattleStore()
const { isSearching } = storeToRefs(battleStore)
const gameStore = useGameStore()
const mapStore = useMapStore()
const uiStore = useUIStore()

// Forzar Alta Fidelidad en el Combate
provide('forceHighFidelity', true)
provide('isModalPerformanceMode', computed(() => false))

const arenaRef = ref<HTMLElement | null>(null)
const { cameraStyles, worldStyles, showGuides } = useCombatCamera(arenaRef)

const gs = computed(() => gameStore.state)
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
const {
  isWildEntryAnimation, isWildSilhouette, wildRevealActive, upcomingIsEmerging, isEmerging,
  isInitialLoad, isCaptureSequenceActive, caughtPokemonSnapshot,
  isFaintInProgress, faintedPokemonSnapshot,
  playerAnimState, enemyAnimState, activePokeballId, catchSparkles,
  playerCaptureActive, enemyCaptureActive,
  playerIsShaking, playerIsBlinking, enemyIsShaking, enemyIsBlinking,
  isIntroInProgress, triggerSearchEncounter, initListeners,
  trainerAnimState, isTrainerVisible, isGlobalFadeActive
} = animations


const {
  isEnemyHudSuppressed,
  isPlayerHudSuppressed,
  activeEnemyHudData,
  shouldScrambleEnemyData
} = useBattleHud(animations, battleStore, enemy)


const activeEnemyData = computed(() => {
  const s = battleStore.fsm?.currentState
  const sub = battleStore.fsm?.currentSubState

  if (s === 'REWARDS_PHASE' && sub === 'EMPTY_WAIT') {
    return null
  }
  
  // Si estamos en búsqueda o introducción y el asiento está vacío, 
  // mostramos el 'initialEnemy' como silueta de seguridad (Evita fantasmas)
  const realEnemy = activeEnemyHudData.value
  if (!realEnemy && (s === 'FIRST_INTRO' || s === 'SEARCH_PHASE' || s === 'INITIALIZING')) {
    return battleStore.state?._initialEnemy || null
  }

  return realEnemy
})

const activeEnemyIsSilhouette = computed(() => {
  const sub = battleStore.fsm?.currentSubState
  if (!sub) return false
  return [
    'PARALLEL_PREP', 'PARALLEL_ENTRY', 'SILHOUETTE_MODE', 'BUSH_IDLE', 
    'ENTRY_ANIM', 'ENCOUNTER_ANIM', 'PARALLEL_JUMP'
  ].includes(sub)
})

// Determinismo de profundidad: El arbusto se va al fondo SOLO durante el salto o revelación cromática.
// En PARALLEL_PREP / BUSH_VISIBLE se mantiene el efecto "sándwich" (detrás de la capa frontal).
const bushIsBehind = computed(() => {
  const sub = battleStore.fsm?.currentSubState
  if (!sub) return false
  return isEmerging.value || ['ENCOUNTER_ANIM', 'PARALLEL_JUMP', 'REVEAL_COLORS', 'BUSH_FADE'].includes(sub)
})

const enemyIsJumping = computed(() => {
  const sub = battleStore.fsm?.currentSubState
  if (!sub) return false
  return isEmerging.value || sub === 'ENCOUNTER_ANIM' || sub === 'PARALLEL_JUMP'
})

const isInstantBush = computed(() => {
  if (isInitialLoad.value) return true
  const sub = battleStore.fsm?.currentSubState
  // En FIRST_INTRO (Entrada directa), los arbustos son instantáneos
  return battleStore.fsm?.currentState === 'FIRST_INTRO' || sub === 'BUSH_VISIBLE'
})

const enemyIsFloating = computed(() => {
  if (!activeEnemyData.value) return false
  if (activeEnemyData.value.isFloating !== undefined) return activeEnemyData.value.isFloating
  
  const p = activeEnemyData.value
  const isFlying = p.type === 'flying' || p.type2 === 'flying'
  const isLevitating = p.ability === 'Levitación'
  if (isFlying || isLevitating) return true

  const data = p.id ? pokemonDataProvider.getPokemonData(p.id) : null
  return data?.isFloating || false
})

const isWildEncounter = computed(() => {
  if (isSearching.value) return true
  return !!(battleStore.state && !battleStore.state.isTrainer && !battleStore.state.isGym)
})

const isEnemyTechnicalHidden = computed(() => {
  const sub = battleStore.fsm?.currentSubState
  const state = battleStore.fsm?.currentState
  const isTrainer = !isWildEncounter.value
  
  // 1. Forzar ocultación en estados de promoción técnica (Slot 2 -> Slot 1)
  if (sub === 'GEN_TEAMS') return true
  
  // 2. Si estamos en búsqueda, ocultar durante la generación técnica de datos
  if (state === 'SEARCH_PHASE') {
    const technicalSubstates = [
      'RECEIVE_CONFIG', 'WEIGHT_CALCULATION', 'INJECT_FILTERS', 
      'READY_FOR_GEN'
    ]
    if (technicalSubstates.includes(sub || '')) return true
  }

  // 3. Ocultar mientras el entrenador es visible (Mood Visual)
  const trainerVisibleStates = ['TRAINER_ENTRY', 'T_VISUAL', 'TRAINER_RETREAT', 'POKEMON_CALL', 'RENDER_BALL']
  if (isTrainer && trainerVisibleStates.includes(sub || '')) return true
  
  return false
})

const isPlayerTechnicalHidden = computed(() => {
  const sub = battleStore.currentSubState
  const isTrainer = battleStore.state?.isTrainer || battleStore.state?.isGym
  
  // El jugador está oculto mientras el entrenador del jugador es visible (Mood Visual)
  // Por ahora la lógica de entrada de entrenador jugador es síncrona con POKEMON_CALL
  return !!isTrainer && ['TRAINER_ENTRY', 'T_VISUAL'].includes(sub || '')
})

const computedWeather = computed(() => {
  // 1. Prioridad Absoluta: Clima de combate activo (Store de Batalla)
  if (battleStore.state?.weather) {
    const w = battleStore.state.weather
    // Prioridad: Visual preservado -> Mapeo del tipo mecánico
    return getVisualWeather(w.visual || w.type)
  }
  
  // 2. Clima global de Eventos (Si no estamos en combate o no hay override)
  if (mapStore.globalWeather) return mapStore.globalWeather
  
  // 3. Clima determinístico de la ruta
  return getRouteWeather(battle.value?.locationId || 'route1', mapStore.currentSeason.id, mapStore.currentEpochHour)
})

const shouldShowEncounterLayers = computed(() => {
  if (enemyAnimState.value === 'catching' || enemyAnimState.value === 'trapped' || enemyAnimState.value === 'releasing') return false
  if (isCaptureSequenceActive.value || isFaintInProgress.value) return false
  
  // Si el Pokémon vuela, no mostramos capas ambientales (arbustos)
  if (enemyIsFloating.value) return false

  const fsmSub = battleStore.fsm?.currentSubState
  // Mostrar capas (arbustos) en todos los estados de búsqueda y entrada salvaje plana
  if (fsmSub && ['PARALLEL_ENTRY', 'PARALLEL_JUMP', 'ENTRY_ANIM', 'ENCOUNTER_ANIM', 'BUSH_IDLE', 'WILD_ENTRY', 'BUSH_FADE', 'REVEAL_COLORS'].includes(fsmSub)) {
    return isWildEncounter.value
  }

  return isWildEncounter.value && (isSearching.value || wildRevealActive.value)
})


const atmosphereSeed = computed(() => {
  return (battle.value?.locationId || 'route1').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
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
      isWildEntryAnimation.value = false
      isEmerging.value = false
      isWildSilhouette.value = false
      wildRevealActive.value = false
      upcomingIsEmerging.value = false
      isFaintInProgress.value = false
      faintedPokemonSnapshot.value = null
      enemyAnimState.value = null
      playerAnimState.value = null
      caughtPokemonSnapshot.value = null
      catchSparkles.value = []
      playerCaptureActive.value = false
      enemyCaptureActive.value = false
      enemyIsShaking.value = false
      enemyIsBlinking.value = false
      playerIsShaking.value = false
      playerIsBlinking.value = false

      battleStore.attackerSide = null
      battleStore.activeMove = null
      battleStore.enemyStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }
    }
  },
  { immediate: true }
)

const handleFishingSuccess = async () => {
  logger.success('BattleArenaView', 'Fishing SUCCESS')
  await triggerSearchEncounter()
}

const handleFishingFail = async () => {
  logger.warn('BattleArenaView', 'Fishing FAIL')
}


watch(isIntroInProgress, (val) => { battleStore.isIntroAnimating = val }, { immediate: true })

onMounted(async () => {
  initListeners()
  await preloadCombatCoords(
    (battle.value?.player || null), 
    (battle.value?.enemy || null), 
    p1Pos.value, 
    p2Pos.value,
    battle.value?.playerTeam || [],
    battle.value?.enemyTeam || []
  )
  window.setTimeout(() => { isInitialLoad.value = false }, 500)
})

// Ejecutar PRELOAD_COORDS para combates consecutivos
watch(() => battleStore.currentSubState, async (sub) => {
  if (sub === 'PRELOAD_FINAL_COORDS') {
    await preloadCombatCoords(
      (battle.value?.player || null), 
      (battle.value?.enemy || null), 
      p1Pos.value, 
      p2Pos.value,
      battle.value?.playerTeam || [],
      battle.value?.enemyTeam || []
    )
  }
})

// Forzar actualización de cámara cuando el combate se activa para evitar el glitch de "pantalla negra"
watch(() => battleStore.isBattleActive, (active) => {
  if (active) {
    window.setTimeout(() => {
      if (arenaRef.value) {
        window.dispatchEvent(new Event('resize'))
      }
    }, 100) // Pequeño delay para dejar que el modal se asiente
  }
})
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
      :style="cameraStyles"
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
            :x="p2Pos.x"
            :y="p2Pos.y"
            :w="BASE_ENTITY_SIZE_ENEMY"
            :h="BASE_ENTITY_SIZE_ENEMY"
            class="trainer-entity"
            :class="trainerAnimState"
          >
            <div class="trainer-sprite-wrapper">
              <img 
                :src="getAssetUrl(ASSET_TYPES.TRAINER, battle?.trainerName || 'entrenador')" 
                class="trainer-image"
                @error="(e: Event) => (e.target as HTMLImageElement).src = getAssetUrl(ASSET_TYPES.TRAINER, 'entrenador')"
              >
            </div>
          </VirtualEntity>

          <!-- Enemigo -->
          <BattleCombatant
            v-if="activeEnemyData"
            :key="`enemy-${activeEnemyData?.uid || activeEnemyData?.id || 'empty'}`"
            side="enemy"
            :pokemon="activeEnemyData as Pokemon"
            :position="p2Pos"
            :base-size="BASE_ENTITY_SIZE_ENEMY"
            :ground-y="enemyGroundY"
            :shadow-key="currentEnemyShadowKey"
            :anim-state="enemyAnimState"
            :ball-id="activePokeballId"
            :is-shaking="enemyIsShaking"
            :is-blinking="enemyIsBlinking"
            :is-silhouette="activeEnemyIsSilhouette"
            :is-attacking="battleStore.attackerSide === 'enemy'"
            :active-move="battleStore.activeMove ? { side: battleStore.activeMove.side || 'enemy', cat: battleStore.activeMove.cat || 'physical', name: battleStore.activeMove.name } : null"
            :show-guides="showGuides"
            :is-capture-success="enemyCaptureActive"
            :sparkles="catchSparkles.filter(s => s.side === 'enemy')"
            :is-fainting="isFaintInProgress && faintedPokemonSnapshot?.side === 'enemy'"
            :is-emerging="enemyIsJumping"
            :suppress-fx="isSearching || isIntroInProgress"
            :stages="battleStore.enemyStages"
            :hidden="isEnemyTechnicalHidden"
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
            v-if="player"
            :key="`player-${player?.uid || player?.id || 'empty'}`"
            side="player"
            :pokemon="player"
            :position="p1Pos"
            :base-size="BASE_ENTITY_SIZE_PLAYER"
            :ground-y="playerGroundY"
            :shadow-key="currentPlayerShadowKey"
            :anim-state="playerAnimState"
            :is-shaking="playerIsShaking"
            :is-blinking="playerIsBlinking"
            :is-attacking="battleStore.attackerSide === 'player'"
            :active-move="battleStore.activeMove ? { side: battleStore.activeMove.side || 'player', cat: battleStore.activeMove.cat || 'physical', name: battleStore.activeMove.name } : null"
            :show-guides="showGuides"
            :is-capture-success="playerCaptureActive"
            :sparkles="catchSparkles.filter(s => s.side === 'player')"
            :stages="battleStore.playerStages"
            :is-fainting="isFaintInProgress && faintedPokemonSnapshot?.side === 'player'"
            :hidden="isPlayerTechnicalHidden"
          />
        </div>
      </VirtualSpace>
    </div>

    <!-- Atmósfera -->
    <AtmosphereLayer
      :weather="computedWeather"
      :cycle="mapStore.currentCycle"
      :season="mapStore.currentSeason.id"
      :is-performance-mode="uiStore.isDebugPerformanceMode"
      :z-index="'calc(var(--z-base) + 20)'"
      :seed="atmosphereSeed"
    />

    <!-- HUD -->
    <div class="battle-info-container">
      <Transition name="hud-fade-enemy">
        <div
          v-if="!isEnemyHudSuppressed && activeEnemyData"
          class="combatant-info-wrap enemy-side"
        >
          <BattleInfoCard 
            :pokemon="activeEnemyData as Pokemon" 
            :is-scrambled="shouldScrambleEnemyData"
          />
        </div>
      </Transition>
      <Transition name="hud-fade-player">
        <div
          v-if="!isPlayerHudSuppressed && player"
          class="combatant-info-wrap player-side"
        >
          <BattleInfoCard
            :pokemon="player"
            :is-player="true"
            :nick-style="gs.nick_style || undefined"
          />
        </div>
      </Transition>
    </div>

    <FishingMinigame
      v-if="battleStore.fsm?.currentSubState === 'MINIGAME_CHECK' && enemy"
      :enemy="enemy"
      :rarity="battle?.rarity || 50"
      @success="handleFishingSuccess"
      @fail="handleFishingFail"
    />
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.battle-arena {
  position: relative;
  width: 100%;
  flex: 1;
  background: black;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 30px Rgba(0,0,0,0.5);
  
  @media (min-width: 1081px) {
    grid-area: arena;
    height: 100% !important;
  }
}

.battle-arena-content { position: absolute; inset: 0; overflow: hidden; }
.battle-sprites { position: absolute; inset: 0; pointer-events: none; z-index: calc(var(--z-base) + 10); }

.battle-info-container {
  position: absolute; inset: 0; z-index: calc(var(--z-base) + 30);
  padding: 4cqw; display: flex; flex-direction: column; pointer-events: none;
  @media (max-width: 600px) { padding: 2cqw; }
}

.combatant-info-wrap { pointer-events: auto; }
.enemy-side { align-self: flex-start; }
.player-side { align-self: flex-end; margin-top: auto; }

/* Animaciones laterales diferenciadas */
.hud-fade-enemy-enter-active, .hud-fade-enemy-leave-active,
.hud-fade-player-enter-active, .hud-fade-player-leave-active { 
  transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); 
  @include gpu-layer;
}

.hud-fade-enemy-enter-from, .hud-fade-enemy-leave-to { opacity: 0; transform: Translatex(-20px) Scale(0.98); }
.hud-fade-player-enter-from, .hud-fade-player-leave-to { opacity: 0; transform: Translatex(20px) Scale(0.98); }

/* --- ANIMACIONES DE ENTRENADOR Y TRANSICIONES --- */
.global-transition-overlay {
  position: absolute; inset: 0; background: black; z-index: var(--z-max);
  pointer-events: none;
}

.fade-overlay-enter-active, .fade-overlay-leave-active { transition: opacity 0.6s ease; }
.fade-overlay-enter-from, .fade-overlay-leave-to { opacity: 0; }

.trainer-entity {
  z-index: var(--z-map-spawns);
  display: flex; align-items: flex-end; justify-content: center;
  transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease;
  
  &.entering { animation: trainer-slide-in 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
  &.retreating { animation: trainer-slide-out 0.8s ease-in forwards; }
}

.trainer-sprite-wrapper {
  width: 100%; height: 100%; display: flex; align-items: flex-end; justify-content: center;
  padding-bottom: 10%; // Alineación base
}

.trainer-image {
  height: 90%; width: auto; object-fit: contain;
  will-change: transform, filter, opacity;
  filter: Drop-Shadow(0 4px 8px Rgba(0,0,0,0.5));
  image-rendering: pixelated;
}

@keyframes trainer-slide-in {
  0% { transform: Translatex(150%) Scale(0.8); opacity: 0; }
  100% { transform: Translatex(0) Scale(1); opacity: 1; }
}

@keyframes trainer-slide-out {
  0% { transform: Translatex(0) Scale(1); opacity: 1; }
  100% { transform: Translatex(150%) Scale(0.8); opacity: 0; }
}
</style>
