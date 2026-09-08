<script setup lang="ts">
import { useHomeWidgetsCollapse, type HomeWidgetId } from '@/composables/home/useHomeWidgetsCollapse'

defineProps<{
  widgetId: HomeWidgetId
}>()

const { toggleCollapse } = useHomeWidgetsCollapse()
</script>

<template>
  <button
    :id="`home-minimize-${widgetId}-btn`"
    v-gsap-hover
    class="minimize-widget-btn"
    title="Minimizar widget"
    aria-label="Minimizar widget"
    @click.stop="toggleCollapse(widgetId)"
  >
    <i class="fas fa-chevron-up" />
  </button>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.minimize-widget-btn {
  @include widget-minimize-btn;
}
</style>
