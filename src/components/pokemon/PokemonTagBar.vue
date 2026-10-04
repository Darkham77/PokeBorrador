<script setup lang="ts">
import { computed } from 'vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import {
  CANONICAL_FILTER_TAGS,
  type FilterTagDefinition,
  type PokemonFilterTagId
} from '@/logic/constants/tags'
import type { Pokemon } from '@/types/pokemon/pokemon'

interface Props {
  modelValue?: readonly PokemonFilterTagId[]
  activeTags?: readonly PokemonFilterTagId[]
  compact?: boolean
  showLabel?: boolean
  label?: string
  allowedKeys?: readonly PokemonFilterTagId[]
  showCompatible?: boolean
  filterCompatibleOnly?: boolean
  otherDaycarePokemon?: Pokemon | null
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  activeTags: undefined,
  compact: false,
  showLabel: false,
  label: 'ETIQUETAS:',
  allowedKeys: undefined,
  showCompatible: false,
  filterCompatibleOnly: false,
  otherDaycarePokemon: null
})

const emit = defineEmits<{
  (e: 'update:modelValue', val: PokemonFilterTagId[]): void
  (e: 'update:activeTags', val: PokemonFilterTagId[]): void
  (e: 'update:filterCompatibleOnly', val: boolean): void
  (e: 'toggle', tagId: PokemonFilterTagId): void
}>()

const selectedTags = computed<readonly PokemonFilterTagId[]>(() => {
  return props.activeTags ?? props.modelValue ?? []
})

const visibleTags = computed<readonly FilterTagDefinition[]>(() => {
  if (!props.allowedKeys || props.allowedKeys.length === 0) {
    return CANONICAL_FILTER_TAGS
  }
  const allowed = new Set(props.allowedKeys)
  return CANONICAL_FILTER_TAGS.filter(t => allowed.has(t.id))
})

function isTagActive(tagId: PokemonFilterTagId): boolean {
  if (tagId === 'shiny' && selectedTags.value.includes('shy')) return true
  if (tagId === 'shy' && selectedTags.value.includes('shiny')) return true
  if (tagId === 'comp' && selectedTags.value.includes('competitive')) return true
  if (tagId === 'competitive' && selectedTags.value.includes('comp')) return true
  return selectedTags.value.includes(tagId)
}

function toggleTag(tagId: PokemonFilterTagId) {
  const current = [...selectedTags.value]
  const idx = current.indexOf(tagId)

  if (idx > -1) {
    current.splice(idx, 1)
    emit('update:modelValue', current)
    emit('update:activeTags', current)
    emit('toggle', tagId)
    return
  }

  // Handle aliases
  if (tagId === 'shiny') {
    const altIdx = current.indexOf('shy')
    if (altIdx > -1) {
      current.splice(altIdx, 1)
      emit('update:modelValue', current)
      emit('update:activeTags', current)
      emit('toggle', tagId)
      return
    }
  } else if (tagId === 'shy') {
    const altIdx = current.indexOf('shiny')
    if (altIdx > -1) {
      current.splice(altIdx, 1)
      emit('update:modelValue', current)
      emit('update:activeTags', current)
      emit('toggle', tagId)
      return
    }
  }

  current.push(tagId)
  emit('update:modelValue', current)
  emit('update:activeTags', current)
  emit('toggle', tagId)
}

function toggleCompatible() {
  emit('update:filterCompatibleOnly', !props.filterCompatibleOnly)
}
</script>

