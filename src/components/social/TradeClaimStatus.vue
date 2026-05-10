<script setup lang="ts">
import { computed, ref, reactive } from 'vue'
import { gsap } from 'gsap'
import { gsapSleep as sleep } from '@/logic/utils/gsapHelpers'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

import type { ClaimItem } from '@/types/game'

interface PokemonAssetData {
  id: number;
  name: string;
  level: number;
}
 
const gameStore = useGameStore()
const uiStore = useUIStore()
 
const claims = computed(() => (gameStore.state.claimQueue || []))
const hasClaims = computed(() => claims.value.length > 0)
 
const processingId = ref<string | number | null>(null)
const cooldowns = reactive(new Set<string | number>())
 
const claimAsset = async (claimId: string | number) => {
  if (cooldowns.has(claimId)) {
    uiStore.notify('Debes esperar 5 segundos entre reclamos', '⏳')
    return
  }
 
  processingId.value = claimId
  const success = await gameStore.claimAsset(claimId)
  
  if (success) {
    uiStore.notify('¡Objeto recibido!', '🎁')
    // Cooldown logic
    cooldowns.add(claimId)
    gsap.delayedCall(5, () => cooldowns.delete(claimId))
  }
  
  processingId.value = null
}
 
const receiveAll = async () => {
  for (const claim of claims.value) {
    await claimAsset(claim.id)
    // Small delay between batch claims
    await sleep(1000)
  }
}
 
const getAssetIcon = (asset: ClaimItem['asset_data']) => {
  if (asset.type === 'money') return getAssetUrl(ASSET_TYPES.ITEM, 'nugget')
  return getAssetUrl(ASSET_TYPES.ITEM, 'pokeball')
}
 
const getSpriteUrl = (id: string | number) => {
  return getAssetUrl(ASSET_TYPES.POKEMON, id)
}
</script>

<template>
  <div
    v-if="hasClaims"
    class="claim-status-container"
  >
    <div class="claim-header">
      <div class="claim-title">
        🎁 OBJETOS PENDIENTES ({{ claims.length }})
      </div>
      <button
        class="receive-all-btn"
        :disabled="!!processingId"
        @click.stop="receiveAll"
      >
        RECIBIR TODO
      </button>
    </div>

    <div class="claim-list scrollbar">
      <div
        v-for="claim in claims"
        :key="claim.id"
        class="claim-item"
      >
        <div class="asset-preview">
          <img 
            v-if="claim.asset_data.type === 'pokemon'"
            :src="getSpriteUrl((claim.asset_data.data as unknown as PokemonAssetData).id)" 
            class="pixel-art pokemon-sprite" 
            @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
          >
          <img
            v-else
            :src="getAssetIcon(claim.asset_data)"
            class="pixel-art"
            @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
          >
          
          <div class="asset-info">
            <div
              v-if="claim.asset_data.type === 'pokemon'"
              class="asset-name"
            >
              {{ (claim.asset_data.data as unknown as PokemonAssetData).name }} (Lv.{{ (claim.asset_data.data as unknown as PokemonAssetData).level }})
            </div>
            <div
              v-else-if="claim.asset_data.type === 'money'"
              class="asset-name"
            >
              ₽{{ (claim.asset_data.data as unknown as number).toLocaleString() }}
            </div>
            <div class="source">
              Origen: {{ claim.source_type }}
            </div>
          </div>
        </div>
        <button 
          class="claim-btn" 
          :disabled="processingId === claim.id" 
          @click.stop="claimAsset(claim.id as string | number)"
        >
          {{ processingId === claim.id ? '...SINC' : 'RECIBIR' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.claim-status-container {
  background: Rgba(168, 85, 247, 0.05);
  border: 1px solid Rgba(168, 85, 247, 0.2);
  border-radius: 16px;
  padding: 16px;
  margin-top: 15px;
  -webkit-will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  backdrop-filter: Blur(10px);
  backdrop-filter: Blur(10px);
  @include gpu-layer;
}

.claim-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.claim-title {
  @include pixelated;
  font-size: 8px;
  color: var(--purple);
}

.receive-all-btn {
  background: var(--purple);
  color: var(--white);
  border: none;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 9px;
  font-weight: 700;
  cursor: pointer;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.claim-list {
  max-height: 200px;
  overflow-y: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.claim-item {
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.asset-preview {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pixel-art {
  width: 24px;
  height: 24px;
  image-rendering: pixelated;
  &.pokemon-sprite {
    width: 48px;
    height: 48px;
    margin: -12px; // Offset for better alignment with text
  }
}

.asset-name {
  font-size: 11px;
  font-weight: 700;
  color: var(--white);
}

.source {
  font-size: 9px;
  color: var(--gray);
  text-transform: capitalize;
}

.claim-btn {
  background: Rgba(255, 255, 255, 0.05);
  border: 1px solid Rgba(255, 255, 255, 0.1);
  color: var(--white);
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 9px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: Rgba(168, 85, 247, 0.2); border-color: var(--purple); }
}
</style>
