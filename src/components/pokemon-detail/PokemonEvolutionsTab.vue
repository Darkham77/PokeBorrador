<script setup>
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

defineProps({
  evolutions: { type: Array, required: true },
  speciesName: { type: String, required: true },
  speciesId: { type: String, required: true }
})

const getSprite = (id) => getAssetUrl(ASSET_TYPES.POKEMON, id)
</script>

<template>
  <div class="tab-pane evolve-pane">
    <div
      v-if="evolutions.length > 0"
      class="evo-chain"
    >
      <div
        v-for="evo in evolutions"
        :key="evo.to"
        class="evo-step"
      >
        <div class="evo-from">
          <img
            :src="getSprite(speciesId)"
            class="evo-sprite"
            @error="e => e.target.style.display = 'none'"
          >
          <span class="evo-target-name">{{ speciesName }}</span>
        </div>
        <div class="evo-arrow">
          <span class="method">{{ evo.requirement }}</span>
          <span class="arrow">➞</span>
        </div>
        <div class="evo-to">
          <div class="sprite-wrap">
            <template v-if="evo.isSeen">
              <img
                :src="getSprite(evo.to.toLowerCase())"
                class="evo-sprite"
                :class="{ 'silhouette': !evo.isCaught }"
                @error="e => e.target.style.display = 'none'"
              >
            </template>
            <div
              v-else
              class="evo-unknown-placeholder"
            >
              ?
            </div>
          </div>
          <span class="evo-target-name">
            {{ evo.isSeen ? (pokemonDataProvider.getPokemonData(evo.to.toLowerCase())?.name || evo.to) : '???' }}
          </span>
        </div>
      </div>
    </div>
    <div
      v-else
      class="no-evo"
    >
      <span>Este Pokémon no evoluciona.</span>
    </div>
  </div>
</template>

<style lang="scss">
@use "@/styles/components/pokedex-detail";
</style>
