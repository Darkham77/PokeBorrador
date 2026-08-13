<script setup lang="ts">
import { ref } from 'vue'
import { useBattleStore } from '@/stores/battle/battle'
import { gameBus } from '@/logic/events/gameBus'
import DebugActionList from './DebugActionList.vue'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { requireBattleConditionKey, type BattleStages } from '@/types/battle/battle'

import { 
  DEBUG_SOUNDS, 
  DEBUG_STATUS_CONDITIONS, 
  DEBUG_SECONDARY_EFFECTS, 
  DEBUG_ENCOUNTER_ANIMS,
  DEBUG_COMBAT_ANIMS,
  DEBUG_CATCH_ANIMS, 
  DEBUG_ATTACK_FX, 
  DEBUG_STATS, 
  DEBUG_FIELD_EFFECTS, 
// Weather effects removed
  DEBUG_UI_ANIMS,
  DEBUG_SPECIAL_MODES
} from './debugConstants.ts'

interface ViteDebugBridge extends Record<string, unknown> { // open-record
  setStatStage: (side: string, stat: string, val: number) => void;
  playSound: (id: string) => void;
  triggerAnim: (id: string, side: string, options?: Record<string, unknown>) => void;
  setStatus: (side: string, status: string) => Promise<void>;
  setSecondaryStatus: (side: string, type: string) => void;
  modifyStatStage: (side: string, stat: string, delta: number) => void;
  setFieldEffect: (side: string, effect: string, val: number) => void;
  toggleSilhouette: () => void;
}

const battleStore = useBattleStore()

const activeSide = ref<'player' | 'enemy'>('enemy')

const getDebugBridge = () => window.__VITE_DEBUG__ as ViteDebugBridge

const setStatStage = (side: string, stat: string, val: number) => {
  getDebugBridge().setStatStage(side, stat, val)
}

const playSound = (id: string) => {
  getDebugBridge().playSound(id)
}

const triggerAnim = (id: string, options = {}) => {
  const bridge = getDebugBridge()
  if (bridge && typeof bridge.triggerAnim === 'function') {
    bridge.triggerAnim(id, activeSide.value, options)
  } else {
    gameBus.emit(id === 'recoil_rebound' ? 'PLAY_RECOIL' : id, { side: activeSide.value, ...options })
  }
}

const triggerAttack = (cat?: string) => {
  if (!cat) return
  if (cat === 'recoil') {
    gameBus.emit('PLAY_RECOIL', { side: activeSide.value })
    return
  }
  const bridge = getDebugBridge()
  if (bridge && typeof bridge.triggerAnim === 'function') {
    bridge.triggerAnim('attack', activeSide.value, { cat })
  }
}

const setStatus = async (status: string) => {
  await getDebugBridge().setStatus(activeSide.value, status)
}

const toggleSecondary = (type: string) => {
  if (type === 'confusion' || type === 'flinch' || type === 'tauntTurns' || type === 'substitute') {
    const sideKey = activeSide.value === 'player' ? 'player' : 'enemy'
    const poke = sideKey === 'player' ? battleStore.player : battleStore.enemy
    if (poke) {
      if (!poke.volatileCounters) poke.volatileCounters = {}
      poke.volatileCounters[type] = (poke.volatileCounters[type] || 0) > 0 ? 0 : 3
      battleStore.addLog(`DEBUG: Estado volátil ${type.toUpperCase()} alternado en ${poke.name}`, 'log-info', poke)
    }
  } else {
    getDebugBridge().setSecondaryStatus(activeSide.value, type)
  }
}

const modifyStat = (stat: string, delta: number) => {
  getDebugBridge().modifyStatStage(activeSide.value, stat, delta)
}

