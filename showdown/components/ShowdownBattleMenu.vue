<script setup lang="ts">
import { ref, watch } from 'vue';
import { useShowdownSandboxStore } from '../useShowdownSandboxStore';
import ShowdownMoveTooltip from './ShowdownMoveTooltip.vue';
import showdownDB from '../sandbox_db/data/showdown_db_es.json';
import type { ShowdownLocalDB } from '../sandbox_db/cloner/extract_logic';
import moveTranslations from '../sandbox_db/data/move_translations.json';

const store = useShowdownSandboxStore();
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

const restartBattle = () => {
  store.isSetupMode = true;
  currentMenu.value = 'root';
};

// Abre por defecto el panel de ataques o cambios cuando la UI cambie
const selectMenu = (menu: 'root' | 'moves' | 'switch') => {
  if (store.isAnimating || store.gameOver) return;
  currentMenu.value = menu;
};

const getMoveDisplayName = (moveId: string) => {
  const cleanId = moveId.toLowerCase().replace(/[^a-z0-9]/g, '');
  return (moveTranslations as Record<string, string>)[cleanId] || typedDB.moves[cleanId]?.name || moveId;
};

const getMoveType = (moveId: string) => {
  const move = typedDB.moves[moveId];
  return move ? move.type.toLowerCase() : 'normal';
};

