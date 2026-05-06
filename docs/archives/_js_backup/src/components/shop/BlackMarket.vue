<script setup>
import { onMounted, ref } from 'vue'
import { useShopStore } from '@/stores/shop'
import { useGameStore } from '@/stores/game'
import { PLAYER_CLASSES } from '@/data/playerClasses'

const shopStore = useShopStore()
const gameStore = useGameStore()

const items = ref([])
const discount = PLAYER_CLASSES.rocket.modifiers.shopDiscount || 0.20

function refresh() {
  items.value = shopStore.getBlackMarketItems()
}

function getPrice(item) {
  return Math.floor((item.bcPrice * 50) * (1 - discount))
}

function isPurchased(itemId) {
  return gameStore.state.classData?.blackMarketDaily?.purchased?.includes(itemId)
}

onMounted(() => {
  refresh()
})
</script>

<template>
  <div class="black-market-section">
    <div class="market-header">
      <div class="title-row">
        <span class="rocket-icon">🚀</span>
        <h3>MERCADO NEGRO</h3>
      </div>
      <p class="desc">
        Solo para miembros del Equipo Rocket. Rotación diaria de objetos raros a precios de contrabando.
      </p>
    </div>

    <div class="items-grid">
      <div 
        v-for="item in items" 
        :key="item.id" 
        class="market-card"
        :class="{ 'sold-out': isPurchased(item.id) }"
      >
        <div
          v-if="isPurchased(item.id)"
          class="sold-overlay"
        >
          AGOTADO
        </div>
        
        <div class="card-content">
          <div class="item-visual">
            <img
              :src="item.sprite"
              class="pixel-sprite"
              @error="e => e.target.style.display = 'none'"
            >
            <div class="glow" />
          </div>
          
          <div class="item-info">
            <span class="item-name">{{ item.name.toUpperCase() }}</span>
            <span class="item-price">₽ {{ getPrice(item).toLocaleString() }}</span>
          </div>

          <button 
            class="buy-btn" 
            :disabled="isPurchased(item.id) || gameStore.state.money < getPrice(item)"
            @click.stop="shopStore.buyBlackMarketItem(item.id); refresh()"
          >
            {{ isPurchased(item.id) ? 'VENDIDO' : 'COMPRAR' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "sass:string";
.black-market-section {
  background: Linear-Gradient(180deg, Rgba(239, 68, 68, 0.05) 0%, Rgba(0, 0, 0, 0) 100%);
  border-radius: 20px;
  padding: 30px;
  border: 1px solid Rgba(239, 68, 68, 0.15);
  margin-bottom: 40px;
}

.market-header {
  margin-bottom: 25px;
  
  .title-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
    
    .rocket-icon { font-size: 24px; }
    h3 { 
      @include pixelated;
      font-size: 14px;
      color: Rgba(239, 68, 68, 1);
      margin: 0;
      text-shadow: 0 0 10px Rgba(239, 68, 68, 0.3);
    }
  }
  
  .desc {
    font-size: 11px;
    color: Rgba(255, 255, 255, 0.5);
    line-height: 1.5;
    margin: 0;
  }
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.market-card {
  background: Rgba(20, 20, 25, 0.8);
  border-radius: 16px;
  border: 1px solid Rgba(255, 255, 255, 0.05);
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  
  &:hover:not(.sold-out) {
    border-color: Rgba(239, 68, 68, 0.4);
    transform: translateY(-5px);
  }
  
  &.sold-out {
    opacity: 0.6;
    filter: grayScale(0.8);
  }
}

.sold-overlay {
  position: absolute;
  inset: 0;
  background: Rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-base);
  @include pixelated;
  font-size: 12px;
  color: Rgba(239, 68, 68, 1);
  transform: Rotate(-15deg);
  pointer-events: none;
}

.card-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.item-visual {
  width: 70px;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  
  .pixel-sprite {
    width: 48px;
    height: 48px;
    image-rendering: pixelated;
    z-index: var(--z-base);
    filter: Drop-Shadow(0 4px 8px Rgba(0, 0, 0, 0.5));
  }
  
  .glow {
    position: absolute;
    width: 40px;
    height: 40px;
    background: Radial-Gradient(circle, Rgba(239, 68, 68, 0.2) 0%, transparent 70%);
    border-radius: 50%;
  }
}

.item-info {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 5px;
  
  .item-name {
    @include pixelated;
    font-size: 8px;
    color: var(--white);
  }
  
  .item-price {
    @include pixelated;
    font-size: 10px;
    color: Rgba(239, 68, 68, 1);
  }
}

.buy-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 10px;
  background: Rgba(239, 68, 68, 1);
  color: var(--white);
  @include pixelated;
  font-size: 8px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background: Rgba(220, 38, 38, 1);
    box-shadow: 0 0 15px Rgba(239, 68, 68, 0.4);
  }
  
  &:disabled {
    background: Rgba(39, 39, 42, 1);
    color: Rgba(82, 82, 91, 1);
    cursor: not-allowed;
  }
}
</style>
