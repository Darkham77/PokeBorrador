// [PureVue-Ignore-Length] 
<script setup>
import { ref, computed, watch } from 'vue'
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

// El modo debug suele estar habilitado globalmente en este proyecto
const isDebug = computed(() => typeof window !== 'undefined' && !!window.__VITE_DEBUG__)

const defeatEnemy = async () => {
  if (!battleStore.state?.enemy) return
  
  battleStore.addLog('DEBUG: Ejecutando Daño Máximo...', 'log-info')
  battleStore.state.enemy.hp = 0
  await battleStore.endBattle(true, false)
}

const healPlayer = () => {
  if (!battleStore.state?.player) return
  battleStore.state.player.hp = battleStore.state.player.maxHP
  battleStore.state.player.status = null
  battleStore.addLog('DEBUG: Jugador curado.', 'log-info')
}

const toggleSearchMode = () => {
  battleStore.isSearching = !battleStore.isSearching
}

const testScenario1 = () => {
  const currentPoke = battleStore.upcomingPokemon || battleStore.enemy
  const pokeToUse = currentPoke ? { ...currentPoke } : { id: 16, name: 'Pidgey', level: 5, hp: 20, maxHP: 20 }
  
  battleStore.isSearching = false
  battleStore.upcomingPokemon = null
  battleStore.state.enemy = pokeToUse
  battleStore.state.over = false
  
  // Forzar animación de emergencia (Salto)
  gameBus.emit('START_BATTLE', { enemy: pokeToUse, isTrainer: false })
}

const testScenario2 = () => {
  battleStore.isSearching = true
  const currentPoke = battleStore.upcomingPokemon || battleStore.enemy
  const poke = currentPoke ? { ...currentPoke } : { id: 16, name: 'Pidgey', level: 5, hp: 20, maxHP: 20 }
  
  battleStore.upcomingPokemon = poke
}

const testScenario3 = () => {
  if (!battleStore.upcomingPokemon) {
    uiStore.notify('Primero activa la Fase 2 para ver un Pokémon', '⚠️')
    return
  }
  
  const poke = { ...battleStore.upcomingPokemon }
  
  // IMPORTANTE: Emitir antes de limpiar el estado para que BattleArenaView detecte que estábamos buscando
  gameBus.emit('START_BATTLE', { enemy: poke, isTrainer: false })
  
  battleStore.state.enemy = poke
  battleStore.state.over = false
  battleStore.isSearching = false
  
  setTimeout(() => {
    battleStore.upcomingPokemon = null
  }, 100)
}

const faintPlayer = async () => {
  if (!battleStore.state?.player) return
  const p = battleStore.state.player
  
  battleStore.addLog('DEBUG: Simulando Daño Letal...', 'log-danger')
  p.hp = 0
  
  await new Promise(r => setTimeout(r, 600))
  
  battleStore.addLog(`¡${p.name} cayó debilitado!`, 'log-player', p)

  const hasMore = gameStore.state.team.some(poke => 
    poke.hp > 0 && poke.uid !== p.uid && !poke.onMission && !poke.onDefense
  )
  
  if (!hasMore) {
    console.log('[DEBUG] Jugador derrotado. Terminando combate.')
    await battleStore.endBattle(false)
  } else {
    battleStore.addLog('¡Envía a otro Pokémon!', 'log-info', p)
    uiStore.isBattleSwitchForced = true
  }
}

const visualPokemonId = ref(1)
const playerVisualId = ref(1)

// Sincronizar cuando cambia el enemigo real

watch(() => battleStore.state?.enemy?.id, (newId) => {
  if (newId) {
    const idx = ALL_PDEX.indexOf(newId)
    visualPokemonId.value = idx !== -1 ? idx + 1 : 1
  }
}, { immediate: true })

watch(() => battleStore.state?.player?.id, (newId) => {
  if (newId) {
    const idx = ALL_PDEX.indexOf(newId)
    playerVisualId.value = idx !== -1 ? idx + 1 : 1
  }
}, { immediate: true })

const updateVisualSwap = (side = 'enemy') => {
  const num = side === 'player' ? playerVisualId.value : visualPokemonId.value
  const targetId = ALL_PDEX[Math.max(0, num - 1)] || ALL_PDEX[0]
  
  if (side === 'player') {
    if (battleStore.state?.player) battleStore.state.player.id = targetId
  } else {
    if (battleStore.state?.enemy) battleStore.state.enemy.id = targetId
  }
}

