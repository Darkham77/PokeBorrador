<script setup>
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBreedingStore } from '@/stores/breeding'

const props = defineProps({
  isOpen: Boolean,
  mode: { type: String, default: 'daycare' }, // 'daycare' or 'mission'
  slotIdx: { type: Number, default: 0 },
  missionIdx: { type: Number, default: -1 }
})

const emit = defineEmits(['close'])

const gameStore = useGameStore()
const breedingStore = useBreedingStore()

const searchQuery = ref('')

const allPokemon = computed(() => {
  const team = gameStore.state.team || []
  const box = gameStore.state.box || []
  // Filter out pokemon already in daycare
  return [...team, ...box].filter(p => !breedingStore.slots.some(s => s.pokemon_id === p.uid))
})

const filteredPokemon = computed(() => {
  let list = allPokemon.value
  
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))
  }

  // If in mission mode, filter by mission requirement
  if (props.mode === 'mission' && props.missionIdx !== -1) {
    const m = gameStore.state.daycare_missions[props.missionIdx]
    const targetId = m.targetId
    list = list.filter(p => {
      // Basic evolution check (breedingBaseId logic would be better if available globally)
      const baseId = p.id // simplified for now
      if (baseId !== targetId) return false
      
      const req = m.requirement || { type: 'level', minLevel: m.minLevel }
      if (req.type === 'level') return p.level >= req.minLevel
      if (req.type === 'iv_total') {
        const total = (p.ivs.hp || 0) + (p.ivs.atk || 0) + (p.ivs.def || 0) + (p.ivs.spa || 0) + (p.ivs.spd || 0) + (p.ivs.spe || 0)
        return total >= req.minIvTotal
      }
      if (req.type === 'nature') return p.nature === req.nature
      if (req.type === 'iv_31') return p.ivs[req.stat31] === 31
      return true
    })
  }

  return list
})

const selectPokemon = (p) => {
  if (props.mode === 'daycare') {
    breedingStore.depositPokemon(props.slotIdx, p.uid)
  } else {
    // Mission delivery logic handled in store eventually
    breedingStore.deliverMission(props.missionIdx, p.uid)
  }
  emit('close')
}

const getCompatibility = (p) => {
  if (props.mode !== 'daycare') return null
  const otherSlotIdx = props.slotIdx === 0 ? 1 : 0
  const otherPoke = breedingStore.slots[otherSlotIdx]?.pokemon
  if (!otherPoke) return null
  
  return breedingStore.checkCompatibility(p, otherPoke)
}

const getSprite = (id, shiny) => {
  return window.getSpriteUrl?.(id, shiny) || ''
}
</script>

<template>
  <div
    v-if="isOpen"
    class="picker-overlay"
    @click.self="emit('close')"
  >
    <div class="picker-container">
      <div class="picker-header">
        <h3 v-if="mode === 'daycare'">
          SELECCIONAR PARA SLOT {{ slotIdx + 1 }}
        </h3>
        <h3 v-else>
          ENTREGAR POKÉMON PARA MISIÓN
        </h3>
        <button
          class="close-btn"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <div class="picker-search">
        <input
          v-model="searchQuery"
          placeholder="Buscar por nombre..."
        >
      </div>

      <div class="pokemon-grid">
        <div 
          v-for="p in filteredPokemon" 
          :key="p.uid" 
          class="poke-card"
          @click="selectPokemon(p)"
        >
          <div class="sprite-box">
            <img
              :src="getSprite(p.id, p.isShiny)"
              class="poke-sprite"
            >
          </div>
          <div class="poke-info">
            <div class="top-row">
              <span class="name">{{ p.name }}</span>
              <span class="lv">Lvl.{{ p.level }}</span>
            </div>
            <div class="genetics">
              IVs: {{ p.ivs.hp }}/{{ p.ivs.atk }}/{{ p.ivs.def }}/{{ p.ivs.spa }}/{{ p.ivs.spd }}/{{ p.ivs.spe }}
            </div>
            
            <div
              v-if="mode === 'daycare'"
              class="compat-status"
            >
              <template v-if="getCompatibility(p)">
                <span :style="{ color: breedingStore.COMPAT_TEXT[getCompatibility(p).level].color }">
                  {{ breedingStore.COMPAT_TEXT[getCompatibility(p).level].label }}
                </span>
                <span
                  v-if="getCompatibility(p).eggSpecies"
                  class="egg-hint"
                >
                  🥚 {{ getCompatibility(p).eggSpecies }}
                </span>
              </template>
              <template v-else>
                <span style="color: var(--gray)">Pendiente de pareja</span>
              </template>
            </div>
          </div>
          <div
            v-if="p.vigor !== undefined"
            class="vigor-badge"
            :class="{ low: p.vigor <= 2 }"
          >
            ⚡ {{ p.vigor }}
          </div>
        </div>
        <div
          v-if="filteredPokemon.length === 0"
          class="empty-state"
        >
          No hay Pokémon que coincidan.
        </div>
      </div>

      <div class="picker-footer">
        <button
          class="cancel-btn"
          @click="emit('close')"
        >
          CANCELAR
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(8px);
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.picker-container {
  background: #12121e;
  width: 100%;
  max-width: 500px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.1);
  display: flex;
  flex-direction: column;
  max-height: 80vh;
  box-shadow: 0 20px 60px rgba(0,0,0,0.6);
}

.picker-header {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.picker-header h3 {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: var(--yellow);
  margin: 0;
}

.close-btn { background: none; border: none; color: var(--gray); font-size: 20px; cursor: pointer; }

.picker-search {
  padding: 15px 20px;
}

.picker-search input {
  width: 100%;
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.1);
  padding: 12px;
  border-radius: 12px;
  color: #fff;
  font-size: 12px;
}

.pokemon-grid {
  flex: 1;
  overflow-y: auto;
  padding: 10px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.poke-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 15px;
  cursor: pointer;
  transition: transform 0.1s, background 0.2s;
  position: relative;
}

.poke-card:hover {
  background: rgba(255,255,255,0.08);
  transform: translateX(4px);
}

.sprite-box {
  width: 50px;
  height: 50px;
  background: rgba(0,0,0,0.2);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.poke-sprite { width: 44px; height: 44px; image-rendering: pixelated; }

.poke-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.top-row { display: flex; justify-content: space-between; align-items: center; }
.name { font-weight: 800; color: #fff; font-size: 13px; }
.lv { font-size: 10px; color: var(--gray); }
.genetics { font-size: 9px; color: var(--gray); font-family: monospace; }

.compat-status {
  font-size: 10px;
  font-weight: 700;
  display: flex;
  justify-content: space-between;
}

.egg-hint { color: var(--purple); font-style: italic; }

.vigor-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 8px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.vigor-badge.low {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.2);
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: var(--gray);
  font-size: 12px;
}

.picker-footer {
  padding: 20px;
  border-top: 1px solid rgba(255,255,255,0.05);
}

.cancel-btn {
  width: 100%;
  padding: 14px;
  background: rgba(255,255,255,0.05);
  border: none;
  border-radius: 12px;
  color: var(--gray);
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  cursor: pointer;
}
</style>
