<script setup lang="ts">
import { computed } from 'vue'

type PVGenderBadgeSize = 'mini' | 'sm' | 'md' | 'lg'

interface Props {
  gender?: string | null
  isTrainer?: boolean
  size?: PVGenderBadgeSize
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  gender: null,
  isTrainer: false,
  size: 'sm',
  title: undefined
})

const resolvedType = computed<'male' | 'female' | null>(() => {
  const g = props.gender
  if (!g) return null
  if (props.isTrainer) {
    if (g === 'm' || g === 'mujer' || g === 'f' || g === 'F') return 'female'
    if (g === 'h' || g === 'hombre') return 'male'
    return null
  }
  if (g === 'f' || g === 'F' || g === 'female' || g === 'mujer') return 'female'
  if (g === 'm' || g === 'M' || g === 'male' || g === 'hombre' || g === 'h') return 'male'
  return null
})

const defaultTitle = computed(() => {
  if (props.title) return props.title
  if (resolvedType.value === 'female') return 'Femenino'
  if (resolvedType.value === 'male') return 'Masculino'
  return ''
})
</script>

<template>
  <span
    v-if="resolvedType"
    class="pv-gender-badge"
    :class="[resolvedType, size]"
    :title="defaultTitle"
    :aria-label="defaultTitle"
    role="img"
  >
    <!-- Male SVG: circle bottom-left, arrow top-right -->
    <svg
      v-if="resolvedType === 'male'"
      class="gender-svg"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="6"
        cy="10"
        r="3.2"
        stroke="currentColor"
        stroke-width="2"
      />
      <path
        d="M8.5 7.5L13 3M9 3H13V7"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>

    <!-- Female SVG: circle top-center, cross stem bottom -->
    <svg
      v-else-if="resolvedType === 'female'"
      class="gender-svg"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="8"
        cy="5.8"
        r="3.2"
        stroke="currentColor"
        stroke-width="2"
      />
      <path
        d="M8 9V14M5.5 11.5H10.5"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      />
    </svg>

    <span class="sr-only"><span class="emoji">{{ resolvedType === 'female' ? '♀' : '♂' }}</span> {{ defaultTitle }}</span>
  </span>
</template>

<style scoped lang="scss">
.pv-gender-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  flex-shrink: 0;
  vertical-align: middle;
  line-height: 1;
  user-select: none;
  position: relative;
  overflow: hidden;

  // SIZES with rounded corners ("redondea más las puntas, es demasiado cuadrado")
  &.mini {
    width: 14px;
    height: 14px;
    border-radius: 5px;
    padding: 1.5px;
  }

  &.sm {
    width: 16px;
    height: 16px;
    border-radius: 6px;
    padding: 2px;
  }

  &.md {
    width: 20px;
    height: 20px;
    border-radius: 7px;
    padding: 2.5px;
  }

  &.lg {
    width: 24px;
    height: 24px;
    border-radius: 9px;
    padding: 3px;
  }

  // MALE
  &.male {
    background: linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%);
    color: #ffffff;
    box-shadow: 0 0 6px Rgba(14, 165, 233, 0.55);
    border: 1px solid Rgba(255, 255, 255, 0.2);
  }

  // FEMALE
  &.female {
    background: linear-gradient(135deg, #db2777 0%, #ec4899 100%);
    color: #ffffff;
    box-shadow: 0 0 6px Rgba(236, 72, 153, 0.55);
    border: 1px solid Rgba(255, 255, 255, 0.2);
  }

  .gender-svg {
    width: 100%;
    height: 100%;
    display: block;
    filter: Drop-Shadow(0 1px 1px Rgba(0, 0, 0, 0.4));
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
}
</style>
