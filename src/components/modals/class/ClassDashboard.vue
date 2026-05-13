// [PureVue-Ignore-Length]
<script setup lang="ts">
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import TrainerAvatar from '@/components/TrainerAvatar.vue'

import { type ClassDefinition } from '@/stores/playerClass'

interface Props {
  currentClass?: ClassDefinition | null
  trainerLevel?: number
  trainerRank?: string
}

withDefaults(defineProps<Props>(), {
  currentClass: null,
  trainerLevel: 1,
  trainerRank: 'Novato'
})

const emit = defineEmits<{
  (e: 'openMissions'): void
  (e: 'changeClass'): void
  (e: 'close'): void
}>()

const getTrainerSprite = (id: string | number | undefined) => {
  return getAssetUrl(ASSET_TYPES.TRAINER, id as string, { trainerSuffix: 'front' });
}

const handleImageError = (e: Event) => {
  if (e.target) {
    (e.target as HTMLImageElement).style.display = 'none'
  }
}
</script>

<template>
  <div class="dashboard-layout">
    <!-- Left: Identity -->
    <aside class="dashboard-sidebar">
      <div class="avatar-box">
        <div class="avatar-glow" />
        <img 
          :src="getTrainerSprite(currentClass?.showdownSpriteId || currentClass?.id)"
          class="trainer-big-img" 
          @error="handleImageError"
        >
        <div class="avatar-mini-circle">
          <TrainerAvatar
            :player-class="currentClass?.id"
            :level="trainerLevel"
            :size="60"
            class="avatar-pixel no-border"
          />
        </div>
      </div>

      <h1 class="class-main-title">
        {{ currentClass?.name.toUpperCase() }}
      </h1>
      <p class="class-slogan">
        "{{ currentClass?.description }}"
      </p>

      <div class="rank-cards">
        <div class="rank-card level">
          <div class="card-icon">
            🎖️
          </div>
          <div class="card-text">
            <span class="label">NIVEL ENTRENADOR</span>
            <span class="value">Nv. {{ trainerLevel }}</span>
          </div>
        </div>
        <div class="rank-card rank">
          <div class="card-icon">
            ✨
          </div>
          <div class="card-text">
            <span class="label">RANGO ACTUAL</span>
            <span class="value highlight">{{ trainerRank }}</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Right: Details -->
    <main class="dashboard-main custom-scrollbar">
      <section class="details-section">
        <div class="section-header">
          <div class="header-line" />
          <h2>HABILIDADES DE CLASE</h2>
        </div>
        
        <div class="abilities-list">
          <div 
            v-for="(bonus, idx) in currentClass?.bonuses" 
            :key="idx"
            class="ability-item"
            :class="{ locked: Number(idx) + 1 > (currentClass?.bonusLevels?.[Number(idx)] || 1) && trainerLevel < (currentClass?.bonusLevels?.[Number(idx)] || 0) }"
          >
            <div class="ability-checkbox">
              {{ (currentClass?.bonusLevels?.[Number(idx)] || 1) <= trainerLevel ? '✅' : '🔒' }}
            </div>
            <div class="ability-content">
              <p :class="{ 'text-locked': (currentClass?.bonusLevels?.[Number(idx)] || 1) > trainerLevel }">
                {{ bonus }}
              </p>
              <span
                v-if="(currentClass?.bonusLevels?.[Number(idx)] || 1) > trainerLevel"
                class="req-hint"
              >
                Requiere Nivel de Entrenador {{ currentClass?.bonusLevels?.[Number(idx)] }}
              </span>
            </div>
            <div
              v-if="(currentClass?.bonusLevels?.[Number(idx)] || 1) > trainerLevel"
              class="lv-badge"
            >
              Nv. {{ currentClass?.bonusLevels?.[Number(idx)] }}
            </div>
            <div class="ability-help">
              ?
            </div>
          </div>
        </div>
      </section>

      <section class="details-section">
        <div class="section-header">
          <div class="header-line red" />
          <h2>LIMITACIONES</h2>
        </div>
        
        <div class="abilities-list limitations">
          <div 
            v-for="(penalty, idx) in currentClass?.penalties" 
            :key="idx"
            class="ability-item limitation"
          >
            <div class="ability-checkbox">
              ❌
            </div>
            <div class="ability-content">
              <p>{{ penalty }}</p>
            </div>
            <div class="ability-help">
              ?
            </div>
          </div>
        </div>
      </section>

      <!-- Bottom Actions -->
      <div class="dashboard-actions">
        <button 
          class="missions-btn-wide"
          @click.stop="emit('openMissions')"
        >
          <span class="icon">📋</span> MISIONES PASIVAS
        </button>

        <div class="action-footer">
          <button
            class="btn-secondary"
            @click.stop="emit('changeClass')"
          >
            <span class="icon">🔄</span>
            <div class="btn-label-stack">
              <span class="btn-label">CAMBIAR CLASE</span>
              <span class="price">10,000 BC</span>
            </div>
          </button>
          <button
            class="btn-primary"
            @click.stop="emit('close')"
          >
            <span class="icon check-icon">✓</span> ENTENDIDO
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.dashboard-layout {
  display: flex;
  height: 100%;
  position: relative;
  overflow: hidden;
  
  // Base dark background
  background: Rgba(10, 12, 20, 1);
  
  // Custom class gradients
  .rocket & { background: Linear-Gradient(135deg, Rgba(26, 5, 5, 1) 0%, Rgba(5, 2, 2, 1) 100%); }
  .cazabichos & { background: Linear-Gradient(135deg, Rgba(5, 20, 5, 1) 0%, Rgba(2, 6, 2, 1) 100%); }
  .entrenador & { background: Linear-Gradient(135deg, Rgba(5, 10, 20, 1) 0%, Rgba(2, 4, 6, 1) 100%); }
  .criador & { background: Linear-Gradient(135deg, Rgba(10, 5, 20, 1) 0%, Rgba(3, 2, 6, 1) 100%); }

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: Radial-Gradient(circle at 70% 30%, var(--cls-color) 0%, transparent 50%);
    opacity: 0.08;
    pointer-events: none;
  }
}

