<script setup lang="ts">
import { computed } from 'vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import type { SpeciesSummaryData } from './pokemonSummaryTypes.ts'
import {
  getCategoryDescription,
  resolveDimensionTooltipTitle,
  resolveDimensionTooltipDesc,
  resolveDimensionDisplayValue,
  type PhysicalData
} from './pokemonSummaryHelper.ts'

const props = defineProps<{
  species: SpeciesSummaryData
  cleanCategory: string
  isInstance: boolean
  instancePhysicalData: PhysicalData | null
}>()

const categoryDescription = computed(() => getCategoryDescription(props.cleanCategory))

const heightTooltipTitle = computed(() =>
  resolveDimensionTooltipTitle('ALTURA', props.isInstance, props.instancePhysicalData, 'm')
)
const heightTooltipDesc = computed(() =>
  resolveDimensionTooltipDesc('ALTURA', props.isInstance, props.instancePhysicalData, props.species.height, 'm')
)
const heightDisplayValue = computed(() =>
  resolveDimensionDisplayValue('ALTURA', props.isInstance, props.instancePhysicalData, props.species.height, 'm')
)

const weightTooltipTitle = computed(() =>
  resolveDimensionTooltipTitle('PESO', props.isInstance, props.instancePhysicalData, 'kg')
)
const weightTooltipDesc = computed(() =>
  resolveDimensionTooltipDesc('PESO', props.isInstance, props.instancePhysicalData, props.species.weight, 'kg')
)
const weightDisplayValue = computed(() =>
  resolveDimensionDisplayValue('PESO', props.isInstance, props.instancePhysicalData, props.species.weight, 'kg')
)

const hasHeightTier = computed(() => Boolean(props.isInstance && props.instancePhysicalData?.heightTier))
const hasWeightTier = computed(() => Boolean(props.isInstance && props.instancePhysicalData?.weightTier))
</script>

<template>
  <div class="info-grid">
    <PVTooltip
      :title="'CATEGORÍA: ' + cleanCategory"
      :description="categoryDescription"
      position="top"
      tag="div"
      class="info-item"
    >
      <span class="upd-info-label pixelated">CATEGORÍA</span>
      <span class="ps-info-value pixelated">{{ cleanCategory }}</span>
    </PVTooltip>

    <PVTooltip
      :title="heightTooltipTitle"
      :description="heightTooltipDesc"
      position="top"
      tag="div"
      class="info-item"
    >
      <span class="upd-info-label pixelated">ALTURA</span>
      <div class="physical-val-wrapper">
        <span class="ps-info-value pixelated">{{ heightDisplayValue }}</span>
        <span
          v-if="hasHeightTier && instancePhysicalData?.heightTier"
          class="physical-tier-badge pixelated"
          :class="instancePhysicalData.heightTier.cssClass"
        >{{ instancePhysicalData.heightTier.label }}</span>
      </div>
    </PVTooltip>

    <PVTooltip
      :title="weightTooltipTitle"
      :description="weightTooltipDesc"
      position="top"
      tag="div"
      class="info-item"
    >
      <span class="upd-info-label pixelated">PESO</span>
      <div class="physical-val-wrapper">
        <span class="ps-info-value pixelated">{{ weightDisplayValue }}</span>
        <span
          v-if="hasWeightTier && instancePhysicalData?.weightTier"
          class="physical-tier-badge pixelated"
          :class="instancePhysicalData.weightTier.cssClass"
        >{{ instancePhysicalData.weightTier.label }}</span>
      </div>
    </PVTooltip>
  </div>
</template>

<style scoped lang="scss">
@use "../../styles/components/pokedex-detail" as *;
@use "../../styles/components/unified-pokemon-detail" as *;
</style>