const getMovePPInfo = (moveId: string) => {
  if (!store.playerPokemon) return '';
  const cleanId = moveId.toLowerCase().replace(/[^a-z0-9]/g, '');
  const slot = store.playerPokemon.moveSlots?.find(
    s => s.id.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanId
  );
  if (slot) {
    return `${slot.pp}/${slot.maxpp}`;
  }
  const moveData = typedDB.moves[cleanId];
  return moveData ? `${moveData.pp}/${moveData.pp}` : '';
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
              <div class="move-meta">
                <span class="move-pp" v-if="getMovePPInfo(moveId)">{{ getMovePPInfo(moveId) }}</span>
                <span class="move-type-label">{{ getMoveType(moveId).toUpperCase() }}</span>
              </div>
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
</template>

<style scoped lang="scss">
.controls-box {
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 100%;
  height: 100%;
}

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

  .move-meta {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .move-pp {
    font-family: var(--font-pixel);
    font-size: 6px;
    color: var(--yellow, #ffd60a);
    background: rgba(0, 0, 0, 0.4);
    padding: 2px 4px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.05);
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

  &.move-normal {
    background: linear-gradient(135deg, Rgba(168, 168, 120, 0.25) 0%, Rgba(138, 138, 92, 0.12) 100%);
    border-color: Rgba(168, 168, 120, 0.4);
    &:hover:not(.disabled) {
      border-color: #A8A878;
      box-shadow: 0 0 15px Rgba(168, 168, 120, 0.5);
    }
  }

  &.move-fuego, &.move-fire {
    background: linear-gradient(135deg, Rgba(240, 128, 48, 0.25) 0%, Rgba(196, 97, 27, 0.12) 100%);
    border-color: Rgba(240, 128, 48, 0.4);
    &:hover:not(.disabled) {
      border-color: #F08030;
      box-shadow: 0 0 15px Rgba(240, 128, 48, 0.5);
    }
  }

  &.move-agua, &.move-water {
    background: linear-gradient(135deg, Rgba(104, 144, 240, 0.25) 0%, Rgba(62, 105, 201, 0.12) 100%);
    border-color: Rgba(104, 144, 240, 0.4);
    &:hover:not(.disabled) {
      border-color: #6890F0;
      box-shadow: 0 0 15px Rgba(104, 144, 240, 0.5);
    }
  }

  &.move-planta, &.move-grass {
    background: linear-gradient(135deg, Rgba(120, 200, 80, 0.25) 0%, Rgba(78, 154, 45, 0.12) 100%);
    border-color: Rgba(120, 200, 80, 0.4);
    &:hover:not(.disabled) {
      border-color: #78C850;
      box-shadow: 0 0 15px Rgba(120, 200, 80, 0.5);
    }
  }

  &.move-eléctrico, &.move-electrico, &.move-electric {
    background: linear-gradient(135deg, Rgba(248, 208, 48, 0.25) 0%, Rgba(201, 163, 24, 0.12) 100%);
    border-color: Rgba(248, 208, 48, 0.4);
    &:hover:not(.disabled) {
      border-color: #F8D030;
      box-shadow: 0 0 15px Rgba(248, 208, 48, 0.5);
    }
  }

  &.move-hielo, &.move-ice {
    background: linear-gradient(135deg, Rgba(152, 216, 216, 0.25) 0%, Rgba(96, 165, 165, 0.12) 100%);
    border-color: Rgba(152, 216, 216, 0.4);
    &:hover:not(.disabled) {
      border-color: #98D8D8;
      box-shadow: 0 0 15px Rgba(152, 216, 216, 0.5);
    }
  }

  &.move-lucha, &.move-fighting {
    background: linear-gradient(135deg, Rgba(192, 48, 40, 0.25) 0%, Rgba(140, 28, 23, 0.12) 100%);
    border-color: Rgba(192, 48, 40, 0.4);
    &:hover:not(.disabled) {
      border-color: #C03028;
      box-shadow: 0 0 15px Rgba(192, 48, 40, 0.5);
    }
  }

  &.move-veneno, &.move-poison {
    background: linear-gradient(135deg, Rgba(160, 64, 160, 0.25) 0%, Rgba(115, 40, 115, 0.12) 100%);
    border-color: Rgba(160, 64, 160, 0.4);
    &:hover:not(.disabled) {
      border-color: #A040A0;
      box-shadow: 0 0 15px Rgba(160, 64, 160, 0.5);
    }
  }

  &.move-tierra, &.move-ground {
    background: linear-gradient(135deg, Rgba(224, 192, 104, 0.25) 0%, Rgba(176, 148, 67, 0.12) 100%);
    border-color: Rgba(224, 192, 104, 0.4);
    &:hover:not(.disabled) {
      border-color: #E0C068;
      box-shadow: 0 0 15px Rgba(224, 192, 104, 0.5);
    }
  }

  &.move-volador, &.move-flying {
    background: linear-gradient(135deg, Rgba(168, 144, 240, 0.25) 0%, Rgba(122, 94, 201, 0.12) 100%);
    border-color: Rgba(168, 144, 240, 0.4);
    &:hover:not(.disabled) {
      border-color: #A890F0;
      box-shadow: 0 0 15px Rgba(168, 144, 240, 0.5);
    }
  }

  &.move-psíquico, &.move-psiquico, &.move-psychic {
    background: linear-gradient(135deg, Rgba(248, 88, 136, 0.25) 0%, Rgba(196, 48, 93, 0.12) 100%);
    border-color: Rgba(248, 88, 136, 0.4);
    &:hover:not(.disabled) {
      border-color: #F85888;
      box-shadow: 0 0 15px Rgba(248, 88, 136, 0.5);
    }
  }

  &.move-bicho, &.move-bug {
    background: linear-gradient(135deg, Rgba(168, 184, 32, 0.25) 0%, Rgba(122, 133, 18, 0.12) 100%);
    border-color: Rgba(168, 184, 32, 0.4);
    &:hover:not(.disabled) {
      border-color: #A8B820;
      box-shadow: 0 0 15px Rgba(168, 184, 32, 0.5);
    }
  }

  &.move-roca, &.move-rock {
    background: linear-gradient(135deg, Rgba(184, 160, 56, 0.25) 0%, Rgba(138, 117, 32, 0.12) 100%);
    border-color: Rgba(184, 160, 56, 0.4);
    &:hover:not(.disabled) {
      border-color: #B8A038;
      box-shadow: 0 0 15px Rgba(184, 160, 56, 0.5);
    }
  }

  &.move-fantasma, &.move-ghost {
    background: linear-gradient(135deg, Rgba(112, 88, 152, 0.25) 0%, Rgba(77, 57, 107, 0.12) 100%);
    border-color: Rgba(112, 88, 152, 0.4);
    &:hover:not(.disabled) {
      border-color: #705898;
      box-shadow: 0 0 15px Rgba(112, 88, 152, 0.5);
    }
  }

  &.move-dragón, &.move-dragon {
    background: linear-gradient(135deg, Rgba(112, 56, 248, 0.25) 0%, Rgba(71, 25, 194, 0.12) 100%);
    border-color: Rgba(112, 56, 248, 0.4);
    &:hover:not(.disabled) {
      border-color: #7038F8;
      box-shadow: 0 0 15px Rgba(112, 56, 248, 0.5);
    }
  }

  &.move-siniestro, &.move-dark {
    background: linear-gradient(135deg, Rgba(112, 88, 72, 0.25) 0%, Rgba(77, 58, 47, 0.12) 100%);
    border-color: Rgba(112, 88, 72, 0.4);
    &:hover:not(.disabled) {
      border-color: #705848;
      box-shadow: 0 0 15px Rgba(112, 88, 72, 0.5);
    }
  }

  &.move-acero, &.move-steel {
    background: linear-gradient(135deg, Rgba(184, 184, 208, 0.25) 0%, Rgba(138, 138, 163, 0.12) 100%);
    border-color: Rgba(184, 184, 208, 0.4);
    &:hover:not(.disabled) {
      border-color: #B8B8D0;
      box-shadow: 0 0 15px Rgba(184, 184, 208, 0.5);
    }
  }

  &.move-hada, &.move-fairy {
    background: linear-gradient(135deg, Rgba(238, 153, 172, 0.25) 0%, Rgba(194, 99, 119, 0.12) 100%);
    border-color: Rgba(238, 153, 172, 0.4);
    &:hover:not(.disabled) {
      border-color: #EE99AC;
      box-shadow: 0 0 15px Rgba(238, 153, 172, 0.5);
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
