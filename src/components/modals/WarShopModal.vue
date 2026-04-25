<script setup>
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import BaseModal from '@/components/common/BaseModal.vue'

const uiStore = useUIStore()

const isOpen = computed({
  get: () => uiStore.isWarShopOpen,
  set: (val) => { uiStore.isWarShopOpen = val }
})

const closeWarShop = () => {
  isOpen.value = false
}

// Shim for legacy code
if (typeof window !== 'undefined') {
  window.showWarShop = () => {
    isOpen.value = true
  }
  window.closeWarShop = () => {
    isOpen.value = false
  }
}
</script>

<template>
  <BaseModal
    :show="isOpen"
    title="🛒 TIENDA DE GUERRA"
    title-color="#ef4444"
    header-background="#1a1c2e"
    max-width="440px"
    @close="closeWarShop"
  >
    <div class="war-shop-inner">
      <div
        id="war-shop-items"
        class="war-items-container"
      >
        <!-- Contenido inyectado por el sistema de guerra legado -->
        <div class="loading-placeholder">
          Cargando artículos...
        </div>
      </div>
    </div>

    <template #footer>
      <div class="war-shop-footer-info">
        Tienes: <span
          id="war-shop-coins-modal"
          class="coins-count"
        >0</span> Monedas de Guerra
      </div>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.war-shop-inner {
  padding: 8px 0;
}

.war-items-container {
  min-height: 200px;
}

.loading-placeholder {
  text-align: center;
  padding: 40px;
  color: var(--gray);
  @include pixelated;
  font-size: 10px;
}

.war-shop-footer-info {
  text-align: center;
  @include pixelated;
  font-size: 9px;
  color: $white;

  .coins-count {
    color: var(--yellow);
    margin: 0 4px;
  }
}

// Ensure legacy styles injected into #war-shop-items look premium
:deep(#war-shop-items) {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .war-item-row {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 16px;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.1);
      transform: translateY(-2px);
    }

    .item-icon-box {
      width: 54px;
      height: 54px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(255, 255, 255, 0.05);

      img {
        width: 36px;
        height: 36px;
        image-rendering: pixelated;
      }
    }

    .item-details {
      flex: 1;

      .item-name {
        font-weight: 800;
        font-size: 14px;
        color: $white;
        margin-bottom: 4px;
      }

      .item-desc {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
        line-height: 1.4;
      }
    }

    .buy-btn {
      background: linear-gradient(135deg, var(--yellow), #f59e0b);
      color: $black;
      border: none;
      border-radius: 10px;
      padding: 10px 16px;
      @include pixelated;
      font-size: 8px;
      font-weight: 900;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
      transition: all 0.2s;

      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 6px 15px rgba(245, 158, 11, 0.4);
        filter: Brightness(1.1);
      }

      &:disabled {
        background: #27272a;
        color: #52525b;
        box-shadow: none;
        cursor: not-allowed;
        opacity: 0.6;
      }
    }
  }
}
</style>