const incrementSwap = (side = 'enemy') => {
  if (side === 'player') playerVisualId.value++
  else visualPokemonId.value++
  updateVisualSwap(side)
}

const decrementSwap = (side = 'enemy') => {
  const val = side === 'player' ? playerVisualId.value : visualPokemonId.value
  if (val > 1) {
    if (side === 'player') playerVisualId.value--
    else visualPokemonId.value--
    updateVisualSwap(side)
  }
}

/**
 * Animaciones de Energía
 */
const testCatchAnim = (side = 'enemy') => {
  gameBus.emit('PLAY_CATCH_ENERGY', { side })
  uiStore.notify(`Debug: Animación Captura (${side})`, '⚡')
}

const testReleaseAnim = (side = 'enemy') => {
  gameBus.emit('PLAY_RELEASE_ENERGY', { side })
  uiStore.notify(`Debug: Animación Salida (${side})`, '✨')
}

</script>

<template>
  <div 
    v-if="isDebug"
    class="battle-debug-tools"
    :class="{ 'is-open': isOpen }"
  >
    <PVTooltip title="Herramientas de Debug">
      <button 
        class="debug-trigger"
        @click.stop="isOpen = !isOpen"
      >
        <span class="icon">🛠️</span>
        <span class="label">DEBUG</span>
      </button>
    </PVTooltip>

    <!-- Menú de Acciones -->
    <Transition name="slide-up">
      <div 
        v-if="isOpen"
        class="debug-menu custom-scrollbar-vicio"
      >
        <button 
          class="debug-btn kill-btn"
          @click.stop="defeatEnemy"
        >
          💀 DERROTAR ENEMIGO
        </button>
        <button 
          class="debug-btn heal-btn"
          @click.stop="healPlayer"
        >
          ❤️ CURAR MI POKE
        </button>
        <button 
          class="debug-btn faint-btn"
          @click.stop="faintPlayer"
        >
          💀 DEBILITAR MI POKE
        </button>
        <button 
          class="debug-btn search-btn"
          @click.stop="toggleSearchMode"
        >
          🔍 BUSQUEDA (ON/OFF)
        </button>

        <div class="debug-section">
          <div class="section-label">
            🎥 CAMARA Y MAPA
          </div>
          <div class="anim-grid">
            <button 
              class="anim-btn release"
              @click.stop="gameBus.emit('TOGGLE_CAMERA_GUIDES')"
            >
              GUIAS CAMARA
            </button>
            <button 
              class="anim-btn info"
              @click.stop="gameBus.emit('TOGGLE_DEBUG_ZOOM')"
            >
              ALEJAR (50%)
            </button>
          </div>
        </div>

        <div class="debug-section">
          <div class="section-label">
            🌿 ESCENARIOS DE ENCUENTRO
          </div>
          <div class="scenario-grid">
            <button
              class="debug-btn scenario-btn"
              @click.stop="testScenario1"
            >
              1
            </button>
            <button
              class="debug-btn scenario-btn"
              @click.stop="testScenario2"
            >
              2
            </button>
            <button
              class="debug-btn scenario-btn"
              @click.stop="testScenario3"
            >
              3
            </button>
          </div>
        </div>

        <div class="debug-section">
          <div class="section-label">
            ⚡ ANIMACIONES ENERGÍA
          </div>
          <div class="anim-grid">
            <button
              class="anim-btn catch"
              @click.stop="testCatchAnim('player')"
            >
              CATCH (P)
            </button>
            <button
              class="anim-btn catch"
              @click.stop="testCatchAnim('enemy')"
            >
              CATCH (E)
            </button>
            <button
              class="anim-btn release"
              @click.stop="testReleaseAnim('player')"
            >
              RELEASE (P)
            </button>
            <button
              class="anim-btn release"
              @click.stop="testReleaseAnim('enemy')"
            >
              RELEASE (E)
            </button>
          </div>
        </div>

        <div class="debug-section">
          <div class="section-label">
            VISUAL SWAP (Opponent)
          </div>
          <div class="swap-controls">
            <button
              class="swap-btn"
              @click.stop="decrementSwap('enemy')"
            >
              -
            </button>
            <input 
              v-model.number="visualPokemonId" 
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
        </div>

        <div class="debug-section">
          <div class="section-label">
            VISUAL SWAP (Player)
          </div>
          <div class="swap-controls">
            <button
              class="swap-btn"
              @click.stop="decrementSwap('player')"
            >
              -
            </button>
            <input 
              v-model.number="playerVisualId" 
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
        
        <div class="debug-footer">
          VITE_DEBUG_ACTIVE
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.battle-debug-tools {
  position: absolute;
  top: -24px; 
  right: 12px;
  z-index: var(--z-navigation);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  pointer-events: none;

  &.is-open {
    pointer-events: all;
  }
}

