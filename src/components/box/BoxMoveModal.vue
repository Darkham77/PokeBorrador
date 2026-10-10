<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBoxStore } from '@/stores/box'
import { useUIStore } from '@/stores/ui'
import { useModalStore } from '@/stores/modals'
import BaseModal from '@/components/common/BaseModal.vue'

import type { Pokemon } from '@/types/pokemon/pokemon'

interface Props {
  pokemon: Pokemon
  boxIndex: number
}

const props = defineProps<Props>()

const gameStore = useGameStore()
const boxStore = useBoxStore()
const uiStore = useUIStore()
const modalStore = useModalStore()

const currentBox = computed(() => Math.floor(props.boxIndex / BOX_CAPACITY_SLOTS))

const BOX_CAPACITY_SLOTS = 50

const boxesOccupation = computed(() => {
  const result: Array<{ index: number; number: number; count: number; isFull: boolean; isCurrent: boolean }> = []
  const boxArray = (gameStore.state.box || []) as (Pokemon | null)[]
  const totalBoxes = gameStore.state.boxCount || 4
  
  for (let i = 0; i < totalBoxes; i++) {
    const start = i * BOX_CAPACITY_SLOTS
    const end = start + BOX_CAPACITY_SLOTS
    const slice = boxArray.slice(start, end)
    const count = slice.filter((p) => p != null).length
    result.push({ 
      index: i, 
      number: i + 1, 
      count, 
      isFull: count >= BOX_CAPACITY_SLOTS,
      isCurrent: i === currentBox.value
    })
  }
  return result
})

const handleMove = (targetBoxIndex: number) => {
  const target = boxesOccupation.value[targetBoxIndex]
  if (target?.isFull) {
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
    emoji="⚡"
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
          id="box-move-modal-btn-1"
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
          <span class="btn-inner">
            <span class="box-number">
              CAJA {{ box.number }}
            </span>
            <span class="box-stats">
              <span class="count">{{ box.count }}</span>
              <span class="max">/ 50</span>
            </span>

            <span class="status-tags">
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
            </span>
          </span>
          <span class="border-glow" />
        </button>
      </div>

      <div class="modal-footer">
        <button
          id="box-move-modal-btn-cancelar"
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

    color: var(--white);
    font-size: var(--font-11);
    line-height: 1.5;
    text-align: center;
    margin-bottom: 25px;
    text-transform: uppercase;

    .p-name {
      color: var(--yellow);
      font-weight: 900;
    }
  }
}

.boxes-grid {
  display: grid;
  gap: $spacing-md-15;
  grid-template-columns: repeat(2, 1fr);
  margin-bottom: 30px;
}

.box-select-btn {
  @include shell(Rgba(30, 41, 59, 0.4));

  position: relative;
  display: flex;
  flex-direction: column; 
  padding: 1px;
  border-radius: $radius-xl;
  cursor: pointer;
  overflow: hidden;

  &:hover:not(:disabled) {
    transform: Translatey(-4px);
    border-color: var(--yellow) !important;
    box-shadow: var(--shadow-xl);
    
    .border-glow { opacity: 1; }
    .box-number { color: var(--yellow); }
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    will-change: transform, filter, opacity;
  filter: Grayscale(1);
  }

  .btn-inner {
    position: relative;
    z-index: var(--z-base);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-sm;
    width: 100%;
    padding: 20px 10px;
    background: transparent;
  }

  .border-glow {
    position: absolute;
    z-index: calc(var(--z-base) - 1);
    background: Radial-Gradient(circle at center, Rgb(255 255 255 / 5%) 0%, transparent 70%);
    opacity: 0;
    inset: 0;
  }

  &.is-current {
    border-color: var(--blue) !important;
    .box-number { color: var(--blue); }
  }

  &.is-full {
    border-color: var(--red) !important;
    .box-number { color: var(--red); }
  }

  .box-number {
    @include pixelated;

    color: var(--white);
    font-size: var(--font-10);
    
  }

  .box-stats {
    display: flex;
    align-items: baseline;
    gap: $spacing-xs-alt;
    
    .count {
      @include pixelated;

      color: var(--white);
      font-size: var(--font-14);
      font-weight: 900;
    }
    .max {
      color: var(--gray);
      font-size: var(--font-8);
    }
  }

  .status-tags {
    margin-top: 5px;
    
    .tag {
      @include pixelated;

      padding: 3px 8px;
      border-radius: $radius-sm;
      font-size: var(--font-6);
      text-transform: uppercase;

      &.current { background: var(--blue); color: var(--white); }
      &.full { background: var(--red); color: var(--white); }
      &.available { background: Rgb(255 255 255 / 5%); color: var(--gray); }
    }
  }
}

.modal-footer {
  margin-top: 10px;
  
  .btn-cancel {
    @include btn-vicio('neutral', 'lg', true);
    @include pixelated;

    font-size: var(--font-10);
  }
}
</style>
