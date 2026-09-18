<script setup lang="ts">
// style-inherited: styles imported in parent PVTooltip.vue (_pv-tooltip.scss)
interface TooltipDescriptionLineData {
  readonly hasBullet: boolean
  readonly text?: string | undefined
  readonly bullet?: string | undefined
  readonly isBoost: boolean
  readonly isDebuff: boolean
  readonly isNeutral: boolean
  readonly isDivider: boolean
  readonly isQuote: boolean
}

defineProps<{
  line: TooltipDescriptionLineData
}>()
</script>

<template>
  <div
    :class="[
      line.isDivider ? 'tooltip-divider-line' : 'tooltip-line',
      { 
        'has-bullet': line.hasBullet,
        'is-boost': line.isBoost,
        'is-debuff': line.isDebuff,
        'is-neutral': line.isNeutral,
        'is-quote': line.isQuote
      }
    ]"
  >
    <hr
      v-if="line.isDivider"
      class="tooltip-divider"
    >
    <template v-else>
      <span
        v-if="line.hasBullet"
        class="emoji bullet-icon"
      >{{ line.bullet }}</span>
      <span 
        class="line-text"
        :class="{ 'is-quote': line.isQuote }"
      >{{ line.text }}</span>
    </template>
  </div>
</template>
