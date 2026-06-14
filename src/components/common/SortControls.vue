<script setup lang="ts">
type SortKey = 'name' | 'price' | 'rarity'
type SortOrder = 'asc' | 'desc'

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
        class="sort-arrow"
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
        class="sort-arrow"
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
        class="sort-arrow"
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
  --sort-accent-bg: Rgba(255, 214, 10, 0.18);
  --sort-accent-border: Rgba(255, 214, 10, 0.55);
  --sort-accent-glow: Rgba(255, 214, 10, 0.2);

  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.sort-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  height: 26px;
  min-width: 30px;
  padding: 0 6px;
  background: Rgba(255, 255, 255, 0.05);
  border: 1px solid Rgba(255, 255, 255, 0.1);
  border-radius: 7px;
  color: Rgba(255, 255, 255, 0.5);
  cursor: pointer;
  font-family: inherit;
  line-height: 1;

  &:hover {
    background: Rgba(255, 255, 255, 0.1);
    border-color: Rgba(255, 255, 255, 0.2);
    color: Rgba(255, 255, 255, 0.85);
  }

  &.active {
    background: color-mix(in srgb, var(--sort-accent) 18%, transparent);
    border-color: color-mix(in srgb, var(--sort-accent) 55%, transparent);
    color: var(--sort-accent);
    box-shadow: 0 0 8px color-mix(in srgb, var(--sort-accent) 20%, transparent);
  }

  .sort-label {
    @include pixelated;
    font-size: 8px;
    line-height: 1;
    display: flex;
    align-items: center;
    letter-spacing: 0.02em;
  }

  .sort-arrow {
    font-size: 9px;
    line-height: 1;
    display: flex;
    align-items: center;
    font-family: sans-serif !important;
    opacity: 0.9;
  }

  .star-icon {
    width: 10px;
    height: 10px;
    display: block;
    flex-shrink: 0;
  }

  // Coin icon used in BC Shop slot
  .bc-coin-icon {
    font-size: 11px;
    line-height: 1;
    display: flex;
    align-items: center;
    color: #c084fc;
  }
}
</style>
