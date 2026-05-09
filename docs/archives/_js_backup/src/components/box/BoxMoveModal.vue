<script setup>
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBoxStore } from '@/stores/box'
import { useUIStore } from '@/stores/ui'
import { useModalStore } from '@/stores/modals'
import BaseModal from '@/components/common/BaseModal.vue'

const props = defineProps({
  pokemon: { type: Object, required: true },
  boxIndex: { type: Number, required: true }
})

const gameStore = useGameStore()
const boxStore = useBoxStore()
const uiStore = useUIStore()
const modalStore = useModalStore()

const currentBox = computed(() => Math.floor(props.boxIndex / 50))

const boxesOccupation = computed(() => {
  const result = []
  const boxArray = gameStore.state.box || []
  const totalBoxes = gameStore.state.boxCount || 4
  
  for (let i = 0; i < totalBoxes; i++) {
    const start = i * 50
    const end = start + 50
    const slice = boxArray.slice(start, end)
    const count = slice.filter(p => p != null).length
    result.push({ 
      index: i, 
      number: i + 1, 
      count, 
      isFull: count >= 50,
      isCurrent: i === currentBox.value
    })
  }
  return result
})

const handleMove = (targetBoxIndex) => {
  const target = boxesOccupation.value[targetBoxIndex]
  if (target.isFull) {
    uiStore.notify('Esa caja está llena.', '⚠️')
    return
  }
  
  const res = boxStore.movePokemonToBox(props.boxIndex, targetBoxIndex)
  if (res.success) {
    uiStore.notify(res.msg, '📦')
    modalStore.close('BoxMove')
    modalStore.close('BoxPokemonMenu')
  }
}
</script>

<template>
  <BaseModal
    show
    title="MOVER POKÉMON"
    max-width="450px"
    @close="modalStore.close('BoxMove')"
  >
    <div class="box-move-container">
      <p class="move-message">
        ¿A qué caja querés mover a <span class="p-name">{{ pokemon.name }}</span>?
      </p>

      <div class="boxes-grid">
        <button
          v-for="box in boxesOccupation"
          :key="box.index"
          :class="[
            'box-select-btn',
            { 
              'is-full': box.isFull, 
              'is-current': box.isCurrent 
            }
          ]"
          :disabled="box.isFull || box.isCurrent"
          @click.stop="handleMove(box.index)"
        >
          <div class="btn-inner">
            <div class="box-number">
              CAJA {{ box.number }}
            </div>
            <div class="box-stats">
              <span class="count">{{ box.count }}</span>
              <span class="max">/ 50</span>
            </div>
            
            <div class="status-tags">
              <span
                v-if="box.isCurrent"
                class="tag current"
              >ACTUAL</span>
              <span
                v-else-if="box.isFull"
                class="tag full"
              >LLENA</span>
              <span
                v-else
                class="tag available"
              >DISPONIBLE</span>
            </div>
          </div>
          <div class="border-glow" />
        </button>
      </div>

      <div class="modal-footer">
        <button
          class="btn-cancel"
          @click.stop="modalStore.close('BoxMove')"
        >
          CANCELAR
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.box-move-container {
  padding: 15px;
  
  .move-message {
    @include pixelated;
    font-size: 11px;
    text-align: center;
    margin-bottom: 25px;
    color: Var(--white);
    line-height: 1.5;
    text-transform: uppercase;

    .p-name {
      color: Var(--yellow);
      font-weight: 900;
    }
  }
}

.boxes-grid {
  display: grid;
  grid-template-columns: Repeat(2, 1fr);
  gap: 15px;
  margin-bottom: 30px;
}

.box-select-btn {
  @include Glass(Rgba(30, 41, 59, 0.4), 12px); 
  padding: 1px;
  position: relative;
  cursor: pointer;
  transition: all 0.3s Cubic-Bezier(0.4, 0, 0.2, 1);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  .btn-inner {
    padding: 20px 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    background: transparent;
    z-index: Var(--z-base);
    position: relative;
    width: 100%;
  }

  .border-glow {
    position: absolute;
    inset: 0;
    background: Radial-Gradient(circle at center, Rgba(255,255,255,0.05) 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.3s ease;
    z-index: Calc(Var(--z-base) - 1);
  }

  &:hover:Not(:disabled) {
    transform: TranslateY(-4px);
    border-color: Var(--yellow) !important;
    box-shadow: 0 10px 25px Rgba(0, 0, 0, 0.3), 0 0 15px Rgba(251, 191, 36, 0.2);
    
    .border-glow { opacity: 1; }
    .box-number { color: Var(--yellow); }
  }

  &:disabled {
    cursor: not-allowed;
    filter: Grayscale(1);
    opacity: 0.4;
  }

  &.is-current {
    border-color: Var(--blue) !important;
    .box-number { color: Var(--blue); }
  }

  &.is-full {
    border-color: Var(--red) !important;
    .box-number { color: Var(--red); }
  }

  .box-number {
    @include pixelated;
    font-size: 10px;
    color: Var(--white);
    transition: color 0.3s ease;
  }

  .box-stats {
    display: flex;
    align-items: baseline;
    gap: 3px;
    
    .count {
      @include pixelated;
      font-size: 14px;
      color: Var(--white);
      font-weight: 900;
    }
    .max {
      font-size: 8px;
      color: Var(--gray);
    }
  }

  .status-tags {
    margin-top: 5px;
    
    .tag {
      @include pixelated;
      font-size: 6px;
      padding: 3px 8px;
      border-radius: 4px;
      text-transform: uppercase;

      &.current { background: Var(--blue); color: white; }
      &.full { background: Var(--red); color: white; }
      &.available { background: Rgba(255, 255, 255, 0.05); color: Var(--gray); }
    }
  }
}

.modal-footer {
  margin-top: 10px;
  
  .btn-cancel {
    @include btn-Vicio('neutral', 'lg', true);
    @include pixelated;
    font-size: 10px;
  }
}
</style>
