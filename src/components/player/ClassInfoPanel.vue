<script setup lang="ts">
import { computed } from 'vue';
import gsap from 'gsap';
import { useGameStore } from '@/stores/game';
import { useUIStore } from '@/stores/ui';
import { PLAYER_CLASSES } from '@/data/playerClasses';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import PlayerAvatar from './PlayerAvatar.vue';
import ClassBonusList from './ClassBonusList.vue';

interface PlayerClass {
  id: string
  name: string
  icon: string
  color: string
  colorDark: string
  description: string
  avatarSpriteId: string
  bonuses: string[]
  bonusLevels: number[]
  penalties: string[]
  technicalBonuses?: string[]
  technicalPenalties?: string[]
}

const gameStore = useGameStore();
const uiStore = useUIStore();

const classId = computed(() => gameStore.state.playerClass);
const cls = computed<PlayerClass | null>(() => {
  if (!classId.value) return null
  return (PLAYER_CLASSES as Record<string, PlayerClass>)[classId.value] || null
});
const trainerLevel = computed(() => gameStore.state.trainerLevel || 1);

const close = () => {
  uiStore.isProfileOpen = false;
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

const rankTitle = computed(() => {
  if (trainerLevel.value >= 100) return 'MAESTRO POKÉMON';
  if (trainerLevel.value >= 50) return 'CAMPEÓN';
  if (trainerLevel.value >= 25) return 'ENTRENADOR ELITE';
  return 'NOVATO';
});
</script>

<template>
  <Teleport to="body">
    <Transition
      :css="false"
      @enter="(el, done) => {
        gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.2 });
        const modal = el.querySelector('.info-modal');
        if (modal) gsap.fromTo(modal, { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25, ease: 'back.out(1.2)', onComplete: done });
        else done();
      }"
      @leave="(el, done) => {
        gsap.to(el, { opacity: 0, duration: 0.2 });
        const modal = el.querySelector('.info-modal');
        if (modal) gsap.to(modal, { scale: 0.95, opacity: 0, duration: 0.2, onComplete: done });
        else done();
      }"
    >
      <div 
        v-if="uiStore.isProfileOpen && cls"
        class="class-info-overlay"
        @click.self="close"
      >
        <div 
          class="info-modal"
          :style="{ '--class-color': cls.color, '--class-color-dark': cls.colorDark }"
        >
          <button
            class="close-modal-btn"
            @click.stop="close"
          >
            ✕
          </button>

          <div class="modal-layout">
            <!-- Left Column -->
            <aside class="left-col">
              <div class="sprite-preview">
                <img
                  :src="getAssetUrl(ASSET_TYPES.TRAINER, cls.avatarSpriteId, { trainerSuffix: 'front' })"
                  :alt="cls.name"
                  class="class-sprite"
                  @error="e => { (e.target as HTMLImageElement).style.display = 'none' }"
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
              <ClassBonusList
                :cls="cls"
                :trainer-level="trainerLevel"
              />

              <!-- Actions -->
              <footer class="info-footer">
                <button
                  class="action-btn main press-start"
                  @click.stop="openMissions"
                >
                  <div class="shine" />
                  📋 MISIONES PASIVAS
                </button>

                <button
                  v-if="classId === 'entrenador'"
                  class="action-btn rep press-start"
                  @click.stop="openRepShop"
                >
                  🏅 TIENDA DE REPUTACIÓN
                </button>

                <div class="footer-row">
                  <button
                    class="action-btn secondary press-start"
                    @click.stop="openSelection"
                  >
                    🔄 CAMBIAR CLASE<br>
                    <span class="cost">10,000 BC</span>
                  </button>
                  <button
                    class="action-btn primary press-start"
                    @click.stop="close"
                  >
                    ✓ ENTENDIDO
                  </button>
                </div>
              </footer>
            </main>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.class-info-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: Rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  -webkit-will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  backdrop-filter: Blur(4px);
  backdrop-filter: Blur(4px);
  @include gpu-layer;
  transform: Translatez(0);
}

