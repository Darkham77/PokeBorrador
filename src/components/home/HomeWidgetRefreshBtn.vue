<script setup lang="ts">
import BaseRefreshButton from '@/components/common/BaseRefreshButton.vue'

interface Props {
  id?: string
  loading?: boolean
  disabled?: boolean
  label?: string
  title?: string
  size?: 'sm' | 'md'
  variant?: 'circle' | 'pill'
}

withDefaults(defineProps<Props>(), {
  id: undefined,
  loading: false,
  disabled: false,
  label: undefined,
  title: 'Refrescar contenido',
  size: 'sm',
  variant: 'circle'
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()
</script>

<template>
  <BaseRefreshButton
    :id="id"
    :loading="loading"
    :disabled="disabled"
    :title="title"
    :label="label"
    :size="size"
    :variant="variant"
    @click="emit('click', $event)"
  />
</template>

