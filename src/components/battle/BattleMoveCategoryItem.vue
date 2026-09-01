<script setup lang="ts">
import type { Move } from '@/types/pokemon/pokemon'

defineProps<{
  move: Move
  moveData: Move | null
}>()
</script>

<template>
  <div class="detail-item">
    <span class="d-label pixelated">CAT:</span>
    <span class="d-val pixelated">
      <span class="cat-full"><span class="emoji">{{ moveData?.cat === 'physical' ? '⚔️' : moveData?.cat === 'special' ? '✨' : '🔮' }}</span> {{ moveData?.cat === 'physical' ? 'Físico' : moveData?.cat === 'special' ? 'Especial' : 'Estado' }}</span>
      <span class="cat-short"><span class="emoji">{{ moveData?.cat === 'physical' ? '⚔️' : moveData?.cat === 'special' ? '✨' : '🔮' }}</span> {{ moveData?.cat === 'physical' ? 'FIS' : moveData?.cat === 'special' ? 'ESP' : 'EST' }}</span>
    </span>
  </div>
  <div class="mv-pp-wrap">
    <span class="mv-pp-label pixelated">PP</span>
    <span class="mv-pp-val pixelated">
      <span
        v-if="move.id === 'struggle'"
        class="emoji"
      >♾️</span>
      <template v-else>{{ move.pp }}/{{ move.maxPP }}</template>
    </span>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;
@use "@/styles/tokens/colors" as *;
@use "@/styles/components/_move-detail-item.scss" as *;

.detail-item {
  @include move-detail-item;

  .cat-short { 
    display: none; 
    @media (max-width: 560px) { display: inline; }
  }
  .cat-full { 
    display: inline; 
    @media (max-width: 560px) { display: none; }
  }
}

.mv-pp-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  
  .mv-pp-label { 
    font-size: 6px; 
    color: var(--yellow); 
    opacity: 0.7; 
    @media (max-width: 560px) { font-size: 5px; opacity: 0.6; min-width: 25px; }
  }
  .mv-pp-val { 
    font-size: 7px; 
    color: $white; 
    font-weight: 900; 
    @media (max-width: 560px) { font-size: 6px; }
  }

  @media (max-width: 560px) {
    margin-top: 4px;
    align-items: flex-start;
    flex-direction: row;
    gap: 4px;
  }
}
</style>
