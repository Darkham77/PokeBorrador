<script setup>
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { SHOP_ITEMS } from '@/data/items'
import PVTooltip from '@/components/common/PVTooltip.vue'

const _game = useGameStore()
const _ui = useUIStore()

const searchQuery = ref('')
const filteredItems = computed(() => {
  if (!searchQuery.value) return SHOP_ITEMS.slice(0, 10)
  return SHOP_ITEMS.filter(i => 
    i.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    i.id.toLowerCase().includes(searchQuery.value.toLowerCase())
  ).slice(0, 15)
})

async function addItem(item, qty = 10) {
  window.__VITE_DEBUG__.addItem(item.name, qty)
}
</script>

<template>
  <div class="items-debug">
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
          @click="addItem(item)"
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
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: $white;
  border-radius: 12px;
  font-size: 16px;
  
  &:focus { outline: none; border-color: var(--purple); }
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
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid transparent;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.07);
    border-color: rgba(255, 255, 255, 0.1);
    transform: translateX(4px);
  }

  .name { font-size: 16px; flex: 1; font-weight: 600; color: $text; }
  .add { font-size: 8px; color: $green; font-family: 'Press Start 2P', monospace; image-rendering: pixelated; }
  .icon { font-size: 16px; }
}
</style>
