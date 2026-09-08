<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { gsap } from 'gsap'

interface Props {
  id?: string
  loading?: boolean
  disabled?: boolean
  title?: string
  size?: 'sm' | 'md'
  variant?: 'circle' | 'pill'
  label?: string
  ariaLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  id: undefined,
  loading: false,
  disabled: false,
  title: 'Actualizar',
  size: 'sm',
  variant: 'circle',
  label: undefined,
  ariaLabel: undefined
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const iconRef = ref<SVGElement | null>(null)
let spinTween: gsap.core.Tween | null = null

watch(() => props.loading, (isLoading) => {
  if (isLoading && iconRef.value) {
    if (!spinTween) {
      spinTween = gsap.to(iconRef.value, {
        rotation: '+=360',
        duration: 1,
        repeat: -1,
        ease: 'none'
      })
    }
  } else if (spinTween) {
    spinTween.kill()
    spinTween = null
    if (iconRef.value) {
      gsap.set(iconRef.value, { rotation: 0 })
    }
  }
}, { immediate: true })

onUnmounted(() => {
  if (spinTween) {
    spinTween.kill()
    spinTween = null
  }
})
</script>

<template>
  <button
    :id="id"
    v-gsap-hover
    :class="[
      variant === 'circle' ? 'btn-refresh-header' : 'btn-refresh-pill',
      variant === 'circle' ? `size-${size}` : '',
      { 'is-loading': loading }
    ]"
    :disabled="disabled || loading"
    :title="title"
    :aria-label="ariaLabel || label || title"
    @click.stop="emit('click', $event)"
  >
    <svg
      ref="iconRef"
      class="refresh-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
    </svg>
    <span
      v-if="label || $slots.default"
      class="btn-label"
    >
      <slot>{{ label }}</slot>
    </span>
  </button>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.btn-refresh-header {
  @include btn-refresh-header;
}

.btn-refresh-pill {
  @include btn-refresh-pill;
}
</style>
