<script setup lang="ts">

import { provide, toRef } from 'vue'

const props = defineProps({
  isTop: { type: Boolean, default: true },
  isSimplified: { type: Boolean, default: false }
})

// Provide the performance state to all children (BaseModal, PokemonDisplayCard, etc.)
provide('isModalPerformanceMode', toRef(props, 'isSimplified'))
provide('isModalTop', toRef(props, 'isTop'))
</script>

<template>
  <slot />
</template>
