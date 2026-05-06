<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'

interface Props {
  context: string
  canEvolveStone?: boolean
  extra?: any | null
}

const props = withDefaults(defineProps<Props>(), {
  canEvolveStone: false,
  extra: null
})

const emit = defineEmits<{
  (e: 'buy'): void
  (e: 'evolve'): void
}>()

const gameStore = useGameStore() as any

const canBuy = computed(() => {
  if (!props.extra) return false
  return gameStore.state.money >= props.extra.price
})

const hasActions = computed(() => {
  if (props.context === 'team') return props.canEvolveStone
  if (props.context === 'market') return !!props.extra
  return false
})
</script>

<template>
  <footer
    v-if="hasActions"
    class="modal-footer"
  >
    <!-- Evolution Action -->
    <button
      v-if="context === 'team' && canEvolveStone"
      class="action-btn evolutionary"
      @click.stop="emit('evolve')"
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
        @click.stop="emit('buy')"
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
  border-top: 1px solid Rgba(255,255,255,0.08);
  background: Rgba(0,0,0,0.1);
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
    @include pixelated;
    font-size: 14px;
    font-weight: 900;
    color: var(--yellow);
    text-align: center;
    text-shadow: 0 0 10px Rgba(255, 214, 10, 0.3);
  }
}

.buy-btn {
  @include btn-vicio-primary;
  width: 100%;
}
</style>
