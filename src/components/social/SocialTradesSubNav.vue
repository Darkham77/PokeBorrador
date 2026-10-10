<script setup lang="ts">
import type { TradeSubTab } from './socialTradesHelper'

defineProps<{
  subTab: TradeSubTab
  receivedCount: number
  sentCount: number
  claimsCount: number
}>()

const emit = defineEmits<{
  (e: 'switch-sub-tab', val: TradeSubTab): void
}>()
</script>

<template>
  <div class="trades-sub-nav">
    <button
      id="social-trades-sub-nav-btn-1"
      v-gsap-hover
      :class="{ active: subTab === 'received' }"
      @click.stop="emit('switch-sub-tab', 'received')"
    >
      RECIBIDOS
      <span
        v-if="receivedCount > 0"
        class="hud-notification-badge"
      >{{ receivedCount }}</span>
    </button>
    <button
      id="social-trades-sub-nav-btn-2"
      v-gsap-hover
      :class="{ active: subTab === 'sent' }"
      @click.stop="emit('switch-sub-tab', 'sent')"
    >
      ENVIADOS
      <span
        v-if="sentCount > 0"
        class="hud-notification-badge gray"
      >{{ sentCount }}</span>
    </button>
    <button
      id="social-trades-sub-nav-btn-3"
      v-gsap-hover
      :class="{ active: subTab === 'claims' }"
      @click.stop="emit('switch-sub-tab', 'claims')"
    >
      RECLAMOS
      <span
        v-if="claimsCount > 0"
        class="hud-notification-badge orange"
      >{{ claimsCount }}</span>
    </button>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.trades-sub-nav {
  display: flex;
  gap: $spacing-sm-alt;
  padding: 4px;
  border: 1px solid Rgb(199 125 255 / 10%);
  border-radius: $radius-xl;
  background: Rgb(0 0 0 / 25%);
  margin-bottom: 18px;

  button {
    @include pixelated;

    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: $spacing-sm;
    padding: 8px 12px;
    border: 1px solid transparent;
    border-radius: $radius-lg;
    background: transparent;
    color: Rgb(255 255 255 / 50%);
    font-size: var(--font-8);
    font-weight: bold;
    flex: 1;
    cursor: pointer;

    &:hover:not(.active) {
      background: Rgb(255 255 255 / 3%);
      color: Rgb(255 255 255 / 80%);
    }

    &.active {
      background: Rgb(168 85 247 / 12%);
      color: var(--purple-light);
      border-color: Rgb(168 85 247 / 25%);
    }
  }
}
</style>