.debug-trigger {
  @include btn-vicio('info', 'xs', true);
  pointer-events: all;
  background: Rgba(30, 30, 40, 0.9);
  border: 1px solid var(--yellow);
  color: var(--yellow);
  font-size: 8px;
  height: 24px;
  padding: 0 12px;
  border-radius: 12px 12px 0 0;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 -2px 10px Rgba(0,0,0,0.5);
  
  &:hover {
    background: var(--yellow);
    color: $black;
  }

  .icon { font-size: 10px; }
}

.debug-menu {
  position: absolute;
  bottom: 24px;
  right: 0;
  background: Rgba(20, 20, 30, 0.95);
  border: 2px solid var(--yellow);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 200px;
  max-height: 400px;
  min-height: 0; // Fixes flex scroll collapse
  overflow-y: auto;
  box-shadow: 0 0 20px Rgba(0,0,0,0.8);
  -webkit-backdrop-filter: Blur(10px);
  backdrop-filter: Blur(10px);
  @include gpu-layer;
}

.debug-btn {
  @include btn-vicio('default', 'sm', true);
  font-size: 10px;
  text-align: left;
  justify-content: flex-start;
  padding: 8px 12px;
  flex-shrink: 0;
  
  &.kill-btn { @include btn-vicio('danger', 'sm', true); }
  &.faint-btn { @include btn-vicio('danger', 'sm', true); filter: Hue-Rotate(45deg); }
  &.heal-btn { @include btn-vicio('success', 'sm', true); }
  &.search-btn { @include btn-vicio('info', 'sm', true); }
}

.debug-section {
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px solid Rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 6px;

  .section-label {
    font-size: 8px;
    color: var(--yellow);
    text-transform: uppercase;
    letter-spacing: 1px;
    opacity: 0.8;
  }
}

  .anim-grid, .scenario-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    
    &.scenario-grid {
      grid-template-columns: 1fr 1fr 1fr;
    }

    .anim-btn, .scenario-btn {
      height: 28px !important;
      font-size: 10px !important;
      padding: 0 !important;
      display: flex;
      align-items: center;
      justify-content: center;
      
      &.scenario-btn {
        @include btn-vicio('default', 'xs', true);
      }
      
      &.catch {
        @include btn-vicio('info', 'xs', true);
      }
      
      &.release {
        @include btn-vicio('success', 'xs', true);
      }
    }
  }

.swap-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 28px;

  .swap-btn {
    @include btn-vicio('default', 'xs', true);
    width: 28px !important;
    height: 28px !important;
    padding: 0 !important;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
    flex-shrink: 0;
    
    &:hover { background: var(--yellow); color: $black; }
  }

  .swap-input {
    flex: 1;
    min-width: 0;
    width: 100%;
    background: $black;
    border: 1px solid Rgba(255, 255, 255, 0.2);
    color: white;
    @include pixelated;
    font-size: 12px;
    text-align: center;
    height: 100%;
    border-radius: 4px;
    
    &::-webkit-inner-spin-button { display: none; }
    
    &:focus {
      outline: none;
      border-color: var(--yellow);
    }
  }
}

.debug-footer {
  font-size: 7px;
  text-align: center;
  opacity: 0.5;
  margin-top: 4px;
  letter-spacing: 1px;
}

/* Transitions */
.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.slide-up-enter-from, .slide-up-leave-to {
  opacity: 0;
  transform: translateY(10px) Scale(0.9);
}
</style>