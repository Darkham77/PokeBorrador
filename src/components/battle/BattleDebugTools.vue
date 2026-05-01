// [PureVue-Ignore-Length] 
<script setup>
import { ref, computed } from 'vue'
import { useBattleStore } from '@/stores/battle'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { PDEX_ORDER, GEN2_PDEX_ORDER } from '@/data/pokedex'
import { gameBus } from '@/logic/gameBus'

const ALL_PDEX = [...PDEX_ORDER, ...GEN2_PDEX_ORDER]

const battleStore = useBattleStore()
const gameStore = useGameStore()
const uiStore = useUIStore()
const isOpen = ref(false)

const isDebug = computed(() => typeof window !== 'undefined' && !!window.__VITE_DEBUG__)

const defeatEnemy = async () => {
  const e = battleStore.enemy
  if (!e) return
  battleStore.addLog('DEBUG: Ejecutando Daño Máximo...', 'log-info')
  e.hp = 0
  await battleStore.endBattle(true, false)
}

const healPlayer = () => {
  const p = battleStore.player
  if (!p) return
  p.hp = p.maxHp
  p.status = null
  battleStore.addLog('DEBUG: Jugador curado.', 'log-info')
}

const healEnemy = () => {
  const e = battleStore.enemy
  if (!e) return
  e.hp = e.maxHp
  e.status = null
  battleStore.addLog('DEBUG: Enemigo curado.', 'log-info')
}

const debugCapture = async () => {
  if (!battleStore.state?.enemy || battleStore.isProcessing) return
  
  battleStore.isProcessing = true
  const e = battleStore.state.enemy
  const itemName = 'Ultra Ball'
  
  battleStore.addLog(`DEBUG: Lanzando ${itemName} (100% Efectividad)...`, 'log-catch')
  
  // 1. Animación de entrada
  gameBus.emit('PLAY_CATCH_ENERGY', { side: 'enemy', ballId: itemName })
  await new Promise(r => setTimeout(r, 1000))

  // 2. Suspenso: 3 Shakes
  for (let i = 0; i < 3; i++) {
    gameBus.emit('CATCH_SHAKE', { side: 'enemy' })
    await new Promise(r => setTimeout(r, 1000))
  }

  // 3. Éxito visual y sonoro
  await new Promise(r => setTimeout(r, 500))
  gameBus.emit('CATCH_SUCCESS', { side: 'enemy' })
  battleStore.addLog(`¡Ya está! ¡${e.name} atrapado!`, 'log-catch', e)
  
  battleStore.state.isCapture = true
  gameStore.addPokemon(e, { notify: true })
  
  await battleStore.endBattle(true, false)
  battleStore.isProcessing = false
}

const toggleBinoculars = () => {
  battleStore.debugBinoculars = !battleStore.debugBinoculars
}

const toggleSearchMode = async () => {
  battleStore.isSearching = !battleStore.isSearching
  
  // Si activamos la búsqueda y no hay un pokemon preparado, forzamos uno inmediatamente
  if (battleStore.isSearching && !battleStore.upcomingPokemon && battleStore.state?.locationId) {
    const { generateEncounter } = await import('@/logic/encounters')
    const { useMapStore } = await import('@/stores/map')
    const { useEventStore } = await import('@/stores/events')
    
    const encounter = await generateEncounter(battleStore.state.locationId, gameStore.state, {
      activeEvents: useMapStore().activeEvents,
      dominanceData: useMapStore().mapWinners,
      shinyMultiplier: useEventStore().globalMultipliers?.shiny || 1,
      forceEncounter: true
    })
    
    if (encounter && encounter.type === 'wild') {
      battleStore.upcomingPokemon = { ...encounter.pokemon }
    }
  }
}

