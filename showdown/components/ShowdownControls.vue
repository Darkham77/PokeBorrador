<script setup lang="ts">
import { useShowdownSandboxStore } from '../stores/useShowdownSandboxStore';
import ShowdownBattleMenu from './ShowdownBattleMenu.vue';
import ShowdownForcedSwitchModal from './ShowdownForcedSwitchModal.vue';

const store = useShowdownSandboxStore();
</script>

<template>
  <div>
    <!-- Lower HUD: Dialogue & Actions -->
    <div class="action-panel">
      <div class="dialogue-box">
        <p class="dialogue-text">
          {{ store.currentMessage }}
        </p>
      </div>

      <!-- Action Selectors and Grids -->
      <ShowdownBattleMenu />
    </div>

    <!-- Forced Switch Modal -->
    <ShowdownForcedSwitchModal />
  </div>
</template>

<style scoped lang="scss">
.action-panel {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  height: 160px;
  background: Rgba(13, 17, 23, 0.95);
  border-top: 2px solid Rgba(255, 255, 255, 0.15);
  box-shadow: 0 -10px 40px Rgba(0, 0, 0, 0.7);
  z-index: 50;

  @media (max-width: 800px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
    height: auto;
  }
}

.dialogue-box {
  padding: 24px;
  border-right: 1px solid Rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  background: Rgba(5, 5, 10, 0.5);

  .dialogue-text {
    font-family: var(--font-pixel);
    font-size: 12px;
    line-height: 1.8;
    color: #f5f5f7;
    margin: 0;
    text-shadow: 1px 1px 2px Rgba(0, 0, 0, 0.8);
  }

  @media (max-width: 800px) {
    border-right: none;
    border-bottom: 1px solid Rgba(255, 255, 255, 0.1);
    padding: 16px;
  }
}
</style>
