<script setup lang="ts">
import HomePassiveDefenseWidget from '@/components/home/HomePassiveDefenseWidget.vue';

interface Props {
  columns?: 3 | 6;
}

const props = withDefaults(defineProps<Props>(), {
  columns: 3
});
</script>

<template>
  <div class="arena-passive-panel">
    <HomePassiveDefenseWidget
      :in-modal="true"
      :columns="props.columns"
    />
  </div>
</template>

<style scoped lang="scss">
.arena-passive-panel {
  width: 100%;
  box-sizing: border-box;
}
</style>
