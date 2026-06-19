<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { sleep } from '@/logic/utils/timeUtils'
import { useBattleStore } from '@/stores/battle/battle'
import { useGameStore } from '@/stores/game'
import { useAudioStore } from '@/stores/audio'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { PDEX_ORDER, GEN2_PDEX_ORDER, POKEMON_SPRITE_IDS } from '@/data/pokemon/pokedex'
import { gameBus } from '@/logic/events/gameBus'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { ANIMATED_SPRITE_DATABASE } from '@/data/pokemon/animatedSpriteDatabase'
import { POKEMON_FEET_DATABASE } from '@/data/pokemon/pokemonFeetDatabase'

const ALL_PDEX = [...PDEX_ORDER, ...GEN2_PDEX_ORDER]

const battleStore = useBattleStore()
const gameStore = useGameStore()
const audio = useAudioStore()

const playerBaseId = ref('1')
const playerVariant = ref('')
const playerGender = ref('')

const enemyBaseId = ref('1')
const enemyVariant = ref('')
const enemyGender = ref('')

const resolveToSpriteNumber = (fullId: string): { numId: string; rest: string[] } => {
  const parts = fullId.split('_')
  const spriteIds = POKEMON_SPRITE_IDS as Record<string, number | string>


  // Try progressively shorter prefixes to find a POKEMON_SPRITE_IDS match
  // e.g. "nidoran_f_1" -> try "nidoran_f_1", "nidoran_f", "nidoran"
  for (let i = parts.length; i >= 1; i--) {
    const candidate = parts.slice(0, i).join('_').toLowerCase()
    if (spriteIds[candidate] !== undefined) {
      return { numId: String(spriteIds[candidate]), rest: parts.slice(i) }
    }
  }

  // Fallback: if parts[0] is already a number, use it directly
  if (parts[0] !== undefined && /^\d+$/.test(parts[0])) {
    return { numId: parts[0], rest: parts.slice(1) }
  }

  // Last resort: ALL_PDEX position lookup on the first part
  const idx = ALL_PDEX.indexOf((parts[0] || '').toLowerCase())
  return { numId: idx !== -1 ? String(idx + 1) : '1', rest: parts.slice(1) }
}

const deconstructPokemonId = (fullId: string) => {
  const { numId, rest } = resolveToSpriteNumber(fullId)
  let variant = ''
  let gender = ''

  if (rest.length === 2) {
    variant = rest[0] || ''
    gender = rest[1] || ''
  } else if (rest.length === 1) {
    const lastPart = (rest[0] || '').toLowerCase()
    if (lastPart === 'm' || lastPart === 'f') {
      gender = lastPart
    } else {
      variant = rest[0] || ''
    }
  }

  return { baseId: numId, variant, gender }
}

const constructPokemonId = (baseId: string, variant: string, gender: string) => {
  let id = baseId.trim().toLowerCase()
  const cleanVariant = variant.trim().toLowerCase()
  const cleanGender = gender.trim().toLowerCase()

  if (cleanVariant) {
    id += `_${cleanVariant}`
  }
  if (cleanGender) {
    id += `_${cleanGender}`
  }
  return id
}

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
  const ballId = 'ultra_ball'
  
  battleStore.addLog(`DEBUG: Lanzando ${itemName} (100% Efectividad)...`, 'log-catch', itemName)
  
  const anims = battleStore.animations

  // 1. Ball hit
  audio.ballHit()
  if (anims?.handleCatchRequest) {
    await anims.handleCatchRequest({ side: 'enemy', ballId })
  } else {
    gameBus.emit('PLAY_CATCH_ENERGY', { side: 'enemy', ballId })
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
}

