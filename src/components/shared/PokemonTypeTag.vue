<script setup lang="ts">
import { translateType } from '@/data/types'

interface Props {
  type: string
  size?: 'ssm' | 'sm' | 'md' | 'lg'
  tag?: 'span' | 'button'
  active?: boolean
}

withDefaults(defineProps<Props>(), {
  size: 'md',
  tag: 'span',
  active: false
})
</script>

<template>
  <component 
    :is="tag"
    :class="['m-type-tag', size, `type-${type.toLowerCase()}`, { active }]"
  >
    {{ translateType(type).toUpperCase() }}
  </component>
</template>

