<script setup lang="ts">
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import BaseModal from '@/components/common/BaseModal.vue'
import BattleMoveSlot from '@/components/battle/BattleMoveSlot.vue'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'

interface Props {
  show?: boolean
  id?: string
}

defineProps<Props>()

const uiStore = useUIStore()

const currentData = computed(() => uiStore.currentMoveToLearn)
const pokemon = computed(() => currentData.value?.pokemon as Pokemon)
const newMove = computed(() => currentData.value?.move as Move)

const handleReplace = (slotIndex: number) => {
  if (!pokemon.value || !newMove.value) return
  
  const oldMove = pokemon.value.moves[slotIndex]
  const oldMoveName = oldMove ? oldMove.name : '???'
  pokemon.value.moves[slotIndex] = { ...newMove.value }
  
  uiStore.notify(`¡${pokemon.value.name} olvidó ${oldMoveName} y aprendió ${newMove.value.name}!`, '📖')
  
  if (currentData.value?.onComplete) {
    currentData.value.onComplete()
  }
  uiStore.finishMoveLearning()
}

const handleForget = () => {
  if (!pokemon.value || !newMove.value) return
  uiStore.notify(`¡${pokemon.value.name} no aprendió ${newMove.value.name}!`, '📖')
  
  if (currentData.value?.onCancel) {
    currentData.value.onCancel()
  }
  uiStore.finishMoveLearning()
}
</script>

<template>
  <BaseModal
    :show="show && !!currentData"
    title="NUEVO MOVIMIENTO"
    max-width="640px"
    variant="retro"
    :prevent-close="true"
    :show-close-button="false"
    @close="handleForget"
  >
    <div class="learning-card-body">
      <header class="card-header">
        <h2>APRENDIENDO TÉCNICA</h2>
        <p><strong>{{ pokemon?.name }}</strong> quiere aprender <span class="highlight">{{ newMove?.name }}</span>.</p>
      </header>

      <div class="new-move-display">
        <div class="new-move-title">
          TÉCNICA NUEVA
        </div>
        <div class="new-move-slot-wrapper">
          <BattleMoveSlot
            :move="newMove"
            :index="4"
            :is-processing="false"
          />
        </div>
      </div>

      <div class="instruction">
        ¿Qué movimiento debería olvidar? (Haz clic en uno para reemplazarlo)
      </div>

      <div class="moves-list">
        <BattleMoveSlot
          v-for="(m, index) in pokemon?.moves" 
          :key="index"
          :move="m"
          :index="Number(index)"
          :player-info="pokemon"
          @use-move="handleReplace"
        />
      </div>

      <div class="actions-footer">
        <button
          class="forget-btn"
          @click.stop="handleForget"
        >
          ❌ CANCELAR Y NO APRENDER
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.learning-card-body {
  padding: 16px;
}

.card-header {
  text-align: center;
  margin-bottom: 24px;

  h2 {
    @include pixelated;
    font-size: 14px;
    color: var(--white);
    margin: 0 0 12px 0;
  }

  p {
    font-size: 13px;
    color: var(--gray);
    margin: 0;
    line-height: 1.5;
    .highlight { color: var(--yellow); font-weight: 800; }
  }
}

.new-move-display {
  margin-bottom: 24px;
  background: Rgba(255, 255, 255, 0.02);
  border: 1px dashed Rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px;

  .new-move-title {
    @include pixelated;
    font-size: 8px;
    color: var(--yellow);
    margin-bottom: 8px;
    text-transform: uppercase;
    text-align: center;
  }

  .new-move-slot-wrapper {
    max-width: 270px;
    margin: 0 auto;
  }
}

.instruction {
  @include pixelated;
  font-size: 8px;
  color: var(--gray);
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 1px;
  text-align: center;
  line-height: 1.8;
}

.moves-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 24px;
}

.actions-footer {
  max-width: 270px;
  margin: 0 auto;
}

.forget-btn {
  width: 100%;
  padding: 16px;
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  color: var(--gray);
  @include pixelated;
  font-size: 9px;
  cursor: pointer;
  
  &:hover {
    background: Rgba(239, 68, 68, 0.1);
    color: Rgba(248, 113, 113, 1);
    border-color: Rgba(239, 68, 68, 1);
  }
}
</style>
