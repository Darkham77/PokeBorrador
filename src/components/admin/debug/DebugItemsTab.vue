<script setup>
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { SHOP_ITEMS } from '@/data/items'

const props = defineProps({
  securityCheck: { type: Function, required: true }
})

const game = useGameStore()
const ui = useUIStore()

const searchQuery = ref('')
const filteredItems = computed(() => {
  if (!searchQuery.value) return SHOP_ITEMS.slice(0, 10)
  return SHOP_ITEMS.filter(i => 
    i.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    i.id.toLowerCase().includes(searchQuery.value.toLowerCase())
  ).slice(0, 15)
})

async function addItem(item, qty = 10) {
  if (!props.securityCheck()) return
  game.state.inventory[item.name] = (game.state.inventory[item.name] || 0) + qty
  ui.notify(`Debug: +${qty} ${item.name}`, item.icon || '🎒')
  await game.saveGame(false)
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
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="debug-item-card"
        @click="addItem(item)"
      >
        <span class="icon">{{ item.icon || '🎒' }}</span>
        <span class="name">{{ item.name }}</span>
        <span class="add">+10</span>
      </div>
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
  color: #fff;
  border-radius: 12px;
  font-size: 13px;
  
  &:focus { outline: none; border-color: #7c3aed; }
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

  .name { font-size: 12px; flex: 1; font-weight: 600; color: #e2e8f0; }
  .add { font-size: 10px; color: #34d399; font-family: 'Press Start 2P', monospace; image-rendering: pixelated; }
  .icon { font-size: 16px; }
}
</style>
