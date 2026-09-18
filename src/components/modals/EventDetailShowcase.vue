<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'

interface Props {
  bannerUrl?: string | null
  effectiveTitle: string
  involvedSpecies: PokemonSpeciesId[]
  icon?: string
  isShiny?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  bannerUrl: null,
  icon: undefined,
  isShiny: false
})

const emit = defineEmits<{
  (e: 'selectSpecies', speciesId: PokemonSpeciesId): void
}>()

const currentSpeciesIndex = ref(0)
let cycleTween: gsap.core.Tween | null = null

const startSpeciesCycle = () => {
  if (cycleTween) {
    cycleTween.kill()
    cycleTween = null
  }
  if (props.involvedSpecies.length > 1) {
    const SPECIES_CYCLE_DELAY_SEC = 2.5
    cycleTween = gsap.delayedCall(SPECIES_CYCLE_DELAY_SEC, () => {
      currentSpeciesIndex.value = (currentSpeciesIndex.value + 1) % props.involvedSpecies.length
      startSpeciesCycle()
    })
  }
}

watch(() => props.involvedSpecies, () => {
  currentSpeciesIndex.value = 0
  startSpeciesCycle()
}, { immediate: true })

onUnmounted(() => {
  if (cycleTween) {
    cycleTween.kill()
    cycleTween = null
  }
})

const currentSpecies = computed<PokemonSpeciesId | null>(() => {
  if (props.involvedSpecies.length === 0) return null
  return props.involvedSpecies[currentSpeciesIndex.value] || props.involvedSpecies[0] || null
})

function handleSpeciesClick() {
  if (currentSpecies.value) {
    emit('selectSpecies', currentSpecies.value)
  }
}
</script>

<template>
  <!-- Banner Header Image -->
  <div
    v-if="bannerUrl"
    class="event-banner-header"
  >
    <img
      :src="bannerUrl"
      :alt="effectiveTitle"
      class="event-banner-img allow-aliasing"
      @error="(e: Event) => ((e.target as HTMLImageElement).style.display='none')"
    >
  </div>

  <!-- Pokémon showcase (only when no banner image) -->
  <div
    v-else-if="involvedSpecies.length > 0"
    class="event-pokemon-showcase clickable"
    role="button"
    tabindex="0"
    @click="handleSpeciesClick"
    @keydown.enter="handleSpeciesClick"
  >
    <PVTooltip
      v-if="currentSpecies"
      :title="`Ver datos de la Pokédex para ${currentSpecies}`"
      position="top"
    >
      <PVSpriteFX
        :is-shiny="isShiny"
        :sparkle-count="3"
      >
        <img
          :key="currentSpecies"
          :src="getAssetUrl(ASSET_TYPES.POKEMON, currentSpecies, { isShiny })"
          :alt="currentSpecies"
          class="pixelated event-pokemon-sprite"
        >
      </PVSpriteFX>
    </PVTooltip>
    <div
      v-if="involvedSpecies.length > 1"
      class="showcase-dots"
    >
      <span
        v-for="(sp, idx) in involvedSpecies"
        :key="sp"
        class="dot"
        :class="{ active: idx === currentSpeciesIndex }"
      />
    </div>
  </div>

  <!-- Fallback main emoji icon -->
  <div
    v-else-if="!bannerUrl && icon"
    class="emoji event-main-icon"
  >
    {{ icon }}
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/EventDetailModal.styles.scss" as *;
</style>
