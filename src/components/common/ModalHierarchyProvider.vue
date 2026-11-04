<script setup lang="ts">
import { provide, toRef } from 'vue';

interface Props {
  id?: string;
  isTop?: boolean;
  isSimplified?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  id: '',
  isTop: true,
  isSimplified: false
});

// Provide the performance and modal identity state to all children (BaseModal, PokemonDisplayCard, etc.)
provide('modalId', props.id);
provide('isModalFastMode', toRef(props, 'isSimplified'));
provide('isModalPerformanceMode', toRef(props, 'isSimplified'));
provide('isModalTop', toRef(props, 'isTop'));
</script>

<template>
  <slot />
</template>
