<script setup lang="ts">
import { computed } from 'vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import {
  POKEMON_SORT_OPTIONS,
  isSortOptionActive,
  type PokemonSortOption
} from '@/logic/constants/pokemonSortConstants'

interface Props {
  modelValue?: string
  sortDirection?: string
  sortOrder?: string
  sortBy?: string
  sortMode?: string
  allowedKeys?: readonly string[]
  showLabel?: boolean
  label?: string
  compact?: boolean
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
})

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void
  (e: 'update:sortBy', val: string): void
  (e: 'update:sortMode', val: string): void
  (e: 'update:sortDirection', val: string): void
  (e: 'update:sortOrder', val: string): void
  (e: 'change', payload: { key: string; direction: string }): void
}>()

const activeKey = computed(() => {
  return props.modelValue ?? props.sortBy ?? props.sortMode ?? 'recent'
})

const currentDirection = computed(() => {
  return props.sortDirection ?? props.sortOrder ?? 'desc'
})

const visibleOptions = computed<readonly PokemonSortOption[]>(() => {
  if (!props.allowedKeys || props.allowedKeys.length === 0) {
    return POKEMON_SORT_OPTIONS
  }
  const allowed = props.allowedKeys
  return (POKEMON_SORT_OPTIONS as readonly PokemonSortOption[]).filter((opt: PokemonSortOption) => {
    return allowed.includes(opt.id) || Boolean(opt.aliases?.some((a: string) => allowed.includes(a)))
  })
})

function handleOptionClick(opt: PokemonSortOption) {
  const isCurrentlyActive = isSortOptionActive(opt, activeKey.value)
  const nextDirection = isCurrentlyActive && currentDirection.value === 'desc' ? 'asc' : 'desc'

  emit('update:modelValue', opt.id)
  emit('update:sortBy', opt.id)
  emit('update:sortMode', opt.id)
  emit('update:sortDirection', nextDirection)
  emit('update:sortOrder', nextDirection)
  emit('change', { key: opt.id, direction: nextDirection })
}
</script>

<template>
  <div
    class="pokemon-sort-bar"
    :class="{ 'is-compact': compact }"
  >
    <span
      v-if="showLabel"
      class="mini-label"
    >{{ label }}</span>
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
          v-gsap-hover
          type="button"
          class="sort-pill-btn"
          :class="{ active: isSortOptionActive(opt, activeKey), 'is-compact': compact }"
          @click.stop="handleOptionClick(opt)"
        >
          <span class="emoji">{{ opt.icon }}</span>
          <span
            v-if="!compact"
            class="label"
          >{{ opt.shortLabel }}</span>
          <span
            v-if="isSortOptionActive(opt, activeKey)"
            class="emoji arrow"
          >
            {{ currentDirection === 'desc' ? '▼' : '▲' }}
          </span>
        </button>
      </PVTooltip>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.pokemon-sort-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;

  .mini-label {
    @include pixelated;
    font-size: 8px;
    color: var(--gray);
    letter-spacing: 0.5px;
    white-space: nowrap;
    user-select: none;
    margin-right: 2px;
    flex-shrink: 0;
  }

  .sort-items {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-width: 0;
  }

  .sort-tooltip-wrapper {
    display: inline-flex;
    flex-shrink: 0;
  }

  .sort-pill-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    background: Rgba(255, 255, 255, 0.03);
    border: 1px solid Rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 6px 9px;
    color: var(--gray);
    @include pixelated;
    font-size: 7.5px;
    cursor: pointer;
    white-space: nowrap;
    user-select: none;

    .emoji {
      font-size: 9px;
      flex-shrink: 0;
    }

    .label {
      font-size: 7.5px;
      white-space: nowrap;
    }

    .arrow {
      font-size: 7px;
      color: var(--yellow);
      font-weight: bold;
      margin-left: 2px;
      flex-shrink: 0;
    }

    &.active {
      background: Rgba(255, 214, 10, 0.14);
      border-color: var(--yellow);
      color: var(--yellow);
      box-shadow: 0 0 8px Rgba(255, 214, 10, 0.2);
    }

    &:hover:not(.active) {
      background: Rgba(255, 255, 255, 0.08);
      color: var(--white);
      border-color: Rgba(255, 255, 255, 0.2);
    }
  }

  &.is-compact {
    gap: 4px;

    .sort-items {
      gap: 3px;
    }

    .sort-pill-btn {
      padding: 5px 6px;
      gap: 2px;

      .emoji {
        font-size: 10px;
      }
    }
  }

  @media (max-width: 768px) {
    gap: 4px;

    .label {
      display: none;
    }

    .sort-items {
      gap: 3px;
    }

    .sort-pill-btn {
      padding: 5px 6px;
      gap: 2px;

      .emoji {
        font-size: 10px;
      }
    }
  }
}
</style>
