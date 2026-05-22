<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { useShowdownSandboxStore } from './useShowdownSandboxStore';
import { useRouter } from 'vue-router';
import ShowdownTeambuilder from './components/ShowdownTeambuilder.vue';
import ShowdownHudCard from './components/ShowdownHudCard.vue';
import showdownDB from './sandbox_db/data/showdown_db.json';
import type { ShowdownLocalDB } from './sandbox_db/cloner/extract_logic';
import ShowdownMoveTooltip from './components/ShowdownMoveTooltip.vue';
import moveTranslations from './sandbox_db/data/move_translations.json';

// [PureVue-Ignore] - Ignorar accesos directos del visual en este test de integración
const store = useShowdownSandboxStore();
const router = useRouter();

const showConsole = ref(true);
const consoleBody = ref<HTMLElement | null>(null);
const typedDB = showdownDB as unknown as ShowdownLocalDB;

// Estado de control para el menú de dos niveles
const currentMenu = ref<'root' | 'moves' | 'switch'>('root');

const activeTooltipMoveId = ref<string | null>(null);

const handleMoveMouseEnter = (moveId: string) => {
  if (window.matchMedia('(hover: hover)').matches) {
    activeTooltipMoveId.value = moveId;
  }
};

const handleMoveMouseLeave = () => {
  if (window.matchMedia('(hover: hover)').matches) {
    activeTooltipMoveId.value = null;
  }
};

const handleMoveClick = (moveId: string, idx: number) => {
  if (store.isAnimating || store.gameOver) return;

  const supportsHover = window.matchMedia('(hover: hover)').matches;

  if (supportsHover) {
    store.chooseMove(idx);
    activeTooltipMoveId.value = null;
  } else {
    if (activeTooltipMoveId.value === moveId) {
      store.chooseMove(idx);
      activeTooltipMoveId.value = null;
    } else {
      activeTooltipMoveId.value = moveId;
    }
  }
};

watch(currentMenu, () => {
  activeTooltipMoveId.value = null;
});

const goBack = () => {
  router.push('/');
};

const restartBattle = () => {
  store.isSetupMode = true;
  currentMenu.value = 'root';
};

const toggleConsole = () => {
  showConsole.value = !showConsole.value;
};

const clearLog = () => {
  store.battleLog = [];
};

// Abre por defecto el panel de ataques o cambios cuando la UI cambie
const selectMenu = (menu: 'root' | 'moves' | 'switch') => {
  if (store.isAnimating || store.gameOver) return;
  currentMenu.value = menu;
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
  const cleanId = moveId.toLowerCase().replace(/[^a-z0-9]/g, '');
  return (moveTranslations as Record<string, string>)[cleanId] || typedDB.moves[cleanId]?.name || moveId;
};

const getMoveType = (moveId: string) => {
  const move = typedDB.moves[moveId];
  return move ? move.type.toLowerCase() : 'normal';
};

