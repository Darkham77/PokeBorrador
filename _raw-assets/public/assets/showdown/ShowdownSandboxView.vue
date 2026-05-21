<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { useShowdownSandboxStore } from '@/stores/useShowdownSandboxStore';
import { useRouter } from 'vue-router';

// [PureVue-Ignore] - Ignorar accesos directos del visual en este test de integración
const store = useShowdownSandboxStore();
const router = useRouter();

const showConsole = ref(true);
const consoleBody = ref<HTMLElement | null>(null);

import type { ShowdownLocalDB } from '@/game/battle/showdown/sandbox_db/cloner/extract_logic';
import showdownDB from '@/game/battle/showdown/sandbox_db/data/showdown_db.json';
import { computed } from 'vue';

const typedDB = showdownDB as unknown as ShowdownLocalDB;

const pokemonList = computed(() => {
  return Object.values(typedDB.pokemon).sort((a, b) => a.name.localeCompare(b.name));
});

const moveList = computed(() => {
  return Object.values(typedDB.moves).sort((a, b) => a.name.localeCompare(b.name));
});

const goBack = () => {
  router.push('/');
};

const restartBattle = () => {
  store.isSetupMode = true;
};

const toggleConsole = () => {
  showConsole.value = !showConsole.value;
};

const clearLog = () => {
  store.battleLog = [];
};

// Auto-scroll para la consola de logs de Showdown
watch(() => store.battleLog.length, () => {
  nextTick(() => {
    if (consoleBody.value) {
      consoleBody.value.scrollTop = consoleBody.value.scrollHeight;
    }
  });
});

const getMoveDisplayName = (moveId: string) => {
  const move = typedDB.moves[moveId];
  return move ? move.name : moveId;
};

const getMoveType = (moveId: string) => {
  const move = typedDB.moves[moveId];
  return move ? move.type.toLowerCase() : 'normal';
};
</script>

