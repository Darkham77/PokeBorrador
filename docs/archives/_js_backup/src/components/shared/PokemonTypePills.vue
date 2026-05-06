<script setup>
import { computed } from 'vue'

const props = defineProps({
  pokemon: { type: Object, required: true },
  size: { type: String, default: 'md' } // 'sm', 'md', 'lg'
})

const types = computed(() => {
  const t = []
  if (props.pokemon.type) t.push(props.pokemon.type)
  if (props.pokemon.type2) t.push(props.pokemon.type2)
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
      {{ type.toUpperCase() }}
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
