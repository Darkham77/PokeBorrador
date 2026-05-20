<script setup lang="ts">
import { useBreedingStore } from '@/stores/breeding';
import { useUIStore } from '@/stores/ui';
import { POKEMON_DB } from '@/data/pokemonDB';
import type { DaycareEgg } from '@/types/breeding';

const breedingStore = useBreedingStore();
const uiStore = useUIStore();

const getPokemonName = (id: string) => (POKEMON_DB as Record<string, { name: string }>)[id]?.name || 'Huevo';

const handleClaim = (egg: DaycareEgg) => {
  const cost = egg.inherited_ivs?._cost as number || 0;
  uiStore.openConfirm({
    title: 'RECOGER HUEVO',
    message: `¿Quieres recoger este huevo de ${getPokemonName(egg.species)} por ₽${cost.toLocaleString()}?`,
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
        🥚
      </div>
      <p>El almacén está vacío. ¡Pon a criar a tus Pokémon!</p>
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
            🥚
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
            {{ getPokemonName(egg.species) }}
          </div>
          <div class="cost">
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
  
  .icon { font-size: 48px; margin-bottom: 16px; opacity: 0.3; }
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
  transition: all 0.2s;
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
  font-size: 32px;
  position: relative;
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
  .name { font-size: 13px; font-weight: 700; color: Rgba(241, 245, 249, 1); margin-bottom: 4px; }
  .cost {
    font-size: 10px;
    color: Rgba(148, 163, 184, 1);
    span { color: Rgba(250, 204, 21, 1); font-weight: 800; }
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
  transition: transform 0.2s;
}
</style>
