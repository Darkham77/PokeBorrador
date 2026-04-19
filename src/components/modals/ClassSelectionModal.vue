<script setup>
import { ref, computed } from 'vue';
import { usePlayerClassStore } from '@/stores/playerClass';
import { useGameStore } from '@/stores/game';
import { useUIStore } from '@/stores/ui';
import { PLAYER_CLASSES } from '@/data/playerClasses';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import BaseModal from '@/components/common/BaseModal.vue';

const classStore = usePlayerClassStore();
const _gameStore = useGameStore();
const uiStore = useUIStore();

const isOpen = computed({
  get: () => uiStore.isClassSelectionOpen,
  set: (val) => { uiStore.isClassSelectionOpen = val }
});
const close = () => { isOpen.value = false };

const hoveredClassId = ref(null);
const selectedTab = ref(classStore.playerClass || Object.keys(PLAYER_CLASSES)[0]);

const currentPreview = computed(() => PLAYER_CLASSES[hoveredClassId.value || selectedTab.value]);

// Resolved via AssetService
const getTrainerSprite = (id) => {
  return getAssetUrl(ASSET_TYPES.TRAINER, id);
};

const handleSelect = async (id) => {
  const res = await classStore.selectClass(id);
  if (res.success) close();
};
</script>

<template>
  <BaseModal
    :show="isOpen"
    title="PROFESIÓN"
    max-width="1000px"
    @close="close"
  >
    <div class="class-selection-inner">
      <div class="modal-content">
        <!-- Sidebar: selection -->
        <aside class="class-sidebar">
          <div 
            v-for="cls in PLAYER_CLASSES" 
            :key="cls.id"
            class="class-item"
            :class="{ active: selectedTab === cls.id, current: classStore.playerClass === cls.id }"
            @mouseenter="hoveredClassId = cls.id"
            @mouseleave="hoveredClassId = null"
            @click="selectedTab = cls.id"
          >
            <div class="class-icon">
              {{ cls.icon }}
            </div>
            <div class="class-meta">
              <span class="name">{{ cls.name }}</span>
              <span
                v-if="classStore.playerClass === cls.id"
                class="active-badge"
              >ACTIVA</span>
            </div>
          </div>
        </aside>

        <!-- Main: Preview -->
        <main
          class="class-preview"
          :style="{ '--preview-color': currentPreview.color }"
        >
          <div class="preview-bg">
            <img
              :src="getTrainerSprite(currentPreview.avatarSpriteId || currentPreview.id)"
              :alt="currentPreview.name"
              class="trainer-img"
            >
          </div>

          <div class="preview-info">
            <div class="info-header">
              <span class="preview-name">{{ currentPreview.name }}</span>
              <p class="preview-desc">
                {{ currentPreview.description }}
              </p>
            </div>

            <div class="pros-cons">
              <div class="section">
                <h3>VIRTUDES</h3>
                <ul>
                  <li
                    v-for="(bonus, idx) in currentPreview.bonuses"
                    :key="idx"
                  >
                    <span class="bullet">✓</span> {{ bonus }}
                  </li>
                </ul>
              </div>
              <div class="section">
                <h3>LIMITACIONES</h3>
                <ul>
                  <li
                    v-for="(penalty, idx) in currentPreview.penalties"
                    :key="idx"
                  >
                    <span class="bullet">✕</span> {{ penalty }}
                  </li>
                </ul>
              </div>
            </div>

            <button 
              class="select-action-btn"
              :disabled="classStore.playerClass === currentPreview.id"
              @click="handleSelect(currentPreview.id)"
            >
              <template v-if="classStore.playerClass === currentPreview.id">
                PROFESIÓN ACTUAL
              </template>
              <template v-else-if="!classStore.playerClass">
                ELEGIR GRATIS
              </template>
              <template v-else>
                CAMBIAR (₽10,000)
              </template>
            </button>
          </div>
        </main>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
.class-selection-inner {
  padding: 0;
  margin: -24px; // Compensate BaseModal padding
}

.modal-content {
  display: flex;
  height: min(700px, 80vh);
}

.class-sidebar {
  width: 280px;
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  padding: 16px;
  background: rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.class-item {
  padding: 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.2s;

  .class-icon { font-size: 24px; }
  .class-meta {
    display: flex;
    flex-direction: column;
    .name { font-weight: 700; color: #cbd5e1; font-size: 14px; }
    .active-badge { font-size: 8px; font-family: 'Press Start 2P', cursive; color: #22c55e; margin-top: 4px; }
  }

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    transform: translateX(4px);
  }

  &.active {
    background: rgba(59, 130, 246, 0.1);
    border-color: rgba(59, 130, 246, 0.4);
    .name { color: #fff; }
  }
}

.class-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: radial-gradient(circle at top right, var(--preview-color)0a, transparent 40%);
  overflow-y: auto;
}

.preview-bg {
  height: 240px;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.4));
  position: relative;
  
  .trainer-img {
    height: 180px;
    image-rendering: pixelated;
    filter: drop-shadow(0 10px 20px rgba(0,0,0,0.5));
  }
}

.preview-info {
  padding: 32px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.info-header {
  .preview-name { 
    font-family: 'Press Start 2P', cursive; 
    font-size: 18px; 
    color: var(--preview-color);
    text-shadow: 0 0 20px var(--preview-color);
    margin-bottom: 12px;
    display: block;
  }
  .preview-desc { font-size: 15px; color: #94a3b8; line-height: 1.6; }
}

.pros-cons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;

  h3 { font-family: 'Press Start 2P', cursive; font-size: 9px; margin-bottom: 16px; }
  .section:first-child h3 { color: #22c55e; }
  .section:last-child h3 { color: #ef4444; }

  ul { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  li { font-size: 13px; color: #cbd5e1; line-height: 1.4; display: flex; gap: 8px; }
  .bullet { font-weight: 800; font-size: 12px; }
}

.select-action-btn {
  margin-top: auto;
  padding: 20px;
  border: none;
  border-radius: 16px;
  background: var(--preview-color);
  color: #fff;
  font-family: 'Press Start 2P', cursive;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 10px 20px -10px var(--preview-color);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    filter: Brightness(1.2);
  }

  &:disabled {
    background: #475569;
    box-shadow: none;
    cursor: default;
    opacity: 0.5;
    background: #1e293b;
  }
}

@media (max-width: 768px) {
  .modal-content { flex-direction: column; height: auto; }
  .class-sidebar { width: 100%; height: 200px; border-right: none; border-bottom: 1px solid rgba(255,255,255,0.05); }
}
</style>
