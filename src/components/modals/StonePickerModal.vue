<script setup lang="ts">
/**
 * StonePickerModal
 * Standardized modal for using evolution stones.
 */
import { computed } from 'vue';
import { useGameStore } from '@/stores/game';
import { useUIStore } from '@/stores/ui';
import { useEvolutionStore } from '@/stores/evolution';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { STONE_EVOLUTIONS } from '@/data/evolutionData';
import { SHOP_ITEMS } from '@/data/items';
import BaseModal from '@/components/common/BaseModal.vue';

interface Props {
  show?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  show: false
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const gameStore = useGameStore() as any;
const uiStore = useUIStore() as any;
const evolutionStore = useEvolutionStore() as any;

const pokemon = computed(() => uiStore.selectedPokemon);

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
  
  const evo = STONE_EVOLUTIONS[p.id as keyof typeof STONE_EVOLUTIONS];
  return evo ? [evo] : [];
});

const close = () => {
  emit('close');
};

const useStone = (stoneName: string, toId: string) => {
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

const getStoneInfo = (name: string) => {
  return SHOP_ITEMS.find(i => i.name === name) || { icon: '💎', sprite: '' };
};

const getPokemonName = (id: string) => {
  return pokemonDataProvider.getPokemonData(id)?.name || id;
};
</script>

<template>
  <BaseModal
    :show="show && options.length > 0"
    title="EVOLUCIÓN POR PIEDRA"
    title-color="var(--yellow)"
    header-background="Rgba(26, 28, 46, 1)"
    max-width="380px"
    variant="retro"
    @close="close"
  >
    <div class="stone-picker-content">
      <p class="stone-help">
        ¿Qué piedra usás en <span class="accent-text">{{ pokemon?.name }}</span>?
      </p>

      <div class="options-list">
        <div 
          v-for="opt in options" 
          :key="opt.stone"
          class="stone-option-vicio"
          :class="{ disabled: (gameStore.state.inventory[opt.stone] || 0) <= 0 }"
        >
          <div class="stone-sprite-box">
            <img 
              v-if="getStoneInfo(opt.stone).sprite"
              :src="getStoneInfo(opt.stone).sprite" 
              class="stone-sprite" 
              @error="e => { (e.target as HTMLImageElement).style.display = 'none' }"
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
            class="use-btn-vicio"
            :disabled="(gameStore.state.inventory[opt.stone] || 0) <= 0"
            @click.stop="useStone(opt.stone, opt.to)"
          >
            USAR
          </button>
        </div>
      </div>
    </div>

    <template #footer>
      <button
        class="btn-vicio-secondary btn-vicio-full"
        @click.stop="close"
      >
        CANCELAR
      </button>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.stone-picker-content {
  padding: 8px 0;
}

.stone-help {
  font-size: 13px;
  color: Rgba(255, 255, 255, 0.5);
  text-align: center;
  margin-bottom: 24px;
  
  .accent-text {
    color: var(--yellow);
    font-weight: bold;
  }
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stone-option-vicio {
  display: flex;
  align-items: center;
  gap: 16px;
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 12px;
  transition: all 0.2s;

  &.disabled {
    opacity: 0.3;
    will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  filter: Grayscale(1);
  }

  &:not(.disabled):hover {
    background: Rgba(251, 191, 36, 0.1);
    border-color: var(--yellow);
    transform: Translatex(4px);
    
    .stone-name { color: var(--yellow); }
  }
}

.stone-sprite-box {
  width: 44px;
  height: 44px;
  background: Rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  .stone-sprite {
    width: 36px;
    height: 36px;
    @include sprite-render;
  }
  
  .fallback-icon { font-size: 24px; }
}

.stone-details {
  flex: 1;
  .stone-name {
    font-weight: 700;
    font-size: 14px;
    color: white;
    transition: color 0.2s;
  }
  .evo-target {
    font-size: 11px;
    color: Rgba(255, 255, 255, 0.3);
    margin-top: 2px;
  }
}

.use-btn-vicio {
  background: Rgba(251, 191, 36, 0.15);
  border: 1px solid Rgba(251, 191, 36, 0.3);
  color: var(--yellow);
  @include pixelated;
  font-size: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  @include pixelated;

  &:hover:not(:disabled) {
    background: var(--yellow);
    color: black;
    transform: Scale(1.05);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}
</style>
