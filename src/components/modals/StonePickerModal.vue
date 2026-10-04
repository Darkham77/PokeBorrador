<script setup lang="ts">
/**
 * StonePickerModal
 * Standardized modal for using evolution stones.
 */
import { ref, computed, watch } from 'vue';
import { useGameStore } from '@/stores/game';
import { useUIStore } from '@/stores/ui';
import { useEvolutionStore } from '@/stores/evolution';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { STONE_EVOLUTIONS, isStoneEvolutionKey } from '@/data/pokemon/evolutionData';
import { getItemById, type ItemId, isItemId } from '@/data/inventory/items';
import { type PokemonSpeciesId, isPokemonSpeciesId } from '@/data/pokemon/pokedex';
import BaseModal from '@/components/common/BaseModal.vue';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';

interface Props {
  show?: boolean
}

withDefaults(defineProps<Props>(), {
  show: false
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const gameStore = useGameStore();
const uiStore = useUIStore();
const evolutionStore = useEvolutionStore();

const pokemon = computed(() => uiStore.selectedPokemon);

interface StoneOption {
  stone: ItemId;
  to: PokemonSpeciesId;
}

const options = computed<StoneOption[]>(() => {
  if (!pokemon.value) return [];
  
  const p = pokemon.value;
  if (p.id === 'eevee') {
    return [
      { stone: 'waterstone',   to: 'vaporeon' },
      { stone: 'thunderstone', to: 'jolteon' },
      { stone: 'firestone',    to: 'flareon' },
    ];
  }
  
  const evo = isStoneEvolutionKey(p.id) ? STONE_EVOLUTIONS[p.id] : undefined;
  if (evo && isItemId(evo.stone) && isPokemonSpeciesId(evo.to)) {
    return [{ stone: evo.stone, to: evo.to }];
  }
  return [];
});

const close = () => {
  emit('close');
};

const useStone = (stoneId: ItemId, toId: PokemonSpeciesId) => {
  if (!pokemon.value) return;
  const currentQty = gameStore.state.inventory[stoneId];
  if (!currentQty || currentQty <= 0) return;

  // Consume item
  gameStore.state.inventory[stoneId] = currentQty - 1;
  if (gameStore.state.inventory[stoneId]! <= 0) {
    delete gameStore.state.inventory[stoneId];
  }

  close();
  // Start evolution scene
  evolutionStore.startEvolution(pokemon.value, toId, stoneId);
  gameStore.save(false);
};

const imageErrors = ref<Record<string, boolean>>({});

const stoneHasError = (stoneName: string) => !!imageErrors.value[stoneName];

const handleImageError = (stoneName: string) => {
  imageErrors.value[stoneName] = true;
};

watch(options, () => {
  imageErrors.value = {};
});

const getStoneInfo = (name: string) => {
  const item = getItemById(name);
  if (!item) {
    throw new Error(`[StonePickerModal] Item de evolución no encontrado: "${name}"`);
  }
  return item;
};

const getPokemonName = (id: string) => {
  return pokemonDataProvider.resolveSpeciesName(id);
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
              v-if="getStoneInfo(opt.stone).sprite && !stoneHasError(opt.stone)"
              :src="getAssetUrl(ASSET_TYPES.ITEM, getStoneInfo(opt.stone).sprite!)" 
              :alt="getStoneInfo(opt.stone).name || 'Piedra evolutiva'"
              class="stone-sprite" 
              @error="handleImageError(opt.stone)"
            >
            <span
              v-else
              class="fallback-icon"
            ><span class="emoji">🚫</span></span>
          </div>

          <div class="stone-details">
            <div class="stone-name">
              {{ getStoneInfo(opt.stone).name }}
            </div>
            <div class="evo-target">
              <span class="emoji">→</span> {{ getPokemonName(opt.to) }} &nbsp;·&nbsp; x{{ gameStore.state.inventory[opt.stone] || 0 }}
            </div>
          </div>

          <button 
            :id="`stone-picker-use-btn-${opt.stone}-${opt.to}`"
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
        id="stone-picker-cancel-btn"
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
  color: Rgb(255 255 255 / 50%);
  font-size: 13px;
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
  padding: 12px;
  border: 1px solid Rgb(255 255 255 / 6%);
  border-radius: 16px;
  background: Rgb(255 255 255 / 3%);

  &:not(.disabled):hover {
    background: Rgb(251 191 36 / 10%);
    transform: Translatex(4px);
    border-color: var(--yellow);
    
    .stone-name { color: var(--yellow); }
  }
  

  &.disabled {
    opacity: 0.3;
    will-change: transform, filter, opacity;
  filter: Grayscale(1);
  }
}

.stone-sprite-box {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: Rgb(0 0 0 / 20%);
  
  .stone-sprite {
    @include sprite-render;

    width: 36px;
    height: 36px;
  }
  
  .fallback-icon { font-size: 24px; }
}

.stone-details {
  flex: 1;
  .stone-name {
    color: white;
    font-size: 14px;
    font-weight: 700;
    
  }
  .evo-target {
    color: Rgb(255 255 255 / 30%);
    font-size: 11px;
    margin-top: 2px;
  }
}

.use-btn-vicio {
  @include pixelated;
  @include pixelated;

  padding: 10px 14px;
  border: 1px solid Rgb(251 191 36 / 30%);
  border-radius: 8px;
  background: Rgb(251 191 36 / 15%);
  color: var(--yellow);
  font-size: 8px;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: var(--yellow);
    color: black;
    transform: Scale(1.05);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
