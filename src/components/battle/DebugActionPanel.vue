<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { gsapSleep } from '@/logic/utils/gsapHelpers'
import { useBattleStore } from '@/stores/battle/battle'
import { useGameStore } from '@/stores/game'
import { useAudioStore } from '@/stores/audio'
import { getItemName } from '@/data/inventory/items'
import PVTooltip from '@/components/common/PVTooltip.vue'
import DebugActionPanelQuickButtons from './DebugActionPanelQuickButtons.vue'
import { PDEX_ORDER, GEN2_PDEX_ORDER, isPokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex'
import { gameBus } from '@/logic/events/gameBus'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { hasAnimatedSpriteId } from '@/data/pokemon/animatedSpriteDatabase'
import { requireFeetPoints } from '@/data/pokemon/pokemonFeetDatabase'
import { deconstructPokemonId, constructPokemonId } from './debugActionPanelHelpers.ts'

const emit = defineEmits<{
  (event: 'close'): void
}>()

const ALL_PDEX: readonly PokemonSpeciesId[] = [...PDEX_ORDER, ...GEN2_PDEX_ORDER]

const battleStore = useBattleStore()
const gameStore = useGameStore()
const audio = useAudioStore()

const playerBaseId = ref('1')
const playerVariant = ref('')
const playerGender = ref('')

const enemyBaseId = ref('1')
const enemyVariant = ref('')
const enemyGender = ref('')

// Sincronizar inputs bidireccionalmente con los pokemones en combate
watch(() => battleStore.state?.player?.id, (newId) => {
  if (newId) {
    const { baseId, variant, gender } = deconstructPokemonId(newId)
    playerBaseId.value = baseId
    playerVariant.value = variant
    playerGender.value = gender
  }
}, { immediate: true })

const activeEnemyId = computed(() => {
  const poke = battleStore.state?.enemy
  return poke?.id || null
})

watch(activeEnemyId, (newId) => {
  if (newId) {
    const { baseId, variant, gender } = deconstructPokemonId(newId)
    enemyBaseId.value = baseId
    enemyVariant.value = variant
    enemyGender.value = gender
  }
}, { immediate: true })

const DEBUG_CATCH_FALLBACK_SLEEP_MS = 1000
const DEBUG_CATCH_SHAKE_COUNT = 3
const DEBUG_CATCH_CELEBRATION_SLEEP_MS = 1500
const DEBUG_CATCH_FADEOUT_SLEEP_MS = 2000
const PARSE_INT_DECIMAL_RADIX = 10

const debugCapture = async () => {
  if (!battleStore.state?.enemy || battleStore.isProcessing) return
  
  battleStore.isProcessing = true
  const e = battleStore.state.enemy
  const ballId = 'ultraball'
  const itemName = getItemName(ballId)
  
  battleStore.addLog(`DEBUG: Lanzando ${itemName} (100% Efectividad)...`, 'log-catch', itemName)
  
  const anims = battleStore.animations

  // 1. Ball hit
  audio.play('ballHit')
  if (anims?.handleCatchRequest) {
    await anims.handleCatchRequest({ side: 'enemy', ballId })
  } else {
    gameBus.emit('PLAY_CATCH_ENERGY', { side: 'enemy', ballId })
    await gsapSleep(DEBUG_CATCH_FALLBACK_SLEEP_MS)
  }

  // 2. Shakes
  for (let i = 0; i < DEBUG_CATCH_SHAKE_COUNT; i++) {
    audio.play('wobble')
    if (anims?.handleShakeRequest) {
      await anims.handleShakeRequest({ side: 'enemy' })
    } else {
      gameBus.emit('CATCH_SHAKE', { side: 'enemy' })
      await gsapSleep(DEBUG_CATCH_FALLBACK_SLEEP_MS)
    }
  }

  // 3. Success
  audio.play('caught')
  battleStore.addLog(`¡Ya está! ¡${e.name} atrapado!`, 'log-catch', e)
  
  battleStore.state.isCapture = true
  gameStore.addPokemon(e, { notify: true })

  // Fase de Festejo (Phase 3 de la captura)
  if (anims?.playCatchCelebration) {
    await anims.playCatchCelebration('enemy')
  } else {
    await gsapSleep(DEBUG_CATCH_CELEBRATION_SLEEP_MS)
  }

  // Fase de Desvanecimiento (Phase 4 de la captura)
  if (anims?.playBallFadeOut) {
    await anims.playBallFadeOut('enemy')
  } else {
    await gsapSleep(DEBUG_CATCH_FADEOUT_SLEEP_MS)
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
}

const updateVisualSwap = (side = 'enemy') => {
  const baseIdVal = side === 'player' ? playerBaseId.value : enemyBaseId.value
  const rawVariantVal = side === 'player' ? playerVariant.value : enemyVariant.value
  const genderVal = side === 'player' ? playerGender.value : enemyGender.value

  let targetBase = String(baseIdVal ?? '').trim().toLowerCase()
  if (!/^\d+$/.test(targetBase)) {
    const idx = isPokemonSpeciesId(targetBase) ? ALL_PDEX.indexOf(targetBase) : -1
    if (idx !== -1) {
      targetBase = String(idx + 1)
    }
  }

  // Si el valor de la variante es "0" o contiene solo espacios, lo ignoramos para no generar "_0"
  const cleanVar = String(rawVariantVal ?? '').trim().toLowerCase()
  const variantVal = (cleanVar === '0' || cleanVar === '') ? '' : cleanVar

  const targetId = constructPokemonId(targetBase, variantVal, genderVal)

  // VALIDACIÓN ESTRICTA: Lanza error ANTES de mutar el estado si el ID resultante es inválido
  const isFemale = genderVal.toLowerCase() === 'f'
  const isBack = side === 'player'
  const candIdle = `${targetBase}i${variantVal ? '_' + variantVal : ''}`
  const candSimple = `${targetBase}${variantVal ? '_' + variantVal : ''}`

  let animatedKey = ''
  if (isBack) {
    if (isFemale && hasAnimatedSpriteId(`${candIdle}_f_back`)) {
      animatedKey = `${candIdle}_f_back`
    } else if (hasAnimatedSpriteId(`${candIdle}_back`)) {
      animatedKey = `${candIdle}_back`
    } else if (isFemale && hasAnimatedSpriteId(`${candSimple}_f_back`)) {
      animatedKey = `${candSimple}_f_back`
    } else if (hasAnimatedSpriteId(`${candSimple}_back`)) {
      animatedKey = `${candSimple}_back`
    }
  } else {
    if (isFemale && hasAnimatedSpriteId(`${candIdle}_f`)) {
      animatedKey = `${candIdle}_f`
    } else if (hasAnimatedSpriteId(candIdle)) {
      animatedKey = candIdle
    } else if (isFemale && hasAnimatedSpriteId(`${candSimple}_f`)) {
      animatedKey = `${candSimple}_f`
    } else if (hasAnimatedSpriteId(candSimple)) {
      animatedKey = candSimple
    }
  }

  // Si no es un sprite animado conocido, comprobar que existirá en POKEMON_FEET_DATABASE
  if (!animatedKey) {
    const targetUrl = getAssetUrl(ASSET_TYPES.POKEMON, targetId, {
      isShiny: side === 'player' ? !!battleStore.state?.player?.isShiny : !!battleStore.state?.enemy?.isShiny,
      isBack: isBack,
      isAnimated: false
    })
    
    let dbKey = targetUrl
    const baseUrl = import.meta.env.BASE_URL || '/'
    if (baseUrl !== '/' && targetUrl.startsWith(baseUrl)) {
      dbKey = targetUrl.slice(baseUrl.length - 1)
    }
    try {
      dbKey = decodeURIComponent(dbKey)
    } catch (e) {
      throw new Error(`[DebugActionPanel] Error al decodificar dbKey '${dbKey}': ${String(e)}`)
    }

    requireFeetPoints(dbKey)
  }

  if (side === 'player' && battleStore.state?.player) {
    battleStore.state.player.id = targetId
    battleStore.state.player = { ...battleStore.state.player }
  } else if (battleStore.state?.enemy) {
    battleStore.state.enemy.id = targetId
    battleStore.state.enemy = { ...battleStore.state.enemy }
  }
}

const incrementSwap = (side = 'enemy') => {
  const baseIdRef = side === 'player' ? playerBaseId : enemyBaseId
  const current = String(baseIdRef.value ?? '').trim()
  
  let num = parseInt(current, PARSE_INT_DECIMAL_RADIX)
  if (isNaN(num)) {
    const speciesId = current.toLowerCase()
    const idx = isPokemonSpeciesId(speciesId) ? ALL_PDEX.indexOf(speciesId) : -1
    num = idx !== -1 ? idx + 1 : 1
  }
  
  baseIdRef.value = String(num + 1)
  updateVisualSwap(side)
}

const decrementSwap = (side = 'enemy') => {
  const baseIdRef = side === 'player' ? playerBaseId : enemyBaseId
  const current = String(baseIdRef.value ?? '').trim()

  let num = parseInt(current, PARSE_INT_DECIMAL_RADIX)
  if (isNaN(num)) {
    const speciesId = current.toLowerCase()
    const idx = isPokemonSpeciesId(speciesId) ? ALL_PDEX.indexOf(speciesId) : -1
    num = idx !== -1 ? idx + 1 : 1
  }
  
  baseIdRef.value = String(Math.max(1, num - 1))
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
    const poke = battleStore.state?.enemy
    if (!poke) return
    if (type === 'shiny') poke.isShiny = !poke.isShiny
    if (type === 'guardian') poke.isGuardian = !poke.isGuardian
    
    if (battleStore.state) {
      battleStore.state.enemy = { ...poke }
    }
  }
}
</script>

<template>
  <div class="debug-menu custom-scrollbar-vicio">
    <div class="debug-header">
      <span class="icon">🕹️</span>
      <span class="title">BATTLE ACTIONS & DEBUG</span>
      <button
        id="battle-debug-menu-close-btn"
        class="close-mini"
        @click.stop="emit('close')"
      >
        <span class="btn-emoji">✕</span>
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
        <button
          id="battle-debug-super-ball-btn"
          class="debug-btn catch-btn"
          @click.stop="debugCapture"
        >
          CAPTURA INMEDIATA (100%)
        </button>
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
      </div>

      <div class="debug-footer">
        ● VITE_DEBUG ACTIVE
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_debug-action-panel.scss"></style>
