<script setup lang="ts">
import PVTooltip from '@/components/common/PVTooltip.vue'
import DebugActionPanelQuickButtons from './DebugActionPanelQuickButtons.vue'
import { gameBus } from '@/logic/events/gameBus'
import { useDebugBattleActions } from './useDebugBattleActions'
import { useCombatShadowStore } from '@/stores/battle/combatShadows'

const emit = defineEmits<{
  (event: 'close'): void
}>()

const shadowStore = useCombatShadowStore()

const {
  battleStore,
  playerBaseId,
  playerVariant,
  playerGender,
  enemyBaseId,
  enemyVariant,
  enemyGender,
  debugCriticalCapture,
  toggleBinoculars,
  toggleSearchMode,
  updateVisualSwap,
  incrementSwap,
  decrementSwap,
  toggleStatus
} = useDebugBattleActions()
</script>

<template>
  <div class="debug-menu custom-scrollbar-vicio">
    <div class="debug-header">
      <span class="emoji">🕹️</span>
      <span class="title">BATTLE ACTIONS & DEBUG</span>
      <button
        id="battle-debug-menu-close-btn"
        class="close-mini"
        @click.stop="emit('close')"
      >
        <span class="emoji">✕</span>
      </button>
    </div>

    <div class="debug-scroll-area">
      <!-- Quick Actions -->
      <DebugActionPanelQuickButtons />

      <!-- ENVIRONMENT & BEHAVIOR -->
      <div class="debug-section">
        <div class="section-label">
          Environment & Behavior
        </div>
        <div class="btn-grid">
          <PVTooltip description="Binocs: Ver el Pokémon en COLOR (Binoculares) o en SILUETA (Normal)">
            <button
              id="battle-debug-binoculars-btn"
              class="mini-btn"
              :class="{ active: battleStore.debugBinoculars }"
              @click.stop="toggleBinoculars"
            >
              {{ battleStore.debugBinoculars ? 'BINOCS: ON' : 'BINOCS: OFF' }}
            </button>
          </PVTooltip>
          
          <PVTooltip description="Chain: El siguiente Pokémon aparece automáticamente al ganar">
            <button
              id="battle-debug-chain-btn"
              class="mini-btn"
              :class="{ active: battleStore.isSearching }"
              @click.stop="toggleSearchMode"
            >
              {{ battleStore.isSearching ? 'CHAIN: ON' : 'CHAIN: OFF' }}
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
            id="battle-debug-player-shiny-btn"
            class="mini-btn"
            :class="{ active: battleStore.state?.player?.isShiny }"
            @click.stop="toggleStatus('player', 'shiny')"
          >
            SHINY
          </button>
          <button
            id="battle-debug-player-guard-btn"
            class="mini-btn"
            :class="{ active: battleStore.state?.player?.isGuardian }"
            @click.stop="toggleStatus('player', 'guardian')"
          >
            GUARD
          </button>
        </div>
        <div class="swap-controls-triple">
          <div class="base-swap-group">
            <button
              id="battle-debug-player-swap-dec-btn"
              class="swap-btn"
              title="Pokémon Anterior"
              @click.stop="decrementSwap('player')"
            >
              -
            </button>
            <input
              id="battle-debug-player-id-input"
              v-model="playerBaseId"
              type="number"
              min="1"
              class="swap-input base-id-input"
              placeholder="ID"
              @change="updateVisualSwap('player')"
              @click.stop
            >
            <button
              id="battle-debug-player-swap-inc-btn"
              class="swap-btn"
              title="Pokémon Siguiente"
              @click.stop="incrementSwap('player')"
            >
              +
            </button>
          </div>
          <input
            id="battle-debug-player-variant-input"
            v-model="playerVariant"
            type="text"
            class="swap-input-mini variant-input"
            placeholder="Var"
            title="Variante (ej. 1, mega, alola)"
            @change="updateVisualSwap('player')"
            @click.stop
          >
          <select
            id="battle-debug-player-gender-select"
            v-model="playerGender"
            class="swap-select-mini gender-input"
            title="Género"
            @change="updateVisualSwap('player')"
            @click.stop
          >
            <option value="">
              Género
            </option>
            <option value="m">
              Macho
            </option>
            <option value="f">
              Hembra
            </option>
          </select>
        </div>
      </div>

      <!-- ENEMY SECTION -->
      <div class="debug-section">
        <div class="section-label">
          Enemy Controls
        </div>
        <div class="btn-grid">
          <button
            id="battle-debug-enemy-shiny-btn"
            class="mini-btn"
            :class="{ active: battleStore.state?.enemy?.isShiny }"
            @click.stop="toggleStatus('enemy', 'shiny')"
          >
            SHINY
          </button>
          <button
            id="battle-debug-enemy-guard-btn"
            class="mini-btn"
            :class="{ active: battleStore.state?.enemy?.isGuardian }"
            @click.stop="toggleStatus('enemy', 'guardian')"
          >
            GUARD
          </button>
        </div>
        <div class="swap-controls-triple">
          <div class="base-swap-group">
            <button
              id="battle-debug-enemy-swap-dec-btn"
              class="swap-btn"
              title="Pokémon Anterior"
              @click.stop="decrementSwap('enemy')"
            >
              -
            </button>
            <input
              id="battle-debug-enemy-id-input"
              v-model="enemyBaseId"
              type="number"
              min="1"
              class="swap-input base-id-input"
              placeholder="ID"
              @change="updateVisualSwap('enemy')"
              @click.stop
            >
            <button
              id="battle-debug-enemy-swap-inc-btn"
              class="swap-btn"
              title="Pokémon Siguiente"
              @click.stop="incrementSwap('enemy')"
            >
              +
            </button>
          </div>
          <input
            id="battle-debug-enemy-variant-input"
            v-model="enemyVariant"
            type="text"
            class="swap-input-mini variant-input"
            placeholder="Var"
            title="Variante (ej. 1, mega, alola)"
            @change="updateVisualSwap('enemy')"
            @click.stop
          >
          <select
            id="battle-debug-enemy-gender-select"
            v-model="enemyGender"
            class="swap-select-mini gender-input"
            title="Género"
            @change="updateVisualSwap('enemy')"
            @click.stop
          >
            <option value="">
              Género
            </option>
            <option value="m">
              Macho
            </option>
            <option value="f">
              Hembra
            </option>
          </select>
        </div>
        <div class="catch-buttons-group">
          <button
            id="battle-debug-critical-catch-btn"
            class="debug-btn crit-catch-btn"
            @click.stop="debugCriticalCapture"
          >
            CAPTURA CRÍTICA (DEBUG)
          </button>
        </div>
      </div>

      <!-- CAMERA -->
      <div class="debug-section">
        <div class="section-label">
          Camera Controls
        </div>
        <div class="btn-grid-4">
          <button
            id="battle-debug-cam-guides-btn"
            class="mini-btn"
            :class="{ active: battleStore.debugShowGuides }"
            @click.stop="gameBus.emit('TOGGLE_CAMERA_GUIDES')"
          >
            GUIDES
          </button>
          <button
            id="battle-debug-cam-fx-btn"
            class="mini-btn"
            :class="{ active: battleStore.debugShowFxRadius }"
            @click.stop="battleStore.debugShowFxRadius = !battleStore.debugShowFxRadius"
          >
            FX RAD
          </button>
          <button
            id="battle-debug-cam-poke-btn"
            class="mini-btn"
            :class="{ active: battleStore.debugShowPokeRadius }"
            @click.stop="battleStore.debugShowPokeRadius = !battleStore.debugShowPokeRadius"
          >
            POKE RAD
          </button>
          <button
            id="battle-debug-cam-zoom-btn"
            class="mini-btn"
            :class="{ active: battleStore.debugZoom !== 1 }"
            @click.stop="gameBus.emit('TOGGLE_DEBUG_ZOOM')"
          >
            ZOOM
          </button>
        </div>
        <div class="debug-row">
          <button
            id="battle-debug-solid-shadow-btn"
            class="mini-btn shadow-solid-btn"
            :class="{ active: shadowStore.isSolidShadows }"
            @click.stop="shadowStore.toggleSolidShadows"
          >
            {{ shadowStore.isSolidShadows ? 'SOMBRA: 100% (SÓLIDA)' : 'SOMBRA: 40% (NORMAL)' }}
          </button>
        </div>
      </div>

      <div class="debug-footer">
        <span class="emoji">●</span> VITE_DEBUG ACTIVE
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_debug-action-panel.scss"></style>
