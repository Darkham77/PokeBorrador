<script setup>
import { computed } from 'vue';
import { useGameStore } from '@/stores/game';
import { useUIStore } from '@/stores/ui';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useEvolutionStore } from '@/stores/evolution';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { STONE_EVOLUTIONS } from '@/data/evolutionData';
import { SHOP_ITEMS } from '@/data/items';

const gameStore = useGameStore();
const uiStore = useUIStore();
const inventoryStore = useInventoryStore();
const evolutionStore = useEvolutionStore();

const pokemon = computed(() => {
  if (inventoryStore.isItemTargetModalOpen && inventoryStore.activeItemToUse) {
    // In this context, the stone picker is opened FOR a specific item.
    // But the legacy showStonePicker was opened for a team index.
    // Modern inventoryStore uses a target modal.
  }
  return uiStore.selectedPokemon;
});

const stoneName = computed(() => inventoryStore.activeItemToUse);

const options = computed(() => {
  if (!pokemon.value) return [];
  
  const p = pokemon.value;
  if (p.id === 'eevee') {
    return [
      { stone: 'Piedra Agua',   to: 'vaporeon' },
      { stone: 'Piedra Trueno', to: 'jolteon' },
      { stone: 'Piedra Fuego',  to: 'flareon' },
    ];
  }
  
  const evo = STONE_EVOLUTIONS[p.id];
  return evo ? [evo] : [];
});

const close = () => {
  inventoryStore.closeItemTargetModal();
};

const useStone = (stoneName, toId) => {
  const qty = gameStore.state.inventory[stoneName] || 0;
  if (qty <= 0) return;

  // Consume item
  gameStore.state.inventory[stoneName]--;
  if (gameStore.state.inventory[stoneName] <= 0) {
    delete gameStore.state.inventory[stoneName];
  }

  close();
  // Start evolution scene
  evolutionStore.startEvolution(pokemon.value, toId);
  gameStore.save(false);
};

const getStoneInfo = (name) => {
  return SHOP_ITEMS.find(i => i.name === name) || { icon: '💎', sprite: '' };
};

const getPokemonName = (id) => {
  return pokemonDataProvider.getPokemonData(id)?.name || id;
};
</script>

<template>
  <Teleport to="body">
    <div 
      v-if="inventoryStore.isItemTargetModalOpen && options.length > 0"
      class="stone-picker-overlay"
      @click.self="close"
    >
      <div class="stone-modal">
        <header class="modal-header">
          <h3 class="press-start yellow-text">
            💎 EVOLUCIONAR CON PIEDRA
          </h3>
          <p>¿Qué piedra usás en <span class="white-text">{{ pokemon.name }}</span>?</p>
        </header>

        <div class="options-list">
          <div 
            v-for="opt in options" 
            :key="opt.stone"
            class="stone-option"
            :class="{ disabled: (gameStore.state.inventory[opt.stone] || 0) <= 0 }"
          >
            <div class="stone-icon-wrapper">
              <img 
                v-if="getStoneInfo(opt.stone).sprite" 
                :src="getStoneInfo(opt.stone).sprite" 
                class="stone-sprite"
              >
              <span
                v-else
                class="fallback-icon"
              >{{ getStoneInfo(opt.stone).icon }}</span>
            </div>

            <div class="stone-details">
              <div class="stone-name">
                {{ opt.stone }}
              </div>
              <div class="evo-target">
                → {{ getPokemonName(opt.to) }} &nbsp;·&nbsp; x{{ gameStore.state.inventory[opt.stone] || 0 }}
              </div>
            </div>

            <button 
              class="use-btn press-start"
              :disabled="(gameStore.state.inventory[opt.stone] || 0) <= 0"
              @click="useStone(opt.stone, opt.to)"
            >
              USAR
            </button>
          </div>
        </div>

        <button
          class="cancel-btn"
          @click="close"
        >
          Cancelar
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.stone-picker-overlay {
  position: fixed;
  inset: 0;
  z-index: 9500;
  background: rgba(0, 0, 0, 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease;
}

.stone-modal {
  background: #1e293b;
  border-radius: 20px;
  padding: 24px;
  width: 100%;
  max-width: 360px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header {
  margin-bottom: 24px;
  h3 { font-size: 9px; margin-bottom: 12px; }
  p { font-size: 13px; color: #94a3b8; }
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.stone-option {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 16px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s;

  &.disabled {
    opacity: 0.4;
    grayscale: 1;
  }

  .stone-icon-wrapper {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    .stone-sprite { width: 32px; height: 32px; image-rendering: pixelated; }
    .fallback-icon { font-size: 24px; }
  }

  .stone-details {
    flex: 1;
    min-width: 0;
    .stone-name { font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 4px; }
    .evo-target { font-size: 11px; color: #64748b; }
  }

  .use-btn {
    background: rgba(251, 191, 36, 0.15);
    border: 1px solid rgba(251, 191, 36, 0.3);
    color: #fbbf24;
    font-size: 8px;
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;
    &:hover:not(:disabled) { background: rgba(251, 191, 36, 0.25); }
    &:disabled { cursor: not-allowed; }
  }
}

.cancel-btn {
  width: 100%;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: none;
  border-radius: 12px;
  color: #94a3b8;
  font-size: 13px;
  cursor: pointer;
  &:hover { color: #fff; background: rgba(255, 255, 255, 0.1); }
}

.yellow-text { color: #fbbf24; }
.white-text { color: #fff; font-weight: bold; }
.press-start { font-family: 'Press Start 2P', cursive; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>
