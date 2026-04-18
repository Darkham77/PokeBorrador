<script setup>
import { computed } from 'vue';
import { useGameStore } from '@/stores/game';
import { useUIStore } from '@/stores/ui';
import { usePlayerClassStore } from '@/stores/playerClassStore';
import { PLAYER_CLASSES } from '@/logic/playerClasses';
import PlayerAvatar from './PlayerAvatar.vue';

const gameStore = useGameStore();
const uiStore = useUIStore();
const classStore = usePlayerClassStore();

const classes = computed(() => Object.values(PLAYER_CLASSES));
const currentClassId = computed(() => gameStore.state.playerClass);
const isChange = computed(() => !!currentClassId.value);
const COST = 10000;

const close = () => {
  uiStore.isClassSelectionOpen = false;
};

const select = (id) => {
  classStore.selectClass(id);
};
</script>

<template>
  <Teleport to="body">
    <div 
      v-if="uiStore.isClassSelectionOpen"
      class="class-selector-overlay"
      @click.self="close"
    >
      <div class="modal-content">
        <header class="modal-header">
          <h2 class="press-start gold-text">
            🎭 ELEGÍ TU CLASE
          </h2>
          <p class="description">
            {{ isChange ? `Cambiar de clase cuesta ` : 'Esta elección define cómo jugás. Podés cambiar más adelante por ' }}
            <strong class="gold-text">{{ COST.toLocaleString() }} Battle Coins</strong>.
          </p>
        </header>

        <div class="class-grid">
          <div 
            v-for="cls in classes" 
            :key="cls.id"
            class="class-card"
            :class="{ active: currentClassId === cls.id }"
            :style="{ '--class-color': cls.color, '--class-glow': cls.color + '55' }"
            @click="select(cls.id)"
          >
            <div
              v-if="currentClassId === cls.id"
              class="active-badge press-start"
            >
              ACTIVA
            </div>
            
            <div class="avatar-wrapper">
              <PlayerAvatar
                :class-id="cls.id"
                :size="80"
              />
            </div>

            <h3
              class="press-start"
              :style="{ color: cls.color }"
            >
              {{ cls.name }}
            </h3>
            <p class="class-desc">
              {{ cls.description }}
            </p>

            <div class="benefits">
              <h4 class="green-text">
                ✅ VENTAJAS
              </h4>
              <ul>
                <li
                  v-for="b in cls.bonuses"
                  :key="b"
                >
                  {{ b }}
                </li>
              </ul>
            </div>

            <div class="penalties">
              <h4 class="red-text">
                ❌ PENALIZACIONES
              </h4>
              <ul>
                <li
                  v-for="p in cls.penalties"
                  :key="p"
                >
                  {{ p }}
                </li>
              </ul>
            </div>

            <button
              class="select-btn press-start"
              :style="{ background: `linear-gradient(135deg, ${cls.color}, ${cls.colorDark})` }"
            >
              {{ currentClassId === cls.id ? '✓ CLASE ACTUAL' : (isChange ? '🔄 CAMBIAR' : '▶ ELEGIR') }}
            </button>
          </div>
        </div>

        <footer class="modal-footer">
          <button
            class="close-btn"
            @click="close"
          >
            CERRAR
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.class-selector-overlay {
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: rgba(0, 0, 0, 0.92);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 40px 16px;
  overflow-y: auto;
  backdrop-filter: blur(8px);
  animation: fadeIn 0.3s ease;
}

.modal-content {
  width: 95%;
  max-width: 1400px;
}

.modal-header {
  text-align: center;
  margin-bottom: 40px;
  h2 { font-size: 24px; margin-bottom: 12px; }
  p { color: #94a3b8; font-size: 14px; }
}

.class-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

.class-card {
  background: #1e293b;
  border-radius: 24px;
  border: 2px solid rgba(255, 255, 255, 0.08);
  padding: 32px 24px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  display: flex;
  flex-direction: column;

  &:hover {
    border-color: var(--class-color);
    transform: translateY(-8px);
    box-shadow: 0 12px 30px var(--class-glow);
  }

  &.active {
    border-color: var(--class-color);
    box-shadow: 0 0 25px var(--class-glow);
    order: -1;
  }
}

.active-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  background: var(--class-color);
  color: #fff;
  font-size: 10px;
  padding: 4px 10px;
  border-radius: 8px;
}

.avatar-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

h3 { text-align: center; margin-bottom: 12px; font-size: 14px; }
.class-desc { 
  text-align: center; 
  color: #94a3b8; 
  font-size: 12px; 
  line-height: 1.6; 
  margin-bottom: 24px;
  flex-grow: 1;
}

.benefits, .penalties {
  margin-bottom: 16px;
  h4 { font-size: 11px; margin-bottom: 8px; font-weight: 800; }
  ul {
    list-style: none;
    padding: 0;
    li { 
      font-size: 12px; 
      margin-bottom: 6px; 
      padding-left: 12px; 
      position: relative;
      line-height: 1.4;
      &::before {
        content: "•";
        position: absolute;
        left: 0;
      }
    }
  }
}

.benefits li { color: #cbd5e1; }
.penalties li { color: #f87171; }

.select-btn {
  width: 100%;
  margin-top: 24px;
  padding: 16px;
  border: none;
  border-radius: 16px;
  color: #fff;
  font-size: 10px;
  cursor: pointer;
  transition: opacity 0.2s;
  &:hover { opacity: 0.9; }
}

.gold-text { color: #f59e0b; }
.green-text { color: #22c55e; }
.red-text { color: #ef4444; }

.press-start { font-family: 'Press Start 2P', cursive; }

.modal-footer {
  text-align: center;
  .close-btn {
    background: rgba(255, 255, 255, 0.08);
    border: none;
    color: #94a3b8;
    padding: 12px 32px;
    border-radius: 12px;
    cursor: pointer;
    font-size: 14px;
    &:hover { color: #fff; background: rgba(255, 255, 255, 0.12); }
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