<template>
  <div class="showdown-sandbox-container">
    <!-- Header/Navigation Bar -->
    <header class="sandbox-header">
      <div class="header-left">
        <button
          class="back-btn"
          @click="goBack"
        >
          <span class="pixel-arrow">←</span> Volver
        </button>
        <span class="sandbox-badge">MÓDULO BATTLE ENGINE SHOWDOWN (OFFLINE)</span>
      </div>
      <div class="header-right">
        <button
          class="console-toggle-btn"
          @click="toggleConsole"
        >
          {{ showConsole ? 'Ocultar Consola' : 'Mostrar Consola' }}
        </button>
      </div>
    </header>

    <!-- Main Workspace -->
    <div class="sandbox-workspace">
      <!-- Setup Overlay -->
      <div
        v-if="store.isSetupMode"
        class="setup-overlay"
      >
        <div class="setup-panel">
          <h2 class="setup-title">
            🔧 Sandbox Team Builder
          </h2>
          
          <div class="teams-container">
            <!-- Player Setup -->
            <div class="team-setup player-setup">
              <h3>Tú (Jugador)</h3>
              <div class="form-group">
                <label>Pokémon</label>
                <select
                  v-model="store.playerPokemonId"
                  class="pixel-select"
                >
                  <option
                    v-for="poke in pokemonList"
                    :key="poke.id"
                    :value="poke.id"
                  >
                    {{ poke.name }}
                  </option>
                </select>
              </div>
              <div
                v-for="i in 4"
                :key="`p-move-${i}`"
                class="form-group"
              >
                <label>Movimiento {{ i }}</label>
                <select
                  v-model="store.playerMoves[i - 1]"
                  class="pixel-select"
                >
                  <option
                    v-for="move in moveList"
                    :key="move.id"
                    :value="move.id"
                  >
                    {{ move.name }} - {{ move.type }} (Poder: {{ move.basePower }})
                  </option>
                </select>
              </div>
            </div>

            <!-- Enemy Setup -->
            <div class="team-setup enemy-setup">
              <h3>Enemigo (Bot)</h3>
              <div class="form-group">
                <label>Pokémon</label>
                <select
                  v-model="store.enemyPokemonId"
                  class="pixel-select"
                >
                  <option
                    v-for="poke in pokemonList"
                    :key="poke.id"
                    :value="poke.id"
                  >
                    {{ poke.name }}
                  </option>
                </select>
              </div>
              <div
                v-for="i in 4"
                :key="`e-move-${i}`"
                class="form-group"
              >
                <label>Movimiento {{ i }}</label>
                <select
                  v-model="store.enemyMoves[i - 1]"
                  class="pixel-select"
                >
                  <option
                    v-for="move in moveList"
                    :key="move.id"
                    :value="move.id"
                  >
                    {{ move.name }} - {{ move.type }} (Poder: {{ move.basePower }})
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div class="setup-actions">
            <button
              class="start-btn animate-pulse"
              @click="store.startMockBattle()"
            >
              ▶ INICIAR SIMULACIÓN
            </button>
          </div>
        </div>
      </div>

      <!-- Battle Arena View -->
      <main
        v-else
        class="battle-arena-panel"
        :class="{ 'console-open': showConsole }"
      >
        <div class="battle-scene">
          <!-- Background Grid & Stars -->
          <div class="arena-background">
            <div class="nebula-glow" />
            <div class="stars-layer" />
            <div class="battle-grid-3d" />
          </div>

          <!-- Combatants Scene -->
          <div class="combatants-container">
            <!-- Enemy (Blastoise) Platform & Sprite -->
            <div
              v-if="store.enemyPokemon"
              class="combatant-wrapper enemy-wrapper"
            >
              <!-- Platform Shadow/Pad -->
              <div class="platform-pad enemy-pad" />
              <!-- Sprite -->
              <div class="sprite-box">
                <img 
                  id="enemy-sprite"
                  :src="store.enemyPokemon.spriteUrl" 
                  :alt="store.enemyPokemon.name"
                  class="pokemon-sprite pixelated"
                >
              </div>
            </div>

            <!-- Player (Charizard) Platform & Sprite -->
            <div
              v-if="store.playerPokemon"
              class="combatant-wrapper player-wrapper"
            >
              <!-- Platform Shadow/Pad -->
              <div class="platform-pad player-pad" />
              <!-- Sprite -->
              <div class="sprite-box">
                <img 
                  id="player-sprite"
                  :src="store.playerPokemon.spriteUrl" 
                  :alt="store.playerPokemon.name"
                  class="pokemon-sprite pixelated"
                >
              </div>
            </div>
          </div>

          <!-- Floating Info Cards (HUD) -->
          <div class="hud-overlay">
            <!-- Enemy (Blastoise) HUD (Top-Left style) -->
            <div
              v-if="store.enemyPokemon"
              class="hud-card enemy-hud"
            >
              <div class="hud-header">
                <span class="poke-name">{{ store.enemyPokemon.name.toUpperCase() }}</span>
                <span class="poke-level">Nv50</span>
              </div>
              <div class="hud-types">
                <span 
                  v-for="t in store.enemyPokemon.types" 
                  :key="t" 
                  class="type-tag" 
                  :class="`type-${t.toLowerCase()}`"
                >
                  {{ t }}
                </span>
              </div>
              <div class="hp-section">
                <div class="hp-label-row">
                  <span class="hp-label">PS</span>
                  <span class="hp-percent">{{ Math.round((Number(store.enemyHP) / Number(store.enemyMaxHP)) * 100) }}%</span>
                </div>
                <div class="hp-bar-outer">
                  <div 
                    id="enemy-hp" 
                    class="hp-bar-inner" 
                    :style="{ width: `${(Number(store.enemyHP) / Number(store.enemyMaxHP)) * 100}%` }"
                  />
                </div>
              </div>
            </div>

            <!-- Player (Charizard) HUD (Bottom-Right style) -->
            <div
              v-if="store.playerPokemon"
              class="hud-card player-hud"
            >
              <div class="hud-header">
                <span class="poke-name">{{ store.playerPokemon.name.toUpperCase() }}</span>
                <span class="poke-level">Nv50</span>
              </div>
              <div class="hud-types">
                <span 
                  v-for="t in store.playerPokemon.types" 
                  :key="t" 
                  class="type-tag" 
                  :class="`type-${t.toLowerCase()}`"
                >
                  {{ t }}
                </span>
              </div>
              <div class="hp-section">
                <div class="hp-label-row">
                  <span class="hp-label">PS</span>
                  <span class="hp-percent">{{ store.playerHP }} / {{ store.playerMaxHP }}</span>
                </div>
                <div class="hp-bar-outer">
                  <div 
                    id="player-hp" 
                    class="hp-bar-inner" 
                    :style="{ width: `${(Number(store.playerHP) / Number(store.playerMaxHP)) * 100}%` }"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Lower HUD: Dialogue & Actions -->
        <div class="action-panel">
          <div class="dialogue-box">
            <p class="dialogue-text">
              {{ store.currentMessage }}
            </p>
          </div>

          <!-- Move Selector or Restart Game -->
          <div class="controls-box">
            <template v-if="!store.gameOver">
              <div
                v-if="store.playerPokemon"
                class="moves-grid"
              >
                <button
                  v-for="(moveId, idx) in store.playerPokemon.moves"
                  :key="moveId"
                  class="move-btn"
                  :class="[`move-${getMoveType(moveId)}`, { 'disabled': store.isAnimating }]"
                  :disabled="store.isAnimating"
                  @click="store.chooseMove(idx)"
                >
                  <div class="move-info">
                    <span class="move-name">{{ getMoveDisplayName(moveId) }}</span>
                    <span class="move-type-label">{{ getMoveType(moveId).toUpperCase() }}</span>
                  </div>
                  <div class="move-sheen" />
                </button>
              </div>
            </template>
            <template v-else>
              <div class="victory-box">
                <h3 class="victory-title">
                  ¡Combate Concluido!
                </h3>
                <p class="victory-subtitle">
                  Ganador: <span class="winner-highlight">{{ store.winner }}</span>
                </p>
                <button
                  class="restart-btn animate-pulse"
                  @click="restartBattle"
                >
                  Volver a Empezar
                </button>
              </div>
            </template>
          </div>
        </div>
      </main>

      <!-- Terminal / Showdown Console -->
      <aside
        v-if="showConsole"
        class="console-panel"
      >
        <div class="console-header">
          <span class="console-title">&gt;_ CONSOLA DE SIMULACIÓN (SHOWDOWN LOG)</span>
          <button
            class="clear-console-btn"
            @click="clearLog"
          >
            Limpiar
          </button>
        </div>
        <div
          ref="consoleBody"
          class="console-body"
        >
          <div
            v-for="(log, idx) in store.battleLog"
            :key="idx"
            class="console-line"
            :class="`log-${log.type}`"
          >
            <span class="line-arrow">&gt;</span> {{ log.text }}
          </div>
          <div
            v-if="store.isAnimating"
            class="console-line active-line"
          >
            <span class="line-cursor">▒</span> Procesando acciones en Worker...
          </div>
          <div
            v-else
            class="console-line active-line"
          >
            <span class="line-cursor">▒</span> Esperando elección del jugador...
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.showdown-sandbox-container {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  width: 100%;
  background-color: #05070c;
  color: #f5f5f7;
  overflow: hidden;
  font-family: var(--font-ui, 'Nunito', sans-serif);
}

