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
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  width: 100%;
  overflow: visible;

  .mini-label {
    @include pixelated;
    font-size: 7px;
    color: var(--gray);
    opacity: 0.6;
    letter-spacing: 0.5px;
    white-space: nowrap;
    user-select: none;
    flex-shrink: 0;
  }

  .tag-items {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
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
    align-items: center;
    justify-content: center;
    gap: 4px;
    font-size: 6.5px;
    padding: 5px 8px;
    border-radius: 8px;
    background: Rgba(255, 255, 255, 0.03);
    border: 1px solid Rgba(255, 255, 255, 0.08);
    color: var(--gray);
    cursor: pointer;
    white-space: nowrap;
    user-select: none;
    flex-shrink: 0;

    .tag-icon {
      font-size: 8.5px;
      line-height: 1.25;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      opacity: 0.85;
      flex-shrink: 0;
    }

    .tag-text {
      display: inline-flex;
      align-items: center;
      line-height: 1.25;
    }

    &:hover {
      background: Rgba(255, 255, 255, 0.08);
      border-color: Rgba(255, 255, 255, 0.2);
      color: var(--white);
    }

    &.active {
      background: var(--purple-low);
      border-color: var(--purple);
      color: var(--white);
      box-shadow: 0 0 10px Rgba(199, 125, 255, 0.2);

      .tag-icon {
        opacity: 1;
      }
    }

    &.tag-compatible.active {
      background: Rgba(244, 63, 94, 0.2);
      border-color: #f43f5e;
      color: #f43f5e;
      box-shadow: 0 0 10px Rgba(244, 63, 94, 0.25);
    }
  }

  @mixin tag-bar-compact {
    gap: 4px;

    .tag-items {
      gap: 3px;
      flex-wrap: nowrap;
      overflow: visible;
    }

    .tag-text {
      display: none !important;
    }

    .tag-pill-btn {
      padding: 5px 6px;
      gap: 0;

      .tag-icon {
        font-size: 9px;
      }
    }
  }

  &.is-compact {
    @include tag-bar-compact;
  }

  @media (max-width: 768px) {
    @include tag-bar-compact;
  }

  @media (max-width: 480px) {
    .mini-label {
      display: none;
    }
  }
}
</style>
