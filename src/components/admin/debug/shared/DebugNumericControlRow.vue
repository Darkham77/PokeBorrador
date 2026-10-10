<script setup lang="ts">
/**
 * src/components/admin/debug/shared/DebugNumericControlRow.vue
 * 
 * Generic modular row for debug numeric settings.
 * Includes label with explanatory tooltip, numeric input with prefix/suffix,
 * quick preset buttons, and a dedicated default button that restores the original game value.
 */

import PVTooltip from '@/components/common/PVTooltip.vue'
import type { DebugPresetOption } from './debugControlTypes.ts'

interface Props {
  id?: string
  label: string
  icon?: string
  tooltip?: string
  defaultLabel?: string
  defaultValue?: number | null
  modelValue: number | null
  min?: number
  max?: number
  step?: number
  placeholder?: string
  prefix?: string
  suffix?: string
  presets?: readonly DebugPresetOption[]
}

const props = withDefaults(defineProps<Props>(), {
  id: '',
  icon: '',
  tooltip: '',
  defaultLabel: '',
  defaultValue: null,
  min: 0,
  max: 100,
  step: 1,
  placeholder: 'Defecto',
  prefix: '',
  suffix: '',
  presets: () => []
})

const emit = defineEmits<{
  (e: 'update:modelValue', val: number | null): void
}>()

function onInput(e: Event) {
  const target = e.target as HTMLInputElement
  const raw = target.value.trim()
  if (raw === '') {
    emit('update:modelValue', null)
  } else {
    const num = Number(raw)
    emit('update:modelValue', isNaN(num) ? null : num)
  }
}

function setPreset(val: number) {
  emit('update:modelValue', val)
}

function restoreDefault() {
  emit('update:modelValue', props.defaultValue ?? null)
}

const isDefaultActive = () => {
  if (props.defaultValue === null || props.defaultValue === undefined) {
    return props.modelValue === null || props.modelValue === undefined
  }
  return props.modelValue === props.defaultValue
}
</script>

<template>
  <div class="debug-numeric-row">
    <div class="row-header">
      <PVTooltip :title="tooltip || label">
        <div class="label-group">
          <span
            v-if="icon"
            class="emoji row-icon"
          >{{ icon }}</span>
          <span class="row-label">{{ label }}</span>
          <span class="emoji info-badge">ℹ️</span>
        </div>
      </PVTooltip>
      <span
        v-if="defaultLabel"
        class="default-tag"
      >{{ defaultLabel }}</span>
    </div>

    <div class="row-controls">
      <div class="input-wrapper">
        <span
          v-if="prefix"
          class="affix prefix"
        >{{ prefix }}</span>
        <input
          :id="id ? `${id}-input` : undefined"
          :value="modelValue ?? ''"
          type="number"
          :min="min"
          :max="max"
          :step="step"
          :placeholder="placeholder"
          class="numeric-input"
          @input="onInput"
        >
        <span
          v-if="suffix"
          class="affix suffix"
        >{{ suffix }}</span>
      </div>

      <div class="presets-row">
        <PVTooltip
          v-for="p in presets"
          :key="p.label"
          :title="p.tooltip || `Establecer en ${p.label}`"
        >
          <button
            :id="id ? `${id}-preset-${p.value}` : undefined"
            class="preset-btn"
            :class="{ active: modelValue === p.value }"
            @click.stop="setPreset(p.value)"
          >
            {{ p.label }}
          </button>
        </PVTooltip>

        <PVTooltip title="Restaurar al valor predeterminado del juego">
          <button
            :id="id ? `${id}-preset-default` : undefined"
            class="preset-btn default-btn"
            :class="{ active: isDefaultActive() }"
            @click.stop="restoreDefault"
          >
            <span class="emoji">🔄</span> DEF
          </button>
        </PVTooltip>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.debug-numeric-row {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm-alt;
  padding: 8px 10px;
  border: 1px solid Rgb(255 255 255 / 6%);
  border-radius: $radius-md;
  background: Rgb(255 255 255 / 2%);
}

.row-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .label-group {
    display: flex;
    align-items: center;
    gap: $spacing-sm-alt;
    cursor: help;

    .row-icon {
      font-size: var(--font-10);
    }

    .row-label {
      @include pixelated;

      color: var(--white);
      font-size: var(--font-8);
    }

    .info-badge {
      font-size: var(--font-7);
      opacity: 0.6;
    }
  }

  .default-tag {
    @include pixelated;

    color: Rgb(148 163 184 / 75%);
    font-size: var(--font-7);
  }
}

.row-controls {
  display: flex;
  align-items: center;
  gap: $spacing-sm;

  .input-wrapper {
    display: flex;
    align-items: center;
    height: 26px;
    padding: 0 4px;
    border: 1px solid Rgb(255 255 255 / 15%);
    border-radius: $radius-sm;
    background: Rgb(0 0 0 / 40%);

    &:focus-within {
      border-color: var(--green);
      box-shadow: var(--shadow-glow-green);
    }

    .affix {
      @include pixelated;

      padding: 0 2px;
      color: Rgb(255 255 255 / 70%);
      font-size: var(--font-8);
      user-select: none;
    }

    .numeric-input {
      @include pixelated;

      width: 55px;
      padding: 2px 4px;
      border: none;
      background: transparent;
      color: var(--white);
      font-size: var(--font-9);

      &:focus {
        outline: none;
      }
    }
  }

  .presets-row {
    display: flex;
    gap: $spacing-xs;
    flex: 1;

    .preset-btn {
      @include btn-vicio-base;
      @include btn-vicio-size('xs');
      @include btn-vicio-variant('secondary', 'xs');

      min-width: 0;
      height: 26px;
      padding: 0 4px;
      font-size: var(--font-7);
      flex: 1;

      &.default-btn {
        color: var(--blue-300);
        flex: 1.1;
        border-color: Rgb(59 130 246 / 40%);

        &:hover, &.active {
          background: Rgb(59 130 246 / 30%);
          color: var(--white);
        }
      }
    }
  }
}
</style>
