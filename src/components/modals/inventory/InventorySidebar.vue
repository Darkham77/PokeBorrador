<script setup lang="ts">
import { computed, watch } from 'vue'
import { useInventoryStore } from '@/stores/inventory'

const inventoryStore = useInventoryStore()

const activeCategory = computed(() => inventoryStore.activeCategory)

const categories = computed(() => {
  const list = [
    { id: 'todos', label: 'Todos', icon: '📦' },
    { id: 'utilizables', label: 'Utilizables', icon: '⭐' },
    { id: 'pokeballs', label: 'Balls', icon: '⚪' },
    { id: 'pociones', label: 'Cura', icon: '🧪' },
    { id: 'stones', label: 'Piedras', icon: '💎' },
    { id: 'held', label: 'Equipo', icon: '🎒' },
    { id: 'breeding', label: 'Crianza', icon: '🥚' },
    { id: 'especial', label: 'Otros', icon: '✨' }
  ]

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
      
      <div class="active-indicator" />
    </button>
  </aside>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.inventory-sidebar {
  @include shop-sidebar;
  scrollbar-width: thin;
}

.cat-btn {
  @include shop-sidebar-button(var(--yellow));
}
</style>
