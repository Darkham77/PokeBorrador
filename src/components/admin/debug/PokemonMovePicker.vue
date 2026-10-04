<script setup lang="ts">
import { ref, computed } from 'vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { type PokemonMoveId, isPokemonMoveId, requirePokemonMoveId, MOVE_TRANSLATIONS_ES } from '@/data/battle/moves'

interface Props {
  modelValue: (PokemonMoveId | null)[]
  speciesMoves: PokemonMoveId[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: (PokemonMoveId | null)[]): void
  (e: 'autoFill'): void
  (e: 'randomFill'): void
}>()
const moveSearch = ref('')
const activeMoveSlot = ref<number | null>(null)

// Pre-map all moves with their Spanish translation for fast search (search bar only)
const allMovesList = Object.keys(MOVE_TRANSLATIONS_ES).map(rawId => {
  const id = requirePokemonMoveId(rawId)
  const moveData = pokemonDataProvider.getMoveData(id)
  return {
    id,
    nameEs: moveData.name
  }
})


const filteredMoves = computed<PokemonMoveId[]>(() => {
  const s = moveSearch.value.toLowerCase().trim()
  if (!s) return props.speciesMoves
  
  const MOVE_SEARCH_MAX_RESULTS = 30;
  return allMovesList
    .filter(m => m.id.toLowerCase().includes(s) || m.nameEs.toLowerCase().includes(s))
    .map(m => m.id)
    .slice(0, MOVE_SEARCH_MAX_RESULTS)
})

function getMoveDisplayName(id: PokemonMoveId | null | undefined): string {
  if (!id || !isPokemonMoveId(id)) return ''
  const md = pokemonDataProvider.getMoveData(id)
  return md ? md.name.toUpperCase() : id.toUpperCase()
}

function addMove(m: PokemonMoveId, slotIndex: number) {
  const newMoves = [...props.modelValue]
  newMoves[slotIndex] = m
  emit('update:modelValue', newMoves)
  activeMoveSlot.value = null
  moveSearch.value = ''
}

function removeMove(slotIndex: number) {
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
            id="debug-btn-auto-moves"
            class="btn-magic-fill"
            @click.stop="$emit('autoFill')"
          >
            <span class="emoji">🪄</span>
          </button>
        </PVTooltip>
        <PVTooltip
          title="Ataques al azar"
          description="Selecciona hasta 4 ataques al azar legales según su nivel y learnset (nivel, MT, huevo, tutor)."
        >
          <button
            class="btn-magic-fill btn-random-fill"
            @click.stop="$emit('randomFill')"
          >
            <span class="emoji">🎲</span>
          </button>
        </PVTooltip>
      </div>
    </div>
    <div class="move-slots">
      <div
        v-for="i in 4"
        :id="`debug-move-slot-${i}`"
        :key="i"
        class="move-slot"
      >
        <div
          v-if="modelValue[i-1]"
          class="move-pill"
          @click.stop="activeMoveSlot = i"
        >
          <span class="mv-name">{{ getMoveDisplayName(modelValue[i-1]) }}</span>
          <button
            :id="`debug-move-remove-${i}`"
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
            id="debug-move-search-input"
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
              :id="`debug-move-option-${m}`" 
              :key="m"
              class="move-item"
              @click.stop="addMove(m, i-1)"
            >
              {{ getMoveDisplayName(m) }}
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
    
    label { color: Rgb(255 255 255 / 40%); font-size: 10px; }
    
    .header-actions {
      display: flex;
      gap: 6px;
    }

    .btn-magic-fill {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 24px;
      height: 24px;
      border: 1px solid Rgb(124 58 237 / 20%);
      border-radius: 6px;
      background: Rgb(124 58 237 / 10%);
      color: var(--vicio-primary);
      cursor: pointer;
      
      &:hover {
        background: var(--vicio-primary);
        color: white;
        transform: Scale(1.1);
      }
      

      &.btn-random-fill {
        background: Rgb(255 170 0 / 10%);
        color: var(--yellow);
        border-color: Rgb(255 170 0 / 20%);
        
        &:hover { background: var(--yellow); color: $black; }
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
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 10px;
    border: 1px solid Rgb(255 255 255 / 10%);
    border-radius: 8px;
    background: Rgb(255 255 255 / 5%);
    cursor: pointer;
    

    &:hover { background: Rgb(255 255 255 / 10%); }
    
    .mv-name { color: white; font-size: 11px; font-weight: bold; }
    
    .remove-move {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 18px;
      height: 18px;
      border: none;
      border-radius: 4px;
      background: Rgb(239 68 68 / 10%);
      color: Rgb(239 68 68 / 100%);
      font-size: 14px;
      cursor: pointer;
      
      &:hover { background: Rgb(239 68 68 / 100%); color: white; }
    }

    &.empty {
      justify-content: center;
      color: Rgb(255 255 255 / 30%);
      font-size: 8px;
      border-style: dashed;
      
      &:hover { color: white; border-color: var(--vicio-primary); }
    }
  }

  .move-picker {
    @include gpu-layer;

    position: absolute;
    bottom: 100%;
    left: 0;
    z-index: var(--z-critical);
    width: 220px;
    max-height: 300px;
    padding: 12px;
    border: 1px solid Rgb(255 255 255 / 10%);
    border-radius: 16px;
    background: Rgb(10 12 16 / 98%);
    margin-bottom: 12px;
    -webkit-will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  backdrop-filter: Blur(20px);
    box-shadow: 0 20px 50px Rgb(0 0 0 / 100%);

    .move-search-input {
      width: 100%;
      padding: 10px;
      border: 1px solid Rgb(255 255 255 / 10%);
      border-radius: 8px;
      background: Rgb(255 255 255 / 5%);
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
      min-height: 0;
      max-height: 200px;
      overflow-y: auto;
      margin-bottom: 10px;

      .move-group-label {
        padding: 4px 8px;
        color: Rgb(255 255 255 / 30%);
        font-size: 9px;
        letter-spacing: 1px;
      }

      .move-item {
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 11px;
        cursor: pointer;
        
        
        &:hover { background: Rgb(124 58 237 / 10%); color: var(--vicio-primary); }
      }
    }

    .close-picker {
      width: 100%;
      padding: 8px;
      border: 1px solid Rgb(255 255 255 / 10%);
      border-radius: 8px;
      background: Rgb(255 255 255 / 5%);
      color: Rgb(255 255 255 / 50%);
      font-size: 9px;
      cursor: pointer;
      
      &:hover { background: Rgb(255 255 255 / 10%); color: white; }
    }
  }
}
</style>
