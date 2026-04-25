<script setup>
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'

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
        <PVSpriteFX
          :is-shiny="p.isShiny"
          :is-guardian="p.isGuardian"
          :sparkle-count="5"
        >
          <img 
            :src="p.spriteUrl"
            :alt="p.name" 
            class="pokemon-sprite"
            :class="[
              { 'silhouette': !p.isCaught },
              p.aura ? `aura-${p.aura}-mini` : ''
            ]"
            @error="e => e.target.style.display = 'none'"
          >
        </PVSpriteFX>
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
