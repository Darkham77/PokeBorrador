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

<style scoped>
.modal-footer {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.action-btn {
  width: 100%;
  padding: 16px;
  border-radius: 16px;
  border: none;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  cursor: pointer;
  transition: all 0.2s;
}

.evolutionary {
  background: rgba(255,217,61,0.1);
  color: var(--yellow);
  border: 1px solid rgba(255,217,61,0.2);
}

.evolutionary:hover { background: rgba(255,217,61,0.2); }

.purchase-zone .price {
  font-size: 24px;
  font-weight: 900;
  color: var(--yellow);
  text-align: center;
  margin-bottom: 16px;
}

.buy-btn {
  width: 100%;
  padding: 18px;
  background: var(--blue);
  color: #fff;
  border: none;
  border-radius: 16px;
  font-weight: bold;
  cursor: pointer;
}

.buy-btn:disabled { 
  background: #333; 
  cursor: not-allowed; 
  color: #666;
}
</style>
