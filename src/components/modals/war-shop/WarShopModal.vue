<script setup lang="ts">
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useWarStore } from '@/stores/war'
import { SHOP_ITEMS } from '@/data/items'
import { useGameStore } from '@/stores/game'
import BaseModal from '@/components/common/BaseModal.vue'
import WarShopItemCard from './WarShopItemCard.vue'

import type { ShopItem } from '@/types/items'

const uiStore = useUIStore()
const warStore = useWarStore()
const gameStore = useGameStore()

const isOpen = computed({
  get: () => uiStore.isWarShopOpen,
  set: (val: boolean) => { uiStore.isWarShopOpen = val }
})

const isSmallScreen = computed(() => uiStore.isSmallScreen)

const warItems = computed(() => {
  const coins = warStore.warCoins || 0
  const trainerLevel = gameStore.state.trainerLevel || 1

  return (SHOP_ITEMS as unknown as ShopItem[])
    .filter(item => !!item.showInWarShop)
    .slice()
    .sort((a, b) => {
      const aUnlocked = trainerLevel >= (a.unlockLv || 1)
      const bUnlocked = trainerLevel >= (b.unlockLv || 1)
      const aAffordable = coins >= (a.warPrice || 0)
      const bAffordable = coins >= (b.warPrice || 0)

      const aCanBuy = aUnlocked && aAffordable
      const bCanBuy = bUnlocked && bAffordable

      if (aCanBuy !== bCanBuy) {
        return aCanBuy ? -1 : 1
      }
      if (aUnlocked !== bUnlocked) {
        return aUnlocked ? -1 : 1
      }
      if ((a.unlockLv || 1) !== (b.unlockLv || 1)) {
        return (a.unlockLv || 1) - (b.unlockLv || 1)
      }
      return (a.warPrice || 0) - (b.warPrice || 0)
    })
})

const closeWarShop = () => {
  isOpen.value = false
}

// Shim for legacy code
if (typeof window !== 'undefined') {
  const win = window as unknown as { 
    showWarShop?: () => void; 
    closeWarShop?: () => void;
    renderWarShop?: () => void; // Legacy might try to call this
  }
  win.showWarShop = () => {
    isOpen.value = true
  }
  win.closeWarShop = () => {
    isOpen.value = false
  }
  win.renderWarShop = () => {
    // No-op, Vue handles reactivity
  }
}
</script>

<template>
  <BaseModal
    :show="isOpen"
    :type="isSmallScreen ? 'fullscreen' : 'center'"
    :max-width="isSmallScreen ? '100dvw' : '850px'"
    variant="retro"
    padding="raw"
    accent-color="#ef4444"
    header-background="rgba(20, 10, 10, 0.9)"
    @close="closeWarShop"
  >
    <!-- Premium Header -->
    <template #header>
      <div class="war-shop-modal-header">
        <div class="war-shop-title-group">
          <span class="title-icon">🚩</span>
          <div class="title-text-wrap">
            <span class="main-title">TIENDA DE GUERRA</span>
            <span class="sub-title">CANJE DE MONEDAS FACCIONARIAS</span>
          </div>
        </div>
        
        <div class="header-stats">
          <!-- Monedas -->
          <div class="stat-node coins">
            <span class="shop-stat-label">MIS MONEDAS</span>
            <span class="value">
              <i class="fa-solid fa-bolt-lightning currency-icon-red" />
              {{ warStore.warCoins }}
            </span>
          </div>

          <!-- Nivel Entrenador -->
          <div class="stat-node level">
            <span class="shop-stat-label">NIVEL ENTRENADOR</span>
            <span class="value">Nv. {{ gameStore.state.trainerLevel }}</span>
          </div>
        </div>
      </div>
    </template>

    <div class="war-shop-container">
      <!-- Hint Message Banner -->
      <div class="war-shop-hint-banner">
        <span class="info-icon">ℹ️</span>
        <span class="hint-text">Gana monedas participando en la Dominancia de Kanto.</span>
      </div>

      <!-- Items Grid -->
      <div class="war-items-grid">
        <WarShopItemCard
          v-for="item in warItems"
          :key="item.id"
          :item="item"
        />
      </div>

      <!-- Empty State -->
      <div 
        v-if="warItems.length === 0"
        class="empty-state"
      >
        <p>No hay artículos disponibles en este momento.</p>
      </div>
    </div>

    <template #footer>
      <div class="war-shop-footer">
        <div class="footer-decoration" />
        <span class="footer-text">TIENDA EXCLUSIVA DE FACCIONES</span>
        <div class="footer-decoration" />
      </div>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.war-shop-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: 70dvh;
  overflow-y: auto;
  padding: 16px 0 0 0; // Top padding below the header line
  padding-right: 4px;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: Rgba(255, 255, 255, 0.05);
  }
  &::-webkit-scrollbar-thumb {
    background: #ef4444;
    border-radius: 2px;
  }
}

.war-shop-hint-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: Rgba(239, 68, 68, 0.05);
  border: 1px solid Rgba(239, 68, 68, 0.1);
  border-radius: 12px;
  margin: 0 16px;
  
  .info-icon {
    color: #ef4444;
    font-size: 14px;
  }
  
  .hint-text {
    font-size: 11px;
    color: #cbd5e1;
    font-style: italic;
  }
}

.war-items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
  padding: 10px 16px 20px 16px; // Headroom padding for hover scale/translate
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #4b5563;
  font-family: var(--font-pixel);
  font-size: 10px;
}

.war-shop-footer {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  padding: 10px 0;
  opacity: 0.6;

  .footer-decoration {
    flex: 1;
    height: 1px;
    background: linear-gradient(to right, transparent, #ef4444, transparent);
  }

  .footer-text {
    font-family: var(--font-pixel);
    font-size: 7px;
    color: #ef4444;
    white-space: nowrap;
    letter-spacing: 1px;
  }
}
</style>
