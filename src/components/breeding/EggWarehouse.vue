<script setup lang="ts">
import { useBreedingStore } from '@/stores/breeding';
import { useUIStore } from '@/stores/ui';
import { useGameStore } from '@/stores/game';
import { POKEMON_DB } from '@/data/pokemonDB';
import type { DaycareEgg } from '@/types/breeding';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import EggSprite from '@/components/common/EggSprite.vue';

import { getPokemonTier } from '@/logic/pokemon/tierEngine';
import { ref, onMounted, onUnmounted } from 'vue';
import { gsap } from 'gsap';

const breedingStore = useBreedingStore();
const uiStore = useUIStore();
const gameStore = useGameStore();

const getPokemonName = (id: string) => (POKEMON_DB as Record<string, { name: string }>)[id]?.name || 'Huevo';

const getEggTierInfo = (egg: DaycareEgg) => {
  if (!egg.ivs) return null;
  // getPokemonTier expects Partial<Pokemon>
  return getPokemonTier({ ivs: egg.ivs });
};

// Cooldown countdown for scanner (Available 1 time per day)
const cooldownText = ref('');
let cooldownTicker: gsap.core.Tween | null = null;

const checkCooldown = () => {
  if (gameStore.state.playerClass !== 'criador') {
    cooldownText.value = '';
    return;
  }
  const lastScan = gameStore.state.classData?.lastEggScanDate;
  if (!lastScan) {
    cooldownText.value = '';
    return;
  }

  const todayStr = Temporal.Now.instant().toString().split('T')[0] || '';
  if (!lastScan.startsWith(todayStr)) {
    cooldownText.value = '';
    return;
  }

  // Last scan was today, so we wait until midnight of the local day (or tomorrow morning)
  // Let's compute the remaining time until tomorrow starts
  const now = Temporal.Now.zonedDateTimeISO();
  const tomorrow = now.add({ days: 1 }).with({ hour: 0, minute: 0, second: 0, millisecond: 0 });
  const duration = now.until(tomorrow);

  const hours = String(duration.hours).padStart(2, '0');
  const minutes = String(duration.minutes).padStart(2, '0');
  const seconds = String(duration.seconds).padStart(2, '0');

  cooldownText.value = `ESCANER IV EN COOLDOWN: ${hours}:${minutes}:${seconds}`;

  // Schedule next update using GSAP delayedCall recursively
  cooldownTicker = gsap.delayedCall(1, checkCooldown);
};

onMounted(() => {
  checkCooldown();
});

onUnmounted(() => {
  if (cooldownTicker) cooldownTicker.kill();
});

const handleClaim = (egg: DaycareEgg) => {
  const cost = egg.inherited_ivs?._cost as number || 0;
  const isScanned = !!egg.inherited_ivs?._scanned;
  const displayName = isScanned ? `huevo de ${getPokemonName(egg.species)}` : 'Huevo Pokémon';
  
  const lastScan = gameStore.state.classData?.lastEggScanDate;
  const todayStr = Temporal.Now.instant().toString().split('T')[0] || '';
  const canScan = gameStore.state.playerClass === 'criador' && (!lastScan || !lastScan.startsWith(todayStr));

  if (canScan && !isScanned) {
    uiStore.openConfirm({
      title: '🧬 ACCIÓN DE CRIADOR',
      message: `¿Qué deseas hacer con este Huevo Pokémon?\n\nPuedes escanear sus IVs (disponible 1 vez por día) o recogerlo para caminar hoy.`,
      confirmText: 'ESCANEAR IVs',
      cancelText: 'RECOGER HUEVO',
      onConfirm: () => {
        breedingStore.scanEgg(egg.id);
      },
      onCancel: () => {
        uiStore.openConfirm({
          title: 'RECOGER HUEVO',
          message: `¿Quieres recoger este Huevo Pokémon por ₽${cost.toLocaleString()}?`,
          onConfirm: () => {
            breedingStore.claimEgg(egg.id);
          }
        });
      }
    });
    return;
  }

  uiStore.openConfirm({
    title: 'RECOGER HUEVO',
    message: `¿Quieres recoger este ${displayName} por ₽${cost.toLocaleString()}?`,
    onConfirm: () => {
      breedingStore.claimEgg(egg.id);
    }
  });
};
</script>

