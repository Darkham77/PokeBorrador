<script setup lang="ts">
import { computed, watch } from 'vue'
import { CATEGORY_LABELS } from '@/data/inventory/items'
import type { BagMainTab } from '@/types/inventory/items'

interface Props {
  activeCategory: string
  mainTab: BagMainTab
  availableCategories?: string[]
  accentColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  availableCategories: undefined,
  accentColor: 'var(--yellow)'
})

const emit = defineEmits<{
  (e: 'update:activeCategory', category: string): void
}>()

const categories = computed(() => {
  const allCats = props.mainTab === 'materiales' ? [
    { id: 'todos', label: 'Todos', icon: '📦' },
    { id: 'raw_material', label: CATEGORY_LABELS.raw_material, icon: '🪵' },
    { id: 'refined_material', label: CATEGORY_LABELS.refined_material, icon: '🪙' },
    { id: 'component', label: CATEGORY_LABELS.component, icon: '⚙️' }
  ] : [
    { id: 'todos', label: 'Todos', icon: '📦' },
    { id: 'utilizables', label: 'Utilizables', icon: '⭐' },
    { id: 'stones', label: CATEGORY_LABELS.stones || 'Piedras', icon: '💎' },
    { id: 'pokeballs', label: CATEGORY_LABELS.pokeballs, icon: '⚪' },
    { id: 'potions', label: CATEGORY_LABELS.potions, icon: '🧪' },
    { id: 'combat_held', label: CATEGORY_LABELS.combat_held, icon: '🎒' },
    { id: 'breeding_held', label: CATEGORY_LABELS.breeding_held, icon: '🥚' },
    { id: 'machinery', label: CATEGORY_LABELS.machinery, icon: '🏭' },
    { id: 'tools', label: CATEGORY_LABELS.tools, icon: '🛠️' },
    { id: 'tms', label: CATEGORY_LABELS.tms, icon: '📀' },
    { id: 'otros', label: CATEGORY_LABELS.otros, icon: '✨' }
  ]

  const avail = props.availableCategories
  if (avail) {
    return allCats.filter(cat => {
      if (cat.id === 'todos') return true
      return avail.includes(cat.id)
    })
  }
  return allCats
})

const setCategory = (id: string) => {
  emit('update:activeCategory', id)
}

// Asegurar que la categoría activa sea siempre válida al cambiar de pestaña principal
watch(() => categories.value, (newCats) => {
  if (!newCats.find(c => c.id === props.activeCategory)) {
    emit('update:activeCategory', 'todos')
  }
}, { immediate: true })

const SIDEBAR_BORDER_COLOR_MIX_PERCENT = 15

const sidebarBorderColor = computed(() => {
  return `color-mix(in srgb, ${props.accentColor} ${SIDEBAR_BORDER_COLOR_MIX_PERCENT}%, transparent)`
})
</script>

<template>
  <aside class="unified-sidebar custom-scrollbar">
    <button
      v-for="cat in categories"
      :key="cat.id"
      class="cat-btn"
      :class="{ active: activeCategory === cat.id }"
      @click.stop="setCategory(cat.id)"
    >
      <div class="cat-icon-frame">
        <span class="emoji cat-icon">{{ cat.icon }}</span>
      </div>
      <span class="cat-label">{{ cat.label }}</span>
      
      <div class="active-indicator" />
    </button>
  </aside>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.unified-sidebar {
  @include shop-sidebar(v-bind('sidebarBorderColor'));
  scrollbar-width: thin;
}

.cat-btn {
  @include shop-sidebar-button(v-bind('props.accentColor'));
}
</style>
