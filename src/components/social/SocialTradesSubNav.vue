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
  background: Rgba(0, 0, 0, 0.25);
  border: 1px solid Rgba(199, 125, 255, 0.1);
  padding: 4px;
  border-radius: 12px;
  gap: 6px;
  margin-bottom: 18px;

  button {
    flex: 1;
    position: relative;
    background: transparent;
    border: 1px solid transparent;
    padding: 8px 12px;
    color: Rgba(255, 255, 255, 0.5);
    @include pixelated;
    font-size: 8px;
    cursor: pointer;
    border-radius: 8px;
    
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-weight: bold;

    &:hover:not(.active) {
      background: Rgba(255, 255, 255, 0.03);
      color: Rgba(255, 255, 255, 0.8);
    }

    &.active {
      background: Rgba(168, 85, 247, 0.12);
      color: var(--purple-light);
      border-color: Rgba(168, 85, 247, 0.25);
    }
  }
}
</style>