const testScenario1 = () => {
  const currentPoke = battleStore.upcomingPokemon || battleStore.enemy
  const pokeToUse = currentPoke ? currentPoke : { id: 16, name: 'Pidgey', level: 5, hp: 20, maxHp: 20 }
  battleStore.isSearching = false
  battleStore.upcomingPokemon = null
  battleStore.state.enemy = pokeToUse
  battleStore.state.over = false
  gameBus.emit('START_BATTLE', { enemy: pokeToUse, isTrainer: false, animationPhase: 1 })
}

const testScenario2 = () => {
  battleStore.isSearching = true
  const currentPoke = battleStore.upcomingPokemon || battleStore.enemy
  const poke = currentPoke ? currentPoke : { id: 16, name: 'Pidgey', level: 5, hp: 20, maxHp: 20 }
  battleStore.upcomingPokemon = poke
}

const testScenario3 = () => {
  if (!battleStore.upcomingPokemon) {
    uiStore.notify('Primero activa la Fase 2', '⚠️')
    return
  }
  const poke = battleStore.upcomingPokemon
  gameBus.emit('START_BATTLE', { enemy: poke, isTrainer: false, animationPhase: 3 })
  battleStore.state.enemy = poke
  battleStore.state.over = false
  battleStore.isSearching = false
  setTimeout(() => { battleStore.upcomingPokemon = null }, 100)
}

const visualEnemyId = ref(1)
const visualPlayerId = ref(1)

const updateVisualSwap = (side = 'enemy') => {
  const num = side === 'player' ? visualPlayerId.value : visualEnemyId.value
  const targetId = ALL_PDEX[Math.max(0, num - 1)] || ALL_PDEX[0]
  if (side === 'player' && battleStore.state?.player) {
    battleStore.state.player.id = targetId
  } else if (battleStore.state?.enemy) {
    battleStore.state.enemy.id = targetId
  }
}

const incrementSwap = (side = 'enemy') => {
  if (side === 'player') visualPlayerId.value++
  else visualEnemyId.value++
  updateVisualSwap(side)
}

const decrementSwap = (side = 'enemy') => {
  if (side === 'player') { if (visualPlayerId.value > 1) visualPlayerId.value-- }
  else { if (visualEnemyId.value > 1) visualEnemyId.value-- }
  updateVisualSwap(side)
}

const toggleStatus = (side, type) => {
  const poke = side === 'player' ? battleStore.state?.player : battleStore.state?.enemy
  if (!poke) return
  if (type === 'shiny') poke.isShiny = !poke.isShiny
  if (type === 'guardian') poke.isGuardian = !poke.isGuardian
}
</script>

