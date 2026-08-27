<script setup lang="ts">

import { provide, toRef } from 'vue'

const props = defineProps({
  id: { type: String, default: '' },
  isTop: { type: Boolean, default: true },
  isSimplified: { type: Boolean, default: false }
})

// Provide the performance and modal identity state to all children (BaseModal, PokemonDisplayCard, etc.)
provide('modalId', props.id)
provide('isModalPerformanceMode', toRef(props, 'isSimplified'))
provide('isModalTop', toRef(props, 'isTop'))
</script>

<template>
  <slot />
</template>
