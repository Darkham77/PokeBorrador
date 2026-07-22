<script setup lang="ts">
defineProps<{
  teamBallsStatus: ('active' | 'fainted' | 'empty')[]
}>()
</script>

<template>
  <div class="team-balls-row">
    <div 
      v-for="(status, idx) in teamBallsStatus" 
      :key="idx"
      class="ball-slot"
      :class="status"
    />
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/_team-balls.scss" as *;
</style>