const setField = (effect: string, val: number) => {
  if (['electricterrain', 'grassyterrain', 'mistyterrain', 'psychicterrain', 'trickroom', 'gravity'].includes(effect)) {
    if (battleStore.state) {
      const condition = requireBattleConditionKey(effect)
      if (!battleStore.state.fieldConditions) battleStore.state.fieldConditions = {}
      if (battleStore.state.fieldConditions[condition]) {
        delete battleStore.state.fieldConditions[condition]
        battleStore.addLog(`DEBUG: Terreno/Efecto ${effect.toUpperCase()} desactivado`, 'log-info')
      } else {
        battleStore.state.fieldConditions[condition] = { turns: 5 }
        battleStore.addLog(`DEBUG: Terreno/Efecto de Campo ${effect.toUpperCase()} activado`, 'log-info')
      }
    }
  } else if (['stealthrock', 'spikes', 'toxicspikes', 'reflect', 'lightscreen', 'safeguard', 'mist'].includes(effect)) {
    if (battleStore.state) {
      const condition = requireBattleConditionKey(effect)
      if (!battleStore.state.enemySideConditions) battleStore.state.enemySideConditions = {}
      if (battleStore.state.enemySideConditions[condition]) {
        delete battleStore.state.enemySideConditions[condition]
        battleStore.addLog(`DEBUG: Efecto ${effect.toUpperCase()} desactivado`, 'log-info')
      } else {
        battleStore.state.enemySideConditions[condition] = { turns: 5 }
        battleStore.addLog(`DEBUG: Efecto ${effect.toUpperCase()} aplicado al bando enemigo`, 'log-info')
      }
    }
  } else {
    getDebugBridge().setFieldEffect(activeSide.value, effect, val)
  }
}

const toggleSilhouette = () => {
  getDebugBridge().toggleSilhouette()
}

const isEffectActive = (type: string, category: string) => {
  const side = activeSide.value
  const poke = side === 'player' 
    ? battleStore.state?.player 
    : battleStore.state?.enemy
  const stages = side === 'player' ? battleStore.playerStages : battleStore.enemyStages

  if (category === 'status') return (poke as Pokemon | undefined)?.status === type
  if (category === 'secondary') {
    const p = poke as (Pokemon & Record<string, unknown>) | undefined
    if (type === 'confusion' || type === 'confused') return !!p?.confused || (p?.volatileCounters?.['confusion'] || 0) > 0
    if (type === 'flinch') return (p?.volatileCounters?.['flinch'] || 0) > 0
    if (type === 'tauntTurns' || type === 'taunt') return (p?.tauntTurns || 0) > 0 || (p?.volatileCounters?.['tauntTurns'] || 0) > 0
    if (type === 'substitute') return !!p?.substitute || (p?.volatileCounters?.['substitute'] || 0) > 0
    if (type === 'disabledTurns') return (p?.disabledTurns || 0) > 0
    if (type === 'encoreTurns') return (p?.encoreTurns || 0) > 0
    if (type === 'perishSongCount') return (p?.perishSongCount || 0) > 0
    if (type === 'bound') return (p?.bound || 0) > 0
    if (type === 'focus_energy') return !!p?.focusEnergy
    if (type === 'lock_on') return !!p?.lockOn
    if (type === 'seeded') return !!p?.seeded
    return !!p?.[type]
  }
  if (category === 'field') {
    if (['electricterrain', 'grassyterrain', 'mistyterrain', 'psychicterrain', 'trickroom', 'gravity'].includes(type)) {
      const condition = requireBattleConditionKey(type)
      return !!battleStore.state?.fieldConditions?.[condition]
    }
    if (['stealthrock', 'spikes', 'toxicspikes', 'reflect', 'lightscreen', 'safeguard', 'mist'].includes(type)) {
      const condition = requireBattleConditionKey(type)
      return !!battleStore.state?.enemySideConditions?.[condition] || !!battleStore.state?.playerSideConditions?.[condition]
    }
    return ((stages as BattleStages | undefined)?.[type as keyof BattleStages] || 0) > 0
  }
  if (category === 'weather') return battleStore.state?.weather?.type === type

  return false
}
</script>

