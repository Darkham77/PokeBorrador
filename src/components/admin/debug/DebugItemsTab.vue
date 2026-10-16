<script setup lang="ts">
import { ref, computed } from 'vue';
import gsap from 'gsap';
import { SHOP_ITEMS, type ItemId } from '@/data/inventory/items';

import { useGameStore } from '@/stores/game';
import { useUIStore } from '@/stores/ui';
import { useInventoryStore } from '@/stores/inventory/inventory';
import { incrementRecordKey } from '@/logic/utils/mapUtils';

const DEFAULT_SEARCH_ITEMS_LIMIT = 10;
const FILTERED_SEARCH_ITEMS_LIMIT = 15;
const DEFAULT_ADD_ITEM_QTY = 10;
const DEBUG_ITEM_HOVER_Y_PX = -2;
const DEBUG_ITEM_HOVER_DURATION_SEC = 0.2;
const DEBUG_ITEM_LEAVE_DURATION_SEC = 0.15;
const DEBUG_ITEM_PRESS_DURATION_SEC = 0.1;

interface ShopItem {
  id: ItemId;
  name: string;
  icon?: string;
}

const searchQuery = ref('');
const filteredItems = computed(() => {
  const items = SHOP_ITEMS as ShopItem[];
  if (!searchQuery.value) return items.slice(0, DEFAULT_SEARCH_ITEMS_LIMIT);
  return items
    .filter(
      (i) =>
        i.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        i.id.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
    .slice(0, FILTERED_SEARCH_ITEMS_LIMIT);
});

const gameStore = useGameStore();
const uiStore = useUIStore();
const inventoryStore = useInventoryStore();

async function addItem(item: ShopItem, qty = DEFAULT_ADD_ITEM_QTY) {
  inventoryStore.addItem(item.id, qty);
}

function addTenOfEach() {
  const inventory: Partial<Record<ItemId, number>> = { ...gameStore.state.inventory };
  (SHOP_ITEMS as ShopItem[]).forEach((item) => {
    incrementRecordKey(inventory, item.id, DEFAULT_ADD_ITEM_QTY);
  });
  gameStore.state.inventory = inventory as typeof gameStore.state.inventory;
  void gameStore.save(false);
  uiStore.notify(`Agregados ${DEFAULT_ADD_ITEM_QTY} de cada objeto`, '🎒');
}

function onBtnEnter(e: Event) {
  gsap.to(e.currentTarget as HTMLElement, {
    y: DEBUG_ITEM_HOVER_Y_PX,
    duration: DEBUG_ITEM_HOVER_DURATION_SEC,
    ease: 'power2.out'
  });
}
function onBtnLeave(e: Event) {
  gsap.to(e.currentTarget as HTMLElement, {
    y: 0,
    duration: DEBUG_ITEM_LEAVE_DURATION_SEC,
    ease: 'power2.in'
  });
}
function onBtnDown(e: Event) {
  gsap.to(e.currentTarget as HTMLElement, {
    y: 0,
    duration: DEBUG_ITEM_PRESS_DURATION_SEC,
    ease: 'power2.in'
  });
}
</script>

<template>
  <div class="items-debug">
    <button
      id="debug-items-tab-btn-agregar-10-de-cada-uno"
      class="btn-vicio-secondary btn-vicio-full add-all-btn"
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
      id="debug-items-tab-input-searchquery"
      v-model="searchQuery"
      type="text"
      placeholder="Buscar item..."
      aria-label="Buscar item"
      class="search-input"
    />
    <div class="items-grid scrollbar" @wheel.stop>
      <PVTooltip
        v-for="item in filteredItems"
        :key="item.id"
        title="Haz clic para añadir 10 unidades de este objeto a tu inventario."
      >
        <div
          :id="`debug-item-${item.id}`"
          class="debug-item-card"
          role="button"
          tabindex="0"
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
@use '@/styles/components/debug';

.items-debug {
  display: flex;
  flex-direction: column;
  gap: $spacing-md-15;
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid Rgb(255 255 255 / 10%);
  border-radius: $radius-xl;
  background: Rgb(0 0 0 / 40%);
  color: $white;
  font-size: var(--font-16);

  &:focus {
    outline: none;
    border-color: var(--purple);
  }
}

.add-all-btn {
  @include btn-vicio('secondary', 'md', true);
}

.items-grid {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  min-height: 0;
  flex: 1;
  overscroll-behavior: contain;
}

.debug-item-card {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: 12px;
  border: 1px solid transparent;
  border-radius: $radius-xl-alt;
  background: Rgb(255 255 255 / 3%);
  cursor: pointer;

  &:hover {
    background: Rgb(255 255 255 / 7%);
    transform: Translatex(4px);
    border-color: Rgb(255 255 255 / 10%);
  }

  .name {
    color: $text;
    font-size: var(--font-16);
    font-weight: 600;
    flex: 1;
  }
  .add {
    @include pixelated;
    color: $green;
    font-size: var(--font-8);
  }
  .icon {
    font-size: var(--font-16);
  }
}
</style>
