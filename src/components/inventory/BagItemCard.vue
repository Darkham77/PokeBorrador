<script setup lang="ts">
import { getItemSpriteUrl } from '@/logic/inventory/inventoryEngine';
import { gsap } from 'gsap';
import { Z_LAYERS } from '@/logic/constants/visuals';
import type { ItemId } from '@/data/inventory/items';

const props = defineProps<{
  item: { id: ItemId; name: string; qty: number | string };
  isSelected: boolean;
  sellMode: boolean;
  sellQty?: number;
}>();

const emit = defineEmits<{
  (e: 'use', itemId: ItemId): void;
  (e: 'click', event: MouseEvent): void;
  (e: 'qtyClick'): void;
  (e: 'updateQty', val: number | string): void;
}>();

// GSAP animations for cards
const onItemMouseEnter = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement;
  gsap.to(target, {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    y: -2,
    duration: 0.2,
    ease: 'power2.out',
    overwrite: 'auto'
  });
};

const onItemMouseLeave = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement;
  gsap.to(target, {
    backgroundColor: props.isSelected ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.03)',
    y: 0,
    duration: 0.2,
    ease: 'power2.out',
    overwrite: 'auto'
  });
};
</script>

<template>
  <div
    id="bag-item-card-div-1"
    :class="['item-card', { selected: isSelected }]"
    role="button"
    tabindex="0"
    @mouseenter="onItemMouseEnter"
    @mouseleave="onItemMouseLeave"
    @click.stop="emit('click', $event)"
  >
    <div class="item-icon-container">
      <div
        id="bag-item-card-div-2"
        class="bag-item-qty"
        role="button"
        tabindex="0"
        @click.stop="emit('qtyClick')"
      >
        {{ item.qty }}
      </div>
      <img
        :src="getItemSpriteUrl(item.id || item.name)"
        :alt="item.name"
        class="item-sprite"
        width="32"
        height="32"
      />
    </div>

    <div class="item-details">
      <div class="item-name">
        {{ item.name }}
      </div>
    </div>

    <div v-if="!sellMode" class="item-footer">
      <button id="bag-item-card-btn-usar" class="use-btn" @click.stop="emit('use', item.id)">
        USAR
      </button>
    </div>

    <!-- Sell Qty Selector -->
    <div v-else-if="sellQty !== undefined" class="sell-qty-selector">
      <div class="qty-controls">
        <button id="bag-item-card-btn-3" @click.stop="emit('updateQty', sellQty - 1)">-</button>
        <input
          id="bag-item-card-input-4"
          type="number"
          min="1"
          :max="Number(item.qty)"
          :value="sellQty"
          aria-label="Cantidad a vender"
          @input="(e: Event) => emit('updateQty', (e.target as HTMLInputElement).value)"
        />
        <button id="bag-item-card-btn-min" @click="emit('updateQty', 1)">MIN</button>
        <button id="bag-item-card-btn-max" @click="emit('updateQty', Number(item.qty))">MAX</button>
        <button id="bag-item-card-btn-5" @click.stop="emit('updateQty', sellQty + 1)">+</button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/core/tools' as *;

.item-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-md;
  padding: 16px;
  border: 1px solid Rgb(255 255 255 / 8%);
  border-radius: $radius-2xl;
  background: Rgb(255 255 255 / 3%);
  cursor: default;
}

.item-card:hover {
  background: Rgb(255 255 255 / 6%);
}

.item-card.selected {
  background: Rgb(16 185 129 / 5%);
  border-color: var(--green-bright);
}

.item-icon-container {
  position: relative;
  width: 48px;
  height: 48px;
}

.item-sprite {
  @include sprite-render;

  width: 100%;
  height: 100%;
  object-fit: contain;
}

.bag-item-qty {
  position: absolute;
  right: -4px;
  bottom: -4px;
  z-index: calc(v-bind('Z_LAYERS.MAP_FLOOR') + 1);
  padding: 2px 6px;
  border-radius: $radius-md;
  background: var(--purple);
  color: var(--white);
  font-size: var(--font-9);
  font-weight: bold;
  cursor: pointer;
}

.item-name {
  color: var(--white);
  font-size: var(--font-12);
  font-weight: bold;
  text-align: center;
}

.use-btn {
  padding: 6px 16px;
  border: none;
  border-radius: $radius-lg;
  background: var(--purple);
  color: var(--white);
  font-size: var(--font-10);
  font-weight: bold;
  cursor: pointer;
}

.sell-qty-selector {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.sell-qty-selector input {
  width: 40px;
  border: 1px solid Rgb(255 255 255 / 10%);
  border-radius: $radius-sm;
  background: Rgb(0 0 0 / 30%);
  color: var(--white);
  text-align: center;
}

.sell-qty-selector button {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: $radius-sm;
  background: Rgb(255 255 255 / 10%);
  color: var(--white);
  cursor: pointer;
}
</style>
