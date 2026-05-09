<script setup lang="ts">
import { ref, computed } from 'vue'
import { sleep } from '@/logic/timeUtils'
import { useBattleStore } from '@/stores/battle'
import { useGameStore } from '@/stores/game'
import { useAudioStore } from '@/stores/audio'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { PDEX_ORDER, GEN2_PDEX_ORDER } from '@/data/pokedex'
import { gameBus } from '@/logic/gameBus'
import DebugAudioAnimTab from '@/components/admin/debug/DebugAudioAnimTab.vue'
import type { Pokemon } from '@/types/pokemon'

const ALL_PDEX = [...PDEX_ORDER, ...GEN2_PDEX_ORDER]

const battleStore = useBattleStore()
const gameStore = useGameStore()
const audio = useAudioStore()
const isOpen = ref(false)
const isEffectsOpen = ref(false)

const isDebug = computed(() => typeof window !== 'undefined' && !!(window as unknown as { __VITE_DEBUG__?: unknown }).__VITE_DEBUG__)

const defeatEnemy = async () => {
  const e = battleStore.enemy
  if (!e) return
  battleStore.addLog('DEBUG: Ejecutando Daño Máximo...', 'log-info', e)
  e.hp = 0
  await battleStore.handleFaint('enemy')
}

const defeatPlayer = async () => {
  const p = battleStore.player
  if (!p) return
  battleStore.addLog('DEBUG: Ejecutando Suicidio...', 'log-info', p)
  p.hp = 0
  await battleStore.handleFaint('player')
}

const healPlayer = () => {
  const p = battleStore.player
  if (!p) return
  p.hp = p.maxHp
  p.status = null
  battleStore.addLog('DEBUG: Jugador curado.', 'log-info', p)
}

const healEnemy = () => {
  const e = battleStore.enemy
  if (!e) return
  e.hp = e.maxHp
  e.status = null
  battleStore.addLog('DEBUG: Enemigo curado.', 'log-info', e)
}

const debugCapture = async () => {
  if (!battleStore.state?.enemy || battleStore.isProcessing) return
  
  battleStore.isProcessing = true
  const e = battleStore.state.enemy
  const itemName = 'Ultra Ball'
  
  battleStore.addLog(`DEBUG: Lanzando ${itemName} (100% Efectividad)...`, 'log-catch', itemName)
  
  // 1. Animación de entrada
  audio.ballHit()
  gameBus.emit('PLAY_CATCH_ENERGY', { side: 'enemy', ballId: itemName })
  await sleep(1000)

  // 2. Suspenso: 3 Shakes
  for (let i = 0; i < 3; i++) {
    audio.wobble()
    gameBus.emit('CATCH_SHAKE', { side: 'enemy' })
    await sleep(1000)
  }

  // 3. Éxito visual y sonoro
  await sleep(500)
  audio.caught()
  gameBus.emit('CATCH_SUCCESS', { side: 'enemy' })
  battleStore.addLog(`¡Ya está! ¡${e.name} atrapado!`, 'log-catch', e)
  
  battleStore.state.isCapture = true
  gameStore.addPokemon(e, { notify: true })
  
  // Sincronizar con el tiempo de animación: 1s bola llena + 1s de vacío
  window.setTimeout(async () => {
    await battleStore.endBattle(true, false)
    battleStore.isProcessing = false
  }, 2000)
}

const toggleBinoculars = () => {
  battleStore.debugBinoculars = !battleStore.debugBinoculars
}

const toggleSearchMode = async () => {
  const { BATTLE_STATES } = await import('@/logic/battle/battleStateMachine')
  if (battleStore.isSearching) {
     battleStore.fsm.transition(BATTLE_STATES.INITIALIZING)
  } else {
     battleStore.fsm.transition(BATTLE_STATES.SEARCH_PHASE)
  }
  
  // Si activamos la búsqueda y no hay un pokemon preparado, forzamos uno inmediatamente
  if (battleStore.isSearching && !battleStore.upcomingPokemon && battleStore.state?.locationId) {
    const { generateEncounter } = await import('@/logic/encounters')
    const mapStoreModule = await import('@/stores/map')
    const eventStoreModule = await import('@/stores/events')
    
    const mapStore = mapStoreModule.useMapStore()
    const eventStore = eventStoreModule.useEventStore()

    const encounter = await generateEncounter(battleStore.state.locationId, gameStore.state, {
      activeEvents: mapStore.activeEvents || [],
      dominanceData: mapStore.mapWinners || {},
      shinyMultiplier: eventStore.globalMultipliers?.shiny || 1,
      forceEncounter: true
    })
    
    if (encounter && encounter.type === 'wild' && 'pokemon' in encounter) {
      battleStore.upcomingPokemon = { ...(encounter.pokemon as Pokemon) }
    }
  }
}


const visualEnemyId = ref(1)
const visualPlayerId = ref(1)

