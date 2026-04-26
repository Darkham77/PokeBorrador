<script setup>
import { ref, computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

const props = defineProps({
  item: { type: Object, required: true },
  mode: { type: String, default: 'action' } // 'action' | 'quantity'
})

const emit = defineEmits(['close', 'use', 'sell', 'discard'])

const quantity = ref(1)

const maxQuantity = computed(() => props.item.qty || 1)
const sellPrice = computed(() => (props.item.sellPrice || 0) * quantity.value)

const setQuantity = (val) => {
  const n = parseInt(val)
  if (isNaN(n)) return
  quantity.value = Math.max(1, Math.min(maxQuantity.value, n))
}

const increment = () => { if (quantity.value < maxQuantity.value) quantity.value++ }
const decrement = () => { if (quantity.value > 1) quantity.value-- }
const setMax = () => { quantity.value = maxQuantity.value }

const handleConfirm = () => {
  if (props.mode === 'sell') emit('sell', quantity.value)
  else if (props.mode === 'discard') emit('discard', quantity.value)
}
</script>

<template>
  <div
    class="inventory-action-overlay"
    @click.stop="$emit('close')"
  >
    <div
      class="action-card animate-pop"
      @click.stop
    >
      <!-- HEADER -->
      <header class="action-header">
        <div class="item-info">
          <img 
            :src="getAssetUrl(ASSET_TYPES.ITEM, item.sprite)" 
            class="item-sprite"
            @error="e => e.target.style.display = 'none'"
          >
          <div class="text-info">
            <span class="item-name">{{ item.name }}</span>
            <span class="item-stock">En posesión: {{ item.qty }}</span>
          </div>
        </div>
        <button
          class="close-btn"
          @click.stop="$emit('close')"
        >
          ×
        </button>
      </header>

      <!-- QUANTITY SELECTOR -->
      <div class="quantity-section">
        <div class="selector-label">
          ¿CUÁNTOS DESEAS {{ mode === 'sell' ? 'VENDER' : 'TIRAR' }}?
        </div>
        
        <div class="selector-controls">
          <button
            class="control-btn"
            :disabled="quantity <= 1"
            @click.stop="decrement"
          >
            -
          </button>
          
          <div class="input-wrapper">
            <input 
              type="number" 
              :value="quantity" 
              class="quantity-input"
              @input="e => setQuantity(e.target.value)"
            >
            <button
              class="max-badge"
              @click.stop="setMax"
            >
              MAX
            </button>
          </div>

          <button
            class="control-btn"
            :disabled="quantity >= maxQuantity"
            @click.stop="increment"
          >
            +
          </button>
        </div>

        <div
          v-if="mode === 'sell'"
          class="profit-preview"
        >
          <span class="label">GANANCIA ESTIMADA:</span>
          <span class="value">₱{{ sellPrice.toLocaleString() }}</span>
        </div>
      </div>

      <!-- FOOTER ACTIONS -->
      <footer class="action-footer">
        <button
          class="vicio-btn neutral"
          @click.stop="$emit('close')"
        >
          CANCELAR
        </button>
        <button 
          class="vicio-btn" 
          :class="mode === 'sell' ? 'primary' : 'danger'"
          @click.stop="handleConfirm"
        >
          {{ mode === 'sell' ? 'VENDER' : 'TIRAR' }} ({{ quantity }})
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_variables" as *;
@use "@/styles/core/_mixins" as *;

.inventory-action-overlay {
  position: absolute;
  inset: 0;
  background: Rgba(0, 0, 0, 0.8);
  -webkit-backdrop-filter: Blur(8px);
  backdrop-filter: Blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  padding: 20px;
}

.action-card {
  width: 100%;
  max-width: 380px;
  background: linear-gradient(180deg, Rgba(30, 41, 59, 1) 0%, Rgba(15, 23, 42, 1) 100%);
  border: 1px solid Rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 20px 60px Rgba(0, 0, 0, 0.8);
}

.action-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;

  .item-info {
    display: flex;
    align-items: center;
    gap: 12px;

    .item-sprite {
      width: 44px;
      height: 44px;
      image-rendering: pixelated;
      filter: Drop-Shadow(0 4px 8px Rgba(0,0,0,0.5));
    }

    .text-info {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .item-name {
        @include pixelated;
        font-size: 11px;
        color: var(--yellow);
      }

      .item-stock {
        font-size: 9px;
        color: Rgba(255, 255, 255, 0.4);
        font-weight: 700;
      }
    }
  }

  .close-btn {
    background: none;
    border: none;
    color: Rgba(255, 255, 255, 0.3);
    font-size: 24px;
    cursor: pointer;
    transition: color 0.2s;
    &:hover { color: white; }
  }
}

.quantity-section {
  background: Rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
  text-align: center;

  .selector-label {
    @include pixelated;
    font-size: 8px;
    color: Rgba(255, 255, 255, 0.5);
    margin-bottom: 16px;
  }

  .selector-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    margin-bottom: 16px;

    .control-btn {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: Rgba(255, 255, 255, 0.05);
      border: 1px solid Rgba(255, 255, 255, 0.1);
      color: white;
      font-size: 20px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover:not(:disabled) {
        background: Rgba(255, 255, 255, 0.1);
        border-color: var(--yellow);
      }

      &:disabled { opacity: 0.3; cursor: not-allowed; }
    }

    .input-wrapper {
      position: relative;
      
      .quantity-input {
        width: 100px;
        background: Rgba(0, 0, 0, 0.4);
        border: 2px solid Rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 12px;
        text-align: center;
        color: white;
        @include pixelated;
        font-size: 18px;
        outline: none;

        &:focus { border-color: var(--yellow); }

        &::-webkit-inner-spin-button,
        &::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      }

      .max-badge {
        position: absolute;
        top: -8px;
        right: -8px;
        background: var(--yellow);
        color: black;
        border: none;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 8px;
        font-weight: 900;
        cursor: pointer;
        @include pixelated;
        box-shadow: 0 4px 10px Rgba(255, 214, 10, 0.3);
      }
    }
  }

  .profit-preview {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    padding-top: 12px;
    border-top: 1px solid Rgba(255, 255, 255, 0.05);

    .label { font-size: 9px; color: Rgba(255, 255, 255, 0.4); font-weight: 700; }
    .value { @include pixelated; font-size: 10px; color: $green; }
  }
}

.action-footer {
  display: flex;
  gap: 12px;

  .vicio-btn {
    flex: 1;
    &.primary { @include btn-vicio-primary('md'); }
    &.danger { @include btn-vicio-danger('md'); }
    &.neutral { @include btn-vicio('neutral', 'md'); }
  }
}

@keyframes popIn {
  from { opacity: 0; transform: Scale(0.95); }
  to { opacity: 1; transform: Scale(1); }
}
.animate-pop { animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
</style>
