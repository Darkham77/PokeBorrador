<script setup lang="ts">
import { ref, computed } from 'vue'
import gsap from 'gsap'
import { SHOP_ITEMS } from '@/data/items'

import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useInventoryStore } from '@/stores/inventory'

interface ShopItem {
  id: string
  name: string
  icon?: string
}

const searchQuery = ref('')
const filteredItems = computed(() => {
  const items = SHOP_ITEMS as ShopItem[]
  if (!searchQuery.value) return items.slice(0, 10)
  return items.filter(i => 
    i.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    i.id.toLowerCase().includes(searchQuery.value.toLowerCase())
  ).slice(0, 15)
})

const gameStore = useGameStore()
const uiStore = useUIStore()
const inventoryStore = useInventoryStore()

async function addItem(item: ShopItem, qty = 10) {
  inventoryStore.addItem(item.id, qty)
}

function addTenOfEach() {
  const inventory = { ...gameStore.state.inventory }
  ;(SHOP_ITEMS as ShopItem[]).forEach(item => {
    inventory[item.id] = (inventory[item.id] || 0) + 10
  })
  gameStore.state.inventory = inventory
  gameStore.save(false)
  uiStore.notify('Agregados 10 de cada objeto', '🎒')
}

function onBtnEnter(e: Event) {
  gsap.to(e.currentTarget as HTMLElement, { y: -2, duration: 0.2, ease: 'power2.out' })
}
function onBtnLeave(e: Event) {
  gsap.to(e.currentTarget as HTMLElement, { y: 0, duration: 0.15, ease: 'power2.in' })
}
function onBtnDown(e: Event) {
  gsap.to(e.currentTarget as HTMLElement, { y: 0, duration: 0.1, ease: 'power2.in' })
}
</script>

<template>
  <div class="items-debug">
    <button
      class="add-all-btn"
      @click.stop="addTenOfEach"
      @mouseenter="onBtnEnter"
      @mouseleave="onBtnLeave"
      @mousedown="onBtnDown"
      @focus="onBtnEnter"
      @blur="onBtnLeave"
    >
      ⚡ Agregar 10 de cada uno
    </button>
    <input
      v-model="searchQuery"
      type="text"
      placeholder="Buscar item..."
      class="search-input"
    >
    <div 
      class="items-grid scrollbar"
      @wheel.stop
    >
      <PVTooltip
        v-for="item in filteredItems"
        :key="item.id"
        title="Haz clic para añadir 10 unidades de este objeto a tu inventario."
      >
        <div
          class="debug-item-card"
          @click.stop="addItem(item)"
        >
          <span class="icon">{{ item.icon || '🎒' }}</span>
          <span class="name">{{ item.name }}</span>
          <span class="add">+10</span>
        </div>
      </PVTooltip>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/debug";

.items-debug {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  background: Rgba(0, 0, 0, 0.4);
  border: 1px solid Rgba(255, 255, 255, 0.1);
  color: $white;
  border-radius: 12px;
  font-size: 16px;
  
  &:focus { outline: none; border-color: var(--purple); }
}

.add-all-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #a855f7 0%, #7e22ce 100%);
  border: 1px solid Rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 12px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  @include pixelated;
  box-shadow: 0 4px 12px Rgba(126, 34, 206, 0.3);

  &:hover {
    box-shadow: 0 6px 16px Rgba(126, 34, 206, 0.5);
    background: linear-gradient(135deg, #b55fe6 0%, #8b2ad6 100%);
  }
}

.items-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
  overscroll-behavior: contain;
}

.debug-item-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid transparent;
  border-radius: 14px;
  cursor: pointer;
  

  &:hover {
    background: Rgba(255, 255, 255, 0.07);
    border-color: Rgba(255, 255, 255, 0.1);
    transform: Translatex(4px);
  }

  .name { font-size: 16px; flex: 1; font-weight: 600; color: $text; }
  .add { font-size: 8px; color: $green; @include pixelated; }
  .icon { font-size: 16px; }
}
</style>
