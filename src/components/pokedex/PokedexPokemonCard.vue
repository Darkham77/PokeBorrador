<script setup>
defineProps({
  p: { type: Object, required: true }
})
defineEmits(['click'])
</script>

<template>
  <div 
    class="pokemon-card"
    :class="{ 
      'is-caught': p.isCaught, 
      'is-unseen': !p.isSeen,
      'has-sprite': p.isSeen 
    }"
    @click="$emit('click')"
  >
    <div class="card-bg" />
    <div class="dex-number">
      #{{ p.dexNum }}
    </div>
    
    <div class="sprite-container">
      <template v-if="p.isSeen">
        <img 
          :src="p.spriteUrl" 
          :alt="p.name"
          class="pokemon-sprite"
          :class="{ 'silhouette': !p.isCaught }"
        >
      </template>
      <div
        v-else
        class="unknown-placeholder"
      >
        ?
      </div>
    </div>

    <div class="card-footer">
      <span class="pokemon-name">{{ p.name }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/views/pokedex";
</style>
