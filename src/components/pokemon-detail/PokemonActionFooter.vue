<script setup>
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'

const props = defineProps({
  context: { type: String, required: true },
  extra: { type: Object, default: null }
})

const emit = defineEmits(['buy', 'evolve'])

const gameStore = useGameStore()

const canBuy = computed(() => {
  if (!props.extra) return false
  return gameStore.state.money >= props.extra.price
})
</script>

<template>
  <footer
    v-if="context === 'team' || context === 'market'"
    class="modal-footer"
  >
    <!-- Evolution Action -->
    <button
      v-if="context === 'team'"
      class="action-btn evolutionary"
      @click="emit('evolve')"
    >
      💎 EVOLUCIONAR CON PIEDRA
    </button>
    
    <!-- Market Purchase Action -->
    <div
      v-if="context === 'market' && extra"
      class="purchase-zone"
    >
      <div class="price">
        ₽{{ extra.price }}
      </div>
      <button 
        class="buy-btn" 
        :disabled="!canBuy"
        @click="emit('buy')"
      >
        {{ !canBuy ? 'SALDO INSUFICIENTE' : 'COMPRAR POKÉMON' }}
      </button>
    </div>
  </footer>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.modal-footer {
  padding: 24px 32px;
  border-top: 1px solid rgba(255,255,255,0.08);
  background: rgba(0,0,0,0.1);
}

.evolutionary {
  @include btn-vicio-primary;
  width: 100%;
}

.purchase-zone {
  display: flex;
  flex-direction: column;
  gap: 16px;

  .price {
    font-family: 'Press Start 2P', monospace;
    font-size: 14px;
    font-weight: 900;
    color: var(--yellow);
    text-align: center;
    text-shadow: 0 0 10px rgba(255, 214, 10, 0.3);
  }
}

.buy-btn {
  @include btn-vicio-primary;
  width: 100%;
}
</style>
