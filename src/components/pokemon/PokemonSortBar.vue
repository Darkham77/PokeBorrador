<script setup lang="ts">
import { computed } from 'vue';
import PVTooltip from '@/components/common/PVTooltip.vue';
import {
  POKEMON_SORT_OPTIONS,
  isSortOptionActive,
  type PokemonSortOption
} from '@/logic/constants/pokemonSortConstants';

interface Props {
  modelValue?: string;
  sortDirection?: string;
  sortOrder?: string;
  sortBy?: string;
  sortMode?: string;
  allowedKeys?: readonly string[];
  showLabel?: boolean;
  label?: string;
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  sortDirection: undefined,
  sortOrder: undefined,
  sortBy: undefined,
  sortMode: undefined,
  allowedKeys: undefined,
  showLabel: false,
  label: 'ORDEN:',
  compact: false
});

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void;
  (e: 'update:sortBy', val: string): void;
  (e: 'update:sortMode', val: string): void;
  (e: 'update:sortDirection', val: string): void;
  (e: 'update:sortOrder', val: string): void;
  (e: 'change', payload: { key: string; direction: string }): void;
}>();

const activeKey = computed(() => {
  return props.modelValue ?? props.sortBy ?? props.sortMode ?? 'recent';
});

const currentDirection = computed(() => {
  return props.sortDirection ?? props.sortOrder ?? 'desc';
});

const visibleOptions = computed<readonly PokemonSortOption[]>(() => {
  if (!props.allowedKeys || props.allowedKeys.length === 0) {
    return POKEMON_SORT_OPTIONS;
  }
  const allowed = props.allowedKeys;
  return (POKEMON_SORT_OPTIONS as readonly PokemonSortOption[]).filter((opt: PokemonSortOption) => {
    return (
      allowed.includes(opt.id) || Boolean(opt.aliases?.some((a: string) => allowed.includes(a)))
    );
  });
});

function handleOptionClick(opt: PokemonSortOption) {
  const isCurrentlyActive = isSortOptionActive(opt, activeKey.value);
  const nextDirection = isCurrentlyActive && currentDirection.value === 'desc' ? 'asc' : 'desc';

  emit('update:modelValue', opt.id);
  emit('update:sortBy', opt.id);
  emit('update:sortMode', opt.id);
  emit('update:sortDirection', nextDirection);
  emit('update:sortOrder', nextDirection);
  emit('change', { key: opt.id, direction: nextDirection });
}
</script>

<template>
  <div class="pokemon-sort-bar" :class="{ 'is-compact': compact }">
    <span v-if="showLabel" class="mini-label">{{ label }}</span>
    <div class="sort-items">
      <PVTooltip
        v-for="opt in visibleOptions"
        :key="opt.id"
        :title="opt.label"
        :description="opt.desc"
        position="bottom"
        class="sort-tooltip-wrapper"
      >
        <button
          id="pokemon-sort-bar-btn-1"
          v-gsap-hover
          type="button"
          class="sort-pill-btn"
          :class="{ active: isSortOptionActive(opt, activeKey), 'is-compact': compact }"
          @click.stop="handleOptionClick(opt)"
        >
          <span class="emoji">{{ opt.icon }}</span>
          <span v-if="!compact" class="label">{{ opt.shortLabel }}</span>
          <span v-if="isSortOptionActive(opt, activeKey)" class="emoji arrow">
            {{ currentDirection === 'desc' ? '▼' : '▲' }}
          </span>
        </button>
      </PVTooltip>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/core/tools' as *;

.pokemon-sort-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: $spacing-sm-alt;
  width: 100%;

  .mini-label {
    @include pixelated;

    color: var(--gray);
    font-size: var(--font-8);
    letter-spacing: 0.5px;
    white-space: nowrap;
    user-select: none;
    margin-right: 2px;
    flex-shrink: 0;
  }

  .sort-items {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: $spacing-xs;
    min-width: 0;
  }

  .sort-tooltip-wrapper {
    display: inline-flex;
    flex-shrink: 0;
  }

  .sort-pill-btn {
    @include pixelated;

    display: inline-flex;
    justify-content: center;
    align-items: center;
    gap: $spacing-xs;
    padding: 6px 9px;
    border: 1px solid Rgb(255 255 255 / 8%);
    border-radius: $radius-lg;
    background: Rgb(255 255 255 / 3%);
    color: var(--gray);
    font-size: var(--font-8);
    cursor: pointer;
    white-space: nowrap;
    user-select: none;

    &:hover:not(.active) {
      background: Rgb(255 255 255 / 8%);
      color: var(--white);
      border-color: Rgb(255 255 255 / 20%);
    }

    .emoji {
      font-size: var(--font-9);
      flex-shrink: 0;
    }

    .label {
      font-size: var(--font-8);
      white-space: nowrap;
    }

    .arrow {
      color: var(--yellow);
      font-size: var(--font-7);
      font-weight: bold;
      margin-left: 2px;
      flex-shrink: 0;
    }

    &.active {
      background: Rgb(255 214 10 / 14%);
      color: var(--yellow);
      border-color: var(--yellow);
      box-shadow: var(--shadow-glow-yellow-sm);
    }
  }

  &.is-compact {
    gap: $spacing-xs;

    .sort-items {
      gap: $spacing-xs-alt;
    }

    .sort-pill-btn {
      gap: $spacing-2xs;
      padding: 5px 6px;

      .emoji {
        font-size: var(--font-10);
      }
    }
  }

  @media (width <= 768px) {
    gap: $spacing-xs;

    .label {
      display: none;
    }

    .sort-items {
      gap: $spacing-xs-alt;
    }

    .sort-pill-btn {
      gap: $spacing-2xs;
      padding: 5px 6px;

      .emoji {
        font-size: var(--font-10);
      }
    }
  }
}
</style>
