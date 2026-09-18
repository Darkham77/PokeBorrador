<script setup lang="ts">
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'
import type { PokemonType } from '@/data/battle/types'
import type { SeasonalThemeConfig } from '@/data/system/rankedData'

interface Props {
  currentTheme: SeasonalThemeConfig
  allowedTypes?: readonly PokemonType[]
  levelCap?: string | number
  clickable?: boolean
}

withDefaults(defineProps<Props>(), {
  allowedTypes: () => [],
  levelCap: '50',
  clickable: false
})

const emit = defineEmits<{
  (e: 'click'): void
}>()

const getPokemonRewardSprite = (species: string, isShiny: boolean = false) => {
  return getAssetUrl(ASSET_TYPES.POKEMON, species, {
    shiny: isShiny,
    form: 'front'
  })
}
</script>

<template>
  <section
    v-gsap-hover
    class="season-tournament-card"
    :class="{ 'is-clickable': clickable }"
    @click="clickable ? emit('click') : undefined"
  >
    <div class="tournament-banner-wrapper">
      <img
        :src="getAssetUrl(ASSET_TYPES.BANNER, currentTheme.bannerImage)"
        :alt="currentTheme.name"
        class="tournament-banner-img allow-aliasing"
        @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
      >
    </div>

    <div class="tournament-details">
      <div class="tournament-header-row">
        <span class="season-badge">TORNEO DE TEMPORADA</span>
        <h3 class="tournament-name text-outline">
          {{ currentTheme.name }}
        </h3>
      </div>

      <p class="tournament-desc">
        {{ currentTheme.description }}
      </p>

      <div class="tournament-badges-row">
        <span class="rule-badge text-outline">
          <span class="emoji">⚔️</span> 6 vs 6 (Single)
        </span>
        <span class="rule-badge text-outline">
          <span class="emoji">⭐</span> Nivel Máx: {{ levelCap }}
        </span>
        <span
          v-if="currentTheme.isLittleCup"
          class="rule-badge special-rule text-outline"
        >
          <span class="emoji">🐣</span> Little Cup
        </span>
        <span
          v-if="currentTheme.requiresMonotype"
          class="rule-badge special-rule text-outline"
        >
          <span class="emoji">🧬</span> Monotipo
        </span>
        <span
          v-if="currentTheme.requiresDualType"
          class="rule-badge special-rule text-outline"
        >
          <span class="emoji">⚡</span> Doble Tipo
        </span>

        <!-- Allowed Types Badges -->
        <div
          v-if="allowedTypes && allowedTypes.length"
          class="types-pills-row"
        >
          <PokemonTypeTag
            v-for="t in allowedTypes"
            :key="t"
            :type="t"
            size="ssm"
          />
        </div>
        <span
          v-else
          class="rule-badge all-types text-outline"
        >
          Todos los tipos permitidos
        </span>
      </div>

      <!-- Shiny Reward Preview for Diamante / Maestro -->
      <div class="tournament-reward-preview">
        <img
          :src="getPokemonRewardSprite(currentTheme.rewardPokemon.maestro.species, true)"
          :alt="currentTheme.rewardPokemon.maestro.species"
          class="reward-sprite pixel-art"
        >
        <div class="reward-text-group">
          <span class="reward-tag text-outline">RECOMPENSA EXCLUSIVA MAESTRO</span>
          <span class="reward-name text-outline">
            <span class="emoji">✨</span> {{ currentTheme.rewardPokemon.maestro.species }} SHINY (IVs 31x4)
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss" src="@/styles/components/_arena.scss"></style>
<style scoped lang="scss">
.is-clickable {
  cursor: pointer;
}
</style>
