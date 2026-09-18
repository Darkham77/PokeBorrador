<script setup lang="ts">
import { computed } from 'vue'
import type { WeatherId } from '@/logic/weather/weatherRegistry'
import { isLeafWeatherId } from './useAtmosphereLeafAnim'
import { calculateLeafCount } from './atmosphereParticleHelper'

const props = withDefaults(defineProps<{
  weather: WeatherId
  isFastMode?: boolean
  isPerformanceMode?: boolean
  isLowPower?: boolean
}>(), {
  isFastMode: false,
  isPerformanceMode: false,
  isLowPower: false
})

const isFast = computed(() => Boolean(props.isFastMode || props.isPerformanceMode))
const showLeaves = computed(() => !isFast.value && isLeafWeatherId(props.weather))
const count = computed(() => calculateLeafCount(props.weather, props.isLowPower))
</script>

<template>
  <template v-if="showLeaves">
    <div
      v-for="n in count"
      :key="'leaf-' + n"
      class="leaf-element"
    />
  </template>
</template>

<style src="./AtmosphereLayer.styles.scss" scoped lang="scss"></style>
