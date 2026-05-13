<script setup lang="ts">
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'

interface PokedexPokemon {
  dexNum: number | string
  name: string
  spriteUrl: string
  isSeen: boolean
  isCaught: boolean
  isShiny?: boolean
  isGuardian?: boolean
  aura?: string
}

interface Props {
  p: PokedexPokemon
}

defineProps<Props>()

defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()
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
            class="pdx-pokemon-sprite"
            :class="[
              { 'silhouette': !p.isCaught },
              p.aura ? `aura-${p.aura}-mini` : ''
            ]"
            @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
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
