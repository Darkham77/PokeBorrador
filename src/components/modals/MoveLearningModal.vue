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
    :id="id || 'move-learning-modal'"
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
          id="btn-move-learn-cancel"
          class="forget-btn"
          @click.stop="handleForget"
        >
          <span class="emoji">❌</span> CANCELAR Y NO APRENDER
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

    margin: 0 0 12px;
    color: var(--white);
    font-size: 14px;
  }

  p {
    margin: 0;
    color: var(--gray);
    font-size: 13px;
    line-height: 1.5;
    .highlight { color: var(--yellow); font-weight: 800; }
  }
}

.new-move-display {
  padding: 12px;
  border: 1px dashed rgb(255 255 255 / 10%);
  border-radius: 12px;
  background: rgb(255 255 255 / 2%);
  margin-bottom: 24px;

  .new-move-title {
    @include pixelated;

    color: var(--yellow);
    font-size: 8px;
    text-align: center;
    margin-bottom: 8px;
    text-transform: uppercase;
  }

  .new-move-slot-wrapper {
    max-width: 270px;
    margin: 0 auto;
  }
}

.instruction {
  @include pixelated;

  color: var(--gray);
  font-size: 8px;
  line-height: 1.8;
  text-align: center;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.moves-list {
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr 1fr;
  margin-bottom: 24px;
}

.actions-footer {
  max-width: 270px;
  margin: 0 auto;
}

.forget-btn {
  @include pixelated;

  width: 100%;
  padding: 16px;
  border: 1px solid rgb(255 255 255 / 6%);
  border-radius: 14px;
  background: rgb(255 255 255 / 3%);
  color: var(--gray);
  font-size: 9px;
  cursor: pointer;
  
  &:hover {
    background: rgb(239 68 68 / 10%);
    color: rgb(248 113 113 / 100%);
    border-color: rgb(239 68 68 / 100%);
  }
}
</style>
