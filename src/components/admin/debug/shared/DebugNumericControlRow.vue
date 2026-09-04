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
  gap: 6px;
  background: Rgba(255, 255, 255, 0.02);
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid Rgba(255, 255, 255, 0.06);
}

.row-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .label-group {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: help;

    .row-icon {
      font-size: 10px;
    }

    .row-label {
      font-size: 8px;
      color: var(--white);
      @include pixelated;
    }

    .info-badge {
      font-size: 7px;
      opacity: 0.6;
    }
  }

  .default-tag {
    font-size: 7px;
    color: Rgba(148, 163, 184, 0.75);
    @include pixelated;
  }
}

.row-controls {
  display: flex;
  gap: 8px;
  align-items: center;

  .input-wrapper {
    display: flex;
    align-items: center;
    background: Rgba(0, 0, 0, 0.4);
    border: 1px solid Rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    padding: 0 4px;
    height: 26px;

    &:focus-within {
      border-color: var(--green);
      box-shadow: 0 0 8px Rgba(34, 197, 94, 0.25);
    }

    .affix {
      font-size: 8px;
      color: Rgba(255, 255, 255, 0.7);
      @include pixelated;
      user-select: none;
      padding: 0 2px;
    }

    .numeric-input {
      width: 55px;
      background: transparent;
      border: none;
      color: var(--white);
      font-size: 9px;
      padding: 2px 4px;
      @include pixelated;

      &:focus {
        outline: none;
      }
    }
  }

  .presets-row {
    display: flex;
    gap: 4px;
    flex: 1;

    .preset-btn {
      @include btn-vicio-base;
      @include btn-vicio-size('xs');
      @include btn-vicio-variant('secondary', 'xs');
      flex: 1;
      height: 26px;
      padding: 0 4px;
      font-size: 7px;
      min-width: 0;

      &.default-btn {
        flex: 1.1;
        border-color: Rgba(59, 130, 246, 0.4);
        color: #93c5fd;

        &:hover, &.active {
          background: Rgba(59, 130, 246, 0.3);
          color: white;
        }
      }
    }
  }
}
</style>
