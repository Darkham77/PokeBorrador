<script setup>
import { computed } from 'vue';
import { usePlayerClassStore } from '@/stores/playerClass';
import { useUIStore } from '@/stores/ui';
import { PLAYER_CLASSES } from '@/data/playerClasses';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import BaseModal from '@/components/common/BaseModal.vue';

const classStore = usePlayerClassStore();
const uiStore = useUIStore();

defineOptions({ inheritAttrs: false });
defineEmits(['close', 'confirm', 'cancel', 'submit']);

const isOpen = computed({
  get: () => uiStore.isClassSelectionOpen,
  set: (val) => { uiStore.isClassSelectionOpen = val }
});
const close = () => { isOpen.value = false };

const handleSelect = async (id) => {
  const res = await classStore.selectClass(id);
  if (res.success) close();
};

const getTrainerSprite = (id) => {
  return getAssetUrl(ASSET_TYPES.TRAINER, id);
};
</script>

<template>
  <BaseModal
    :show="isOpen"
    title="⚡ ELEGÍ TU CLASE ⚡"
    max-width="95%"
    variant="retro"
    @close="close"
  >
    <div class="class-selection-container">
      <header class="selection-header">
        <p class="selection-subtitle">
          Esta elección define cómo jugás. Podés cambiar más adelante por 10,000 Battle Coins.
        </p>
      </header>

      <div class="classes-grid">
        <div 
          v-for="cls in PLAYER_CLASSES" 
          :key="cls.id"
          class="class-card-premium"
          :style="{ '--cls-color': cls.color }"
          :class="{ 'is-current': classStore.playerClass === cls.id }"
        >
          <div class="card-glow" />
          
          <div class="avatar-circle-wrap">
            <div class="avatar-circle">
              <img 
                :src="getTrainerSprite(cls.showdownSpriteId || cls.id)"
                class="trainer-pixel-art" 
                @error="e => e.target.style.display = 'none'"
              >
            </div>
          </div>

          <h2 class="class-title">
            {{ cls.name }}
          </h2>
          <p class="class-desc">
            {{ cls.description }}
          </p>

          <div class="stats-comparison">
            <div class="stats-section pros">
              <h3><span class="icon">✅</span> VENTAJAS</h3>
              <ul>
                <li
                  v-for="(bonus, idx) in cls.bonuses"
                  :key="idx"
                >
                  {{ bonus }}
                </li>
              </ul>
            </div>

            <div class="stats-section cons">
              <h3><span class="icon">❌</span> PENALIZACIONES</h3>
              <ul>
                <li
                  v-for="(penalty, idx) in cls.penalties"
                  :key="idx"
                >
                  {{ penalty }}
                </li>
              </ul>
            </div>
          </div>

          <button 
            class="select-btn-premium"
            :disabled="classStore.playerClass === cls.id"
            @click="handleSelect(cls.id)"
          >
            <span class="btn-text">
              {{ classStore.playerClass === cls.id ? 'CLASE ACTUAL' : (classStore.playerClass ? 'CAMBIAR' : 'ELEGIR') }}
            </span>
            <span
              v-if="classStore.playerClass && classStore.playerClass !== cls.id"
              class="btn-price"
            >10,000 BC</span>
          </button>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.class-selection-container {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.selection-header {
  text-align: center;
  .selection-subtitle {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
    font-family: 'Press Start 2P', cursive;
    line-height: 1.6;
    max-width: 800px;
    margin: 0 auto;
    @include pixelated;
  }
}

.classes-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  perspective: 1000px;
}

.class-card-premium {
  position: relative;
  background: rgba(30, 41, 59, 0.4);
  backdrop-filter: Blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 32px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  overflow: hidden;

  @include hover-neon-yellow(1px);

  &:hover {
    transform: translateY(-10px) rotateX(2deg);
    border-color: var(--yellow) !important;
    
    .card-glow { opacity: 0.2; }
    .trainer-pixel-art { transform: Scale(1.1); }
  }

  &.is-current {
    border-color: #22c55e;
    &::after {
      content: 'ACTUAL';
      position: absolute;
      top: 12px;
      right: 12px;
      font-size: 8px;
      font-family: 'Press Start 2P', cursive;
      color: #22c55e;
    }
  }

  .card-glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at center, var(--cls-color) 0%, transparent 70%);
    opacity: 0.05;
    transition: opacity 0.4s;
    pointer-events: none;
  }
}

.avatar-circle-wrap {
  margin-bottom: 24px;
  .avatar-circle {
    width: 100px;
    height: 100px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--cls-color);
    box-shadow: 0 0 20px var(--cls-color)44;
  }
  .trainer-pixel-art {
    width: 70px;
    image-rendering: pixelated;
    transition: transform 0.4s;
  }
}

.class-title {
  font-family: 'Press Start 2P', cursive;
  font-size: 14px;
  color: var(--cls-color);
  margin-bottom: 16px;
  text-shadow: 0 0 10px var(--cls-color)66;
  @include pixelated;
}

.class-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
  line-height: 1.5;
  margin-bottom: 24px;
  height: 60px;
  display: flex;
  align-items: center;
}

.stats-comparison {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 32px;
  flex: 1;

  .stats-section {
    h3 {
      font-size: 9px;
      font-family: 'Press Start 2P', cursive;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      @include pixelated;
    }
    
    &.pros h3 { color: #22c55e; }
    &.cons h3 { color: #ef4444; }

    ul {
      list-style: none;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      li {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.7);
        line-height: 1.4;
        position: relative;
        padding-left: 12px;
        &::before {
          content: '•';
          position: absolute;
          left: 0;
          color: rgba(255, 255, 255, 0.3);
        }
      }
    }
  }
}

.select-btn-premium {
  width: 100%;
  padding: 16px;
  background: var(--cls-color);
  color: $white;
  border: none;
  border-radius: 12px;
  font-family: 'Press Start 2P', cursive;
  font-size: 10px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  box-shadow: 0 10px 20px -5px var(--cls-color)88;

  &:hover:not(:disabled) {
    transform: translateY(-2px) Scale(1.02);
    filter: Brightness(1.1);
    box-shadow: 0 15px 30px -5px var(--cls-color);
  }

  &:disabled {
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.2);
    cursor: default;
    box-shadow: none;
  }

  .btn-price {
    font-size: 8px;
    color: rgba(255, 255, 255, 0.7);
  }
}

@media (max-width: 1024px) {
  .classes-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .classes-grid { grid-template-columns: 1fr; }
}
</style>
