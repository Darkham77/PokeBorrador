<script setup lang="ts">
import { ref, computed } from 'vue';
import { gsap } from 'gsap';
import { useGameStore } from '@/stores/game';
import { useUIStore } from '@/stores/ui';
import { useGTSStore } from '@/stores/gts';
import type { ClaimItem } from '@/types/system/game';
import {
  formatSoldDetails,
  getFriendlySourceType,
  getClaimAssetIcon as getAssetIcon,
  getClaimSpriteUrl as getSpriteUrl,
  type PokemonAssetData,
  type ItemAssetData
} from './claimCardHelper';

const props = defineProps<{
  claim: ClaimItem;
}>();

const gameStore = useGameStore();
const uiStore = useUIStore();
const gtsStore = useGTSStore();

const isProcessing = ref(false);
const isCooldown = ref(false);

const pokemonAsset = computed(() => props.claim.asset_data.type === 'pokemon' ? (props.claim.asset_data.data as PokemonAssetData) : null);
const itemAsset = computed(() => props.claim.asset_data.type === 'item' ? (props.claim.asset_data.data as ItemAssetData) : null);
const moneyAsset = computed(() => props.claim.asset_data.type === 'money' ? (props.claim.asset_data.data as number) : 0);

const soldDetails = computed(() => formatSoldDetails(props.claim, gtsStore.salesHistory));

const CLAIM_COOLDOWN_DELAY_SEC = 5;

const onClaim = async () => {
  if (isCooldown.value) {
    uiStore.notify('Debes esperar entre reclamos', '⏳');
    return;
  }

  isProcessing.value = true;
  const success = await gameStore.claimAsset(props.claim.id);
  
  if (success) {
    uiStore.notify('¡Activo recibido con éxito!', '🎁');
    isCooldown.value = true;
    gsap.delayedCall(CLAIM_COOLDOWN_DELAY_SEC, () => { isCooldown.value = false; });
  }
  
  isProcessing.value = false;
};
</script>

<template>
  <div class="claim-card">
    <div class="claim-main">
      <div class="asset-preview-wrapper">
        <img 
          v-if="claim.asset_data.type === 'pokemon' && pokemonAsset"
          :src="getSpriteUrl(pokemonAsset.id)"
          :alt="pokemonAsset?.name || 'Pokémon'"
          class="pixel-art pokemon-sprite" 
          width="32"
          height="32"
        >
        <img
          v-else
          :src="getAssetIcon(claim.asset_data)"
          :alt="itemAsset?.name || 'Reclamo'"
          class="pixel-art item-sprite" 
          width="32"
          height="32"
        >
      </div>
      <div class="claim-info">
        <span class="name">
          <template v-if="claim.asset_data.type === 'pokemon' && pokemonAsset">
            {{ pokemonAsset.name }}
            <span class="lvl-label">Nvl {{ pokemonAsset.level }}</span>
          </template>
          <template v-else-if="claim.asset_data.type === 'money'">
            ₽{{ moneyAsset.toLocaleString() }}
            <span
              v-if="soldDetails"
              class="lvl-label"
            >{{ soldDetails }}</span>
          </template>
          <template v-else-if="claim.asset_data.type === 'item' && itemAsset">
            {{ itemAsset.name }}
            <span class="qty-label">x{{ itemAsset.qty }}</span>
          </template>
        </span>
        <span class="meta">Origen: {{ getFriendlySourceType(claim.source_type) }}</span>
      </div>
    </div>
    <div class="claim-actions">
      <button 
        class="btn-vicio-success btn-vicio-sm claim-btn" 
        :disabled="isProcessing || isCooldown" 
        @click.stop="onClaim"
      >
        {{ isProcessing ? '...SINC' : isCooldown ? 'ESPERA' : 'RECLAMAR' }}
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.claim-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid Rgb(255 255 255 / 5%);
  border-radius: $radius-2xl;
  background: Rgb(255 255 255 / 3%);
  

  &:hover {
    background: Rgb(255 255 255 / 5%);
    transform: Translatex(4px);
    border-color: Rgb(199 125 255 / 20%);
  }
}

.claim-main {
  display: flex;
  align-items: center;
  gap: $spacing-md;
}

.asset-preview-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 36px;
  height: 36px;
  border-radius: $radius-lg-alt;
  background: Rgb(0 0 0 / 20%);
  overflow: visible;
}

.pixel-art {
  @include pixelated;
  
  &.pokemon-sprite {
    width: 54px;
    height: 54px;
    image-rendering: pixelated;
  }

  &.item-sprite {
    width: 24px;
    height: 24px;
  }
}

.claim-info {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;

  .name {
    display: flex;
    align-items: center;
    gap: $spacing-sm-alt;
    color: Rgb(241 245 249 / 100%);
    font-size: var(--font-14);
    font-weight: 700;
    line-height: 1.2;

    .lvl-label, .qty-label {
      color: Rgb(255 255 255 / 50%);
      font-size: var(--font-11);
      font-weight: normal;
    }
  }

  .meta {
    color: Rgb(255 255 255 / 50%);
    font-size: var(--font-11);
    line-height: 1.2;
  }
}

.claim-actions {
  display: flex;
  align-items: center;

  .claim-btn {
    min-width: 90px;
    text-align: center;
  }
}
</style>
