<script setup lang="ts">
interface Props {
  show: boolean;
  title?: string;
  cardVariant?: 'default' | 'purple' | 'yellow';
  headerClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  cardVariant: 'default',
  headerClass: 'bg-gradient-to-b from-blue-500 to-blue-700'
});

const emit = defineEmits<{
  (e: 'close'): void;
}>();
</script>

<template>
  <div
    v-if="props.show"
    id="adventure-modal-div-1"
    class="adv-modal-overlay"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    @click.self="emit('close')"
    @keydown.esc="emit('close')"
  >
    <div
      class="adv-modal-card"
      :class="{
        'border-purple': props.cardVariant === 'purple',
        'border-yellow': props.cardVariant === 'yellow'
      }"
    >
      <div v-if="props.title" class="adv-modal-header" :class="props.headerClass">
        {{ props.title }}
      </div>
      <slot />
    </div>
  </div>
</template>

<style lang="scss" src="../../styles/modals.scss"></style>
