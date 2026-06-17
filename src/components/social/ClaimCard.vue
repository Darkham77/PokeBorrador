<script setup lang="ts">
import { ref } from 'vue';
import { gsap } from 'gsap';
import { useGameStore } from '@/stores/game';
import { useUIStore } from '@/stores/ui';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import { getItemByName, getItemById } from '@/data/inventory/items';
import type { ClaimItem } from '@/types/system/game';

interface PokemonAssetData {
  id: number;
  name: string;
  level: number;
}

interface ItemAssetData {
  name: string;
  qty: number;
}

const props = defineProps<{
  claim: ClaimItem;
}>();

const gameStore = useGameStore();
const uiStore = useUIStore();

const isProcessing = ref(false);
const isCooldown = ref(false);

const getFriendlySourceType = (sourceType: string) => {
  switch (sourceType) {
    case 'trade':
      return 'Intercambio';
    case 'gts':
      return 'Mercado GTS';
    case 'gts_cancel':
      return 'Cancelación GTS';
    default:
      return sourceType;
  }
};

const getAssetIcon = (asset: ClaimItem['asset_data']) => {
  if (asset.type === 'money') return getAssetUrl(ASSET_TYPES.ITEM, 'nugget');
  if (asset.type === 'item') {
    const itemData = asset.data as unknown as ItemAssetData;
    const dbItem = getItemByName(itemData.name) || getItemById(itemData.name);
    const slug = dbItem?.sprite || dbItem?.id || itemData.name;
    return getAssetUrl(ASSET_TYPES.ITEM, slug);
  }
  return getAssetUrl(ASSET_TYPES.ITEM, 'pokeball');
};

const getSpriteUrl = (id: string | number) => {
  return getAssetUrl(ASSET_TYPES.POKEMON, id);
};

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
    gsap.delayedCall(5, () => { isCooldown.value = false; });
  }
  
  isProcessing.value = false;
};
</script>

<template>
  <div class="claim-card">
    <div class="claim-main">
      <div class="asset-preview-wrapper">
        <img 
          v-if="claim.asset_data.type === 'pokemon'"
          :src="getSpriteUrl((claim.asset_data.data as unknown as PokemonAssetData).id)" 
          class="pixel-art pokemon-sprite" 
          @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
        >
        <img
          v-else
          :src="getAssetIcon(claim.asset_data)"
          class="pixel-art item-sprite"
          @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
        >
      </div>
      <div class="claim-info">
        <span class="name">
          <template v-if="claim.asset_data.type === 'pokemon'">
            {{ (claim.asset_data.data as unknown as PokemonAssetData).name }}
            <span class="lvl-label">Nvl {{ (claim.asset_data.data as unknown as PokemonAssetData).level }}</span>
          </template>
          <template v-else-if="claim.asset_data.type === 'money'">
            ₽{{ (claim.asset_data.data as unknown as number).toLocaleString() }}
          </template>
          <template v-else-if="claim.asset_data.type === 'item'">
            {{ (claim.asset_data.data as unknown as ItemAssetData).name }}
            <span class="qty-label">x{{ (claim.asset_data.data as unknown as ItemAssetData).qty }}</span>
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
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  

  &:hover {
    background: Rgba(255, 255, 255, 0.05);
    border-color: Rgba(199, 125, 255, 0.2);
    transform: Translatex(4px);
  }
}

.claim-main {
  display: flex;
  gap: 12px;
  align-items: center;
}

.asset-preview-wrapper {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: Rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  overflow: visible;
  position: relative;
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
  gap: 4px;

  .name {
    font-size: 14px;
    font-weight: 700;
    color: Rgba(241, 245, 249, 1);
    line-height: 1.2;
    display: flex;
    align-items: center;
    gap: 6px;

    .lvl-label, .qty-label {
      font-size: 11px;
      font-weight: normal;
      color: Rgba(255, 255, 255, 0.5);
    }
  }

  .meta {
    font-size: 11px;
    color: Rgba(255, 255, 255, 0.5);
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
