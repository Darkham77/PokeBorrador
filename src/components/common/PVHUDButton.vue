<script setup lang="ts">
interface Props {
  id?: string;
  active?: boolean;
  badgeValue?: number;
  customClass?: string;
}

withDefaults(defineProps<Props>(), {
  id: undefined,
  active: false,
  badgeValue: 0,
  customClass: ''
});

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();
</script>

<template>
  <button
    :id="id"
    class="hud-sq-btn"
    :class="[customClass, { active: active }]"
    @click="emit('click', $event)"
  >
    <span class="icon">
      <slot name="icon" />
    </span>
    <span class="nav-item-label">
      <slot />
    </span>
    <span v-if="badgeValue > 0" class="hud-notification-badge">
      {{ badgeValue }}
    </span>
  </button>
</template>

<style scoped lang="scss">
@use '@/styles/layouts/hud/pills';
</style>
