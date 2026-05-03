<script setup>
// [PureVue-Ignore-Length]
import { computed, watch, onMounted, provide, ref } from 'vue'
import { useBattleStore } from '@/stores/battle'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useMapStore } from '@/stores/map'
import { getVisualWeather } from '@/logic/battle/weatherMapper'
import { useCombatCamera } from '@/composables/useCombatCamera'
import { getCombatantPosition, WORLD_CONSTANTS } from '@/logic/combat/spatialCoordinator'
import { getRouteWeather } from '@/logic/weatherUtils'

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
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'

const { BASE_ENTITY_SIZE_PLAYER, BASE_ENTITY_SIZE_ENEMY } = WORLD_CONSTANTS

const battleStore = useBattleStore()
const gameStore = useGameStore()
const mapStore = useMapStore()
const uiStore = useUIStore()

// Forzar Alta Fidelidad en el Combate
provide('forceHighFidelity', true)
provide('isModalPerformanceMode', computed(() => false))

const arenaRef = ref(null)
const { cameraStyles, worldStyles, showGuides } = useCombatCamera(arenaRef)

const gs = computed(() => gameStore.state)
const battle = computed(() => battleStore.state)
const enemy = computed(() => battle.value?.enemy)
const player = computed(() => battle.value?.player)
const isSearching = computed(() => battleStore.isSearching)
const upcomingPokemon = computed(() => battleStore.upcomingPokemon)

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
  isWildEntryAnimation, isWildSilhouette, wildRevealActive, upcomingIsEmerging,
  isInitialLoad, isCaptureSequenceActive, caughtPokemonSnapshot,
  isFaintInProgress, faintedPokemonSnapshot,
  playerAnimState, enemyAnimState, activePokeballId, catchSparkles,
  playerCaptureActive, enemyCaptureActive,
  playerIsShaking, playerIsBlinking, enemyIsShaking, enemyIsBlinking,
  isIntroInProgress, triggerWildEmergence, initListeners
} = animations

const {
  isEnemyHudSuppressed,
  isPlayerHudSuppressed,
  activeEnemyHudData
} = useBattleHud(animations, battleStore, enemy)

const isFinishing = computed(() => {
  if (isCaptureSequenceActive.value || isFaintInProgress.value) return true
  if (battle.value?.over || battleStore.isFinishing) return true
  return false
})

const activeEnemyData = computed(() => {
  return activeEnemyHudData.value
})

const activeEnemyIsSilhouette = computed(() => {
  const hasBinoculars = gameStore.state.inventory?.['binoculars'] > 0
  if (hasBinoculars || battleStore.debugBinoculars) return false
  
  // Prioridad: Si hay un desmayo en curso, el pokémon que se desvanece NO es silueta
  if (isFaintInProgress.value) return false
  
  // Si estamos buscando o finalizando y hay un pokemon en cola, siempre es silueta
  if ((isSearching.value || isFinishing.value) && upcomingPokemon.value) return true
  
  // Estados de animación intrínsecos de entrada salvaje
  if (isWildEntryAnimation.value || wildRevealActive.value || isWildSilhouette.value || upcomingIsEmerging.value) return true
  
  return false
})

const enemyIsFloating = computed(() => {
  if (!activeEnemyData.value) return false
  if (activeEnemyData.value.isFloating !== undefined) return activeEnemyData.value.isFloating
  const data = pokemonDataProvider.getPokemonData(activeEnemyData.value.id)
  return data?.isFloating || false
})

const isWildEncounter = computed(() => {
  if (isSearching.value) return true
  return battleStore.state && !battleStore.state.isTrainer && !battleStore.state.isGym
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
  
  const isUpcomingReady = isSearching.value && !!upcomingPokemon.value
  return !!(isUpcomingReady || isWildEntryAnimation.value || wildRevealActive.value || isFinishing.value)
})

const atmosphereSeed = computed(() => {
  return (battle.value?.locationId || 'route1').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
})

// Watchers de Sincronización
// Watcher para sincronizar sombras (Jugador y Enemigo)
watch([() => activeEnemyData.value, p2Pos, () => enemyAnimState.value, activeEnemyIsSilhouette], ([data, pos, anim, isSil]) => {
  // En Fase 2 (Búsqueda), solo mostrar sombra si hay silueta activa o ya no estamos buscando
  const isSearchPhase = isSearching.value
  const visible = !!data && (!isSearchPhase || isSil)
  syncEnemyShadow(visible, data, pos, anim)
}, { immediate: true, deep: true })

