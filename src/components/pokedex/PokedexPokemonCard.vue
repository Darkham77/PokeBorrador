<script setup>
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'

defineProps({

  p: { type: Object, required: true }
})
defineEmits(['click'])
</script>

<template>
  <div 
    class="pdx-pokemon-card"
    :class="{ 
      'is-caught': p.isCaught, 
      'is-unseen': !p.isSeen,
      'has-sprite': p.isSeen 
    }"
    @click.stop="$emit('click', $event)"
  >
    <div class="card-bg" />
    <div class="dex-number">
      #{{ p.dexNum }}
    </div>
    
    <div class="pdex-sprite-container">
      <template v-if="p.isSeen">
        <PVSpriteFX
          :is-shiny="p.isShiny"
          :is-guardian="p.isGuardian"
          :sparkle-count="5"
        >
          <img 
            :src="p.spriteUrl"
            :alt="p.name" 
            :style="{ filter: !p.isCaught ? 'Grayscale(1)' : 'none' }"
            class="pdx-pokemon-sprite"
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
      <span class="pdx-pokemon-name">{{ p.name }}</span>
    </div>
  </div>
</template>

<style lang="scss">
</style>
