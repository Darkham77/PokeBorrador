<script setup lang="ts">
interface ArrowInfo {
  show: boolean
  isUp: boolean
}

interface Props {
  label: string
  cssClass?: string
  isDash?: boolean
  isInfinity?: boolean
  text?: string
  arrow?: ArrowInfo
}

withDefaults(defineProps<Props>(), {
  cssClass: '',
  isDash: false,
  isInfinity: false,
  text: '',
  arrow: undefined
})
</script>

<template>
  <div class="stat-box">
    <span class="stat-lbl">{{ label }}</span>
    <span
      class="stat-val"
      :class="cssClass"
    >
      <span
        v-if="isDash"
        class="dash-val"
      >-</span>
      <span
        v-else-if="isInfinity"
        class="emoji infinity-val"
      >♾️</span>
      <template v-else>
        {{ text }}
        <span
          v-if="arrow?.show"
          class="emoji arrow"
          :class="arrow?.isUp ? 'up' : 'down'"
        >{{ arrow?.isUp ? '▲' : '▼' }}</span>
      </template>
    </span>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;
@use "@/styles/components/_move-tooltip-shared.scss" as *;

.arrow {
  @include arrow-mixin;
}
</style>
