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
.team-balls-row {
  display: flex;
  gap: 6px;
  margin-top: 4px;
  margin-bottom: 4px;
  padding: 2px 0;

  .ball-slot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 1px solid Rgba(0, 0, 0, 0.6);
    position: relative;
    box-sizing: border-box;
    overflow: hidden;
    background: #ffffff;
    
    &.active {
      box-shadow: 0 0 5px Rgba(255, 62, 62, 0.6);

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 50%;
        background: #ff3e3e;
      }
    }
    
    &.fainted {
      background: #555555;
      &::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        width: 100%;
        height: 1px;
        background: #ff0000;
        transform: Translatey(-50%) Rotate(45deg);
      }
    }
    
    &.empty {
      background: transparent;
      border: 1px dashed Rgba(255, 255, 255, 0.3);
    }
  }
}
</style>
