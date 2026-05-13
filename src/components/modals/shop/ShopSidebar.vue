<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  activeCategory: string
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:activeCategory', category: string): void
}>()

const categories = computed(() => [
  { id: 'todos', label: 'Todo', icon: '📦' },
  { id: 'pokeballs', label: 'Balls', icon: '⚪' },
  { id: 'pociones', label: 'Pociones', icon: '🧪' },
  { id: 'stones', label: 'Piedras', icon: '💎' },
  { id: 'especial', label: 'Especial', icon: '✨' }
])

const setCategory = (id: string) => {
  emit('update:activeCategory', id)
}
</script>

<template>
  <aside class="shop-sidebar custom-scrollbar">
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

.shop-sidebar {
  @include shop-sidebar;
}

.cat-btn {
  @include shop-sidebar-button(var(--yellow));
}
</style>
