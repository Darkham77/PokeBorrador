<script setup lang="ts">
import { ref, computed, watch } from 'vue'
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

const getPokedexIndex = (pokemonId?: string | null) => {
  if (!pokemonId) return 1
  const idx = ALL_PDEX.indexOf(pokemonId)
  return idx === -1 ? 1 : idx + 1
}

// Sincronizar inputs bidireccionalmente con los pokemones en combate
watch(() => battleStore.state?.player?.id, (newId) => {
  if (newId) {
    visualPlayerId.value = getPokedexIndex(newId)
  }
}, { immediate: true })

const activeEnemyId = computed(() => {
  const poke = (battleStore.isBattleActive && !battleStore.isSearching && battleStore.state?.enemy)
    ? battleStore.state.enemy
    : (battleStore.upcomingPokemon || battleStore.state?.enemy)
  return poke?.id || null
})

watch(activeEnemyId, (newId) => {
  if (newId) {
    visualEnemyId.value = getPokedexIndex(newId)
  }
}, { immediate: true })

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

const addExpForNextLevel = async () => {
  await battleStore.awardDebugExp()
}

const debugCapture = async () => {
  if (!battleStore.state?.enemy || battleStore.isProcessing) return
  
  battleStore.isProcessing = true
  const e = battleStore.state.enemy
  const itemName = 'Ultra Ball'
  
  battleStore.addLog(`DEBUG: Lanzando ${itemName} (100% Efectividad)...`, 'log-catch', itemName)
  
  const anims = battleStore.animations

  // 1. Ball hit
  audio.ballHit()
  if (anims?.handleCatchRequest) {
    await anims.handleCatchRequest({ side: 'enemy', ballId: itemName })
  } else {
    gameBus.emit('PLAY_CATCH_ENERGY', { side: 'enemy', ballId: itemName })
    await sleep(1000)
  }

  // 2. Shakes
  for (let i = 0; i < 3; i++) {
    audio.wobble()
    if (anims?.handleShakeRequest) {
      await anims.handleShakeRequest({ side: 'enemy' })
    } else {
      gameBus.emit('CATCH_SHAKE', { side: 'enemy' })
      await sleep(1000)
    }
  }

  // 3. Success
  audio.caught()
  battleStore.addLog(`¡Ya está! ¡${e.name} atrapado!`, 'log-catch', e)
  
  battleStore.state.isCapture = true
  gameStore.addPokemon(e, { notify: true })
  
  // Fase de Festejo (Phase 3 de la captura)
  if (anims?.playCatchCelebration) {
    await anims.playCatchCelebration('enemy')
  } else {
    await sleep(1500)
  }

  // Fase de Desvanecimiento (Phase 4 de la captura)
  if (anims?.playBallFadeOut) {
    await anims.playBallFadeOut('enemy')
  } else {
    await sleep(2000)
  }
  
  await battleStore.endBattle(true, false)
  battleStore.isProcessing = false
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
    battleStore.state.player = { ...battleStore.state.player }
  } else if (battleStore.state?.enemy) {
    battleStore.state.enemy.id = targetId
    battleStore.state.enemy = { ...battleStore.state.enemy }
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
    <div
      class="debug-row"
      style="margin-top: 2px;"
    >
      <button
        class="debug-btn exp-btn"
        @click.stop="addExpForNextLevel"
      >
        ⚡ EXP AL SIGUIENTE NIVEL
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

<style scoped lang="scss" src="@/styles/components/_debug-action-panel.scss"></style>
