<script setup lang="ts">
import { computed, watch } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useUIStore } from '@/stores/ui'

const inventoryStore = useInventoryStore() as any
const uiStore = useUIStore() as any

const activeCategory = computed(() => inventoryStore.activeCategory)

const categories = computed(() => {
  const list = [
    { id: 'todos', label: 'Todos', icon: '📦' },
    { id: 'pokeballs', label: 'Balls', icon: '⚪' },
    { id: 'pociones', label: 'Cura', icon: '🧪' },
    { id: 'stones', label: 'Piedras', icon: '💎' },
    { id: 'held', label: 'Equipo', icon: '🎒' },
    { id: 'breeding', label: 'Crianza', icon: '🥚' },
    { id: 'especial', label: 'Otros', icon: '✨' }
  ]

  if (uiStore.inventoryTarget) {
    list.unshift({ id: 'utilizables', label: 'Utilizables', icon: '⭐' })
  }

  return list
})

const setCategory = (id: string) => {
  inventoryStore.activeCategory = id
}

// Ensure the active category is always valid within the current context
watch(() => categories.value, (newCats) => {
  if (!newCats.find(c => c.id === inventoryStore.activeCategory)) {
    inventoryStore.activeCategory = 'todos'
  }
}, { immediate: true })
</script>

<template>
  <aside class="inventory-sidebar custom-scrollbar">
    <button
      v-for="cat in categories"
      :key="cat.id"
      class="cat-btn"
      :class="{ active: activeCategory === cat.id }"
      @click.stop="setCategory(cat.id)"
    >
      <div class="cat-icon-frame">
        <span class="cat-icon">{{ cat.icon }}</span>
      </div>
      <span class="cat-label">{{ cat.label }}</span>
      
      <div 
        v-if="activeCategory === cat.id"
        class="active-indicator"
      />
    </button>
  </aside>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.inventory-sidebar {
  width: 180px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 12px;
  background: Rgba(0, 0, 0, 0.25);
  border-right: 1px solid Rgba(255, 255, 255, 0.08);
  height: 100%;
  overflow-y: auto;
  min-height: 0; // Fix flex scroll collapse for auditor
}

.cat-btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 12px;
  color: Rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  outline: none;

  .cat-icon-frame {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: Rgba(255, 255, 255, 0.03);
    border: 1px solid Rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    font-size: 16px;
    transition: inherit;
  }

  .cat-label {
    @include pixelated;
    font-size: 8px;
    letter-spacing: 0.5px;
    transition: inherit;
  }

  &:hover:not(.active) {
    background: Rgba(255, 255, 255, 0.05);
    color: Rgba(255, 255, 255, 0.8);
    transform: Translatex(4px);
    
    .cat-icon-frame {
      background: Rgba(255, 255, 255, 0.08);
      border-color: Rgba(255, 255, 255, 0.1);
    }
  }

  &.active {
    background: Rgba(255, 214, 10, 0.08);
    border-color: Rgba(255, 214, 10, 0.15);
    color: var(--yellow);
    
    .cat-icon-frame {
      box-shadow: 0 0 15px Rgba(255, 214, 10, 0.1);
    }

    .active-indicator {
      position: absolute;
      left: 0;
      top: 20%;
      bottom: 20%;
      width: 3px;
      background: var(--yellow);
      border-radius: 0 4px 4px 0;
      box-shadow: 0 0 10px var(--yellow);
    }
  }
}

@media (max-width: 768px) {
  .inventory-sidebar {
    width: 60px;
    padding: 12px 8px;
    
    .cat-label { display: none; }
    .cat-btn { justify-content: center; padding: 10px 0; }
  }
}
</style>