<template>
  <div class="debug-audio-tab">
    <!-- SIDE SELECTOR -->
    <div class="side-selector-wrap">
      <span class="section-label">BANDO OBJETIVO</span>
      <div class="side-toggle">
        <button 
          id="debug-effect-side-player"
          :class="{ active: activeSide === 'player' }"
          @click.stop="activeSide = 'player'"
        >
          JUGADOR (BACK)
        </button>
        <button 
          id="debug-effect-side-enemy"
          :class="{ active: activeSide === 'enemy' }"
          @click.stop="activeSide = 'enemy'"
        >
          ENEMIGO (FRONT)
        </button>
      </div>
    </div>

    <!-- STATUS CONDITIONS SECTION -->
    <div class="debug-section">
      <h3 class="section-title">
        ESTADOS ALTERADOS
      </h3>
      <div class="button-grid-small">
        <button
          v-for="st in DEBUG_STATUS_CONDITIONS"
          :id="`debug-status-${st.id}`"
          :key="st.id"
          class="debug-btn status-btn"
          :class="{ active: isEffectActive(st.id, 'status') }"
          @click.stop="setStatus(st.id)"
        >
          <span class="icon">{{ st.icon }}</span>
          {{ st.label }}
        </button>
      </div>
    </div>

    <!-- STATS SECTION -->
    <div class="debug-section">
      <h3 class="section-title">
        NIVELES DE ESTADÍSTICAS
      </h3>
      <div class="stats-list">
        <div 
          v-for="s in DEBUG_STATS" 
          :key="s.id"
          class="stat-row"
        >
          <span class="stat-label">
            <span class="icon">{{ s.icon }}</span>
            {{ s.label }}
          </span>
          <div class="stat-actions">
            <button
              class="mini-tool-btn minus"
              @click.stop="modifyStat(s.id, -1)"
            >
              -1
            </button>
            <button
              class="mini-tool-btn plus"
              @click.stop="modifyStat(s.id, 1)"
            >
              +1
            </button>
            <button
              class="mini-tool-btn reset"
              @click.stop="setStatStage(activeSide, s.id, 0)"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- SECONDARY EFFECTS SECTION -->
    <div class="debug-section">
      <h3 class="section-title">
        ESTADOS SECUNDARIOS
      </h3>
      <div class="button-grid-small">
        <button
          v-for="se in DEBUG_SECONDARY_EFFECTS"
          :key="se.id"
          class="debug-btn secondary-btn"
          :class="{ active: isEffectActive(se.id, 'secondary') }"
          @click.stop="toggleSecondary(se.id)"
        >
          <span class="icon">{{ se.icon }}</span>
          {{ se.label }}
        </button>
      </div>
    </div>

    <!-- FIELD EFFECTS SECTION -->
    <div class="debug-section">
      <h3 class="section-title">
        EFECTOS DE CAMPO
      </h3>
      <div class="button-grid-small">
        <button
          v-for="f in DEBUG_FIELD_EFFECTS"
          :key="f.id"
          class="debug-btn field-btn"
          :class="{ active: isEffectActive(f.id, 'field') }"
          @click.stop="setField(f.id, 5)"
        >
          <span class="icon">{{ f.icon }}</span>
          {{ f.label }}
        </button>
      </div>
    </div>


    <!-- SOUNDS SECTION -->
    <div class="debug-section">
      <h3 class="section-title">
        EFECTOS DE SONIDO (8-BIT)
      </h3>
      <div class="button-grid-small">
        <button
          v-for="s in DEBUG_SOUNDS"
          :key="s.id"
          class="debug-btn sound-btn"
          @click.stop="playSound(s.id)"
        >
          <span class="icon">{{ s.icon }}</span>
          {{ s.label }}
        </button>
      </div>
    </div>

    <!-- ENCOUNTER ANIMS SECTION -->
    <DebugActionList
      title="ENCUENTRO SALVAJE"
      :items="DEBUG_ENCOUNTER_ANIMS"
      @action="triggerAnim"
    />

    <!-- COMBAT ANIMS SECTION -->
    <DebugActionList
      title="COMBATE Y ESTADO"
      :items="DEBUG_COMBAT_ANIMS"
      @action="triggerAnim"
    />
    
    <!-- CATCH ANIMS SECTION -->
    <DebugActionList
      title="FASES DE CAPTURA"
      :items="DEBUG_CATCH_ANIMS"
      :title-style="{ color: '#ffd700', borderBottomColor: 'rgba(255, 215, 0, 0.3)' }"
      :card-style="{ background: 'rgba(40, 30, 0, 0.4)', borderColor: 'rgba(255, 215, 0, 0.2)' }"
      :label-style="{ color: '#fef3c7' }"
      :arrow-style="{ color: '#f59e0b' }"
      @action="triggerAnim"
    />

    <!-- ATTACK FX SECTION -->
    <div class="debug-section">
      <h3 class="section-title">
        FX DE ATAQUES (SPRITE)
      </h3>
      <div class="button-grid-3">
        <button
          v-for="fx in DEBUG_ATTACK_FX"
          :key="fx.id"
          class="debug-btn fx-btn"
          @click.stop="triggerAttack(fx.cat)"
        >
          <span class="icon">{{ fx.icon }}</span>
          {{ fx.label }}
        </button>
      </div>
    </div>

    <!-- UI ANIMS SECTION -->
    <DebugActionList
      title="ANIMACIONES DE INTERFAZ (GSAP)"
      :items="DEBUG_UI_ANIMS"
      :title-style="{ color: '#60a5fa', borderBottomColor: 'rgba(96, 165, 250, 0.3)' }"
      :card-style="{ background: 'rgba(30, 58, 138, 0.2)', borderColor: 'rgba(96, 165, 250, 0.2)' }"
      :label-style="{ color: '#dbeafe' }"
      :desc-style="{ color: '#93c5fd' }"
      :arrow-style="{ color: '#60a5fa' }"
      @action="triggerAnim"
    />

    <!-- SPECIAL MODES SECTION -->
    <DebugActionList
      title="MODOS ESPECIALES"
      :items="DEBUG_SPECIAL_MODES"
      :title-style="{ color: '#f472b6', borderBottomColor: 'rgba(244, 114, 182, 0.3)' }"
      :card-style="{ background: 'rgba(131, 24, 67, 0.2)', borderColor: 'rgba(244, 114, 182, 0.2)' }"
      :label-style="{ color: '#fce7f3' }"
      :desc-style="{ color: '#f9a8d4' }"
      :arrow-style="{ color: '#f472b6' }"
      @action="(id) => id === 'silhouette' ? toggleSilhouette() : null"
    />
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.debug-audio-tab {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-label {
  @include pixelated;
  font-size: 7px;
  color: Rgba(255, 255, 255, 0.4);
  margin-bottom: 8px;
  display: block;
}

.side-toggle {
  display: flex;
  background: Rgba(0, 0, 0, 0.2);
  padding: 4px;
  border-radius: 12px;
  gap: 4px;

  button {
    flex: 1;
    padding: 10px;
    border: none;
    background: transparent;
    color: Rgba(255, 255, 255, 0.4);
    @include pixelated;
    font-size: 8px;
    border-radius: 8px;
    cursor: pointer;
    

    &.active {
      background: var(--purple);
      color: white;
      box-shadow: 0 4px 15px Rgba(124, 58, 237, 0.3);
    }
  }
}

.debug-section {
  .section-title {
    @include pixelated;
    font-size: 8px;
    color: var(--yellow);
    margin-bottom: 12px;
    letter-spacing: 1px;
    opacity: 0.8;
  }
}

.button-grid-small {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.button-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.debug-btn {
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  color: white;
  padding: 12px 8px;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  @include pixelated;
  font-size: 7px;
  

  &:hover {
    background: Rgba(255, 255, 255, 0.08);
    border-color: Rgba(255, 255, 255, 0.15);
    transform: Translatey(-2px);
  }

  &.active {
    background: var(--purple);
    border-color: white;
    box-shadow: 0 4px 12px Rgba(124, 58, 237, 0.4);
    
    .icon { will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  filter: Drop-Shadow(0 0 5px white); }
  }

  .icon { font-size: 16px; }
}

.stats-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: Rgba(255, 255, 255, 0.03);
  padding: 6px 12px;
  border-radius: 8px;
  
  .stat-label {
    @include pixelated;
    font-size: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: Rgba(255, 255, 255, 0.7);
    .icon { font-size: 12px; }
  }
}

.stat-actions {
  display: flex;
  gap: 4px;
}

.mini-tool-btn {
  background: Rgba(255, 255, 255, 0.05);
  border: 1px solid Rgba(255, 255, 255, 0.1);
  color: white;
  width: 28px;
  height: 22px;
  border-radius: 4px;
  @include pixelated;
  font-size: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  
  &:hover {
    background: var(--purple);
    border-color: white;
  }
  
  &.minus { color: #ff5555; }
  &.plus { color: #50fa7b; }
  &.reset { color: Rgba(255, 255, 255, 0.3); font-size: 10px; }
}
</style>
