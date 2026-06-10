<script setup lang="ts">


defineProps({
  id: { type: String, default: undefined },
  active: { type: Boolean, default: false },
  badgeValue: { type: Number, default: 0 },
  customClass: { type: String, default: '' }
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()
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
    <span
      v-if="badgeValue > 0"
      class="badge-pill"
    >
      {{ badgeValue }}
    </span>
  </button>
</template>

<style scoped lang="scss">
// El estilo reside en la clase global .hud-sq-btn (definida en _pills.scss)
// para garantizar consistencia absoluta y reutilización de estilos 1:1.
</style>
