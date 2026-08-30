<script setup lang="ts">
import { computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { Pokemon } from '@/types/pokemon/pokemon'

const props = defineProps<{
  pokemon: Pokemon
  isPlayer: boolean
  isScrambled: boolean
}>()

const GENDER_TEXT_MAP: Record<string, string> = { m: '♂', f: '♀' }
const GENDER_CLS_MAP: Record<string, string> = { m: 'gender-male', f: 'gender-female' }

const getGenderText = (g: string) => GENDER_TEXT_MAP[g] || ''
const getGenderCls = (g: string) => GENDER_CLS_MAP[g] || 'gender-none'

const displayName = computed(() => {
  if (props.isScrambled) return '???'
  const name = props.pokemon.name
  return (name === 'Nidoran-M' || name === 'Nidoran-F') ? 'Nidoran' : name
})
</script>

<template>
  <div class="card-header">
    <span class="poke-name">
      {{ displayName }}
    </span>
    <div
      v-if="pokemon.gender && !isScrambled && !pokemon.name.includes(getGenderText(pokemon.gender))"
      class="m-badge-gender"
      :class="getGenderCls(pokemon.gender)"
    >
      {{ getGenderText(pokemon.gender) }}
    </div>
    <img
      v-if="!isPlayer && pokemon.caught"
      :src="getAssetUrl(ASSET_TYPES.ITEM, 'pokeball')"
      class="caught-icon"
      @error="e => (e.target as HTMLImageElement).style.display = 'none'"
    >
  </div>
</template>

<style scoped src="./BattleInfoCard.styles.scss" lang="scss"></style>