.sandbox-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: linear-gradient(180deg, Rgba(255, 255, 255, 0.05) 0%, Rgba(255, 255, 255, 0) 100%), #0f1220;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.12);
  z-index: 100;
  box-shadow: 0 4px 20px Rgba(0, 0, 0, 0.4);

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .back-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    background: Rgba(255, 255, 255, 0.08);
    border: 1px solid Rgba(255, 255, 255, 0.15);
    padding: 6px 14px;
    border-radius: 8px;
    color: #f5f5f7;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background: Rgba(255, 255, 255, 0.15);
      border-color: var(--blue, #0a84ff);
      box-shadow: 0 0 10px Rgba(10, 132, 255, 0.3);
    }

    .pixel-arrow {
      font-weight: bold;
    }
  }

  .sandbox-badge {
    font-family: var(--font-pixel);
    font-size: 9px;
    color: var(--yellow, #ffd60a);
    background: Rgba(255, 214, 10, 0.15);
    border: 1px solid Rgba(255, 214, 10, 0.3);
    padding: 4px 8px;
    border-radius: 4px;
    text-shadow: 0 0 5px Rgba(255, 214, 10, 0.2);
  }

  .console-toggle-btn {
    background: Rgba(10, 132, 255, 0.12);
    border: 1px solid Rgba(10, 132, 255, 0.3);
    padding: 6px 14px;
    border-radius: 8px;
    color: var(--blue, #0a84ff);
    font-size: 13px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.3s ease;

    &:hover {
      background: Rgba(10, 132, 255, 0.22);
      box-shadow: 0 0 12px Rgba(10, 132, 255, 0.4);
    }
  }
}

.sandbox-workspace {
  display: flex;
  flex: 1;
  width: 100%;
  overflow: hidden;
}

.battle-arena-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  position: relative;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);

  &.console-open {
    // Al abrir la consola queda espacio para la barra lateral
  }
}

