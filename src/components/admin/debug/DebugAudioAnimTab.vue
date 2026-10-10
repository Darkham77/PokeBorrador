<script setup lang="ts">
import { ref, toValue } from 'vue'
import { useBattleStore } from '@/stores/battle/battle'
import { gameBus } from '@/logic/events/gameBus'
import DebugActionList from './DebugActionList.vue'
import { isDebugEffectActive } from './debugAudioAnimHelper';

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

interface ViteDebugBridge extends Record<string, unknown> { // open-record: Generic key-value data dictionary container
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
  getDebugBridge().setSecondaryStatus(activeSide.value, type)
}

const modifyStat = (stat: string, delta: number) => {
  getDebugBridge().modifyStatStage(activeSide.value, stat, delta)
}

const setField = (effect: string, val: number) => {
  getDebugBridge().setFieldEffect(activeSide.value, effect, val)
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
  const sideConditions = side === 'player' 
    ? battleStore.state?.playerSideConditions 
    : battleStore.state?.enemySideConditions

  return isDebugEffectActive(category, type, {
    poke,
    stages: toValue(stages),
    fieldConditions: battleStore.state?.fieldConditions,
    sideConditions,
    weatherType: battleStore.state?.weather?.type,
    terrain: battleStore.state?.terrain
  })
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
          <span class="emoji">{{ st.icon }}</span>
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
            <span class="emoji">{{ s.icon }}</span>
            {{ s.label }}
          </span>
          <div class="stat-actions">
            <button
              id="debug-audio-anim-tab-btn-1"
              class="mini-tool-btn minus"
              @click.stop="modifyStat(s.id, -1)"
            >
              -1
            </button>
            <button
              id="debug-audio-anim-tab-btn-1-2"
              class="mini-tool-btn plus"
              @click.stop="modifyStat(s.id, 1)"
            >
              +1
            </button>
            <button
              id="debug-audio-anim-tab-btn-1-3"
              class="mini-tool-btn reset"
              @click.stop="setStatStage(activeSide, s.id, 0)"
            >
              <span class="emoji">✕</span>
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
          id="debug-audio-anim-tab-btn-se-icon-se-label"
          :key="se.id"
          class="debug-btn secondary-btn"
          :class="{ active: isEffectActive(se.id, 'secondary') }"
          @click.stop="toggleSecondary(se.id)"
        >
          <span class="emoji">{{ se.icon }}</span>
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
          id="debug-audio-anim-tab-btn-f-icon-f-label"
          :key="f.id"
          class="debug-btn field-btn"
          :class="{ active: isEffectActive(f.id, 'field') }"
          @click.stop="setField(f.id, 5)"
        >
          <span class="emoji">{{ f.icon }}</span>
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
          id="debug-audio-anim-tab-btn-s-icon-s-label"
          :key="s.id"
          class="debug-btn sound-btn"
          @click.stop="playSound(s.id)"
        >
          <span class="emoji">{{ s.icon }}</span>
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
          id="debug-audio-anim-tab-btn-fx-icon-fx-label"
          :key="fx.id"
          class="debug-btn fx-btn"
          @click.stop="triggerAttack(fx.cat)"
        >
          <span class="emoji">{{ fx.icon }}</span>
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
  gap: $spacing-2xl;
}

.section-label {
  @include pixelated;

  display: block;
  color: Rgb(255 255 255 / 40%);
  font-size: var(--font-7);
  margin-bottom: 8px;
}

.side-toggle {
  display: flex;
  gap: $spacing-xs;
  padding: 4px;
  border-radius: $radius-xl;
  background: Rgb(0 0 0 / 20%);

  button {
    @include pixelated;

    padding: 10px;
    border: none;
    border-radius: $radius-lg;
    background: transparent;
    color: Rgb(255 255 255 / 40%);
    font-size: var(--font-8);
    flex: 1;
    cursor: pointer;
    

    &.active {
      background: var(--purple);
      color: var(--white);
      box-shadow: var(--shadow-md);
    }
  }
}

.debug-section {
  .section-title {
    @include pixelated;

    color: var(--yellow);
    font-size: var(--font-8);
    opacity: 0.8;
    margin-bottom: 12px;
    letter-spacing: 1px;
  }
}

.button-grid-small {
  display: grid;
  gap: $spacing-sm;
  grid-template-columns: repeat(3, 1fr);
}

.button-grid-3 {
  display: grid;
  gap: $spacing-md;
  grid-template-columns: repeat(3, 1fr);
}

.debug-btn {
  @include pixelated;

  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-sm;
  padding: 12px 8px;
  border: 1px solid Rgb(255 255 255 / 5%);
  border-radius: $radius-xl;
  background: Rgb(255 255 255 / 3%);
  color: var(--white);
  font-size: var(--font-7);
  cursor: pointer;
  

  &:hover {
    background: Rgb(255 255 255 / 8%);
    transform: Translatey(-2px);
    border-color: Rgb(255 255 255 / 15%);
  }

  &.active {
    background: var(--purple);
    border-color: var(--white);
    box-shadow: var(--shadow-card);
    
    .icon {
  will-change: transform, filter, opacity;
  filter: Drop-Shadow(0 0 5px white); }
  }

  .icon { font-size: var(--font-16); }
}

.stats-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm-alt;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  border-radius: $radius-lg;
  background: Rgb(255 255 255 / 3%);
  
  .stat-label {
    @include pixelated;

    display: flex;
    align-items: center;
    gap: $spacing-sm;
    color: Rgb(255 255 255 / 70%);
    font-size: var(--font-8);
    .icon { font-size: var(--font-12); }
  }
}

.stat-actions {
  display: flex;
  gap: $spacing-xs;
}

.mini-tool-btn {
  @include pixelated;

  display: flex;
  justify-content: center;
  align-items: center;
  width: 28px;
  height: 22px;
  border: 1px solid Rgb(255 255 255 / 10%);
  border-radius: $radius-sm;
  background: Rgb(255 255 255 / 5%);
  color: var(--white);
  font-size: var(--font-8);
  cursor: pointer;
  
  
  &:hover {
    background: var(--purple);
    border-color: var(--white);
  }
  
  &.minus { color: var(--red-light); }
  &.plus { color: var(--green-light); }
  &.reset { color: Rgb(255 255 255 / 30%); font-size: var(--font-10); }
}
</style>