<template>
  <div
    v-if="isDebug"
    class="battle-debug-tools"
    :class="{ 'is-open': isOpen }"
  >
    <Transition name="slide-up">
      <div
        v-if="isOpen"
        class="debug-menu custom-scrollbar-vicio"
      >
        <!-- GLOBAL / QUICK ACTIONS -->
        <div class="debug-row">
          <button
            class="debug-btn kill-btn"
            @click.stop="defeatEnemy"
          >
            KILL ENEMY
          </button>
          <button
            class="debug-btn heal-btn"
            @click.stop="healPlayer"
          >
            HEAL ME
          </button>
          <button
            class="debug-btn heal-btn"
            @click.stop="healEnemy"
          >
            HEAL ENEMY
          </button>
        </div>

        <div class="debug-section">
          <div class="section-label">
            Environment & Behavior
          </div>
          <div class="debug-row">
            <PVTooltip text="Binocs: Ver el Pokémon en COLOR (Binoculares) o en SILUETA (Normal)">
              <button
                class="debug-btn search-btn"
                :class="{ 'btn-active': battleStore.debugBinoculars }"
                @click.stop="toggleBinoculars"
              >
                {{ battleStore.debugBinoculars ? '👁️ BINOCS: COLOR' : '🕶️ BINOCS: SILH' }}
              </button>
            </PVTooltip>
            
            <PVTooltip text="Chain: El siguiente Pokémon aparece automáticamente al ganar">
              <button
                class="debug-btn search-btn"
                :class="{ 'btn-active': battleStore.isSearching }"
                @click.stop="toggleSearchMode"
              >
                {{ battleStore.isSearching ? '🔗 CHAIN: ON' : '🔗 CHAIN: OFF' }}
              </button>
            </PVTooltip>
          </div>
        </div>

        <!-- PLAYER SECTION -->
        <div class="debug-section">
          <div class="section-label">
            Player Controls
          </div>
          <div class="btn-grid">
            <button
              class="mini-btn"
              :class="{ 'active': battleStore.state?.player?.isShiny }"
              @click.stop="toggleStatus('player', 'shiny')"
            >
              SHINY
            </button>
            <button
              class="mini-btn"
              :class="{ 'active': battleStore.state?.player?.isGuardian }"
              @click.stop="toggleStatus('player', 'guardian')"
            >
              GUARD
            </button>
          </div>
          <div class="swap-controls mt-1">
            <button
              class="swap-btn"
              @click.stop="decrementSwap('player')"
            >
              -
            </button>
            <input
              v-model.number="visualPlayerId"
              type="number"
              class="swap-input"
              @change="updateVisualSwap('player')"
              @click.stop
            >
            <button
              class="swap-btn"
              @click.stop="incrementSwap('player')"
            >
              +
            </button>
          </div>
        </div>

        <!-- ENEMY SECTION -->
        <div class="debug-section">
          <div class="section-label">
            Enemy Controls
          </div>
          <div class="btn-grid">
            <button
              class="mini-btn"
              :class="{ 'active': battleStore.state?.enemy?.isShiny }"
              @click.stop="toggleStatus('enemy', 'shiny')"
            >
              SHINY
            </button>
            <button
              class="mini-btn"
              :class="{ 'active': battleStore.state?.enemy?.isGuardian }"
              @click.stop="toggleStatus('enemy', 'guardian')"
            >
              GUARD
            </button>
          </div>
          <div class="swap-controls mt-1">
            <button
              class="swap-btn"
              @click.stop="decrementSwap('enemy')"
            >
              -
            </button>
            <input
              v-model.number="visualEnemyId"
              type="number"
              class="swap-input"
              @change="updateVisualSwap('enemy')"
              @click.stop
            >
            <button
              class="swap-btn"
              @click.stop="incrementSwap('enemy')"
            >
              +
            </button>
          </div>
          <button
            class="debug-btn catch-btn"
            @click.stop="debugCapture"
          >
            ⭐ SUPER POKEBALL
          </button>
        </div>

        <!-- SCENARIOS -->
        <div class="debug-section">
          <div class="section-label">
            Scenarios
          </div>
          <div class="btn-grid trio">
            <button
              class="mini-btn"
              @click.stop="testScenario1"
            >
              P1
            </button>
            <button
              class="mini-btn"
              @click.stop="testScenario2"
            >
              P2
            </button>
            <button
              class="mini-btn"
              @click.stop="testScenario3"
            >
              P3
            </button>
          </div>
        </div>

        <!-- CAMERA -->
        <div class="debug-section">
          <div class="section-label">
            Camera
          </div>
          <div class="btn-grid">
            <button
              class="mini-btn"
              @click.stop="gameBus.emit('TOGGLE_CAMERA_GUIDES')"
            >
              GUIDES
            </button>
            <button
              class="mini-btn"
              @click.stop="gameBus.emit('TOGGLE_DEBUG_ZOOM')"
            >
              ZOOM
            </button>
          </div>
        </div>

        <div class="debug-footer">
          VITE_DEBUG_ACTIVE
        </div>
      </div>
    </Transition>

    <PVTooltip title="Debug Menu">
      <button
        class="debug-trigger"
        @click.stop="isOpen = !isOpen"
      >
        <span class="icon">🕹️</span>
        <span class="label">DEBUG</span>
      </button>
    </PVTooltip>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.battle-debug-tools {
  position: fixed;
  bottom: 12px; 
  left: 12px;
  z-index: var(--z-navigation);
  display: flex;
  flex-direction: column-reverse;
  align-items: flex-start;
  pointer-events: none;
  @include pixelated;
  
  &.is-open { pointer-events: all; }
}

