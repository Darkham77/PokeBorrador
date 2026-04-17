<script setup>
import { useBreedingStore } from '@/stores/breeding';
import { useGameStore } from '@/stores/game';
import { useUIStore } from '@/stores/ui';
import { POKEMON_DB } from '@/data/pokemonDB';

const breedingStore = useBreedingStore();
const gameStore = useGameStore();
const uiStore = useUIStore();

const getPokemonName = (id) => POKEMON_DB[id]?.name || 'Huevo';

const handleClaim = (egg) => {
  const cost = egg.inherited_ivs?._cost || 0;
  if (confirm(`¿Quieres recoger este huevo de ${getPokemonName(egg.species)}? Costo: ₽${cost.toLocaleString()}`)) {
    breedingStore.claimEgg(egg.id);
  }
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
        @click="handleClaim(egg)"
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
.egg-warehouse {
  padding: 10px 0;
}

.warehouse-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  
  h3 { font-family: 'Press Start 2P', cursive; font-size: 10px; color: #a855f7; margin-bottom: 6px; }
  p { font-size: 12px; color: #64748b; }
}

.count-badge {
  background: rgba(168, 85, 247, 0.1);
  border: 1px solid rgba(168, 85, 247, 0.3);
  color: #a855f7;
  padding: 6px 12px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 800;
  
  &.empty {
    background: rgba(148, 163, 184, 0.1);
    border-color: rgba(148, 163, 184, 0.2);
    color: #64748b;
  }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #475569;
  
  .icon { font-size: 48px; margin-bottom: 16px; opacity: 0.3; }
  p { font-size: 14px; }
}

.egg-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.egg-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
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
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(168, 85, 247, 0.4);
    transform: translateY(-4px);
    
    .egg-hover-action {
      transform: translateY(0);
    }
  }
}

.egg-visual {
  width: 64px;
  height: 64px;
  background: rgba(0, 0, 0, 0.2);
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
  background: #a855f7;
  color: #fff;
  font-size: 6px;
  font-family: 'Press Start 2P', cursive;
  padding: 2px 4px;
  border-radius: 4px;
  white-space: nowrap;
}

.egg-info {
  text-align: center;
  .name { font-size: 13px; font-weight: 700; color: #f1f5f9; margin-bottom: 4px; }
  .cost {
    font-size: 10px;
    color: #94a3b8;
    span { color: #facc15; font-weight: 800; }
  }
}

.egg-hover-action {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #a855f7;
  color: #fff;
  font-family: 'Press Start 2P', cursive;
  font-size: 8px;
  padding: 8px 0;
  text-align: center;
  transform: translateY(100%);
  transition: transform 0.2s;
}
</style>
