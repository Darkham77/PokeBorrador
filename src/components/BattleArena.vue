<script setup>
import { computed, watch, onMounted, onUnmounted, ref, nextTick } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBattleStore } from '@/stores/battle'
import BattleLog from './battle/BattleLog.vue'

const gameStore = useGameStore()
const battleStore = useBattleStore()
const gs = computed(() => gameStore.state)
const battle = computed(() => battleStore.activeBattle)

const enemy = computed(() => battle.value?.enemy)
const player = computed(() => battle.value?.player)

const canvasRef = ref(null)

// HP Rendering
const getHpPct = (cur, max) => (cur / max) * 100
const getHpClass = (pct) => {
  if (pct > 50) return 'hp-high'
  if (pct > 25) return 'hp-mid'
  return 'hp-low'
}

// Status & Indicators
const getStatusIcon = (s) => ({ burn: '🔥', poison: '☠️', paralyze: '⚡', sleep: '💤', freeze: '🧊' }[s] || '')
const getGenderText = (g) => ({ M: '♂', F: '♀' }[g] || '')
const getGenderCls = (g) => ({ M: 'gender-male', F: 'gender-female' }[g] || 'gender-none')

// Sprite URLs
const getSprite = (id, isShiny, isBack = false) => {
  const num = window.POKEMON_SPRITE_IDS?.[id.toLowerCase()] || id
  if (!num) return ''
  const base = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'
  const path = isBack ? 'back/' : ''
  const shinyPath = isShiny ? 'shiny/' : ''
  return `${base}${path}${shinyPath}${num}.png`
}

// Move Buttons Logic
const TYPE_COLORS = {
  normal: '#aaa', fire: '#FF6B35', water: '#3B8BFF', grass: '#6BCB77',
  electric: '#FFD93D', ice: '#7DF9FF', fighting: '#FF3B3B', poison: '#C77DFF',
  ground: '#c8a060', flying: '#89CFF0', psychic: '#FF6EFF', bug: '#8BC34A',
  rock: '#c8a060', ghost: '#7B2FBE', dragon: '#5C16C5', dark: '#555', steel: '#9E9E9E'
}
const CAT_ICON = { physical: '⚔️', special: '✨', status: '🔮' }

const getMoveColor = (moveName) => {
  const md = window.MOVE_DATA?.[moveName] || { type: 'normal' }
  return TYPE_COLORS[md.type] || '#aaa'
}

const getMoveType = (moveName) => {
  const md = window.MOVE_DATA?.[moveName] || { type: 'normal' }
  return md.type || '???'
}

const getMoveCatIcon = (moveName) => {
  const md = window.MOVE_DATA?.[moveName] || { cat: 'physical' }
  return CAT_ICON[md.cat] || ''
}

const isMoveDisabled = (move) => {
  if (battleStore.isProcessing) return true
  if (!move || move.pp <= 0) return true
  if (player.value?.heldItem === 'Cinta Elegida' && player.value?.choiceMove && player.value?.choiceMove !== move.name) {
    return true
  }
  return false
}

// Actions
const useMove = (idx) => {
  battleStore.executeMove(idx)
}

const execShowBattleSwitch = () => { if (typeof window.showBattleSwitch === 'function') window.showBattleSwitch() }
const execTryCatch = () => { if (typeof window.tryCatch === 'function') window.tryCatch() }
const execShowBattleBag = () => { if (typeof window.showBattleBag === 'function') window.showBattleBag() }

const execRunFromBattle = () => { 
  battleStore.flee()
  hideTooltip()
}

const continueBattle = () => {
  battleStore.completeBattleFlow()
  hideTooltip()
}

// Canvas Background Logic
const redrawBackground = () => {
  if (battleStore.isBattleActive && typeof window.drawBattleBackground === 'function') {
    // We pass null for canvas id because drawBattleBackground defaults to 'battle-bg-canvas'
    // but we ensure the canvas size is correct first.
    const arena = document.getElementById('battle-arena')
    if (arena && canvasRef.value) {
      canvasRef.value.width = arena.offsetWidth
      canvasRef.value.height = arena.offsetHeight
      window.drawBattleBackground(battle.value?.locationId || 'wild', battle.value?.cycle)
    }
  }
}

watch(() => battleStore.isBattleActive, async (active) => {
  if (active) {
    await nextTick()
    redrawBackground()
  }
})

const showTooltip = (e, name) => { if (typeof window.showMoveTooltip === 'function') window.showMoveTooltip(e, name) }
const hideTooltip = () => { if (typeof window.hideMoveTooltip === 'function') window.hideMoveTooltip() }

let resizeObserver = null

onMounted(() => {
  const arena = document.getElementById('battle-arena')
  if (arena) {
    resizeObserver = new ResizeObserver(() => {
      redrawBackground()
    })
    resizeObserver.observe(arena)
  }
  if (battleStore.isBattleActive) {
    nextTick(() => redrawBackground())
  }
})

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect()
})
</script>

