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
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  sortDirection: undefined,
  sortOrder: undefined,
  sortBy: undefined,
  sortMode: undefined,
  allowedKeys: undefined,
  showLabel: false,
  label: 'ORDEN:'
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
  let nextDirection = 'desc'

  if (isCurrentlyActive) {
    nextDirection = currentDirection.value === 'desc' ? 'asc' : 'desc'
  } else {
    nextDirection = 'desc'
  }

  emit('update:modelValue', opt.id)
  emit('update:sortBy', opt.id)
  emit('update:sortMode', opt.id)
  emit('update:sortDirection', nextDirection)
  emit('update:sortOrder', nextDirection)
  emit('change', { key: opt.id, direction: nextDirection })
}
</script>

<template>
  <div class="pokemon-sort-bar">
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
          :class="{ active: isSortOptionActive(opt, activeKey) }"
          @click.stop="handleOptionClick(opt)"
        >
          <span class="emoji">{{ opt.icon }}</span>
          <span class="label">{{ opt.shortLabel }}</span>
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
    flex-wrap: nowrap;
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
      line-height: 1;
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
}
</style>