<template>
  <div
    class="pokemon-tag-bar"
    :class="{ 'is-compact': compact }"
  >
    <span
      v-if="showLabel"
      class="mini-label"
    >{{ label }}</span>

    <div class="tag-items ps-tags-list-horizontal">
      <slot name="prefix" />

      <PVTooltip
        v-for="t in visibleTags"
        :key="t.id"
        :title="t.label"
        :description="t.desc"
        position="bottom"
        class="tag-tooltip-wrapper"
      >
        <button
          v-gsap-hover
          type="button"
          :class="[
            'tag-pill-btn',
            `tag-${t.id}`,
            { active: isTagActive(t.id), 'is-compact': compact }
          ]"
          @click.stop="toggleTag(t.id)"
        >
          <span class="emoji tag-icon">{{ t.icon }}</span>
          <span
            v-if="!compact"
            class="tag-text ps-tag-label"
          >{{ t.shortLabel }}</span>
        </button>
      </PVTooltip>

      <!-- Botón especial de Compatibilidad para Guardería -->
      <PVTooltip
        v-if="showCompatible"
        :title="otherDaycarePokemon ? 'COMPATIBLES' : 'MODO COMPATIBLE'"
        :description="otherDaycarePokemon 
          ? `Mostrar solo Pokémon compatibles con ${otherDaycarePokemon.name}.` 
          : 'Filtro compatible (elige una pareja en el otro slot para filtrar).'"
        position="bottom"
        class="tag-tooltip-wrapper"
      >
        <button
          v-gsap-hover
          type="button"
          :class="[
            'tag-pill-btn',
            'tag-compatible',
            { active: filterCompatibleOnly, 'is-compact': compact }
          ]"
          @click.stop="toggleCompatible"
        >
          <span class="emoji tag-icon">❤️</span>
          <span
            v-if="!compact"
            class="tag-text ps-tag-label"
          >COMPATIBLE</span>
        </button>
      </PVTooltip>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.pokemon-tag-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-width: 0;
  overflow: visible;

  .mini-label {
    @include pixelated;

    color: var(--gray);
    font-size: 7px;
    opacity: 0.6;
    letter-spacing: 0.5px;
    white-space: nowrap;
    user-select: none;
    flex-shrink: 0;
  }

  .tag-items {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 4px;
    min-width: 0;
    overflow: visible;
  }

  .tag-tooltip-wrapper {
    display: inline-flex;
    flex-shrink: 0;
    overflow: visible;
  }

  .tag-pill-btn {
    @include pixelated;

    display: inline-flex;
    justify-content: center;
    align-items: center;
    gap: 4px;
    padding: 5px 8px;
    border: 1px solid rgb(255 255 255 / 8%);
    border-radius: 8px;
    background: rgb(255 255 255 / 3%);
    color: var(--gray);
    font-size: 6.5px;
    cursor: pointer;
    white-space: nowrap;
    user-select: none;
    flex-shrink: 0;

    &:hover {
      background: rgb(255 255 255 / 8%);
      color: var(--white);
      border-color: rgb(255 255 255 / 20%);
    }

    .tag-icon {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      font-size: 8.5px;
      line-height: 1.25;
      opacity: 0.85;
      flex-shrink: 0;
    }

    .tag-text {
      display: inline-flex;
      align-items: center;
      line-height: 1.25;
    }

    &.active {
      background: var(--purple-low);
      color: var(--white);
      border-color: var(--purple);
      box-shadow: 0 0 10px rgb(199 125 255 / 20%);

      .tag-icon {
        opacity: 1;
      }
    }

    &.tag-compatible.active {
      background: rgb(244 63 94 / 20%);
      color: #f43f5e;
      border-color: #f43f5e;
      box-shadow: 0 0 10px rgb(244 63 94 / 25%);
    }
  }

  @mixin tag-bar-compact {
    gap: 4px;

    .tag-items {
      flex-wrap: nowrap;
      gap: 3px;
      overflow: visible;
    }

    .tag-text {
      display: none !important;
    }

    .tag-pill-btn {
      gap: 0;
      padding: 5px 6px;

      .tag-icon {
        font-size: 9px;
      }
    }
  }

  &.is-compact {
    @include tag-bar-compact;
  }

  @media (width <= 768px) {
    @include tag-bar-compact;
  }

  @media (width <= 480px) {
    .mini-label {
      display: none;
    }
  }
}
</style>
