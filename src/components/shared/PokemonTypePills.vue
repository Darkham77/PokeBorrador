<script setup lang="ts">
import { computed } from 'vue'
import PokemonTypeTag from './PokemonTypeTag.vue'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { ComponentPillSize } from '@/types/system/game'
import { toPokemonType, type PokemonType } from '@/data/battle/types'

interface Props {
  pokemon: Partial<Pokemon>
  size?: ComponentPillSize
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md'
})

const types = computed<PokemonType[]>(() => {
  const t: PokemonType[] = []
  if (props.pokemon?.type) t.push(toPokemonType(props.pokemon.type))
  if (props.pokemon?.type2) t.push(toPokemonType(props.pokemon.type2))
  return t
})
</script>

<template>
  <div 
    v-if="types.length > 0"
    :class="['pokemon-type-pills', size]"
  >
    <PokemonTypeTag
      v-for="type in types"
      :key="type"
      :type="type"
      :size="size"
    />
  </div>
</template>

<style scoped lang="scss">
.pokemon-type-pills {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 4px;

  &.ssm {
    flex-direction: row;
    flex-wrap: nowrap !important;
    gap: 2px;
    width: auto;
    max-width: 100%;
  }

  &.sm {
    gap: 2px;
  }
}
</style>
