<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'

interface Props {
  context: string
  canEvolveStone?: boolean
  extra?: { offerId?: string; price?: number; type?: string } | null
}

const props = withDefaults(defineProps<Props>(), {
  canEvolveStone: false,
  extra: null
})

const emit = defineEmits<{
  (e: 'buy'): void
  (e: 'evolve'): void
}>()

const gameStore = useGameStore()

const canBuy = computed(() => {
  if (!props.extra || props.extra.price === undefined) return false
  return gameStore.state.money >= props.extra.price
})

const hasActions = computed(() => {
  if (props.context === 'team' || props.context === 'box') return props.canEvolveStone
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
      v-if="(context === 'team' || context === 'box') && canEvolveStone"
      class="action-btn evolutionary"
      @click.stop="emit('evolve')"
    >
      <span class="emoji">💎</span> EVOLUCIONAR CON PIEDRA
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
        <span v-if="!canBuy">SALDO INSUFICIENTE</span>
        <span v-else><span class="emoji">⚡</span> COMPRAR POKÉMON</span>
      </button>
    </div>
  </footer>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.modal-footer {
  padding: 24px 32px;
  background: rgb(0 0 0 / 10%);
  border-top: 1px solid rgb(255 255 255 / 8%);
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

    color: var(--yellow);
    font-size: 14px;
    font-weight: 900;
    text-align: center;
    text-shadow: 0 0 10px rgb(255 214 10 / 30%);
  }
}

.buy-btn {
  @include btn-vicio-primary;

  width: 100%;
}
</style>
