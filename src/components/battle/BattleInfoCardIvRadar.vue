<script setup lang="ts">
import type { Pokemon } from '@/types/pokemon/pokemon'

defineProps<{
  isIvScannerActive: boolean
  isPlayer: boolean
  isScrambled: boolean
  isTrainerOrGymOrPvP: boolean
  ivTotal: number
  pokemonTierInfo: { color?: string; bg?: string; tier: string } | null
  p: Pokemon
}>()
</script>

<template>
  <div 
    v-if="isIvScannerActive && !isPlayer && !isScrambled && !isTrainerOrGymOrPvP"
    class="iv-scanner-radar-hud"
  >
    <div class="hud-main-info">
      <span class="hud-label">RADAR IV</span>
      <span class="hud-value">{{ ivTotal }}/186</span>
      <span 
        v-if="pokemonTierInfo" 
        class="hud-grade-badge" 
        :style="{ '--tier-color': pokemonTierInfo.color, '--tier-bg': pokemonTierInfo.bg }"
      >
        GRADO {{ pokemonTierInfo.tier }}
      </span>
    </div>
    <div
      v-if="p.ivs"
      class="hud-ivs-grid"
    >
      <span>HP:{{ p.ivs.hp }}</span>
      <span>ATK:{{ p.ivs.atk }}</span>
      <span>DEF:{{ p.ivs.def }}</span>
      <span>SPA:{{ p.ivs.spa }}</span>
      <span>SPD:{{ p.ivs.spd }}</span>
      <span>SPE:{{ p.ivs.spe }}</span>
    </div>
  </div>
</template>

<style scoped src="./BattleInfoCard.styles.scss" lang="scss"></style>