const handleSwitchSelection = (targetIndex: number) => {
  if (store.isAnimating || store.gameOver) return;
  
  // Realizar el cambio llamando a la acción de Pinia
  store.chooseSwitch(targetIndex);
  
  // Si no estamos en relevo forzado por debilitamiento, volver al menú principal
  if (!store.forcedSwitchRequired) {
    currentMenu.value = 'root';
  }
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
        <span class="sandbox-badge">BATTLE ENGINE SHOWDOWN v6vs6</span>
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
      <!-- Setup Overlay (Extracted component) -->
      <ShowdownTeambuilder v-if="store.isSetupMode" />

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
            <!-- Enemy Platform & Sprite -->
            <div
              v-if="store.enemyPokemon"
              class="combatant-wrapper enemy-wrapper"
            >
              <div class="platform-pad enemy-pad" />
              <div class="sprite-box">
                <img 
                  id="enemy-sprite"
                  :src="store.enemyPokemon.spriteUrl" 
                  :alt="store.enemyPokemon.name"
                  class="pokemon-sprite pixelated"
                >
              </div>
            </div>

            <!-- Player Platform & Sprite -->
            <div
              v-if="store.playerPokemon"
              class="combatant-wrapper player-wrapper"
            >
              <div class="platform-pad player-pad" />
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

          <!-- Floating Info Cards HUD (Extracted components) -->
          <div class="hud-overlay">
            <!-- Enemy HUD Card -->
            <ShowdownHudCard
              :pokemon="store.enemyPokemon"
              :hp="store.enemyHP"
              :max-hp="store.enemyMaxHP"
              :team="store.enemyTeam"
              :is-player="false"
            />

            <!-- Player HUD Card -->
            <ShowdownHudCard
              :pokemon="store.playerPokemon"
              :hp="store.playerHP"
              :max-hp="store.playerMaxHP"
              :team="store.playerTeam"
              :is-player="true"
            />
          </div>
        </div>

        <!-- Lower HUD: Dialogue & Actions -->
        <div class="action-panel">
          <div class="dialogue-box">
            <p class="dialogue-text">
              {{ store.currentMessage }}
            </p>
          </div>

          <!-- Move / Switch Control Selector -->
          <div class="controls-box">
            <template v-if="!store.gameOver">
              <!-- Menu Principal (Root) -->
              <div
                v-if="currentMenu === 'root'"
                class="root-menu-grid"
              >
                <button
                  class="menu-btn btn-luchar"
                  :disabled="store.isAnimating"
                  @click="selectMenu('moves')"
                >
                  ⚔️ LUCHAR
                </button>
                <button
                  class="menu-btn btn-relevo"
                  :disabled="store.isAnimating"
                  @click="selectMenu('switch')"
                >
                  🔁 CAMBIAR
                </button>
              </div>

              <!-- Submenú de Ataques (Moves) -->
              <div
                v-else-if="currentMenu === 'moves' && store.playerPokemon"
                class="moves-layout-wrapper"
              >
                <!-- Tooltip matemático premium -->
                <ShowdownMoveTooltip
                  :move-id="activeTooltipMoveId || ''"
                  :attacker="store.playerPokemon"
                  :defender="store.enemyPokemon"
                  :visible="!!activeTooltipMoveId"
                />

                <div class="moves-grid">
                  <button
                    v-for="(moveId, idx) in store.playerPokemon.moves"
                    :key="moveId"
                    class="move-btn"
                    :class="[`move-${getMoveType(moveId)}`, { 'disabled': store.isAnimating, 'active-tooltip': activeTooltipMoveId === moveId }]"
                    :disabled="store.isAnimating"
                    @click="handleMoveClick(moveId, idx)"
                    @mouseenter="handleMoveMouseEnter(moveId)"
                    @mouseleave="handleMoveMouseLeave()"
                  >
                    <div class="move-info">
                      <span class="move-name">{{ getMoveDisplayName(moveId) }}</span>
                      <span class="move-type-label">{{ getMoveType(moveId).toUpperCase() }}</span>
                    </div>
                    <div class="move-sheen" />
                  </button>
                </div>
                <button
                  class="back-control-btn"
                  @click="selectMenu('root')"
                >
                  ◀ VOLVER
                </button>
              </div>

              <!-- Submenú de Relevo (Switch) -->
              <div
                v-else-if="currentMenu === 'switch'"
                class="switch-layout-wrapper"
              >
                <div class="switch-grid">
                  <button
                    v-for="(poke, idx) in store.playerTeam"
                    :key="poke.id"
                    class="switch-poke-btn"
                    :class="{ 
                      'active-combatant': idx === store.activePlayerIndex,
                      'fainted-combatant': poke.hp === 0 || poke.status === 'fnt',
                      'disabled': idx === store.activePlayerIndex || poke.hp === 0 || poke.status === 'fnt' || store.isAnimating
                    }"
                    :disabled="idx === store.activePlayerIndex || poke.hp === 0 || poke.status === 'fnt' || store.isAnimating"
                    @click="handleSwitchSelection(idx)"
                  >
                    <img
                      :src="poke.spriteUrl"
                      class="switch-poke-icon pixelated"
                      :alt="poke.name"
                    >
                    <div class="switch-poke-info">
                      <span class="switch-poke-name">{{ poke.name }}</span>
                      <span class="switch-poke-hp">{{ poke.hp }} / {{ poke.maxHp || 100 }} PS</span>
                    </div>
                  </button>
                </div>
                <button
                  v-if="!store.forcedSwitchRequired"
                  class="back-control-btn"
                  @click="selectMenu('root')"
                >
                  ◀ VOLVER
                </button>
              </div>
            </template>

            <!-- Fin del Combate (Victory Box) -->
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
                  Volver al Setup
                </button>
              </div>
            </template>
          </div>
        </div>

        <!-- Forced Switch Screen Overlay (Modal de Relevo Obligatorio) -->
        <div
          v-if="store.forcedSwitchRequired && !store.gameOver"
          class="forced-switch-overlay"
        >
          <div class="forced-switch-panel">
            <h2 class="forced-title">
              ☠️ ¡Tu Pokémon se debilitó!
            </h2>
            <p class="forced-subtitle">
              Elige un relevo obligatorio de tu equipo para continuar:
            </p>
            
            <div class="forced-grid">
              <button
                v-for="(poke, idx) in store.playerTeam"
                :key="poke.id"
                class="forced-poke-btn"
                :class="{ 
                  'fainted-combatant': poke.hp === 0 || poke.status === 'fnt',
                  'disabled': poke.hp === 0 || poke.status === 'fnt' || store.isAnimating
                }"
                :disabled="poke.hp === 0 || poke.status === 'fnt' || store.isAnimating"
                @click="handleSwitchSelection(idx)"
              >
                <img
                  :src="poke.spriteUrl"
                  class="forced-poke-icon pixelated"
                  :alt="poke.name"
                >
                <div class="forced-poke-info">
                  <span class="forced-poke-name">{{ poke.name }}</span>
                  <span class="forced-poke-hp">{{ poke.hp }} PS / {{ poke.maxHp || 100 }} PS</span>
                </div>
              </button>
            </div>
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

