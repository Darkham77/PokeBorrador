<script setup>
import { ref, computed } from 'vue'
import { useBattleStore } from '@/stores/battle'
import { useGameStore } from '@/stores/game'
import { phaserBridge } from '@/logic/phaserBridge'
import { useUIStore } from '@/stores/ui'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { PDEX_ORDER, GEN2_PDEX_ORDER } from '@/data/pokedex'

const ALL_PDEX = [...PDEX_ORDER, ...GEN2_PDEX_ORDER]

const battleStore = useBattleStore()
const gameStore = useGameStore()
const isOpen = ref(false)

// El modo debug suele estar habilitado globalmente en este proyecto
const isDebug = computed(() => !!window.__VITE_DEBUG__)

const defeatEnemy = async () => {
  if (!battleStore.state?.enemy) return
  
  battleStore.addLog('DEBUG: Ejecutando Daño Máximo...', 'log-info')
  battleStore.state.enemy.hp = 0
  await battleStore.endBattle(true, false)
  isOpen.value = false
}

const healPlayer = () => {
  if (!battleStore.state?.player) return
  battleStore.state.player.hp = battleStore.state.player.maxHP
  battleStore.state.player.status = null
  battleStore.addLog('DEBUG: Jugador curado.', 'log-info')
  isOpen.value = false
}

const toggleSearchMode = () => {
  battleStore.isSearching = !battleStore.isSearching
  isOpen.value = false
}

const faintPlayer = async () => {
  if (!battleStore.state?.player) return
  const p = battleStore.state.player
  const uiStore = useUIStore()
  
  battleStore.addLog('DEBUG: Simulando Daño Letal...', 'log-danger')
  p.hp = 0
  
  // Sincronizar UI de Phaser
  phaserBridge.sendCommand('BattleScene', 'PLAY_DAMAGE', { side: 'player' })
  await new Promise(r => setTimeout(r, 600))
  phaserBridge.sendCommand('BattleScene', 'PLAY_FAINT', { side: 'player' })
  
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
  
  isOpen.value = false
}

const visualPokemonId = ref(1)
const playerVisualId = ref(1)

// Sincronizar cuando cambia el enemigo real
import { watch } from 'vue'
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
  
  phaserBridge.sendCommand('BattleScene', 'DEBUG_VISUAL_SWAP', { side, id: targetId })
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
        class="debug-menu"
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
          🔍 TOGGLE BUSQUEDA
        </button>

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
  top: -24px; // Posicionamiento sobre el panel de ataques (según círculo del usuario)
  left: 50%;
  transform: translateX(-50%);
  z-index: var(--z-navigation);
  display: flex;
  flex-direction: column;
  align-items: center;
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
  background: Rgba(20, 20, 30, 0.95);
  border: 2px solid var(--yellow);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 200px;
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

.swap-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 28px;

  .swap-btn {
    @include btn-vicio('default', 'sm', false);
    width: 30px;
    height: 30px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: bold;
    background: Rgba(255, 255, 255, 0.1);
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