<script setup lang="ts">
import type { SortOrder, ItemSortKey } from '@/types/system/game'
type SortKey = ItemSortKey

interface Props {
  modelValue: SortKey
  sortOrder: SortOrder
  /**
   * Active color for the price and rarity buttons when selected.
   * Defaults to yellow (inventory / normal shop).
   * Pass a CSS color string, e.g. '#c084fc' for BC Shop purple.
   */
  accentColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  accentColor: ''
})

const emit = defineEmits<{
  (e: 'update:modelValue', val: SortKey): void
  (e: 'update:sortOrder', val: SortOrder): void
}>()

const setSort = (key: SortKey) => {
  if (props.modelValue === key) {
    emit('update:sortOrder', props.sortOrder === 'asc' ? 'desc' : 'asc')
  } else {
    emit('update:modelValue', key)
    emit('update:sortOrder', 'asc')
  }
}
</script>

<template>
  <div
    class="sort-controls"
    :style="accentColor ? { '--sort-accent': accentColor } : {}"
  >
    <!-- NAME -->
    <button
      class="sort-btn"
      :class="{ active: modelValue === 'name' }"
      title="Ordenar por nombre"
      @click.stop="setSort('name')"
    >
      <span class="sort-label">ABC</span>
      <span
        v-if="modelValue === 'name'"
        class="emoji sort-arrow"
      >
        {{ sortOrder === 'asc' ? '↑' : '↓' }}
      </span>
    </button>

    <!-- PRICE: slot allows caller to inject custom currency icon -->
    <button
      class="sort-btn"
      :class="{ active: modelValue === 'price' }"
      title="Ordenar por precio"
      @click.stop="setSort('price')"
    >
      <slot name="price-icon">
        <span class="sort-label">₱</span>
      </slot>
      <span
        v-if="modelValue === 'price'"
        class="emoji sort-arrow"
      >
        {{ sortOrder === 'asc' ? '↑' : '↓' }}
      </span>
    </button>

    <!-- RARITY -->
    <button
      class="sort-btn"
      :class="{ active: modelValue === 'rarity' }"
      title="Ordenar por rareza"
      @click.stop="setSort('rarity')"
    >
      <slot name="rarity-icon">
        <svg
          viewBox="0 0 24 24"
          class="star-icon"
          fill="currentColor"
        >
          <polygon points="12,2 22,12 12,22 2,12" />
        </svg>
      </slot>
      <span
        v-if="modelValue === 'rarity'"
        class="emoji sort-arrow"
      >
        {{ sortOrder === 'asc' ? '↑' : '↓' }}
      </span>
    </button>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

// Default accent = yellow; can be overridden via accentColor prop → CSS var
.sort-controls {
  --sort-accent: var(--yellow);
  --sort-accent-bg: Rgb(255 214 10 / 18%);
  --sort-accent-border: Rgb(255 214 10 / 55%);
  --sort-accent-glow: Rgb(255 214 10 / 20%);

  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.sort-btn {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 2px;
  min-width: 30px;
  height: 26px;
  padding: 0 6px;
  border: 1px solid Rgb(255 255 255 / 10%);
  border-radius: 7px;
  background: Rgb(255 255 255 / 5%);
  color: Rgb(255 255 255 / 50%);
  font-family: inherit;
  cursor: pointer;

  &:hover {
    background: Rgb(255 255 255 / 10%);
    color: Rgb(255 255 255 / 85%);
    border-color: Rgb(255 255 255 / 20%);
  }

  &.active {
    background: color-mix(in sRGB, var(--sort-accent) 18%, transparent);
    color: var(--sort-accent);
    border-color: color-mix(in sRGB, var(--sort-accent) 55%, transparent);
    box-shadow: 0 0 8px color-mix(in sRGB, var(--sort-accent) 20%, transparent);
  }

  .sort-label {
    @include pixelated;

    display: flex;
    align-items: center;
    font-size: 8px;
    letter-spacing: 0.02em;
  }

  .sort-arrow {
    display: flex;
    align-items: center;
    font-family: sans-serif !important;
    font-size: 9px;
    line-height: 1;
    opacity: 0.9;
  }

  .star-icon {
    display: block;
    width: 10px;
    height: 10px;
    flex-shrink: 0;
  }
}
</style>
