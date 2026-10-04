<script setup lang="ts">
import { ref, computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import BaseModal from '@/components/common/BaseModal.vue'

interface InventoryItem {
  id: string
  name: string
  sprite?: string
  qty: number
  price?: number
}

interface Props {
  item: InventoryItem
  mode?: string // 'sell' | 'release' | 'use'
  show?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'sell',
  show: false
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm', qty: number): void
}>()

const quantity = ref(1)

const maxQuantity = computed(() => props.item.qty || 1)
const sellPrice = computed(() => Math.floor((props.item.price || 0) * 0.5) * quantity.value)

const setQuantity = (val: string | number) => {
  const n = parseInt(val as string)
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
          v-if="item.sprite"
          :src="getAssetUrl(ASSET_TYPES.ITEM, item.sprite)" 
          :alt="item.name || 'Objeto'"
          class="item-mini-sprite"
          @error="e => { (e.target as HTMLImageElement).style.display = 'none' }"
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
            @input="e => setQuantity((e.target as HTMLInputElement).value)"
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
          <span class="value">₱{{ Math.floor((item.price || 0) * 0.5).toLocaleString() }}</span>
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
    @include pixelated;

    width: 32px;
    height: 32px;
  }

  .title-wrap {
    .main-title {
      @include pixelated;

      color: var(--yellow);
      font-size: 11px;
    }
    .sub-title {
      color: rgb(255 255 255 / 60%);
      font-size: 11px;
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

    color: rgb(255 255 255 / 60%);
    font-size: 8px;
    margin-bottom: 24px;
  }

  .selector-controls {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
    margin-bottom: 24px;

    .control-btn {
      width: 44px;
      height: 44px;
      border: 1px solid rgb(255 255 255 / 10%);
      border-radius: 12px;
      background: rgb(255 255 255 / 5%);
      color: white;
      font-size: 20px;
      cursor: pointer;
      

      &:hover:not(:disabled) {
        background: rgb(255 255 255 / 10%);
        border-color: var(--yellow);
      }
      &:disabled { opacity: 0.3; }
    }

    .input-wrapper {
      position: relative;
      
      .quantity-input {
        @include pixelated;

        width: 110px;
        padding: 12px;
        border: 2px solid rgb(255 255 255 / 10%);
        border-radius: 12px;
        background: rgb(0 0 0 / 40%);
        color: white;
        font-size: 20px;
        text-align: center;
        outline: none;
        &:focus { border-color: var(--yellow); }
      }

      .max-badge {
        @include pixelated;

        position: absolute;
        top: -8px;
        right: -8px;
        padding: 2px 6px;
        border: none;
        border-radius: 4px;
        background: var(--yellow);
        color: black;
        font-size: 8px;
        font-weight: 900;
        cursor: pointer;
      }
    }
  }

  .profit-summary {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
    border-radius: 12px;
    background: rgb(0 0 0 / 20%);

    .summary-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .label { color: rgb(255 255 255 / 40%); font-size: 8px; font-weight: 700; }
      .value { color: white; font-size: 11px; font-weight: 800; }

      &.total {
        margin-top: 4px;
        padding-top: 8px;
        border-top: 1px solid rgb(255 255 255 / 10%);
        .value { @include pixelated; color: $green; font-size: 12px; }
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
    &.primary { @include btn-vicio-primary('md'); }
    &.danger { @include btn-vicio-danger('md'); }
    &.neutral { @include btn-vicio('neutral', 'md'); }
  }
}
</style>