<template>
  <div class="egg-warehouse">
    <header class="warehouse-header">
      <div class="info">
        <h3>Almacén de Huevos</h3>
        <p>Huevos esperando a ser recogidos</p>
        <div 
          v-if="cooldownText" 
          class="scanner-cooldown-text"
        >
          {{ cooldownText }}
        </div>
      </div>
      <div
        class="count-badge"
        :class="{ empty: breedingStore.warehouseEggs.length === 0 }"
      >
        {{ breedingStore.warehouseEggs.length }} / 30
      </div>
    </header>

    <div
      v-if="breedingStore.warehouseEggs.length === 0"
      class="empty-state"
    >
      <div class="icon">
        <img
          :src="getAssetUrl(ASSET_TYPES.POKEMON, 'egg')"
          alt="Huevo"
          class="egg-sprite-empty"
        >
      </div>
      <p>El almacén está vacío. ¡Put a criar a tus Pokémon!</p>
    </div>

    <div
      v-else
      class="egg-grid"
    >
      <div 
        v-for="egg in breedingStore.warehouseEggs" 
        :key="egg.id" 
        class="egg-card"
        @click.stop="handleClaim(egg)"
      >
        <div class="egg-visual">
          <div class="egg-sprite">
            <EggSprite
              :tint="egg.tint"
              size="48"
              class="egg-sprite-img"
            />
          </div>
          <div
            v-if="egg.inherited_ivs?._scanned"
            class="scanned-badge"
          >
            🔍 ESCANEADO
          </div>
        </div>
        
        <div class="egg-info">
          <div class="name">
            {{ egg.inherited_ivs?._scanned ? getPokemonName(egg.species) : 'HUEVO POKÉMON' }}
          </div>
          
          <!-- Colored IV Grade Badge -->
          <div
            v-if="egg.inherited_ivs?._scanned && getEggTierInfo(egg)"
            class="egg-grade-container"
          >
            <span 
              class="egg-grade-badge" 
              :style="{ 
                '--tier-color': getEggTierInfo(egg)!.color, 
                '--tier-bg': getEggTierInfo(egg)!.bg 
              }"
            >
              GRADO {{ getEggTierInfo(egg)!.tier }}
            </span>
          </div>

          <div
            v-if="egg.inherited_ivs?._scanned && egg.ivs"
            class="egg-scanned-ivs"
          >
            IVs: HP:{{ egg.ivs.hp }} A:{{ egg.ivs.atk }} D:{{ egg.ivs.def }} S:{{ egg.ivs.spe }}
          </div>
          <div
            v-if="egg.inherited_ivs?._cost"
            class="cost"
          >
            Costo: <span>₽{{ (egg.inherited_ivs?._cost || 0).toLocaleString() }}</span>
          </div>
        </div>

        <div class="egg-hover-action">
          RECOGER
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.egg-warehouse {
  padding: 10px 0;
}

.warehouse-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  
  h3 { @include pixelated; font-size: 10px; color: $pokecenter-pink; margin-bottom: 6px; }
  p { font-size: 12px; color: $muted; }

  .scanner-cooldown-text {
    @include pixelated;
    font-size: 8px;
    color: #ef4444;
    margin-top: 4px;
    background: Rgba(239, 68, 68, 0.1);
    border: 1px solid Rgba(239, 68, 68, 0.3);
    padding: 2px 6px;
    border-radius: 4px;
    display: inline-block;
  }
}

.count-badge {
  background: Rgba($pokecenter-pink, 0.08);
  border: 1px solid Rgba($pokecenter-pink, 0.3);
  color: $pokecenter-pink;
  padding: 6px 12px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 800;
  
  &.empty {
    background: Rgba(148, 163, 184, 0.1);
    border-color: Rgba(148, 163, 184, 0.2);
    color: $muted;
  }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: Rgba(71, 85, 105, 1);
  
  .icon { margin-bottom: 16px; display: flex; justify-content: center; }
  .egg-sprite-empty {
    width: 64px;
    height: 64px;
    opacity: 0.3;
    @include pixelated;
  }
  p { font-size: 14px; }
}

.egg-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.egg-card {
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  position: relative;
  cursor: pointer;
  
  overflow: hidden;

  &:hover {
    background: Rgba(255, 255, 255, 0.06);
    border-color: Rgba($pokecenter-pink, 0.4);
    transform: Translatey(-4px);
    
    .egg-hover-action {
      transform: Translatey(0);
    }
  }
}

.egg-visual {
  width: 64px;
  height: 64px;
  background: Rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  .egg-sprite-img {
    width: 48px;
    height: 48px;
    @include pixelated;
  }
}

.scanned-badge {
  position: absolute;
  bottom: -4px;
  background: $pokecenter-pink;
  color: $white;
  font-size: 6px;
  @include pixelated;
  padding: 2px 4px;
  border-radius: 4px;
  white-space: nowrap;
}

.egg-info {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;

  .name {
    font-size: 11px;
    font-weight: 700;
    color: Rgba(241, 245, 249, 1);
    line-height: 1.4;
    min-height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cost {
    font-size: 9px;
    color: Rgba(148, 163, 184, 1);
    line-height: 1.4;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;

    span {
      color: Rgba(250, 204, 21, 1);
      font-weight: 800;
      font-size: 11px;
    }
  }

  .egg-scanned-ivs {
    font-size: 8px;
    color: #fbbf24;
    @include pixelated;
    margin-top: 2px;
    background: Rgba(0, 0, 0, 0.3);
    padding: 2px 4px;
    border-radius: 4px;
  }

  .egg-grade-container {
    display: flex;
    justify-content: center;
    margin-top: 2px;
    margin-bottom: 2px;
  }

  .egg-grade-badge {
    @include pixelated;
    font-size: 8px;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--tier-bg);
    border: 1px solid var(--tier-color);
    color: var(--tier-color);
    font-weight: bold;
    box-shadow: 0 0 6px var(--tier-bg);
    display: inline-block;
    line-height: 1;
  }
}

.egg-hover-action {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: $pokecenter-pink;
  color: $white;
  @include pixelated;
  font-size: 8px;
  padding: 8px 0;
  text-align: center;
  transform: Translatey(100%);
  
}
</style>
