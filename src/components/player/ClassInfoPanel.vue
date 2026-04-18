<script setup>
import { computed } from 'vue';
import { useGameStore } from '@/stores/game';
import { useUIStore } from '@/stores/ui';
import { PLAYER_CLASSES } from '@/logic/playerClasses';
import PlayerAvatar from './PlayerAvatar.vue';

const gameStore = useGameStore();
const uiStore = useUIStore();

const classId = computed(() => gameStore.state.playerClass);
const cls = computed(() => classId.value ? PLAYER_CLASSES[classId.value] : null);
const trainerLevel = computed(() => gameStore.state.trainerLevel || 1);

const close = () => {
  uiStore.isClassInfoOpen = false;
};

const openMissions = () => {
  close();
  uiStore.isClassMissionsOpen = true;
};

const openRepShop = () => {
  close();
  uiStore.isRepShopOpen = true;
};

const openSelection = () => {
  close();
  uiStore.isClassSelectionOpen = true;
};

// Helper for Rank Title (Simplified or logic from social.js if needed)
const rankTitle = computed(() => {
  if (trainerLevel.value >= 100) return 'MAESTRO POKÉMON';
  if (trainerLevel.value >= 50) return 'CAMPEÓN';
  if (trainerLevel.value >= 25) return 'ENTRENADOR ELITE';
  return 'NOVATO';
});
</script>

<template>
  <Teleport to="body">
    <div 
      v-if="uiStore.isClassInfoOpen && cls"
      class="class-info-overlay"
      @click.self="close"
    >
      <div 
        class="info-modal"
        :style="{ '--class-color': cls.color, '--class-color-dark': cls.colorDark }"
      >
        <button
          class="close-modal-btn"
          @click="close"
        >
          ✕
        </button>

        <div class="modal-layout">
          <!-- Left Column -->
          <aside class="left-col">
            <div class="sprite-preview">
              <img
                :src="cls.sprite"
                :alt="cls.name"
                class="class-sprite"
              >
              <div class="avatar-floating">
                <PlayerAvatar :size="60" />
              </div>
            </div>

            <div class="class-title-block">
              <h2 class="press-start">
                {{ cls.name }}
              </h2>
              <p class="quote">
                "{{ cls.description }}"
              </p>
            </div>

            <div class="stats-cards">
              <div class="stat-card">
                <span class="icon">🎖️</span>
                <div class="stat-info">
                  <label class="press-start">NIVEL</label>
                  <div
                    class="value press-start"
                    :style="{ color: cls.color }"
                  >
                    Nv. {{ trainerLevel }}
                  </div>
                </div>
              </div>
              <div class="stat-card">
                <span class="icon">✨</span>
                <div class="stat-info">
                  <label class="press-start">RANGO</label>
                  <div class="value rank">
                    {{ rankTitle }}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <!-- Right Column -->
          <main class="right-col">
            <section class="abilities-section">
              <div class="section-header">
                <div class="bar green" />
                <h3 class="press-start green-text">
                  HABILIDADES DE CLASE
                </h3>
              </div>
              
              <div class="ability-list">
                <div 
                  v-for="(bonus, i) in cls.bonuses" 
                  :key="i"
                  class="ability-item"
                  :class="{ locked: trainerLevel < (cls.bonusLevels?.[i] || 1) }"
                  :style="{ borderLeftColor: trainerLevel >= (cls.bonusLevels?.[i] || 1) ? cls.color : '#374151' }"
                >
                  <span class="status-icon">{{ trainerLevel >= (cls.bonusLevels?.[i] || 1) ? '✅' : '🔒' }}</span>
                  <div class="ability-content">
                    <div class="ability-top">
                      <span class="bonus-text">{{ bonus }}</span>
                      <span
                        v-if="cls.bonusLevels?.[i] > 1"
                        class="lv-req press-start"
                      >Nv.{{ cls.bonusLevels[i] }}</span>
                      <div class="tooltip-trigger">
                        ❓
                        <div class="tooltip-content">
                          <strong>Mecánica:</strong><br>
                          {{ cls.technicalBonuses?.[i] || 'Detalles no disponibles.' }}
                        </div>
                      </div>
                    </div>
                    <p
                      v-if="trainerLevel < (cls.bonusLevels?.[i] || 1)"
                      class="req-text"
                    >
                      Requiere Nivel de Entrenador {{ cls.bonusLevels[i] }}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section class="penalties-section">
              <div class="section-header">
                <div class="bar red" />
                <h3 class="press-start red-text">
                  LIMITACIONES
                </h3>
              </div>

              <div class="ability-list">
                <div 
                  v-for="(penalty, i) in cls.penalties" 
                  :key="i"
                  class="ability-item penalty"
                >
                  <span class="status-icon">❌</span>
                  <div class="ability-content">
                    <div class="ability-top">
                      <span class="bonus-text">{{ penalty }}</span>
                      <div class="tooltip-trigger">
                        ❓
                        <div class="tooltip-content red-border">
                          <strong>Efecto Negativo:</strong><br>
                          {{ cls.technicalPenalties?.[i] || 'Detalles no disponibles.' }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- Actions -->
            <footer class="info-footer">
              <button
                class="action-btn main press-start"
                @click="openMissions"
              >
                <div class="shine" />
                📋 MISIONES PASIVAS
              </button>

              <button
                v-if="classId === 'entrenador'"
                class="action-btn rep press-start"
                @click="openRepShop"
              >
                🏅 TIENDA DE REPUTACIÓN
              </button>

              <div class="footer-row">
                <button
                  class="action-btn secondary press-start"
                  @click="openSelection"
                >
                  🔄 CAMBIAR CLASE<br>
                  <span class="cost">10,000 BC</span>
                </button>
                <button
                  class="action-btn primary press-start"
                  @click="close"
                >
                  ✓ ENTENDIDO
                </button>
              </div>
            </footer>
          </main>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.class-info-overlay {
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease;
}

.info-modal {
  background: #111827;
  border-radius: 24px;
  width: 95%;
  max-width: 900px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
  position: relative;
  max-height: 90vh;
  overflow-y: auto;
  border-color: rgba(var(--class-color), 0.2);
}

.close-modal-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: none;
  color: #94a3b8;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  z-index: 10;
  &:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
}