.battle-scene {
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.arena-background {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, #1b1130 0%, #05060b 100%);
  z-index: 1;

  .nebula-glow {
    position: absolute;
    top: 20%;
    left: 30%;
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, Rgba(10, 132, 255, 0.15) 0%, transparent 70%);
    filter: Blur(40px);
    pointer-events: none;
    animation: float-slow 15s infinite alternate ease-in-out;
  }

  .stars-layer {
    position: absolute;
    inset: 0;
    background-image: 
      radial-gradient(circle, Rgba(255,255,255,0.15) 1px, transparent 1px),
      radial-gradient(circle, Rgba(255,255,255,0.08) 1.5px, transparent 1.5px);
    background-size: 120px 120px, 200px 200px;
    background-position: 0 0, 40px 60px;
    opacity: 0.5;
  }

  .battle-grid-3d {
    position: absolute;
    bottom: 0;
    width: 100%;
    height: 60%;
    background-image: 
      linear-gradient(Rgba(10, 132, 255, 0.08) 1px, transparent 1px),
      linear-gradient(90deg, Rgba(10, 132, 255, 0.08) 1px, transparent 1px);
    background-size: 50px 50px;
    background-position: center bottom;
    transform: perspective(260px) rotateX(60deg);
    transform-origin: bottom center;
    mask-image: linear-gradient(to top, Rgba(0, 0, 0, 1) 20%, Rgba(0, 0, 0, 0) 100%);
    pointer-events: none;
  }
}

.combatants-container {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
}

.combatant-wrapper {
  position: absolute;
  width: 240px;
  height: 240px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;

  &.enemy-wrapper {
    top: 15%;
    right: 18%;
  }

  &.player-wrapper {
    bottom: 12%;
    left: 18%;
  }
}

.platform-pad {
  position: absolute;
  bottom: 0;
  width: 180px;
  height: 60px;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, Rgba(10, 132, 255, 0.25) 0%, Rgba(10, 132, 255, 0) 70%);
  border: 2px solid Rgba(10, 132, 255, 0.3);
  box-shadow: 
    0 0 25px Rgba(10, 132, 255, 0.3),
    inset 0 0 15px Rgba(10, 132, 255, 0.2);
  transform: scaleY(0.4);
  animation: pulse-glow 3s infinite alternate ease-in-out;

  &.enemy-pad {
    width: 160px;
    height: 50px;
    background: radial-gradient(ellipse at center, Rgba(255, 69, 58, 0.25) 0%, Rgba(255, 69, 58, 0) 70%);
    border-color: Rgba(255, 69, 58, 0.3);
    box-shadow: 
      0 0 25px Rgba(255, 69, 58, 0.3),
      inset 0 0 15px Rgba(255, 69, 58, 0.2);
  }
}

.sprite-box {
  z-index: 15;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  height: 200px;
  width: 200px;
  margin-bottom: 10px;
}

