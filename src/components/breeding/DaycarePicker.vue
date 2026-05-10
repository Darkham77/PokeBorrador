<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/game';
import { useBreedingStore } from '@/stores/breeding';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import { getPokemonTier } from '@/logic/pokemonUtils';
import { checkCompatibility } from '@/logic/breeding/breedingEngine';
import { validateMissionPokemon } from '@/logic/breeding/missionEngine';

import type { DaycareMission } from '@/types/breeding';
import type { Pokemon } from '@/types/pokemon';

interface Props {
  slotIndex: number;
  otherParent?: Pokemon | null;
  mode?: 'deposit' | 'delivery';
  mission?: DaycareMission | null;
}

const props = withDefaults(defineProps<Props>(), {
  otherParent: null,
  mode: 'deposit',
  mission: null
});

const emit = defineEmits<{
  (e: 'select', pokemon: Pokemon): void;
  (e: 'close'): void;
}>()

const gameStore = useGameStore()
const breedingStore = useBreedingStore()

const availablePokemon = computed<Pokemon[]>(() => {
  // Filter out pokemon already in daycare
  const inDaycareUids = breedingStore.slots.map(s => s.pokemon?.uid);
  
  const all = [...(gameStore.state.team || []), ...(gameStore.state.box || [])];
  
  let filtered = all.filter(p => p && !inDaycareUids.includes(p.uid) && !p.onMission && !p.onDefense);

  // Mode: Deposit (pairing with another parent)
  if (props.mode === 'deposit' && props.otherParent) {
    filtered = [...filtered].sort((a, b) => {
      const cpA = checkCompatibility(props.otherParent!, a).level;
      const cpB = checkCompatibility(props.otherParent!, b).level;
      return cpB - cpA;
    });
  }

  // Mode: Delivery (matching mission requirements)
  if (props.mode === 'delivery' && props.mission) {
    filtered = filtered.filter(p => validateMissionPokemon(p, props.mission!));
  }

  return filtered;
});

const selectPokemon = (p: Pokemon) => {
  emit('select', p);
};
</script>

<template>
  <div
    class="daycare-picker-overlay"
    @click.self="emit('close')"
  >
    <div class="daycare-picker">
      <header>
        <h3>Seleccionar Pokémon</h3>
        <p v-if="otherParent">
          Emparejando con {{ otherParent.name }}
        </p>
        <button
          class="btn-close"
          @click.stop="emit('close')"
        >
          ×
        </button>
      </header>

      <div class="picker-content">
        <div
          v-if="availablePokemon.length === 0"
          class="empty"
        >
          No tienes Pokémon disponibles para depositar.
        </div>
        <div class="pokemon-grid">
          <div 
            v-for="p in availablePokemon" 
            :key="p.uid" 
            class="pokemon-card"
            @click.stop="selectPokemon(p)"
          >
            <div class="sprite-wrap">
              <img
                :src="getAssetUrl(ASSET_TYPES.POKEMON, p.id, { isShiny: !!p.isShiny })"
                :alt="p.name"
                class="pixelated"
                @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
              >
            </div>
            <div class="info">
              <div class="name-team">
                <span class="name">{{ p.name }}</span>
                <span class="lvl">Lv.{{ p.level }}</span>
              </div>
              <div class="stats">
                <span
                  class="gender"
                  :class="p.gender === 'M' ? 'm' : 'f'"
                >
                  {{ p.gender === 'M' ? '♂' : (p.gender === 'F' ? '♀' : '') }}
                </span>
                <span class="iv-total">IVs: {{ getPokemonTier(p).total }}</span>
              </div>
              <!-- Compatibility hint -->
              <div
                v-if="otherParent"
                class="compat-tag"
                :class="'level-' + checkCompatibility(otherParent, p).level"
              >
                {{ checkCompatibility(otherParent, p).level > 0 ? '✓ Compatible' : 'Incompatible' }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.daycare-picker-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: Rgba(0, 0, 0, 0.8);
  will-change: transform, filter, opacity;
  backdrop-filter: Blur(4px);
  @include gpu-layer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  transform: Translatez(0);
}

.daycare-picker {
  background: Rgba(30, 41, 59, 1);
  width: 100%;
  max-width: 500px;
  max-height: 80dvh;
  border-radius: 20px;
  border: 1px solid #334155;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 50px Rgba(0, 0, 0, 0.5);

  header {
    padding: 20px;
    background: Rgba(15, 23, 42, 0.5);
    border-bottom: 1px solid #334155;
    position: relative;
    text-align: center;

    h3 { font-size: 16px; font-weight: 700; color: $white; margin-bottom: 4px; }
    p { font-size: 12px; color: Rgba(148, 163, 184, 1); }
    
    .btn-close {
      position: absolute;
      top: 15px;
      right: 15px;
      background: none;
      border: none;
      @include pixelated;
      color: Rgba(148, 163, 184, 1);
      font-size: 24px;
      cursor: pointer;
      &:hover { color: $white; }
    }
  }
}

.picker-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 16px;
  
  .empty { padding: 40px; text-align: center; color: $muted; font-size: 14px; }
}

.pokemon-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.pokemon-card {
  @include pokemon-list-item-standard(12px);
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 15px;
  cursor: pointer;
}

.sprite-wrap {
  width: 48px;
  height: 48px;
  background: Rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  .pixelated { width: 44px; height: 44px; @include pixelated; }
}

.info {
  flex: 1;
  .name-team {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
    .name { font-size: 14px; font-weight: 700; color: $white; }
    .lvl { font-size: 11px; color: Rgba(148, 163, 184, 1); }
  }
  .stats {
    display: flex;
    gap: 12px;
    font-size: 11px;
    color: Rgba(203, 213, 225, 1);
    .gender {
      &.m { color: Rgba(59, 130, 246, 1); }
      &.f { color: Rgba(236, 72, 153, 1); }
    }
  }
}

.compat-tag {
  display: inline-block;
  font-size: 10px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 4px;
  margin-top: 6px;
  text-transform: uppercase;
  
  &.level-0 { background: Rgba(239, 68, 68, 0.1); color: Rgba(239, 68, 68, 1); }
  &.level-1 { background: Rgba(245, 158, 11, 0.1); color: Rgba(245, 158, 11, 1); }
  &.level-2, &.level-3 { background: Rgba(34, 197, 94, 0.1); color: Rgba(34, 197, 94, 1); }
}
</style>
