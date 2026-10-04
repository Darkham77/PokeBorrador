<script setup lang="ts">
import { ref, computed } from 'vue'
import gsap from 'gsap'
import { SHOP_ITEMS, type ItemId } from '@/data/inventory/items'

import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useInventoryStore } from '@/stores/inventory/inventory'
import { incrementRecordKey } from '@/logic/utils/mapUtils'

const DEFAULT_SEARCH_ITEMS_LIMIT = 10
const FILTERED_SEARCH_ITEMS_LIMIT = 15
const DEFAULT_ADD_ITEM_QTY = 10
const GSAP_HOVER_Y_PX = -2
const GSAP_HOVER_DURATION_SEC = 0.2
const GSAP_LEAVE_DURATION_SEC = 0.15
const GSAP_PRESS_DURATION_SEC = 0.1

interface ShopItem {
  id: ItemId
  name: string
  icon?: string
}

const searchQuery = ref('')
const filteredItems = computed(() => {
  const items = SHOP_ITEMS as ShopItem[]
  if (!searchQuery.value) return items.slice(0, DEFAULT_SEARCH_ITEMS_LIMIT)
  return items.filter(i => 
    i.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    i.id.toLowerCase().includes(searchQuery.value.toLowerCase())
  ).slice(0, FILTERED_SEARCH_ITEMS_LIMIT)
})

const gameStore = useGameStore()
const uiStore = useUIStore()
const inventoryStore = useInventoryStore()

async function addItem(item: ShopItem, qty = DEFAULT_ADD_ITEM_QTY) {
  inventoryStore.addItem(item.id, qty)
}

function addTenOfEach() {
  const inventory: Partial<Record<string, number>> = { ...gameStore.state.inventory }
  ;(SHOP_ITEMS as ShopItem[]).forEach(item => {
    incrementRecordKey(inventory, item.id, DEFAULT_ADD_ITEM_QTY)
  })
  gameStore.state.inventory = inventory as typeof gameStore.state.inventory
  gameStore.save(false)
  uiStore.notify(`Agregados ${DEFAULT_ADD_ITEM_QTY} de cada objeto`, '🎒')
}

function onBtnEnter(e: Event) {
  gsap.to(e.currentTarget as HTMLElement, { y: GSAP_HOVER_Y_PX, duration: GSAP_HOVER_DURATION_SEC, ease: 'power2.out' })
}
function onBtnLeave(e: Event) {
  gsap.to(e.currentTarget as HTMLElement, { y: 0, duration: GSAP_LEAVE_DURATION_SEC, ease: 'power2.in' })
}
function onBtnDown(e: Event) {
  gsap.to(e.currentTarget as HTMLElement, { y: 0, duration: GSAP_PRESS_DURATION_SEC, ease: 'power2.in' })
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
      <span class="emoji">⚡</span> Agregar 10 de cada uno
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
          :id="`debug-item-${item.id}`"
          class="debug-item-card"
          @click.stop="addItem(item)"
        >
          <span class="emoji">{{ item.icon || '🎒' }}</span>
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
  border: 1px solid Rgb(255 255 255 / 10%);
  border-radius: 12px;
  background: Rgb(0 0 0 / 40%);
  color: $white;
  font-size: 16px;
  
  &:focus { outline: none; border-color: var(--purple); }
}

.add-all-btn {
  @include pixelated;

  width: 100%;
  padding: 12px;
  border: 1px solid Rgb(255 255 255 / 20%);
  border-radius: 12px;
  background: Linear-Gradient(135deg, #a855f7 0%, #7e22ce 100%);
  color: white;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 12px Rgb(126 34 206 / 30%);

  &:hover {
    background: Linear-Gradient(135deg, #b55fe6 0%, #8b2ad6 100%);
    box-shadow: 0 6px 16px Rgb(126 34 206 / 50%);
  }
}

.items-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  flex: 1;
  overscroll-behavior: contain;
}

.debug-item-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: Rgb(255 255 255 / 3%);
  cursor: pointer;
  

  &:hover {
    background: Rgb(255 255 255 / 7%);
    transform: Translatex(4px);
    border-color: Rgb(255 255 255 / 10%);
  }

  .name { color: $text; font-size: 16px; font-weight: 600; flex: 1; }
  .add { @include pixelated; color: $green; font-size: 8px; }
  .icon { font-size: 16px; }
}
</style>