.debug-trigger {
  @include btn-vicio('info', 'xs', true);
  pointer-events: all;
  background: Rgba(20, 20, 30, 0.95);
  border: 2px solid var(--yellow);
  color: var(--yellow);
  font-size: 7px;
  height: 24px;
  padding: 0 14px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  text-shadow: 1px 1px 0 $black;
  box-shadow: 0 4px 15px Rgba(0, 0, 0, 0.6);
  @include pixelated;
  
  &:hover { background: var(--yellow); color: $black; text-shadow: none; }
}

.debug-menu {
  background: Rgba(15, 15, 25, 0.98);
  border: 2px solid var(--yellow);
  border-radius: 6px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 180px;
  max-height: 400px;
  min-height: 0;
  overflow-y: auto;
  box-shadow: 0 10px 40px Rgba(0,0,0,0.9);
  -webkit-backdrop-filter: Blur(12px);
  backdrop-filter: Blur(12px);
  @include gpu-layer;
  margin-bottom: 8px;
  position: relative;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    border: 1px solid Rgba(255, 255, 255, 0.1);
    pointer-events: none;
  }
}

.debug-row {
  display: flex;
  gap: 4px;
  .debug-btn { flex: 1; }
}

.debug-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 0;
  border-top: 1px solid Rgba(255, 255, 255, 0.1);

  .section-label {
    font-size: 6px;
    color: var(--yellow);
    text-transform: uppercase;
    margin-bottom: 2px;
    opacity: 0.9;
    letter-spacing: 0.5px;
  }
}

.debug-btn {
  @include btn-vicio('default', 'xs', true);
  font-size: 7px !important;
  height: 24px !important;
  text-align: center;
  padding: 0 4px !important;
  
  &.kill-btn { @include btn-vicio('danger', 'xs', true); }
  &.heal-btn { @include btn-vicio('success', 'xs', true); }
  &.search-btn { @include btn-vicio('info', 'xs', true); border-color: var(--yellow); }
  &.catch-btn { 
    @include btn-vicio('primary', 'xs', true); 
    background: Linear-Gradient(135deg, var(--purple-light) 0%, var(--red) 100%);
    border-color: var(--white);
    margin-top: 2px;
  }
}

.btn-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  
  &.trio { grid-template-columns: 1fr 1fr 1fr; }
}

.mini-btn {
  @include btn-vicio('default', 'xs', true);
  height: 20px !important;
  font-size: 6px !important;
  padding: 0 !important;
  
  &.active {
    background: var(--yellow);
    color: $black;
    border-color: $white;
  }
}

.swap-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  
  &.mt-1 { margin-top: 2px; }
  
  .swap-btn { 
    @include btn-vicio('default', 'xs', true); 
    width: 24px !important; 
    height: 24px !important; 
    font-size: 10px;
    padding: 0 !important;
  }
  
  .swap-input { 
    width: 50px; 
    background: $black; 
    border: 1px solid Rgba(255, 255, 255, 0.4); 
    color: white; 
    @include pixelated; 
    font-size: 10px; 
    text-align: center; 
    height: 100%; 
    border-radius: 2px;
    @include pixelated;

    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    &[type=number] {
      -moz-appearance: textfield;
    }
  }
}

.debug-footer { 
  font-size: 5px; 
  text-align: center; 
  opacity: 0.4; 
  margin-top: 6px;
  letter-spacing: 1px;
}

.slide-up-enter-active, .slide-up-leave-active { 
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1.2);
}
.slide-up-enter-from, .slide-up-leave-to { 
  opacity: 0; 
  transform: translateY(20px) Scale(0.9); 
}
</style>