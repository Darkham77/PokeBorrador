<script setup lang="ts">
/**
 * EggWarehouse.vue
 */
const CARD_HOVER_OFFSET_Y_PX = -4
const CRIADOR_CLASS_MIN_LEVEL = 20
const MAX_INVENTORY_EGGS_LIMIT = 6
const MAX_WAREHOUSE_EGGS_CAPACITY = 30
const GSAP_CARD_TRANSITION_DUR_SEC = 0.25
const GSAP_TRASH_TRANSITION_DUR_SEC = 0.2
const GSAP_TRASH_HOVER_SCALE = 1.1
import { useBreedingStore } from '@/stores/breeding';
import { useUIStore } from '@/stores/ui';
import { useGameStore } from '@/stores/game';
import { POKEMON_DB } from '@/data/pokemon/pokemonDB';
import { requirePokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { DaycareEgg } from '@/types/breeding/breeding';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import EggSprite from '@/components/common/EggSprite.vue';

import { getPokemonTier } from '@/logic/pokemon/tierEngine';
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

const getEggTierInfo = (egg: DaycareEgg) => {
  if (!egg.ivs) return null;
  // getPokemonTier expects Partial<Pokemon>
  return getPokemonTier({ ivs: egg.ivs });
};

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

const handleCardMouseEnter = (e: MouseEvent) => {
  const el = e.currentTarget as HTMLElement;
  gsap.to(el, {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(244, 63, 94, 0.5)',
    y: CARD_HOVER_OFFSET_Y_PX,
    boxShadow: '0 8px 24px rgba(244, 63, 94, 0.15)',
    duration: GSAP_CARD_TRANSITION_DUR_SEC,
    ease: 'power2.out',
    overwrite: 'auto'
  });
  
  const visual = el.querySelector('.egg-visual');
  const info = el.querySelector('.egg-info');
  const action = el.querySelector('.egg-hover-action');
  
const GSAP_EGG_CARD_HOVER_MIN_SCALE = 0.95

  if (visual) {
    gsap.to(visual, { opacity: 0, y: -8, scale: GSAP_EGG_CARD_HOVER_MIN_SCALE, duration: GSAP_CARD_TRANSITION_DUR_SEC, ease: 'power2.out', overwrite: 'auto' });
  }
  if (info) {
    gsap.to(info, { opacity: 0, y: -8, scale: GSAP_EGG_CARD_HOVER_MIN_SCALE, duration: GSAP_CARD_TRANSITION_DUR_SEC, ease: 'power2.out', overwrite: 'auto' });
  }
  if (action) {
    gsap.to(action, { opacity: 1, scale: 1, duration: GSAP_CARD_TRANSITION_DUR_SEC, ease: 'power2.out', overwrite: 'auto' });
  }
};

const GSAP_EGG_CARD_UNSCANNED_HOVER_SCALE = 0.85

const handleCardMouseLeave = (e: MouseEvent) => {
  const el = e.currentTarget as HTMLElement;
  gsap.to(el, {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    y: 0,
    boxShadow: 'none',
    duration: GSAP_CARD_TRANSITION_DUR_SEC,
    ease: 'power2.out',
    overwrite: 'auto'
  });
  
  const visual = el.querySelector('.egg-visual');
  const info = el.querySelector('.egg-info');
  const action = el.querySelector('.egg-hover-action');
  
  if (visual) {
    gsap.to(visual, { opacity: 1, y: 0, scale: 1, duration: GSAP_CARD_TRANSITION_DUR_SEC, ease: 'power2.out', overwrite: 'auto' });
  }
  if (info) {
    gsap.to(info, { opacity: 1, y: 0, scale: 1, duration: GSAP_CARD_TRANSITION_DUR_SEC, ease: 'power2.out', overwrite: 'auto' });
  }
  if (action) {
    gsap.to(action, { opacity: 0, scale: GSAP_EGG_CARD_UNSCANNED_HOVER_SCALE, duration: GSAP_CARD_TRANSITION_DUR_SEC, ease: 'power2.out', overwrite: 'auto' });
  }
};

const handleTrashMouseEnter = (e: MouseEvent) => {
  const el = e.currentTarget as HTMLElement;
  gsap.to(el, {
    backgroundColor: 'rgba(239, 68, 68, 0.4)',
    color: '#ffffff',
    scale: GSAP_TRASH_HOVER_SCALE,
    duration: GSAP_TRASH_TRANSITION_DUR_SEC,
    ease: 'power2.out',
    overwrite: 'auto'
  });
};

const handleTrashMouseLeave = (e: MouseEvent) => {
  const el = e.currentTarget as HTMLElement;
  gsap.to(el, {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#f87171',
    scale: 1.0,
    duration: GSAP_TRASH_TRANSITION_DUR_SEC,
    ease: 'power2.out',
    overwrite: 'auto'
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
      <div 
        v-for="egg in breedingStore.warehouseEggs" 
        :id="'egg-card-' + egg.id" 
        :key="egg.id"
        class="egg-card"
        @click.stop="handleClaim(egg)"
        @mouseenter="handleCardMouseEnter"
        @mouseleave="handleCardMouseLeave"
      >
        <!-- Trash button to discard egg (only if scanned) -->
        <button 
          v-if="egg.inherited_ivs?._scanned"
          class="egg-trash-btn"
          title="Tirar huevo"
          @click.stop="handleDeleteEgg(egg)"
          @mouseenter="handleTrashMouseEnter"
          @mouseleave="handleTrashMouseLeave"
        >
          <span class="emoji">🗑️</span>
        </button>

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
            <span class="emoji">🔍</span> ESCANEADO
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
            <div class="iv-stat">
              <span>HP</span>{{ egg.ivs.hp }}
            </div>
            <div class="iv-stat">
              <span>ATK</span>{{ egg.ivs.atk }}
            </div>
            <div class="iv-stat">
              <span>DEF</span>{{ egg.ivs.def }}
            </div>
            <div class="iv-stat">
              <span>SPA</span>{{ egg.ivs.spa }}
            </div>
            <div class="iv-stat">
              <span>SPD</span>{{ egg.ivs.spd }}
            </div>
            <div class="iv-stat">
              <span>SPE</span>{{ egg.ivs.spe }}
            </div>
          </div>
          <div
            v-if="egg.inherited_ivs?._cost"
            class="cost"
          >
            Costo: <span>₽{{ (egg.inherited_ivs?._cost || 0).toLocaleString() }}</span>
          </div>
        </div>

        <div 
          class="egg-hover-action"
          :class="{ 'two-lines': isCriador && isLevelAdequate && !egg.inherited_ivs?._scanned }"
        >
          <template v-if="isCriador && isLevelAdequate && !egg.inherited_ivs?._scanned">
            ESCANEAR<br>O<br>RECOGER
          </template>
          <template v-else>
            RECOGER
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped src="./EggWarehouse.styles.scss" lang="scss"></style>