.dashboard-sidebar {
  width: 380px;
  padding: 48px 32px;
  background: Rgba(0, 0, 0, 0.15);
  border-right: 1px solid Rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  z-index: var(--z-base);

    .avatar-box {
      position: relative;
      width: 300px;
      height: 300px;
      background: Rgba(0, 0, 0, 0.3);
      border-radius: 32px;
      border: 1px solid Rgba(255, 255, 255, 0.05);
      margin-bottom: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      
      .avatar-glow {
        position: absolute;
        inset: 0;
        background: Radial-Gradient(circle at center, var(--cls-color) 0%, transparent 80%);
        opacity: 0.1;
      }
      
      .trainer-big-img {
        height: 220px;
        @include pixelated;
        will-change: transform, filter, opacity;
  filter: Drop-Shadow(0 20px 40px Rgba(0,0,0,0.8));
        z-index: var(--z-base);
        transition: transform 0.3s ease;
        &:hover { transform: Scale(1.05); }
      }

      .avatar-mini-circle {
        position: absolute;
        top: 24px;
        left: 24px;
        width: 60px;
        height: 60px;
        background: Rgba(30, 41, 59, 1);
        border: 3px solid var(--cls-color);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        z-index: var(--z-base);
        box-shadow: 0 8px 25px Rgba(0,0,0,0.6), 0 0 15px var(--cls-color)44;

        .avatar-pixel {
          width: 100%;
          height: 100%;
          object-fit: cover;
          @include pixelated;
          
          &.no-border {
            border: none !important;
            box-shadow: none !important;
          }
        }
      }
    }

  .class-main-title {
    @include pixelated;
    font-size: 20px;
    color: var(--cls-color);
    margin-bottom: 16px;
    text-shadow: 0 0 20px var(--cls-color)66;
    @include pixelated;
  }

  .class-slogan {
    font-size: 14px;
    color: Rgba(255, 255, 255, 0.6);
    font-style: italic;
    line-height: 1.6;
    margin-bottom: 48px;
    padding: 0 10px;
    font-family: 'Outfit', sans-serif;
  }
}

.rank-cards {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;

  .rank-card {
    background: Rgba(15, 23, 42, 0.4);
    border: 1px solid Rgba(255, 255, 255, 0.08);
    border-radius: 24px;
    padding: 24px;
    display: flex;
    align-items: center;
    gap: 20px;
    text-align: left;
    transition: all 0.2s;

    &:hover { background: Rgba(15, 23, 42, 0.6); transform: Translatex(5px); }

    .card-icon { 
      width: 48px; height: 48px;
      background: Rgba(0, 0, 0, 0.3);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; 
    }
    .card-text {
      display: flex;
      flex-direction: column;
      .label { font-size: 8px; @include pixelated; color: Rgba(255,255,255,0.4); margin-bottom: 8px; }
      .value { @include pixelated; font-size: 14px; color: var(--white); }
      .highlight { color: var(--yellow); }
    }
  }
}

