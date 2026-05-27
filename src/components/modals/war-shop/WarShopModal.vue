<script setup lang="ts">
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useWarStore } from '@/stores/war'
import { SHOP_ITEMS } from '@/data/items'
import { useGameStore } from '@/stores/game'
import BaseModal from '@/components/common/BaseModal.vue'
import WarShopItemCard from './WarShopItemCard.vue'

const uiStore = useUIStore()
const warStore = useWarStore()
const gameStore = useGameStore()

const isOpen = computed({
  get: () => uiStore.isWarShopOpen,
  set: (val: boolean) => { uiStore.isWarShopOpen = val }
})

const warItems = computed(() => {
  const coins = warStore.warCoins || 0
  const trainerLevel = gameStore.state.trainerLevel || 1

  return SHOP_ITEMS
    .filter(item => (item.warPrice || 0) > 0)
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
    title="🛒 TIENDA DE GUERRA"
    title-color="#ef4444"
    header-background="rgba(20, 10, 10, 0.9)"
    variant="retro"
    padding="md"
    max-width="850px"
    accent-color="#ef4444"
    @close="closeWarShop"
  >
    <div class="war-shop-container">
      <!-- Balance Header -->
      <div class="war-shop-header">
        <div class="balance-badge">
          <i class="fa-solid fa-bolt-lightning" />
          <span class="label">MIS MONEDAS:</span>
          <span class="value">{{ warStore.warCoins }}</span>
        </div>
        <p class="war-shop-hint">
          Gana monedas participando en la Dominancia de Kanto.
        </p>
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

.war-shop-header {
  text-align: center;
  padding: 16px;
  background: linear-gradient(to bottom, Rgba(239, 68, 68, 0.1), transparent);
  border-radius: 16px;
  border: 1px solid Rgba(239, 68, 68, 0.1);
}

.balance-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 20px;
  background: Rgba(0, 0, 0, 0.4);
  border: 1px solid #ef4444;
  border-radius: 20px;
  box-shadow: 0 0 20px Rgba(239, 68, 68, 0.2);

  i {
    color: #ef4444;
    font-size: 16px;
    filter: Drop-Shadow(0 0 5px #ef4444);
  }

  .label {
    font-family: 'Press Start 2P', monospace;
    font-size: 10px;
    color: #94a3b8;
  }

  .value {
    font-family: 'Press Start 2P', monospace;
    font-size: 14px;
    color: #fff;
    text-shadow: 0 0 10px Rgba(255, 255, 255, 0.5);
  }
}

.war-shop-hint {
  margin: 12px 0 0;
  font-size: 11px;
  color: #64748b;
  font-style: italic;
}

.war-items-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding-bottom: 20px;

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #4b5563;
  font-family: 'Press Start 2P', monospace;
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
    font-family: 'Press Start 2P', monospace;
    font-size: 7px;
    color: #ef4444;
    white-space: nowrap;
    letter-spacing: 1px;
  }
}
</style>
