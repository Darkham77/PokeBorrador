<script setup lang="ts">
import { computed } from 'vue'
import PokemonTypePills from '@/components/shared/PokemonTypePills.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { useGameStore } from '@/stores/game.ts'
import { NATURE_DATA, getNatureDataByNameOrId } from '@/data/battle/natures.ts'
import type { Pokemon } from '@/types/pokemon/pokemon.ts'

interface Props {
  pokemon: Pokemon
  isPlayer?: boolean
  isScrambled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isPlayer: false,
  isScrambled: false
})

const gameStore = useGameStore()

const natureData = computed(() => {
  if (!props.pokemon?.nature) return NATURE_DATA['serious']
  return getNatureDataByNameOrId(props.pokemon.nature) || NATURE_DATA['serious']
})

const showBreederTooltip = computed(() => {
  return !props.isPlayer && !props.isScrambled && gameStore.state.playerClass === 'criador'
})

const tooltipTitle = computed(() => {
  // domain-ok: UI presentation uppercase label for tooltip title
  return props.pokemon?.nature ? (natureData.value?.name ?? 'Seria').toUpperCase() : 'SERIA'
})
</script>

<template>
  <div class="level-row">
    <div class="poke-level m-badge-level">
      Nv. {{ isScrambled ? '??' : pokemon.level }}
    </div>

    <PVTooltip
      v-if="showBreederTooltip"
      position="bottom"
      :title="tooltipTitle"
    >
      <div class="m-badge-nature">
        {{ natureData?.name || 'Seria' }}
      </div>
      <template #content>
        <div class="nature-pro-tooltip">
          <div
            v-if="natureData?.up || natureData?.down"
            class="modifiers-row"
            style="display: flex; gap: 8px; margin: 4px 0;"
          >
            <span
              v-if="natureData?.up"
              class="stat-mod mod-up"
              style="color: #32d74b; font-weight: bold; font-size: 7.5px; text-transform: uppercase;"
            ><span class="emoji">▲</span> {{ natureData.up }} (+10%)</span>
            <span
              v-if="natureData?.down"
              class="stat-mod mod-down"
              style="color: #ff453a; font-weight: bold; font-size: 7.5px; text-transform: uppercase;"
            ><span class="emoji">▼</span> {{ natureData.down }} (-10%)</span>
          </div>
          <p style="margin: 4px 0 0 0; font-size: 8px; color: #aeaebe; line-height: 1.4;">
            {{ natureData?.desc || 'Sin efecto en estadísticas.' }}
          </p>
        </div>
      </template>
    </PVTooltip>

    <PokemonTypePills 
      v-if="!isScrambled"
      :pokemon="pokemon" 
      :size="pokemon.type2 ? 'ssm' : 'sm'"
      class="poke-types"
    />
  </div>
</template>

<style scoped src="./BattleInfoCard.styles.scss" lang="scss"></style>
