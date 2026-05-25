<script setup lang="ts">
import { ref } from 'vue'
import { gsap } from 'gsap'
import { sleep } from '@/logic/timeUtils'
import { useBattleStore } from '@/stores/battle'
import { useGameStore } from '@/stores/game'
import { useAudioStore } from '@/stores/audio'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { PDEX_ORDER, GEN2_PDEX_ORDER } from '@/data/pokedex'
import { gameBus } from '@/logic/gameBus'
import type { Pokemon } from '@/types/pokemon'

const ALL_PDEX = [...PDEX_ORDER, ...GEN2_PDEX_ORDER]

const battleStore = useBattleStore()
const gameStore = useGameStore()
const audio = useAudioStore()

const visualEnemyId = ref(1)
const visualPlayerId = ref(1)

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
  
  // 1. Ball hit
  audio.ballHit()
  gameBus.emit('PLAY_CATCH_ENERGY', { side: 'enemy', ballId: itemName })
  await sleep(1000)

  // 2. Shakes
  for (let i = 0; i < 3; i++) {
    audio.wobble()
    gameBus.emit('CATCH_SHAKE', { side: 'enemy' })
    await sleep(1000)
  }

  // 3. Success
  await sleep(500)
  audio.caught()
  gameBus.emit('CATCH_SUCCESS', { side: 'enemy' })
  battleStore.addLog(`¡Ya está! ¡${e.name} atrapado!`, 'log-catch', e)
  
  battleStore.state.isCapture = true
  gameStore.addPokemon(e, { notify: true })
  
  gsap.delayedCall(2, async () => {
    await battleStore.endBattle(true, false)
    battleStore.isProcessing = false
  })
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
    const poke = (battleStore.isBattleActive && !battleStore.isSearching && battleStore.state?.enemy)
      ? battleStore.state.enemy
      : (battleStore.upcomingPokemon || battleStore.state?.enemy)

    if (!poke) return
    if (type === 'shiny') poke.isShiny = !poke.isShiny
    if (type === 'guardian') poke.isGuardian = !poke.isGuardian
    
    if (battleStore.state?.enemy && poke === battleStore.state.enemy) {
      battleStore.state.enemy = { ...battleStore.state.enemy }
    } else if (battleStore.upcomingPokemon && poke === battleStore.upcomingPokemon) {
      battleStore.upcomingPokemon = { ...battleStore.upcomingPokemon }
    }
  }
}
</script>

<template>
  <div class="debug-menu custom-scrollbar-vicio">
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
            :class="{ active: battleStore.debugBinoculars }"
            @click.stop="toggleBinoculars"
          >
            {{ battleStore.debugBinoculars ? '👁️ BINOCS: COLOR' : '🕶️ BINOCS: SILH' }}
          </button>
        </PVTooltip>
        
        <PVTooltip description="Chain: El siguiente Pokémon aparece automáticamente al ganar">
          <button
            class="debug-btn search-btn"
            :class="{ active: battleStore.isSearching }"
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
          :class="{ active: (battleStore.isBattleActive && !battleStore.isSearching && battleStore.state?.enemy ? battleStore.state.enemy.isShiny : (battleStore.upcomingPokemon?.isShiny || battleStore.state?.enemy?.isShiny)) }"
          @click.stop="toggleStatus('enemy', 'shiny')"
        >
          SHINY
        </button>
        <button
          class="mini-btn"
          :class="{ active: (battleStore.isBattleActive && !battleStore.isSearching && battleStore.state?.enemy ? battleStore.state.enemy.isGuardian : (battleStore.upcomingPokemon?.isGuardian || battleStore.state?.enemy?.isGuardian)) }"
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
          :class="{ active: battleStore.debugShowGuides }"
          @click.stop="gameBus.emit('TOGGLE_CAMERA_GUIDES')"
        >
          GUIDES
        </button>
        <button
          class="mini-btn"
          :class="{ active: battleStore.debugShowFxRadius }"
          @click.stop="battleStore.debugShowFxRadius = !battleStore.debugShowFxRadius"
        >
          FX RAD
        </button>
        <button
          class="mini-btn"
          :class="{ active: battleStore.debugShowPokeRadius }"
          @click.stop="battleStore.debugShowPokeRadius = !battleStore.debugShowPokeRadius"
        >
          POKE RAD
        </button>
        <button
          class="mini-btn"
          :class="{ active: battleStore.debugZoom !== 1 }"
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
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.debug-menu {
  background: Rgba(15, 15, 25, 0.98);
  border: 2px solid var(--yellow);
  border-radius: 6px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  box-sizing: border-box;
  max-height: 400px;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  box-shadow: 0 10px 40px Rgba(0,0,0,0.9);
  -webkit-will-change: transform, opacity;
  will-change: transform, opacity;
  @include gpu-layer;
  position: relative;
  @include smooth-scroll;

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
}

.mini-btn {
  @include btn-vicio('neutral', 'xs', true);
  height: 20px !important;
  font-size: 6px !important;
  padding: 0 !important;
  border-color: Rgba(255, 255, 255, 0.2);
  
  &.active {
    background: var(--yellow) !important;
    color: $black !important;
    border-color: $white !important;
    box-shadow: 0 0 10px Rgba(250, 204, 21, 0.4);
    filter: none !important;
    will-change: filter;
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

    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    &[type=number] {
      -moz-appearance: textfield;
      appearance: textfield;
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
</style>
