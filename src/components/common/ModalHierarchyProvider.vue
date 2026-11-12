<script setup lang="ts">
import { computed, provide, toRef } from 'vue';

import { useModalStore } from '@/stores/modals';

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

const modalStore = useModalStore();
const modalEntry = computed(() => (props.id ? modalStore.getEntryByUid(props.id) : undefined));

provide('modalId', props.id);
provide('modalEntry', modalEntry);
provide('isModalFastMode', toRef(props, 'isSimplified'));
provide('isModalPerformanceMode', toRef(props, 'isSimplified'));
provide('isModalTop', toRef(props, 'isTop'));
</script>

<template>
  <slot />
</template>