.info-modal {
  background: Rgba(17, 24, 39, 1);
  border-radius: 24px;
  width: 95%;
  max-width: 900px;
  border: 1px solid Rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px -12px Rgba(0, 0, 0, 0.8);
  position: relative;
  max-height: 90dvh;
  overflow-y: auto;
  min-height: 0;
  border-color: Rgba(var(--class-color), 0.2);
}

.close-modal-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  background: Rgba(255, 255, 255, 0.05);
  border: none;
  color: Rgba(148, 163, 184, 1);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  z-index: var(--z-base);
  &:hover { background: Rgba(255, 255, 255, 0.1); color: $white; }
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
  background: Radial-Gradient(circle, Rgba(var(--class-color), 0.15) 0%, transparent 70%);
  border-radius: 30px;
  padding: 20px;
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
  border: 1px solid Rgba(var(--class-color), 0.1);

  .class-sprite {
    width: 220px;
    height: auto;
    @include pixelated;
    will-change: transform, filter, opacity;
  filter: Drop-Shadow(0 10px 20px Rgba(0, 0, 0, 0.5));
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
  .quote { color: Rgba(148, 163, 184, 1); font-size: 14px; font-style: italic; line-height: 1.6; }
}

.stats-cards {
  width: 100%;
  margin-top: 32px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-card {
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;

  .icon { font-size: 24px; }
  .stat-info {
    label { font-size: 8px; color: $muted; margin-bottom: 4px; display: block; }
    .value { font-size: 22px; font-weight: 900; }
    .value.rank { font-size: 14px; color: Rgba(234, 179, 8, 1); text-transform: uppercase; font-weight: 700; }
  }
}

.right-col {
  flex: 1.5;
  min-width: 350px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.info-footer {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid Rgba(255, 255, 255, 0.05);
}

.action-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 14px;
  color: $white;
  font-size: 9px;
  cursor: pointer;
  
  position: relative;
  overflow: hidden;

  &.main {
    background: Linear-Gradient(135deg, var(--class-color), var(--class-color-dark));
    box-shadow: 0 4px 0 var(--class-color-dark);
    .shine { position: absolute; top: 0; left: 0; right: 0; height: 40%; background: Linear-Gradient(to bottom, Rgba(255, 255, 255, 0.2), transparent); }
    &:active { transform: Translatey(2px); box-shadow: 0 2px 0 var(--class-color-dark); }
  }

  &.rep {
    background: Linear-Gradient(135deg, Rgba(34, 197, 94, 1), Rgba(22, 163, 74, 1));
    box-shadow: 0 4px 0 Rgba(20, 83, 45, 1);
    &:active { transform: Translatey(2px); box-shadow: 0 2px 0 #14532d; }
  }

  &.secondary {
    background: Rgba(255, 255, 255, 0.03);
    border: 1px solid Rgba(255, 255, 255, 0.08);
    color: Rgba(148, 163, 184, 1);
    font-size: 8px;
    line-height: 1.4;
    .cost { color: Rgba(245, 158, 11, 1); font-size: 7px; }
    &:hover { background: Rgba(255, 255, 255, 0.05); color: $white; }
  }

  &.primary {
    background: Linear-Gradient(135deg, var(--class-color), var(--class-color-dark));
    box-shadow: 0 4px 0 var(--class-color-dark);
    font-size: 10px;
    &:active { transform: Translatey(2px); box-shadow: 0 2px 0 var(--class-color-dark); }
  }
}

.footer-row { display: flex; gap: 12px; }

.press-start { @include pixelated; }
.green-text { color: Rgba(34, 197, 94, 1); }
.red-text { color: Rgba(239, 68, 68, 1); }



@media (max-width: 600px) {
  .modal-layout { padding: 24px; gap: 24px; }
  .left-col, .right-col { min-width: 100%; flex: none; }
}
</style>