.modal-layout {
  display: flex;
  flex-wrap: wrap;
  padding: 40px;
  gap: 40px;
}

.left-col {
  flex: 1;
  min-width: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.sprite-preview {
  position: relative;
  width: 100%;
  max-width: 300px;
  background: radial-gradient(circle, rgba(var(--class-color), 0.15) 0%, transparent 70%);
  border-radius: 30px;
  padding: 20px;
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
  border: 1px solid rgba(var(--class-color), 0.1);

  .class-sprite {
    width: 220px;
    height: auto;
    image-rendering: pixelated;
    filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.5));
  }

  .avatar-floating {
    position: absolute;
    top: 20px;
    left: 20px;
  }
}

.class-title-block {
  text-align: center;
  h2 { font-size: 18px; color: var(--class-color); margin-bottom: 12px; letter-spacing: 1px; }
  .quote { color: #94a3b8; font-size: 14px; font-style: italic; line-height: 1.6; }
}

.stats-cards {
  width: 100%;
  margin-top: 32px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;

  .icon { font-size: 24px; }
  .stat-info {
    label { font-size: 8px; color: #64748b; margin-bottom: 4px; display: block; }
    .value { font-size: 22px; font-weight: 900; }
    .value.rank { font-size: 14px; color: #eab308; text-transform: uppercase; font-weight: 700; }
  }
}

.right-col {
  flex: 1.5;
  min-width: 350px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  .bar { width: 6px; height: 20px; border-radius: 3px; }
  .bar.green { background: #22c55e; box-shadow: 0 0 10px rgba(34, 197, 94, 0.4); }
  .bar.red { background: #ef4444; box-shadow: 0 0 10px rgba(239, 68, 68, 0.4); }
  h3 { font-size: 11px; letter-spacing: 1.5px; }
}

.ability-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ability-item {
  background: rgba(0, 0, 0, 0.4);
  padding: 14px 16px;
  border-radius: 14px;
  border-left: 4px solid;
  display: flex;
  gap: 12px;
  align-items: center;

  &.locked { opacity: 0.6; .bonus-text { color: #64748b; } }
  &.penalty { border-left-color: rgba(239, 68, 68, 0.4); }

  .status-icon { font-size: 16px; flex-shrink: 0; }
  .ability-content { flex: 1; min-width: 0; }
  .ability-top { display: flex; align-items: center; gap: 8px; }
  .bonus-text { font-size: 13px; color: #e2e8f0; line-height: 1.4; flex-grow: 1; }
  .lv-req { font-size: 8px; background: rgba(255, 255, 255, 0.05); padding: 2px 6px; border-radius: 4px; color: #64748b; }
  .req-text { font-size: 10px; color: #475569; margin-top: 4px; }
}

.tooltip-trigger {
  position: relative;
  cursor: help;
  color: #475569;
  font-size: 12px;
  &:hover { color: #fff; .tooltip-content { visibility: visible; opacity: 1; transform: translateY(0); } }
}

.tooltip-content {
  visibility: hidden;
  opacity: 0;
  position: absolute;
  bottom: 125%;
  left: 50%;
  transform: translateX(-50%) translateY(10px);
  width: 240px;
  background: #0f172a;
  color: #cbd5e1;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(var(--class-color), 0.3);
  font-size: 11px;
  line-height: 1.5;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
  transition: all 0.3s;
  z-index: 100;
  pointer-events: none;
  &.red-border { border-color: rgba(239, 68, 68, 0.3); }
}

.info-footer {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.action-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 14px;
  color: #fff;
  font-size: 9px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;

  &.main {
    background: linear-gradient(135deg, var(--class-color), var(--class-color-dark));
    box-shadow: 0 4px 0 var(--class-color-dark);
    .shine { position: absolute; top: 0; left: 0; right: 0; height: 40%; background: linear-gradient(to bottom, rgba(255, 255, 255, 0.2), transparent); }
    &:active { transform: translateY(2px); box-shadow: 0 2px 0 var(--class-color-dark); }
  }

  &.rep {
    background: linear-gradient(135deg, #22c55e, #16a34a);
    box-shadow: 0 4px 0 #14532d;
    &:active { transform: translateY(2px); box-shadow: 0 2px 0 #14532d; }
  }

  &.secondary {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #94a3b8;
    font-size: 8px;
    line-height: 1.4;
    .cost { color: #f59e0b; font-size: 7px; }
    &:hover { background: rgba(255, 255, 255, 0.05); color: #fff; }
  }

  &.primary {
    background: linear-gradient(135deg, var(--class-color), var(--class-color-dark));
    box-shadow: 0 4px 0 var(--class-color-dark);
    font-size: 10px;
    &:active { transform: translateY(2px); box-shadow: 0 2px 0 var(--class-color-dark); }
  }
}

.footer-row { display: flex; gap: 12px; }

.press-start { font-family: 'Press Start 2P', cursive; }
.green-text { color: #22c55e; }
.red-text { color: #ef4444; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

@media (max-width: 600px) {
  .modal-layout { padding: 24px; gap: 24px; }
  .left-col, .right-col { min-width: 100%; flex: none; }
  .tooltip-content { width: 200px; left: auto; right: 0; transform: translateY(10px); }
}
</style>