.dashboard-main {
  flex: 1;
  padding: 48px;
  display: flex;
  flex-direction: column;
  gap: 40px;
  overflow-y: auto;
  min-height: 0;
}

.details-section {
  .section-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
    
    .header-line {
      width: 4px;
      height: 24px;
      background: Rgba(34, 197, 94, 1);
      border-radius: 2px;
      box-shadow: 0 0 10px Rgba(34, 197, 94, 1);
      &.red { background: Rgba(239, 68, 68, 1); box-shadow: 0 0 10px Rgba(239, 68, 68, 1); }
    }
    
    h2 {
      @include pixelated;
      font-size: 11px;
      color: var(--white);
      letter-spacing: 1px;
      @include pixelated;
    }
  }
}

.abilities-list {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .ability-item {
    background: Rgba(15, 23, 42, 0.4);
    border: 1px solid Rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    transition: all 0.2s;
    border-left: 3px solid Rgba(34, 197, 94, 1);

    &:hover { background: Rgba(255, 255, 255, 0.06); }

    .ability-checkbox { 
      width: 28px; height: 28px;
      background: Rgba(0,0,0,0.4);
      border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; 
    }
    .ability-content { flex: 1; p { font-size: 13px; color: Rgba(203, 213, 225, 1); margin: 0; } }
    .ability-help {
      width: 20px; height: 20px;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; color: Rgba(239, 68, 68, 1); cursor: help;
      font-weight: 900;
    }

    &.limitation { 
      border-left: 3px solid Rgba(239, 68, 68, 1); 
      border-color: Rgba(239, 68, 68, 0.3);
    }

    &.locked { 
      opacity: 0.7;
      .ability-checkbox { will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  filter: #{"Grayscale(1)"}; opacity: 0.5; }
      .ability-content p { color: $muted; }
    }

    .req-hint {
      display: block;
      font-size: 9px;
      color: Rgba(255,255,255,0.3);
      margin-top: 4px;
    }

    .lv-badge {
      @include pixelated;
      font-size: 8px;
      background: Rgba(255, 255, 255, 0.1);
      padding: 4px 8px;
      border-radius: 4px;
      color: Rgba(148, 163, 184, 1);
    }

    .text-locked { color: $muted !important; }
  }
}

.dashboard-actions {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;

  .missions-btn-wide {
    @include btn-vicio('danger', 'md', true);
  }

  .action-footer {
    display: flex;
    gap: 16px;
    
    .btn-secondary {
      @include btn-vicio('secondary', 'md', true);
      
      .btn-label { font-size: 8px; color: Rgba(255, 255, 255, 0.7); }
      .price { color: var(--yellow); font-size: 9px; }
      .icon { opacity: 0.8; }
    }

    .btn-primary {
      @include btn-vicio('success', 'md', true);
    }
  }
}

@keyframes pulse {
  100% { transform: Scale(1); opacity: 0.1; }
}

@media (max-width: 950px) {
  .dashboard-layout {
    flex-direction: column;
    height: auto;
    overflow: visible;
  }

  .dashboard-sidebar {
    width: 100%;
    padding: 32px 20px;
    border-right: none;
    border-bottom: 1px solid Rgba(255, 255, 255, 0.05);

    .avatar-box {
      width: 200px;
      height: 200px;
      margin-bottom: 24px;
      border-radius: 24px;

      .trainer-big-img {
        height: 150px;
      }

      .avatar-mini-circle {
        top: 12px;
        left: 12px;
        width: 44px;
        height: 44px;
      }
    }

    .class-slogan {
      margin-bottom: 24px;
    }
  }

  .dashboard-main {
    padding: 24px 20px;
    overflow-y: visible; // Parent handles scroll
  }

  .rank-cards {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;

    .rank-card {
      flex: 1;
      min-width: 140px;
      padding: 16px;
      gap: 12px;

      .card-icon {
        width: 36px;
        height: 36px;
        font-size: 18px;
      }
    }
  }

  .dashboard-actions {
    .action-footer {
      flex-direction: column;
      gap: 12px;
      
      button {
        width: 100%;
      }
    }
  }
}

</style>
