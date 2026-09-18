<script setup lang="ts">
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'
import type { WeatherProbData } from '../debugWeatherTypes'

defineProps<{
  modifiers: WeatherProbData['modifiers']
}>()
</script>

<template>
  <div
    v-if="modifiers"
    class="type-modifiers"
  >
    <div
      v-if="modifiers.boost.length"
      class="mod-group boost"
    >
      <span class="emoji mod-icon">▲</span>
      <PokemonTypeTag
        v-for="t in modifiers.boost"
        :key="t"
        :type="t"
        size="ssm"
      />
    </div>
    <div
      v-if="modifiers.debuff.length"
      class="mod-group debuff"
    >
      <span class="emoji mod-icon">▼</span>
      <PokemonTypeTag
        v-for="t in modifiers.debuff"
        :key="t"
        :type="t"
        size="ssm"
      />
    </div>
    <div
      v-if="modifiers.block.length"
      class="mod-group block"
    >
      <span class="emoji mod-icon">🚫</span>
      <PokemonTypeTag
        v-for="t in modifiers.block"
        :key="t"
        :type="t"
        size="ssm"
      />
    </div>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_debug-weather-tables.scss"></style>

