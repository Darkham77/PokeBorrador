<script setup lang="ts">
import { useShowdownSandboxStore } from '../useShowdownSandboxStore';

const store = useShowdownSandboxStore();

const handleSwitchSelection = (targetIndex: number) => {
  if (store.isAnimating || store.gameOver) return;
  store.chooseSwitch(targetIndex);
};
</script>

<template>
  <!-- Forced Switch Screen Overlay (Modal de Relevo Obligatorio) -->
  <div
    v-if="store.forcedSwitchRequired && !store.gameOver"
    class="forced-switch-overlay"
  >
    <div class="forced-switch-panel">
      <h2 class="forced-title">
        ☠️ ¡Tu Pokémon se debilitó!
      </h2>
      <p class="forced-subtitle">
        Elige un relevo obligatorio de tu equipo para continuar:
      </p>
      
      <div class="forced-grid">
        <button
          v-for="(poke, idx) in store.playerTeam"
          :key="poke.id"
          class="forced-poke-btn"
          :class="{ 
            'fainted-combatant': poke.hp === 0 || poke.status === 'fnt',
            'disabled': poke.hp === 0 || poke.status === 'fnt' || store.isAnimating
          }"
          :disabled="poke.hp === 0 || poke.status === 'fnt' || store.isAnimating"
          @click="handleSwitchSelection(idx)"
        >
          <img
            :src="poke.spriteUrl"
            class="forced-poke-icon pixelated"
            :alt="poke.name"
          >
          <div class="forced-poke-info">
            <span class="forced-poke-name">{{ poke.name }}</span>
            <span class="forced-poke-hp">{{ poke.hp }} PS / {{ poke.maxHp || 100 }} PS</span>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.forced-switch-overlay {
  position: absolute;
  inset: 0;
  background: rgba(5, 7, 12, 0.85);
  backdrop-filter: blur(8px);
  z-index: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.forced-switch-panel {
  background: rgba(15, 18, 32, 0.95);
  border: 2px solid rgba(255, 69, 58, 0.3);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255, 69, 58, 0.15);
  border-radius: 16px;
  padding: 24px;
  max-width: 500px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;

  .forced-title {
    font-family: var(--font-pixel);
    font-size: 14px;
    color: var(--red, #ff453a);
    text-align: center;
    margin: 0;
    text-shadow: 0 0 10px rgba(255, 69, 58, 0.3);
  }

  .forced-subtitle {
    font-family: var(--font-ui, 'Nunito', sans-serif);
    font-size: 13px;
    color: #aeaea2;
    text-align: center;
    margin: 0;
  }
}

.forced-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 8px;
}

.forced-poke-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.3s ease;

  .forced-poke-icon {
    width: 32px;
    height: 32px;
    object-fit: contain;
  }

  .forced-poke-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .forced-poke-name {
    font-family: var(--font-pixel);
    font-size: 7px;
    color: white;
  }

  .forced-poke-hp {
    font-family: var(--font-ui, 'Nunito', sans-serif);
    font-size: 10px;
    color: var(--gray, #86868b);
  }

  &:hover:not(.disabled) {
    background: rgba(10, 132, 255, 0.1);
    border-color: var(--blue, #0a84ff);
    transform: translateY(-2px);
  }

  &.fainted-combatant {
    border-color: var(--red, #ff453a);
    background: rgba(255, 69, 58, 0.05);
    opacity: 0.4;
    cursor: not-allowed;
  }

  &.disabled {
    cursor: not-allowed;
  }
}

.pixelated {
  image-rendering: pixelated;
}
</style>