const updateVisualSwap = (side = 'enemy') => {
  const baseIdVal = side === 'player' ? playerBaseId.value : enemyBaseId.value
  const rawVariantVal = side === 'player' ? playerVariant.value : enemyVariant.value
  const genderVal = side === 'player' ? playerGender.value : enemyGender.value

  let targetBase = String(baseIdVal ?? '').trim().toLowerCase()
  if (!/^\d+$/.test(targetBase)) {
    const idx = ALL_PDEX.indexOf(targetBase)
    if (idx !== -1) {
      targetBase = String(idx + 1)
    }
  }

  // Si el valor de la variante es "0" o contiene solo espacios, lo ignoramos para no generar "_0"
  const cleanVar = String(rawVariantVal ?? '').trim().toLowerCase()
  const variantVal = (cleanVar === '0' || cleanVar === '') ? '' : cleanVar

  const targetId = constructPokemonId(targetBase, variantVal, genderVal)

  // VALIDACIÓN ESTRICTA: Lanza error ANTES de mutar el estado si el ID resultante es inválido
  // Esto previene que se asigne un ID no válido y se rompa el ciclo de render de Vue 3
  const isFemale = genderVal.toLowerCase() === 'f'
  const isBack = side === 'player'
  const candIdle = `${targetBase}i${variantVal ? '_' + variantVal : ''}`
  const candSimple = `${targetBase}${variantVal ? '_' + variantVal : ''}`

  let animatedKey = ''
  if (isBack) {
    if (isFemale && ANIMATED_SPRITE_DATABASE[`${candIdle}_f_back`]) {
      animatedKey = `${candIdle}_f_back`
    } else if (ANIMATED_SPRITE_DATABASE[`${candIdle}_back`]) {
      animatedKey = `${candIdle}_back`
    } else if (isFemale && ANIMATED_SPRITE_DATABASE[`${candSimple}_f_back`]) {
      animatedKey = `${candSimple}_f_back`
    } else if (ANIMATED_SPRITE_DATABASE[`${candSimple}_back`]) {
      animatedKey = `${candSimple}_back`
    }
  } else {
    if (isFemale && ANIMATED_SPRITE_DATABASE[`${candIdle}_f`]) {
      animatedKey = `${candIdle}_f`
    } else if (ANIMATED_SPRITE_DATABASE[candIdle]) {
      animatedKey = candIdle
    } else if (isFemale && ANIMATED_SPRITE_DATABASE[`${candSimple}_f`]) {
      animatedKey = `${candSimple}_f`
    } else if (ANIMATED_SPRITE_DATABASE[candSimple]) {
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
    } catch (_e) {
      // ignore
    }

    if (!POKEMON_FEET_DATABASE[dbKey]) {
      throw new Error(`[DebugActionPanel] El ID de Pokémon generado "${targetId}" (ruta: "${dbKey}") no existe en POKEMON_FEET_DATABASE ni en ANIMATED_SPRITE_DATABASE.`);
    }
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
  
  let num = parseInt(current, 10)
  if (isNaN(num)) {
    const idx = ALL_PDEX.indexOf(current.toLowerCase())
    num = idx !== -1 ? idx + 1 : 1
  }
  
  baseIdRef.value = String(num + 1)
  updateVisualSwap(side)
}

const decrementSwap = (side = 'enemy') => {
  const baseIdRef = side === 'player' ? playerBaseId : enemyBaseId
  const current = String(baseIdRef.value ?? '').trim()

  let num = parseInt(current, 10)
  if (isNaN(num)) {
    const idx = ALL_PDEX.indexOf(current.toLowerCase())
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
      <div class="swap-controls-triple mt-1">
        <div class="base-swap-group">
          <button
            class="swap-btn"
            @click.stop="decrementSwap('player')"
          >
            -
          </button>
          <input
            v-model="playerBaseId"
            type="number"
            min="1"
            class="swap-input base-id-input"
            placeholder="#"
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
        <input
          v-model="playerVariant"
          type="text"
          class="swap-input-mini variant-input"
          placeholder="Var"
          title="Variante (ej. 1, mega, alola)"
          @change="updateVisualSwap('player')"
          @click.stop
        >
        <select
          v-model="playerGender"
          class="swap-select-mini gender-input"
          title="Género"
          @change="updateVisualSwap('player')"
          @click.stop
        >
          <option value="">
            Gender
          </option>
          <option value="m">
            M
          </option>
          <option value="f">
            F
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
          class="mini-btn"
          :class="{ active: battleStore.state?.enemy?.isShiny }"
          @click.stop="toggleStatus('enemy', 'shiny')"
        >
          SHINY
        </button>
        <button
          class="mini-btn"
          :class="{ active: battleStore.state?.enemy?.isGuardian }"
          @click.stop="toggleStatus('enemy', 'guardian')"
        >
          GUARD
        </button>
      </div>
      <div class="swap-controls-triple mt-1">
        <div class="base-swap-group">
          <button
            class="swap-btn"
            @click.stop="decrementSwap('enemy')"
          >
            -
          </button>
          <input
            v-model="enemyBaseId"
            type="number"
            min="1"
            class="swap-input base-id-input"
            placeholder="#"
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
        <input
          v-model="enemyVariant"
          type="text"
          class="swap-input-mini variant-input"
          placeholder="Var"
          title="Variante (ej. 1, mega, alola)"
          @change="updateVisualSwap('enemy')"
          @click.stop
        >
        <select
          v-model="enemyGender"
          class="swap-select-mini gender-input"
          title="Género"
          @change="updateVisualSwap('enemy')"
          @click.stop
        >
          <option value="">
            Gender
          </option>
          <option value="m">
            M
          </option>
          <option value="f">
            F
          </option>
        </select>
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

<style scoped lang="scss">
.swap-controls-triple {
  display: flex;
  gap: 4px;
  align-items: center;
  width: 100%;
  height: 24px;
}

.base-swap-group {
  display: flex;
  align-items: center;
  height: 100%;
  flex: 1.5;
  background: #000;
  border: 1px solid Rgba(255, 255, 255, 0.4);
  border-radius: 2px;
}

.base-swap-group .swap-btn {
  @include btn-vicio('default', 'xs', true);
  width: 20px !important;
  height: 100% !important;
  font-size: 10px;
  padding: 0 !important;
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  flex-shrink: 0;
}

.base-id-input {
  width: 100%;
  height: 100%;
  background: transparent !important;
  border: none !important;
  color: white;
  @include pixelated;
  font-size: 10px;
  text-align: center;
  border-radius: 0 !important;
  min-width: 0;
  flex: 1;
}

.swap-input-mini {
  flex: 0.6;
  min-width: 0;
  height: 100%;
  background: #000;
  border: 1px solid Rgba(255, 255, 255, 0.4);
  border-radius: 2px;
  color: #fff;
  text-align: center;
  font-size: 10px;
  @include pixelated;
}

.swap-select-mini {
  flex: 0.9;
  min-width: 0;
  height: 100%;
  background: #000;
  border: 1px solid Rgba(255, 255, 255, 0.4);
  border-radius: 2px;
  color: #fff;
  font-size: 8px;
  @include pixelated;
  cursor: pointer;
  text-align: center;

  option {
    background: #14141e;
    color: #fff;
  }
}
</style>