<template>
  <div 
    id="battle-screen" 
    class="battle-screen-grid"
    :class="{ active: battleStore.isBattleActive, 'is-finishing': battleStore.isFinishing }"
  >
    <div v-if="battle" class="battle-container">
      <!-- TOP/LEFT: Arena -->
      <div id="battle-arena" class="battle-arena">
        <canvas id="battle-bg-canvas" ref="canvasRef" class="battle-bg-canvas" />
        
        <div class="battle-combatants">
          <!-- TOP-LEFT: Enemy Info Card -->
          <div class="combatant-info-wrap enemy-side">
            <div class="glass-card enemy-card">
              <div class="card-header">
                <span class="poke-name">{{ enemy.name }} <span v-if="enemy.isShiny">✨</span></span>
                <span class="gender-badge" :class="getGenderCls(enemy.gender)">{{ getGenderText(enemy.gender) }}</span>
                <img v-if="enemy.caught" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" class="caught-icon">
              </div>
              <div class="poke-level">Nv. {{ enemy.level }}</div>
              <div class="hp-status">
                <div class="hp-bar-outer">
                  <div class="hp-bar-inner" :class="getHpClass(getHpPct(enemy.hp, enemy.maxHp))" :style="{ width: getHpPct(enemy.hp, enemy.maxHp) + '%' }" />
                </div>
                <div class="hp-values">HP: {{ enemy.hp }}/{{ enemy.maxHp }}</div>
              </div>
              <div v-if="enemy.status" class="status-badge">{{ enemy.status.toUpperCase() }}</div>
            </div>
          </div>

          <!-- TOP-RIGHT: Enemy Sprite -->
          <div class="sprite-wrap enemy-sprite">
            <img 
              :src="getSprite(enemy.id, enemy.isShiny)" 
              class="pokemon-sprite"
              @error="$event.target.style.display='none'"
            >
          </div>

          <!-- BOTTOM-LEFT: Player Sprite -->
          <div class="sprite-wrap player-sprite">
            <img 
              :src="getSprite(player.id, player.isShiny, true)" 
              class="pokemon-sprite back"
              @error="$event.target.style.display='none'"
            >
          </div>

          <!-- BOTTOM-RIGHT: Player Info Card -->
          <div class="combatant-info-wrap player-side">
            <div class="glass-card player-card">
              <div class="card-header">
                <span class="poke-name" :class="gs.nick_style">{{ player.name }} <span v-if="player.isShiny">✨</span></span>
                <span class="gender-badge" :class="getGenderCls(player.gender)">{{ getGenderText(player.gender) }}</span>
              </div>
              <div class="poke-level">Nv. {{ player.level }}</div>
              <div class="hp-status">
                <div class="hp-bar-outer">
                  <div class="hp-bar-inner" :class="getHpClass(getHpPct(player.hp, player.maxHp))" :style="{ width: getHpPct(player.hp, player.maxHp) + '%' }" />
                </div>
                <div class="exp-bar-outer">
                  <div class="exp-bar-inner" :style="{ width: (player.exp / player.expNeeded * 100) + '%' }" />
                </div>
                <div class="hp-values">HP: {{ player.hp }}/{{ player.maxHp }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- MIDDLE COLUMN (Desktop) / ROW (Mobile): Battle Log -->
      <BattleLog class="battle-log" />

      <!-- CONTROLS -->
      <div id="move-panel">
        <div id="move-buttons" style="display: none;"></div> <!-- Dummy to absorb legacy crash -->
        <!-- Moves Grid -->
        <div class="moves-grid">
          <button 
            v-for="(move, i) in player.moves" 
            :key="i"
            class="move-button-card"
            :style="{ '--move-color': getMoveColor(move.name) }"
            :disabled="isMoveDisabled(move)"
            @click="useMove(i)"
            @mouseenter="showTooltip($event, move.name)"
            @mouseleave="hideTooltip"
          >
            <div class="move-header">
              <span class="move-name-txt">{{ move.name }}</span>
            </div>
            <div class="move-footer">
              <span class="move-type-pill" :class="'type-' + getMoveType(move.name).toLowerCase()">
                {{ getMoveType(move.name).toUpperCase() }}
              </span>
              <span class="move-pp-txt">{{ getMoveCatIcon(move.name) }} PP:{{ move.pp }}/{{ move.maxPP }}</span>
            </div>
          </button>
        </div>

        <!-- Action Row -->
        <div class="action-row-complex">
          <button class="legacy-action-btn switch" @click="execShowBattleSwitch">
            <span class="icon">🔄</span> CAMBIAR
          </button>

          <div class="catch-btn-wrapper">
            <button class="btn-catch-ball" @click="execTryCatch" title="Capturar">
              <span>CAPTURAR</span>
            </button>
          </div>

          <button class="legacy-action-btn bag" @click="execShowBattleBag">
            <span class="icon">🎒</span> MOCHILA
          </button>
        </div>
        
        <button v-if="!battleStore.isFinishing" class="huir-button" @click="execRunFromBattle">
          🏃 HUIR
        </button>
        
        <!-- FINISH OVERLAY / BUTTON -->
        <div v-if="battleStore.isFinishing" class="battle-finish-overlay">
          <button class="continue-btn-final" @click="continueBattle">
            CONTINUAR ➔
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.battle-screen-grid {
  width: 100%;
  height: 100%;
  box-shadow: 0 20px 50px rgba(0,0,0,0.7);
  border: 1px solid rgba(255,255,255,0.05);
}

.battle-bg-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

.battle-combatants {
  position: absolute;
  inset: 0;
  z-index: 1;
  padding: 4cqi;
}

/* Glass Cards (HP Boxes) */
.glass-card {
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 18px;
  padding: 15px;
  min-width: 200px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  color: #fff;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
}

.poke-name {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  letter-spacing: 0.5px;
}

.poke-level {
  font-size: 11px;
  color: var(--yellow);
  font-weight: bold;
  margin-bottom: 8px;
}

.hp-bar-outer, .exp-bar-outer {
  width: 100%;
  height: 8px;
  background: rgba(0,0,0,0.4);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 4px;
  border: 1px solid rgba(255,255,255,0.1);
}

.exp-bar-outer { height: 4px; }
.hp-bar-inner { height: 100%; transition: width 0.4s ease; }
.exp-bar-inner { height: 100%; background: var(--blue); transition: width 0.4s ease; }

.hp-high { background: linear-gradient(90deg, #10b981, #34d399); }
.hp-mid { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.hp-low { background: linear-gradient(90deg, #ef4444, #f87171); }

.hp-values {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  text-align: right;
  opacity: 0.8;
}

/* Sprite Rendering */
.sprite-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.enemy-sprite { align-items: flex-start; justify-content: flex-end; }
.player-sprite { align-items: flex-end; justify-content: flex-start; }

.pokemon-sprite {
  height: 180px;
  width: auto;
  image-rendering: pixelated;
  filter: drop-shadow(0 15px 15px rgba(0,0,0,0.5));
  animation: idle 3s infinite ease-in-out;
}

.pokemon-sprite.back { height: 220px; }

@keyframes idle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

/* Controls Panel */
.battle-controls-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.moves-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.move-button-card {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255,255,255,0.1);
  border-left: 5px solid var(--move-color);
  border-radius: 12px;
  padding: 15px;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.move-button-card:hover:not(:disabled) {
  background: rgba(30, 41, 59, 0.9);
  transform: translateY(-2px);
  border-color: var(--move-color);
}

.move-name-txt {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  display: block;
  margin-bottom: 10px;
}

.move-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.move-type-pill {
  font-size: 9px;
  font-weight: bold;
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--move-color);
}

.move-pp-txt {
  font-size: 10px;
  opacity: 0.8;
}

/* Action Row & Pokeball */
.action-row-complex {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 20px;
  align-items: center;
}

.legacy-action-btn {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  padding: 15px;
  color: #fff;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  cursor: pointer;
  transition: all 0.2s;
}

.legacy-action-btn.switch { border-color: var(--purple); color: var(--purple); }
.legacy-action-btn.bag { border-color: var(--green); color: var(--green); }
.legacy-action-btn:hover { background: rgba(255,255,255,0.1); }

/* The Iconic Pokeball Button */
.btn-catch-ball {
  width: 80px;
  height: 80px;
  border-radius: 50% !important;
  background: #fff !important;
  position: relative;
  border: 4px solid #333 !important;
  box-shadow: 0 10px 20px rgba(0,0,0,0.4), inset 0 -4px 0 rgba(0,0,0,0.1) !important;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  overflow: hidden;
  padding: 0;
}

.btn-catch-ball::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 50%;
  background: #ef5350;
  border-bottom: 4px solid #333;
}

.btn-catch-ball::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  background: #fff;
  border: 4px solid #333;
  border-radius: 50%;
  z-index: 10;
  box-shadow: 0 0 0 4px #fff, 0 0 15px rgba(0,0,0,0.2);
}

.btn-catch-ball:hover {
  transform: scale(1.15) rotate(15deg);
  box-shadow: 0 15px 30px rgba(0,0,0,0.5);
}

.btn-catch-ball span { display: none; }

.huir-button {
  width: 100%;
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 10px;
  color: var(--orange);
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  cursor: pointer;
}

/* BATTLE FINISH */
.battle-finish-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  border-radius: 24px;
}

.continue-btn-final {
  background: linear-gradient(135deg, var(--blue), #2563eb);
  color: #fff;
  border: none;
  padding: 20px 50px;
  font-family: 'Press Start 2P', monospace;
  font-size: 14px;
  border-radius: 16px;
  cursor: pointer;
  box-shadow: 0 10px 30px rgba(37, 99, 235, 0.4);
  transition: all 0.3s;
}

.continue-btn-final:hover {
  transform: scale(1.05) translateY(-5px);
  box-shadow: 0 15px 40px rgba(37, 99, 235, 0.6);
}

/* RESPONSIVE */
@media (max-width: 1200px) {
  .battle-main-layout {
    grid-template-columns: 1fr;
    height: auto;
    overflow-y: auto;
  }
  .battle-sidebar {
    height: 300px;
  }
}
</style>
