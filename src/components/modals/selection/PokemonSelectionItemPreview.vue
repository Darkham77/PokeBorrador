<script setup lang="ts">
import PVTooltip from '@/components/common/PVTooltip.vue'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import { ASSET_TYPES, getAssetUrl } from '@/logic/services/assetService'
import type { Pokemon } from '@/types/pokemon/pokemon'

defineProps<{
  pokemon: Pokemon
}>()

defineEmits<{
  (e: 'open-detail'): void
}>()
</script>

<template>
  <div class="poke-preview-container">
    <PVTooltip
      title="DETALLES"
      description="Ver información completa de este Pokémon."
      position="top"
      class="info-tooltip-wrapper"
    >
      <button
        :id="'pokemon-detail-btn-' + pokemon.uid"
        v-gsap-hover="{ scale: 1.05, y: 0 }"
        type="button"
        class="btn-info-detail-trigger"
        @click.stop="$emit('open-detail')"
      >
        ?
      </button>
    </PVTooltip>

    <div class="poke-preview sprite-click-target">
      <div
        v-if="pokemon.isIllegal"
        class="sel-illegal-danger-badge"
        :title="pokemon.illegalReasons?.join('\n') || 'Pokémon Ilegal'"
      >
        <span class="emoji danger-icon">⚠️</span>
        <span class="danger-label">ILEGAL</span>
      </div>
      <PVSpriteFX
        v-else
        :is-shiny="pokemon.isShiny"
        :is-guardian="pokemon.isGuardian"
        :sparkle-count="5"
      >
        <img
          :src="getAssetUrl(ASSET_TYPES.POKEMON, pokemon.id, { isShiny: pokemon.isShiny })"
          alt=""
          class="pixelated"
          @error="e => { (e.target as HTMLImageElement).style.display = 'none' }"
        >
      </PVSpriteFX>
    </div>
  </div>
</template>

<style scoped src="../PokemonSelectionItem.styles.scss" lang="scss"></style>