const updateVisualSwap = (side = 'enemy') => {
  const num = side === 'player' ? visualPlayerId.value : visualEnemyId.value
  const targetId = (ALL_PDEX[Math.max(0, num - 1)] || ALL_PDEX[0]) as string
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

const toggleStatus = (side: string, type: string) => {
  if (side === 'player') {
    const p = battleStore.state?.player
    if (!p) return
    if (type === 'shiny') p.isShiny = !p.isShiny
    if (type === 'guardian') p.isGuardian = !p.isGuardian
    if (battleStore.state) {
      battleStore.state.player = { ...p }
    }
  } else {
    const poke = battleStore.upcomingPokemon || battleStore.state?.enemy
    if (!poke) return
    if (type === 'shiny') poke.isShiny = !poke.isShiny
    if (type === 'guardian') poke.isGuardian = !poke.isGuardian
    
    if (battleStore.upcomingPokemon) {
      battleStore.upcomingPokemon = { ...battleStore.upcomingPokemon }
    } else if (battleStore.state?.enemy) {
      battleStore.state.enemy = { ...battleStore.state.enemy }
    }
  }
}
</script>

<template>
  <div
    v-if="isDebug"
    class="battle-debug-tools"
    :class="{ 'is-open': isOpen || isEffectsOpen }"
  >
    <Transition name="slide-up">
      <div
        v-if="isOpen"
        class="debug-menu custom-scrollbar-vicio"
      >
        <div class="debug-row">
          <button
            class="debug-btn kill-btn"
            @click.stop="defeatEnemy"
          >
            KILL ENEMY
          </button>
          <button
            class="debug-btn kill-btn"
            @click.stop="defeatPlayer"
          >
            KILL ME
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
            <PVTooltip description="Binocs: Ver el Pokémon en COLOR (Binoculares) o en SILUETA (Normal)">
              <button
                class="debug-btn search-btn"
                :class="{ 'btn-active': battleStore.debugBinoculars }"
                @click.stop="toggleBinoculars"
              >
                {{ battleStore.debugBinoculars ? '👁️ BINOCS: COLOR' : '🕶️ BINOCS: SILH' }}
              </button>
            </PVTooltip>
            
            <PVTooltip description="Chain: El siguiente Pokémon aparece automáticamente al ganar">
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
              :class="{ active: battleStore.state?.player?.isShiny }"
              @click.stop="toggleStatus('player', 'shiny')"
            >
              SHINY
            </button>
            <button
              class="mini-btn"
              :class="{ active: battleStore.state?.player?.isGuardian }"
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
              :class="{ active: (battleStore.upcomingPokemon || battleStore.state?.enemy)?.isShiny }"
              @click.stop="toggleStatus('enemy', 'shiny')"
            >
              SHINY
            </button>
            <button
              class="mini-btn"
              :class="{ active: (battleStore.upcomingPokemon || battleStore.state?.enemy)?.isGuardian }"
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

    <!-- NEW EFFECTS PANEL -->
    <Transition name="slide-up">
      <div
        v-if="isEffectsOpen"
        class="effects-menu custom-scrollbar-vicio"
      >
        <div class="effects-header">
          <span class="icon">✨</span>
          <span class="title">BATTLE EFFECTS & AUDIO</span>
          <button
            class="close-mini"
            @click.stop="isEffectsOpen = false"
          >
            ✕
          </button>
        </div>
        <div class="effects-scroll-area">
          <DebugAudioAnimTab />
        </div>
      </div>
    </Transition>

    <div class="debug-triggers-row">
      <PVTooltip title="Debug Menu">
        <button
          class="debug-trigger"
          :class="{ active: isOpen }"
          @click.stop="isOpen = !isOpen; isEffectsOpen = false"
        >
          <span class="icon">🕹️</span>
          <span class="label">DEBUG</span>
        </button>
      </PVTooltip>

      <PVTooltip title="Audio & Visual Effects">
        <button
          class="effects-trigger"
          :class="{ active: isEffectsOpen }"
          @click.stop="isEffectsOpen = !isEffectsOpen; isOpen = false"
        >
          <span class="icon">✨</span>
          <span class="label">EFECTOS</span>
        </button>
      </PVTooltip>
    </div>
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
  min-height: 0; // Fix flex scroll collapse for debug-menu
  @include pixelated;
  
  &.is-open { pointer-events: all; }
}

.debug-triggers-row {
  display: flex;
  gap: 8px;
  pointer-events: all;
}

.debug-trigger, .effects-trigger {
  @include btn-vicio('info', 'xs', true);
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
  
  &:hover, &.active { background: var(--yellow); color: $black; text-shadow: none; }
}

.effects-trigger {
  border-color: var(--purple);
  color: var(--purple);
  &:hover, &.active { background: var(--purple); color: white; }
}

.effects-menu {
  background: Rgba(15, 15, 25, 0.99);
  border: 2px solid var(--purple);
  border-radius: 8px;
  width: 320px;
  max-height: 500px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 15px 50px Rgba(0,0,0,0.9);
  -webkit-will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  backdrop-filter: Blur(15px);
  backdrop-filter: Blur(15px);
  @include gpu-layer;
  margin-bottom: 12px;
  overflow: hidden;
  min-height: 0; // Fix flex scroll collapse for effects-scroll-area
  @include gpu-layer;

  .effects-header {
    background: Rgba(124, 58, 237, 0.15);
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid Rgba(255, 255, 255, 0.1);

    .title { @include pixelated; font-size: 8px; color: var(--purple); flex: 1; }
    .close-mini { background: none; border: none; color: white; cursor: pointer; opacity: 0.5; &:hover { opacity: 1; } }
  }

  .effects-scroll-area {
    padding: 16px;
    min-height: 0;
    overflow-y: auto;
    flex: 1;
    @include smooth-scroll;
  }
}

.debug-menu {
  background: Rgba(15, 15, 25, 0.98);
  border: 2px solid var(--yellow);
  border-radius: 6px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 260px;
  max-height: 400px;
  min-height: 0;
  overflow-y: auto;
  box-shadow: 0 10px 40px Rgba(0,0,0,0.9);
  -webkit-will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  backdrop-filter: Blur(12px);
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
  transform: Translatey(20px) Scale(0.9); 
}
</style>