.pokemon-sprite {
  max-width: 160px;
  max-height: 160px;
  object-fit: contain;
  filter: Drop-Shadow(0 10px 15px Rgba(0, 0, 0, 0.6));
  animation: float-sprite 4s infinite alternate ease-in-out;
  transform-origin: bottom center;

  &.pixelated {
    image-rendering: pixelated;
  }
}

// HUD Overlay y Cartas Flotantes
.hud-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  pointer-events: none;
}

.hud-card {
  position: absolute;
  width: 280px;
  background: Rgba(15, 18, 32, 0.75);
  backdrop-filter: Blur(12px);
  border: 1px solid Rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 
    0 15px 35px Rgba(0, 0, 0, 0.6),
    inset 0 1px 1px Rgba(255, 255, 255, 0.05);
  pointer-events: auto;

  &.enemy-hud {
    top: 12%;
    left: 10%;
    border-left: 4px solid var(--red, #ff453a);
    box-shadow: 
      0 10px 30px Rgba(0, 0, 0, 0.5),
      0 0 15px Rgba(255, 69, 58, 0.15);
  }

  &.player-hud {
    bottom: 25%;
    right: 10%;
    border-right: 4px solid var(--blue, #0a84ff);
    box-shadow: 
      0 10px 30px Rgba(0, 0, 0, 0.5),
      0 0 15px Rgba(10, 132, 255, 0.15);
  }

  .hud-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .poke-name {
    font-family: var(--font-pixel);
    font-size: 11px;
    font-weight: bold;
    color: #f5f5f7;
    letter-spacing: 0.5px;
  }

  .poke-level {
    font-family: var(--font-pixel);
    font-size: 9px;
    color: var(--gray, #86868b);
  }

  .hud-types {
    display: flex;
    gap: 6px;
    margin-bottom: 12px;
  }

  .type-tag {
    font-family: var(--font-pixel);
    font-size: 6px;
    padding: 3px 6px;
    border-radius: 4px;
    color: white;
    text-transform: uppercase;
    text-shadow: 1px 1px 0 #000;
    box-shadow: 0 2px 4px Rgba(0,0,0,0.3);
    border: 1px solid Rgba(0, 0, 0, 0.2);

    &.type-fire { background: linear-gradient(135deg, #ff453a, #ff9f0a); }
    &.type-water { background: linear-gradient(135deg, #0a84ff, #58a6ff); }
    &.type-flying { background: linear-gradient(135deg, #bf5af2, #0a84ff); }
    &.type-ground { background: linear-gradient(135deg, #e0a96d, #8b5a2b); }
  }

  .hp-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .hp-label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .hp-label {
    font-family: var(--font-pixel);
    font-size: 9px;
    color: var(--yellow, #ffd60a);
    font-weight: 900;
  }

  .hp-percent {
    font-family: var(--font-pixel);
    font-size: 7px;
    color: #f5f5f7;
  }

  .hp-bar-outer {
    height: 10px;
    width: 100%;
    background: #1a1a2e;
    border-radius: 5px;
    overflow: hidden;
    border: 1px solid Rgba(255, 255, 255, 0.1);
    box-shadow: inset 0 2px 4px Rgba(0,0,0,0.5);
  }

  .hp-bar-inner {
    height: 100%;
    background: linear-gradient(90deg, #32d74b 0%, #30d158 100%);
    border-radius: 5px;
    box-shadow: 0 0 8px Rgba(50, 215, 75, 0.6);
    transition: width 0.1s linear; // La transición principal la maneja GSAP pero dejamos este fallback suave
  }

  .hp-numbers {
    margin-top: 6px;
    text-align: right;
    font-family: var(--font-pixel);
    font-size: 8px;
    color: var(--gray, #86868b);
  }
}

// Panel de Acciones y Controles (Parte Inferior)
.action-panel {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  height: 160px;
  background: Rgba(13, 17, 23, 0.95);
  border-top: 2px solid Rgba(255, 255, 255, 0.15);
  box-shadow: 0 -10px 40px Rgba(0, 0, 0, 0.7);
  z-index: 50;

  @media (max-width: 800px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
    height: auto;
  }
}

.dialogue-box {
  padding: 24px;
  border-right: 1px solid Rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  background: Rgba(5, 5, 10, 0.5);

  .dialogue-text {
    font-family: var(--font-pixel);
    font-size: 12px;
    line-height: 1.8;
    color: #f5f5f7;
    margin: 0;
    text-shadow: 1px 1px 2px Rgba(0, 0, 0, 0.8);
  }

  @media (max-width: 800px) {
    border-right: none;
    border-bottom: 1px solid Rgba(255, 255, 255, 0.1);
    padding: 16px;
  }
}

.controls-box {
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.moves-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 12px;
  width: 100%;
  height: 100%;
}

.move-btn {
  position: relative;
  border-radius: 12px;
  border: 1px solid Rgba(255, 255, 255, 0.15);
  padding: 12px 18px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow: 0 4px 10px Rgba(0, 0, 0, 0.3);

  .move-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    z-index: 10;
  }

  .move-name {
    font-family: var(--font-pixel);
    font-size: 9px;
    font-weight: bold;
    color: #ffffff;
    text-shadow: 1px 1px 2px Rgba(0, 0, 0, 0.7);
  }

  .move-type-label {
    font-family: var(--font-pixel);
    font-size: 7px;
    color: Rgba(255, 255, 255, 0.8);
    background: Rgba(0, 0, 0, 0.3);
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid Rgba(255, 255, 255, 0.1);
  }

  .move-sheen {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, Rgba(255,255,255,0.1) 0%, Rgba(255,255,255,0) 50%, Rgba(0,0,0,0.2) 100%);
    z-index: 1;
  }

  // Estilos de tipo para los botones
  &.move-fire {
    background: linear-gradient(135deg, Rgba(255, 69, 58, 0.3) 0%, Rgba(255, 159, 10, 0.15) 100%);
    border-color: Rgba(255, 69, 58, 0.4);
    &:hover:not(.disabled) {
      border-color: var(--red, #ff453a);
      box-shadow: 0 0 15px Rgba(255, 69, 58, 0.5);
      background: linear-gradient(135deg, Rgba(255, 69, 58, 0.45) 0%, Rgba(255, 159, 10, 0.25) 100%);
    }
  }

  &.move-normal {
    background: linear-gradient(135deg, Rgba(148, 163, 184, 0.2) 0%, Rgba(71, 85, 105, 0.1) 100%);
    border-color: Rgba(148, 163, 184, 0.3);
    &:hover:not(.disabled) {
      border-color: #cbd5e1;
      box-shadow: 0 0 15px Rgba(148, 163, 184, 0.4);
      background: linear-gradient(135deg, Rgba(148, 163, 184, 0.35) 0%, Rgba(71, 85, 105, 0.2) 100%);
    }
  }

  &.move-flying {
    background: linear-gradient(135deg, Rgba(191, 90, 242, 0.25) 0%, Rgba(10, 132, 255, 0.15) 100%);
    border-color: Rgba(191, 90, 242, 0.4);
    &:hover:not(.disabled) {
      border-color: var(--purple, #bf5af2);
      box-shadow: 0 0 15px Rgba(191, 90, 242, 0.5);
      background: linear-gradient(135deg, Rgba(191, 90, 242, 0.4) 0%, Rgba(10, 132, 255, 0.25) 100%);
    }
  }

  &.move-ground {
    background: linear-gradient(135deg, Rgba(224, 169, 109, 0.25) 0%, Rgba(139, 90, 43, 0.15) 100%);
    border-color: Rgba(224, 169, 109, 0.4);
    &:hover:not(.disabled) {
      border-color: #ffd60a;
      box-shadow: 0 0 15px Rgba(224, 169, 109, 0.5);
      background: linear-gradient(135deg, Rgba(224, 169, 109, 0.4) 0%, Rgba(139, 90, 43, 0.25) 100%);
    }
  }

  &.disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
    border-color: Rgba(255, 255, 255, 0.05);
  }

  &:hover:not(.disabled) {
    transform: Translatey(-2px) Scale(1.02);
  }
}

.victory-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  text-align: center;
  background: Rgba(10, 132, 255, 0.05);
  border: 1px dashed Rgba(10, 132, 255, 0.3);
  border-radius: 12px;
  padding: 12px;

  .victory-title {
    font-family: var(--font-pixel);
    font-size: 13px;
    color: var(--green, #32d74b);
    margin: 0 0 6px 0;
    text-shadow: 0 0 10px Rgba(50, 215, 75, 0.3);
  }

  .victory-subtitle {
    font-size: 13px;
    margin: 0 0 14px 0;
    color: var(--gray, #86868b);
  }

  .winner-highlight {
    font-family: var(--font-pixel);
    font-size: 9px;
    color: var(--yellow, #ffd60a);
    background: Rgba(255, 214, 10, 0.1);
    padding: 3px 8px;
    border-radius: 4px;
    border: 1px solid Rgba(255, 214, 10, 0.2);
  }

  .restart-btn {
    font-family: var(--font-pixel);
    font-size: 9px;
    background: linear-gradient(135deg, #0a84ff 0%, #0056b3 100%);
    border: 1px solid Rgba(255, 255, 255, 0.25);
    color: white;
    padding: 10px 24px;
    border-radius: 8px;
    cursor: pointer;
    box-shadow: 0 4px 15px Rgba(10, 132, 255, 0.4);
    transition: all 0.3s ease;

    &:hover {
      background: linear-gradient(135deg, #3094ff 0%, #0a84ff 100%);
      box-shadow: 0 0 20px Rgba(10, 132, 255, 0.6);
      transform: Translatey(-2px);
    }
  }
}

// Consola de Simulación Lateral (Terminal Drawer)
.console-panel {
  width: 320px;
  height: 100%;
  background: #030509;
  border-left: 2px solid Rgba(255, 255, 255, 0.12);
  display: flex;
  flex-direction: column;
  z-index: 80;
  box-shadow: -10px 0 30px Rgba(0, 0, 0, 0.5);

  @media (max-width: 1000px) {
    width: 250px;
  }

  @media (max-width: 700px) {
    position: absolute;
    right: 0;
    top: 57px;
    bottom: 0;
    height: calc(100% - 57px);
    width: 280px;
  }
}

.console-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #0f1220;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.08);

  .console-title {
    font-family: var(--font-pixel);
    font-size: 8px;
    color: var(--blue, #0a84ff);
    letter-spacing: 0.5px;
  }

  .clear-console-btn {
    background: transparent;
    border: 1px solid Rgba(255, 255, 255, 0.2);
    color: var(--gray, #86868b);
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      border-color: var(--red, #ff453a);
      color: var(--red, #ff453a);
    }
  }
}

.console-body {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #a3b3c9;
  display: flex;
  flex-direction: column;
  gap: 8px;
  scroll-behavior: smooth;

  /* Custom scrollbar for console */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: Rgba(0,0,0,0.2);
  }
  &::-webkit-scrollbar-thumb {
    background: Rgba(255,255,255,0.1);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: Rgba(255,255,255,0.2);
  }
}

.console-line {
  word-break: break-word;
  white-space: pre-wrap;
  border-bottom: 1px dashed Rgba(255, 255, 255, 0.03);
  padding-bottom: 6px;

  &.log-start { color: #f5f5f7; font-weight: bold; }
  &.log-move { color: #ffffff; }
  &.log-damage { color: #ff5e5e; }
  &.log-heal { color: #6ee7b7; }
  &.log-faint { color: #ef4444; font-weight: bold; }
  &.log-supereffective { color: #fbbf24; font-weight: bold; }
  &.log-resisted { color: #9ca3af; }
  &.log-crit { color: #f97316; font-weight: bold; text-shadow: 0 0 5px Rgba(249, 115, 22, 0.4); }
  &.log-ability { color: #60a5fa; font-weight: bold; }
  &.log-status { color: #c084fc; }
  &.log-weather { color: #38bdf8; }
  &.log-miss { color: #9ca3af; font-style: italic; }
  &.log-info { color: #d1d5db; }

  .line-arrow {
    color: var(--blue, #0a84ff);
    font-weight: bold;
  }
}

.active-line {
  color: var(--green, #32d74b);
  display: flex;
  align-items: center;
  gap: 4px;

  .line-cursor {
    animation: blink 1s step-end infinite;
  }
}

// Animaciones Clave
@keyframes float-slow {
  0% { transform: Translatey(0) Scale(1); }
  100% { transform: Translatey(-20px) Scale(1.05); }
}

@keyframes float-sprite {
  0% { transform: Translatey(0); }
  100% { transform: Translatey(-8px); }
}

@keyframes pulse-glow {
  0% { opacity: 0.7; transform: scaleY(0.4) Scale(0.95); }
  100% { opacity: 1; transform: scaleY(0.4) Scale(1.05); }
}

@keyframes blink {
  50% { opacity: 0; }
}

.animate-pulse {
  animation: pulse-border 2s infinite ease-in-out;
}

@keyframes pulse-border {
  0%, 100% { box-shadow: 0 4px 15px Rgba(10, 132, 255, 0.4); }
  50% { box-shadow: 0 0 25px Rgba(10, 132, 255, 0.7); }
}

/* --- Setup UI Styles --- */
.setup-overlay {
  position: absolute;
  inset: 0;
  z-index: 1000;
  background: Rgba(5, 7, 12, 0.9);
  backdrop-filter: Blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.setup-panel {
  background: Rgba(15, 18, 32, 0.95);
  border: 1px solid Rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 20px 50px Rgba(0, 0, 0, 0.8), inset 0 1px 1px Rgba(255, 255, 255, 0.1);
  width: 90%;
  max-width: 900px;
  display: flex;
  flex-direction: column;
  gap: 24px;

  .setup-title {
    font-family: var(--font-pixel);
    font-size: 16px;
    color: var(--yellow, #ffd60a);
    text-align: center;
    margin: 0;
    text-shadow: 2px 2px 0 Rgba(0, 0, 0, 0.8);
  }
}

.teams-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.team-setup {
  background: Rgba(0, 0, 0, 0.3);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  h3 {
    font-family: var(--font-pixel);
    font-size: 12px;
    margin: 0;
    color: #f5f5f7;
    text-align: center;
    padding-bottom: 8px;
    border-bottom: 1px solid Rgba(255, 255, 255, 0.1);
  }

  &.player-setup {
    border-top: 3px solid var(--blue, #0a84ff);
  }
  &.enemy-setup {
    border-top: 3px solid var(--red, #ff453a);
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-family: var(--font-pixel);
    font-size: 8px;
    color: var(--gray, #86868b);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.pixel-select {
  background: Rgba(255, 255, 255, 0.05);
  border: 1px solid Rgba(255, 255, 255, 0.15);
  color: #fff;
  font-family: var(--font-ui, 'Nunito', sans-serif);
  font-size: 14px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;

  &:hover, &:focus {
    background: Rgba(255, 255, 255, 0.1);
    border-color: var(--blue, #0a84ff);
    box-shadow: 0 0 10px Rgba(10, 132, 255, 0.2);
  }

  option {
    background: #0f1220;
    color: #fff;
  }
}

.setup-actions {
  display: flex;
  justify-content: center;
  margin-top: 16px;

  .start-btn {
    background: linear-gradient(135deg, var(--green, #32d74b) 0%, #28a745 100%);
    border: none;
    color: white;
    font-family: var(--font-pixel);
    font-size: 14px;
    padding: 16px 32px;
    border-radius: 12px;
    cursor: pointer;
    box-shadow: 0 4px 15px Rgba(50, 215, 75, 0.4);
    transition: all 0.3s ease;
    text-shadow: 1px 1px 2px Rgba(0,0,0,0.5);

    &:hover {
      transform: Translatey(-2px);
      box-shadow: 0 6px 20px Rgba(50, 215, 75, 0.6);
    }
  }
}
</style>
