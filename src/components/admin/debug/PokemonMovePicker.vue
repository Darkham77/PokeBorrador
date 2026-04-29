<script setup>
import { ref, computed } from 'vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { MOVE_DATA } from '@/data/moves'

const props = defineProps({
  modelValue: {
    type: Array,
    required: true
  },
  speciesMoves: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['update:modelValue', 'autoFill', 'randomFill'])

const moveSearch = ref('')
const activeMoveSlot = ref(null)

const allMovesList = Object.keys(MOVE_DATA)
const filteredMoves = computed(() => {
  const s = moveSearch.value.toLowerCase()
  if (!s) return props.speciesMoves
  return allMovesList.filter(m => m.toLowerCase().includes(s)).slice(0, 30)
})

function addMove(m, slotIndex) {
  const newMoves = [...props.modelValue]
  newMoves[slotIndex] = m
  emit('update:modelValue', newMoves)
  activeMoveSlot.value = null
  moveSearch.value = ''
}

function removeMove(slotIndex) {
  const newMoves = [...props.modelValue]
  newMoves.splice(slotIndex, 1)
  newMoves.push(null)
  emit('update:modelValue', newMoves)
}
</script>

<template>
  <div class="moves-section">
    <div class="section-header-row">
      <label>ATAQUES (MODO HÍBRIDO)</label>
      <div class="header-actions">
        <PVTooltip
          title="Autocompletar ataques"
          description="Asigna automáticamente los últimos 4 ataques aprendidos por nivel."
        >
          <button
            class="btn-magic-fill"
            @click.stop="$emit('autoFill')"
          >
            🪄
          </button>
        </PVTooltip>
        <PVTooltip
          title="Ataques al azar"
          description="Selecciona 4 ataques al azar de todo su learnset."
        >
          <button
            class="btn-magic-fill btn-random-fill"
            @click.stop="$emit('randomFill')"
          >
            🎲
          </button>
        </PVTooltip>
      </div>
    </div>
    <div class="move-slots">
      <div
        v-for="i in 4"
        :key="i"
        class="move-slot"
      >
        <div
          v-if="modelValue[i-1]"
          class="move-pill"
          @click.stop="activeMoveSlot = i"
        >
          <span class="m-name">{{ modelValue[i-1].toUpperCase() }}</span>
          <button
            class="remove-move"
            @click.stop="removeMove(i-1)"
          >
            ×
          </button>
        </div>
        <div
          v-else
          class="move-pill empty"
          @click.stop="activeMoveSlot = i"
        >
          + SELECCIONAR
        </div>
        
        <div
          v-if="activeMoveSlot === i"
          class="move-picker custom-scrollbar"
        >
          <input
            v-model="moveSearch"
            type="text"
            placeholder="BUSCAR..."
            class="move-search-input"
            autofocus
            @click.stop
          >
          
          <div class="move-list">
            <div
              v-if="speciesMoves.length > 0 && !moveSearch"
              class="move-group-label"
            >
              LEARNSET
            </div>
            <div 
              v-for="m in filteredMoves" 
              :key="m" 
              class="move-item"
              @click.stop="addMove(m, i-1)"
            >
              {{ m.toUpperCase() }}
            </div>
          </div>
          <button
            class="close-picker"
            @click.stop="activeMoveSlot = null"
          >
            CERRAR
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.moves-section {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .section-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    label { font-size: 10px; color: Rgba(255, 255, 255, 0.4); }
    
    .header-actions {
      display: flex;
      gap: 6px;
    }

    .btn-magic-fill {
      background: Rgba(124, 58, 237, 0.1);
      border: 1px solid Rgba(124, 58, 237, 0.2);
      color: var(--vicio-primary);
      width: 24px;
      height: 24px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;

      &.btn-random-fill {
        background: Rgba(255, 170, 0, 0.1);
        border-color: Rgba(255, 170, 0, 0.2);
        color: var(--yellow);
        
        &:hover { background: var(--yellow); color: $black; }
      }
      
      &:hover {
        background: var(--vicio-primary);
        color: white;
        transform: Scale(1.1);
      }
    }
  }

  .move-slots {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .move-slot {
      position: relative;
      width: 100%;
    }
  }

  .move-pill {
    background: Rgba(255, 255, 255, 0.05);
    border: 1px solid Rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 8px 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    transition: all 0.2s;

    &:hover { background: Rgba(255, 255, 255, 0.1); }
    
    .m-name { font-size: 11px; font-weight: bold; color: white; }
    
    .remove-move {
      background: Rgba(239, 68, 68, 0.1);
      border: none;
      color: Rgba(239, 68, 68, 1);
      width: 18px;
      height: 18px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 14px;
      
      &:hover { background: Rgba(239, 68, 68, 1); color: white; }
    }

    &.empty {
      border-style: dashed;
      color: Rgba(255, 255, 255, 0.3);
      font-size: 8px;
      justify-content: center;
      
      &:hover { color: white; border-color: var(--vicio-primary); }
    }
  }

  .move-picker {
    position: absolute;
    bottom: 100%;
    left: 0;
    width: 220px;
    max-height: 300px;
    margin-bottom: 12px;
    z-index: var(--z-critical);
    background: Rgba(10, 12, 16, 0.98);
    -webkit-backdrop-filter: Blur(20px); backdrop-filter: Blur(20px);
    border-radius: 16px;
    padding: 12px;
    box-shadow: 0 20px 50px Rgba(0, 0, 0, 1);
    border: 1px solid Rgba(255, 255, 255, 0.1);

    .move-search-input {
      width: 100%;
      padding: 10px;
      background: Rgba(255, 255, 255, 0.05);
      border: 1px solid Rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: white;
      font-size: 11px;
      margin-bottom: 12px;
      outline: none;
      
      &:focus { border-color: var(--vicio-primary); }
    }

    .move-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 200px;
      min-height: 0;
      overflow-y: auto;
      margin-bottom: 10px;

      .move-group-label {
        font-size: 9px;
        color: Rgba(255, 255, 255, 0.3);
        padding: 4px 8px;
        letter-spacing: 1px;
      }

      .move-item {
        padding: 8px 12px;
        font-size: 11px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        
        &:hover { background: Rgba(124, 58, 237, 0.1); color: var(--vicio-primary); }
      }
    }

    .close-picker {
      width: 100%;
      padding: 8px;
      background: Rgba(255, 255, 255, 0.05);
      border: 1px solid Rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: Rgba(255, 255, 255, 0.5);
      font-size: 9px;
      cursor: pointer;
      
      &:hover { color: white; background: Rgba(255, 255, 255, 0.1); }
    }
  }
}
</style>
