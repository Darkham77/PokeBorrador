<script setup>
import { computed } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useGameStore } from '@/stores/game'
import { getItemSpriteUrl } from '@/logic/inventory/inventoryEngine'
import { ITEM_CATEGORIES, CATEGORY_LABELS } from '@/data/items'

const inventoryStore = useInventoryStore()
const gameStore = useGameStore()

const categories = ITEM_CATEGORIES.map(id => ({
  id,
  label: CATEGORY_LABELS[id] || id
}))

const onUseItem = (name) => {
  inventoryStore.useItem(name)
}
</script>

<template>
  <div class="bag-view">
    <div class="bag-container">
      <!-- Header -->
      <div class="bag-header">
        <div class="title-section">
          <span class="icon">🎒</span>
          <h1>Mochila</h1>
        </div>
        <div class="money-badge">
          ₽{{ gameStore.state.money.toLocaleString() }}
        </div>
      </div>

      <!-- Search & Tabs -->
      <div class="controls-section">
        <div class="search-bar">
          <input 
            v-model="inventoryStore.searchQuery" 
            type="text" 
            placeholder="Buscar objeto..."
            class="search-input"
          >
        </div>
        <div class="tabs-row scroll-hide">
          <button 
            v-for="cat in categories" 
            :key="cat.id"
            :class="['tab-btn', { active: inventoryStore.activeCategory === cat.id }]"
            @click="inventoryStore.setCategory(cat.id)"
          >
            {{ cat.label }}
          </button>
        </div>
      </div>

      <!-- Sell Mode Overlay (Sticky) -->
      <div
        v-if="inventoryStore.sellMode"
        class="sell-actions"
      >
        <div class="sell-info">
          MODO VENTA: <span class="text-green">Ganancia +₽{{ inventoryStore.totalSellGain.toLocaleString() }}</span>
        </div>
        <div class="sell-buttons">
          <button 
            class="btn btn-green" 
            :disabled="Object.keys(inventoryStore.sellSelected).length === 0"
            @click="inventoryStore.performSell"
          >
            Confirmar Venta
          </button>
          <button
            class="btn btn-gray"
            @click="inventoryStore.toggleSellMode"
          >
            Cancelar
          </button>
        </div>
      </div>

      <!-- Items Grid -->
      <div class="items-wrapper scroll-custom">
        <div
          v-if="inventoryStore.filteredItems.length === 0"
          class="empty-state"
        >
          <span class="empty-icon">🔍</span>
          <p>No se encontraron objetos en esta categoría.</p>
        </div>

        <div
          v-else
          class="items-grid"
        >
          <div 
            v-for="[name, qty] in inventoryStore.filteredItems" 
            :key="name"
            :class="['item-card', { selected: !!inventoryStore.sellSelected[name] }]"
            @click="inventoryStore.sellMode ? inventoryStore.toggleSellSelection(name) : null"
          >
            <div class="item-icon-container">
              <img
                :src="getItemSpriteUrl(name)"
                :alt="name"
                class="item-sprite"
              >
              <span class="item-qty">x{{ qty }}</span>
            </div>
            
            <div class="item-details">
              <div class="item-name">
                {{ name }}
              </div>
            </div>

            <div
              v-if="!inventoryStore.sellMode"
              class="item-footer"
            >
              <button
                class="use-btn"
                @click.stop="onUseItem(name)"
              >
                USAR
              </button>
            </div>

            <!-- Sell Qty Selector -->
            <div
              v-else-if="inventoryStore.sellSelected[name]"
              class="sell-qty-selector"
              @click.stop
            >
              <button @click="inventoryStore.updateSellQty(name, inventoryStore.sellSelected[name] - 1)">
                -
              </button>
              <input 
                type="number" 
                :value="inventoryStore.sellSelected[name]" 
                @input="inventoryStore.updateSellQty(name, $event.target.value)"
              >
              <button @click="inventoryStore.updateSellQty(name, inventoryStore.sellSelected[name] + 1)">
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div
        v-if="!inventoryStore.sellMode"
        class="bag-footer"
      >
        <button
          class="btn-sell-mode"
          @click="inventoryStore.toggleSellMode"
        >
          💰 Vender Objetos
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bag-view {
  height: 100%;
  padding: 20px;
  background: radial-gradient(circle at top left, rgba(59, 130, 246, 0.05), transparent),
              radial-gradient(circle at bottom right, rgba(16, 185, 129, 0.05), transparent);
  display: flex;
  justify-content: center;
}

.bag-container {
  width: 100%;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.bag-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-section h1 {
  font-family: 'Press Start 2P', monospace;
  font-size: 16px;
  color: #fff;
  margin: 0;
}

.icon { font-size: 24px; }

.money-badge {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.3);
  padding: 8px 16px;
  border-radius: 20px;
  color: #22c55e;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
}

.controls-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #fff;
  outline: none;
}

.tabs-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.tab-btn {
  white-space: nowrap;
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: var(--gray);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  background: var(--purple);
  color: #fff;
  border-color: var(--purple-light);
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
}

.item-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  transition: all 0.2s;
  cursor: default;
  position: relative;
}

.item-card:hover {
  background: rgba(255, 255, 255, 0.06);
  transform: translateY(-2px);
}

.item-card.selected {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.05);
}

.item-icon-container {
  position: relative;
  width: 48px;
  height: 48px;
}

.item-sprite {
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
  object-fit: contain;
}

.item-qty {
  position: absolute;
  bottom: -4px;
  right: -4px;
  background: var(--purple);
  color: #fff;
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 6px;
  font-weight: bold;
}

.item-name {
  font-size: 12px;
  font-weight: bold;
  text-align: center;
  color: #fff;
}

.use-btn {
  padding: 6px 16px;
  border-radius: 8px;
  border: none;
  background: var(--purple);
  color: #fff;
  font-size: 10px;
  font-weight: bold;
  cursor: pointer;
}

.sell-actions {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  padding: 16px;
  border-radius: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sell-buttons { display: flex; gap: 8px; }

.btn {
  padding: 8px 16px;
  border-radius: 10px;
  border: none;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  cursor: pointer;
}

.btn-green { background: #10b981; color: #fff; }
.btn-gray { background: rgba(255, 255, 255, 0.1); color: #fff; }

.btn-sell-mode {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.sell-qty-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sell-qty-selector input {
  width: 40px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  text-align: center;
  border-radius: 4px;
}

.sell-qty-selector button {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
}

.scroll-hide::-webkit-scrollbar { display: none; }
.scroll-custom::-webkit-scrollbar { width: 6px; }
.scroll-custom::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
</style>
