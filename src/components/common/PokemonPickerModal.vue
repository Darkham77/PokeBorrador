<script setup>
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { getSpriteUrl } from '@/logic/pokemonUtils'

const props = defineProps({
  title: { type: String, default: 'Seleccionar Pokémon' },
  subtitle: { type: String, default: '' },
  maxSelect: { type: Number, default: 1 },
  typeFilter: { type: String, default: null },
  context: { type: String, default: 'box' }, // 'box' or 'team'
  excludeOnMission: { type: Boolean, default: true },
  excludeInDaycare: { type: Boolean, default: true }
})

const emit = defineEmits(['confirm', 'close'])

const gameStore = useGameStore()
const selectedIndices = ref([])

const pokemonList = computed(() => {
  const source = props.context === 'team' ? (gameStore.state.team || []) : (gameStore.state.box || [])
  return source.map((p, i) => ({ ...p, originalIndex: i }))
    .filter(p => {
      if (props.typeFilter && p.type !== props.typeFilter) return false
      if (props.excludeOnMission && p.onMission) return false
      if (props.excludeInDaycare && p.inDaycare) return false
      return true
    })
})

const toggleSelect = (index) => {
  const pos = selectedIndices.value.indexOf(index)
  if (pos > -1) {
    selectedIndices.value.splice(pos, 1)
  } else {
    if (selectedIndices.value.length < props.maxSelect) {
      selectedIndices.value.push(index)
    } else if (props.maxSelect === 1) {
      selectedIndices.value = [index]
    }
  }
}

const handleConfirm = () => {
  if (selectedIndices.value.length === 0) return
  emit('confirm', selectedIndices.value)
}
</script>

<template>
  <div
    class="picker-overlay"
    @click.self="emit('close')"
  >
    <div class="picker-modal animate-pop">
      <header class="picker-header">
        <h3>{{ title }}</h3>
        <p
          v-if="subtitle"
          class="subtitle"
        >
          {{ subtitle }}
        </p>
        <button
          class="close-btn"
          @click="emit('close')"
        >
          ✕
        </button>
      </header>

      <div class="picker-body scrollbar">
        <div
          v-if="pokemonList.length === 0"
          class="empty-state"
        >
          No hay Pokémon disponibles que cumplan los requisitos.
        </div>
        <div
          v-else
          class="pokemon-grid"
        >
          <div 
            v-for="p in pokemonList" 
            :key="p.uid || p.originalIndex"
            class="pokemon-item"
            :class="{ selected: selectedIndices.includes(p.originalIndex) }"
            @click="toggleSelect(p.originalIndex)"
          >
            <div class="selection-indicator">
              <span v-if="selectedIndices.includes(p.originalIndex)">✓</span>
            </div>
            <img
              :src="getSpriteUrl(p.id, p.isShiny)"
              class="p-sprite"
            >
            <div class="p-info">
              <div class="p-name">
                {{ p.name }}
              </div>
              <div class="p-lv">
                Nv. {{ p.level }} · {{ p.type }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer class="picker-footer">
        <div class="selection-count">
          {{ selectedIndices.length }} / {{ maxSelect }} seleccionados
        </div>
        <button 
          class="confirm-btn" 
          :disabled="selectedIndices.length === 0"
          @click="handleConfirm"
        >
          CONFIRMAR
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped lang="scss">
.picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(8px);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.picker-modal {
  width: 100%;
  max-width: 450px;
  background: #111;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.1);
  display: flex;
  flex-direction: column;
  max-height: 80vh;
  box-shadow: 0 20px 40px rgba(0,0,0,0.6);
}

.picker-header {
  padding: 20px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  position: relative;
  text-align: center;

  h3 { margin: 0; font-size: 16px; color: #fff; }
  .subtitle { font-size: 12px; color: var(--gray); margin: 4px 0 0; }
  .close-btn { 
    position: absolute; top: 15px; right: 15px; 
    background: none; border: none; color: #666; font-size: 18px; cursor: pointer;
    &:hover { color: #fff; }
  }
}

.picker-body {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
}

.pokemon-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pokemon-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;

  &:hover {
    background: rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.15);
  }

  &.selected {
    background: rgba(199, 125, 255, 0.1);
    border-color: var(--purple);
  }

  .selection-indicator {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255,255,255,0.1);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
    color: var(--purple);
    
    .selected & {
      background: var(--purple);
      border-color: var(--purple);
      color: #fff;
    }
  }

  .p-sprite { width: 48px; height: 48px; image-rendering: pixelated; }
  .p-info {
    flex: 1;
    .p-name { font-size: 14px; font-weight: 700; color: #fff; }
    .p-lv { font-size: 11px; color: var(--gray); }
  }
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: var(--gray);
  font-size: 13px;
}

.picker-footer {
  padding: 20px;
  border-top: 1px solid rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;

  .selection-count { font-size: 12px; color: var(--gray); }
  .confirm-btn {
    padding: 10px 24px;
    background: var(--purple);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-weight: 700;
    cursor: pointer;
    &:disabled { opacity: 0.5; cursor: not-allowed; }
    &:hover:not(:disabled) { filter: brightness(1.1); }
  }
}

.scrollbar::-webkit-scrollbar { width: 4px; }
.scrollbar::-webkit-scrollbar-track { background: transparent; }
.scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
</style>
