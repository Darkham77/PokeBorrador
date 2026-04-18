<script setup>
import { computed } from 'vue';
import { useGameStore } from '@/stores/game';
import { useBreedingStore } from '@/stores/breeding';
import { getSpriteUrl, getPokemonTier } from '@/logic/pokemonUtils';
import { checkCompatibility } from '@/logic/breeding/breedingEngine';
import { validateMissionPokemon } from '@/logic/breeding/missionEngine';

const props = defineProps({
  slotIndex: { type: Number, required: true },
  otherParent: { type: Object, default: null },
  mode: { type: String, default: 'deposit' }, // deposit | delivery
  mission: { type: Object, default: null }
});

const emit = defineEmits(['select', 'close']);

const gameStore = useGameStore();
const breedingStore = useBreedingStore();

const availablePokemon = computed(() => {
  // Filter out pokemon already in daycare
  const inDaycareUids = breedingStore.slots.map(s => s.pokemon?.uid);
  
  const all = [...gameStore.state.team, ...(gameStore.state.box || [])];
  
  let filtered = all.filter(p => !inDaycareUids.includes(p.uid) && !p.onMission && !p.onDefense);

  // Mode: Deposit (pairing with another parent)
  if (props.mode === 'deposit' && props.otherParent) {
    filtered = [...filtered].sort((a, b) => {
      const cpA = checkCompatibility(props.otherParent, a).level;
      const cpB = checkCompatibility(props.otherParent, b).level;
      return cpB - cpA;
    });
  }

  // Mode: Delivery (matching mission requirements)
  if (props.mode === 'delivery' && props.mission) {
    filtered = filtered.filter(p => validateMissionPokemon(p, props.mission));
  }

  return filtered;
});

const selectPokemon = (p) => {
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
          @click="emit('close')"
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
            @click="selectPokemon(p)"
          >
            <div class="sprite-wrap">
              <img
                :src="getSpriteUrl(p.id, p.isShiny)"
                :alt="p.name"
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
.daycare-picker-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.daycare-picker {
  background: #1e293b;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  border-radius: 20px;
  border: 1px solid #334155;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);

  header {
    padding: 20px;
    background: rgba(15, 23, 42, 0.5);
    border-bottom: 1px solid #334155;
    position: relative;
    text-align: center;

    h3 { font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 4px; }
    p { font-size: 12px; color: #94a3b8; }
    
    .btn-close {
      position: absolute;
      top: 15px;
      right: 15px;
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 24px;
      cursor: pointer;
      &:hover { color: #fff; }
    }
  }
}

.picker-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  
  .empty { padding: 40px; text-align: center; color: #64748b; font-size: 14px; }
}

.pokemon-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.pokemon-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 15px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateX(4px);
  }
}

.sprite-wrap {
  width: 48px;
  height: 48px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  img { width: 44px; height: 44px; image-rendering: pixelated; }
}

.info {
  flex: 1;
  .name-team {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
    .name { font-size: 14px; font-weight: 700; color: #fff; }
    .lvl { font-size: 11px; color: #94a3b8; }
  }
  .stats {
    display: flex;
    gap: 12px;
    font-size: 11px;
    color: #cbd5e1;
    .gender {
      &.m { color: #3b82f6; }
      &.f { color: #ec4899; }
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
  
  &.level-0 { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
  &.level-1 { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
  &.level-2, &.level-3 { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
}
</style>
