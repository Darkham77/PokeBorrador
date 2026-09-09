<script setup lang="ts">
import { computed } from 'vue'
import BaseModal from '@/components/common/BaseModal.vue'
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import {
  SEASONAL_THEMES_BY_ID,
  getSeasonalThemeForMonth,
  isSeasonalThemeId,
  type SeasonalThemeId,
  type SeasonalThemeConfig
} from '@/data/system/rankedData'
import { resolveMedalTournamentInfo } from '@/logic/pvp/rankedEngine'
import { toPokemonType, type PokemonType } from '@/data/battle/types'
import { GAME_TIMEZONE } from '@/logic/utils/timeUtils'
import type { RankedSeasonMedal } from '@/types/battle/pvp'

interface Props {
  id?: string
  show?: boolean
  themeId?: SeasonalThemeId
  tournamentName?: string
  medal?: RankedSeasonMedal
}

const props = withDefaults(defineProps<Props>(), {
  id: undefined,
  show: true,
  themeId: undefined,
  tournamentName: undefined,
  medal: undefined
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const resolvedTheme = computed<SeasonalThemeConfig>(() => {
  if (props.themeId && isSeasonalThemeId(props.themeId)) {
    const config = SEASONAL_THEMES_BY_ID[props.themeId]
    if (config) return config
  }
  if (props.medal) {
    const info = resolveMedalTournamentInfo(props.medal)
    if (info.themeId && isSeasonalThemeId(info.themeId)) {
      const config = SEASONAL_THEMES_BY_ID[info.themeId]
      if (config) return config
    }
  }
  const currentMonth = Temporal.Now.zonedDateTimeISO(GAME_TIMEZONE).month
  return getSeasonalThemeForMonth(currentMonth)
})

const tournamentTitle = computed(() => {
  if (props.tournamentName) return props.tournamentName
  if (props.medal) {
    const info = resolveMedalTournamentInfo(props.medal)
    if (info.tournamentName) return info.tournamentName
  }
  return resolvedTheme.value.name
})

const allowedTypes = computed<PokemonType[]>(() => {
  return (resolvedTheme.value.allowedTypes || []).map(toPokemonType)
})

const getPokemonRewardSprite = (species: string, isShiny = true) => {
  return getAssetUrl(ASSET_TYPES.POKEMON, species, { isShiny })
}
</script>

<template>
  <BaseModal
    :id="props.id"
    :show="props.show"
    title="DETALLES DEL TORNEO"
    width="540px"
    @close="emit('close')"
  >
    <div class="ranked-tournament-detail-content custom-scrollbar">
      <section class="season-tournament-card">
        <div class="tournament-banner-wrapper">
          <img
            :src="getAssetUrl(ASSET_TYPES.BANNER, resolvedTheme.bannerImage)"
            :alt="tournamentTitle"
            class="tournament-banner-img allow-aliasing"
            @error="(e: Event) => ((e.target as HTMLImageElement).style.display = 'none')"
          >
        </div>

        <div class="tournament-details">
          <div class="tournament-header-row">
            <span class="season-badge">TORNEO DE TEMPORADA</span>
            <h3 class="tournament-name text-outline">
              {{ tournamentTitle }}
            </h3>
          </div>

          <p class="tournament-desc">
            {{ resolvedTheme.description }}
          </p>

          <div class="tournament-badges-row">
            <span class="rule-badge text-outline">
              <span class="emoji">⚔️</span> 6 vs 6 (Single)
            </span>
            <span class="rule-badge text-outline">
              <span class="emoji">⭐</span> Nivel Máx: 50
            </span>
            <span
              v-if="resolvedTheme.isLittleCup"
              class="rule-badge special-rule text-outline"
            >
              <span class="emoji">🐣</span> Little Cup
            </span>
            <span
              v-if="resolvedTheme.requiresMonotype"
              class="rule-badge special-rule text-outline"
            >
              <span class="emoji">🧬</span> Monotipo
            </span>
            <span
              v-if="resolvedTheme.requiresDualType"
              class="rule-badge special-rule text-outline"
            >
              <span class="emoji">⚡</span> Doble Tipo
            </span>

            <!-- Allowed Types Badges -->
            <div
              v-if="allowedTypes.length"
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
          <div
            v-if="resolvedTheme.rewardPokemon?.maestro"
            class="tournament-reward-preview"
          >
            <img
              :src="getPokemonRewardSprite(resolvedTheme.rewardPokemon.maestro.species, true)"
              :alt="resolvedTheme.rewardPokemon.maestro.species"
              class="reward-sprite pixel-art"
            >
            <div class="reward-text-group">
              <span class="reward-tag text-outline">RECOMPENSA EXCLUSIVA MAESTRO</span>
              <span class="reward-name text-outline">
                <span class="emoji">✨</span> {{ resolvedTheme.rewardPokemon.maestro.species }} SHINY (IVs 31x4)
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
.ranked-tournament-detail-content {
  width: 100%;
  box-sizing: border-box;
  max-height: 80dvh;
  overflow-y: auto;
  padding: 4px 0;
}
</style>
