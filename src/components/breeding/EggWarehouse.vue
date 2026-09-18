<script setup lang="ts">
/**
 * EggWarehouse.vue
 */
const CRIADOR_CLASS_MIN_LEVEL = 20;
const MAX_INVENTORY_EGGS_LIMIT = 6;
const MAX_WAREHOUSE_EGGS_CAPACITY = 30;
import { useBreedingStore } from '@/stores/breeding';
import { useUIStore } from '@/stores/ui';
import { useGameStore } from '@/stores/game';
import { POKEMON_DB } from '@/data/pokemon/pokemonDB';
import { requirePokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { DaycareEgg } from '@/types/breeding/breeding';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import EggWarehouseCard from './EggWarehouseCard.vue';

import { ref, computed, watch, onUnmounted } from 'vue';
import { gsap } from 'gsap';

const breedingStore = useBreedingStore();
const uiStore = useUIStore();
const gameStore = useGameStore();

const isCriador = computed(() => gameStore.state.playerClass === 'criador');
const isLevelAdequate = computed(() => (gameStore.state.classLevel || 1) >= CRIADOR_CLASS_MIN_LEVEL);

const getPokemonName = (id: string) => {
  const specId = requirePokemonSpeciesId(id)
  return POKEMON_DB[specId]?.name || 'Huevo'
}


// Cooldown countdown for scanner (Available 1 time per day)
const cooldownText = ref('');
let cooldownTicker: gsap.core.Tween | null = null;

const checkCooldown = () => {
  if (!isCriador.value || !isLevelAdequate.value) {
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

const GSAP_COOLDOWN_TICKER_DELAY_SEC = 1;

  // Schedule next update using GSAP delayedCall recursively
  cooldownTicker = gsap.delayedCall(GSAP_COOLDOWN_TICKER_DELAY_SEC, checkCooldown);
};

watch(
  [() => gameStore.state.playerClass, () => gameStore.state.classLevel, () => gameStore.state.classData?.lastEggScanDate],
  () => {
    if (cooldownTicker) {
      cooldownTicker.kill();
      cooldownTicker = null;
    }
    checkCooldown();
  },
  { immediate: true }
);

onUnmounted(() => {
  if (cooldownTicker) cooldownTicker.kill();
});

const handleClaim = (egg: DaycareEgg) => {
  // Early slot guard — show toast immediately without opening any dialog
  const regularEggs = (gameStore.state.eggs || []).filter(e => !e.isNpc);
  if (regularEggs.length >= MAX_INVENTORY_EGGS_LIMIT) {
    uiStore.notify('Tu incubadora está llena. Puedes llevar un máximo de 6 huevos.', '🥚');
    return;
  }

  const cost = egg.inherited_ivs?._cost as number || 0;
  const isScanned = !!egg.inherited_ivs?._scanned;
  const displayName = isScanned ? `huevo de ${getPokemonName(egg.species)}` : 'Huevo Pokémon';
  
  const lastScan = gameStore.state.classData?.lastEggScanDate;
  const todayStr = Temporal.Now.instant().toString().split('T')[0] || '';
  const canScan = isCriador.value && isLevelAdequate.value && (!lastScan || !lastScan.startsWith(todayStr));

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

const handleDeleteEgg = (egg: DaycareEgg) => {
  const isScanned = !!egg.inherited_ivs?._scanned;
  const displayName = isScanned ? `huevo de ${getPokemonName(egg.species)}` : 'Huevo Pokémon';
  uiStore.openConfirm({
    title: '⚠️ TIRAR HUEVO',
    message: `¿Estás seguro de que deseas tirar este ${displayName}? Esta acción no se puede deshacer y liberarás el espacio en el almacén.`,
    confirmText: 'SÍ, TIRAR',
    cancelText: 'CANCELAR',
    onConfirm: () => {
      breedingStore.deleteEgg(egg.id);
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
        {{ breedingStore.warehouseEggs.length }} / {{ MAX_WAREHOUSE_EGGS_CAPACITY }}
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
      <EggWarehouseCard
        v-for="egg in breedingStore.warehouseEggs"
        :key="egg.id"
        :egg="egg"
        :is-criador="isCriador"
        :is-level-adequate="isLevelAdequate"
        @claim="handleClaim"
        @delete="handleDeleteEgg"
      />
    </div>
  </div>
</template>

<style scoped src="./EggWarehouse.styles.scss" lang="scss"></style>
