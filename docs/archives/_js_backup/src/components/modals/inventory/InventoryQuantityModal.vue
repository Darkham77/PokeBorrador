<script setup>
import { ref, computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import BaseModal from '@/components/common/BaseModal.vue'

const props = defineProps({
  item: { type: Object, required: true },
  mode: { type: String, default: 'sell' }, // 'sell' | 'release' | 'use'
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'confirm'])

const quantity = ref(1)

const maxQuantity = computed(() => props.item.qty || 1)
const sellPrice = computed(() => Math.floor((props.item.price || 0) * 0.5) * quantity.value)

const setQuantity = (val) => {
  const n = parseInt(val)
  if (isNaN(n)) return
  quantity.value = Math.max(1, Math.min(maxQuantity.value, n))
}

const increment = () => { if (quantity.value < maxQuantity.value) quantity.value++ }
const decrement = () => { if (quantity.value > 1) quantity.value-- }
const setMax = () => { quantity.value = maxQuantity.value }

const handleConfirm = () => {
  emit('confirm', quantity.value)
}
</script>

<template>
  <BaseModal
    :show="show"
    max-width="400px"
    variant="retro"
    @close="$emit('close')"
  >
    <template #header>
      <div class="quantity-modal-header">
        <img 
          :src="getAssetUrl(ASSET_TYPES.ITEM, item.sprite)" 
          class="item-mini-sprite"
          @error="e => e.target.style.display = 'none'"
        >
        <div class="title-wrap">
          <div class="main-title">
            {{ item.name }}
          </div>
          <div class="sub-title">
            En posesión: {{ item.qty }}
          </div>
        </div>
      </div>
    </template>

    <div class="quantity-modal-body">
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
        class="profit-summary"
      >
        <div class="summary-line">
          <span class="label">PRECIO UNITARIO:</span>
          <span class="value">₱{{ Math.floor(item.price * 0.5).toLocaleString() }}</span>
        </div>
        <div class="summary-line total">
          <span class="label">GANANCIA TOTAL:</span>
          <span class="value">₱{{ sellPrice.toLocaleString() }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="quantity-modal-footer">
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
          CONFIRMAR {{ mode === 'sell' ? 'VENTA' : 'ELIMINACIÓN' }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_variables" as *;
@use "@/styles/core/_mixins" as *;

.quantity-modal-header {
  display: flex;
  align-items: center;
  gap: 16px;
  
  .item-mini-sprite {
    width: 32px;
    height: 32px;
    image-rendering: pixelated;
  }

  .title-wrap {
    .main-title {
      @include pixelated;
      font-size: 11px;
      color: Var(--yellow);
    }
    .sub-title {
      font-size: 11px;
      color: Rgba(255, 255, 255, 0.6);
      font-weight: 700;
      margin-top: 2px;
    }
  }
}

.quantity-modal-body {
  padding: 20px 0;
  text-align: center;

  .selector-label {
    @include pixelated;
    font-size: 8px;
    color: Rgba(255, 255, 255, 0.6);
    margin-bottom: 24px;
  }

  .selector-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    margin-bottom: 24px;

    .control-btn {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: Rgba(255, 255, 255, 0.05);
      border: 1px solid Rgba(255, 255, 255, 0.1);
      color: white;
      font-size: 20px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover:Not(:disabled) {
        background: Rgba(255, 255, 255, 0.1);
        border-color: Var(--yellow);
      }
      &:disabled { opacity: 0.3; }
    }

    .input-wrapper {
      position: relative;
      
      .quantity-input {
        width: 110px;
        background: Rgba(0, 0, 0, 0.4);
        border: 2px solid Rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 12px;
        text-align: center;
        color: white;
        @include pixelated;
        font-size: 20px;
        outline: none;
        &:focus { border-color: Var(--yellow); }
      }

      .max-badge {
        position: absolute;
        top: -8px;
        right: -8px;
        background: Var(--yellow);
        color: black;
        border: none;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 8px;
        font-weight: 900;
        cursor: pointer;
        @include pixelated;
      }
    }
  }

  .profit-summary {
    background: Rgba(0, 0, 0, 0.2);
    border-radius: 12px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;

    .summary-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .label { font-size: 8px; color: Rgba(255, 255, 255, 0.4); font-weight: 700; }
      .value { font-size: 11px; color: white; font-weight: 800; }

      &.total {
        margin-top: 4px;
        padding-top: 8px;
        border-top: 1px solid Rgba(255, 255, 255, 0.1);
        .value { color: $green; @include pixelated; font-size: 12px; }
      }
    }
  }
}

.quantity-modal-footer {
  display: flex;
  gap: 12px;
  width: 100%;

  .vicio-btn {
    flex: 1;
    &.primary { @include btn-vicio-Primary('md'); }
    &.danger { @include btn-vicio-Danger('md'); }
    &.neutral { @include btn-Vicio('neutral', 'md'); }
  }
}
</style>
