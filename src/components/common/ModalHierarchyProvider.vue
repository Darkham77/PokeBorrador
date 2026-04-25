<script setup>
import { provide, computed } from 'vue'

const props = defineProps({
  isTop: { type: Boolean, default: true },
  isSimplified: { type: Boolean, default: false }
})

// Provide the performance state to all children (BaseModal, PokemonDisplayCard, etc.)
provide('isModalPerformanceMode', computed(() => props.isSimplified))
</script>

<template>
  <slot />
</template>
