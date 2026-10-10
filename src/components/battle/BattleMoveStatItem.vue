<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  label: string
  value: number
  baseValue: number
  isInfinite?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isInfinite: false
})

const isBoosted = computed(() => !props.isInfinite && props.value > props.baseValue)
const isPenalized = computed(() => !props.isInfinite && props.value < props.baseValue)
</script>

<template>
  <div class="detail-item">
    <span class="d-label pixelated">{{ label }}</span>
    <span 
      class="d-val pixelated"
      :class="{
        'stat-boosted': isBoosted,
        'stat-penalized': isPenalized
      }"
    >
      <span
        v-if="isInfinite"
        class="emoji"
      >♾️</span>
      <template v-else>
        {{ value || '-' }}
        <span
          v-if="isBoosted"
          class="emoji arrow up"
        >▲</span>
        <span
          v-if="isPenalized"
          class="emoji arrow down"
        >▼</span>
      </template>
    </span>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;
@use "@/styles/tokens/colors" as *;
@use "@/styles/components/_move-detail-item.scss" as *;

.detail-item {
  @include move-detail-item;
}

.stat-boosted {
  color: var(--emerald-500) !important;
  text-shadow: 0 0 2px Rgb(16 185 129 / 40%);
}

.stat-penalized {
  color: var(--red-light) !important;
  text-shadow: 0 0 2px Rgb(239 68 68 / 40%);
}

.arrow {
  display: inline-block;
  font-size: var(--font-7);
  line-height: 1;
  margin-left: 1px;
  vertical-align: middle;

  &.up {
    color: var(--emerald-500);
    text-shadow: 0 0 2px Rgb(16 185 129 / 40%);
  }
  &.down {
    color: var(--red-light);
    text-shadow: 0 0 2px Rgb(239 68 68 / 40%);
  }
}
</style>