watch([player, p1Pos, () => playerAnimState.value], ([p, pos, anim]) => {
  syncPlayerShadow(p, pos, anim)
}, { immediate: true, deep: true })

watch(() => enemy.value?.hp, (newHp, oldHp) => {
  if (newHp <= 0 && oldHp > 0 && !isCaptureSequenceActive.value) {
    faintedPokemonSnapshot.value = enemy.value ? { ...enemy.value } : null
    isFaintInProgress.value = true
    setTimeout(() => { isFaintInProgress.value = false; faintedPokemonSnapshot.value = null }, 1300)
  }
})

watch(isIntroInProgress, (val) => { battleStore.isIntroAnimating = val }, { immediate: true })

onMounted(async () => {
  initListeners()
  await preloadCombatCoords(
    player.value, 
    activeEnemyData.value, 
    p1Pos.value, 
    p2Pos.value,
    battle.value?.playerTeam,
    battle.value?.enemyTeam
  )
  if (battle.value && !battle.value.over && isWildEncounter.value) triggerWildEmergence()
  setTimeout(() => { isInitialLoad.value = false }, 500)
})

// Forzar actualización de cámara cuando el combate se activa para evitar el glitch de "pantalla negra"
watch(() => battleStore.isBattleActive, (active) => {
  if (active) {
    setTimeout(() => {
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
  >
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
              :instant="isInitialLoad"
            />
          </VirtualEntity>

          <!-- Enemigo -->
          <BattleCombatant
            :key="`enemy-${activeEnemyData?.uid || activeEnemyData?.id || 'empty'}`"
            side="enemy"
            :pokemon="activeEnemyData"
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
            :active-move="battleStore.activeMove"
            :show-guides="showGuides"
            :is-capture-success="enemyCaptureActive"
            :sparkles="catchSparkles.filter(s => s.side === 'enemy')"
            :is-fainting="isFaintInProgress"
            :is-emerging="isEmerging"
            :suppress-fx="isSearching || isIntroInProgress"
            :stages="battleStore.enemyStages"
          />

          <!-- Arbustos Adelante -->
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
              :instant="isInitialLoad"
            />
          </VirtualEntity>

          <!-- Jugador -->
          <BattleCombatant
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
            :active-move="battleStore.activeMove"
            :show-guides="showGuides"
            :is-capture-success="playerCaptureActive"
            :sparkles="catchSparkles.filter(s => s.side === 'player')"
            :stages="battleStore.playerStages"
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
      :seed="atmosphereSeed"
    />

    <!-- HUD -->
    <div class="battle-info-container">
      <Transition name="hud-fade-enemy">
        <div
          v-if="!isEnemyHudSuppressed && enemy && enemy.hp > 0"
          class="combatant-info-wrap enemy-side"
        >
          <BattleInfoCard :pokemon="enemy" />
        </div>
      </Transition>
      <Transition name="hud-fade-player">
        <div
          v-if="!isPlayerHudSuppressed && player && player.hp > 0"
          class="combatant-info-wrap player-side"
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

.battle-arena {
  position: relative;
  width: 100%;
  height: 100%;
  flex: 1;
  background: black;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 30px Rgba(0,0,0,0.5);
  
  @media (min-width: 761px) {
    grid-area: arena;
    height: 100% !important;
  }
}

.battle-arena-content { position: absolute; inset: 0; overflow: hidden; }
.battle-sprites { position: absolute; inset: 0; pointer-events: none; z-index: calc(var(--z-base) + 10); }

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
.enemy-side { align-self: flex-start; }
.player-side { align-self: flex-end; margin-top: auto; }

/* Animaciones laterales diferenciadas */
.hud-fade-enemy-enter-active, .hud-fade-enemy-leave-active,
.hud-fade-player-enter-active, .hud-fade-player-leave-active { 
  transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); 
  @include gpu-layer;
}

.hud-fade-enemy-enter-from, .hud-fade-enemy-leave-to { 
  opacity: 0; 
  transform: TranslateX(-20px) Scale(0.98); 
}

.hud-fade-player-enter-from, .hud-fade-player-leave-to { 
  opacity: 0; 
  transform: TranslateX(20px) Scale(0.98); 
}
</style>
