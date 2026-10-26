<script setup lang="ts">
import { computed } from 'vue';

type PVGenderBadgeSize = 'mini' | 'sm' | 'md' | 'lg';

interface Props {
  gender?: string | null;
  isTrainer?: boolean;
  size?: PVGenderBadgeSize;
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  gender: null,
  isTrainer: false,
  size: 'sm',
  title: undefined
});

const FEMALE_TRAINER_GENDER_VALUES = ['m', 'mujer', 'f', 'F'] as const;
const FEMALE_TRAINER_GENDERS: ReadonlySet<string> = new Set<string>(FEMALE_TRAINER_GENDER_VALUES);

const MALE_TRAINER_GENDER_VALUES = ['h', 'hombre'] as const;
const MALE_TRAINER_GENDERS: ReadonlySet<string> = new Set<string>(MALE_TRAINER_GENDER_VALUES);

const FEMALE_GENDER_VALUES = ['f', 'F', 'female', 'mujer'] as const;
const FEMALE_GENDERS: ReadonlySet<string> = new Set<string>(FEMALE_GENDER_VALUES);

const MALE_GENDER_VALUES = ['m', 'M', 'male', 'hombre', 'h'] as const;
const MALE_GENDERS: ReadonlySet<string> = new Set<string>(MALE_GENDER_VALUES);

const resolvedType = computed<'male' | 'female' | null>(() => {
  const g = props.gender;
  if (!g) return null;
  if (props.isTrainer) {
    if (FEMALE_TRAINER_GENDERS.has(g)) return 'female';
    if (MALE_TRAINER_GENDERS.has(g)) return 'male';
    return null;
  }
  if (FEMALE_GENDERS.has(g)) return 'female';
  if (MALE_GENDERS.has(g)) return 'male';
  return null;
});

const defaultTitle = computed(() => {
  if (props.title) return props.title;
  if (resolvedType.value === 'female') return 'Femenino';
  if (resolvedType.value === 'male') return 'Masculino';
  return '';
});
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
      <circle cx="6" cy="10" r="3.2" stroke="currentColor" stroke-width="2" />
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
      <circle cx="8" cy="5.8" r="3.2" stroke="currentColor" stroke-width="2" />
      <path
        d="M8 9V14M5.5 11.5H10.5"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      />
    </svg>

    <span class="sr-only"
      ><span class="emoji">{{ resolvedType === 'female' ? '♀' : '♂' }}</span>
      {{ defaultTitle }}</span
    >
  </span>
</template>

<style scoped lang="scss">
.pv-gender-badge {
  position: relative;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  line-height: 1;
  box-sizing: border-box;
  flex-shrink: 0;
  vertical-align: middle;
  user-select: none;
  overflow: hidden;

  // SIZES with rounded corners ("redondea más las puntas, es demasiado cuadrado")
  &.mini {
    width: 14px;
    height: 14px;
    padding: 1.5px;
    border-radius: $radius-md-alt;
  }

  &.sm {
    width: 16px;
    height: 16px;
    padding: 2px;
    border-radius: $radius-md;
  }

  &.md {
    width: 20px;
    height: 20px;
    padding: 2.5px;
    border-radius: $radius-7;
  }

  &.lg {
    width: 24px;
    height: 24px;
    padding: 3px;
    border-radius: $radius-9;
  }

  // MALE
  &.male {
    border: 1px solid Rgb(255 255 255 / 20%);
    background: Linear-Gradient(135deg, var(--sky-dark) 0%, var(--sky-dark) 100%);
    color: var(--white);
    box-shadow: var(--shadow-glow-blue-sm);
  }

  // FEMALE
  &.female {
    border: 1px solid Rgb(255 255 255 / 20%);
    background: Linear-Gradient(135deg, var(--pink-600) 0%, var(--pink-500) 100%);
    color: var(--white);
    box-shadow: var(--shadow-glow-rose);
  }

  .gender-svg {
    display: block;
    width: 100%;
    height: 100%;
    filter: Drop-Shadow(0 1px 1px Rgb(0 0 0 / 40%));
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border-width: 0;
  }
}
</style>
