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
  { id: 'breeding', label: 'Crianza', icon: '🥚' },
  { id: 'held', label: 'Equipables', icon: '🎒' },
  { id: 'utility', label: 'Consumibles', icon: '💊' },
  { id: 'booster', label: 'Mejoras', icon: '✨' },
  { id: 'especial', label: 'Discos / MTs', icon: '📀' }
])

const setCategory = (id: string) => {
  emit('update:activeCategory', id)
}
</script>

<template>
  <aside class="bc-shop-sidebar custom-scrollbar">
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

.bc-shop-sidebar {
  @include shop-sidebar(Rgba(168, 85, 247, 0.15));
}

.cat-btn {
  @include shop-sidebar-button(#c084fc);
}
</style>
