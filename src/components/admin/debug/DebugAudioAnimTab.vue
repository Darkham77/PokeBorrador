<script setup lang="ts">
import { ref } from 'vue'
import { useBattleStore } from '@/stores/battle'
import type { Pokemon } from '@/types/pokemon'
import type { BattleStages } from '@/types/battle'

import { 
  DEBUG_SOUNDS, 
  DEBUG_STATUS_CONDITIONS, 
  DEBUG_SECONDARY_EFFECTS, 
  DEBUG_SYSTEM_ANIMS, 
  DEBUG_ATTACK_FX, 
  DEBUG_STATS, 
  DEBUG_FIELD_EFFECTS, 
  DEBUG_WEATHER_EFFECTS 
} from './debugConstants'

interface ViteDebugBridge {
  setStatStage: (side: string, stat: string, val: number) => void;
  playSound: (id: string) => void;
  triggerAnim: (id: string, side: string, options?: Record<string, unknown>) => void;
  setStatus: (side: string, status: string) => void;
  setSecondaryStatus: (side: string, type: string) => void;
  modifyStatStage: (side: string, stat: string, delta: number) => void;
  setFieldEffect: (side: string, effect: string, val: number) => void;
}

const battleStore = useBattleStore()

const activeSide = ref<'player' | 'enemy'>('enemy')

const getDebugBridge = () => (window as unknown as { __VITE_DEBUG__: ViteDebugBridge }).__VITE_DEBUG__

const setStatStage = (side: string, stat: string, val: number) => {
  getDebugBridge().setStatStage(side, stat, val)
}

const playSound = (id: string) => {
  getDebugBridge().playSound(id)
}

const triggerAnim = (id: string, options = {}) => {
  getDebugBridge().triggerAnim(id, activeSide.value, options)
}

const triggerAttack = (cat: string) => {
  getDebugBridge().triggerAnim('attack', activeSide.value, { cat })
}

const setStatus = (status: string) => {
  getDebugBridge().setStatus(activeSide.value, status)
}

const toggleSecondary = (type: string) => {
  getDebugBridge().setSecondaryStatus(activeSide.value, type)
}

const modifyStat = (stat: string, delta: number) => {
  getDebugBridge().modifyStatStage(activeSide.value, stat, delta)
}

const setField = (effect: string, val: number) => {
  getDebugBridge().setFieldEffect(activeSide.value, effect, val)
}

const isEffectActive = (type: string, category: string) => {
  const side = activeSide.value
  const poke = side === 'player' ? battleStore.activeBattle?.player : (battleStore.upcomingPokemon || battleStore.activeBattle?.enemy)
  const stages = side === 'player' ? battleStore.playerStages : battleStore.enemyStages

  if (category === 'status') return (poke as Pokemon | undefined)?.status === type
  if (category === 'secondary') {
    const p = poke as (Pokemon & Record<string, unknown>) | undefined
    if (type === 'confused') return (p?.confused || 0) > 0
    if (type === 'focus_energy') return !!p?.focusEnergy
    if (type === 'lock_on') return !!p?.lockOn
    if (type === 'seeded') return !!p?.seeded
    return !!p?.[type]
  }
  if (category === 'field') return ((stages as BattleStages | undefined)?.[type as keyof BattleStages] || 0) > 0
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
          :class="{ active: activeSide === 'player' }"
          @click.stop="activeSide = 'player'"
        >
          JUGADOR (BACK)
        </button>
        <button 
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

    <!-- WEATHER SECTION -->
    <div class="debug-section">
      <h3 class="section-title">
        CLIMA
      </h3>
      <div class="button-grid-small">
        <button
          v-for="w in DEBUG_WEATHER_EFFECTS"
          :key="w.id"
          class="debug-btn weather-btn"
          :class="{ active: isEffectActive(w.id, 'weather') }"
          @click.stop="setField(w.id, 5)"
        >
          <span class="icon">{{ w.icon }}</span>
          {{ w.label }}
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

    <!-- SYSTEM ANIMS SECTION -->
    <div class="debug-section">
      <h3 class="section-title">
        ANIMACIONES DE SISTEMA
      </h3>
      <div class="button-list">
        <button
          v-for="a in DEBUG_SYSTEM_ANIMS"
          :key="a.id"
          class="debug-btn-long"
          @click.stop="triggerAnim(a.id)"
        >
          <div class="btn-content">
            <span class="icon">{{ a.icon }}</span>
            <div class="text">
              <span class="label">{{ a.label }}</span>
              <span
                v-if="a.desc"
                class="desc"
              >{{ a.desc }}</span>
            </div>
          </div>
          <span class="arrow">▶</span>
        </button>
      </div>
    </div>

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
    transition: all 0.2s;

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
  transition: all 0.2s;

  &:hover {
    background: Rgba(255, 255, 255, 0.08);
    border-color: Rgba(255, 255, 255, 0.15);
    transform: translateY(-2px);
  }

  &.active {
    background: var(--purple);
    border-color: white;
    box-shadow: 0 4px 12px Rgba(124, 58, 237, 0.4);
    
    .icon { filter: Drop-Shadow(0 0 5px white); }
  }

  .icon { font-size: 16px; }
}

.debug-btn-long {
  width: 100%;
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  color: white;
  padding: 14px 16px;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  transition: all 0.2s;

  &:hover {
    background: Rgba(255, 255, 255, 0.08);
    transform: translateX(4px);
  }

  .btn-content {
    display: flex;
    align-items: center;
    gap: 14px;
    
    .icon { font-size: 20px; }
    
    .text {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
      
      .label { @include pixelated; font-size: 8px; }
      .desc { font-size: 9px; color: Rgba(255, 255, 255, 0.4); }
    }
  }
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
  transition: all 0.2s;
  
  &:hover {
    background: var(--purple);
    border-color: white;
  }
  
  &.minus { color: #ff5555; }
  &.plus { color: #50fa7b; }
  &.reset { color: Rgba(255, 255, 255, 0.3); font-size: 10px; }
}
</style>
