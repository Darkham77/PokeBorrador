<script setup lang="ts">
import { computed } from 'vue'
import { translateType } from '@/data/types'
import type { Pokemon } from '@/types/pokemon'

interface Props {
  pokemon: Partial<Pokemon>
  size?: string // 'sm', 'md', 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md'
})

const types = computed<string[]>(() => {
  const t: string[] = []
  if (props.pokemon?.type) t.push(props.pokemon.type)
  if (props.pokemon?.type2) t.push(props.pokemon.type2)
  return t
})
</script>

<template>
  <div 
    v-if="types.length > 0"
    :class="['pokemon-type-pills', size]"
  >
    <span
      v-for="type in types"
      :key="type"
      :class="['m-type-tag', `type-${type.toLowerCase()}`, size]"
    >
      {{ translateType(type).toUpperCase() }}
    </span>
  </div>
</template>

<style scoped lang="scss">
.pokemon-type-pills {
  display: flex;
  justify-content: center;
  gap: 4px;
  align-items: center;
  flex-wrap: wrap;

  &.sm {
    gap: 2px;
  }
}
</style>