.hud-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  pointer-events: none;
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
  position: relative;
}

// Menu principal de 2 botones
.root-menu-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  width: 100%;
  height: 100%;
  padding: 10px;
}

.menu-btn {
  font-family: var(--font-pixel);
  font-size: 12px;
  border-radius: 12px;
  border: 1px solid Rgba(255, 255, 255, 0.15);
  cursor: pointer;
  color: white;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow: 0 4px 12px Rgba(0, 0, 0, 0.4);

  &.btn-luchar {
    background: linear-gradient(135deg, Rgba(255, 69, 58, 0.35) 0%, Rgba(255, 159, 10, 0.15) 100%);
    border-color: Rgba(255, 69, 58, 0.4);
    &:hover:not(:disabled) {
      border-color: var(--red, #ff453a);
      box-shadow: 0 0 15px Rgba(255, 69, 58, 0.6);
      background: linear-gradient(135deg, Rgba(255, 69, 58, 0.5) 0%, Rgba(255, 159, 10, 0.25) 100%);
    }
  }

  &.btn-relevo {
    background: linear-gradient(135deg, Rgba(10, 132, 255, 0.35) 0%, Rgba(88, 166, 255, 0.15) 100%);
    border-color: Rgba(10, 132, 255, 0.4);
    &:hover:not(:disabled) {
      border-color: var(--blue, #0a84ff);
      box-shadow: 0 0 15px Rgba(10, 132, 255, 0.6);
      background: linear-gradient(135deg, Rgba(10, 132, 255, 0.5) 0%, Rgba(88, 166, 255, 0.25) 100%);
    }
  }

  &:hover:not(:disabled) {
    transform: Translatey(-2px);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

// Layout de movimientos y relevos con boton de volver
.moves-layout-wrapper, .switch-layout-wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  height: 100%;
}

.moves-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 10px;
  flex: 1;
}

.move-btn {
  position: relative;
  border-radius: 12px;
  border: 1px solid Rgba(255, 255, 255, 0.15);
  padding: 8px 14px;
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
    font-size: 8px;
    font-weight: bold;
    color: #ffffff;
    text-shadow: 1px 1px 2px Rgba(0, 0, 0, 0.7);
  }

  .move-type-label {
    font-family: var(--font-pixel);
    font-size: 6px;
    color: Rgba(255, 255, 255, 0.8);
    background: Rgba(0, 0, 0, 0.3);
    padding: 2px 4px;
    border-radius: 4px;
    border: 1px solid Rgba(255, 255, 255, 0.1);
  }

  .move-sheen {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, Rgba(255,255,255,0.1) 0%, Rgba(255,255,255,0) 50%, Rgba(0,0,0,0.2) 100%);
    z-index: 1;
  }

  &.move-fire {
    background: linear-gradient(135deg, Rgba(255, 69, 58, 0.3) 0%, Rgba(255, 159, 10, 0.15) 100%);
    border-color: Rgba(255, 69, 58, 0.4);
    &:hover:not(.disabled) {
      border-color: var(--red, #ff453a);
      box-shadow: 0 0 15px Rgba(255, 69, 58, 0.5);
    }
  }

  &.move-normal {
    background: linear-gradient(135deg, Rgba(148, 163, 184, 0.2) 0%, Rgba(71, 85, 105, 0.1) 100%);
    border-color: Rgba(148, 163, 184, 0.3);
    &:hover:not(.disabled) {
      border-color: #cbd5e1;
      box-shadow: 0 0 15px Rgba(148, 163, 184, 0.4);
    }
  }

  &.move-flying {
    background: linear-gradient(135deg, Rgba(191, 90, 242, 0.25) 0%, Rgba(10, 132, 255, 0.15) 100%);
    border-color: Rgba(191, 90, 242, 0.4);
    &:hover:not(.disabled) {
      border-color: var(--purple, #bf5af2);
      box-shadow: 0 0 15px Rgba(191, 90, 242, 0.5);
    }
  }

  &.move-ground {
    background: linear-gradient(135deg, Rgba(224, 169, 109, 0.25) 0%, Rgba(139, 90, 43, 0.15) 100%);
    border-color: Rgba(224, 169, 109, 0.4);
    &:hover:not(.disabled) {
      border-color: #ffd60a;
      box-shadow: 0 0 15px Rgba(224, 169, 109, 0.5);
    }
  }

  &.disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
    border-color: Rgba(255, 255, 255, 0.05);
  }

  &.active-tooltip {
    border-color: #ffffff !important;
    box-shadow: 0 0 15px Rgba(255, 255, 255, 0.4) !important;
    transform: Translatey(-2px);
  }

  &:hover:not(.disabled) {
    transform: Translatey(-2px);
  }
}

.back-control-btn {
  font-family: var(--font-pixel);
  font-size: 8px;
  background: Rgba(255,255,255,0.06);
  border: 1px solid Rgba(255,255,255,0.15);
  color: var(--gray, #86868b);
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  width: fit-content;
  align-self: center;

  &:hover {
    color: white;
    background: Rgba(255,255,255,0.15);
    border-color: white;
  }
}

// Selector de relevo (Switch Banca)
.switch-grid {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px;
  flex: 1;

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: Rgba(255, 255, 255, 0.1);
    border-radius: 2px;
  }
}

.switch-poke-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 6px 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 140px;

  .switch-poke-icon {
    width: 32px;
    height: 32px;
    object-fit: contain;
  }

  .switch-poke-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .switch-poke-name {
    font-family: var(--font-pixel);
    font-size: 7px;
    color: white;
    text-align: left;
  }

  .switch-poke-hp {
    font-family: var(--font-ui, 'Nunito', sans-serif);
    font-size: 9px;
    color: var(--gray, #86868b);
  }

  &:hover:not(.disabled) {
    background: Rgba(10, 132, 255, 0.1);
    border-color: var(--blue, #0a84ff);
    transform: Translatey(-2px);
  }

  &.active-combatant {
    border-color: var(--green, #32d74b);
    background: Rgba(50, 215, 75, 0.05);
    cursor: not-allowed;
  }

  &.fainted-combatant {
    border-color: var(--red, #ff453a);
    background: Rgba(255, 69, 58, 0.05);
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.disabled {
    cursor: not-allowed;
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

/* --- Forced Switch Overlay (Modal Relevo Obligatorio) --- */
.forced-switch-overlay {
  position: absolute;
  inset: 0;
  background: Rgba(5, 7, 12, 0.85);
  backdrop-filter: Blur(8px);
  z-index: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.forced-switch-panel {
  background: Rgba(15, 18, 32, 0.95);
  border: 2px solid Rgba(255, 69, 58, 0.3);
  box-shadow: 0 20px 50px Rgba(0, 0, 0, 0.8), 0 0 30px Rgba(255, 69, 58, 0.15);
  border-radius: 16px;
  padding: 24px;
  max-width: 500px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;

  .forced-title {
    font-family: var(--font-pixel);
    font-size: 14px;
    color: var(--red, #ff453a);
    text-align: center;
    margin: 0;
    text-shadow: 0 0 10px Rgba(255, 69, 58, 0.3);
  }

  .forced-subtitle {
    font-family: var(--font-ui, 'Nunito', sans-serif);
    font-size: 13px;
    color: #aeaea2;
    text-align: center;
    margin: 0;
  }
}

.forced-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 8px;
}

.forced-poke-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  background: Rgba(255, 255, 255, 0.04);
  border: 1px solid Rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.3s ease;

  .forced-poke-icon {
    width: 32px;
    height: 32px;
    object-fit: contain;
  }

  .forced-poke-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .forced-poke-name {
    font-family: var(--font-pixel);
    font-size: 7px;
    color: white;
  }

  .forced-poke-hp {
    font-family: var(--font-ui, 'Nunito', sans-serif);
    font-size: 10px;
    color: var(--gray, #86868b);
  }

  &:hover:not(.disabled) {
    background: Rgba(10, 132, 255, 0.1);
    border-color: var(--blue, #0a84ff);
    transform: Translatey(-2px);
  }

  &.fainted-combatant {
    border-color: var(--red, #ff453a);
    background: Rgba(255, 69, 58, 0.05);
    opacity: 0.4;
    cursor: not-allowed;
  }

  &.disabled {
    cursor: not-allowed;
  }
}

/* --- Terminal Styles --- */
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
  &.log-switch { color: #60a5fa; font-weight: bold; }

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

.pixelated {
  image-rendering: pixelated;
}
</style>
