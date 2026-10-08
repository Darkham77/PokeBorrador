<script setup lang="ts">
import { translateType, type PokemonType } from '@/data/battle/types'
import type { ComponentPillSize } from '@/types/system/game'

const _TYPE_TAG_ELEMENTS = ['span', 'button'] as const
type TypeTagElement = (typeof _TYPE_TAG_ELEMENTS)[number]

interface Props {
  type: PokemonType
  size?: ComponentPillSize
  tag?: TypeTagElement
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
    :class="['m-type-tag', size, `type-${type}`, { active }]"
  >
    {{ translateType(type).toUpperCase() }}
  </component>
</template>

<style scoped lang="scss">
@use "@/styles/components/badges" as *;
</style>

