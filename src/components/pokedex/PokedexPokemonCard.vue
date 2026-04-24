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
          :class="[
            { 'silhouette': !p.isCaught, 'is-shiny': p.isShiny, 'is-guardian': p.isGuardian },
            p.aura ? `aura-${p.aura}-mini` : ''
          ]"
          @error="e => e.target.style.display = 'none'"
        >
        <!-- Standardized Shiny FX (Mini) -->
        <div
          v-if="p.isShiny"
          class="shiny-sparkles"
        >
          <div
            v-for="i in 3"
            :key="i"
            class="sparkle"
          />
        </div>
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
