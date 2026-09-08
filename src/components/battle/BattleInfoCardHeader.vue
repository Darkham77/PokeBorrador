<script setup lang="ts">
import { computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { Pokemon } from '@/types/pokemon/pokemon'

import PVGenderBadge from '@/components/common/PVGenderBadge.vue'

const props = defineProps<{
  pokemon: Pokemon
  isPlayer: boolean
  isScrambled: boolean
}>()

const displayName = computed(() => {
  if (props.isScrambled) return '???'
  const name = props.pokemon.name
  return (name === 'Nidoran-M' || name === 'Nidoran-F') ? 'Nidoran' : name
})

const hasNameGender = computed(() => {
  const n = props.pokemon.name
  return n.includes('♂') || n.includes('♀')
})
</script>

<template>
  <div class="card-header">
    <span class="poke-name">
      {{ displayName }}
    </span>
    <PVGenderBadge
      v-if="pokemon.gender && !isScrambled && !hasNameGender"
      :gender="pokemon.gender"
      size="sm"
    />
    <img
      v-if="!isPlayer && pokemon.caught"
      :src="getAssetUrl(ASSET_TYPES.ITEM, 'pokeball')"
      class="caught-icon"
      @error="e => (e.target as HTMLImageElement).style.display = 'none'"
    >
  </div>
</template>

<style scoped src="./BattleInfoCard.styles.scss" lang="scss"></style>

